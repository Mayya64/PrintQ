import os
import io
import sqlite3
import random
import math
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, g, session, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from pypdf import PdfReader, PdfWriter
from PIL import Image

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'printq-dev-secret-key-change-in-production')
CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://127.0.0.1:5173'])

TEMP_FOLDER = 'temp_uploads'
FINAL_FOLDER = 'final_uploads'
DB_FILE = 'printq.db'

ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp'}

os.makedirs(TEMP_FOLDER, exist_ok=True)
os.makedirs(FINAL_FOLDER, exist_ok=True)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_FILE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def add_column_if_not_exists(cursor, table, column, definition):
    cols = [row[1] for row in cursor.execute(f'PRAGMA table_info({table})').fetchall()]
    if column not in cols:
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'student',
                full_name TEXT DEFAULT '',
                usn TEXT DEFAULT '',
                created_at TEXT
            )
        ''')

        # Migrate existing DB: add new columns if they don't exist
        add_column_if_not_exists(cursor, 'users', 'full_name', "TEXT DEFAULT ''")
        add_column_if_not_exists(cursor, 'users', 'usn', "TEXT DEFAULT ''")

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                bw_enabled INTEGER, color_enabled INTEGER,
                spiral_enabled INTEGER, shop_open INTEGER
            )
        ''')
        cursor.execute('INSERT OR IGNORE INTO settings (id, bw_enabled, color_enabled, spiral_enabled, shop_open) VALUES (1, 1, 1, 1, 1)')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT, usn TEXT, student_name TEXT,
                original_filename TEXT, sliced_filename TEXT, tmp_filename TEXT,
                total_doc_pages INTEGER, start_page INTEGER, end_page INTEGER,
                sliced_pages INTEGER, color_mode TEXT, sides TEXT, copies INTEGER,
                binding TEXT, amount INTEGER, utr TEXT, otp TEXT, status TEXT,
                file_purged INTEGER DEFAULT 0, created_at TEXT,
                printing_station INTEGER DEFAULT 1,
                payment_method TEXT DEFAULT 'upi',
                user_id INTEGER
            )
        ''')

        add_column_if_not_exists(cursor, 'orders', 'printing_station', 'INTEGER DEFAULT 1')
        add_column_if_not_exists(cursor, 'orders', 'payment_method', "TEXT DEFAULT 'upi'")
        add_column_if_not_exists(cursor, 'orders', 'user_id', 'INTEGER')

        # ---------- Seed demo accounts ----------
        demo_accounts = [
            {
                'email': 'admin@netdotcom',
                'password': 'admin@netdotcom',
                'role': 'admin',
                'full_name': 'Admin User',
                'usn': 'ADMIN01'
            },
            {
                'email': 'student@netdotcom',
                'password': 'student@netdotcom',
                'role': 'student',
                'full_name': 'Demo Student',
                'usn': '1DEMO2026'
            },
            {
                'email': 'shopkeeper@netdotcom',
                'password': 'shopkeeper@netdotcom',
                'role': 'shopkeeper',
                'full_name': 'Demo Shopkeeper',
                'usn': 'SHOP01'
            }
        ]

        for acc in demo_accounts:
            existing = cursor.execute('SELECT id FROM users WHERE email=?', (acc['email'],)).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO users (email, password_hash, role, full_name, usn, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                    (acc['email'], generate_password_hash(acc['password']), acc['role'], acc['full_name'], acc['usn'], datetime.now().isoformat())
                )
            else:
                cursor.execute(
                    'UPDATE users SET password_hash=?, role=?, full_name=?, usn=? WHERE email=?',
                    (generate_password_hash(acc['password']), acc['role'], acc['full_name'], acc['usn'], acc['email'])
                )

        db.commit()

init_db()

# ---------------------------------------------------------------------------
# Auth decorators
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated

def shopkeeper_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        if session.get('user_role') not in ('shopkeeper', 'admin'):
            return jsonify({'error': 'Shopkeeper access only'}), 403
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        if session.get('user_role') != 'admin':
            return jsonify({'error': 'Admin access only'}), 403
        return f(*args, **kwargs)
    return decorated

# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email     = data.get('email', '').strip().lower()
    password  = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    usn       = data.get('usn', '').strip().upper()

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    allowed_domains = ('@nmamit.in', '@nitte.edu')
    if not any(email.endswith(domain) for domain in allowed_domains):
        return jsonify({'error': 'Please enter a valid college email address'}), 400

    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400
    if not usn:
        return jsonify({'error': 'College USN is required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    db = get_db()
    cursor = db.cursor()

    if cursor.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone():
        return jsonify({'error': 'This email is already registered'}), 400

    password_hash = generate_password_hash(password)
    cursor.execute(
        'INSERT INTO users (email, password_hash, role, full_name, usn, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        (email, password_hash, 'student', full_name, usn, datetime.now().isoformat())
    )
    db.commit()

    user_id = cursor.lastrowid
    session['user_id']        = user_id
    session['user_email']     = email
    session['user_role']      = 'student'
    session['user_full_name'] = full_name
    session['user_usn']       = usn

    return jsonify({'success': True, 'role': 'student', 'user_id': user_id,
                    'email': email, 'full_name': full_name, 'usn': usn})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    db = get_db()
    cursor = db.cursor()
    user = cursor.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 400

    session['user_id']        = user['id']
    session['user_email']     = user['email']
    session['user_role']      = user['role']
    session['user_full_name'] = user['full_name'] or ''
    session['user_usn']       = user['usn'] or ''

    return jsonify({
        'success': True,
        'role': user['role'],
        'user_id': user['id'],
        'email': user['email'],
        'full_name': user['full_name'] or '',
        'usn': user['usn'] or ''
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 200
    # Re-fetch profile from DB so it's always fresh
    db = get_db()
    row = db.cursor().execute('SELECT * FROM users WHERE id=?', (session['user_id'],)).fetchone()
    if not row:
        session.clear()
        return jsonify({'authenticated': False}), 200
    user = dict(row)
    return jsonify({
        'authenticated': True,
        'user_id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'full_name': user['full_name'] or '',
        'usn': user['usn'] or ''
    })

# ---------------------------------------------------------------------------
# Public state
# ---------------------------------------------------------------------------

@app.route('/api/state', methods=['GET'])
def get_state():
    db = get_db()
    cursor = db.cursor()

    settings = dict(cursor.execute('SELECT * FROM settings WHERE id = 1').fetchone())

    logged_in = 'user_id' in session
    user_role = session.get('user_role', 'guest')

    if logged_in and user_role in ('shopkeeper', 'admin'):
        orders = [dict(row) for row in cursor.execute('SELECT * FROM orders ORDER BY id DESC').fetchall()]
    elif logged_in:
        orders = [dict(row) for row in cursor.execute(
            'SELECT * FROM orders WHERE user_id=? ORDER BY id DESC', (session['user_id'],)
        ).fetchall()]
    else:
        orders = []

    all_active = [dict(row) for row in cursor.execute(
        "SELECT sliced_pages, copies FROM orders WHERE status IN ('In Queue', 'Printing', 'Ready for Pickup')"
    ).fetchall()]
    pending_pages  = sum(o['sliced_pages'] * o['copies'] for o in all_active)
    est_wait_mins  = math.ceil(pending_pages * 0.5)

    user_info = None
    if logged_in:
        row = cursor.execute('SELECT full_name, usn FROM users WHERE id=?', (session['user_id'],)).fetchone()
        user_info = {
            'id':        session['user_id'],
            'email':     session['user_email'],
            'role':      user_role,
            'full_name': row['full_name'] if row else '',
            'usn':       row['usn'] if row else ''
        }

    return jsonify({
        'settings': settings,
        'stats': {
            'active_orders': len(all_active),
            'pending_pages': pending_pages,
            'est_wait_mins': est_wait_mins
        },
        'orders': orders,
        'user': user_info
    })

# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@app.route('/api/settings', methods=['POST'])
@shopkeeper_required
def update_settings():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE settings
        SET bw_enabled=?, color_enabled=?, spiral_enabled=?, shop_open=? WHERE id=1
    ''', (data.get('bw_enabled', 1), data.get('color_enabled', 0), data.get('spiral_enabled', 1), data.get('shop_open', 1)))
    db.commit()
    return jsonify({'success': True})

# ---------------------------------------------------------------------------
# File upload & analysis — supports PDF + images
# ---------------------------------------------------------------------------

@app.route('/api/analyze-pdf', methods=['POST'])
@login_required
def analyze_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    original_name = file.filename or ''
    ext = os.path.splitext(original_name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': f'Unsupported file type. Allowed: PDF, PNG, JPG, JPEG, WEBP, BMP'}), 400

    filename = secure_filename(original_name)
    tmp_path = os.path.join(TEMP_FOLDER, f"tmp_{random.randint(10000, 99999)}_{filename}")
    file.save(tmp_path)

    try:
        if ext == '.pdf':
            reader = PdfReader(tmp_path)
            total_pages = len(reader.pages)
            return jsonify({
                'total_pages': total_pages,
                'tmp_filename': tmp_path,
                'original_filename': filename,
                'file_type': 'pdf'
            })
        else:
            # Convert image → single-page PDF so the rest of the pipeline works unchanged
            img = Image.open(tmp_path)
            if img.mode in ('RGBA', 'P', 'LA'):
                img = img.convert('RGB')
            pdf_name = os.path.splitext(filename)[0] + '.pdf'
            pdf_path = os.path.join(TEMP_FOLDER, f"img_{random.randint(10000, 99999)}_{pdf_name}")
            img.save(pdf_path, 'PDF', resolution=150.0)
            os.remove(tmp_path)   # remove raw image; only keep converted PDF
            return jsonify({
                'total_pages': 1,
                'tmp_filename': pdf_path,
                'original_filename': filename,   # keep original name for display
                'file_type': 'image'
            })
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return jsonify({'error': 'Could not read file. Make sure it is a valid PDF or image.'}), 400

# ---------------------------------------------------------------------------
# Order creation
# ---------------------------------------------------------------------------

@app.route('/api/orders/create', methods=['POST'])
@login_required
def create_order():
    data = request.json
    db = get_db()
    settings = dict(db.cursor().execute('SELECT * FROM settings WHERE id = 1').fetchone())

    if not settings['shop_open']:
        return jsonify({'error': 'Shop is currently closed'}), 400
    if not settings.get('bw_enabled', 1):
        return jsonify({'error': 'Printer is currently offline'}), 400
    if data.get('binding') == 'Spiral' and not settings.get('spiral_enabled', 1):
        return jsonify({'error': 'Spiral Binding out of stock'}), 400

    # Pull USN & name from the logged-in user's profile automatically
    user_row = db.cursor().execute('SELECT full_name, usn FROM users WHERE id=?', (session['user_id'],)).fetchone()
    student_name = user_row['full_name'] if user_row else ''
    usn          = user_row['usn'] if user_row else ''

    start_page       = int(data.get('start_page', 1))
    end_page         = int(data.get('end_page', data['total_doc_pages']))
    sliced_pages     = end_page - start_page + 1
    copies           = int(data.get('copies', 1))
    printing_station = 1  # Demo project: Fixed to Station 1
    payment_method   = data.get('payment_method', 'upi')
    color_mode       = 'B&W'  # Demo project: B&W printing only

    price_per_page = 2  # ₹2 per page for B&W
    binding_cost = 0
    if data.get('binding') == 'Stapled':
        binding_cost = 5
    elif data.get('binding') == 'Spiral':
        binding_cost = 30

    amount = (sliced_pages * copies * price_per_page) + (binding_cost * copies)

    cursor = db.cursor()
    initial_status = 'In Queue' if payment_method == 'cash' else 'Awaiting Payment'

    cursor.execute('''
        INSERT INTO orders (usn, student_name, original_filename, tmp_filename, total_doc_pages,
        start_page, end_page, sliced_pages, color_mode, sides, copies, binding, amount, status,
        printing_station, payment_method, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (usn, student_name, data['original_filename'], data['tmp_filename'],
          data['total_doc_pages'], start_page, end_page, sliced_pages, color_mode,
          data.get('sides', 'Single'), copies, data.get('binding', 'None'), amount, initial_status,
          printing_station, payment_method, session['user_id'], datetime.now().isoformat()))
    order_id = cursor.lastrowid
    db.commit()

    if payment_method == 'cash':
        # Slice the file immediately for cash orders so it's ready to print
        sliced_filename = f"final_{order_id}_{data['original_filename']}"
        final_path = os.path.join(FINAL_FOLDER, sliced_filename)
        try:
            reader = PdfReader(data['tmp_filename'])
            writer = PdfWriter()
            for i in range(start_page - 1, end_page):
                writer.add_page(reader.pages[i])
            with open(final_path, 'wb') as f:
                writer.write(f)
            if os.path.exists(data['tmp_filename']):
                os.remove(data['tmp_filename'])
        except Exception:
            final_path = None   # keep tmp_filename if slicing fails

        token = f"PQ-{str(order_id).zfill(3)}"
        otp   = str(random.randint(1000, 9999))
        cursor.execute('''
            UPDATE orders SET token=?, otp=?, sliced_filename=?, tmp_filename=NULL WHERE id=?
        ''', (token, otp, final_path, order_id))
        db.commit()
        return jsonify({
            'order_id': order_id, 'amount': amount,
            'token': token, 'otp': otp,
            'message': 'Cash order placed. Pay at the counter when collecting.'
        })

    return jsonify({
        'order_id': order_id, 'amount': amount,
        'upi_qr_url': f"upi://pay?pa=shop@upi&pn=PrintQ&am={amount}&tr={order_id}"
    })

# ---------------------------------------------------------------------------
# Payment confirmation (UPI)
# ---------------------------------------------------------------------------

@app.route('/api/orders/<int:id>/confirm-payment', methods=['POST'])
@login_required
def confirm_payment(id):
    data = request.json
    db = get_db()
    cursor = db.cursor()
    row = cursor.execute('SELECT * FROM orders WHERE id=?', (id,)).fetchone()

    if not row:
        return jsonify({'error': 'Order not found'}), 404
    order = dict(row)
    if order.get('user_id') != session['user_id']:
        return jsonify({'error': 'Not authorized for this order'}), 403
    if order['status'] != 'Awaiting Payment':
        return jsonify({'error': 'Invalid status'}), 400

    sliced_filename = f"final_{id}_{order['original_filename']}"
    final_path = os.path.join(FINAL_FOLDER, sliced_filename)

    reader = PdfReader(order['tmp_filename'])
    writer = PdfWriter()
    for i in range(order['start_page'] - 1, order['end_page']):
        writer.add_page(reader.pages[i])
    with open(final_path, 'wb') as f:
        writer.write(f)

    if os.path.exists(order['tmp_filename']):
        os.remove(order['tmp_filename'])

    token = f"PQ-{str(id).zfill(3)}"
    otp   = str(random.randint(1000, 9999))

    cursor.execute('''
        UPDATE orders SET status='In Queue', utr=?, token=?, otp=?, sliced_filename=?, tmp_filename=NULL
        WHERE id=?
    ''', (data.get('utr', 'SIMULATED'), token, otp, final_path, id))
    db.commit()

    return jsonify({'success': True, 'token': token, 'otp': otp})

# ---------------------------------------------------------------------------
# Order status updates (shopkeeper / admin)
# ---------------------------------------------------------------------------

@app.route('/api/orders/<int:id>/status', methods=['POST'])
@shopkeeper_required
def update_status(id):
    data = request.json
    db = get_db()
    cursor = db.cursor()
    row = cursor.execute('SELECT * FROM orders WHERE id=?', (id,)).fetchone()

    if not row:
        return jsonify({'error': 'Order not found'}), 404
    order = dict(row)

    new_status = data['status']

    if new_status == 'Collected':
        if data.get('otp') != order['otp']:
            return jsonify({'error': 'Invalid 4-digit OTP'}), 400

    cursor.execute('UPDATE orders SET status=? WHERE id=?', (new_status, id))

    if new_status in ['Collected', 'Refunded'] and order['file_purged'] == 0:
        if order['sliced_filename'] and os.path.exists(order['sliced_filename']):
            os.remove(order['sliced_filename'])
        cursor.execute('UPDATE orders SET file_purged=1 WHERE id=?', (id,))

    db.commit()
    return jsonify({'success': True})

# ---------------------------------------------------------------------------
# Serve sliced PDF for shopkeeper printing
# ---------------------------------------------------------------------------

@app.route('/api/orders/<int:id>/print-file', methods=['GET'])
@shopkeeper_required
def get_print_file(id):
    db = get_db()
    cursor = db.cursor()
    row = cursor.execute('SELECT * FROM orders WHERE id=?', (id,)).fetchone()

    if not row:
        return jsonify({'error': 'Order not found'}), 404
    order = dict(row)

    # Check for the sliced file first, then tmp_filename as fallback
    filepath = order.get('sliced_filename') or order.get('tmp_filename')
    if not filepath or not os.path.exists(filepath):
        return jsonify({'error': 'Print file not available or already purged'}), 404

    return send_file(
        filepath,
        mimetype='application/pdf',
        as_attachment=False,
        download_name=f"print_{order['token'] or id}_{order['original_filename']}"
    )

# ---------------------------------------------------------------------------
# Bulk status updates (shopkeeper / admin)
# ---------------------------------------------------------------------------

@app.route('/api/orders/bulk-status', methods=['POST'])
@shopkeeper_required
def bulk_update_status():
    data = request.json
    order_ids = data.get('order_ids', [])
    new_status = data.get('status', '')
    if not order_ids or not new_status:
        return jsonify({'error': 'Missing order_ids or status'}), 400

    db = get_db()
    cursor = db.cursor()
    updated = 0
    for oid in order_ids:
        row = cursor.execute('SELECT * FROM orders WHERE id=?', (oid,)).fetchone()
        if not row:
            continue
        order = dict(row)
        # Only allow valid transitions
        if new_status == 'Printing' and order['status'] != 'In Queue':
            continue
        if new_status == 'Ready for Pickup' and order['status'] != 'Printing':
            continue
        cursor.execute('UPDATE orders SET status=? WHERE id=?', (new_status, oid))
        if new_status in ['Refunded'] and order['file_purged'] == 0:
            if order['sliced_filename'] and os.path.exists(order['sliced_filename']):
                os.remove(order['sliced_filename'])
            cursor.execute('UPDATE orders SET file_purged=1 WHERE id=?', (oid,))
        updated += 1

    db.commit()
    return jsonify({'success': True, 'updated': updated})

# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_list_users():
    db = get_db()
    cursor = db.cursor()
    users = [dict(row) for row in cursor.execute(
        'SELECT id, email, full_name, usn, role, created_at FROM users ORDER BY id'
    ).fetchall()]
    return jsonify({'users': users})

@app.route('/api/admin/users/<int:user_id>/role', methods=['POST'])
@admin_required
def admin_set_role(user_id):
    data = request.json
    new_role = data.get('role', 'student')
    if new_role not in ('student', 'shopkeeper'):
        return jsonify({'error': 'Invalid role. Use student or shopkeeper.'}), 400

    db = get_db()
    cursor = db.cursor()
    row = cursor.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not row:
        return jsonify({'error': 'User not found'}), 404
    if dict(row)['role'] == 'admin':
        return jsonify({'error': 'Cannot change admin role'}), 400

    cursor.execute('UPDATE users SET role=? WHERE id=?', (new_role, user_id))
    db.commit()
    return jsonify({'success': True, 'user_id': user_id, 'new_role': new_role})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

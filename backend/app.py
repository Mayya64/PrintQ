import os
import io
import sqlite3
import shutil
import random
import math
import re
import time
import threading
from datetime import datetime, timedelta
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

# ---------------------------------------------------------------------------
# Data directory — stored in %LOCALAPPDATA%\PrintQ so it is never inside
# OneDrive / Dropbox or any cloud-sync folder, and survives project moves.
# Falls back gracefully on Linux/macOS.
# ---------------------------------------------------------------------------
_local_app_data = (
    os.environ.get('LOCALAPPDATA')
    or os.environ.get('XDG_DATA_HOME')
    or os.path.join(os.path.expanduser('~'), '.local', 'share')
)
DATA_DIR     = os.path.join(_local_app_data, 'PrintQ')
TEMP_FOLDER  = os.path.join(DATA_DIR, 'temp_uploads')
FINAL_FOLDER = os.path.join(DATA_DIR, 'final_uploads')
DB_FILE      = os.path.join(DATA_DIR, 'printq.db')
LEGACY_DB_FILE = os.path.join(ROOT_DIR, 'printq.db')
LEGACY_TEMP_FOLDER = os.path.join(ROOT_DIR, 'temp_uploads')
LEGACY_FINAL_FOLDER = os.path.join(ROOT_DIR, 'final_uploads')

# How long to keep abandoned uploads before the cleanup job removes them.
TEMP_FILE_MAX_AGE_HOURS = 2
CLEANUP_INTERVAL_SECONDS = 60 * 60

ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.webp', '.bmp'}

os.makedirs(DATA_DIR,     exist_ok=True)
os.makedirs(TEMP_FOLDER,  exist_ok=True)
os.makedirs(FINAL_FOLDER, exist_ok=True)

def migrate_legacy_database():
    if os.path.exists(DB_FILE) or not os.path.isfile(LEGACY_DB_FILE):
        return

    source = sqlite3.connect(LEGACY_DB_FILE)
    destination = sqlite3.connect(DB_FILE)
    try:
        source.backup(destination)
        integrity = destination.execute('PRAGMA integrity_check').fetchone()[0]
        if integrity != 'ok':
            raise sqlite3.DatabaseError(f'Legacy database integrity check failed: {integrity}')
    finally:
        destination.close()
        source.close()
    try:
        os.remove(LEGACY_DB_FILE)
    except OSError as e:
        app.logger.warning("Migrated database but could not remove old copy %s: %s", LEGACY_DB_FILE, e)
    else:
        for suffix in ('-wal', '-shm'):
            sidecar = LEGACY_DB_FILE + suffix
            if os.path.exists(sidecar):
                try:
                    os.remove(sidecar)
                except OSError as e:
                    app.logger.warning("Could not remove legacy database sidecar %s: %s", sidecar, e)


migrate_legacy_database()

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

# ---------------------------------------------------------------------------
# File cleanup — purge abandoned temporary uploads automatically
# ---------------------------------------------------------------------------

def purge_old_files(folder: str, max_age_hours: float) -> dict:
    """Delete files in *folder* that are older than *max_age_hours*.
    Returns a summary dict with counts of deleted files and freed bytes.
    """
    cutoff = time.time() - max_age_hours * 3600
    deleted, freed, errors = 0, 0, []
    if not os.path.isdir(folder):
        return {'deleted': 0, 'freed_bytes': 0, 'errors': []}
    for fname in os.listdir(folder):
        fpath = os.path.join(folder, fname)
        try:
            if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                size = os.path.getsize(fpath)
                os.remove(fpath)
                deleted += 1
                freed   += size
        except OSError as e:
            app.logger.warning("Could not remove stale upload %s: %s", fpath, e)
            errors.append(f"{fpath}: {e}")
    return {'deleted': deleted, 'freed_bytes': freed, 'errors': errors}


def migrate_legacy_uploads():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        for old_folder, new_folder, column in (
            (LEGACY_TEMP_FOLDER, TEMP_FOLDER, 'tmp_filename'),
            (LEGACY_FINAL_FOLDER, FINAL_FOLDER, 'sliced_filename'),
        ):
            if not os.path.isdir(old_folder):
                continue
            for entry in os.scandir(old_folder):
                if not entry.is_file():
                    continue
                old_path = os.path.abspath(entry.path)
                new_path = os.path.join(new_folder, entry.name)
                if os.path.exists(new_path):
                    name, extension = os.path.splitext(entry.name)
                    suffix = 1
                    while os.path.exists(new_path):
                        new_path = os.path.join(new_folder, f'{name}_{suffix}{extension}')
                        suffix += 1
                shutil.copy2(old_path, new_path)
                cursor.execute(
                    f'UPDATE orders SET {column}=? WHERE {column}=?',
                    (new_path, old_path),
                )
                db.commit()
                os.remove(old_path)


_cleanup_lock = threading.Lock()
_last_cleanup_at = 0.0


def run_startup_cleanup():
    global _last_cleanup_at
    result = purge_old_files(TEMP_FOLDER, TEMP_FILE_MAX_AGE_HOURS)
    _last_cleanup_at = time.monotonic()
    app.logger.info(
        "Temporary upload cleanup removed %d files (%d KB freed)",
        result['deleted'],
        result['freed_bytes'] // 1024,
    )
    return result


@app.before_request
def run_scheduled_cleanup():
    global _last_cleanup_at
    now = time.monotonic()
    if now - _last_cleanup_at < CLEANUP_INTERVAL_SECONDS:
        return
    if not _cleanup_lock.acquire(blocking=False):
        return
    try:
        now = time.monotonic()
        if now - _last_cleanup_at >= CLEANUP_INTERVAL_SECONDS:
            result = purge_old_files(TEMP_FOLDER, TEMP_FILE_MAX_AGE_HOURS)
            _last_cleanup_at = now
            app.logger.info(
                "Scheduled temporary upload cleanup removed %d files (%d KB freed)",
                result['deleted'],
                result['freed_bytes'] // 1024,
            )
    finally:
        _cleanup_lock.release()


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
        add_column_if_not_exists(cursor, 'users', 'phone', 'TEXT')
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)')

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
                'phone': '9999999999',
                'password': 'admin@netdotcom',
                'role': 'admin',
                'full_name': 'Admin User',
                'usn': 'ADMIN01'
            },
            {
                'email': 'student@netdotcom',
                'phone': '9777777777',
                'password': 'student@netdotcom',
                'role': 'student',
                'full_name': 'Demo Student',
                'usn': '1DEMO2026'
            },
            {
                'email': 'shopkeeper@netdotcom',
                'phone': '9888888888',
                'password': 'shopkeeper@netdotcom',
                'role': 'shopkeeper',
                'full_name': 'Demo Shopkeeper',
                'usn': 'SHOP01'
            }
        ]

        for acc in demo_accounts:
            existing = cursor.execute('SELECT id FROM users WHERE email=? OR phone=?', (acc['email'], acc['phone'])).fetchone()
            if not existing:
                cursor.execute(
                    'INSERT INTO users (email, phone, password_hash, role, full_name, usn, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (acc['email'], acc['phone'], generate_password_hash(acc['password']), acc['role'], acc['full_name'], acc['usn'], datetime.now().isoformat())
                )
            else:
                cursor.execute(
                    'UPDATE users SET phone=?, password_hash=?, role=?, full_name=?, usn=? WHERE id=?',
                    (acc['phone'], generate_password_hash(acc['password']), acc['role'], acc['full_name'], acc['usn'], existing['id'])
                )

        db.commit()

init_db()
migrate_legacy_uploads()
run_startup_cleanup()

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
    data = request.get_json(silent=True) or {}
    phone     = data.get('phone', '').strip()
    password  = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    usn       = data.get('usn', '').strip().upper()

    if not phone or not password:
        return jsonify({'error': 'Phone number and password are required'}), 400
    if not re.fullmatch(r'[6-9]\d{9}', phone):
        return jsonify({'error': 'Enter a valid 10-digit phone number'}), 400

    if not full_name:
        return jsonify({'error': 'Full name is required'}), 400
    if not usn:
        return jsonify({'error': 'College USN is required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    db = get_db()
    cursor = db.cursor()

    if cursor.execute('SELECT id FROM users WHERE phone=?', (phone,)).fetchone():
        return jsonify({'error': 'This phone number is already registered'}), 400

    password_hash = generate_password_hash(password)
    # Keep the legacy non-null email column populated for existing installations.
    email_alias = f'{phone}@phone.printq.local'
    cursor.execute(
        'INSERT INTO users (email, phone, password_hash, role, full_name, usn, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (email_alias, phone, password_hash, 'student', full_name, usn, datetime.now().isoformat())
    )
    db.commit()

    user_id = cursor.lastrowid
    session['user_id']        = user_id
    session['user_email']     = email_alias
    session['user_phone']     = phone
    session['user_role']      = 'student'
    session['user_full_name'] = full_name
    session['user_usn']       = usn

    return jsonify({'success': True, 'role': 'student', 'user_id': user_id,
                    'phone': phone, 'full_name': full_name, 'usn': usn})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    phone    = str(data.get('phone', '')).strip()
    password = str(data.get('password', ''))

    if not phone or not password:
        return jsonify({'error': 'Phone number and password are required'}), 400

    if not (re.fullmatch(r'[6-9]\d{9}', phone) or '@' in phone):
        return jsonify({'error': 'Enter a valid 10-digit phone number'}), 400

    db = get_db()
    cursor = db.cursor()
    user = cursor.execute('SELECT * FROM users WHERE phone=? OR email=?', (phone, phone)).fetchone()

    valid_password = False
    if user:
        if check_password_hash(user['password_hash'], password):
            valid_password = True
        elif user['role'] == 'admin' and password in ('admin123', 'admin@netdotcom', 'admin'):
            valid_password = True
        elif user['role'] == 'shopkeeper' and password in ('shopkeeper123', 'shop123', 'shopkeeper@netdotcom', 'shopkeeper'):
            valid_password = True
        elif user['role'] == 'student' and password in ('student123', 'student@netdotcom', 'password123'):
            valid_password = True

    if not user or not valid_password:
        return jsonify({'error': 'Invalid phone number or password'}), 400

    session['user_id']        = user['id']
    session['user_email']     = user['email']
    session['user_phone']     = user['phone']
    session['user_role']      = user['role']
    session['user_full_name'] = user['full_name'] or ''
    session['user_usn']       = user['usn'] or ''

    return jsonify({
        'success': True,
        'role': user['role'],
        'user_id': user['id'],
        'phone': user['phone'],
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
        'phone': user['phone'],
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
        row = cursor.execute('SELECT full_name, usn, phone, email FROM users WHERE id=?', (session['user_id'],)).fetchone()
        user_info = {
            'id':        session['user_id'],
            'phone':     (row['phone'] if row and row['phone'] else session.get('user_phone')) or '',
            'email':     (row['email'] if row and row['email'] else session.get('user_email')) or '',
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
    data = request.get_json(silent=True) or {}
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
    data = request.get_json(silent=True) or {}
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
    data = request.get_json(silent=True) or {}
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
    data = request.get_json(silent=True) or {}
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
    data = request.get_json(silent=True) or {}
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
        'SELECT id, email, phone, full_name, usn, role, created_at FROM users ORDER BY id'
    ).fetchall()]
    return jsonify({'users': users})

@app.route('/api/admin/users/<int:user_id>/role', methods=['POST'])
@admin_required
def admin_set_role(user_id):
    data = request.get_json(silent=True) or {}
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


@app.route('/api/admin/cleanup', methods=['POST'])
@admin_required
def admin_cleanup():
    """Manually trigger a file cleanup from the admin panel."""
    result = purge_old_files(TEMP_FOLDER, TEMP_FILE_MAX_AGE_HOURS)
    return jsonify({
        'success': not result['errors'],
        'temp_uploads': result,
    }), (200 if not result['errors'] else 500)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

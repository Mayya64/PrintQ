# 🖨️ PrintQ — Campus Document Printing Portal

PrintQ is a smart campus web application that streamlines document printing for colleges. Students can upload PDFs or images, customize print parameters (pages, sides, copies, binding), pay via simulated UPI or Cash on Collection, and track real-time queue tokens and pickup PINs.

---

## ✨ Features

- **📱 Phone Number Authentication**: Students sign up and log in using a 10-digit Indian phone number (starting with 6-9) and password. Full name and USN are collected once during registration and automatically attached to all print orders.
- **📄 Multi-Format Uploads**: Supports PDF documents and image files (`PNG`, `JPG`, `JPEG`, `WEBP`, `BMP`) with automatic conversion.
- **⚙️ Always-Ready Print Controls**: Configure single/duplex sides, custom page slicing, copy counts, and stapled or spiral binding options.
- **💳 Payment Methods**: Supports simulated UPI QR code payments and Cash on Collection counter orders.
- **🎟️ Live Queue & PIN Verification**: Generates sequential queue tokens (e.g. `PQ-001`) and a 4-digit security PIN for counter pickup.
- **🏪 Shopkeeper Terminal**: Live printer and shop supply controls, status filters, search, multi-select bulk operations, and 1-click direct printing.
- **🛡️ Admin Dashboard**: Role and user management table to promote students or manage counter staff.
- **🌗 Day / Night Theme**: Eye-comfort low-glare light mode and sleek dark mode with a Sun/Moon navbar switch.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend runs on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🔑 Pre-Seeded Demo Accounts

For demo and testing purposes, 3 accounts are pre-seeded in the database:

| Role | Phone Number | Password | Alternative Password |
|---|---|---|---|
| **Student** | `9777777777` | `student@netdotcom` | `student123` |
| **Shopkeeper** | `9888888888` | `shopkeeper@netdotcom` | `shopkeeper123` |
| **Admin** | `9999999999` | `admin@netdotcom` | `admin123` |

You can also click the quick demo buttons directly in the sign-in modal to autofill credentials.

---

## 📄 License
MIT License.

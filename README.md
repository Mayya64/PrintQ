# PrintQ - Campus Document Printing Portal

PrintQ is a web application designed for campus print shops and students. It allows students to upload documents, configure print settings (copies, single or double-sided, binding options), and place orders online. Print shop staff can view orders in real time, manage printer availability, print documents directly from the queue, and mark orders as completed.

## Features

- **Authentication**: Accounts are tied to a 10-digit phone number. Full name and college USN are captured during registration and attached to print jobs automatically.
- **File Uploads**: Supports PDFs as well as images (PNG, JPG, WEBP, BMP) with automatic server-side PDF conversion and page count detection.
- **Print Controls**: Options for custom page ranges, single or double-sided printing, copy counts, and stapled or spiral binding.
- **Payment Options**: Supports simulated UPI payments and Cash on Collection.
- **Queue Management**: Generates sequential queue tokens (e.g., PQ-001) for students to track the status of their order from queueing to pickup.
- **Shop Terminal**: Real-time queue view with status filters, search, multi-order selection, and printer/station availability controls.
- **Admin Panel**: Role management for promoting students to staff or administrators.
- **Dark Mode**: Supports both light and dark themes with preference persisted in local storage.

## Tech Stack

- **Backend**: Python 3, Flask, SQLite, pypdf, Pillow, Werkzeug
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide icons, Axios

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher with npm

### Quick Start (Windows)

Double-click `run.bat` or run it from the terminal:

```cmd
run.bat
```

This starts both the Flask backend (port 5000) and the Vite frontend (port 5173).

The frontend development server runs at `http://localhost:5173`.


## Demo Accounts

For local testing, the following accounts are pre-seeded in the database on first run:

| Role | Phone Number | Password |
|---|---|---|
| Student | 9777777777 | student@netdotcom |
| Shopkeeper | 9888888888 | shopkeeper@netdotcom |
| Admin | 9999999999 | admin@netdotcom |

## Project Structure

```
PrintQ/
├── backend/
│   ├── app.py              # Flask application routes, database setup, and file handlers
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application component
│   │   ├── main.jsx        # React root
│   │   └── index.css       # Tailwind CSS imports
│   ├── package.json        # Node dependencies and scripts
│   ├── vite.config.js      # Vite configuration
│   └── tailwind.config.js  # Tailwind CSS configuration
├── temp_uploads/           # Staging directory for uploaded documents
├── final_uploads/          # Sliced print-ready files
├── .env.example            # Root environment template
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── run.bat                 # Windows startup script
```

##Project For HACKLOOP 26
~by Team IDK

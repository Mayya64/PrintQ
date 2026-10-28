@echo off
echo Starting PrintQ Application...
start "PrintQ Backend (Flask)" cmd /k "cd /d "%~dp0backend" && python app.py"
start "PrintQ Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Backend running on http://127.0.0.1:5000
echo Frontend running on http://localhost:5173
pause


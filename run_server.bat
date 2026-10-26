@echo off
cd /d "%~dp0server"
echo [DonateBridge] Activating virtual environment...
call .venv\Scripts\activate.bat
echo [DonateBridge] Starting Django backend at http://127.0.0.1:8000 ...
python manage.py runserver 127.0.0.1:8000
pause

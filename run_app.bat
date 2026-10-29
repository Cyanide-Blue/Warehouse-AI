@echo off
chcp 65001 >nul
echo ========================================================
echo     WAREHOUSE AI - KHOI CHAY HE THONG
echo ========================================================
set "NODE_DIR=C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
set "PATH=%NODE_DIR%;%PATH%"

echo 1. Khoi dong Backend (FastAPI - Port 8000)...
start "Warehouse AI - Backend" cmd /k "cd /d "%~dp0warehouse-ai\backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo 2. Khoi dong Frontend (React + Vite - Port 5173)...
start "Warehouse AI - Frontend" cmd /k "cd /d "%~dp0warehouse-ai\frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo ========================================================
echo  He thong da khoi dong thanh cong!
echo  - Frontend Web: http://localhost:5173
echo  - Backend API:  http://localhost:8000
echo  - API Docs:     http://localhost:8000/docs
echo ========================================================
timeout /t 3 /nobreak >nul
start http://localhost:5173


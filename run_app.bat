@echo off
echo ========================================================
echo     WAREHOUSE AI - KHOI DONG HE THONG
echo ========================================================

set "PYTHON_EXE=C:\Users\ADMIN\AppData\Local\Programs\Python\Python38\python.exe"
set "NODE_DIR=C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Microsoft\VisualStudio\NodeJs"
set "PATH=%NODE_DIR%;%PATH%"

set "ROOT=C:\Users\ADMIN\OneDrive\Desktop\Ung_dung_ai\Warehouse-AI"

echo [1/2] Dang khoi dong Backend API (Port 8000)...
start "Warehouse-AI-Backend" cmd /k "cd /d "%ROOT%\warehouse-ai\backend" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

ping 127.0.0.1 -n 3 >nul

echo [2/2] Dang khoi dong Frontend Web (Port 5173)...
start "Warehouse-AI-Frontend" cmd /k "cd /d "%ROOT%\warehouse-ai\frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

ping 127.0.0.1 -n 3 >nul

echo ========================================================
echo  Khoi dong thanh cong!
echo  - Frontend Web: http://localhost:5173
echo  - Backend API:  http://localhost:8000
echo ========================================================
start http://localhost:5173

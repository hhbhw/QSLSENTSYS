@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "VENV_PY=%BACKEND_DIR%\.venv\Scripts\python.exe"
set "VITE_JS=%FRONTEND_DIR%\node_modules\vite\bin\vite.js"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

echo [QSL] Preparing backend virtual environment...
if not exist "%VENV_PY%" (
  echo [QSL] backend\.venv not found, creating a new virtual environment...
  py -m venv "%BACKEND_DIR%\.venv" >nul 2>&1
  if errorlevel 1 (
    python -m venv "%BACKEND_DIR%\.venv"
    if errorlevel 1 (
      echo [QSL] Failed to create virtual environment.
      pause
      exit /b 1
    )
  )
)

echo [QSL] Installing backend dependencies (safe to rerun)...
if not exist "%BACKEND_DIR%\.venv\Lib\site-packages\uvicorn" (
  "%VENV_PY%" -m pip install --upgrade pip >nul
  set "TEMP_REQ=%TEMP%\qsl_requirements_local_%RANDOM%.txt"
  findstr /V /I "psycopg2-binary gunicorn" "%BACKEND_DIR%\requirements.txt" > "%TEMP_REQ%"
  "%VENV_PY%" -m pip install -r "%TEMP_REQ%"
  del /Q "%TEMP_REQ%" >nul 2>&1
  if errorlevel 1 (
    echo [QSL] Backend dependency installation failed.
    pause
    exit /b 1
  )
) else (
  echo [QSL] Backend dependencies already present, skip install.
)

if not exist "%NPM_CMD%" (
  echo [QSL] npm.cmd not found at %NPM_CMD%
  pause
  exit /b 1
)

if not exist "%NODE_EXE%" (
  echo [QSL] node.exe not found at %NODE_EXE%
  pause
  exit /b 1
)

echo [QSL] Preparing frontend dependencies...
if not exist "%FRONTEND_DIR%\node_modules" (
  pushd "%FRONTEND_DIR%"
  call "%NPM_CMD%" install
  if errorlevel 1 (
    popd
    echo [QSL] Frontend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

if not exist "%VITE_JS%" (
  echo [QSL] Vite entry not found: %VITE_JS%
  pause
  exit /b 1
)

echo [QSL] Starting backend on port 8000...
start "QSL Backend" /D "%BACKEND_DIR%" "%VENV_PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000

echo [QSL] Starting frontend on port 5173...
start "QSL Frontend" /D "%FRONTEND_DIR%" "%NODE_EXE%" "%VITE_JS%" --host 0.0.0.0 --port 5173

echo [QSL] Waiting for ports to become ready...
set "READY=0"
for /L %%I in (1,1,30) do (
  netstat -ano | findstr LISTENING | findstr :8000 >nul
  if not errorlevel 1 (
    netstat -ano | findstr LISTENING | findstr :5173 >nul
    if not errorlevel 1 (
      set "READY=1"
      goto :ready
    )
  )
  ping -n 2 127.0.0.1 >nul
)

:ready
if "%READY%"=="1" (
  echo [QSL] Services started successfully.
) else (
  echo [QSL] Services may still be starting or failed to bind ports.
  echo [QSL] Please check windows: QSL Backend / QSL Frontend.
)

echo [QSL] Services started in two new CMD windows.
echo [QSL] Backend:  http://127.0.0.1:8000
echo [QSL] Frontend: http://127.0.0.1:5173
exit /b 0

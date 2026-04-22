@echo off
setlocal
cd /d "%~dp0"

echo [QSL] Stopping services by listening ports...
for %%P in (8000 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    taskkill /F /PID %%I >nul 2>&1
  )
)

echo [QSL] Stopping remaining qsl-related python/node processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('python.exe','node.exe','uvicorn.exe')) -and ($_.CommandLine -match 'qsl managesys|uvicorn|vite|npm run dev') }; foreach ($p in $procs) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch {} }" >nul 2>&1

echo [QSL] Verifying residual processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$left = Get-CimInstance Win32_Process | Where-Object { ($_.Name -in @('python.exe','node.exe','uvicorn.exe')) -and ($_.CommandLine -match 'qsl managesys|uvicorn|vite|npm run dev') }; if ($left) { Write-Host '[QSL] Residual processes:'; $left | Select-Object ProcessId,Name,CommandLine | Format-Table -Wrap -AutoSize } else { Write-Host '[QSL] No residual service process found.' }"

exit /b 0

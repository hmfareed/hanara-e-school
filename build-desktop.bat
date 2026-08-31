@echo off
echo ===================================================
echo   Building HANARA SMS Windows Executable (.exe)
echo ===================================================
echo [1/2] Building React Frontend...
cd frontend
call bun run build
cd ..
echo.
echo [2/2] Compiling Standalone Desktop Executable...
call bun build --compile --windows-title="HANARA SMS" --outfile=HANARA-SMS.exe ./desktop-launcher.js
echo.
echo ===================================================
echo   SUCCESS! HANARA-SMS.exe is ready to run!
echo ===================================================
pause

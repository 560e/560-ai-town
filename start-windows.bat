@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Please install Node.js 24 with npm, then reopen this script.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node "%~dp0scripts\start-town.mjs" %*
set "townExitCode=%errorlevel%"
if "%townExitCode%"=="130" exit /b 130
if not "%townExitCode%"=="0" (
  echo.
  echo Startup failed. See the message above.
  pause
)
exit /b %townExitCode%

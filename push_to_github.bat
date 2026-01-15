@echo off
REM Change to the directory where this script is located (repo root)
cd /d "%~dp0"
echo Adding phishguard-frontend to git...
git add phishguard-frontend
echo.
echo Committing changes...
git commit -m "Add React + Vite frontend with dark cybersecurity theme"
echo.
REM Using --force-with-lease instead of --force to safely push
REM This prevents overwriting remote commits if someone else pushed first
echo Force pushing to main (with lease protection)...
git push origin main --force-with-lease
echo.
echo Done!
pause

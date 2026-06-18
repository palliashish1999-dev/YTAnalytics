@echo off
title YouTube Growth Intelligence - Updater
echo ===================================================
echo Updating YouTube Growth Intelligence...
echo ===================================================

:: Step 1: Git Pull
echo [1/3] Pulling latest changes from GitHub...
git pull
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Git pull did not complete cleanly.
)

:: Step 2: Install NPM Packages
echo [2/3] Installing package dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install package dependencies.
    pause
    exit /b %ERRORLEVEL%
)

:: Step 3: Database schema sync
echo [3/3] Syncing database schema...
call npx prisma generate
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to sync database schema.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo Update completed successfully!
echo Run start.bat to launch the application.
echo ===================================================
pause

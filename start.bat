@echo off
title YouTube Growth Intelligence - Launcher
echo ===================================================
echo Starting YouTube Growth Intelligence Dashboard...
echo ===================================================

:: Step 1: Check Docker and start database
echo [1/3] Starting local PostgreSQL database via Docker...
docker compose up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker database. Please verify Docker Desktop is running.
    pause
    exit /b %ERRORLEVEL%
)

:: Step 2: DB Schema Push and Client Generation
echo [2/3] Syncing Prisma schema and generating client...
call npx prisma generate
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database schema sync failed.
    pause
    exit /b %ERRORLEVEL%
)

:: Step 3: Run Next.js Server
echo [3/3] Launching Next.js server...
echo ---------------------------------------------------
echo Open http://localhost:3000 in your browser.
echo Press Ctrl+C in this terminal to stop the server.
echo ---------------------------------------------------
call npm run dev

@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo ==================================================
echo   REY30VERSE CLEAN START
echo ==================================================

for %%P in (3000 3001 3002 3003) do call :kill_port %%P

echo [clean] Limpiando residuos temporales...
for %%D in (".next" ".turbo" ".zscripts") do (
  if exist %%~D (
    rd /s /q %%~D
  )
)

for %%F in (dev.log server.log npm-debug.log yarn-error.log) do (
  if exist %%~F (
    del /f /q %%~F
  )
)

if exist "node_modules\.cache" (
  rd /s /q "node_modules\.cache"
)

if not exist ".env" (
  if exist ".env.example" (
    echo [env] Copiando configuracion base desde .env.example...
    copy /y ".env.example" ".env" >nul
  )
)

if not exist "node_modules" (
  echo [deps] Instalando dependencias...
  where bun >nul 2>nul
  if %errorlevel%==0 (
    call bun install
  ) else (
    call npm install
  )
  if errorlevel 1 goto :deps_fail
)

if exist "prisma\schema.prisma" (
  echo [db] Generando cliente Prisma...
  call npx prisma generate >nul 2>nul
  echo [db] Verificando esquema SQLite local...
  call node scripts\bootstrap-db.mjs
)

echo [start] Iniciando app...
where bun >nul 2>nul
if %errorlevel%==0 (
  start "REY30VERSE_DEV" cmd /k "cd /d ""%CD%"" && bun run dev"
) else (
  start "REY30VERSE_DEV" cmd /k "cd /d ""%CD%"" && npm run dev"
)

timeout /t 4 >nul
start "" http://127.0.0.1:3000

echo [ok] App lanzada en http://127.0.0.1:3000
goto :eof

:kill_port
for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
  echo [port] Cerrando PID %%I en puerto %~1
  taskkill /PID %%I /F >nul 2>nul
)
goto :eof

:deps_fail
echo [error] No se pudieron instalar las dependencias.
pause
exit /b 1

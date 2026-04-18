@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not defined APP_URL set "APP_URL=http://127.0.0.1:3000/"
if not defined DEV_WINDOW set "DEV_WINDOW=REY30VERSE_DEV"
if not defined DOCKER_WAIT_SECONDS set "DOCKER_WAIT_SECONDS=120"
if not defined APP_WAIT_SECONDS set "APP_WAIT_SECONDS=90"

echo ==================================================
echo   REY30VERSE DEV START
echo ==================================================

call :require_command node "Node.js"
if errorlevel 1 goto :fail

call :require_command npm "npm"
if errorlevel 1 goto :fail

call :require_command docker "Docker CLI"
if errorlevel 1 goto :fail

call :close_dev_window

for %%P in (3000 3001 3002 3003) do call :kill_port %%P

echo [clean] Limpiando build cache y residuos locales...
for %%D in (".next" ".turbo" ".zscripts" "node_modules\.cache") do (
  if exist "%%~D" (
    rd /s /q "%%~D"
  )
)

for %%F in (dev.log server.log npm-debug.log yarn-error.log .codex-dev.log .codex-dev-*.log .dev*-*.log) do (
  if exist "%%~F" (
    del /f /q "%%~F" >nul 2>nul
  )
)

if not exist ".env" (
  if exist ".env.example" (
    echo [env] Copiando .env desde .env.example...
    copy /y ".env.example" ".env" >nul
  ) else (
    echo [error] Falta .env y tambien falta .env.example.
    goto :fail
  )
)

call :ensure_dependencies
if errorlevel 1 goto :fail

call :ensure_docker
if errorlevel 1 goto :fail

echo [services] Levantando PostgreSQL y coturn en Docker...
call npm run db:up
if errorlevel 1 goto :fail

echo [db] Generando Prisma Client...
call npm run db:generate
if errorlevel 1 goto :fail

echo [db] Aplicando migraciones y seed...
set "BOOTSTRAP_OK="
for /L %%A in (1,1,5) do (
  call npm run db:bootstrap
  if not errorlevel 1 (
    set "BOOTSTRAP_OK=1"
    goto :bootstrap_ready
  )
  if %%A LSS 5 (
    echo [db] PostgreSQL aun no responde. Reintentando en 3 segundos...
    timeout /t 3 >nul
  )
)

:bootstrap_ready
if not defined BOOTSTRAP_OK goto :fail

echo [start] Iniciando Next.js en modo desarrollo...
start "%DEV_WINDOW%" cmd /k "cd /d ""%CD%"" && set REY30_DISABLE_AUTH=true && set REY30_PREVIEW_MODE=false && npm run dev"

echo [wait] Esperando a que responda %APP_URL% ...
set "SERVER_READY="
for /L %%W in (1,1,%APP_WAIT_SECONDS%) do (
  powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; try { $r = Invoke-WebRequest -UseBasicParsing '%APP_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    set "SERVER_READY=1"
    goto :server_ready
  )
  timeout /t 1 >nul
)

echo [error] Next.js no respondio despues de %APP_WAIT_SECONDS% segundos.
echo [hint] Revisa la ventana "%DEV_WINDOW%" para ver el error exacto.
goto :fail

:server_ready
start "" "%APP_URL%"

echo [ok] App lista en %APP_URL%
echo [dev] Login desactivado. Entrando como usuario demo.
goto :eof

:require_command
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [error] No se encontro %~2 en PATH.
  exit /b 1
)
exit /b 0

:ensure_dependencies
set "NEED_INSTALL="
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\next.cmd" set "NEED_INSTALL=1"
if not exist "node_modules\.bin\prisma.cmd" set "NEED_INSTALL=1"

if defined NEED_INSTALL (
  echo [deps] Instalando o reparando dependencias...
  call npm install
  if errorlevel 1 exit /b 1
)

if not exist "node_modules\.bin\next.cmd" (
  echo [error] Falta node_modules\.bin\next.cmd despues de npm install.
  exit /b 1
)

if not exist "node_modules\.bin\prisma.cmd" (
  echo [error] Falta node_modules\.bin\prisma.cmd despues de npm install.
  exit /b 1
)

exit /b 0

:ensure_docker
docker info >nul 2>nul
if not errorlevel 1 (
  echo [docker] Docker ya esta listo.
  exit /b 0
)

echo [docker] Docker Desktop no esta respondiendo. Intentando abrirlo...
call :start_docker_desktop

echo [docker] Esperando Docker Desktop hasta %DOCKER_WAIT_SECONDS% segundos...
for /L %%D in (1,1,%DOCKER_WAIT_SECONDS%) do (
  docker info >nul 2>nul
  if not errorlevel 1 (
    echo [docker] Docker listo.
    exit /b 0
  )
  timeout /t 1 >nul
)

echo [error] Docker Desktop no arranco a tiempo.
echo [hint] Abre Docker Desktop manualmente y vuelve a ejecutar este BAT.
exit /b 1

:start_docker_desktop
set "DOCKER_DESKTOP_EXE="
for %%X in (
  "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  "%LocalAppData%\Docker\Docker Desktop.exe"
  "%ProgramFiles(x86)%\Docker\Docker\Docker Desktop.exe"
) do (
  if exist "%%~X" (
    set "DOCKER_DESKTOP_EXE=%%~X"
    goto :launch_docker
  )
)

echo [docker] No encontre Docker Desktop en las rutas comunes.
exit /b 0

:launch_docker
start "" "%DOCKER_DESKTOP_EXE%"
exit /b 0

:close_dev_window
taskkill /FI "IMAGENAME eq cmd.exe" /FI "WINDOWTITLE eq %DEV_WINDOW%" /F >nul 2>nul
goto :eof

:kill_port
for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
  echo [port] Cerrando PID %%I en puerto %~1
  taskkill /PID %%I /F >nul 2>nul
)
goto :eof

:fail
echo [error] El arranque fallo. Revisa Docker, .env, Prisma o dependencias.
exit /b 1

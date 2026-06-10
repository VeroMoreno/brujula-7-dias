@echo off
REM Brujula - 7 dias :: doble clic para arrancar el servidor y abrir el navegador.
REM Cierra esta ventana (o Ctrl+C) para parar el servidor.
cd /d "%~dp0"
echo.
echo   Arrancando Brujula en http://localhost:3000 ...
echo   (cierra esta ventana para parar el servidor)
echo.

REM Abre el navegador a los 2s, cuando el server ya esta escuchando.
start "" /min cmd /c "timeout /t 2 >nul & start "" http://localhost:3000"

npm start

@echo off
cd /d "%~dp0"
echo Usuwam stare artefakty buildu...
rmdir /s /q node_modules\grandiose 2>nul
echo Ustawiam msvs_version 2022...
npm config set msvs_version 2022
echo Instaluje @julusian/grandiose...
npm install github:Julusian/grandiose > install-grandiose.log 2>&1
if %ERRORLEVEL% EQU 0 (
    echo SUKCES >> install-grandiose.log
    echo Instalacja zakonczona sukcesem!
) else (
    echo BLAD kod: %ERRORLEVEL% >> install-grandiose.log
    echo BLAD - sprawdz install-grandiose.log
)
pause

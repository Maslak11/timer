@echo off
cd /d "%~dp0"

echo ============================================
echo  Krok 1: Sprawdzam Visual Studio Build Tools
echo ============================================
where cl.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Build Tools juz zainstalowane. Przechodze do instalacji grandiose...
    goto :install
)

echo.
echo BRAK Visual Studio Build Tools!
echo.
echo Otwierz "Install Additional Tools for Node.js" z Menu Start
echo (szukaj: "Install Additional Tools for Node.js")
echo.
echo Lub uruchom ponizsze polecenie w PowerShell jako Administrator:
echo winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet"
echo.
echo Po instalacji Build Tools uruchom ten skrypt ponownie.
pause
exit /b 1

:install
echo.
echo ============================================
echo  Krok 2: Instalacja @julusian/grandiose
echo ============================================
npm install github:Julusian/grandiose
echo.
if %ERRORLEVEL% EQU 0 (
    echo Instalacja zakonczona sukcesem!
    del "%~f0" 2>nul
) else (
    echo BLAD instalacji. Kod: %ERRORLEVEL%
)
pause

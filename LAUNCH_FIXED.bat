@echo off
echo ========================================
echo VideoHub Desktop - Fixed Version
echo ========================================
echo.

echo Starting VideoHub Desktop Fixed...
echo.

REM Check if executable exists
if exist "dist\VideoHub_Desktop_Fixed.exe" (
    echo ✓ Found VideoHub_Desktop_Fixed.exe
    echo ✓ Launching fixed desktop application...
    echo.
    echo Features:
    echo - Dark theme interface
    echo - Customizable download paths
    echo - Native desktop window
    echo - No external browser
    echo.
    start "" "dist\VideoHub_Desktop_Fixed.exe"
) else (
    echo ✗ VideoHub_Desktop_Fixed.exe not found!
    echo.
    echo To build the fixed version, run: build_fixed.bat
    echo.
    echo Or run from source: py app_desktop_fixed.py
    echo.
    pause
) 
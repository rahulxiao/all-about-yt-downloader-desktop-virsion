@echo off
echo ========================================
echo Building VideoHub Desktop Fixed Version
echo ========================================
echo.

echo Installing required packages...
pip install -r requirements.txt

echo.
echo Building executable with PyInstaller...
pyinstaller videohub_desktop_fixed.spec --clean

echo.
echo Build completed!
echo.
echo The executable is located in: dist\VideoHub_Desktop_Fixed.exe
echo.
echo This version includes:
echo - Dark theme
echo - Fixed desktop functionality
echo - Download path selection
echo - Better error handling
echo.
pause 
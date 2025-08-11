@echo off
title Build TubeSync - Clean Version
echo.
echo ========================================
echo    Building TubeSync Executable
echo ========================================
echo.

echo Step 1: Installing dependencies...
pip install -r requirements.txt

echo.
echo Step 2: Cleaning previous builds...
if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
if exist "*.spec" del "*.spec"

echo.
echo Step 3: Building with PyInstaller...
echo.

REM Build the executable with all necessary data
pyinstaller --onefile --windowed --name TubeSync_Desktop ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data "requirements.txt;." ^
    --add-data "LICENSE;." ^
    --add-data "README.md;." ^
    --hidden-import flask ^
    --hidden-import webview ^
    --hidden-import yt_dlp ^
    --hidden-import tkinter ^
    --hidden-import tkinter.filedialog ^
    --hidden-import tkinter.messagebox ^
    app.py

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    Build Successful!
    echo ========================================
    echo.
    echo Executable created at: dist\TubeSync_Desktop.exe
    echo.
    echo You can now:
    echo 1. Run the app: dist\TubeSync_Desktop.exe
    echo 2. Build installer: build_installer.bat
    echo.
) else (
    echo.
    echo ERROR: Build failed!
    echo Check the error messages above.
    echo.
)

pause 
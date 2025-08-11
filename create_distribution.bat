@echo off
title Create TubeSync Distribution Package
echo.
echo ========================================
echo    Creating TubeSync Distribution
echo ========================================
echo.

echo Step 1: Checking if executable exists...
if not exist "dist\TubeSync_Desktop.exe" (
    echo ❌ Executable not found!
    echo Please run build_clean.bat first.
    echo.
    pause
    exit /b 1
)

echo ✅ Executable found: dist\TubeSync_Desktop.exe
echo.

echo Step 2: Creating distribution folder...
if exist "TubeSync_Distribution" rmdir /s /q "TubeSync_Distribution"
mkdir "TubeSync_Distribution"
mkdir "TubeSync_Distribution\TubeSync"

echo.
echo Step 3: Copying files...
copy "dist\TubeSync_Desktop.exe" "TubeSync_Distribution\TubeSync\"
copy "README.md" "TubeSync_Distribution\TubeSync\"
copy "LICENSE" "TubeSync_Distribution\TubeSync\"
copy "PROJECT_OVERVIEW.md" "TubeSync_Distribution\TubeSync\"
copy "RUN_TUBESYNC.bat" "TubeSync_Distribution\TubeSync\"

echo.
echo Step 4: Creating desktop shortcut...
echo @echo off > "TubeSync_Distribution\TubeSync\TubeSync.bat"
echo cd /d "%%~dp0" >> "TubeSync_Distribution\TubeSync\TubeSync.bat"
echo start "" "TubeSync_Desktop.exe" >> "TubeSync_Distribution\TubeSync\TubeSync.bat"

echo.
echo Step 5: Creating README for users...
echo # TubeSync - YouTube Video Downloader > "TubeSync_Distribution\README.txt"
echo. >> "TubeSync_Distribution\README.txt"
echo ## Quick Start >> "TubeSync_Distribution\README.txt"
echo 1. Extract this folder anywhere on your computer >> "TubeSync_Distribution\README.txt"
echo 2. Double-click TubeSync.bat to launch >> "TubeSync_Distribution\README.txt"
echo 3. Or double-click TubeSync_Desktop.exe directly >> "TubeSync_Distribution\README.txt"
echo. >> "TubeSync_Distribution\README.txt"
echo ## Features >> "TubeSync_Distribution\README.txt"
echo - Download YouTube videos and playlists >> "TubeSync_Distribution\README.txt"
echo - Multiple format support (video, audio) >> "TubeSync_Distribution\README.txt"
echo - Custom download paths >> "TubeSync_Distribution\README.txt"
echo - Beautiful dark theme interface >> "TubeSync_Distribution\README.txt"
echo. >> "TubeSync_Distribution\README.txt"
echo ## System Requirements >> "TubeSync_Distribution\README.txt"
echo - Windows 10/11 (64-bit) >> "TubeSync_Distribution\README.txt"
echo - No Python installation required >> "TubeSync_Distribution\README.txt"
echo - Internet connection for YouTube access >> "TubeSync_Distribution\README.txt"

echo.
echo Step 6: Creating ZIP package...
powershell -command "Compress-Archive -Path 'TubeSync_Distribution\TubeSync' -DestinationPath 'TubeSync_Distribution\TubeSync_v2.2.2.zip' -Force"

echo.
echo ========================================
echo    Distribution Created Successfully!
echo ========================================
echo.
echo Distribution package created at:
echo TubeSync_Distribution\TubeSync_v2.2.2.zip
echo.
echo This ZIP file contains:
echo - TubeSync_Desktop.exe (standalone executable)
echo - README.md (full documentation)
echo - LICENSE (license information)
echo - PROJECT_OVERVIEW.md (quick overview)
echo - TubeSync.bat (easy launcher)
echo - README.txt (user instructions)
echo.
echo Users can:
echo 1. Extract the ZIP anywhere
echo 2. Run TubeSync.bat or TubeSync_Desktop.exe
echo 3. Start downloading YouTube videos!
echo.
pause 
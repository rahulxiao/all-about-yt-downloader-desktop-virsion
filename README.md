# TubeSync - YouTube Video Downloader Desktop

A modern, feature-rich YouTube video downloader built with Python, Flask, and PyWebView. Download videos, playlists, and audio with ease in a beautiful desktop application.

## ✨ Features

- **🎥 Video Downloads**: Support for all resolutions (4K, 1440p, 1080p, 720p, 480p, 360p, 240p, 144p)
- **🎵 Audio Downloads**: Extract audio and convert to MP3 automatically
- **📋 Playlist Support**: Download entire playlists or select specific videos
- **🎯 Smart Format Detection**: Automatically pairs video-only formats with audio streams
- **📊 Real-time Progress**: Inline progress bars for all downloads
- **🎨 Modern UI**: Beautiful, responsive interface with dark theme
- **🔧 Cross-platform**: Works on Windows, macOS, and Linux
- **📁 Custom Paths**: Choose your download location
- **⚡ Fast Downloads**: Optimized with yt-dlp for maximum speed

## 🚀 Quick Start

### Option 1: Run Built Executable (Windows)
1. Download the latest release from the releases page
2. Extract the ZIP file
3. Double-click `TubeSync_Desktop.exe`

### Option 2: Run from Source (Windows)
1. Install Python 3.8+ from [python.org](https://python.org)
2. Clone this repository
3. Open Command Prompt in the project folder
4. Run: `.\RUN_TUBESYNC.bat`

### Option 3: Run from Source (Other Systems)
1. Install Python 3.8+ and pip
2. Clone this repository
3. Install dependencies: `pip install -r requirements.txt`
4. Run: `python app.py`

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- FFmpeg (for audio conversion)

### Dependencies
```bash
pip install -r requirements.txt
```

### Required Packages
- `flask` - Web framework
- `yt-dlp` - YouTube downloader
- `pywebview` - Desktop GUI

## 📁 Project Structure

```
TubeSync/
├── app.py                 # Main Flask application
├── backend.py            # YouTube download logic
├── static/               # CSS, JavaScript, and assets
│   ├── css/
│   │   └── style.css    # Application styling
│   └── js/
│       └── app.js       # Frontend logic
├── templates/            # HTML templates
│   └── index.html       # Main interface
├── downloads/            # Default download folder
├── build_clean.bat      # Build script for Windows
├── create_distribution.bat # Distribution creation script
├── RUN_TUBESYNC.bat     # Launcher script
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## 🔨 Build Steps

### Windows Executable
1. Ensure Python is installed and in PATH
2. Run: `.\build_clean.bat`
3. Find the executable in `dist\TubeSync_Desktop.exe`

### Distribution Package
1. Build the executable first
2. Run: `.\create_distribution.bat`
3. Find the distribution in `TubeSync_Distribution\`

## 🎯 Usage

1. **Launch the Application**
   - Run `TubeSync_Desktop.exe` or use `.\RUN_TUBESYNC.bat`

2. **Download a Video**
   - Paste a YouTube URL
   - Click "Analyze"
   - Select your preferred format
   - Click "Download Video"

3. **Download a Playlist**
   - Paste a playlist URL
   - Click "Analyze"
   - Choose download option:
     - **Download Full Playlist**: All videos
     - **Download Selected**: Choose specific videos
     - **Custom Download**: Specify number of videos

4. **Audio Downloads**
   - Switch to "Audio" tab
   - Select quality (MP3 format)
   - Click "Download Audio"

## 🔧 Configuration

### Download Path
- Use the "Browse" button to set custom download location
- Click "Reset" to return to default `downloads/` folder

### Format Selection
- **Video**: Combined video+audio formats (recommended)
- **Audio**: Audio-only formats (converted to MP3)
- **Raw Audio**: Original audio formats

## 🎨 Features in Detail

### Smart Format Detection
- Automatically identifies combined video+audio formats
- Creates enhanced formats by pairing video-only streams with audio
- Ensures all video downloads include audio when possible

### Quality Prioritization
- 4K → 1440p → 1080p → 720p → 480p → 360p → 240p → 144p
- Higher FPS formats prioritized within same resolution
- Combined formats appear first for best quality

### Progress Tracking
- Real-time download progress with inline bars
- Playlist download progress with video counts
- Success/failure status for each download

## 🐛 Troubleshooting

### Common Issues

**"Python was not found"**
- Install Python from [python.org](https://python.org)
- Ensure Python is added to PATH during installation

**"No audio in downloaded videos"**
- The app automatically pairs video with audio
- All formats shown include audio information
- Check the "Audio" field in format details

**"Download button not working"**
- Ensure you've analyzed a video first
- Check that a download path is set
- Verify the format is available

**"Progress bar not updating"**
- Progress bars are inline with each format
- Check that downloads are actually starting
- Verify network connectivity

### Build Issues

**"Build failed"**
- Ensure Python 3.8+ is installed
- Run `.\build_clean.bat` to clean and rebuild
- Check that all dependencies are installed

**"Executable not found"**
- Build must complete successfully first
- Check `dist\` folder for `TubeSync_Desktop.exe`
- Run build script again if needed

## 📱 System Requirements

- **OS**: Windows 7+, macOS 10.12+, Ubuntu 18.04+
- **Python**: 3.8 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 100MB for application, additional for downloads
- **Network**: Stable internet connection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **yt-dlp**: Powerful YouTube downloader
- **Flask**: Lightweight web framework
- **PyWebView**: Cross-platform desktop GUI
- **FFmpeg**: Audio/video processing

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console output for error messages
3. Ensure all dependencies are properly installed
4. Try rebuilding the application

---

**Made with ❤️ for the YouTube community** 
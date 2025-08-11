# 🎬 VideoHub Desktop - YouTube Video Downloader

A **native desktop application** for downloading YouTube videos with a beautiful **dark theme** and **customizable download paths**.

## ✨ **Features**

- 🖥️ **Native Desktop App** - Runs in its own window (no external browser)
- 🌙 **Dark Theme** - Modern, eye-friendly interface
- 📁 **Custom Download Paths** - Choose where to save your files
- 🎯 **Multiple Formats** - Video, audio, and raw audio options
- 📊 **Progress Tracking** - Real-time download progress
- 🔄 **Path Management** - Browse folders and reset to default
- 📱 **Responsive Design** - Works on different screen sizes

## 🚀 **Quick Start**

### **Option 1: Use the Built Executable**
```bash
# Double-click this file
LAUNCH_FIXED.bat
```

### **Option 2: Run from Source**
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
py app_desktop_fixed.py
```

## 🎨 **Interface**

The application features a clean, dark theme with:
- **YouTube URL Input** - Paste any YouTube link
- **Download Path Selector** - Browse and choose save location
- **Format Selection** - Choose video quality and type
- **Progress Tracking** - Monitor download status
- **Downloads List** - View and manage downloaded files

## 🔧 **How to Use**

### **1. Launch the App**
- Run `LAUNCH_FIXED.bat` or `py app_desktop_fixed.py`
- The app opens in its own desktop window

### **2. Enter YouTube URL**
- Paste any YouTube video URL
- Click "Analyze" to get video information

### **3. Select Download Path**
- Click "Browse" to choose where to save files
- Use "Reset" to return to default `downloads/` folder

### **4. Choose Format & Download**
- Select video/audio quality
- Click download button
- Monitor progress in real-time

## 📁 **Project Structure**

```
VideoHub Web Version/
├── app_desktop_fixed.py          ← Main desktop application
├── videohub_desktop_fixed.spec  ← PyInstaller configuration
├── build_fixed.bat              ← Build script
├── LAUNCH_FIXED.bat             ← Main launcher
├── requirements.txt              ← Python dependencies
├── templates/index.html          ← Web interface template
├── static/css/style.css          ← Dark theme styles
├── static/js/app.js              ← Frontend logic
├── dist/VideoHub_Desktop_Fixed.exe ← Built executable
└── README.md                     ← This file
```

## 🛠️ **Building from Source**

### **Prerequisites**
- Python 3.8+
- pip package manager

### **Build Steps**
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Build executable
build_fixed.bat

# 3. Launch the app
LAUNCH_FIXED.bat
```

## 📦 **Dependencies**

- **Flask** - Web framework
- **PyWebView** - Desktop window creation
- **yt-dlp** - YouTube video downloading
- **Tkinter** - File dialog integration

## 🎯 **Download Path Features**

- **Browse Button** - Opens Windows folder selection
- **Reset Button** - Returns to default location
- **Path Display** - Shows current save location
- **Auto-Creation** - Creates folders if they don't exist
- **Path-Aware Downloads** - Lists files from selected location

## 🔍 **Troubleshooting**

### **Common Issues**

1. **App Won't Start**
   - Ensure Python is installed and in PATH
   - Run `pip install -r requirements.txt`
   - Check if backend.py exists in parent directory

2. **Download Errors**
   - Verify YouTube URL is valid
   - Check internet connection
   - Ensure download path is writable

3. **Path Selection Issues**
   - Use Browse button for safe folder selection
   - Ensure selected folder has write permissions
   - Try resetting to default path

### **Getting Help**
- Check console output for error messages
- Verify all dependencies are installed
- Ensure backend.py is accessible

## 🎉 **What's Working**

✅ **Desktop Application** - Native window, no external browser  
✅ **Dark Theme** - Modern, professional appearance  
✅ **Download Paths** - Customizable save locations  
✅ **Video Analysis** - YouTube video information extraction  
✅ **Format Selection** - Multiple quality options  
✅ **Progress Tracking** - Real-time download monitoring  
✅ **File Management** - Organized downloads list  

## 🚀 **Ready to Use!**

VideoHub Desktop is now a **fully functional desktop application** with:
- **Beautiful dark theme**
- **Customizable download paths**
- **Native desktop experience**
- **Professional interface**

**Simply run `LAUNCH_FIXED.bat` and start downloading!** 🎬✨

---

*Built with Flask, PyWebView, and modern web technologies* 
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import webview
import threading
import time
import sys
import os
from flask import Flask, render_template, request, jsonify, send_file
import threading
import time
from werkzeug.utils import secure_filename

# Import backend functions
sys.path.append('..')
try:
    from backend import get_video_info, get_available_formats, get_downloadable_video_formats, download_video, download_audio, download_audio_raw
except ImportError:
    # Fallback if backend not available
    def get_video_info(url): return None
    def get_available_formats(info): return [], []
    def get_downloadable_video_formats(video_formats, audio_formats): return []
    def download_video(url, format_id, path, callback): return {'success': False, 'error': 'Backend not available'}
    def download_audio(url, format_id, path, callback): return {'success': False, 'error': 'Backend not available'}
    def download_audio_raw(url, format_id, path, callback): return {'success': False, 'error': 'Backend not available'}

class VideoHubDesktop:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'videohub-secret-key-2024'
        self.app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
        
        # Global variables for progress tracking
        self.download_progress = {}
        self.current_downloads = {}
        self.current_download_path = 'downloads'
        
        # Ensure downloads directory exists
        if not os.path.exists(self.current_download_path):
            os.makedirs(self.current_download_path)
        
        self.setup_routes()
        self.flask_thread = None
        self.webview_window = None
        
    def setup_routes(self):
        """Setup Flask routes"""
        @self.app.route('/')
        def index():
            """Main page"""
            return render_template('index.html')

        @self.app.route('/api/video-info', methods=['POST'])
        def get_video_info_api():
            """Get video information from URL"""
            try:
                data = request.get_json()
                url = data.get('url', '').strip()
                
                if not url:
                    return jsonify({'error': 'URL is required'}), 400
                
                # Get video info
                info = get_video_info(url)
                if not info:
                    return jsonify({'error': 'Could not fetch video information'}), 400
                
                # Get available formats
                video_formats, audio_formats = get_available_formats(info)
                downloadable_formats = get_downloadable_video_formats(video_formats, audio_formats)
                
                # Add pure audio formats to downloadable formats
                for audio_fmt in audio_formats:
                    # Create a proper quality label for audio
                    abr = audio_fmt.get('abr', 0)
                    if abr > 0:
                        quality_label = f"{abr}kbps"
                    else:
                        # Try to extract quality from format note
                        format_note = audio_fmt.get('format_note', '')
                        if 'kbps' in format_note:
                            try:
                                extracted_abr = int(''.join(filter(str.isdigit, format_note)))
                                quality_label = f"{extracted_abr}kbps"
                            except ValueError:
                                quality_label = "Unknown"
                        else:
                            quality_label = "Unknown"
                    
                    downloadable_formats.append({
                        'format_id': audio_fmt['format_id'],
                        'ext': audio_fmt['ext'],
                        'resolution': 'Audio Only',
                        'resolution_precise': 'Audio Only',
                        'filesize': audio_fmt['filesize'],
                        'vcodec': 'none',
                        'acodec': audio_fmt['acodec'],
                        'fps': 0,
                        'height': 0,
                        'width': 0,
                        'download_type': 'audio_only',
                        'description': f"Audio Only - {quality_label}",
                        'tbr': 0,
                        'vbr': 0,
                        'abr': abr,
                        'quality': quality_label
                    })
                
                # Prepare response data
                response_data = {
                    'title': info.get('title', 'Unknown Title'),
                    'duration': info.get('duration', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'view_count': info.get('view_count', 0),
                    'formats': downloadable_formats
                }
                
                return jsonify(response_data)
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/download', methods=['POST'])
        def download_api():
            """Handle download requests"""
            try:
                data = request.get_json()
                url = data.get('url', '').strip()
                format_id = data.get('format_id', '')
                download_type = data.get('download_type', 'video')
                download_path = data.get('download_path', self.current_download_path)
                
                if not url or not format_id:
                    return jsonify({'error': 'URL and format ID are required'}), 400
                
                # Ensure download path exists
                if not os.path.exists(download_path):
                    try:
                        os.makedirs(download_path)
                    except Exception as e:
                        return jsonify({'error': f'Failed to create download directory: {str(e)}'}), 500
                
                # Generate unique download ID
                download_id = f"download_{int(time.time())}"
                self.download_progress[download_id] = {
                    'status': 'starting',
                    'progress': 0,
                    'message': 'Starting download...'
                }
                
                # Start download in background thread
                thread = threading.Thread(
                    target=self.download_with_progress,
                    args=(url, format_id, download_type, download_id, download_path)
                )
                thread.daemon = True
                thread.start()
                
                return jsonify({
                    'download_id': download_id,
                    'message': 'Download started'
                })
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/browse-path', methods=['POST'])
        def browse_path_api():
            """Browse for download directory"""
            try:
                # Create a hidden root window for the file dialog
                root = tk.Tk()
                root.withdraw()  # Hide the root window
                
                # Open directory selection dialog
                selected_path = filedialog.askdirectory(
                    title="Select Download Directory",
                    initialdir=os.path.expanduser("~")  # Start from user's home directory
                )
                
                root.destroy()  # Clean up the root window
                
                if selected_path:
                    # Convert to relative path if it's within the current working directory
                    try:
                        rel_path = os.path.relpath(selected_path, os.getcwd())
                        if not rel_path.startswith('..'):
                            selected_path = rel_path
                    except ValueError:
                        # If we can't make it relative, use absolute path
                        pass
                    
                    self.current_download_path = selected_path
                    return jsonify({'path': selected_path})
                else:
                    return jsonify({'error': 'No directory selected'}), 400
                    
            except Exception as e:
                return jsonify({'error': f'Failed to browse directory: {str(e)}'}), 500

        @self.app.route('/api/downloads')
        def list_downloads():
            """List downloaded files from the current download directory"""
            try:
                download_path = request.args.get('path', self.current_download_path)
                
                if not os.path.exists(download_path):
                    return jsonify([])
                
                files = []
                for filename in os.listdir(download_path):
                    file_path = os.path.join(download_path, filename)
                    if os.path.isfile(file_path):
                        file_stat = os.stat(file_path)
                        files.append({
                            'name': filename,
                            'size': file_stat.st_size,
                            'modified': file_stat.st_mtime,
                            'path': download_path
                        })
                
                # Sort by modification time (newest first)
                files.sort(key=lambda x: x['modified'], reverse=True)
                return jsonify(files)
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/progress/<download_id>')
        def get_progress(download_id):
            """Get download progress"""
            if download_id in self.download_progress:
                return jsonify(self.download_progress[download_id])
            return jsonify({'error': 'Download ID not found'}), 404

        @self.app.route('/api/formats/<format_id>')
        def get_format_details(format_id):
            """Get detailed format information"""
            try:
                # This would need to be implemented based on your format data structure
                return jsonify({'message': 'Format details endpoint'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/downloads/<filename>')
        def download_file(filename):
            """Serve downloaded files"""
            try:
                return send_file(
                    os.path.join(self.current_download_path, filename),
                    as_attachment=True,
                    download_name=filename
                )
            except FileNotFoundError:
                return jsonify({'error': 'File not found'}), 404

    def download_with_progress(self, url, format_id, download_type, download_id, download_path):
        """Download with progress tracking"""
        try:
            self.download_progress[download_id]['status'] = 'downloading'
            
            def progress_callback(d):
                if d['status'] == 'downloading':
                    # Calculate progress percentage
                    if 'total_bytes' in d and d['total_bytes']:
                        progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                    elif 'total_bytes_estimate' in d and d['total_bytes_estimate']:
                        progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
                    else:
                        progress = 0
                    
                    self.download_progress[download_id]['progress'] = min(progress, 100)
                    self.download_progress[download_id]['message'] = f"Downloading... {self.download_progress[download_id]['progress']:.1f}%"
            
            # Determine actual download type based on format_id
            actual_download_type = download_type
            
            # Check if this is an audio-only format by looking at the format data
            if '+' in format_id:
                # Combined format (video + audio)
                actual_download_type = 'video'
            elif download_type == 'audio' and 'Audio Only' in str(format_id):
                # Pure audio format
                actual_download_type = 'audio'
            elif download_type == 'raw':
                # Raw audio
                actual_download_type = 'raw'
            
            # Perform download based on actual type
            if actual_download_type == 'video':
                result = download_video(url, format_id, download_path, progress_callback)
            elif actual_download_type == 'audio':
                result = download_audio(url, format_id, download_path, progress_callback)
            else:  # raw audio
                result = download_audio_raw(url, format_id, download_path, progress_callback)
            
            if result and result.get('success'):
                self.download_progress[download_id]['status'] = 'completed'
                self.download_progress[download_id]['progress'] = 100
                self.download_progress[download_id]['message'] = 'Download completed successfully!'
            else:
                self.download_progress[download_id]['status'] = 'error'
                self.download_progress[download_id]['message'] = result.get('error', 'Download failed')
                
        except Exception as e:
            self.download_progress[download_id]['status'] = 'error'
            self.download_progress[download_id]['message'] = f'Error: {str(e)}'

    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            self.app.run(debug=False, host='127.0.0.1', port=5000, use_reloader=False)
        except Exception as e:
            print(f"Flask error: {e}")

    def create_desktop_window(self):
        """Create desktop window with embedded web interface"""
        try:
            # Start Flask server in background
            self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
            self.flask_thread.start()
            
            # Wait a moment for Flask to start
            time.sleep(3)
            
            # Create webview window
            self.webview_window = webview.create_window(
                'VideoHub - YouTube Video Downloader',
                'http://127.0.0.1:5000',
                width=1200,
                height=800,
                resizable=True,
                text_select=True,
                confirm_close=False
            )
            
            # Start webview
            webview.start(debug=False)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start VideoHub: {str(e)}")
            print(f"Error: {e}")
            sys.exit(1)

def main():
    """Main function"""
    try:
        print("Starting VideoHub Desktop...")
        print("Initializing application...")
        
        # Create desktop app instance
        app = VideoHubDesktop()
        
        print("Creating desktop window...")
        # Create and show desktop window
        app.create_desktop_window()
        
    except Exception as e:
        print(f"Critical Error: {e}")
        messagebox.showerror("Critical Error", f"VideoHub failed to start: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 
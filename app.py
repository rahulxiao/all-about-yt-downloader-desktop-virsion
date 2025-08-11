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

class TubeSyncDesktop:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config['SECRET_KEY'] = 'tubesync-secret-key-2024'
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
                
                print(f"Received URL: {url}")
                
                if not url:
                    print("Error: No URL provided")
                    return jsonify({'error': 'URL is required'}), 400
                
                # Get video info
                print("Calling get_video_info...")
                info = get_video_info(url)
                print(f"Video info result: {info is not None}")
                
                if not info:
                    print("Error: Could not fetch video information")
                    return jsonify({'error': 'Could not fetch video information'}), 400
                
                print(f"Video title: {info.get('title', 'Unknown')}")
                print(f"Video type: {info.get('_type', 'video')}")
                
                # Check if this is a playlist
                is_playlist = info.get('_type') == 'playlist'
                playlist_count = info.get('playlist_count', 0)
                
                if is_playlist:
                    print(f"Processing playlist with {playlist_count} videos")
                    # Handle playlist
                    entries = info.get('entries', [])
                    if not entries:
                        print("Error: Playlist is empty")
                        return jsonify({'error': 'Playlist is empty or could not be processed'}), 400
                    
                    # Get first video info for format reference
                    first_video = entries[0]
                    if not first_video:
                        print("Error: Could not get first video from playlist")
                        return jsonify({'error': 'Could not get first video from playlist'}), 400
                    
                    # Get available formats for the first video
                    print("Getting formats for first video...")
                    video_formats, audio_formats = get_available_formats(first_video)
                    print(f"Found {len(video_formats)} video formats, {len(audio_formats)} audio formats")
                    
                    downloadable_formats = get_downloadable_video_formats(video_formats, audio_formats)
                    print(f"Created {len(downloadable_formats)} downloadable formats")
                    
                    # Add pure audio formats to downloadable formats
                    for audio_fmt in audio_formats:
                        # Create a proper quality label for audio
                        abr = audio_fmt.get('abr', 0)
                        if abr and abr > 0:
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
                            'ext': audio_fmt.get('ext', 'mp3'),
                            'resolution': 'Audio Only',
                            'resolution_precise': 'Audio Only',
                            'filesize': audio_fmt.get('filesize', 0),
                            'vcodec': 'none',
                            'acodec': audio_fmt.get('acodec', 'Unknown'),
                            'fps': 0,
                            'height': 0,
                            'width': 0,
                            'download_type': 'audio_only',
                            'description': f"Audio Only - {quality_label}",
                            'tbr': 0,
                            'vbr': 0,
                            'abr': abr if abr else 0,
                            'quality': quality_label
                        })
                    
                    # Prepare playlist response data
                    response_data = {
                        'title': info.get('title', 'Unknown Playlist'),
                        'duration': 0,  # Playlists don't have a single duration
                        'thumbnail': info.get('thumbnail', ''),
                        'uploader': info.get('uploader', 'Unknown'),
                        'view_count': 0,  # Playlists don't have a single view count
                        'formats': downloadable_formats,
                        'is_playlist': True,
                        'playlist_count': playlist_count,
                        'playlist_entries': [
                            {
                                'id': entry.get('id', ''),
                                'title': entry.get('title', 'Unknown Title'),
                                'duration': entry.get('duration', 0),
                                'thumbnail': entry.get('thumbnail', ''),
                                'uploader': entry.get('uploader', 'Unknown'),
                                'url': entry.get('url', ''),
                                'webpage_url': entry.get('webpage_url', '')
                            }
                            for entry in entries[:50]  # Limit to first 50 entries for performance
                        ]
                    }
                    
                    print(f"Returning playlist data with {len(response_data['formats'])} formats")
                    return jsonify(response_data)
                else:
                    print("Processing single video...")
                    # Handle single video (existing code)
                    # Get available formats
                    video_formats, audio_formats = get_available_formats(info)
                    print(f"Found {len(video_formats)} video formats, {len(audio_formats)} audio formats")
                    
                    downloadable_formats = get_downloadable_video_formats(video_formats, audio_formats)
                    print(f"Created {len(downloadable_formats)} downloadable formats")
                    
                    # Add pure audio formats to downloadable formats
                    for audio_fmt in audio_formats:
                        # Create a proper quality label for audio
                        abr = audio_fmt.get('abr', 0)
                        if abr and abr > 0:
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
                    
                    # Prepare single video response data
                    response_data = {
                        'title': info.get('title', 'Unknown Title'),
                        'duration': info.get('duration', 0),
                        'thumbnail': info.get('thumbnail', ''),
                        'uploader': info.get('uploader', 'Unknown'),
                        'view_count': info.get('view_count', 0),
                        'formats': downloadable_formats,
                        'is_playlist': False,
                        'playlist_count': 0,
                        'playlist_entries': []
                    }
                    
                    print(f"Returning video data with {len(response_data['formats'])} formats")
                    return jsonify(response_data)
                
            except Exception as e:
                print(f"Error in video info API: {str(e)}")
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

        @self.app.route('/api/download-playlist', methods=['POST'])
        def download_playlist_api():
            """Handle playlist download requests"""
            try:
                data = request.get_json()
                url = data.get('url', '').strip()
                format_id = data.get('format_id', '')
                download_type = data.get('download_type', 'video')
                download_path = data.get('download_path', self.current_download_path)
                max_videos = data.get('max_videos', 10)  # Limit to prevent abuse
                
                if not url or not format_id:
                    return jsonify({'error': 'URL and format ID are required'}), 400
                
                # Ensure download path exists
                if not os.path.exists(download_path):
                    try:
                        os.makedirs(download_path)
                    except Exception as e:
                        return jsonify({'error': f'Failed to create download directory: {str(e)}'}), 500
                
                # Get playlist info first
                info = get_video_info(url)
                if not info or info.get('_type') != 'playlist':
                    return jsonify({'error': 'URL is not a valid playlist'}), 400
                
                entries = info.get('entries', [])
                if not entries:
                    return jsonify({'error': 'Playlist is empty'}), 400
                
                # Limit the number of videos to download
                entries = entries[:min(max_videos, len(entries))]
                
                # Generate unique playlist download ID
                playlist_download_id = f"playlist_{int(time.time())}"
                self.download_progress[playlist_download_id] = {
                    'status': 'starting',
                    'progress': 0,
                    'message': f'Starting playlist download ({len(entries)} videos)...',
                    'total_videos': len(entries),
                    'current_video': 0,
                    'completed_videos': 0,
                    'failed_videos': 0
                }
                
                # Start playlist download in background thread
                thread = threading.Thread(
                    target=self.download_playlist_with_progress,
                    args=(url, format_id, download_type, playlist_download_id, download_path, entries)
                )
                thread.daemon = True
                thread.start()
                
                return jsonify({
                    'download_id': playlist_download_id,
                    'message': f'Playlist download started ({len(entries)} videos)',
                    'total_videos': len(entries)
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
            print(f"Starting download with ID: {download_id}")
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
                    
                    # Update progress in real-time
                    self.download_progress[download_id]['progress'] = min(progress, 100)
                    self.download_progress[download_id]['message'] = f"Downloading... {self.download_progress[download_id]['progress']:.1f}%"
                    
                    # Print progress for debugging
                    print(f"Download progress: {self.download_progress[download_id]['progress']:.1f}%")
                    
                    # Force update the progress immediately
                    import time
                    time.sleep(0.1)  # Small delay to allow progress update
            
            # Determine actual download type based on format_id and format data
            actual_download_type = download_type
            
            # Check if this is an audio-only format by looking at the format data
            if '+' in format_id:
                # Combined format (video + audio) - could be natural or enhanced
                actual_download_type = 'video'
            elif download_type == 'audio' and 'Audio Only' in str(format_id):
                # Pure audio format
                actual_download_type = 'audio'
            elif download_type == 'raw':
                # Raw audio
                actual_download_type = 'raw'
            elif download_type == 'video' and 'No Audio' in str(format_id):
                # Video-only format - download video only
                actual_download_type = 'video_only'
            
            print(f"Starting download with type: {actual_download_type}")
            
            # Perform download based on actual type
            if actual_download_type == 'video' or actual_download_type == 'video_only':
                result = download_video(url, format_id, download_path, progress_callback)
            elif actual_download_type == 'audio':
                result = download_audio(url, format_id, download_path, progress_callback)
            else:  # raw audio
                result = download_audio_raw(url, format_id, download_path, progress_callback)
            
            if result and result.get('success'):
                self.download_progress[download_id]['status'] = 'completed'
                self.download_progress[download_id]['progress'] = 100
                self.download_progress[download_id]['message'] = 'Download completed successfully!'
                print("Download completed successfully!")
            else:
                self.download_progress[download_id]['status'] = 'error'
                self.download_progress[download_id]['message'] = result.get('error', 'Download failed')
                print(f"Download failed: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            self.download_progress[download_id]['status'] = 'error'
            self.download_progress[download_id]['message'] = f'Error: {str(e)}'
            print(f"Download error: {str(e)}")

    def download_playlist_with_progress(self, playlist_url, format_id, download_type, playlist_download_id, download_path, entries):
        """Download playlist with progress tracking"""
        try:
            self.download_progress[playlist_download_id]['status'] = 'downloading'
            total_videos = len(entries)
            completed_videos = 0
            failed_videos = 0
            
            for i, entry in enumerate(entries):
                try:
                    # Update progress for current video
                    self.download_progress[playlist_download_id]['current_video'] = i + 1
                    self.download_progress[playlist_download_id]['message'] = f'Downloading video {i + 1}/{total_videos}: {entry.get("title", "Unknown")[:50]}...'
                    
                    # Get the video URL
                    video_url = entry.get('webpage_url') or entry.get('url')
                    if not video_url:
                        print(f"Warning: No URL found for video {i + 1}")
                        failed_videos += 1
                        continue
                    
                    # Create a temporary download ID for this video
                    video_download_id = f"{playlist_download_id}_video_{i}"
                    self.download_progress[video_download_id] = {
                        'status': 'downloading',
                        'progress': 0,
                        'message': f'Downloading: {entry.get("title", "Unknown")[:50]}'
                    }
                    
                    def video_progress_callback(d):
                        if d['status'] == 'downloading':
                            # Calculate progress percentage for this video
                            if 'total_bytes' in d and d['total_bytes']:
                                progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
                            elif 'total_bytes_estimate' in d and d['total_bytes_estimate']:
                                progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
                            else:
                                progress = 0
                            
                            self.download_progress[video_download_id]['progress'] = min(progress, 100)
                            
                            # Calculate overall playlist progress
                            overall_progress = ((i * 100) + progress) / total_videos
                            self.download_progress[playlist_download_id]['progress'] = min(overall_progress, 100)
                    
                    # Determine actual download type based on format_id and download_type
                    actual_download_type = download_type
                    
                    # Check if this is an audio-only format
                    if '+' in format_id:
                        actual_download_type = 'video'  # Combined format
                    elif download_type == 'audio' or 'Audio Only' in str(format_id):
                        actual_download_type = 'audio'
                    elif download_type == 'raw':
                        actual_download_type = 'raw'
                    
                    print(f"Downloading video {i + 1} with type: {actual_download_type}")
                    
                    # Perform download based on actual type
                    if actual_download_type == 'video':
                        result = download_video(video_url, format_id, download_path, video_progress_callback)
                    elif actual_download_type == 'audio':
                        result = download_audio(video_url, format_id, download_path, video_progress_callback)
                    else:  # raw audio
                        result = download_audio_raw(video_url, format_id, download_path, video_progress_callback)
                    
                    if result and result.get('success'):
                        completed_videos += 1
                        self.download_progress[video_download_id]['status'] = 'completed'
                        self.download_progress[video_download_id]['progress'] = 100
                        self.download_progress[video_download_id]['message'] = 'Download completed successfully!'
                        print(f"Video {i + 1} downloaded successfully")
                    else:
                        failed_videos += 1
                        self.download_progress[video_download_id]['status'] = 'error'
                        self.download_progress[video_download_id]['message'] = result.get('error', 'Download failed')
                        print(f"Video {i + 1} failed: {result.get('error', 'Unknown error')}")
                    
                    # Update overall playlist progress
                    self.download_progress[playlist_download_id]['completed_videos'] = completed_videos
                    self.download_progress[playlist_download_id]['failed_videos'] = failed_videos
                    
                    # Small delay to prevent overwhelming the system
                    time.sleep(1)
                    
                except Exception as e:
                    failed_videos += 1
                    print(f"Error downloading video {i + 1}: {str(e)}")
                    self.download_progress[playlist_download_id]['failed_videos'] = failed_videos
            
            # Final playlist status
            if failed_videos == 0:
                self.download_progress[playlist_download_id]['status'] = 'completed'
                self.download_progress[playlist_download_id]['progress'] = 100
                self.download_progress[playlist_download_id]['message'] = f'Playlist download completed! {completed_videos} videos downloaded successfully.'
            else:
                self.download_progress[playlist_download_id]['status'] = 'completed_with_errors'
                self.download_progress[playlist_download_id]['progress'] = 100
                self.download_progress[playlist_download_id]['message'] = f'Playlist download completed with {failed_videos} errors. {completed_videos} videos downloaded successfully.'
                
        except Exception as e:
            self.download_progress[playlist_download_id]['status'] = 'error'
            self.download_progress[playlist_download_id]['message'] = f'Playlist download error: {str(e)}'

    def start_flask(self):
        """Start Flask server in background thread"""
        try:
            # Try different ports if 5000 is busy
            ports = [5000, 5001, 5002, 5003, 5004]
            port_used = None
            
            for port in ports:
                try:
                    # Test if port is available
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('127.0.0.1', port))
                    sock.close()
                    
                    if result != 0:  # Port is available
                        port_used = port
                        break
                except:
                    continue
            
            if port_used is None:
                raise Exception("No available ports found")
            
            print(f"Starting Flask server on port {port_used}")
            self.app.run(debug=False, host='127.0.0.1', port=port_used, use_reloader=False)
            
        except Exception as e:
            print(f"Flask error: {e}")
            # Try to start on any available port
            try:
                self.app.run(debug=False, host='127.0.0.1', port=0, use_reloader=False)
            except Exception as e2:
                print(f"Critical Flask error: {e2}")
                raise e2

    def create_desktop_window(self):
        """Create desktop window with embedded web interface"""
        try:
            # Start Flask server in background
            self.flask_thread = threading.Thread(target=self.start_flask, daemon=True)
            self.flask_thread.start()
            
            # Wait a moment for Flask to start and get the port
            time.sleep(3)
            
            # Try to detect which port Flask is running on
            flask_port = 5000  # Default
            for port in [5000, 5001, 5002, 5003, 5004]:
                try:
                    import socket
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    result = sock.connect_ex(('127.0.0.1', port))
                    sock.close()
                    
                    if result == 0:  # Port is in use (Flask is running)
                        flask_port = port
                        break
                except:
                    continue
            
            print(f"Connecting to Flask server on port {flask_port}")
            
            # Create webview window
            self.webview_window = webview.create_window(
                'TubeSync - YouTube Video Downloader',
                f'http://127.0.0.1:{flask_port}',
                width=1200,
                height=800,
                resizable=True,
                text_select=True,
                confirm_close=False
            )
            
            # Start webview
            webview.start(debug=False)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start TubeSync: {str(e)}")
            print(f"Error: {e}")
            sys.exit(1)

def main():
    """Main function"""
    try:
        print("Starting TubeSync Desktop...")
        print("Initializing application...")
        
        # Create desktop app instance
        app = TubeSyncDesktop()
        
        print("Creating desktop window...")
        # Create and show desktop window
        app.create_desktop_window()
        
    except Exception as e:
        print(f"Critical Error: {e}")
        messagebox.showerror("Critical Error", f"TubeSync failed to start: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 
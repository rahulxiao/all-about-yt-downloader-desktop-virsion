#!/usr/bin/env python3
"""
TubeSync Backend - YouTube Video Downloader Functions
"""

import yt_dlp
import os
import re
from urllib.parse import urlparse

def get_video_info(url):
    """Get video information from YouTube URL"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return info
            
    except Exception as e:
        print(f"Error getting video info: {e}")
        return None

def get_available_formats(info):
    """Extract available video and audio formats"""
    try:
        if not info:
            return [], []
        
        formats = info.get('formats', [])
        if not formats:
            return [], []
        
        print(f"Total formats found: {len(formats)}")
        
        # Debug: Print first few formats to see structure
        print("First 3 formats structure:")
        for i, fmt in enumerate(formats[:3]):
            print(f"  Format {i}: {fmt}")
        
        video_formats = []
        audio_formats = []
        combined_formats = []
        
        for fmt in formats:
            # Only include formats that have a valid format_id
            if not fmt.get('format_id'):
                continue
            
            # Check if it's a combined format (has both video and audio)
            has_video = fmt.get('vcodec') and fmt.get('vcodec') != 'none'
            has_audio = fmt.get('acodec') and fmt.get('acodec') != 'none'
            
            # Additional audio detection for formats that might not have acodec
            if not has_audio:
                # Check if this is an audio-only format by other indicators
                if (fmt.get('ext') in ['webm', 'm4a', 'mp3', 'aac', 'opus'] or
                    fmt.get('format_note', '').lower().find('audio') != -1 or
                    (fmt.get('height') == 0 and fmt.get('width') == 0 and fmt.get('vcodec') == 'none')):
                    has_audio = True
                    # Set a default acodec if missing
                    if not fmt.get('acodec'):
                        fmt['acodec'] = fmt.get('ext', 'unknown')
            
            if has_video and has_audio:
                # Combined format (video + audio) - PRIORITIZE THESE
                combined_formats.append(fmt)
                print(f"Combined format: {fmt.get('format_id')} - {fmt.get('height')}p - {fmt.get('vcodec')} + {fmt.get('acodec')}")
            elif has_video:
                # Video-only format - we need to find matching audio
                video_formats.append(fmt)
                print(f"Video format: {fmt.get('format_id')} - {fmt.get('height')}p - {fmt.get('vcodec')}")
            elif has_audio:
                # Audio-only format
                audio_formats.append(fmt)
                print(f"Audio format: {fmt.get('format_id')} - {fmt.get('abr', 'Unknown')}kbps - {fmt.get('acodec')}")
        
        print(f"Combined formats: {len(combined_formats)}, Video formats: {len(video_formats)}, Audio formats: {len(audio_formats)}")
        
        # If no audio formats found, try to extract from combined formats
        if len(audio_formats) == 0 and len(combined_formats) > 0:
            print("No separate audio formats found, extracting from combined formats...")
            for fmt in combined_formats:
                if fmt.get('acodec') and fmt.get('acodec') != 'none':
                    # Get audio bitrate, default to 128 if None
                    abr = fmt.get('abr', 128)
                    if abr is None:
                        abr = 128
                    
                    # Create a separate audio format entry
                    audio_format = {
                        'format_id': f"{fmt['format_id']}_audio",
                        'ext': fmt.get('ext', 'm4a'),
                        'acodec': fmt.get('acodec'),
                        'abr': abr,
                        'filesize': fmt.get('filesize', 0),
                        'format_note': f"Extracted from {fmt.get('height')}p format"
                    }
                    audio_formats.append(audio_format)
                    print(f"Extracted audio format: {audio_format['format_id']} - {audio_format['abr']}kbps - {audio_format['acodec']}")
        
        # For video-only formats, try to find matching audio formats
        enhanced_video_formats = []
        for video_fmt in video_formats:
            # Look for audio format with similar quality
            best_audio_match = None
            best_audio_quality = 0
            
            for audio_fmt in audio_formats:
                # Try to match audio quality with video quality
                audio_abr = audio_fmt.get('abr', 0)
                if audio_abr is None:
                    audio_abr = 0
                
                if audio_abr > best_audio_quality:
                    best_audio_match = audio_fmt
                    best_audio_quality = audio_abr
            
            if best_audio_match:
                # Create a combined format by merging video and audio
                combined_format = {
                    'format_id': f"{video_fmt['format_id']}+{best_audio_match['format_id']}",
                    'height': video_fmt.get('height'),
                    'width': video_fmt.get('width'),
                    'fps': video_fmt.get('fps'),
                    'vcodec': video_fmt.get('vcodec'),
                    'acodec': best_audio_match.get('acodec'),
                    'abr': best_audio_match.get('abr'),
                    'ext': video_fmt.get('ext'),
                    'filesize': video_fmt.get('filesize'),
                    'format_note': video_fmt.get('format_note'),
                    'tbr': video_fmt.get('tbr'),
                    'vbr': video_fmt.get('vbr'),
                    'is_combined': True  # Mark as artificially combined
                }
                enhanced_video_formats.append(combined_format)
                print(f"Enhanced format: {combined_format['format_id']} - {combined_format['height']}p - {combined_format['vcodec']} + {combined_format['acodec']}")
            else:
                # If no audio match found, use the original video format
                # but mark it as having no audio
                video_fmt['has_audio'] = False
                video_fmt['original_format_id'] = video_fmt['format_id']  # Preserve original format_id
                enhanced_video_formats.append(video_fmt)
                print(f"Video format (no audio): {video_fmt['format_id']} - {video_fmt.get('height')}p - {video_fmt.get('vcodec')} (no audio)")
        
        # Sort formats by quality (higher resolution first) - 4K → 1440p → 1080p → 720p
        def sort_key(fmt):
            height = fmt.get('height', 0) or 0
            fps = fmt.get('fps', 0) or 0
            # Prioritize height, then fps for same height
            return (-height, -fps)
        
        combined_formats.sort(key=sort_key)
        enhanced_video_formats.sort(key=sort_key)
        audio_formats.sort(key=lambda x: (x.get('abr', 0) or 0), reverse=True)
        
        # Print sorted order for verification
        print("Sorted combined formats:")
        for fmt in combined_formats:
            print(f"  {fmt.get('height')}p - {fmt.get('fps', 0)}fps - {fmt.get('vcodec')} + {fmt.get('acodec')}")
        
        print("Sorted enhanced video formats:")
        for fmt in enhanced_video_formats:
            if fmt.get('is_combined'):
                print(f"  {fmt.get('height')}p - {fmt.get('fps', 0)}fps - {fmt.get('vcodec')} + {fmt.get('acodec')} (Enhanced)")
            else:
                print(f"  {fmt.get('height')}p - {fmt.get('fps', 0)}fps - {fmt.get('vcodec')} (No Audio)")
        
        # Return all formats with audio (combined + enhanced video + audio-only)
        all_formats_with_audio = combined_formats + enhanced_video_formats
        return all_formats_with_audio, audio_formats
        
    except Exception as e:
        print(f"Error getting formats: {e}")
        return [], []

def get_downloadable_video_formats(video_formats, audio_formats):
    """Create downloadable format options"""
    try:
        downloadable_formats = []
        
        # Process combined and video formats
        for fmt in video_formats:
            if fmt.get('format_id'):
                # Get resolution info
                height = fmt.get('height', 0)
                width = fmt.get('width', 0)
                fps = fmt.get('fps', 0)
                
                # Ensure numeric values
                try:
                    height = int(height) if height is not None else 0
                    width = int(width) if width is not None else 0
                    fps = float(fps) if fps is not None else 0
                except (ValueError, TypeError):
                    height = 0
                    width = 0
                    fps = 0
                
                # Create resolution label
                if height and width:
                    resolution = f"{height}p"
                    if fps and fps > 0:
                        resolution += f" ({fps:.0f}fps)"
                else:
                    resolution = "Unknown"
                
                # Get file size
                filesize = fmt.get('filesize', 0)
                if filesize:
                    try:
                        size_mb = float(filesize) / (1024 * 1024)
                        size_label = f"{size_mb:.1f}MB"
                    except (ValueError, TypeError):
                        size_label = "Unknown size"
                else:
                    size_label = "Unknown size"
                
                # Check if this is a combined format
                has_video = fmt.get('vcodec') and fmt.get('vcodec') != 'none'
                has_audio = fmt.get('acodec') and fmt.get('acodec') != 'none'
                is_enhanced = fmt.get('is_combined', False)
                no_audio = fmt.get('has_audio', True) == False
                
                if has_video and has_audio:
                    if is_enhanced:
                        download_type = 'enhanced_format'
                        description = f"{resolution} + Audio (Enhanced) - {size_label}"
                    else:
                        download_type = 'combined_format'
                        description = f"{resolution} + Audio - {size_label}"
                    
                    # Add audio quality info if available
                    if fmt.get('abr'):
                        description += f" ({fmt.get('abr')}kbps audio)"
                elif has_video and no_audio:
                    download_type = 'video_only'
                    description = f"{resolution} - {size_label} (No Audio)"
                else:
                    download_type = 'video'
                    description = f"{resolution} - {size_label}"
                    if has_audio:
                        description += " + Audio"
                    else:
                        description += " (No Audio)"
                
                if fmt.get('ext'):
                    description += f" (.{fmt['ext']})"
                
                # Get audio information for display
                audio_info = "N/A"
                if has_audio and fmt.get('acodec'):
                    if fmt.get('abr') and fmt.get('abr') > 0:
                        audio_info = f"{fmt.get('abr')}kbps ({fmt.get('acodec')})"
                    elif fmt.get('acodec'):
                        audio_info = f"{fmt.get('acodec')}"
                elif no_audio:
                    audio_info = "No Audio"
                
                # Use original format_id for formats without audio, enhanced format_id for combined
                format_id = fmt['format_id']
                if is_enhanced:
                    # Enhanced format uses the combined format_id
                    pass
                elif no_audio:
                    # Video-only format uses original format_id
                    format_id = fmt.get('original_format_id', fmt['format_id'])
                
                downloadable_formats.append({
                    'format_id': str(format_id),  # Ensure format_id is string
                    'ext': fmt.get('ext', 'mp4'),
                    'resolution': resolution,
                    'resolution_precise': f"{width}x{height}" if width and height else "Unknown",
                    'filesize': filesize,
                    'vcodec': fmt.get('vcodec', 'Unknown'),
                    'acodec': fmt.get('acodec', 'none'),
                    'fps': fps,
                    'height': height,
                    'width': width,
                    'download_type': download_type,
                    'description': description,
                    'tbr': fmt.get('tbr', 0),
                    'vbr': fmt.get('vbr', 0),
                    'abr': fmt.get('abr', 0),
                    'quality': resolution,
                    'audio_info': audio_info,  # Add audio info field
                    'is_enhanced': is_enhanced,  # Mark if this is an enhanced format
                    'has_audio': not no_audio  # Mark if this format has audio
                })
        
        # Process audio formats - ensure they download as MP3
        for fmt in audio_formats:
            if fmt.get('acodec') and fmt.get('acodec') != 'none' and fmt.get('format_id'):
                # Get audio quality info
                abr = fmt.get('abr', 0)
                if abr:
                    try:
                        abr = float(abr)
                    except (ValueError, TypeError):
                        abr = 0
                
                # Create quality label
                if abr and abr > 0:
                    quality_label = f"{abr:.0f}kbps"
                else:
                    quality_label = "Audio Only"
                
                # Get file size
                filesize = fmt.get('filesize', 0)
                if filesize:
                    try:
                        size_mb = float(filesize) / (1024 * 1024)
                        size_label = f"{size_mb:.1f}MB"
                    except (ValueError, TypeError):
                        size_label = "Unknown size"
                else:
                    size_label = "Unknown size"
                
                downloadable_formats.append({
                    'format_id': str(fmt['format_id']),  # Ensure format_id is string
                    'ext': 'mp3',  # Force MP3 extension for audio
                    'resolution': 'Audio Only',
                    'resolution_precise': 'Audio Only',
                    'filesize': filesize,
                    'vcodec': 'none',
                    'acodec': fmt.get('acodec', 'Unknown'),
                    'fps': 0,
                    'height': 0,
                    'width': 0,
                    'download_type': 'audio_only',
                    'description': f"Audio Only - {quality_label} - {size_label} (.mp3)",
                    'tbr': 0,
                    'vbr': 0,
                    'abr': abr,
                    'quality': quality_label,
                    'audio_info': f"{abr}kbps ({fmt.get('acodec', 'Unknown')})" if abr > 0 else f"{fmt.get('acodec', 'Unknown')}"
                })
        
        return downloadable_formats
        
    except Exception as e:
        print(f"Error creating downloadable formats: {e}")
        return []

def download_video(url, format_id, path, callback=None):
    """Download video with specified format"""
    try:
        if not os.path.exists(path):
            os.makedirs(path)
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': os.path.join(path, '%(title)s.%(ext)s'),
            'progress_hooks': [callback] if callback else [],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        return {'success': True, 'message': 'Video downloaded successfully'}
        
    except Exception as e:
        print(f"Error downloading video: {e}")
        return {'success': False, 'error': str(e)}

def download_audio(url, format_id, path, callback=None):
    """Download audio with specified format and convert to MP3"""
    try:
        if not os.path.exists(path):
            os.makedirs(path)
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': os.path.join(path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'progress_hooks': [callback] if callback else [],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        return {'success': True, 'message': 'Audio downloaded successfully as MP3'}
        
    except Exception as e:
        print(f"Error downloading audio: {e}")
        return {'success': False, 'error': str(e)}

def download_audio_raw(url, format_id, path, callback=None):
    """Download raw audio and convert to MP3"""
    try:
        if not os.path.exists(path):
            os.makedirs(path)
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': os.path.join(path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'progress_hooks': [callback] if callback else [],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        return {'success': True, 'message': 'Raw audio downloaded successfully as MP3'}
        
    except Exception as e:
        print(f"Error downloading raw audio: {e}")
        return {'success': False, 'error': str(e)}

def is_valid_youtube_url(url):
    """Check if URL is a valid YouTube URL"""
    try:
        parsed = urlparse(url)
        return 'youtube.com' in parsed.netloc or 'youtu.be' in parsed.netloc
    except:
        return False

def sanitize_filename(filename):
    """Sanitize filename for safe saving"""
    # Remove invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Limit length
    if len(filename) > 200:
        filename = filename[:200]
    return filename 
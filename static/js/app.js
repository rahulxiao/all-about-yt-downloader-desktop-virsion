// Main application JavaScript
class VideoHubApp {
    constructor() {
        this.currentVideoInfo = null;
        this.currentFormats = [];
        this.currentDownloadType = 'video';
        this.currentDownloadId = null;
        this.progressInterval = null;
        this.currentDownloadPath = 'downloads/'; // Default download path
        
        this.initializeEventListeners();
        this.loadDownloads();
        this.initializeDownloadPath();
    }

    initializeEventListeners() {
        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeVideo();
        });

        // Enter key in URL input
        document.getElementById('url-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeVideo();
            }
        });

        // Download path buttons
        document.getElementById('browse-path-btn').addEventListener('click', () => {
            this.browseDownloadPath();
        });

        document.getElementById('reset-path-btn').addEventListener('click', () => {
            this.resetDownloadPath();
        });

        // Download type toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setDownloadType(e.target.dataset.type);
            });
        });

        // Quality filter
        document.getElementById('quality-filter').addEventListener('change', (e) => {
            this.filterFormatsByQuality(e.target.value);
        });

        // Refresh downloads
        document.getElementById('refresh-downloads').addEventListener('click', () => {
            this.loadDownloads();
        });

        // Cancel download
        document.getElementById('cancel-download').addEventListener('click', () => {
            this.cancelDownload();
        });
    }

    initializeDownloadPath() {
        // Set initial download path
        this.updateDownloadPathDisplay();
    }

    async browseDownloadPath() {
        try {
            const response = await fetch('/api/browse-path', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (response.ok && data.path) {
                this.currentDownloadPath = data.path;
                this.updateDownloadPathDisplay();
                this.showToast('Download path updated successfully!', 'success');
            } else {
                this.showToast(data.error || 'Failed to set download path', 'error');
            }
        } catch (error) {
            this.showToast('Failed to browse for download path', 'error');
        }
    }

    resetDownloadPath() {
        this.currentDownloadPath = 'downloads/';
        this.updateDownloadPathDisplay();
        this.showToast('Download path reset to default', 'info');
    }

    updateDownloadPathDisplay() {
        const pathInput = document.getElementById('download-path');
        const currentPathSpan = document.getElementById('current-path');
        
        pathInput.value = this.currentDownloadPath;
        currentPathSpan.textContent = this.currentDownloadPath;
    }

    async analyzeVideo() {
        const urlInput = document.getElementById('url-input');
        const url = urlInput.value.trim();

        if (!url) {
            this.showToast('Please enter a YouTube URL', 'error');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showToast('Please enter a valid YouTube URL', 'error');
            return;
        }

        this.showLoading('Analyzing video...');
        
        try {
            const response = await fetch('/api/video-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                this.displayVideoInfo(data);
                this.displayFormats(data.formats);
                this.showToast('Video analyzed successfully!', 'success');
            } else {
                this.showToast(data.error || 'Failed to analyze video', 'error');
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayVideoInfo(videoInfo) {
        this.currentVideoInfo = videoInfo;
        
        // Update video info section
        document.getElementById('video-title').textContent = videoInfo.title;
        document.getElementById('video-uploader').textContent = videoInfo.uploader;
        document.getElementById('video-duration').textContent = this.formatDuration(videoInfo.duration);
        document.getElementById('video-views').textContent = this.formatNumber(videoInfo.view_count);
        
        if (videoInfo.thumbnail) {
            document.getElementById('video-thumbnail').src = videoInfo.thumbnail;
        }

        // Show video info section
        document.getElementById('video-info').style.display = 'block';
        document.getElementById('download-options').style.display = 'block';
    }

    displayFormats(formats) {
        this.currentFormats = formats;
        
        // Populate quality filter
        const qualityFilter = document.getElementById('quality-filter');
        const qualities = [...new Set(formats.map(f => f.quality))].sort();
        
        qualityFilter.innerHTML = '<option value="">All Qualities</option>';
        qualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality;
            option.textContent = quality;
            qualityFilter.appendChild(option);
        });

        // Display formats
        this.renderFormatsList(formats);
    }

    renderFormatsList(formats) {
        const formatsList = document.getElementById('formats-list');
        formatsList.innerHTML = '';

        formats.forEach(format => {
            const formatItem = this.createFormatItem(format);
            formatsList.appendChild(formatItem);
        });
    }

    createFormatItem(format) {
        const div = document.createElement('div');
        div.className = 'format-item';
        div.dataset.formatId = format.format_id;

        // Determine if this is an audio-only format
        const isAudioOnly = format.download_type === 'audio_only' || 
                           (format.vcodec === 'none' && format.acodec && format.acodec !== 'none');

        // Add data attribute for audio formats for CSS styling
        if (isAudioOnly) {
            div.dataset.audioFormat = 'true';
        }

        if (isAudioOnly) {
            // Audio-only format display
            div.innerHTML = `
                <div class="format-header">
                    <div class="format-quality">${format.quality || 'Audio Only'}</div>
                    <div class="format-size">${this.formatFileSize(format.filesize)}</div>
                </div>
                <div class="format-details">
                    <div class="format-detail">
                        <div class="format-detail-label">Type</div>
                        <div class="format-detail-value">Audio Only</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">Format</div>
                        <div class="format-detail-value">${format.ext || 'N/A'}</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">Codec</div>
                        <div class="format-detail-value">${format.acodec || 'N/A'}</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">Bitrate</div>
                        <div class="format-detail-value">${format.abr ? format.abr + 'kbps' : 'N/A'}</div>
                    </div>
                </div>
                <button class="download-btn" onclick="app.downloadFormat('${format.format_id}')">
                    <i class="fas fa-download"></i> Download Audio
                </button>
            `;
        } else {
            // Video format display (existing code)
            div.innerHTML = `
                <div class="format-header">
                    <div class="format-quality">${format.quality || format.resolution || 'N/A'}</div>
                    <div class="format-size">${this.formatFileSize(format.filesize)}</div>
                </div>
                <div class="format-details">
                    <div class="format-detail">
                        <div class="format-detail-label">Resolution</div>
                        <div class="format-detail-value">${format.resolution || 'N/A'}</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">FPS</div>
                        <div class="format-detail-value">${format.fps || 'N/A'}</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">Codec</div>
                        <div class="format-detail-value">${format.vcodec || format.acodec || 'N/A'}</div>
                    </div>
                    <div class="format-detail">
                        <div class="format-detail-label">Audio</div>
                        <div class="format-detail-value">${format.abr ? format.abr + 'kbps' : 'N/A'}</div>
                    </div>
                </div>
                <button class="download-btn" onclick="app.downloadFormat('${format.format_id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            `;
        }

        return div;
    }

    setDownloadType(type) {
        this.currentDownloadType = type;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Filter formats based on type
        this.filterFormatsByType(type);
    }

    filterFormatsByType(type) {
        let filteredFormats = this.currentFormats;
        
        if (type === 'video') {
            // Show video formats (including combined formats)
            filteredFormats = this.currentFormats.filter(f => 
                f.vcodec && f.vcodec !== 'none' && f.download_type !== 'audio_only'
            );
        } else if (type === 'audio') {
            // Show audio-only formats
            filteredFormats = this.currentFormats.filter(f => 
                f.download_type === 'audio_only' || 
                (f.acodec && f.acodec !== 'none' && f.vcodec === 'none')
            );
        } else if (type === 'raw') {
            // Show raw audio formats
            filteredFormats = this.currentFormats.filter(f => 
                f.download_type === 'audio_only' || 
                (f.acodec && f.acodec !== 'none')
            );
        }

        this.renderFormatsList(filteredFormats);
    }

    filterFormatsByQuality(quality) {
        if (!quality) {
            this.renderFormatsList(this.currentFormats);
            return;
        }

        const filteredFormats = this.currentFormats.filter(f => f.quality === quality);
        this.renderFormatsList(filteredFormats);
    }

    async downloadFormat(formatId) {
        if (!this.currentVideoInfo) {
            this.showToast('Please analyze a video first', 'error');
            return;
        }

        // Find the format to determine its type
        const format = this.currentFormats.find(f => f.format_id === formatId);
        if (!format) {
            this.showToast('Format not found', 'error');
            return;
        }

        // Determine download type based on format
        let downloadType = this.currentDownloadType;
        if (format.download_type === 'audio_only' || 
            (format.vcodec === 'none' && format.acodec && format.acodec !== 'none')) {
            downloadType = 'audio';
        } else if (format.download_type === 'combined_format') {
            downloadType = 'video';
        }

        this.showLoading('Starting download...');
        
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: document.getElementById('url-input').value.trim(),
                    format_id: formatId,
                    download_type: downloadType,
                    download_path: this.currentDownloadPath // Pass the current download path
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentDownloadId = data.download_id;
                this.startProgressTracking();
                this.showToast('Download started!', 'success');
            } else {
                this.showToast(data.error || 'Failed to start download', 'error');
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    startProgressTracking() {
        // Show progress section
        document.getElementById('progress-section').style.display = 'block';
        
        // Start polling for progress updates
        this.progressInterval = setInterval(async () => {
            if (!this.currentDownloadId) return;

            try {
                const response = await fetch(`/api/progress/${this.currentDownloadId}`);
                const progress = await response.json();

                if (response.ok) {
                    this.updateProgress(progress);
                    
                    if (progress.status === 'completed' || progress.status === 'error') {
                        this.stopProgressTracking();
                        if (progress.status === 'completed') {
                            this.loadDownloads(); // Refresh downloads list
                        }
                    }
                }
            } catch (error) {
                console.error('Progress tracking error:', error);
            }
        }, 1000);
    }

    updateProgress(progress) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const cancelBtn = document.getElementById('cancel-download');

        progressFill.style.width = `${progress.progress}%`;
        progressText.textContent = progress.message;

        if (progress.status === 'downloading') {
            cancelBtn.style.display = 'inline-block';
        } else {
            cancelBtn.style.display = 'none';
        }
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        this.currentDownloadId = null;
    }

    cancelDownload() {
        // Note: This would need backend support for actual cancellation
        this.showToast('Download cancellation not yet implemented', 'error');
    }

    async loadDownloads() {
        try {
            const response = await fetch(`/api/downloads?path=${encodeURIComponent(this.currentDownloadPath)}`);
            const files = await response.json();
            
            if (response.ok) {
                this.displayDownloads(files);
            } else {
                console.error('Failed to load downloads:', files.error);
                this.displayDownloads([]);
            }
        } catch (error) {
            console.error('Failed to load downloads:', error);
            this.displayDownloads([]);
        }
    }

    displayDownloads(files) {
        const downloadsList = document.getElementById('downloads-list');
        
        if (!files || files.length === 0) {
            downloadsList.innerHTML = '<p>Downloads will appear here after completion</p>';
            return;
        }
        
        downloadsList.innerHTML = files.map(file => `
            <div class="download-item">
                <div class="download-info">
                    <div class="download-name">${file.name}</div>
                    <div class="download-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="download-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.open('/downloads/${file.name}', '_blank')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Utility functions
    isValidYouTubeUrl(url) {
        const youtubePatterns = [
            /youtube\.com\/watch\?v=/,
            /youtu\.be\//,
            /m\.youtube\.com\/watch\?v=/,
            /www\.youtube\.com\/watch\?v=/
        ];
        return youtubePatterns.some(pattern => pattern.test(url));
    }

    formatDuration(seconds) {
        if (!seconds) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatNumber(num) {
        if (!num) return 'Unknown';
        return num.toLocaleString();
    }

    // UI functions
    showLoading(message) {
        document.getElementById('loading-text').textContent = message;
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        const toastIcon = document.getElementById('toast-icon');

        toast.className = `toast ${type}`;
        toastMessage.textContent = message;
        
        if (type === 'success') {
            toastIcon.className = 'fas fa-check';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-triangle';
        } else {
            toastIcon.className = 'fas fa-info-circle';
        }

        toast.style.display = 'block';
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoHubApp();
}); 
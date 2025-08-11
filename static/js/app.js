// Main application JavaScript
class TubeSyncApp {
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

        // Playlist download buttons
        document.getElementById('download-full-playlist-btn')?.addEventListener('click', () => {
            this.downloadFullPlaylist();
        });

        document.getElementById('download-playlist-btn')?.addEventListener('click', () => {
            this.downloadSelectedVideos();
        });

        document.getElementById('download-selected-btn')?.addEventListener('click', () => {
            this.showCustomPlaylistDownload();
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
        
        // Check if this is a playlist
        if (videoInfo.is_playlist) {
            this.displayPlaylistInfo(videoInfo);
        } else {
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
            
            // Hide playlist section
            document.getElementById('playlist-info').style.display = 'none';
        }
    }

    displayPlaylistInfo(playlistInfo) {
        this.currentVideoInfo = playlistInfo;
        
        // Update playlist info section
        document.getElementById('playlist-title').textContent = playlistInfo.title;
        document.getElementById('playlist-uploader').textContent = playlistInfo.uploader;
        document.getElementById('playlist-count').textContent = `${playlistInfo.playlist_count} videos`;
        
        if (playlistInfo.thumbnail) {
            document.getElementById('playlist-thumbnail').src = playlistInfo.thumbnail;
        }

        // Display playlist videos
        this.renderPlaylistVideos(playlistInfo.playlist_entries);

        // Show playlist section and hide video section
        document.getElementById('playlist-info').style.display = 'block';
        document.getElementById('video-info').style.display = 'none';
        document.getElementById('download-options').style.display = 'block';
    }

    renderPlaylistVideos(videos) {
        const playlistVideoList = document.getElementById('playlist-video-list');
        playlistVideoList.innerHTML = '';

        videos.forEach((video, index) => {
            const videoItem = this.createPlaylistVideoItem(video, index);
            playlistVideoList.appendChild(videoItem);
        });
    }

    createPlaylistVideoItem(video, index) {
        const div = document.createElement('div');
        div.className = 'playlist-video-item';
        div.dataset.videoIndex = index;
        div.dataset.videoUrl = video.webpage_url || video.url;

        div.innerHTML = `
            <div class="playlist-video-header">
                <input type="checkbox" class="playlist-video-checkbox" data-video-index="${index}">
                <h5>${video.title}</h5>
            </div>
            <div class="playlist-video-meta">
                <span>${video.uploader}</span>
                <span class="playlist-video-duration">${this.formatDuration(video.duration)}</span>
            </div>
        `;

        // Add click handler for selection
        div.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = div.querySelector('.playlist-video-checkbox');
                checkbox.checked = !checkbox.checked;
                div.classList.toggle('selected', checkbox.checked);
            }
        });

        // Add checkbox change handler
        const checkbox = div.querySelector('.playlist-video-checkbox');
        checkbox.addEventListener('change', (e) => {
            div.classList.toggle('selected', e.target.checked);
        });

        return div;
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

        // Add data attribute for enhanced formats
        if (format.is_enhanced) {
            div.dataset.enhanced = 'true';
        }

        // Add data attribute for audio presence
        if (format.has_audio === false) {
            div.dataset.noAudio = 'true';
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
                <div class="format-progress" style="display: none;">
                    <div class="inline-progress-bar">
                        <div class="inline-progress-fill" style="width: 0%;"></div>
                    </div>
                    <div class="inline-progress-text">Starting download...</div>
                </div>
                <button class="download-btn" data-format-id="${format.format_id}">
                    <i class="fas fa-music"></i> Download Audio
                </button>
            `;
        } else {
            // Video format display
            const hasAudio = format.has_audio !== false;
            const audioStatus = hasAudio ? 'With Audio' : 'No Audio';
            const audioIcon = hasAudio ? 'fas fa-volume-up' : 'fas fa-volume-mute';
            const audioClass = hasAudio ? 'format-with-audio' : 'format-no-audio';
            
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
                        <div class="format-detail-value ${audioClass}">
                            <i class="${audioIcon}"></i>
                            ${format.audio_info || 'N/A'}
                        </div>
                    </div>
                </div>
                <div class="format-progress" style="display: none;">
                    <div class="inline-progress-bar">
                        <div class="inline-progress-fill" style="width: 0%;"></div>
                    </div>
                    <div class="inline-progress-text">Starting download...</div>
                </div>
                <button class="download-btn" data-format-id="${format.format_id}">
                    <i class="fas fa-download"></i> Download ${hasAudio ? 'Video' : 'Video Only'}
                </button>
            `;
        }

        // Add event listener to download button
        const downloadBtn = div.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const formatId = downloadBtn.dataset.formatId;
                if (formatId) {
                    this.downloadFormat(formatId);
                }
            });
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

        // Store the current format ID for progress tracking
        this.currentFormatId = formatId;

        // Show inline progress for this format
        const formatItem = document.querySelector(`[data-format-id="${formatId}"]`);
        if (formatItem) {
            const progressBar = formatItem.querySelector('.format-progress');
            const downloadBtn = formatItem.querySelector('.download-btn');
            
            if (progressBar && downloadBtn) {
                // Show progress bar and hide download button
                progressBar.style.display = 'block';
                downloadBtn.style.display = 'none';
                
                // Initialize progress bar
                const progressFill = progressBar.querySelector('.inline-progress-fill');
                const progressText = progressBar.querySelector('.inline-progress-text');
                
                if (progressFill && progressText) {
                    progressFill.style.width = '0%';
                    progressFill.style.background = 'linear-gradient(135deg, #42a5f5, #2196f3)';
                    progressText.textContent = 'Starting download...';
                }
            }
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
                // Hide progress and show download button again on error
                if (formatItem) {
                    const progressBar = formatItem.querySelector('.format-progress');
                    const downloadBtn = formatItem.querySelector('.download-btn');
                    if (progressBar && downloadBtn) {
                        progressBar.style.display = 'none';
                        downloadBtn.style.display = 'inline-block';
                    }
                }
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
            // Hide progress and show download button again on error
            if (formatItem) {
                const progressBar = formatItem.querySelector('.format-progress');
                const downloadBtn = formatItem.querySelector('.download-btn');
                if (progressBar && downloadBtn) {
                    progressBar.style.display = 'none';
                    downloadBtn.style.display = 'inline-block';
                }
            }
        } finally {
            this.hideLoading();
        }
    }

    async downloadPlaylist() {
        if (!this.currentVideoInfo || !this.currentVideoInfo.is_playlist) {
            this.showToast('Please analyze a playlist first', 'error');
            return;
        }

        // Get the first available format for playlist download
        if (!this.currentFormats || this.currentFormats.length === 0) {
            this.showToast('No formats available for download', 'error');
            return;
        }

        const format = this.currentFormats[0]; // Use first available format
        let downloadType = this.currentDownloadType;
        if (format.download_type === 'audio_only' || 
            (format.vcodec === 'none' && format.acodec && format.acodec !== 'none')) {
            downloadType = 'audio';
        }

        // Store the current format ID for progress tracking
        this.currentFormatId = format.format_id;

        // Show inline progress for this format
        const formatItem = document.querySelector(`[data-format-id="${format.format_id}"]`);
        if (formatItem) {
            const progressBar = formatItem.querySelector('.format-progress');
            const downloadBtn = formatItem.querySelector('.download-btn');
            
            if (progressBar && downloadBtn) {
                // Show progress bar and hide download button
                progressBar.style.display = 'block';
                downloadBtn.style.display = 'none';
                
                // Initialize progress bar
                const progressFill = progressBar.querySelector('.inline-progress-fill');
                const progressText = progressBar.querySelector('.inline-progress-text');
                
                if (progressFill && progressText) {
                    progressFill.style.width = '0%';
                    progressFill.style.background = 'linear-gradient(135deg, #42a5f5, #2196f3)';
                    progressText.textContent = 'Starting playlist download...';
                }
            }
        }

        this.showLoading('Starting playlist download...');
        
        try {
            const response = await fetch('/api/download-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: document.getElementById('url-input').value.trim(),
                    format_id: format.format_id,
                    download_type: downloadType,
                    download_path: this.currentDownloadPath,
                    max_videos: 50 // Limit to prevent abuse
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentDownloadId = data.download_id;
                this.startProgressTracking();
                this.showToast(`Playlist download started! (${data.total_videos} videos)`, 'success');
            } else {
                this.showToast(data.error || 'Failed to start playlist download', 'error');
                // Hide progress and show download button again on error
                if (formatItem) {
                    const progressBar = formatItem.querySelector('.format-progress');
                    const downloadBtn = formatItem.querySelector('.download-btn');
                    if (progressBar && downloadBtn) {
                        progressBar.style.display = 'none';
                        downloadBtn.style.display = 'inline-block';
                    }
                }
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
            // Hide progress and show download button again on error
            if (formatItem) {
                const progressBar = formatItem.querySelector('.format-progress');
                const downloadBtn = formatItem.querySelector('.download-btn');
                if (progressBar && downloadBtn) {
                    progressBar.style.display = 'none';
                    downloadBtn.style.display = 'inline-block';
                }
            }
        } finally {
            this.hideLoading();
        }
    }

    async downloadSelectedVideos() {
        if (!this.currentVideoInfo || !this.currentVideoInfo.is_playlist) {
            this.showToast('Please analyze a playlist first', 'error');
            return;
        }

        // Get selected videos
        const selectedCheckboxes = document.querySelectorAll('.playlist-video-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            this.showToast('Please select videos to download', 'error');
            return;
        }

        // Get the first available format for download
        if (!this.currentFormats || this.currentFormats.length === 0) {
            this.showToast('No formats available for download', 'error');
            return;
        }

        const format = this.currentFormats[0];
        let downloadType = this.currentDownloadType;
        if (format.download_type === 'audio_only' || 
            (format.vcodec === 'none' && format.acodec && format.acodec !== 'none')) {
            downloadType = 'audio';
        }

        this.showLoading(`Starting download of ${selectedCheckboxes.length} selected videos...`);
        
        // Download each selected video individually
        let completed = 0;
        let failed = 0;

        for (const checkbox of selectedCheckboxes) {
            const videoIndex = parseInt(checkbox.dataset.videoIndex);
            const video = this.currentVideoInfo.playlist_entries[videoIndex];
            const videoUrl = video.webpage_url || video.url;

            try {
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: videoUrl,
                        format_id: format.format_id,
                        download_type: downloadType,
                        download_path: this.currentDownloadPath
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    completed++;
                    this.showToast(`Downloaded: ${video.title.substring(0, 50)}...`, 'success');
                } else {
                    failed++;
                    this.showToast(`Failed: ${video.title.substring(0, 50)}...`, 'error');
                }
            } catch (error) {
                failed++;
                this.showToast(`Error downloading: ${video.title.substring(0, 50)}...`, 'error');
            }
        }

        this.hideLoading();
        
        if (failed === 0) {
            this.showToast(`Successfully downloaded ${completed} videos!`, 'success');
        } else {
            this.showToast(`Downloaded ${completed} videos, ${failed} failed.`, 'warning');
        }
    }

    async downloadFullPlaylist() {
        if (!this.currentVideoInfo || !this.currentVideoInfo.is_playlist) {
            this.showToast('Please analyze a playlist first', 'error');
            return;
        }

        // Get the first available format for playlist download
        if (!this.currentFormats || this.currentFormats.length === 0) {
            this.showToast('No formats available for download', 'error');
            return;
        }

        // Find the best quality format (prioritize combined formats with audio)
        let bestFormat = this.currentFormats.find(f => f.download_type === 'combined_format' || f.download_type === 'enhanced_format');
        if (!bestFormat) {
            bestFormat = this.currentFormats[0]; // Fallback to first available format
        }

        let downloadType = this.currentDownloadType;
        if (bestFormat.download_type === 'audio_only' || 
            (bestFormat.vcodec === 'none' && bestFormat.acodec && bestFormat.acodec !== 'none')) {
            downloadType = 'audio';
        }

        // Store the current format ID for progress tracking
        this.currentFormatId = bestFormat.format_id;

        // Show inline progress for this format
        const formatItem = document.querySelector(`[data-format-id="${bestFormat.format_id}"]`);
        if (formatItem) {
            const progressBar = formatItem.querySelector('.format-progress');
            const downloadBtn = formatItem.querySelector('.download-btn');
            
            if (progressBar && downloadBtn) {
                // Show progress bar and hide download button
                progressBar.style.display = 'block';
                downloadBtn.style.display = 'none';
                
                // Initialize progress bar
                const progressFill = progressBar.querySelector('.inline-progress-fill');
                const progressText = progressBar.querySelector('.inline-progress-text');
                
                if (progressFill && progressText) {
                    progressFill.style.width = '0%';
                    progressFill.style.background = 'linear-gradient(135deg, #42a5f5, #2196f3)';
                    progressText.textContent = 'Starting full playlist download...';
                }
            }
        }

        this.showLoading(`Starting full playlist download (${this.currentVideoInfo.playlist_count} videos)...`);
        
        try {
            const response = await fetch('/api/download-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: document.getElementById('url-input').value.trim(),
                    format_id: bestFormat.format_id,
                    download_type: downloadType,
                    download_path: this.currentDownloadPath,
                    max_videos: this.currentVideoInfo.playlist_count // Download all videos
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentDownloadId = data.download_id;
                this.startProgressTracking();
                this.showToast(`Full playlist download started! (${data.total_videos} videos)`, 'success');
            } else {
                this.showToast(data.error || 'Failed to start full playlist download', 'error');
                // Hide progress and show download button again on error
                if (formatItem) {
                    const progressBar = formatItem.querySelector('.format-progress');
                    const downloadBtn = formatItem.querySelector('.download-btn');
                    if (progressBar && downloadBtn) {
                        progressBar.style.display = 'none';
                        downloadBtn.style.display = 'inline-block';
                    }
                }
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
            // Hide progress and show download button again on error
            if (formatItem) {
                const progressBar = formatItem.querySelector('.format-progress');
                const downloadBtn = formatItem.querySelector('.download-btn');
                if (progressBar && downloadBtn) {
                    progressBar.style.display = 'none';
                    downloadBtn.style.display = 'inline-block';
                }
            }
        } finally {
            this.hideLoading();
        }
    }

    showCustomPlaylistDownload() {
        if (!this.currentVideoInfo || !this.currentVideoInfo.is_playlist) {
            this.showToast('Please analyze a playlist first', 'error');
            return;
        }

        // Show custom download options
        const totalVideos = this.currentVideoInfo.playlist_count;
        const customCount = prompt(`Enter number of videos to download (1-${totalVideos}):`, totalVideos);
        
        if (customCount === null) return; // User cancelled
        
        const count = parseInt(customCount);
        if (isNaN(count) || count < 1 || count > totalVideos) {
            this.showToast(`Please enter a valid number between 1 and ${totalVideos}`, 'error');
            return;
        }

        this.downloadCustomPlaylist(count);
    }

    async downloadCustomPlaylist(maxVideos) {
        if (!this.currentVideoInfo || !this.currentFormats || this.currentFormats.length === 0) {
            this.showToast('No formats available for download', 'error');
            return;
        }

        // Find the best quality format
        let bestFormat = this.currentFormats.find(f => f.download_type === 'combined_format' || f.download_type === 'enhanced_format');
        if (!bestFormat) {
            bestFormat = this.currentFormats[0];
        }

        let downloadType = this.currentDownloadType;
        if (bestFormat.download_type === 'audio_only' || 
            (bestFormat.vcodec === 'none' && bestFormat.acodec && bestFormat.acodec !== 'none')) {
            downloadType = 'audio';
        }

        this.currentFormatId = bestFormat.format_id;

        this.showLoading(`Starting custom playlist download (${maxVideos} videos)...`);
        
        try {
            const response = await fetch('/api/download-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: document.getElementById('url-input').value.trim(),
                    format_id: bestFormat.format_id,
                    download_type: downloadType,
                    download_path: this.currentDownloadPath,
                    max_videos: maxVideos
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentDownloadId = data.download_id;
                this.startProgressTracking();
                this.showToast(`Custom playlist download started! (${data.total_videos} videos)`, 'success');
            } else {
                this.showToast(data.error || 'Failed to start custom playlist download', 'error');
            }
        } catch (error) {
            this.showToast('Network error: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    startProgressTracking() {
        console.log('Starting progress tracking for download ID:', this.currentDownloadId);
        
        // Hide the separate progress section since we're using inline progress
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        // Start polling for progress updates
        this.progressInterval = setInterval(async () => {
            if (!this.currentDownloadId) {
                console.log('No current download ID, stopping progress tracking');
                this.stopProgressTracking();
                return;
            }

            try {
                const response = await fetch(`/api/progress/${this.currentDownloadId}`);
                const progress = await response.json();

                if (response.ok) {
                    this.updateInlineProgress(progress);
                    
                    if (progress.status === 'completed' || progress.status === 'error') {
                        console.log('Download finished with status:', progress.status);
                        this.stopProgressTracking();
                        if (progress.status === 'completed') {
                            this.loadDownloads(); // Refresh downloads list
                        }
                    }
                }
            } catch (error) {
                console.error('Progress tracking error:', error);
            }
        }, 500); // Update every 500ms for smooth progress
    }

    updateInlineProgress(progress) {
        console.log('Updating inline progress:', progress);
        
        // Find the format item that's being downloaded
        const formatItem = document.querySelector(`[data-format-id="${this.currentFormatId}"]`);
        if (!formatItem) {
            console.error('Format item not found for:', this.currentFormatId);
            return;
        }

        const progressBar = formatItem.querySelector('.format-progress');
        const progressFill = formatItem.querySelector('.inline-progress-fill');
        const progressText = formatItem.querySelector('.inline-progress-text');
        const downloadBtn = formatItem.querySelector('.download-btn');

        console.log('Progress elements found:', { progressBar, progressFill, progressText, downloadBtn });

        if (progressBar && progressFill && progressText) {
            // Show progress section
            progressBar.style.display = 'block';
            
            // Update progress bar with smooth animation
            const progressValue = progress.progress || 0;
            console.log('Setting progress width to:', progressValue + '%');
            progressFill.style.width = `${progressValue}%`;
            
            // Update progress text
            if (progress.total_videos && progress.total_videos > 0) {
                // This is a playlist download
                let message = progress.message || 'Downloading...';
                if (progress.current_video && progress.completed_videos !== undefined) {
                    message += ` (${progress.completed_videos}/${progress.total_videos} completed`;
                    if (progress.failed_videos > 0) {
                        message += `, ${progress.failed_videos} failed`;
                    }
                    message += ')';
                }
                progressText.textContent = message;
            } else {
                // Regular single video download
                progressText.textContent = progress.message || `Downloading... ${progressValue.toFixed(1)}%`;
            }

            // Hide download button during download
            if (downloadBtn) {
                downloadBtn.style.display = 'none';
            }

            // Update progress bar color based on status
            if (progress.status === 'completed') {
                progressFill.style.background = 'linear-gradient(135deg, #66bb6a, #4caf50)';
                progressText.textContent = 'Download completed!';
            } else if (progress.status === 'error') {
                progressFill.style.background = 'linear-gradient(135deg, #e57373, #ef5350)';
                progressText.textContent = 'Download failed';
            } else if (progress.status === 'downloading') {
                // Show downloading status with blue color
                progressFill.style.background = 'linear-gradient(135deg, #42a5f5, #2196f3)';
            }
            
            // Force a repaint to ensure progress bar updates
            progressFill.offsetHeight;
        } else {
            console.error('Progress elements not found in format item');
        }
    }

    updateProgress(progress) {
        // This method is now deprecated in favor of updateInlineProgress
        // Keep for backward compatibility
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        progressFill.style.width = `${progress.progress}%`;
        
        // Handle playlist progress differently
        if (progress.total_videos && progress.total_videos > 0) {
            // This is a playlist download
            let message = progress.message;
            if (progress.current_video && progress.completed_videos !== undefined) {
                message += ` (${progress.current_video}/${progress.total_videos} completed`;
                if (progress.failed_videos > 0) {
                    message += `, ${progress.failed_videos} failed`;
                }
                message += ')';
            }
            progressText.textContent = message;
        } else {
            // Regular single video download
            progressText.textContent = progress.message;
        }
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        // Reset inline progress bars
        if (this.currentFormatId) {
            const formatItem = document.querySelector(`[data-format-id="${this.currentFormatId}"]`);
            if (formatItem) {
                const progressBar = formatItem.querySelector('.format-progress');
                const downloadBtn = formatItem.querySelector('.download-btn');
                
                if (progressBar && downloadBtn) {
                    progressBar.style.display = 'none';
                    downloadBtn.style.display = 'inline-block';
                }
            }
        }

        this.currentDownloadId = null;
        this.currentFormatId = null;
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
    window.app = new TubeSyncApp();
});
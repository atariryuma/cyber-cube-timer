/**
 * CYBER CUBE TIMER - Camera Module
 * Handles camera recording during solve attempts
 */

const Camera = {
    stream: null,
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    isCameraOn: false,
    currentRecordingTimeId: null, // Store the time record ID for the current recording
    pendingVideoBlob: null, // Store the video blob temporarily

    /**
     * Initialize camera module
     */
    async init() {
        this.attachEventListeners();
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const toggleBtn = document.getElementById('camera-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCamera());
        }
    },

    /**
     * Toggle camera on/off
     */
    async toggleCamera() {
        if (this.isCameraOn) {
            await this.stopCamera();
        } else {
            await this.startCamera();
        }
    },

    /**
     * Start camera preview
     */
    async startCamera(videoElementId = 'camera-preview') {
        try {
            // Request camera with low quality settings
            const constraints = {
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    frameRate: { ideal: 15, max: 15 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            const videoElement = document.getElementById(videoElementId);
            if (!videoElement) {
                console.error(`Video element not found: ${videoElementId}`);
                return;
            }

            videoElement.srcObject = this.stream;

            this.isCameraOn = true;
            this.updateUI();

            console.log(`✅ Camera started on element: ${videoElementId}`);

        } catch (error) {
            console.error('Camera error:', error);
            alert('カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。');
        }
    },

    /**
     * Stop camera preview
     */
    async stopCamera() {
        if (this.isRecording) {
            await this.stopRecording();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const videoElement = document.getElementById('camera-preview');
        videoElement.srcObject = null;

        this.isCameraOn = false;
        this.updateUI();
    },

    /**
     * Start recording
     */
    startRecording() {
        if (!this.isCameraOn || this.isRecording) {
            return;
        }

        this.recordedChunks = [];

        // Use low quality settings for recording
        const options = {
            mimeType: 'video/webm;codecs=vp8',
            videoBitsPerSecond: 250000 // 250 kbps - very low quality
        };

        try {
            this.mediaRecorder = new MediaRecorder(this.stream, options);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            this.updateUI();

        } catch (error) {
            console.error('Recording error:', error);
            alert('録画の開始に失敗しました。');
        }
    },

    /**
     * Stop recording
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return;
        }

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Create blob and store it temporarily
                if (this.recordedChunks.length > 0) {
                    this.pendingVideoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                    console.log('Video recording stopped, blob created:', this.pendingVideoBlob.size, 'bytes');
                }
                this.recordedChunks = [];
                this.isRecording = false;
                this.updateUI();
                resolve();
            };

            this.mediaRecorder.stop();
        });
    },

    /**
     * Save recording to IndexedDB and optionally download
     */
    async saveRecording(timeId = null, autoDownload = false) {
        // Use pending blob if available, otherwise create from chunks
        let blob = this.pendingVideoBlob;

        if (!blob && this.recordedChunks.length > 0) {
            blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        }

        if (!blob) {
            console.warn('No video data to save');
            return null;
        }

        console.log('Saving video blob:', blob.size, 'bytes, timeId:', timeId);

        // Save to IndexedDB if timeId is provided
        if (timeId && window.DB) {
            try {
                await window.DB.updateTime(timeId, { videoBlob: blob });
                console.log('✅ Video saved to database for time ID:', timeId);
            } catch (error) {
                console.error('❌ Failed to save video to database:', error);
            }
        }

        // Auto download if requested
        if (autoDownload) {
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `cube-solve-${timestamp}.webm`;

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }

        // Clear temporary storage
        this.recordedChunks = [];
        this.pendingVideoBlob = null;

        return blob;
    },

    /**
     * Download video from database
     */
    async downloadVideo(timeId) {
        if (!window.DB) return;

        try {
            const timeRecord = await window.DB.getTime(timeId);
            if (!timeRecord || !timeRecord.videoBlob) {
                alert('この記録に動画は保存されていません');
                return;
            }

            const url = URL.createObjectURL(timeRecord.videoBlob);
            const timestamp = new Date(timeRecord.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `cube-solve-${timestamp}.webm`;

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            console.error('Failed to download video:', error);
            alert('ダウンロードに失敗しました');
        }
    },

    /**
     * Play video in modal
     */
    async playVideo(timeId) {
        if (!window.DB) return;

        try {
            const timeRecord = await window.DB.getTime(timeId);
            if (!timeRecord || !timeRecord.videoBlob) {
                alert('この記録に動画は保存されていません');
                return;
            }

            // Create or get video modal
            let modal = document.getElementById('video-player-modal');
            if (!modal) {
                modal = this.createVideoModal();
            }

            const videoElement = modal.querySelector('#video-player');
            const url = URL.createObjectURL(timeRecord.videoBlob);
            videoElement.src = url;

            // Update modal title with time info
            const timeText = this.formatTime(timeRecord.time);
            modal.querySelector('.video-modal-title').textContent = `記録: ${timeText}`;

            // Show modal with active class
            modal.classList.add('active');
            modal.style.display = 'flex';

            // Play video after modal is shown
            setTimeout(() => {
                videoElement.play().catch(err => {
                    console.error('Video play error:', err);
                });
            }, 100);

            // Clean up URL when modal closes
            modal.addEventListener('hidden', () => {
                URL.revokeObjectURL(url);
                videoElement.src = '';
            }, { once: true });

        } catch (error) {
            console.error('Failed to play video:', error);
            alert('再生に失敗しました');
        }
    },

    /**
     * Create video player modal
     */
    createVideoModal() {
        const modal = document.createElement('div');
        modal.id = 'video-player-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content video-modal-content">
                <div class="modal-header">
                    <h2 class="video-modal-title">動画再生</h2>
                    <button class="modal-close" id="close-video-player">&times;</button>
                </div>
                <div class="modal-body">
                    <video id="video-player" controls autoplay style="width: 100%; max-height: 70vh; background: #000;"></video>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal on click outside or close button
        const closeBtn = modal.querySelector('#close-video-player');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.dispatchEvent(new Event('hidden'));
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
                modal.dispatchEvent(new Event('hidden'));
            }
        });

        return modal;
    },

    /**
     * Format time for display
     */
    formatTime(ms) {
        return window.TimeUtil ? TimeUtil.formatTime(ms) : (ms / 1000).toFixed(3);
    },

    /**
     * Update UI to reflect camera state
     */
    updateUI() {
        const statusText = document.getElementById('camera-status');
        const icon = document.getElementById('camera-icon');
        const recordingIndicator = document.getElementById('recording-indicator');
        const cameraSection = document.getElementById('camera-section');

        if (this.isCameraOn) {
            statusText.textContent = 'カメラOFF';
            icon.textContent = '📹';
            cameraSection.classList.add('camera-active');
        } else {
            statusText.textContent = 'カメラON';
            icon.textContent = '📷';
            cameraSection.classList.remove('camera-active');
        }

        if (this.isRecording) {
            recordingIndicator.style.display = 'inline-block';
        } else {
            recordingIndicator.style.display = 'none';
        }
    }
};

// Make Camera globally available
window.Camera = Camera;

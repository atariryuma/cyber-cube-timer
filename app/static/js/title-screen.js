/**
 * CYBER CUBE TIMER - Title Screen Module
 * Professional game-style main menu with mode selection
 */

const TitleScreen = {
    isActive: true,
    selectedMode: null,

    /**
     * Initialize title screen
     */
    init() {
        // Show title screen on page load
        this.show();

        // Set up event listeners
        this.setupEventListeners();
    },

    /**
     * Show title screen
     */
    show() {
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.classList.remove('hidden');
            this.isActive = true;
        }
    },

    /**
     * Hide title screen with animation
     */
    hide() {
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.classList.add('hidden');
            this.isActive = false;

            // After animation completes, fully hide
            setTimeout(() => {
                titleScreen.style.display = 'none';
            }, 500);
        }
    },

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Time Attack Mode button
        const timeAttackBtn = document.getElementById('btn-time-attack');
        if (timeAttackBtn) {
            timeAttackBtn.addEventListener('click', () => {
                this.selectMode('time-attack');
            });
        }

        // Battle Mode button
        const battleModeBtn = document.getElementById('btn-battle-mode');
        if (battleModeBtn) {
            battleModeBtn.addEventListener('click', () => {
                this.selectMode('battle');
            });
        }

        // Return to Title button (in header)
        const returnBtn = document.getElementById('return-to-title-btn');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                this.returnToTitle();
            });
        }

        // Also handle "Back" button in battle mode
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-exit-battle') {
                this.returnToTitle();
            }
        });

        // Settings button in footer
        const settingsLink = document.getElementById('title-settings');
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isActive) return;

                // Open settings modal
                if (window.App && window.App.openSettings) {
                    window.App.openSettings();
                }
            });
        }

        // Help button in footer
        const helpLink = document.getElementById('title-help');
        if (helpLink) {
            helpLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isActive) return;

                // Open help modal
                if (window.App && window.App.openHelp) {
                    window.App.openHelp();
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            // Enter key to select first option (Time Attack)
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectMode('time-attack');
            }

            // B key for Battle Mode
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                this.selectMode('battle');
            }
        });
    },

    /**
     * Select game mode
     */
    selectMode(mode) {
        if (!this.isActive) return;

        this.selectedMode = mode;

        // Play selection sound effect
        this.playSelectionSound();

        // Hide title screen
        this.hide();

        // Start selected mode after animation
        setTimeout(() => {
            if (mode === 'time-attack') {
                this.startTimeAttackMode();
            } else if (mode === 'battle') {
                this.startBattleMode();
            }
        }, 500);
    },

    /**
     * Start Time Attack mode
     */
    startTimeAttackMode() {
        // Make sure battle mode is off
        if (window.BattleMode) {
            window.BattleMode.deactivate();
        }

        // Show normal mode container
        const normalContainer = document.getElementById('normal-mode-container');
        if (normalContainer) {
            normalContainer.classList.add('active');
        }

        // Hide battle container
        const battleContainer = document.getElementById('battle-mode-container');
        if (battleContainer) {
            battleContainer.classList.remove('active');
        }

        // Initialize 3D cube visualizer
        setTimeout(() => {
            if (window.CubeVisualizer && document.getElementById('cube-3d')) {
                // Always reinitialize to ensure it's properly set up
                console.log('🔄 Reinitializing CubeVisualizer for Time Attack mode');
                window.CubeVisualizer.init('cube-3d');
            }
        }, 100);

        // Generate new scramble
        if (window.App && window.App.generateScramble) {
            window.App.generateScramble();
        }
    },

    /**
     * Start Battle mode
     */
    startBattleMode() {
        // Activate battle mode
        if (window.BattleMode) {
            window.BattleMode.activate();
        }

        // Generate new scramble
        if (window.App && window.App.generateScramble) {
            window.App.generateScramble();
        }
    },

    /**
     * Return to title screen (for back buttons)
     */
    returnToTitle() {
        // Show title screen
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.style.display = 'flex';
            setTimeout(() => {
                this.show();
            }, 10);
        }

        // Hide both mode containers
        const normalContainer = document.getElementById('normal-mode-container');
        const battleContainer = document.getElementById('battle-mode-container');

        if (normalContainer) {
            normalContainer.classList.remove('active');
        }
        if (battleContainer) {
            battleContainer.classList.remove('active');
        }

        // Reset battle mode
        if (window.BattleMode) {
            window.BattleMode.isActive = false;
            window.BattleMode.stopCPU();
        }

        // Stop/Reset timer if running
        if (window.Timer) {
            if (window.Timer.state === 'running') {
                try { window.Timer.stop(); } catch (_) {}
            }
            if (typeof window.Timer.reset === 'function') {
                window.Timer.reset();
            }
        }

        // Stop camera
        if (window.Camera && window.Camera.isCameraOn) {
            window.Camera.stopCamera();
        }
    },

    /**
     * Play selection sound effect
     */
    playSelectionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 600;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.warn('Audio not available:', error);
        }
    }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TitleScreen.init();
    });
} else {
    TitleScreen.init();
}

// Make TitleScreen globally available
window.TitleScreen = TitleScreen;

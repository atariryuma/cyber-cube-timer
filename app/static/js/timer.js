/**
 * CYBER CUBE TIMER - Timer Module
 * Handles timer functionality with inspection support
 */

const Timer = {
    // Timer states
    state: 'idle', // idle, ready, inspection, running, stopped
    isRunning: false,

    // Time tracking
    startTime: 0,
    currentTime: 0,

    // Inspection settings (WCA standard)
    inspectionTime: 15,
    inspectionInterval: null,

    // Timer intervals / animation
    timerInterval: null,
    animationFrameId: null,
    holdTimer: null,

    // State management
    isTransitioning: false, // Prevent race conditions during async operations

    // Constants
    HOLD_DURATION_MS: 300, // 0.3 seconds for hold start
    INSPECTION_DURATION: 15, // seconds
    INSPECTION_WARNING_8S: 8, // first warning at 8s
    INSPECTION_WARNING_12S: 12, // second warning at 12s
    INSPECTION_PENALTY_TIME: 0, // time when +2 starts (15s)
    INSPECTION_DNF_TIME: -2, // time when DNF occurs (17s total = 15 + 2)
    PENALTY_TIME_MS: 2000, // +2 penalty in milliseconds
    TIMER_UPDATE_INTERVAL_MS: 10, // Update display every 10ms

    /**
     * Initialize timer
     */
    init() {
        this.attachEventListeners();
    },

    /**
     * Attach keyboard and touch event listeners
     */
    attachEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            // Don't handle events when battle mode is active
            if (window.BattleMode && window.BattleMode.isActive) return;
            if (App.settings.trigger === 'touch') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleKeyDown();
            }
        });

        document.addEventListener('keyup', (e) => {
            // Don't handle events when battle mode is active
            if (window.BattleMode && window.BattleMode.isActive) return;
            if (App.settings.trigger === 'touch') return;
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleKeyUp();
            }
        });

        // Touch/Click events
        const timerDisplay = document.getElementById('timer-display');

        timerDisplay.addEventListener('mousedown', () => {
            if (App.settings.trigger === 'space') return;
            this.handleKeyDown();
        });

        timerDisplay.addEventListener('mouseup', () => {
            if (App.settings.trigger === 'space') return;
            this.handleKeyUp();
        });

        timerDisplay.addEventListener('touchstart', (e) => {
            if (App.settings.trigger === 'space') return;
            e.preventDefault();
            this.handleKeyDown();
        });

        timerDisplay.addEventListener('touchend', (e) => {
            if (App.settings.trigger === 'space') return;
            e.preventDefault();
            this.handleKeyUp();
        });
    },

    /**
     * Handle key/touch down
     */
    handleKeyDown() {
        // Prevent actions during state transitions (race condition protection)
        if (this.isTransitioning) {
            return;
        }

        if (this.state === 'running') {
            // Stop timer
            this.stop();
            return;
        }

        if (this.state === 'inspection') {
            // Start timer from inspection
            this.startFromInspection();
            return;
        }

        if (this.state === 'idle' || this.state === 'stopped') {
            // Prepare to start
            if (App.settings.holdStart) {
                this.setState('waiting');
                this.holdTimer = setTimeout(() => {
                    this.setState('ready');
                    if (App.settings.sound) {
                        playSound('start');
                    }
                }, this.HOLD_DURATION_MS);
            } else {
                this.setState('ready');
            }
        }
    },

    /**
     * Handle key/touch up
     */
    handleKeyUp() {
        // Prevent actions during state transitions
        if (this.isTransitioning) {
            return;
        }
        if (this.state === 'waiting') {
            // Released too early
            clearTimeout(this.holdTimer);
            this.setState('idle');
            return;
        }

        if (this.state === 'ready') {
            // Start timer or inspection
            clearTimeout(this.holdTimer);

            if (App.settings.inspection) {
                this.startInspection();
            } else {
                this.start();
            }
        }
    },

    /**
     * Set timer state and update UI
     */
    setState(newState) {
        this.state = newState;
        const timerDisplay = document.getElementById('timer-display');
        const instruction = document.getElementById('timer-instruction');
        this.isRunning = newState === 'running';

        // Remove all state classes
        timerDisplay.classList.remove('ready', 'waiting', 'running');

        switch (newState) {
            case 'idle':
                instruction.innerHTML = '<span class="pulse-text">SPACE キーを押してスタート</span>';
                break;
            case 'waiting':
                timerDisplay.classList.add('waiting');
                instruction.textContent = '長押し中...';
                break;
            case 'ready':
                timerDisplay.classList.add('ready');
                instruction.textContent = 'Ready! 離してスタート';
                break;
            case 'inspection':
                instruction.textContent = 'インスペクション中';
                break;
            case 'running':
                timerDisplay.classList.add('running');
                instruction.textContent = '';
                break;
            case 'stopped':
                instruction.innerHTML = '<span class="pulse-text">SPACE で次のソルブ</span>';
                break;
        }

        // Update timer action buttons visibility
        if (typeof updateTimerActionsVisibility === 'function') {
            updateTimerActionsVisibility();
        }
    },

    /**
     * Reset timer to idle state and clear all timers
     */
    reset() {
        try {
            clearInterval(this.timerInterval);
            clearInterval(this.inspectionInterval);
            clearTimeout(this.holdTimer);
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
        } catch (_) {}
        this.timerInterval = null;
        this.inspectionInterval = null;
        this.holdTimer = null;
        this.isTransitioning = false;
        this.startTime = 0;
        this.currentTime = 0;
        this.penalty = 0;

        // Hide inspection UI if visible
        const inspectionTimer = document.getElementById('inspection-timer');
        if (inspectionTimer) {
            inspectionTimer.style.display = 'none';
            inspectionTimer.classList.remove('warning');
        }

        // Reset display
        const timerValue = document.querySelector('.timer-value');
        if (timerValue) timerValue.textContent = '0.000';

        // Reset classes and state
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) timerDisplay.classList.remove('ready', 'waiting', 'running');
        this.setState('idle');
    },

    /**
     * Start inspection countdown
     */
    startInspection() {
        this.setState('inspection');
        this.inspectionTime = this.INSPECTION_DURATION;

        const inspectionTimer = document.getElementById('inspection-timer');
        inspectionTimer.style.display = 'block';
        inspectionTimer.querySelector('.inspection-value').textContent = this.inspectionTime;
        inspectionTimer.classList.remove('warning');

        this.inspectionInterval = setInterval(() => {
            this.inspectionTime--;

            // WCA warnings at 8s and 12s
            if (this.inspectionTime === this.INSPECTION_WARNING_8S ||
                this.inspectionTime === this.INSPECTION_WARNING_12S) {
                if (App.settings.sound) {
                    playSound('inspection');
                }
            }

            // Visual warning when over time limit
            if (this.inspectionTime <= this.INSPECTION_PENALTY_TIME) {
                inspectionTimer.classList.add('warning');
                if (App.settings.sound) {
                    playSound('inspection');
                }
            }

            // DNF after 17 seconds (15 + 2)
            if (this.inspectionTime <= this.INSPECTION_DNF_TIME) {
                this.stopInspection();
                this.saveDNF();
                return;
            }

            inspectionTimer.querySelector('.inspection-value').textContent =
                this.inspectionTime > 0 ? this.inspectionTime : '+' + Math.abs(this.inspectionTime);
        }, 1000);
    },

    /**
     * Start timer from inspection
     */
    startFromInspection() {
        // +2 penalty if started after 15 seconds (but before 17s DNF)
        const penalty = this.inspectionTime < this.INSPECTION_PENALTY_TIME ? this.PENALTY_TIME_MS : 0;
        this.stopInspection();
        this.start(penalty);
    },

    /**
     * Stop inspection
     */
    stopInspection() {
        clearInterval(this.inspectionInterval);
        document.getElementById('inspection-timer').style.display = 'none';
    },

    /**
     * Start timer
     */
    start(penalty = 0) {
        this.setState('running');
        this.startTime = performance.now();
        this.penalty = penalty;

        if (App.settings.sound) {
            playSound('start');
        }

        // Start camera recording if camera is on
        if (window.Camera && window.Camera.isCameraOn) {
            window.Camera.startRecording();
        }

        // Notify Battle Mode if active (for animations)
        if (window.BattleMode && window.BattleMode.isActive) {
            window.RaceAnimation?.startRaceParticles();
        }

        // Update timer display via rAF for smoother UI
        const update = () => {
            this.currentTime = performance.now() - this.startTime;
            this.updateDisplay(this.currentTime);

            // Update player progress in battle mode
            if (window.BattleMode && window.BattleMode.isActive && window.BattleMode.raceState === 'racing') {
                const cpuTargetTime = (window.BattleMode && typeof window.BattleMode.cpuTargetTime === 'number')
                    ? window.BattleMode.cpuTargetTime
                    : 30000;
                const progress = Math.min((this.currentTime / cpuTargetTime) * 100, 100);
                window.RaceAnimation?.updatePlayerProgress(progress, this.currentTime);
            }

            this.animationFrameId = requestAnimationFrame(update);
        };
        this.animationFrameId = requestAnimationFrame(update);
    },

    /**
     * Stop timer
     */
    async stop() {
        // Set transitioning flag to prevent race conditions
        this.isTransitioning = true;

        clearInterval(this.timerInterval);
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.setState('stopped');

        const finalTime = performance.now() - this.startTime;
        this.updateDisplay(finalTime);

        if (App.settings.sound) {
            playSound('stop');
        }

        // Stop race particles if in battle mode
        if (window.RaceAnimation) {
            window.RaceAnimation.stopRaceParticles();
        }

        try {
            // Save time to database first to get the ID (only in normal mode)
            if (!window.BattleMode || !window.BattleMode.isActive) {
                const timeId = await this.saveTime(finalTime, this.penalty || 0);

                // Stop camera recording and save video with time ID
                if (window.Camera && window.Camera.isRecording) {
                    await window.Camera.stopRecording();
                    // Save the recorded video to the database with the time ID
                    await window.Camera.saveRecording(timeId, false);
                }

                // Load new scramble for next solve
                await loadNewScramble();
            }
        } catch (error) {
            console.error('Error during timer stop:', error);
        } finally {
            // Clear transitioning flag
            this.isTransitioning = false;
        }
    },

    /**
     * Update timer display
     */
    updateDisplay(milliseconds) {
        const seconds = (milliseconds / 1000).toFixed(3);
        document.querySelector('.timer-value').textContent = seconds;
    },

    /**
     * Save time to database
     */
    async saveTime(time, penalty = 0) {
        const timeData = {
            time: Math.round(time),
            penalty: penalty,
            dnf: false,
            scramble: App.currentScramble,
            cubeType: App.currentCubeType,
            session: App.currentSession,
            timestamp: Date.now()
        };

        const timeId = await DB.addTime(timeData);
        await updateStatistics();

        // Check for new records
        this.checkNewRecords(timeData);

        return timeId;
    },

    /**
     * Save DNF
     */
    async saveDNF() {
        const timeData = {
            time: 0,
            penalty: 0,
            dnf: true,
            scramble: App.currentScramble,
            cubeType: App.currentCubeType,
            session: App.currentSession,
            timestamp: Date.now()
        };

        await DB.addTime(timeData);
        await updateStatistics();

        this.setState('stopped');
        this.updateDisplay(0);
        document.querySelector('.timer-value').textContent = 'DNF';

        // Load new scramble
        setTimeout(() => {
            loadNewScramble();
        }, 100);
    },

    /**
     * Check for new records and show achievements
     */
    async checkNewRecords(newTime) {
        const times = await DB.getTimes(App.currentSession, App.currentCubeType);
        const validTimes = times.filter(t => !t.dnf).map(t => t.time);

        if (validTimes.length === 1) {
            // First solve
            showAchievement('FIRST SOLVE!', `Time: ${window.TimeUtil ? TimeUtil.formatTime(newTime.time) : (newTime.time/1000).toFixed(3)}s`);
            return;
        }

        // Check if new personal best
        const bestTime = Math.min(...validTimes);
        if (newTime.time === bestTime && validTimes.length > 1) {
            showAchievement('NEW PERSONAL BEST!', `Time: ${window.TimeUtil ? TimeUtil.formatTime(newTime.time) : (newTime.time/1000).toFixed(3)}s`);
            return;
        }

        // Check for sub-X achievements
        const seconds = newTime.time / 1000;
        const milestones = [20, 15, 10, 8, 6, 5];

        for (const milestone of milestones) {
            if (seconds < milestone) {
                const previousBest = validTimes.filter((t, i) => i !== 0);
                const wasPreviouslyOver = previousBest.length === 0 || Math.min(...previousBest) / 1000 >= milestone;

                if (wasPreviouslyOver) {
                    showAchievement(`SUB-${milestone} ACHIEVED!`, `Time: ${window.TimeUtil ? TimeUtil.formatTime(newTime.time) : (newTime.time/1000).toFixed(3)}s`);
                    break;
                }
            }
        }

        // Check for Ao5 PB
        if (times.length >= 5) {
            const stats = Statistics.calculate(times);
            const previousStats = Statistics.calculate(times.slice(1));

            if (stats.ao5.value && previousStats.ao5.value) {
                const currentAo5 = parseFloat(stats.ao5.value);
                const previousAo5 = parseFloat(previousStats.ao5.value);

                if (currentAo5 < previousAo5) {
                    showAchievement('NEW Ao5 RECORD!', `Ao5: ${stats.ao5.value}s`);
                }
            }
        }
    }
};

// Make Timer globally available
window.Timer = Timer;

/**
 * CYBER CUBE TIMER - CPU Opponent Module
 * Simulates AI opponent solving times with realistic behavior
 */

const CPUOpponent = {
    isRacing: false,
    raceStartTime: null,
    targetTime: null,
    updateInterval: null,
    currentDifficulty: null,

    /**
     * Start a race with specified difficulty
     */
    startRace(difficulty) {
        if (this.isRacing) {
            this.stopRace();
        }

        const opponent = window.BattleMode?.opponents?.[difficulty];
        if (!opponent) {
            console.error('Invalid difficulty:', difficulty);
            return;
        }

        this.currentDifficulty = difficulty;
        this.isRacing = true;
        this.raceStartTime = performance.now();

        // Generate target time with variance
        this.targetTime = this.generateTargetTime(opponent.avgTime, opponent.variance);

        // Start updating progress
        this.startProgressUpdates();
    },

    /**
     * Generate a realistic target time with variance
     */
    generateTargetTime(avgTime, variance) {
        // Use normal distribution for more realistic times
        const randomFactor = this.gaussianRandom();
        const deviation = avgTime * variance * randomFactor;

        // Ensure time is always positive
        const targetTime = Math.max(1000, avgTime + deviation);

        return targetTime;
    },

    /**
     * Generate Gaussian (normal) distributed random number
     * Using Box-Muller transform
     */
    gaussianRandom() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();

        // Box-Muller transform
        const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        // Clamp to ±2 standard deviations (95% of values)
        return Math.max(-2, Math.min(2, num)) / 2;
    },

    /**
     * Start updating CPU progress
     */
    startProgressUpdates() {
        // Update progress every 50ms for smooth animation
        this.updateInterval = setInterval(() => {
            this.updateProgress();
        }, 50);
    },

    /**
     * Update CPU progress
     */
    updateProgress() {
        if (!this.isRacing) return;

        const elapsed = performance.now() - this.raceStartTime;

        // Calculate progress with non-linear easing
        // Uses ease-in-out curve for more realistic solving pattern
        const rawProgress = Math.min(elapsed / this.targetTime, 1);
        const progress = this.easeInOutCubic(rawProgress) * 100;

        // Update CPU progress bar
        const cpuProgressBar = document.getElementById('progress-cpu-fill');
        const cpuMarker = document.getElementById('cpu-marker');
        const cpuTime = document.getElementById('cpu-time-display');

        if (cpuProgressBar) {
            cpuProgressBar.style.width = `${progress}%`;
        }

        if (cpuMarker) {
            cpuMarker.style.left = `${progress}%`;
        }

        if (cpuTime && elapsed < this.targetTime) {
            cpuTime.textContent = window.BattleMode?.formatTime(elapsed) || '--:--.---';
        }

        // Check if CPU finished
        if (elapsed >= this.targetTime) {
            this.finishRace();
        }
    },

    /**
     * Ease-in-out cubic function for smooth progress
     */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    /**
     * Finish the race
     */
    finishRace() {
        if (!this.isRacing) return;

        this.isRacing = false;
        clearInterval(this.updateInterval);

        // Notify BattleMode
        if (window.BattleMode) {
            window.BattleMode.onCPUFinish(this.targetTime);
        }

        // Update final display
        const cpuTime = document.getElementById('cpu-time-display');
        if (cpuTime) {
            cpuTime.textContent = window.BattleMode?.formatTime(this.targetTime) || '--:--.---';
        }
    },

    /**
     * Stop the current race
     */
    stopRace() {
        this.isRacing = false;
        this.raceStartTime = null;
        this.targetTime = null;
        this.currentDifficulty = null;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Reset progress display
        const cpuProgressBar = document.getElementById('progress-cpu-fill');
        const cpuMarker = document.getElementById('cpu-marker');
        const cpuTime = document.getElementById('cpu-time-display');

        if (cpuProgressBar) {
            cpuProgressBar.style.width = '0%';
        }

        if (cpuMarker) {
            cpuMarker.style.left = '0%';
        }

        if (cpuTime) {
            cpuTime.textContent = '--:--.---';
        }
    },

    /**
     * Get current progress percentage
     */
    getProgress() {
        if (!this.isRacing || !this.raceStartTime) return 0;

        const elapsed = performance.now() - this.raceStartTime;
        const rawProgress = Math.min(elapsed / this.targetTime, 1);
        return this.easeInOutCubic(rawProgress) * 100;
    },

    /**
     * Get estimated finish time
     */
    getEstimatedFinishTime() {
        return this.targetTime;
    },

    /**
     * Check if CPU has finished
     */
    hasFinished() {
        if (!this.isRacing || !this.raceStartTime) return false;

        const elapsed = performance.now() - this.raceStartTime;
        return elapsed >= this.targetTime;
    }
};

// Make CPUOpponent globally available
window.CPUOpponent = CPUOpponent;

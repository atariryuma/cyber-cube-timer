/**
 * CYBER CUBE TIMER - Battle Timer Module
 * プレイヤー専用タイマー（バトルモード用）
 * グローバルTimerとは完全に分離
 */

const BattleTimer = {
    // State machine
    state: 'idle', // idle, inspection, ready, solving, finished

    // Time tracking
    inspectionStartTime: null,
    solveStartTime: null,
    solveEndTime: null,

    // Intervals
    inspectionInterval: null,
    solveInterval: null,
    readyTimeout: null,

    // WCA規則
    INSPECTION_TIME_LIMIT: 15000, // 15秒
    INSPECTION_PENALTY_TIME: 15000, // 15秒超過で+2秒
    INSPECTION_DNF_TIME: 17000, // 17秒超過でDNF
    READY_HOLD_TIME: 300, // 0.3秒長押しでREADY

    // Penalty data
    penalty: 0, // +2秒 = 2000ms
    isDNF: false,

    // Key state
    spacePressed: false,
    spaceDownTime: null,

    // Callbacks
    onInspectionUpdate: null,
    onStateChange: null,
    onSolveUpdate: null,
    onFinish: null,

    /**
     * 初期化
     */
    init() {
        this.attachEventListeners();
    },

    /**
     * イベントリスナー設定
     */
    attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            // Only handle events when battle mode is active
            if (!window.BattleMode || !window.BattleMode.isActive) return;

            if (e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation(); // Stop event from reaching Timer.js
                this.handleSpaceDown();
            }
        });

        document.addEventListener('keyup', (e) => {
            // Only handle events when battle mode is active
            if (!window.BattleMode || !window.BattleMode.isActive) return;

            if (e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation(); // Stop event from reaching Timer.js
                this.handleSpaceUp();
            }
        });
    },

    /**
     * SPACE押下処理
     */
    handleSpaceDown() {
        if (this.spacePressed) return; // Already pressed
        this.spacePressed = true;
        this.spaceDownTime = performance.now();

        // Solving state → Stop timer
        if (this.state === 'solving') {
            this.stopSolve();
            return;
        }

        // Inspection state → Start ready countdown (visual feedback)
        if (this.state === 'inspection') {
            this.startReadyCountdown();
            return;
        }
    },

    /**
     * SPACE離す処理
     */
    handleSpaceUp() {
        if (!this.spacePressed) return;
        this.spacePressed = false;

        const holdTime = performance.now() - this.spaceDownTime;

        // Ready state → Start solve immediately (no minimum hold time check)
        if (this.state === 'ready') {
            this.clearReadyTimeout();
            this.startSolve();
            return;
        }

        // Idle state → Start inspection
        if (this.state === 'idle') {
            this.startInspection();
            return;
        }
    },

    /**
     * インスペクション開始
     */
    startInspection() {
        this.setState('inspection');
        this.inspectionStartTime = performance.now();
        this.penalty = 0;
        this.isDNF = false;

        // Update inspection timer
        this.inspectionInterval = setInterval(() => {
            this.updateInspection();
        }, 100);

        if (this.onStateChange) {
            this.onStateChange('inspection', { remaining: 15 });
        }
    },

    /**
     * インスペクション時間更新
     */
    updateInspection() {
        const elapsed = performance.now() - this.inspectionStartTime;
        const remaining = Math.max(0, (this.INSPECTION_TIME_LIMIT - elapsed) / 1000);

        // 17秒超過 → DNF
        if (elapsed >= this.INSPECTION_DNF_TIME) {
            this.isDNF = true;
            this.stopInspection();
            this.setState('finished');

            if (this.onFinish) {
                this.onFinish({
                    time: Infinity,
                    penalty: 0,
                    isDNF: true,
                    reason: 'Inspection time exceeded 17 seconds'
                });
            }
            return;
        }

        // 15秒超過 → +2秒ペナルティ
        if (elapsed >= this.INSPECTION_PENALTY_TIME && this.penalty === 0) {
            this.penalty = 2000; // +2秒
        }

        if (this.onInspectionUpdate) {
            this.onInspectionUpdate({
                elapsed,
                remaining,
                penalty: this.penalty,
                isDNF: this.isDNF
            });
        }
    },

    /**
     * インスペクション停止
     */
    stopInspection() {
        if (this.inspectionInterval) {
            clearInterval(this.inspectionInterval);
            this.inspectionInterval = null;
        }
    },

    /**
     * READYカウントダウン開始
     */
    startReadyCountdown() {
        this.stopInspection();
        this.setState('ready');

        if (this.onStateChange) {
            this.onStateChange('ready', { penalty: this.penalty });
        }

        // Auto-cancel ready if held too long (optional)
        this.readyTimeout = setTimeout(() => {
            if (this.state === 'ready') {
                this.setState('inspection');
                this.startInspection();
            }
        }, 3000); // 3秒以上押しっぱなしはキャンセル
    },

    /**
     * READYタイムアウトクリア
     */
    clearReadyTimeout() {
        if (this.readyTimeout) {
            clearTimeout(this.readyTimeout);
            this.readyTimeout = null;
        }
    },

    /**
     * ソルブ開始
     */
    startSolve() {
        this.clearReadyTimeout();
        this.setState('solving');
        this.solveStartTime = performance.now();
        this.solveEndTime = null;

        // Update solve timer
        this.solveInterval = setInterval(() => {
            this.updateSolve();
        }, 10); // 10ms更新

        if (this.onStateChange) {
            this.onStateChange('solving', { penalty: this.penalty });
        }
    },

    /**
     * ソルブ時間更新
     */
    updateSolve() {
        const elapsed = performance.now() - this.solveStartTime;

        if (this.onSolveUpdate) {
            this.onSolveUpdate({ elapsed });
        }
    },

    /**
     * ソルブ停止
     */
    stopSolve() {
        if (this.solveInterval) {
            clearInterval(this.solveInterval);
            this.solveInterval = null;
        }

        this.solveEndTime = performance.now();
        this.setState('finished');

        const solveTime = this.solveEndTime - this.solveStartTime;
        const finalTime = solveTime + this.penalty;

        if (this.onFinish) {
            this.onFinish({
                time: finalTime,
                solveTime,
                penalty: this.penalty,
                isDNF: this.isDNF
            });
        }
    },

    /**
     * 状態変更
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
    },

    /**
     * リセット
     */
    reset() {
        this.stopInspection();
        this.clearReadyTimeout();

        // Clear solve interval
        if (this.solveInterval) {
            clearInterval(this.solveInterval);
            this.solveInterval = null;
        }

        // Clear inspection interval (if still running)
        if (this.inspectionInterval) {
            clearInterval(this.inspectionInterval);
            this.inspectionInterval = null;
        }

        this.state = 'idle';
        this.inspectionStartTime = null;
        this.solveStartTime = null;
        this.solveEndTime = null;
        this.penalty = 0;
        this.isDNF = false;
        this.spacePressed = false;
        this.spaceDownTime = null;
    },

    /**
     * 時間フォーマット
     */
    formatTime(ms) {
        if (window.TimeUtil && TimeUtil.isDNF(ms)) return 'DNF';
        return window.TimeUtil ? TimeUtil.formatTime(ms) : (ms / 1000).toFixed(3);
    }
};

// Export for use in battle-mode.js
window.BattleTimer = BattleTimer;

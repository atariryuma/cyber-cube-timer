/**
 * CYBER CUBE TIMER - Esports Battle Mode
 * 完全なEスポーツ風CPU対戦モード
 */

const BattleMode = {
    // State
    isActive: false,
    currentOpponent: null,
    raceState: 'idle', // idle, ready, racing, finished

    // Inspection timing (WCA standard)
    inspectionTimeLimit: 15000, // +2s penalty if exceeded
    inspectionWarningTime: 17000, // DNF if exceeded

    // Player data (managed by BattleTimer)
    playerFinishTime: null,

    // CPU data
    cpuStartTime: null,
    cpuFinishTime: null,
    cpuTargetTime: null,
    cpuUpdateInterval: null,

    // Stats
    stats: {
        beginner: { wins: 0, losses: 0 },
        novice: { wins: 0, losses: 0 },
        amateur: { wins: 0, losses: 0 },
        intermediate: { wins: 0, losses: 0 },
        skilled: { wins: 0, losses: 0 },
        advanced: { wins: 0, losses: 0 },
        expert: { wins: 0, losses: 0 },
        master: { wins: 0, losses: 0 },
        champion: { wins: 0, losses: 0 },
        legend: { wins: 0, losses: 0 }
    },

    // Opponents - 10 levels based on real speedcubing progression
    opponents: {
        beginner: {
            id: 'beginner',
            name: 'BEGINNER',
            displayName: 'ビギナー',
            rank: 'BEGINNER',
            icon: '🆕',
            portrait: '🎮',
            avgTime: 120000, // 2:00 - Just learned to solve
            variance: 0.35,
            color: '#8B4513',
            unlocked: true,
            description: 'キューブを解き始めたばかり',
            bio: 'ルービックキューブを解けるようになったばかりの初心者。基本的な手順を覚えている段階。',
            personality: '好奇心旺盛',
            difficulty: '★☆☆☆☆☆☆☆☆☆',
            winQuote: 'やった！勝てた！',
            loseQuote: 'うーん、難しいな...'
        },
        novice: {
            id: 'novice',
            name: 'NOVICE',
            displayName: 'ノービス',
            rank: 'NOVICE',
            icon: '🌱',
            portrait: '📚',
            avgTime: 90000, // 1:30 - Learning efficiency
            variance: 0.30,
            color: '#CD7F32',
            unlocked: false,
            description: '基礎を固めつつある初級者',
            bio: '解法を少しずつ効率化し始めている。Sub-60を目指して練習中。',
            personality: '真面目 / 向上心',
            difficulty: '★★☆☆☆☆☆☆☆☆',
            winQuote: '少しずつ速くなってる！',
            loseQuote: 'もっと練習しないと...'
        },
        amateur: {
            id: 'amateur',
            name: 'AMATEUR',
            displayName: 'アマチュア',
            rank: 'AMATEUR',
            icon: '⚙️',
            portrait: '🔧',
            avgTime: 60000, // 1:00 - Sub-60, learning F2L
            variance: 0.25,
            color: '#A0522D',
            unlocked: false,
            description: 'Sub-60の壁を越えた実力者',
            bio: 'F2Lを習得し始め、4LLLで安定して1分を切れるようになった。',
            personality: '努力家',
            difficulty: '★★★☆☆☆☆☆☆☆',
            winQuote: '練習の成果が出てきた！',
            loseQuote: 'まだまだ上がいる...'
        },
        intermediate: {
            id: 'intermediate',
            name: 'INTERMEDIATE',
            displayName: '中級者',
            rank: 'INTERMEDIATE',
            icon: '🥉',
            portrait: '⚡',
            avgTime: 40000, // 40 seconds - Solid intermediate
            variance: 0.22,
            color: '#C87533',
            unlocked: false,
            description: '中級者の仲間入りを果たした',
            bio: 'F2Lがスムーズになり、2-look OLL/PLLを使いこなせる。Sub-30が目標。',
            personality: '熱血 / 向上心',
            difficulty: '★★★★☆☆☆☆☆☆',
            winQuote: 'まだまだ強くなる！',
            loseQuote: 'くっ、悔しい！'
        },
        skilled: {
            id: 'skilled',
            name: 'SKILLED',
            displayName: 'スキルド',
            rank: 'SKILLED',
            icon: '🥈',
            portrait: '⚔️',
            avgTime: 30000, // 30 seconds - Sub-30 barrier broken
            variance: 0.20,
            color: '#C0C0C0',
            unlocked: false,
            description: 'Sub-30の壁を突破した実力者',
            bio: 'F2Lの効率が高く、先読みもできる。Full PLLを習得している。',
            personality: 'クール / 計算的',
            difficulty: '★★★★★☆☆☆☆☆',
            winQuote: '計算通りだ。',
            loseQuote: 'ふむ、予想外だな...'
        },
        advanced: {
            id: 'advanced',
            name: 'ADVANCED',
            displayName: '上級者',
            rank: 'ADVANCED',
            icon: '🥇',
            portrait: '🎯',
            avgTime: 20000, // 20 seconds - Sub-20, truly advanced
            variance: 0.18,
            color: '#FFD700',
            unlocked: false,
            description: 'Sub-20を達成した上級者',
            bio: '先読みが完璧で、Full OLLも習得済み。Sub-20は真の上級者の証。',
            personality: '冷静沈着',
            difficulty: '★★★★★★☆☆☆☆',
            winQuote: '悪くない戦いだった。',
            loseQuote: '君は強い。認めよう。'
        },
        expert: {
            id: 'expert',
            name: 'EXPERT',
            displayName: 'エキスパート',
            rank: 'EXPERT',
            icon: '💎',
            portrait: '🔮',
            avgTime: 15000, // 15 seconds - Sub-15, expert level
            variance: 0.15,
            color: '#E5E4E2',
            unlocked: false,
            description: 'Sub-15のエキスパート',
            bio: '国際大会に出場できるレベル。完璧なフィンガートリックを持つ。',
            personality: 'プロフェッショナル',
            difficulty: '★★★★★★★☆☆☆',
            winQuote: '君にはまだ早い。',
            loseQuote: '...認めよう、君の才能を。'
        },
        master: {
            id: 'master',
            name: 'MASTER',
            displayName: 'マスター',
            rank: 'MASTER',
            icon: '⭐',
            portrait: '👑',
            avgTime: 12000, // 12 seconds - Sub-12, master level
            variance: 0.12,
            color: '#FF1493',
            unlocked: false,
            description: 'Sub-12の達人',
            bio: '国内トップレベルの実力者。驚異的な先読み能力と手の速さを持つ。',
            personality: '圧倒的 / カリスマ',
            difficulty: '★★★★★★★★☆☆',
            winQuote: '挑戦は評価する。',
            loseQuote: 'まさか...敗北とは...'
        },
        champion: {
            id: 'champion',
            name: 'CHAMPION',
            displayName: 'チャンピオン',
            rank: 'CHAMPION',
            icon: '🏆',
            portrait: '🌟',
            avgTime: 9000, // 9 seconds - Sub-10, world class
            variance: 0.10,
            color: '#9400D3',
            unlocked: false,
            description: 'Sub-10の世界クラス',
            bio: '世界大会の常連。その速さは人間離れしている。',
            personality: '絶対王者',
            difficulty: '★★★★★★★★★☆',
            winQuote: '王座は譲らない。',
            loseQuote: '...君は、新たな時代を作る者だ。'
        },
        legend: {
            id: 'legend',
            name: 'LEGEND',
            displayName: 'レジェンド',
            rank: 'LEGEND',
            icon: '👑',
            portrait: '💫',
            avgTime: 6000, // 6 seconds - World record territory
            variance: 0.08,
            color: '#FF4500',
            unlocked: false,
            description: '世界記録レベルの伝説',
            bio: '世界記録に迫る速度。人類の限界に到達した存在。この者に勝てば、君も伝説となる。',
            personality: '超越者 / 神速',
            difficulty: '★★★★★★★★★★',
            winQuote: '...不可能を可能にしたか。',
            loseQuote: '...君こそが、新たな伝説だ。'
        }
    },

    // Unlock status for each difficulty
    unlocked: {
        beginner: true,     // Always unlocked
        novice: false,
        amateur: false,
        intermediate: false,
        skilled: false,
        advanced: false,
        expert: false,
        master: false,
        champion: false,
        legend: false
    },

    /**
     * 初期化
     */
    async init() {
        console.log('🚀 BattleMode.init() called');

        // Load stats
        this.loadStats();

        // Load unlock status
        this.loadUnlockStatus();

        // Setup event listeners
        console.log('🎧 Setting up event listeners...');
        this.setupEventListeners();
        console.log('✅ Event listeners set up');

        // Initialize BattleTimer
        if (window.BattleTimer) {
            window.BattleTimer.init();
        }

        console.log('✅ BattleMode initialized');
    },

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        console.log('🎧 setupEventListeners called');

        // Opponent selection
        document.addEventListener('click', (e) => {
            console.log('👆 Click detected on:', e.target, 'Battle mode active:', this.isActive);

            // Check if clicked on fight button
            const selectBtn = e.target.closest('.btn-select-opponent');
            if (selectBtn) {
                console.log('🎯 Fight button clicked!', selectBtn);
                const difficulty = selectBtn.dataset.difficulty;
                console.log('📊 Difficulty:', difficulty, 'Disabled:', selectBtn.disabled);
                if (difficulty && !selectBtn.disabled) {
                    console.log('✅ Calling selectOpponent:', difficulty);
                    this.selectOpponent(difficulty);
                }
                return;
            }

            // Check if clicked on opponent card (anywhere)
            const opponentCard = e.target.closest('.opponent-card');
            if (opponentCard && !opponentCard.classList.contains('locked')) {
                console.log('🎯 Opponent card clicked!', opponentCard);
                // Find the button inside the card
                const btn = opponentCard.querySelector('.btn-select-opponent');
                if (btn && !btn.disabled) {
                    const difficulty = btn.dataset.difficulty;
                    console.log('📊 Difficulty from card:', difficulty);
                    if (difficulty) {
                        console.log('✅ Calling selectOpponent from card:', difficulty);
                        this.selectOpponent(difficulty);
                    }
                }
                return;
            }

            // Menu button from opponent select
            if (e.target.id === 'btn-menu-from-select' || e.target.closest('#btn-menu-from-select')) {
                console.log('🏠 Menu button clicked - returning to title');
                this.deactivate();
                if (window.TitleScreen) {
                    window.TitleScreen.returnToTitle();
                }
            }

            // View my stats button
            if (e.target.id === 'btn-view-my-stats' || e.target.closest('#btn-view-my-stats')) {
                this.showMyStatsModal();
            }

            // Opponent info button
            if (e.target.classList.contains('btn-opponent-info') || e.target.closest('.btn-opponent-info')) {
                const btn = e.target.classList.contains('btn-opponent-info') ? e.target : e.target.closest('.btn-opponent-info');
                const difficulty = btn.dataset.difficulty;
                this.showOpponentInfoModal(difficulty);
            }

            // Close modals - only on background click, not content
            if (e.target.id === 'btn-close-stats-modal') {
                this.closeMyStatsModal();
            }
            if (e.target.id === 'battle-stats-modal' && e.target.classList.contains('battle-modal')) {
                this.closeMyStatsModal();
            }

            if (e.target.id === 'btn-close-info-modal') {
                this.closeOpponentInfoModal();
            }
            if (e.target.id === 'battle-info-modal' && e.target.classList.contains('battle-modal')) {
                this.closeOpponentInfoModal();
            }

            if (e.target.id === 'btn-close-records-modal') {
                this.closeViewRecordsModal();
            }
            if (e.target.id === 'battle-records-modal' && e.target.classList.contains('battle-modal')) {
                this.closeViewRecordsModal();
            }

            // Back button (from ready screen)
            if (e.target.id === 'btn-battle-back') {
                this.showOpponentSelect();
            }

            // Change opponent button (from ready screen)
            if (e.target.id === 'btn-change-opponent-ready') {
                this.showOpponentSelect();
            }

            // Give up button
            if (e.target.id === 'btn-give-up') {
                this.showGiveUpConfirmation();
            }

            // Give up confirmation
            if (e.target.id === 'btn-confirm-give-up') {
                this.confirmGiveUp();
            }

            if (e.target.id === 'btn-cancel-give-up' || e.target.id === 'battle-give-up-modal') {
                this.closeGiveUpConfirmation();
            }

            // Result buttons
            if (e.target.id === 'btn-rematch' || e.target.closest('#btn-rematch')) {
                document.getElementById('battle-result-modal')?.remove();
                this.resetRaceDisplays();
                this.raceState = 'ready';

                // Generate new scramble
                if (window.loadNewScramble) {
                    window.loadNewScramble();
                }

                // Update displays
                this.setupRaceScreen();

                // Generate new scramble
                this.generateNewScramble();
            }

            if (e.target.id === 'btn-next-level' || e.target.closest('#btn-next-level')) {
                document.getElementById('battle-result-modal')?.remove();
                const nextDifficulty = this.getNextUnlockedDifficulty();
                if (nextDifficulty) {
                    this.selectOpponent(nextDifficulty);
                }
            }

            if (e.target.id === 'btn-change-opponent' || e.target.closest('#btn-change-opponent')) {
                document.getElementById('battle-result-modal')?.remove();
                this.showOpponentSelect();
            }

            if (e.target.id === 'btn-view-records' || e.target.closest('#btn-view-records')) {
                this.showViewRecordsModal();
            }

            if (e.target.id === 'btn-exit-battle' || e.target.closest('#btn-exit-battle')) {
                document.getElementById('battle-result-modal')?.remove();
                this.deactivate();
                if (window.TitleScreen) {
                    window.TitleScreen.show();
                }
            }

            // Back to menu button
            if (e.target.id === 'btn-back-to-menu') {
                this.deactivate();
                if (window.TitleScreen) {
                    window.TitleScreen.show();
                }
            }

            // Battle settings button
            if (e.target.id === 'btn-battle-settings') {
                // Open the main settings modal from app.js
                if (window.App && window.App.openSettings) {
                    window.App.openSettings();
                }
            }

            // New scramble button
            if (e.target.id === 'btn-battle-new-scramble' || e.target.closest('#btn-battle-new-scramble')) {
                this.generateNewScramble();
            }

            // Show scramble steps modal
            if (e.target.id === 'btn-show-scramble-steps' || e.target.closest('#btn-show-scramble-steps')) {
                console.log('🎬 STEPS button clicked!');
                this.showScrambleStepsModal();
            }

            // Close scramble modal
            if (e.target.id === 'btn-close-scramble-modal' || e.target.closest('#btn-close-scramble-modal')) {
                this.closeScrambleStepsModal();
            }

            // Close modal on overlay click
            if (e.target.id === 'battle-scramble-modal' && e.target === e.currentTarget) {
                this.closeScrambleStepsModal();
            }

            // Scramble playback controls
            if (e.target.id === 'battle-scramble-play' || e.target.closest('#battle-scramble-play')) {
                this.toggleScramblePlayback();
            }
            if (e.target.id === 'battle-scramble-prev' || e.target.closest('#battle-scramble-prev')) {
                this.scramblePrevMove();
            }
            if (e.target.id === 'battle-scramble-next' || e.target.closest('#battle-scramble-next')) {
                this.scrambleNextMove();
            }
            if (e.target.id === 'battle-scramble-restart') {
                this.scrambleRestart();
            }
            if (e.target.id === 'battle-scramble-end') {
                this.scrambleEnd();
            }
        });

        // Note: SPACE key handling is now managed by BattleTimer.js
    },

    /**
     * バトルモード切り替え
     */
    toggle() {
        if (this.isActive) {
            this.deactivate();
            if (window.TitleScreen) {
                window.TitleScreen.show();
            }
        } else {
            this.activate();
        }
    },

    /**
     * バトルモード起動
     */
    activate() {
        // Stop normal mode components before activating battle mode
        if (window.Timer && typeof window.Timer.reset === 'function') {
            window.Timer.reset();
        } else if (window.Timer) {
            // Fallback: clear intervals if reset is not available
            window.Timer.state = 'idle';
            if (window.Timer.timerInterval) {
                clearInterval(window.Timer.timerInterval);
                window.Timer.timerInterval = null;
            }
            if (window.Timer.inspectionInterval) {
                clearInterval(window.Timer.inspectionInterval);
                window.Timer.inspectionInterval = null;
            }
        }

        // Stop Camera
        if (window.Camera) {
            window.Camera.stopCamera();
        }

        // Stop normal cube visualizer
        if (window.CubeVisualizer) {
            // Stop any ongoing animations
            if (window.CubeVisualizer.isAnimating) {
                window.CubeVisualizer.isAnimating = false;
            }
        }

        this.isActive = true;

        // Show battle container
        const container = document.getElementById('battle-mode-container');
        if (container) {
            container.classList.add('active');
        }

        // Hide normal mode
        const normalMode = document.getElementById('normal-mode-container');
        if (normalMode) {
            normalMode.classList.remove('active');
        }

        // Show opponent selection
        this.showOpponentSelect();
    },

    /**
     * バトルモード終了
     */
    deactivate() {
        this.isActive = false;

        // Reset BattleTimer completely
        if (window.BattleTimer) {
            window.BattleTimer.reset();
        }

        // Stop and destroy CPU cube visualizer
        if (window.BattleCubeVisualizer) {
            window.BattleCubeVisualizer.destroy();
        }

        // Stop Camera
        if (window.Camera) {
            window.Camera.stopCamera();
        }

        // Stop CPU
        this.stopCPU();

        // Cleanup intervals
        this.cleanup();

        // Hide battle container
        const container = document.getElementById('battle-mode-container');
        if (container) {
            container.classList.remove('active');
        }

        // Show normal mode
        const normalMode = document.getElementById('normal-mode-container');
        if (normalMode) {
            normalMode.classList.add('active');
        }

        // Reset all state variables
        this.raceState = 'idle';
        this.currentOpponent = null;
        this.currentScramble = '';
        this.playerFinishTime = null;
        this.cpuFinishTime = null;
        this.cpuTargetTime = 0;
        this.cpuStartTime = null;
        this.playerPenalty = 0;
        this.playerDNF = false;
    },

    /**
     * 対戦相手選択画面表示
     */
    showOpponentSelect() {
        const selectScreen = document.getElementById('battle-opponent-select');
        const raceScreen = document.getElementById('battle-race-screen');

        if (!selectScreen || !raceScreen) {
            return;
        }

        selectScreen.classList.add('active');
        raceScreen.classList.remove('active');

        // Calculate total stats
        const totalStats = Object.values(this.stats).reduce((acc, stat) => {
            acc.wins += stat.wins;
            acc.losses += stat.losses;
            return acc;
        }, {wins: 0, losses: 0});
        const totalMatches = totalStats.wins + totalStats.losses;
        const overallWinRate = totalMatches > 0 ? Math.round((totalStats.wins / totalMatches) * 100) : 0;

        // Generate opponent cards HTML
        const html = `
            <div class="opponent-select-header">
                <button id="btn-menu-from-select" class="btn-menu">
                    <span class="btn-icon">◄</span> MENU
                </button>
                <h2 class="battle-title">⚔️ CPU BATTLE</h2>
                <button id="btn-view-my-stats" class="btn-my-stats">
                    <span class="btn-icon">📊</span> MY STATS
                </button>
            </div>

            <h3 class="battle-subtitle">対戦相手を選んでください</h3>

            <div class="opponent-grid">
                ${Object.values(this.opponents).map(opp => {
                    const stats = this.stats[opp.id];
                    const totalRaces = stats.wins + stats.losses;
                    const winRate = totalRaces > 0 ? Math.round((stats.wins / totalRaces) * 100) : 0;
                    const isLocked = !this.unlocked[opp.id];

                    return `
                        <div class="opponent-card ${isLocked ? 'locked' : ''}" style="--opponent-color: ${opp.color}">
                            <div class="opponent-portrait">
                                <div class="portrait-icon">${opp.portrait || opp.icon}</div>
                                <div class="portrait-rank">${opp.rank}</div>
                            </div>
                            <div class="opponent-info">
                                <div class="opponent-name-row">
                                    <span class="opponent-rank-main">${opp.rank}</span>
                                    <span class="opponent-name-sub">${opp.name}</span>
                                </div>
                                <div class="opponent-desc">${opp.description}</div>
                                <div class="opponent-difficulty">${opp.difficulty}</div>
                            </div>
                            <div class="opponent-stats-column">
                                <div class="stat-row">
                                    <span class="stat-label-small">⏱️ AVG TIME</span>
                                    <span class="opponent-time">${this.formatTime(opp.avgTime)}</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label-small">🏆 YOUR RECORD</span>
                                    <span class="record-text">${stats.wins}W ${stats.losses}L (${winRate}%)</span>
                                </div>
                            </div>
                            <button class="btn-select-opponent" data-difficulty="${opp.id}" ${isLocked ? 'disabled' : ''}>
                                ${isLocked ? '🔒 LOCKED' : 'FIGHT'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        selectScreen.innerHTML = html;
    },

    /**
     * 対戦相手選択
     */
    async selectOpponent(difficulty) {
        console.log('🎮 selectOpponent called with difficulty:', difficulty);
        this.currentOpponent = this.opponents[difficulty];
        console.log('👤 Current opponent:', this.currentOpponent);

        if (!this.currentOpponent) {
            console.error('❌ Opponent not found for difficulty:', difficulty);
            return;
        }

        console.log('🔄 Generating scramble...');
        // Generate scramble before showing race screen
        if (typeof loadNewScramble === 'function') {
            await loadNewScramble();
        } else {
            console.warn('⚠️ loadNewScramble function not found');
        }

        // Hide opponent select, show race screen
        const selectScreen = document.getElementById('battle-opponent-select');
        const raceScreen = document.getElementById('battle-race-screen');

        console.log('🖼️ Select screen:', selectScreen);
        console.log('🖼️ Race screen:', raceScreen);

        if (selectScreen) selectScreen.classList.remove('active');
        if (raceScreen) raceScreen.classList.add('active');

        console.log('⚙️ Setting up race screen...');
        // Setup race screen
        this.setupRaceScreen();
        this.raceState = 'ready';
        console.log('✅ Race screen ready!');
    },

    /**
     * レース画面セットアップ
     */
    async setupRaceScreen() {
        const opponent = this.currentOpponent;

        // Update opponent info
        const cpuIconDisplay = document.getElementById('cpu-icon-display');
        const cpuRankDisplay = document.getElementById('cpu-rank-display');
        const cpuRankLabel = document.getElementById('cpu-rank-label');
        const topOpponentName = document.getElementById('top-opponent-name');
        const topCpuName = document.getElementById('top-cpu-name');

        if (cpuIconDisplay) cpuIconDisplay.textContent = opponent.portrait || opponent.icon;
        if (cpuRankDisplay) cpuRankDisplay.textContent = opponent.rank;
        if (cpuRankLabel) cpuRankLabel.textContent = opponent.rank;
        if (topOpponentName) topOpponentName.textContent = opponent.rank;
        if (topCpuName) topCpuName.textContent = 'CPU';

        // Update scramble display
        const scrambleText = document.getElementById('battle-scramble-text');
        if (scrambleText && window.App?.currentScramble) {
            scrambleText.textContent = window.App.currentScramble;
        }

        // Initialize 3D cube visualizer
        const cubeContainer = document.getElementById('cpu-cube-3d');
        if (window.BattleCubeVisualizer && cubeContainer) {
            // Check if already initialized properly
            const needsInit = !window.BattleCubeVisualizer.renderer ||
                            !window.BattleCubeVisualizer.scene ||
                            !window.BattleCubeVisualizer.cube;

            if (needsInit) {
                // Destroy old instance if exists
                if (window.BattleCubeVisualizer.renderer) {
                    window.BattleCubeVisualizer.destroy();
                }

                // Initialize fresh
                window.BattleCubeVisualizer.init('cpu-cube-3d');
            }
        }

        // Apply scramble to CPU cube (reset first to avoid breaking)
        if (window.BattleCubeVisualizer && window.App?.currentScramble) {
            window.BattleCubeVisualizer.reset();
            await window.BattleCubeVisualizer.applyScramble(window.App.currentScramble);
        }

        // Start camera for battle mode
        if (window.Camera && !window.Camera.isCameraOn) {
            const battleCameraVideo = document.getElementById('battle-camera-preview');
            if (battleCameraVideo) {
                window.Camera.startCamera('battle-camera-preview');
            }
        }

        // Update stats
        const stats = this.stats[opponent.id];
        const playerWins = document.getElementById('player-wins');
        const playerLosses = document.getElementById('player-losses');

        if (playerWins) playerWins.textContent = stats.wins;
        if (playerLosses) playerLosses.textContent = stats.losses;

        // Reset displays
        this.resetRaceDisplays();

        // Reset BattleTimer and setup callbacks
        if (window.BattleTimer) {
            window.BattleTimer.reset();
            window.BattleTimer.state = 'idle';

            // Setup callbacks
            window.BattleTimer.onStateChange = (state, data) => {
                this.handleBattleTimerStateChange(state, data);
            };

            window.BattleTimer.onInspectionUpdate = (data) => {
                const timerInstruction = document.getElementById('battle-timer-instruction');
                const battleStatusText = document.getElementById('battle-status-text');
                const inspectionOverlay = document.getElementById('battle-inspection-overlay');
                const inspectionTimer = document.getElementById('battle-inspection-timer');

                const remaining = Math.ceil(data.remaining);
                const penaltyText = data.penalty > 0 ? ' (+2)' : '';

                if (timerInstruction) {
                    timerInstruction.innerHTML = `<span class="pulse-text">INSPECTION: ${remaining}s${penaltyText}</span>`;
                }

                if (battleStatusText) {
                    battleStatusText.textContent = 'Inspecting';
                }

                // Show inspection overlay on camera
                if (inspectionOverlay) {
                    inspectionOverlay.classList.add('active');
                }

                if (inspectionTimer) {
                    inspectionTimer.textContent = remaining;
                    // Add warning class if time is low
                    if (remaining <= 3) {
                        inspectionTimer.classList.add('warning');
                    } else {
                        inspectionTimer.classList.remove('warning');
                    }
                }
            };

            window.BattleTimer.onSolveUpdate = (data) => {
                const battleTimerValue = document.getElementById('battle-timer-value');
                const playerTimeDisplay = document.getElementById('player-time-display');

                const formattedTime = window.BattleTimer.formatTime(data.elapsed);

                if (battleTimerValue) {
                    battleTimerValue.textContent = formattedTime;
                }

                if (playerTimeDisplay) {
                    playerTimeDisplay.textContent = formattedTime;
                }
            };

            window.BattleTimer.onFinish = (result) => {
                this.handlePlayerFinish(result);
            };
        }

        // Update status message
        const timerInstruction = document.getElementById('battle-timer-instruction');
        const battleStatusText = document.getElementById('battle-status-text');

        if (timerInstruction) {
            timerInstruction.innerHTML = '<span class="pulse-text">PRESS SPACE</span>';
        }

        if (battleStatusText) {
            battleStatusText.textContent = 'Ready';
        }
    },

    /**
     * BattleTimer状態変更ハンドラー
     */
    handleBattleTimerStateChange(state, data) {
        const timerInstruction = document.getElementById('battle-timer-instruction');
        const battleStatusText = document.getElementById('battle-status-text');
        const giveUpBtn = document.getElementById('btn-give-up');
        const backBtn = document.getElementById('btn-battle-back');
        const changeOpponentBtn = document.getElementById('btn-change-opponent-ready');
        const inspectionOverlay = document.getElementById('battle-inspection-overlay');

        switch (state) {
            case 'inspection':
                // Handled by onInspectionUpdate callback
                // Hide back/change buttons, show give up
                if (backBtn) backBtn.style.display = 'none';
                if (changeOpponentBtn) changeOpponentBtn.style.display = 'none';
                if (giveUpBtn) giveUpBtn.style.display = 'inline-block';
                break;

            case 'ready':
                if (timerInstruction) {
                    const penaltyText = data.penalty > 0 ? ' (+2)' : '';
                    timerInstruction.innerHTML = `<span class="pulse-text">HOLD SPACE${penaltyText}</span>`;
                }
                if (battleStatusText) {
                    battleStatusText.textContent = 'Ready';
                }
                // Hide inspection overlay
                if (inspectionOverlay) {
                    inspectionOverlay.classList.remove('active');
                }
                break;

            case 'solving':
                if (timerInstruction) {
                    timerInstruction.innerHTML = '<span class="pulse-text">SOLVING...</span>';
                }
                if (battleStatusText) {
                    battleStatusText.textContent = 'Racing';
                }
                // Keep give up button visible during solving
                if (giveUpBtn) giveUpBtn.style.display = 'inline-block';
                // Hide inspection overlay
                if (inspectionOverlay) {
                    inspectionOverlay.classList.remove('active');
                }
                // Esports start cue and particles
                if (window.RaceAnimation) {
                    window.RaceAnimation.showStartFlash();
                    window.RaceAnimation.startRaceParticles();
                }
                // Start CPU
                this.startCPU();
                break;
        }
    },

    /**
     * プレイヤー完了ハンドラー
     */
    handlePlayerFinish(result) {
        this.playerFinishTime = result.time;

        const playerTime = document.getElementById('player-time-display');
        const statusMessage = document.getElementById('battle-status-message');

        if (result.isDNF) {
            if (playerTime) playerTime.textContent = 'DNF';
            if (statusMessage) {
                statusMessage.textContent = 'DNF - INSPECTION TIME EXCEEDED';
                statusMessage.style.color = '#ff073a';
            }
        } else {
            if (playerTime) {
                const penaltyText = result.penalty > 0 ? ' (+2)' : '';
                playerTime.textContent = window.BattleTimer.formatTime(result.time) + penaltyText;
            }
            if (statusMessage) {
                statusMessage.textContent = 'WAITING FOR CPU...';
                statusMessage.style.color = '#ffed4e';
            }
        }

        // Check if CPU already finished
        if (this.cpuFinishTime) {
            this.showResults();
        }
    },

    /**
     * レース表示リセット
     */
    resetRaceDisplays() {
        // Reset time displays
        const playerTime = document.getElementById('player-time-display');
        const cpuTime = document.getElementById('cpu-time-display');
        const inspectionOverlay = document.getElementById('battle-inspection-overlay');

        if (playerTime) playerTime.textContent = '0.000';
        if (cpuTime) cpuTime.textContent = '0.000';

        // Hide inspection overlay
        if (inspectionOverlay) {
            inspectionOverlay.classList.remove('active');
        }
    },

    /**
     * インスペクション開始（WCA規則準拠）
     */
    startInspection() {
        // Legacy path disabled: handled by BattleTimer
        return;
        this.raceState = 'inspection';
        this.inspectionStartTime = performance.now();
        this.playerPenalty = 0;
        this.playerDNF = false;

        // Update status
        const statusMessage = document.getElementById('battle-status-message');
        if (statusMessage) {
            statusMessage.textContent = 'INSPECTION: 15s';
        }

        // インスペクションタイマー更新
        this.inspectionInterval = setInterval(() => {
            this.updateInspection();
        }, 100);
    },

    /**
     * インスペクション時間更新
     */
    updateInspection() {
        // Legacy path disabled: handled by BattleTimer
        return;
        const elapsed = performance.now() - this.inspectionStartTime;
        const remaining = Math.max(0, (this.inspectionTimeLimit - elapsed) / 1000);

        const statusMessage = document.getElementById('battle-status-message');

        // 17秒超過 → DNF
        if (elapsed >= this.inspectionWarningTime) {
            this.playerDNF = true;
            if (statusMessage) {
                statusMessage.textContent = 'DNF - 17秒超過！';
            }
            this.stopInspection();
            // DNFとして処理
            this.onPlayerFinish(Infinity);
            return;
        }
        // 15秒超過 → +2秒ペナルティ
        else if (elapsed >= this.inspectionTimeLimit) {
            this.playerPenalty = 2000; // +2秒
            if (statusMessage) {
                statusMessage.textContent = `+2 PENALTY - 残り ${(17 - elapsed / 1000).toFixed(1)}s`;
                statusMessage.style.color = '#ff4444';
            }
        }
        // 正常範囲
        else {
            if (statusMessage) {
                statusMessage.textContent = `INSPECTION: ${remaining.toFixed(1)}s`;
                statusMessage.style.color = remaining < 5 ? '#ffaa00' : '#ffffff';
            }
        }
    },

    /**
     * インスペクション停止
     */
    stopInspection() {
        // Legacy path disabled: handled by BattleTimer
        return;
        if (this.inspectionInterval) {
            clearInterval(this.inspectionInterval);
            this.inspectionInterval = null;
        }
    },

    /**
     * インスペクションからレース開始
     */
    startRaceFromInspection() {
        // Legacy path disabled: handled by BattleTimer
        return;
        // インスペクション停止
        this.stopInspection();

        // DNFの場合は開始しない
        if (this.playerDNF) {
            return;
        }

        this.raceState = 'racing';
        this.playerStartTime = null;
        this.playerFinishTime = null;

        // Update status
        const statusMessage = document.getElementById('battle-status-message');
        if (statusMessage) {
            statusMessage.textContent = this.playerPenalty > 0 ? 'SOLVING... (+2 PENALTY)' : 'SOLVING...';
            statusMessage.style.color = '#ffffff';
        }

        // Start CPU
        this.startCPU();
    },

    /**
     * CPU開始
     */
    startCPU() {
        const opponent = this.currentOpponent;

        // Generate target time (average ± variance)
        const variance = opponent.variance;
        const randomFactor = 1 + (Math.random() - 0.5) * 2 * variance;
        this.cpuTargetTime = opponent.avgTime * randomFactor;

        this.cpuStartTime = performance.now();
        this.cpuFinishTime = null;

        // Start human-like solving animation with difficulty
        if (window.BattleCubeVisualizer && window.App?.currentScramble) {
            const difficulty = this.currentOpponent ? this.currentOpponent.id : 'beginner';

            // Set callback for when solving is complete
            window.BattleCubeVisualizer.onSolveComplete = () => {
                this.onCPUFinish();
            };

            window.BattleCubeVisualizer.simulateHumanSolving(window.App.currentScramble, this.cpuTargetTime, difficulty);
        }

        // Update CPU progress (only display, not completion check)
        this.cpuUpdateInterval = setInterval(() => {
            this.updateCPUProgress();
        }, 10); // Match player timer update rate (10ms)
    },

    /**
     * CPU進捗更新 (表示のみ、完了判定はコールバックで行う)
     */
    updateCPUProgress() {
        if (!this.cpuStartTime) return;

        const elapsed = performance.now() - this.cpuStartTime;

        // Update time display
        const cpuTimeDisplay = document.getElementById('cpu-time-display');
        if (cpuTimeDisplay) cpuTimeDisplay.textContent = this.formatTime(elapsed);
    },

    /**
     * CPU完了
     */
    onCPUFinish() {
        this.stopCPU();
        this.cpuFinishTime = this.cpuTargetTime;

        // Update final time
        const cpuTimeDisplay = document.getElementById('cpu-time-display');
        if (cpuTimeDisplay) cpuTimeDisplay.textContent = this.formatTime(this.cpuTargetTime);

        // Check if player already finished
        if (this.playerFinishTime) {
            this.showResults();
        }
    },

    /**
     * プレイヤー完了
     */
    onPlayerFinish(time) {
        // Legacy path disabled: replaced by handlePlayerFinish
        return;
        // ペナルティを加算
        const finalTime = this.playerDNF ? Infinity : time + this.playerPenalty;
        this.playerFinishTime = finalTime;

        // Update player time display
        const playerTime = document.getElementById('player-time-display');
        if (playerTime) {
            if (this.playerDNF) {
                playerTime.textContent = 'DNF';
            } else if (this.playerPenalty > 0) {
                playerTime.textContent = `${this.formatTime(finalTime)} (+2)`;
            } else {
                playerTime.textContent = this.formatTime(finalTime);
            }
        }

        // Check if CPU already finished
        if (this.cpuFinishTime) {
            this.showResults();
        }
    },

    /**
     * CPU停止
     */
    stopCPU() {
        if (this.cpuUpdateInterval) {
            clearInterval(this.cpuUpdateInterval);
            this.cpuUpdateInterval = null;
        }
    },

    /**
     * クリーンアップ
     */
    cleanup() {
        if (this.cpuUpdateInterval) {
            clearInterval(this.cpuUpdateInterval);
            this.cpuUpdateInterval = null;
        }
    },

    /**
     * 結果表示
     */
    showResults() {
        const playerTime = this.playerFinishTime;
        const cpuTime = this.cpuFinishTime;
        const won = playerTime < cpuTime;
        const diff = Math.abs(playerTime - cpuTime);

        // Stop particles and animate winner
        if (window.RaceAnimation) {
            window.RaceAnimation.stopRaceParticles();
            window.RaceAnimation.animateWinner(won);
        }

        // Update stats
        const stats = this.stats[this.currentOpponent.id];
        if (won) {
            stats.wins++;
        } else {
            stats.losses++;
        }
        this.saveStats();

        // Check for unlock when player wins
        let unlockMessage = '';
        let nextLevelButton = '';
        if (won && this.currentOpponent) {
            const unlocked = this.unlockNextDifficulty(this.currentOpponent.id);
            if (unlocked) {
                unlockMessage = `<div class="unlock-notification">🔓 ${this.opponents[unlocked].name} UNLOCKED!</div>`;
                nextLevelButton = `<button id="btn-next-level" class="btn-result-action primary next-level">
                    <span class="btn-icon">⭐</span>
                    <span class="btn-text">NEXT</span>
                </button>`;
            }
        }

        // プレイヤーの表示タイム（DNFやペナルティを含む）
        let playerTimeDisplay;
        if (this.playerDNF || playerTime === Infinity) {
            playerTimeDisplay = 'DNF';
        } else if (this.playerPenalty > 0) {
            playerTimeDisplay = `${this.formatTime(playerTime)} (+2)`;
        } else {
            playerTimeDisplay = this.formatTime(playerTime);
        }

        // Show result modal
        const resultHTML = `
            <div id="battle-result-modal" class="battle-modal active">
                <div class="battle-modal-content result-modal-content">
                    <div class="results-icon ${won ? 'win' : 'lose'}">
                        ${won ? '🏆' : '😢'}
                    </div>
                    <h2 class="results-title">${won ? 'YOU WIN!' : 'YOU LOSE'}</h2>
                    ${unlockMessage}

                    <div class="results-times">
                        <div class="result-time">
                            <span class="result-label">あなた</span>
                            <span class="result-value">${playerTimeDisplay}</span>
                        </div>
                        <div class="result-time">
                            <span class="result-label">${this.currentOpponent.displayName || this.currentOpponent.name}</span>
                            <span class="result-value">${this.formatTime(cpuTime)}</span>
                        </div>
                        <div class="result-diff">
                            ${playerTime !== Infinity ? `差: ${this.formatTime(diff)}` : 'DNF'}
                        </div>
                    </div>

                    <div class="results-stats">
                        通算成績: ${stats.wins}勝 ${stats.losses}敗
                    </div>

                    <div class="results-actions">
                        <button id="btn-rematch" class="btn-result-action primary">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">REMATCH</span>
                        </button>
                        ${nextLevelButton}
                        <button id="btn-view-records" class="btn-result-action">
                            <span class="btn-icon">📋</span>
                            <span class="btn-text">RECORDS</span>
                        </button>
                        <button id="btn-change-opponent" class="btn-result-action">
                            <span class="btn-icon">👥</span>
                            <span class="btn-text">CHANGE</span>
                        </button>
                        <button id="btn-exit-battle" class="btn-result-action secondary">
                            <span class="btn-icon">🏠</span>
                            <span class="btn-text">MENU</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', resultHTML);

        this.raceState = 'finished';
    },

    /**
     * 統計読み込み
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('battleModeStats');
            if (saved) {
                const loadedStats = JSON.parse(saved);

                // Migration: Convert old 5-level system to new 10-level system
                const oldKeys = ['bronze', 'silver', 'gold', 'platinum', 'legend'];
                const hasOldFormat = oldKeys.some(key => key in loadedStats);

                if (hasOldFormat) {
                    // Migrate old stats - keep only what matches new levels
                    // Legend stays as legend, others are reset
                    this.stats = {
                        beginner: { wins: 0, losses: 0 },
                        novice: { wins: 0, losses: 0 },
                        amateur: { wins: 0, losses: 0 },
                        intermediate: { wins: 0, losses: 0 },
                        skilled: { wins: 0, losses: 0 },
                        advanced: { wins: 0, losses: 0 },
                        expert: { wins: 0, losses: 0 },
                        master: { wins: 0, losses: 0 },
                        champion: { wins: 0, losses: 0 },
                        legend: loadedStats.legend || { wins: 0, losses: 0 }
                    };
                    this.saveStats(); // Save migrated stats
                } else {
                    // New format, just load it
                    this.stats = loadedStats;
                }
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    },

    /**
     * 統計保存
     */
    saveStats() {
        try {
            localStorage.setItem('battleModeStats', JSON.stringify(this.stats));
        } catch (e) {
            // Error handling
        }
    },

    /**
     * アンロック状態読み込み
     */
    loadUnlockStatus() {
        const saved = localStorage.getItem('battle_unlocked');
        if (saved) {
            try {
                const loadedUnlocked = JSON.parse(saved);

                // Migration: Convert old 5-level system to new 10-level system
                const oldKeys = ['bronze', 'silver', 'gold', 'platinum', 'legend'];
                const hasOldFormat = oldKeys.some(key => key in loadedUnlocked);

                if (hasOldFormat) {
                    // Migrate - if they had any level unlocked, unlock beginner
                    // Keep legend unlock status if they had it
                    this.unlocked = {
                        beginner: true,
                        novice: false,
                        amateur: false,
                        intermediate: false,
                        skilled: false,
                        advanced: false,
                        expert: false,
                        master: false,
                        champion: false,
                        legend: loadedUnlocked.legend || false
                    };
                    this.saveUnlockStatus(); // Save migrated unlock status
                } else {
                    // New format, just load it
                    this.unlocked = loadedUnlocked;
                }
            } catch (e) {
                console.error('Error loading unlock status:', e);
            }
        }
    },

    /**
     * アンロック状態保存
     */
    saveUnlockStatus() {
        localStorage.setItem('battle_unlocked', JSON.stringify(this.unlocked));
    },

    /**
     * 次の難易度をアンロック
     */
    unlockNextDifficulty(currentDifficulty) {
        const order = ['beginner', 'novice', 'amateur', 'intermediate', 'skilled', 'advanced', 'expert', 'master', 'champion', 'legend'];
        const currentIndex = order.indexOf(currentDifficulty);

        if (currentIndex >= 0 && currentIndex < order.length - 1) {
            const nextDifficulty = order[currentIndex + 1];
            this.unlocked[nextDifficulty] = true;
            this.saveUnlockStatus();
            return nextDifficulty;
        }
        return null;
    },

    /**
     * 新しいスクランブル生成
     */
    async generateNewScramble() {
        try {
            // Use global loadNewScramble function
            if (typeof loadNewScramble === 'function') {
                await loadNewScramble();

                const scrambleText = document.getElementById('battle-scramble-text');
                if (scrambleText && window.App && window.App.currentScramble) {
                    scrambleText.textContent = window.App.currentScramble;
                }

                // Apply scramble to 3D cube
                if (window.BattleCubeVisualizer && window.App && window.App.currentScramble) {
                    await window.BattleCubeVisualizer.reset();
                    await window.BattleCubeVisualizer.applyScramble(window.App.currentScramble);
                }
            }
        } catch (error) {
            // Error handling
        }
    },

    /**
     * 時間フォーマット
     */
    formatTime(ms) {
        if (window.TimeUtil && TimeUtil.isDNF(ms)) return 'DNF';
        return window.TimeUtil ? TimeUtil.formatTime(ms) : (ms / 1000).toFixed(3);
    },

    /**
     * スクランブル手順モーダル表示
     */
    async showScrambleStepsModal() {
        console.log('📺 showScrambleStepsModal called');
        const modal = document.getElementById('battle-scramble-modal');
        if (!modal) {
            console.error('❌ Modal not found');
            return;
        }

        modal.classList.add('active');
        console.log('✅ Modal activated');

        // Create a container div for the cube if not exists
        const modalContainer = document.getElementById('battle-scramble-3d');
        if (!modalContainer) {
            console.error('❌ Modal container not found');
            return;
        }

        // Clear and prepare container
        modalContainer.innerHTML = '<div id="battle-scramble-cube-3d" style="width: 100%; height: 100%;"></div>';

        // Wait for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));

        // Use the normal mode CubeVisualizer (not BattleCubeVisualizer)
        if (window.CubeVisualizer && window.App?.currentScramble) {
            try {
                console.log('🎲 Initializing cube visualizer in modal');

                // Initialize CubeVisualizer in the modal container
                const wasInitialized = window.CubeVisualizer.scene !== null;

                // If already initialized elsewhere, destroy it first
                if (wasInitialized) {
                    const renderer = window.CubeVisualizer.renderer;
                    if (renderer && renderer.domElement && renderer.domElement.parentElement) {
                        // Store original parent to restore later
                        this.cubeOriginalParent = renderer.domElement.parentElement;
                    }
                    // Don't destroy, just move
                }

                // Initialize in modal
                window.CubeVisualizer.init('battle-scramble-cube-3d');
                window.CubeVisualizer.resetCube();
                await window.CubeVisualizer.applyScramble(window.App.currentScramble);

                console.log('✅ Scramble applied to modal cube');

                // Store that we're in modal mode
                this.scrambleModalActive = true;
            } catch (error) {
                console.error('❌ Error applying scramble:', error);
            }
        }
    },

    /**
     * スクランブル手順モーダル閉じる
     */
    closeScrambleStepsModal() {
        console.log('🚪 Closing scramble modal');
        const modal = document.getElementById('battle-scramble-modal');
        if (modal) {
            modal.classList.remove('active');
        }

        this.scrambleModalActive = false;

        // Clear the modal container
        const modalContainer = document.getElementById('battle-scramble-3d');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }

        // CubeVisualizer is now hidden (modal container cleared)
        // CPU cube (BattleCubeVisualizer) remains intact in cpu-cube-3d
        console.log('✅ Modal closed, CPU cube still active');
    },

    /**
     * スクランブル再生トグル
     */
    toggleScramblePlayback() {
        if (window.CubeVisualizer && this.scrambleModalActive) {
            window.CubeVisualizer.togglePlay();
        }
    },

    /**
     * スクランブル前の手順
     */
    scramblePrevMove() {
        if (window.CubeVisualizer && this.scrambleModalActive) {
            window.CubeVisualizer.prevMove();
        }
    },

    /**
     * スクランブル次の手順
     */
    scrambleNextMove() {
        if (window.CubeVisualizer && this.scrambleModalActive) {
            window.CubeVisualizer.nextMove();
        }
    },

    /**
     * スクランブル最初に戻す
     */
    scrambleRestart() {
        if (window.CubeVisualizer && this.scrambleModalActive) {
            window.CubeVisualizer.goToStart();
        }
    },

    /**
     * スクランブル最後まで進める
     */
    scrambleEnd() {
        if (window.CubeVisualizer && this.scrambleModalActive) {
            window.CubeVisualizer.goToEnd();
        }
    },

    /**
     * 次のアンロック済み難易度を取得
     */
    getNextUnlockedDifficulty() {
        const order = ['beginner', 'novice', 'amateur', 'intermediate', 'skilled', 'advanced', 'expert', 'master', 'champion', 'legend'];
        const currentIndex = order.indexOf(this.currentOpponent.id);

        if (currentIndex >= 0 && currentIndex < order.length - 1) {
            const nextDifficulty = order[currentIndex + 1];
            if (this.unlocked[nextDifficulty]) {
                return nextDifficulty;
            }
        }
        return null;
    },

    /**
     * 統計モーダル表示
     */
    showMyStatsModal() {
        const totalStats = Object.values(this.stats).reduce((acc, stat) => {
            acc.wins += stat.wins;
            acc.losses += stat.losses;
            return acc;
        }, {wins: 0, losses: 0});
        const totalMatches = totalStats.wins + totalStats.losses;
        const overallWinRate = totalMatches > 0 ? Math.round((totalStats.wins / totalMatches) * 100) : 0;

        const modalHTML = `
            <div id="battle-stats-modal" class="battle-modal active">
                <div class="battle-modal-content">
                    <div class="battle-modal-header">
                        <h3>MY BATTLE STATS</h3>
                        <button id="btn-close-stats-modal" class="btn-close-modal">✕</button>
                    </div>
                    <div class="battle-modal-body">
                        <div class="stats-summary">
                            <div class="stat-card">
                                <div class="stat-label">TOTAL MATCHES</div>
                                <div class="stat-value">${totalMatches}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">WINS</div>
                                <div class="stat-value win">${totalStats.wins}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">LOSSES</div>
                                <div class="stat-value lose">${totalStats.losses}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-label">WIN RATE</div>
                                <div class="stat-value">${overallWinRate}%</div>
                            </div>
                        </div>
                        <div class="stats-by-difficulty">
                            <h4>対戦成績の詳細</h4>
                            ${Object.values(this.opponents).map(opp => {
                                const stats = this.stats[opp.id];
                                const matches = stats.wins + stats.losses;
                                const winRate = matches > 0 ? Math.round((stats.wins / matches) * 100) : 0;
                                return `
                                    <div class="difficulty-stat-row" style="--opponent-color: ${opp.color}">
                                        <span class="difficulty-icon">${opp.icon}</span>
                                        <span class="difficulty-name">${opp.name}</span>
                                        <span class="difficulty-record">${stats.wins}W ${stats.losses}L</span>
                                        <span class="difficulty-winrate">${winRate}%</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * 統計モーダル閉じる
     */
    closeMyStatsModal() {
        const modal = document.getElementById('battle-stats-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * 対戦相手情報モーダル表示
     */
    showOpponentInfoModal(difficulty) {
        const opponent = this.opponents[difficulty];
        const stats = this.stats[difficulty];
        const matches = stats.wins + stats.losses;
        const winRate = matches > 0 ? Math.round((stats.wins / matches) * 100) : 0;

        const modalHTML = `
            <div id="battle-info-modal" class="battle-modal active">
                <div class="battle-modal-content">
                    <div class="battle-modal-header">
                        <h3>CHARACTER INFO</h3>
                        <button id="btn-close-info-modal" class="btn-close-modal">✕</button>
                    </div>
                    <div class="battle-modal-body">
                        <div class="opponent-info-header" style="--opponent-color: ${opponent.color}">
                            <div class="opponent-info-portrait">${opponent.portrait || opponent.icon}</div>
                            <div class="opponent-info-title">
                                <div class="opponent-info-rank">${opponent.rank}</div>
                                <div class="opponent-info-name-en">${opponent.name}</div>
                                <div class="opponent-info-name-jp">${opponent.displayName}</div>
                            </div>
                        </div>
                        <div class="character-bio">
                            <div class="bio-section">
                                <h4 class="bio-title">PROFILE</h4>
                                <p class="bio-text">${opponent.bio}</p>
                            </div>
                            <div class="bio-section">
                                <h4 class="bio-title">PERSONALITY</h4>
                                <p class="bio-text">${opponent.personality}</p>
                            </div>
                            <div class="bio-section">
                                <h4 class="bio-title">DIFFICULTY</h4>
                                <p class="bio-difficulty">${opponent.difficulty}</p>
                            </div>
                        </div>
                        <div class="opponent-info-details">
                            <div class="info-row">
                                <span class="info-label">AVG TIME</span>
                                <span class="info-value">${this.formatTime(opponent.avgTime)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">TIME VARIANCE</span>
                                <span class="info-value">±${Math.round(opponent.variance * 100)}%</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">YOUR RECORD</span>
                                <span class="info-value">${stats.wins}W ${stats.losses}L</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">WIN RATE</span>
                                <span class="info-value ${winRate >= 50 ? 'win' : 'lose'}">${winRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * 対戦相手情報モーダル閉じる
     */
    closeOpponentInfoModal() {
        const modal = document.getElementById('battle-info-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * 対戦記録モーダル表示
     */
    showViewRecordsModal() {
        const modalHTML = `
            <div id="battle-records-modal" class="battle-modal active">
                <div class="battle-modal-content">
                    <div class="battle-modal-header">
                        <h3>📋 対戦記録</h3>
                        <button id="btn-close-records-modal" class="btn-close-modal">✕</button>
                    </div>
                    <div class="battle-modal-body">
                        <div class="records-content">
                            <p style="text-align: center; color: rgba(255,255,255,0.6); margin: 40px 0;">
                                詳細な対戦記録機能は今後実装予定です。<br>
                                現在は基本的な勝敗統計のみ記録されています。
                            </p>
                            <div class="stats-by-difficulty">
                                ${Object.values(this.opponents).map(opp => {
                                    const stats = this.stats[opp.id];
                                    const matches = stats.wins + stats.losses;
                                    const winRate = matches > 0 ? Math.round((stats.wins / matches) * 100) : 0;
                                    return `
                                        <div class="difficulty-stat-row" style="--opponent-color: ${opp.color}">
                                            <span class="difficulty-icon">${opp.icon}</span>
                                            <span class="difficulty-name">${opp.name}</span>
                                            <span class="difficulty-record">${stats.wins}勝 ${stats.losses}敗</span>
                                            <span class="difficulty-winrate">${winRate}%</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * 対戦記録モーダル閉じる
     */
    closeViewRecordsModal() {
        const modal = document.getElementById('battle-records-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * ギブアップ確認ダイアログ表示
     */
    showGiveUpConfirmation() {
        const modalHTML = `
            <div id="battle-give-up-modal" class="battle-modal active">
                <div class="battle-modal-content give-up-modal">
                    <div class="battle-modal-header">
                        <h3>⚠️ ギブアップ確認</h3>
                    </div>
                    <div class="battle-modal-body">
                        <p style="text-align: center; font-size: 1.2rem; margin: 30px 0;">
                            本当にギブアップしますか？<br>
                            <span style="color: #ff6b6b;">この対戦は敗北として記録されます。</span>
                        </p>
                        <div class="give-up-actions">
                            <button id="btn-confirm-give-up" class="btn-result-action primary danger">
                                はい、ギブアップする
                            </button>
                            <button id="btn-cancel-give-up" class="btn-result-action">
                                いいえ、続ける
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * ギブアップ確認ダイアログ閉じる
     */
    closeGiveUpConfirmation() {
        const modal = document.getElementById('battle-give-up-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * ギブアップ確定
     */
    confirmGiveUp() {
        this.closeGiveUpConfirmation();

        // Stop CPU
        this.stopCPU();

        // Reset BattleTimer
        if (window.BattleTimer) {
            window.BattleTimer.reset();
        }

        // Record as loss
        this.playerFinishTime = Infinity;
        this.cpuFinishTime = this.currentOpponent ? this.currentOpponent.avgTime : 30000;

        // Show results
        this.showResults();
    }
};

// Make globally available
window.BattleMode = BattleMode;

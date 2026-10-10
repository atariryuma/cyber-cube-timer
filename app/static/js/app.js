/**
 * CYBER CUBE TIMER - Main Application
 * Handles initialization and global state
 */

// Global Application State
const App = {
    currentScramble: '',
    currentCubeType: '3x3x3',
    currentSession: 'default',
    show3D: true,
    settings: {
        inspection: true,
        sound: true,
        holdStart: false,
        trigger: 'both'
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Database
    await DB.init();

    // Load settings from localStorage
    loadSettings();

    // Load initial scramble
    await loadNewScramble();

    // Initialize UI event listeners
    initializeUI();

    // Initialize Camera
    if (window.Camera) {
        await Camera.init();
    }

    // Initialize Timer
    Timer.init();

    // Initialize Battle Mode
    if (window.BattleMode) {
        await BattleMode.init();
    }

    // Initialize graph BEFORE loading statistics
    Graph.init();

    // Load statistics (this will update the graph)
    await updateStatistics();

    // Initialize 3D cube visualizer (will be initialized when CubeVisualizer module loads)
    // CubeVisualizer is loaded as ES module and will auto-initialize
});

/**
 * Load settings from localStorage
 */
function loadSettings() {
    const savedSettings = localStorage.getItem('cyberCubeSettings');
    if (savedSettings) {
        App.settings = { ...App.settings, ...JSON.parse(savedSettings) };
    }

    // Apply settings to UI
    document.getElementById('setting-inspection').checked = App.settings.inspection;
    document.getElementById('setting-sound').checked = App.settings.sound;
    document.getElementById('setting-hold-start').checked = App.settings.holdStart;
    document.getElementById('setting-trigger').value = App.settings.trigger;
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    localStorage.setItem('cyberCubeSettings', JSON.stringify(App.settings));
}

/**
 * Load new scramble from API
 */
async function loadNewScramble() {
    try {
        const response = await fetch(`/api/scramble?type=${App.currentCubeType}`);
        const data = await response.json();

        if (data.success) {
            App.currentScramble = data.scramble;

            // Update scramble display (center panel)
            const scrambleDisplayCenter = document.getElementById('scramble-text-center');

            if (scrambleDisplayCenter) {
                scrambleDisplayCenter.textContent = data.scramble;
            }

            // Update 3D visualizer if visible
            if (App.show3D && typeof CubeVisualizer !== 'undefined' && CubeVisualizer.scene) {
                const container = document.getElementById('cube-visualizer-container');
                container.classList.add('animating');
                await CubeVisualizer.applyScramble(data.scramble);
                container.classList.remove('animating');
            }
        } else {
            const errorMsg = 'Error loading scramble';
            const scrambleDisplayCenter = document.getElementById('scramble-text-center');
            if (scrambleDisplayCenter) scrambleDisplayCenter.textContent = errorMsg;
        }
    } catch (error) {
        const errorMsg = 'Connection error';
        const scrambleDisplayCenter = document.getElementById('scramble-text-center');
        if (scrambleDisplayCenter) scrambleDisplayCenter.textContent = errorMsg;
    }
}

/**
 * Initialize UI event listeners
 */
function initializeUI() {
    // Scramble help button
    document.getElementById('scramble-help-btn').addEventListener('click', () => {
        document.getElementById('scramble-help-modal').classList.add('active');
    });

    // Close scramble help modal
    document.getElementById('close-scramble-help').addEventListener('click', () => {
        document.getElementById('scramble-help-modal').classList.remove('active');
    });

    // Refresh scramble button
    document.getElementById('refresh-scramble-btn').addEventListener('click', loadNewScramble);

    // 3D Playback controls
    document.getElementById('scramble-play').addEventListener('click', () => {
        if (window.CubeVisualizer) {
            CubeVisualizer.togglePlay();
        }
    });

    document.getElementById('scramble-prev').addEventListener('click', () => {
        if (window.CubeVisualizer) {
            CubeVisualizer.prevMove();
        }
    });

    document.getElementById('scramble-next').addEventListener('click', () => {
        if (window.CubeVisualizer) {
            CubeVisualizer.nextMove();
        }
    });

    document.getElementById('scramble-restart').addEventListener('click', () => {
        if (window.CubeVisualizer) {
            CubeVisualizer.goToStart();
        }
    });

    document.getElementById('scramble-end').addEventListener('click', () => {
        if (window.CubeVisualizer) {
            CubeVisualizer.goToEnd();
        }
    });

    document.getElementById('playback-speed').addEventListener('change', (e) => {
        if (window.CubeVisualizer) {
            CubeVisualizer.setPlaybackSpeed(e.target.value);
        }
    });

    // Session selector
    document.getElementById('session-select').addEventListener('change', async (e) => {
        App.currentSession = e.target.value;
        await updateStatistics();
        Graph.update();
    });

    // Cube type selector
    document.getElementById('cube-type-select').addEventListener('change', async (e) => {
        App.currentCubeType = e.target.value;
        await loadNewScramble();
        await updateStatistics();
        Graph.update();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('active');
    });

    // Close settings modal
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('active');
    });

    // Close help modal
    const closeHelpBtn = document.getElementById('close-help');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('active');
        });
    }

    // Settings checkboxes
    document.getElementById('setting-inspection').addEventListener('change', (e) => {
        App.settings.inspection = e.target.checked;
        saveSettings();
    });

    document.getElementById('setting-sound').addEventListener('change', (e) => {
        App.settings.sound = e.target.checked;
        saveSettings();
    });

    document.getElementById('setting-hold-start').addEventListener('change', (e) => {
        App.settings.holdStart = e.target.checked;
        saveSettings();
    });

    document.getElementById('setting-trigger').addEventListener('change', (e) => {
        App.settings.trigger = e.target.value;
        saveSettings();
    });

    // Export CSV button
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);

    // Clear history button
    document.getElementById('clear-history-btn').addEventListener('click', clearHistory);

    // New session button
    document.getElementById('new-session-btn').addEventListener('click', createNewSession);

    // Stats info button
    const statsInfoBtn = document.getElementById('stats-info-btn');
    if (statsInfoBtn) {
        statsInfoBtn.addEventListener('click', showStatsInfo);
    }

    // Timer action buttons
    document.getElementById('btn-timer-dnf').addEventListener('click', handleQuickDNF);
    document.getElementById('btn-timer-plus2').addEventListener('click', handleQuickPlus2);
    document.getElementById('btn-delete-last').addEventListener('click', handleQuickDeleteLast);

    // Close modal on outside click
    document.getElementById('settings-modal').addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') {
            document.getElementById('settings-modal').classList.remove('active');
        }
    });

    document.getElementById('scramble-help-modal').addEventListener('click', (e) => {
        if (e.target.id === 'scramble-help-modal') {
            document.getElementById('scramble-help-modal').classList.remove('active');
        }
    });

    // Close help modal on outside click
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target.id === 'help-modal') {
                helpModal.classList.remove('active');
            }
        });
    }
}

/**
 * Open settings modal
 */
function openSettings() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('active');
    }
}

/**
 * Open help modal
 */
function openHelp() {
    const helpModal = document.getElementById('help-modal');
    if (helpModal) {
        helpModal.classList.add('active');
    }
}

/**
 * Update statistics display
 */
async function updateStatistics() {
    const times = await DB.getTimes(App.currentSession, App.currentCubeType);
    const stats = Statistics.calculate(times);

    // Update UI (compact layout in right panel)
    document.getElementById('stat-single').textContent = stats.best || '--';
    document.getElementById('stat-ao5').textContent = stats.ao5.value || '--';
    document.getElementById('stat-ao12').textContent = stats.ao12.value || '--';
    document.getElementById('stat-count').textContent = stats.count;

    // Update quick stats in center panel
    const quickStatBest = document.getElementById('quick-stat-best');
    const quickStatAo5 = document.getElementById('quick-stat-ao5');
    const quickStatAo12 = document.getElementById('quick-stat-ao12');

    if (quickStatBest) quickStatBest.textContent = stats.best || '--';
    if (quickStatAo5) quickStatAo5.textContent = stats.ao5.value || '--';
    if (quickStatAo12) quickStatAo12.textContent = stats.ao12.value || '--';

    // Update history display
    updateHistoryDisplay(times);

    // Update graph
    Graph.update(times);

    // Update timer action buttons visibility
    updateTimerActionsVisibility();
}

/**
 * Update history display
 */
function updateHistoryDisplay(times) {
    const historyList = document.getElementById('history-list');

    if (times.length === 0) {
        const emptyTitle = (window.I18N && I18N.t('history.empty.title','No solves yet')) || 'No solves yet';
        const emptyHint = (window.I18N && I18N.t('history.empty.hint','Press Space or tap to start!')) || 'Press Space or tap to start!';
        historyList.innerHTML = `
            <div class="history-empty">
                <p>${emptyTitle}</p>
                <p class="history-empty-hint">${emptyHint}</p>
            </div>
        `;
        return;
    }

    // Get best time (including penalties)
    const validTimes = times.filter(t => !t.dnf).map(t => t.time + (t.penalty || 0));
    const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : null;

    // Display last 10 times
    const recentTimes = times.slice(0, 10);

    historyList.innerHTML = recentTimes.map((time, index) => {
        const totalTime = (time.time + (time.penalty || 0));
        const isBest = totalTime === bestTime && !time.dnf;
        const timeDisplay = time.dnf ? 'DNF' : (window.TimeUtil ? TimeUtil.formatTime(totalTime) : (totalTime/1000).toFixed(3));
        const hasVideo = time.videoBlob ? true : false;

        return `
            <div class="history-item ${isBest ? 'best-time' : ''}" data-time-id="${time.id}">
                <span class="history-number">#${times.length - index}</span>
                <span class="history-time">${timeDisplay}</span>
                ${isBest ? '<span class="history-badge badge-pb">🏆 PB</span>' : ''}
                ${time.penalty === 2000 ? '<span class="history-badge badge-plus2">+2</span>' : ''}
                ${time.dnf ? '<span class="history-badge badge-dnf">DNF</span>' : ''}
                ${hasVideo ? '<span class="history-badge badge-video" title="動画あり">📹</span>' : ''}
                <div class="history-actions">
                    ${hasVideo ? '<button class="btn-action btn-play-video" data-id="' + time.id + '" title="動画再生">▶</button>' : ''}
                    ${hasVideo ? '<button class="btn-action btn-download-video" data-id="' + time.id + '" title="動画DL">⬇</button>' : ''}
                    <button class="btn-action btn-penalty" data-id="${time.id}" data-penalty="${time.penalty || 0}" title="Add +2">+2</button>
                    <button class="btn-action btn-dnf" data-id="${time.id}" data-dnf="${time.dnf}" title="DNF">DNF</button>
                    <button class="btn-action btn-delete" data-id="${time.id}" title="Delete">×</button>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners to history action buttons
    historyList.querySelectorAll('.btn-play-video').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            if (window.Camera) {
                await window.Camera.playVideo(id);
            }
        });
    });

    historyList.querySelectorAll('.btn-download-video').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            if (window.Camera) {
                await window.Camera.downloadVideo(id);
            }
        });
    });

    historyList.querySelectorAll('.btn-penalty').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            const currentPenalty = parseInt(btn.dataset.penalty);
            await togglePenalty(id, currentPenalty);
        });
    });

    historyList.querySelectorAll('.btn-dnf').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            const currentDNF = btn.dataset.dnf === 'true';
            await toggleDNF(id, currentDNF);
        });
    });

    historyList.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            await deleteTime(id);
        });
    });
}

/**
 * Format time in seconds to display format
 */
// formatTime moved to TimeUtil

/**
 * Toggle +2 penalty
 */
async function togglePenalty(id, currentPenalty) {
    const newPenalty = currentPenalty === 2000 ? 0 : 2000;
    await DB.updateTime(id, { penalty: newPenalty });
    await updateStatistics();
}

/**
 * Toggle DNF
 */
async function toggleDNF(id, currentDNF) {
    await DB.updateTime(id, { dnf: !currentDNF });
    await updateStatistics();
}

/**
 * Delete time
 */
async function deleteTime(id) {
    if (confirm((window.I18N && I18N.t('confirm.deleteOne','Delete this time?')) || 'Delete this time?')) {
        await DB.deleteTime(id);
        await updateStatistics();
    }
}

/**
 * Quick DNF - Apply DNF to last time
 */
async function handleQuickDNF() {
    const times = await DB.getTimes(App.currentSession, App.currentCubeType);
    if (times.length === 0) {
        alert((window.I18N && I18N.t('alert.noRecords','No records')) || 'No records');
        return;
    }

    const lastTime = times[0];
    const newDNF = !lastTime.dnf;

    await DB.updateTime(lastTime.id, { dnf: newDNF });
    await updateStatistics();

    // Show feedback (English UI)
    showAchievement(
        newDNF ? ((window.I18N && I18N.t('quick.dnf.set','Set DNF')) || 'Set DNF') : ((window.I18N && I18N.t('quick.dnf.unset','Unset DNF')) || 'Unset DNF'),
        newDNF ? `Time #${times.length} set to DNF` : `Time #${times.length} restored`
    );
}

/**
 * Quick +2 - Toggle +2 penalty on last time
 */
async function handleQuickPlus2() {
    const times = await DB.getTimes(App.currentSession, App.currentCubeType);
    if (times.length === 0) {
        alert((window.I18N && I18N.t('alert.noRecords','No records')) || 'No records');
        return;
    }

    const lastTime = times[0];
    const newPenalty = lastTime.penalty === 2000 ? 0 : 2000;

    await DB.updateTime(lastTime.id, { penalty: newPenalty });
    await updateStatistics();

    // Show feedback (English UI)
    showAchievement(
        newPenalty ? ((window.I18N && I18N.t('quick.plus2.set','Add +2 penalty')) || 'Add +2 penalty') : ((window.I18N && I18N.t('quick.plus2.unset','Remove +2 penalty')) || 'Remove +2 penalty'),
        newPenalty ? `Time #${times.length} set to +2` : `Time #${times.length} restored`
    );
}

/**
 * Quick Delete Last - Delete the last time
 */
async function handleQuickDeleteLast() {
    const times = await DB.getTimes(App.currentSession, App.currentCubeType);
    if (times.length === 0) {
        alert((window.I18N && I18N.t('alert.noRecords','No records')) || 'No records');
        return;
    }

    const lastTime = times[0];

    if (confirm(`Delete last time (#${times.length}: ${(window.TimeUtil ? TimeUtil.formatTime(lastTime.time) : (lastTime.time/1000).toFixed(3))}s)?`)) {
        await DB.deleteTime(lastTime.id);
        await updateStatistics();

        showAchievement('Deleted', `Time #${times.length} was deleted`);
    }
}

/**
 * Show or hide timer action buttons
 */
function updateTimerActionsVisibility() {
    const timerActions = document.getElementById('timer-actions');
    if (!timerActions) return;

    // Don't show in battle mode
    if (window.BattleMode && window.BattleMode.isActive) {
        timerActions.classList.remove('visible');
        return;
    }

    // Show buttons only when timer is idle/stopped and there are times
    const timerState = window.Timer ? window.Timer.state : 'idle';
    if (timerState === 'idle' || timerState === 'stopped') {
        DB.getTimes(App.currentSession, App.currentCubeType).then(times => {
            if (times.length > 0) {
                timerActions.classList.add('visible');
            } else {
                timerActions.classList.remove('visible');
            }
        });
    } else {
        timerActions.classList.remove('visible');
    }
}

/**
 * Clear all history
 */
async function clearHistory() {
    if (confirm((window.I18N && I18N.t('confirm.deleteAll','Delete all times? This cannot be undone.')) || 'Delete all times? This cannot be undone.')) {
        await DB.clearTimes(App.currentSession, App.currentCubeType);
        await updateStatistics();
    }
}

/**
 * Export to CSV
 */
async function exportToCSV() {
    const times = await DB.getTimes(App.currentSession, App.currentCubeType);

    if (times.length === 0) {
        alert((window.I18N && I18N.t('alert.noExport','No times to export.')) || 'No times to export.');
        return;
    }

    // Create CSV content
    let csv = 'No.,Time (s),Penalty,DNF,Scramble,Date\n';
    times.reverse().forEach((time, index) => {
        const timeValue = time.dnf ? 'DNF' : (window.TimeUtil ? TimeUtil.formatTime(time.time) : (time.time/1000).toFixed(3));
        const penalty = time.penalty === 2000 ? '+2' : '';
        const dnf = time.dnf ? 'Yes' : 'No';
        const date = new Date(time.timestamp).toLocaleString();
        csv += `${index + 1},"${timeValue}","${penalty}","${dnf}","${time.scramble}","${date}"\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyber-cube-timer-${App.currentCubeType}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Create new session
 */
function createNewSession() {
    const sessionName = prompt('新しいセッション名を入力してください:');
    if (sessionName && sessionName.trim()) {
        App.currentSession = sessionName.trim();

        // Add to session selector
        const select = document.getElementById('session-select');
        const option = document.createElement('option');
        option.value = sessionName.trim();
        option.textContent = sessionName.trim();
        option.selected = true;
        select.appendChild(option);

        updateStatistics();
    }
}

/**
 * Show achievement notification
 */
function showAchievement(title, subtitle) {
    const notification = document.getElementById('achievement-notification');
    notification.querySelector('.achievement-title').textContent = title;
    notification.querySelector('.achievement-subtitle').textContent = subtitle;

    notification.classList.add('show');

    // Play sound if enabled
    if (App.settings.sound) {
        playSound('achievement');
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Shared AudioContext (create once, reuse)
let audioContext = null;
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Play sound effect
 */
function playSound(type) {
    // Reuse audio context for beep sounds
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
        case 'start':
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);
            break;
        case 'stop':
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);
            break;
        case 'inspection':
            oscillator.frequency.value = 1200;
            gainNode.gain.value = 0.4;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.15);
            break;
        case 'achievement':
            // Play a short melody for achievement
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);

            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.frequency.value = 1000;
                gain2.gain.value = 0.3;
                osc2.start();
                osc2.stop(ctx.currentTime + 0.1);
            }, 100);
            break;
    }
}

/**
 * Toggle 3D cube visualizer
 */
async function toggle3DView() {
    App.show3D = !App.show3D;
    const container = document.getElementById('cube-visualizer-container');
    const scrambleText = document.getElementById('scramble-display');

    if (App.show3D) {
        container.style.display = 'block';
        scrambleText.style.display = 'none';

        // Apply current scramble to 3D view
        if (App.currentScramble && typeof CubeVisualizer !== 'undefined' && CubeVisualizer.scene) {
            container.classList.add('animating');
            await CubeVisualizer.applyScramble(App.currentScramble);
            container.classList.remove('animating');
        }
    } else {
        container.style.display = 'none';
        scrambleText.style.display = 'block';
    }
}

/**
 * Show statistics information
 */
function showStatsInfo() {
    const message = (window.I18N && I18N.tJa('guides.statsInfo', '統計の見方')) || '統計の見方';
    alert(message);
}
/**
 * Rotate quick tips carousel
 */
let currentTipIndex = 0;
const tips = [
    // アプリの基本操作
    { icon: '💡', text: 'スペースキーでタイマー開始・停止' },
    { icon: '🎯', text: 'インスペクション: 15秒間でキューブを観察' },
    { icon: '⚡', text: '3Dビューで正しいスクランブルを確認' },
    { icon: '📊', text: 'Ao5/Ao12で実力を正確に測定' },
    { icon: '💾', text: 'データは自動保存されます' },
    // 上達のコツ
    { icon: '🎓', text: '基礎を固める: まずは1つの解法を完璧にマスター' },
    { icon: '📝', text: 'アルゴリズム暗記: 毎日1〜2個ずつ覚えよう' },
    { icon: '⚡', text: 'フィンガートリック: 正確さ重視、速さは後からついてくる' },
    { icon: '👀', text: 'ルックアヘッド: 手を止めずに次を探す練習' },
    { icon: '📈', text: '記録を分析: 安定性向上がタイム短縮の鍵' },
    { icon: '🎥', text: 'YouTubeで世界トップ選手のソルブを学ぼう' },
    // 豆知識
    { icon: '🏆', text: '世界記録は3.13秒（2023年）' },
    { icon: '🔢', text: 'キューブの組み合わせは約43垓通り！' },
    { icon: '🤖', text: 'どんな状態でも20手以内で解ける（神の数字）' }
];

function rotateTips() {
    const quickTips = document.getElementById('quick-tips');
    if (!quickTips) return;

    currentTipIndex = (currentTipIndex + 1) % tips.length;
    const tip = tips[currentTipIndex];

    // Fade out
    quickTips.style.opacity = '0';

    setTimeout(() => {
        // Update content
        const tipCarousel = quickTips.querySelector('.tip-carousel');
        if (tipCarousel) {
            tipCarousel.innerHTML = `
                <span class="tip-icon">${tip.icon}</span>
                <span class="tip-text">${tip.text}</span>
            `;
        }
        // Fade in
        quickTips.style.opacity = '1';
    }, 300);
}

// Start tip rotation
setInterval(rotateTips, 8000); // Rotate every 8 seconds

// Export only necessary functions to global scope
// Minimize global namespace pollution
const CyberCubeApp = {
    // Core state
    App,
    // Public API
    formatTime: TimeUtil ? TimeUtil.formatTime : null,
    updateStatistics,
    loadNewScramble,
    showAchievement,
    playSound,
    toggle3DView,
    showStatsInfo,
    // Internal functions (prefixed with _)
    _togglePenalty: togglePenalty,
    _toggleDNF: toggleDNF,
    _deleteTime: deleteTime
};

// Export single global object
window.CyberCubeApp = CyberCubeApp;

// Also export App directly for compatibility
window.App = App;

// Add modal functions to App object
App.openSettings = openSettings;
App.openHelp = openHelp;
App.generateScramble = loadNewScramble;

// Make loadNewScramble globally available for battle mode
window.loadNewScramble = loadNewScramble;



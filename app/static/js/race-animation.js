/**
 * CYBER CUBE TIMER - Race Animation Module
 * Handles smooth animations for race progress bars and effects
 */

const RaceAnimation = {
    animationFrame: null,
    particleInterval: null,

    /**
     * Update player progress with smooth animation
     */
    updatePlayerProgress(progress, time) {
        const progressBar = document.getElementById('player-progress');
        const marker = document.getElementById('player-marker');
        const timeDisplay = document.getElementById('player-time');

        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;

            // Add glow effect when near finish
            if (progress > 90) {
                progressBar.classList.add('near-finish');
            } else {
                progressBar.classList.remove('near-finish');
            }
        }

        if (marker) {
            marker.style.left = `${Math.min(progress, 100)}%`;

            // Add speed effect when moving fast
            if (progress > 0 && progress < 100) {
                marker.classList.add('moving');
            } else {
                marker.classList.remove('moving');
            }
        }

        if (timeDisplay && time !== null) {
            timeDisplay.textContent = window.BattleMode?.formatTime(time) || '--:--.---';
        }
    },

    /**
     * Create particle effect when player makes progress
     */
    createProgressParticle(isPlayer = true) {
        const lane = isPlayer
            ? document.querySelector('.player-lane .lane-track')
            : document.querySelector('.cpu-lane .lane-track');

        if (!lane) return;

        const particle = document.createElement('div');
        particle.className = 'progress-particle';
        particle.style.left = `${Math.random() * 100}%`;

        lane.appendChild(particle);

        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 1000);
    },

    /**
     * Animate finish line crossing
     */
    animateFinish(isPlayer = true) {
        const lane = isPlayer
            ? document.querySelector('.player-lane')
            : document.querySelector('.cpu-lane');

        if (!lane) return;

        // Add finish animation class
        lane.classList.add('finished');

        // Create explosion effect
        this.createFinishExplosion(lane);

        // Play finish sound if available
        this.playFinishSound(isPlayer);
    },

    /**
     * Create explosion effect at finish line
     */
    createFinishExplosion(laneElement) {
        const track = laneElement.querySelector('.lane-track');
        if (!track) return;

        // Create multiple particles
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'finish-particle';

            // Random position and animation
            const angle = (Math.PI * 2 * i) / 20;
            const distance = 50 + Math.random() * 50;

            particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
            particle.style.left = '100%';
            particle.style.top = '50%';

            track.appendChild(particle);

            // Remove after animation
            setTimeout(() => {
                particle.remove();
            }, 1000);
        }
    },

    /**
     * Play finish sound
     */
    playFinishSound(isPlayer) {
        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for player vs CPU
            oscillator.frequency.value = isPlayer ? 800 : 600;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Audio not available:', error);
        }
    },

    /**
     * Animate race start countdown
     */
    async animateCountdown() {
        const statusElement = document.getElementById('race-status');
        if (!statusElement) return;

        const countdown = ['3', '2', '1', 'GO!'];

        for (const count of countdown) {
            statusElement.textContent = count;
            statusElement.className = 'race-status countdown';

            // Add bounce animation
            statusElement.style.animation = 'none';
            setTimeout(() => {
                statusElement.style.animation = 'countdown-bounce 0.5s ease-out';
            }, 10);

            await this.delay(count === 'GO!' ? 500 : 800);
        }

        statusElement.className = 'race-status';
        statusElement.textContent = '';
    },

    /**
     * Show race start flash
     */
    showStartFlash() {
        const flash = document.createElement('div');
        flash.className = 'race-start-flash';
        document.getElementById('battle-race-screen')?.appendChild(flash);

        setTimeout(() => {
            flash.remove();
        }, 500);
    },

    /**
     * Animate winner announcement
     */
    animateWinner(isPlayerWinner) {
        const winnerLane = isPlayerWinner
            ? document.querySelector('.player-lane')
            : document.querySelector('.cpu-lane');

        if (winnerLane) {
            winnerLane.classList.add('winner');

            // Create confetti effect
            this.createConfetti(winnerLane);
        }
    },

    /**
     * Create confetti effect
     */
    createConfetti(container) {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = `${Math.random() * 0.5}s`;
                confetti.style.animationDuration = `${2 + Math.random()}s`;

                container.appendChild(confetti);

                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }, i * 30);
        }
    },

    /**
     * Pulse animation for specific element
     */
    pulse(elementId, color = '#00ff41') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.style.boxShadow = `0 0 20px ${color}`;

        setTimeout(() => {
            element.style.boxShadow = '';
        }, 300);
    },

    /**
     * Shake animation for element
     */
    shake(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('shake');

        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    },

    /**
     * Start continuous particle effects during race
     */
    startRaceParticles() {
        this.stopRaceParticles();

        this.particleInterval = setInterval(() => {
            // Randomly create particles in both lanes
            if (Math.random() > 0.7) {
                this.createProgressParticle(true);
            }
            if (Math.random() > 0.7) {
                this.createProgressParticle(false);
            }
        }, 500);
    },

    /**
     * Stop particle effects
     */
    stopRaceParticles() {
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
            this.particleInterval = null;
        }
    },

    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Clear all animations
     */
    clearAnimations() {
        // Stop any ongoing animations
        this.stopRaceParticles();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Remove all animation classes
        document.querySelectorAll('.player-lane, .cpu-lane').forEach(lane => {
            lane.classList.remove('finished', 'winner', 'moving');
        });

        // Remove all particle elements
        document.querySelectorAll('.progress-particle, .finish-particle, .confetti').forEach(el => {
            el.remove();
        });
    }
};

// Make RaceAnimation globally available
window.RaceAnimation = RaceAnimation;

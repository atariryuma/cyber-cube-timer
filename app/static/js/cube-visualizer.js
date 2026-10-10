/**
 * CYBER CUBE TIMER - 3D Cube Visualizer
 * Three.js-based 3D Rubik's Cube visualization with ES Modules
 */

import * as THREE from 'three';

const CubeVisualizer = {
    scene: null,
    camera: null,
    renderer: null,
    cube: null,
    cubelets: [],
    animationId: null,
    container: null,
    isAnimating: false,
    moveQueue: [],

    // Playback control
    allMoves: [],
    currentMoveIndex: 0,
    isPlaying: false,
    playbackSpeed: 500, // milliseconds per move
    playbackInterval: null,

    // WCA Official Colors
    colors: {
        white: 0xffffff,
        yellow: 0xffed4e,
        red: 0xff0000,
        orange: 0xff8800,
        blue: 0x0000ff,
        green: 0x00ff00,
        black: 0x1a1a2e
    },

    /**
     * Initialize the 3D visualizer
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Clean up existing renderer if any
        if (this.renderer) {
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
            this.renderer.dispose();
            this.renderer = null;
        }

        // Clean up existing cubelets
        if (this.cubelets && this.cubelets.length > 0) {
            this.cubelets.forEach(cubelet => {
                if (cubelet.geometry) cubelet.geometry.dispose();
                if (Array.isArray(cubelet.material)) {
                    cubelet.material.forEach(mat => mat && mat.dispose());
                } else if (cubelet.material) {
                    cubelet.material.dispose();
                }
            });
            this.cubelets = [];
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);

        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(6, 6, 6);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight1.position.set(5, 5, 5);
        this.scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, -5, -5);
        this.scene.add(directionalLight2);

        // Create cube
        this.createCube();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('✅ 3D Cube Visualizer initialized');
    },

    /**
     * Create 3x3x3 Rubik's Cube
     */
    createCube() {
        this.cube = new THREE.Group();
        this.cubelets = [];

        const size = 0.95;
        const gap = 0.05;
        const spacing = size + gap;

        // Create 27 cubelets (3x3x3)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubelet = this.createCubelet(size, x, y, z);
                    cubelet.position.set(x * spacing, y * spacing, z * spacing);

                    // Store position info
                    cubelet.userData = {
                        x: x,
                        y: y,
                        z: z,
                        originalPosition: cubelet.position.clone(),
                        originalRotation: cubelet.rotation.clone()
                    };

                    this.cubelets.push(cubelet);
                    this.cube.add(cubelet);
                }
            }
        }

        this.scene.add(this.cube);

        // Add slow rotation
        this.startIdleRotation();
    },

    /**
     * Create a single cubelet with colored faces
     */
    createCubelet(size, x, y, z) {
        const geometry = new THREE.BoxGeometry(size, size, size);

        // Determine which faces are visible (on the outer surface)
        const materials = [];

        // Right face (X+) - Red
        materials.push(new THREE.MeshPhongMaterial({
            color: x === 1 ? this.colors.red : this.colors.black,
            emissive: x === 1 ? 0x330000 : 0x000000,
            shininess: 30
        }));

        // Left face (X-) - Orange
        materials.push(new THREE.MeshPhongMaterial({
            color: x === -1 ? this.colors.orange : this.colors.black,
            emissive: x === -1 ? 0x331100 : 0x000000,
            shininess: 30
        }));

        // Top face (Y+) - White
        materials.push(new THREE.MeshPhongMaterial({
            color: y === 1 ? this.colors.white : this.colors.black,
            emissive: y === 1 ? 0x222222 : 0x000000,
            shininess: 30
        }));

        // Bottom face (Y-) - Yellow
        materials.push(new THREE.MeshPhongMaterial({
            color: y === -1 ? this.colors.yellow : this.colors.black,
            emissive: y === -1 ? 0x332200 : 0x000000,
            shininess: 30
        }));

        // Front face (Z+) - Green
        materials.push(new THREE.MeshPhongMaterial({
            color: z === 1 ? this.colors.green : this.colors.black,
            emissive: z === 1 ? 0x003300 : 0x000000,
            shininess: 30
        }));

        // Back face (Z-) - Blue
        materials.push(new THREE.MeshPhongMaterial({
            color: z === -1 ? this.colors.blue : this.colors.black,
            emissive: z === -1 ? 0x000033 : 0x000000,
            shininess: 30
        }));

        const cubelet = new THREE.Mesh(geometry, materials);

        // Add edge outline
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        cubelet.add(line);

        return cubelet;
    },

    /**
     * Start idle rotation animation - Camera orbits around cube instead of rotating cube itself
     */
    startIdleRotation() {
        const radius = 10.4; // Distance from origin
        const baseHeight = 6;

        this.idleRotation = () => {
            if (!this.isAnimating) {
                const time = Date.now() * 0.0003;
                // Camera orbits around Y axis
                this.camera.position.x = Math.cos(time) * radius;
                this.camera.position.z = Math.sin(time) * radius;
                // Gentle up-down movement
                this.camera.position.y = baseHeight + Math.sin(time * 0.7) * 1.5;
                this.camera.lookAt(0, 0, 0);
            }
        };
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Idle rotation
        if (this.idleRotation && !this.isAnimating) {
            this.idleRotation();
        }

        // Process move queue
        if (this.moveQueue.length > 0 && !this.isAnimating) {
            const move = this.moveQueue.shift();
            this.executeMove(move);
        }

        this.renderer.render(this.scene, this.camera);
    },

    /**
     * Apply scramble to cube (with playback control)
     */
    async applyScramble(scrambleString) {
        // Reset cube to solved state
        this.resetCube();

        // Wait a moment for reset
        await new Promise(resolve => setTimeout(resolve, 100));

        // Parse scramble into moves
        this.allMoves = scrambleString.trim().split(/\s+/).filter(m => m);
        this.currentMoveIndex = 0;
        this.updateMoveDisplay();

        // Don't auto-play, wait for user control
        return Promise.resolve();
    },

    /**
     * Update move display
     */
    updateMoveDisplay() {
        const currentMoveText = document.getElementById('current-move-text');
        const moveCounter = document.getElementById('move-counter');

        if (this.currentMoveIndex < this.allMoves.length) {
            currentMoveText.textContent = this.allMoves[this.currentMoveIndex] || '--';
        } else {
            currentMoveText.textContent = '完了';
        }

        moveCounter.textContent = `${this.currentMoveIndex} / ${this.allMoves.length}`;
    },

    /**
     * Play/Pause toggle
     */
    togglePlay() {
        this.isPlaying = !this.isPlaying;

        const playBtn = document.getElementById('scramble-play');
        if (this.isPlaying) {
            playBtn.textContent = '⏸';
            playBtn.classList.add('playing');
            this.startPlayback();
        } else {
            playBtn.textContent = '▶';
            playBtn.classList.remove('playing');
            this.stopPlayback();
        }
    },

    /**
     * Start automatic playback
     */
    startPlayback() {
        if (this.currentMoveIndex >= this.allMoves.length) {
            this.currentMoveIndex = 0;
            this.resetCube();
        }

        this.playbackInterval = setInterval(() => {
            if (this.currentMoveIndex < this.allMoves.length && !this.isAnimating) {
                this.executeCurrentMove();
                this.currentMoveIndex++;
                this.updateMoveDisplay();
            } else if (this.currentMoveIndex >= this.allMoves.length) {
                this.stopPlayback();
                this.isPlaying = false;
                const playBtn = document.getElementById('scramble-play');
                playBtn.textContent = '▶';
                playBtn.classList.remove('playing');
            }
        }, this.playbackSpeed);
    },

    /**
     * Stop automatic playback
     */
    stopPlayback() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    },

    /**
     * Execute current move
     */
    executeCurrentMove() {
        if (this.currentMoveIndex < this.allMoves.length) {
            const move = this.allMoves[this.currentMoveIndex];
            this.executeMove(move);
        }
    },

    /**
     * Go to next move
     */
    nextMove() {
        if (this.currentMoveIndex < this.allMoves.length && !this.isAnimating) {
            this.executeCurrentMove();
            this.currentMoveIndex++;
            this.updateMoveDisplay();
        }
    },

    /**
     * Go to previous move
     */
    prevMove() {
        if (this.currentMoveIndex > 0) {
            // Reset and replay up to previous move
            this.currentMoveIndex--;
            this.replayUpToCurrent();
        }
    },

    /**
     * Replay from start up to current move
     */
    async replayUpToCurrent() {
        this.resetCube();
        await new Promise(resolve => setTimeout(resolve, 100));

        for (let i = 0; i < this.currentMoveIndex; i++) {
            await new Promise(resolve => {
                this.executeMove(this.allMoves[i]);
                const checkAnimation = setInterval(() => {
                    if (!this.isAnimating) {
                        clearInterval(checkAnimation);
                        resolve();
                    }
                }, 50);
            });
        }

        this.updateMoveDisplay();
    },

    /**
     * Go to start
     */
    goToStart() {
        this.stopPlayback();
        this.isPlaying = false;
        const playBtn = document.getElementById('scramble-play');
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');

        this.currentMoveIndex = 0;
        this.resetCube();
        this.updateMoveDisplay();
    },

    /**
     * Go to end
     */
    async goToEnd() {
        this.stopPlayback();
        this.isPlaying = false;
        const playBtn = document.getElementById('scramble-play');
        playBtn.textContent = '▶';
        playBtn.classList.remove('playing');

        this.currentMoveIndex = this.allMoves.length;
        await this.replayUpToCurrent();
    },

    /**
     * Set playback speed
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = parseInt(speed);
        if (this.isPlaying) {
            this.stopPlayback();
            this.startPlayback();
        }
    },

    /**
     * Execute a single move
     */
    executeMove(move) {
        if (!move || this.isAnimating) return;

        this.isAnimating = true;

        // Parse move notation
        const baseMove = move.match(/[RLUDFB]w?/)?.[0] || move.charAt(0);
        const modifier = move.substring(baseMove.length);

        let angle = Math.PI / 2; // 90 degrees
        if (modifier === "'") {
            angle = -Math.PI / 2; // Counter-clockwise
        } else if (modifier === '2') {
            angle = Math.PI; // 180 degrees
        }

        // Get cubelets to rotate
        const cubeletsToRotate = this.getCubeletsForFace(baseMove);

        if (cubeletsToRotate.length === 0) {
            this.isAnimating = false;
            return;
        }

        // Create rotation group
        const rotationGroup = new THREE.Group();
        this.scene.add(rotationGroup);

        // Move cubelets to rotation group
        const worldPositions = [];
        cubeletsToRotate.forEach(cubelet => {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            cubelet.getWorldPosition(worldPos);
            cubelet.getWorldQuaternion(worldQuat);
            worldPositions.push({ pos: worldPos, quat: worldQuat });

            this.cube.remove(cubelet);
            rotationGroup.add(cubelet);
        });

        // Animate rotation
        const duration = 250; // milliseconds
        const startTime = Date.now();

        const animateRotation = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-in-out function
            const eased = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            const currentAngle = angle * eased;

            // Set rotation based on face
            // WCA standard: When looking at a face, clockwise is the default rotation
            let rotationAxis = new THREE.Vector3();
            let rotationAngle = currentAngle;

            switch (baseMove.charAt(0)) {
                case 'R': // Right face - rotate around X axis (clockwise when looking from right)
                    rotationAxis.set(1, 0, 0);
                    break;
                case 'L': // Left face - rotate around X axis (clockwise when looking from left, so opposite)
                    rotationAxis.set(1, 0, 0);
                    rotationAngle = -currentAngle;
                    break;
                case 'U': // Up face - rotate around Y axis (clockwise when looking from top)
                    rotationAxis.set(0, 1, 0);
                    break;
                case 'D': // Down face - rotate around Y axis (clockwise when looking from bottom, so opposite)
                    rotationAxis.set(0, 1, 0);
                    rotationAngle = -currentAngle;
                    break;
                case 'F': // Front face - rotate around Z axis (clockwise when looking from front)
                    rotationAxis.set(0, 0, 1);
                    break;
                case 'B': // Back face - rotate around Z axis (clockwise when looking from back, so opposite)
                    rotationAxis.set(0, 0, 1);
                    rotationAngle = -currentAngle;
                    break;
            }

            rotationGroup.setRotationFromAxisAngle(rotationAxis, rotationAngle);

            if (progress < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                // Update cubelet positions
                rotationGroup.updateMatrixWorld();
                cubeletsToRotate.forEach(cubelet => {
                    cubelet.updateMatrixWorld();
                    const worldPos = new THREE.Vector3();
                    const worldQuat = new THREE.Quaternion();
                    cubelet.getWorldPosition(worldPos);
                    cubelet.getWorldQuaternion(worldQuat);

                    rotationGroup.remove(cubelet);
                    this.cube.add(cubelet);

                    cubelet.position.copy(worldPos);
                    cubelet.quaternion.copy(worldQuat);
                });

                this.scene.remove(rotationGroup);
                this.isAnimating = false;
            }
        };

        animateRotation();
    },

    /**
     * Get cubelets for a specific face
     */
    getCubeletsForFace(face) {
        const baseFace = face.charAt(0);
        const tolerance = 0.01;

        return this.cubelets.filter(cubelet => {
            const pos = cubelet.position;

            switch (baseFace) {
                case 'R': return pos.x > 0.5;
                case 'L': return pos.x < -0.5;
                case 'U': return pos.y > 0.5;
                case 'D': return pos.y < -0.5;
                case 'F': return pos.z > 0.5;
                case 'B': return pos.z < -0.5;
                default: return false;
            }
        });
    },

    /**
     * Reset cube to solved state
     */
    resetCube() {
        this.moveQueue = [];
        this.isAnimating = false;

        // No need to reset cube.rotation - camera orbits instead

        this.cubelets.forEach(cubelet => {
            cubelet.rotation.set(0, 0, 0);
            cubelet.quaternion.set(0, 0, 0, 1);
            cubelet.position.copy(cubelet.userData.originalPosition);
        });
    },

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    },

    /**
     * Dispose resources
     */
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (this.renderer && this.renderer.domElement && this.container) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }

        this.cubelets.forEach(cubelet => {
            if (cubelet.geometry) cubelet.geometry.dispose();
            if (cubelet.material) {
                if (Array.isArray(cubelet.material)) {
                    cubelet.material.forEach(mat => mat.dispose());
                } else {
                    cubelet.material.dispose();
                }
            }
        });

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cube = null;
        this.cubelets = [];
    }
};

// Make globally available
window.CubeVisualizer = CubeVisualizer;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize after a short delay to ensure container exists
        setTimeout(() => {
            if (document.getElementById('cube-3d')) {
                CubeVisualizer.init('cube-3d');
            }
        }, 100);
    });
} else {
    // DOM already loaded
    setTimeout(() => {
        if (document.getElementById('cube-3d')) {
            CubeVisualizer.init('cube-3d');
        }
    }, 100);
}

export default CubeVisualizer;

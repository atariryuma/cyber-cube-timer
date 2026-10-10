/**
 * CYBER CUBE TIMER - Battle CPU Cube Visualizer
 * Simple single cube visualizer for CPU opponent
 */

import * as THREE from 'three';

const BattleCubeVisualizer = {
    scene: null,
    camera: null,
    renderer: null,
    cube: null,
    cubelets: [],
    animationId: null,
    container: null,
    isAnimating: false,
    isSolving: false,

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
     * Initialize the visualizer
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('CPU cube container not found:', containerId);
            return;
        }

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e27);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(6, 6, 6);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
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

        // Add red glow for CPU
        const cpuGlow = new THREE.PointLight(0xff6b6b, 0.5, 20);
        cpuGlow.position.set(0, 4, 0);
        this.scene.add(cpuGlow);

        // Create cube
        this.cube = new THREE.Group();
        this.scene.add(this.cube);
        this.createCubelets();

        // Start animation
        this.animate();

        console.log('✅ Battle CPU Cube Visualizer initialized');
    },

    /**
     * Create cubelets
     */
    createCubelets() {
        const size = 0.95;
        const gap = 0.05;
        const positions = [-1, 0, 1];

        positions.forEach((x) => {
            positions.forEach((y) => {
                positions.forEach((z) => {
                    const geometry = new THREE.BoxGeometry(size, size, size);

                    const materials = [
                        new THREE.MeshLambertMaterial({ color: x === 1 ? this.colors.red : this.colors.black }),
                        new THREE.MeshLambertMaterial({ color: x === -1 ? this.colors.orange : this.colors.black }),
                        new THREE.MeshLambertMaterial({ color: y === 1 ? this.colors.white : this.colors.black }),
                        new THREE.MeshLambertMaterial({ color: y === -1 ? this.colors.yellow : this.colors.black }),
                        new THREE.MeshLambertMaterial({ color: z === 1 ? this.colors.green : this.colors.black }),
                        new THREE.MeshLambertMaterial({ color: z === -1 ? this.colors.blue : this.colors.black })
                    ];

                    const cubelet = new THREE.Mesh(geometry, materials);
                    cubelet.position.set(
                        x * (size + gap),
                        y * (size + gap),
                        z * (size + gap)
                    );

                    // Add edges
                    const edges = new THREE.EdgesGeometry(geometry);
                    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
                    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
                    cubelet.add(edgeLines);

                    this.cube.add(cubelet);
                    this.cubelets.push(cubelet);
                });
            });
        });
    },

    /**
     * Apply scramble
     */
    async applyScramble(scramble) {
        if (!scramble || !this.cube) return;

        // Reset cube group rotation to prevent coordinate system drift
        if (this.cube) {
            this.cube.rotation.set(0, 0, 0);
        }

        const moves = scramble.trim().split(/\s+/);
        for (const move of moves) {
            await this.applyMove(move);
        }
    },

    /**
     * Apply single move
     */
    async applyMove(move) {
        return new Promise((resolve) => {
            this.executeMove(move);
            // Wait for animation to complete
            const checkAnimation = setInterval(() => {
                if (!this.isAnimating) {
                    clearInterval(checkAnimation);
                    resolve();
                }
            }, 50);
        });
    },

    /**
     * Execute a single move (cube-visualizer.js implementation)
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
        cubeletsToRotate.forEach(cubelet => {
            this.cube.remove(cubelet);
            rotationGroup.add(cubelet);
        });

        // Animate rotation
        const duration = 150; // milliseconds
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
            let rotationAxis = new THREE.Vector3();
            let rotationAngle = currentAngle;

            switch (baseMove.charAt(0)) {
                case 'R': // Right face - rotate around X axis
                    rotationAxis.set(1, 0, 0);
                    break;
                case 'L': // Left face - rotate around X axis (opposite)
                    rotationAxis.set(1, 0, 0);
                    rotationAngle = -currentAngle;
                    break;
                case 'U': // Up face - rotate around Y axis
                    rotationAxis.set(0, 1, 0);
                    break;
                case 'D': // Down face - rotate around Y axis (opposite)
                    rotationAxis.set(0, 1, 0);
                    rotationAngle = -currentAngle;
                    break;
                case 'F': // Front face - rotate around Z axis
                    rotationAxis.set(0, 0, 1);
                    break;
                case 'B': // Back face - rotate around Z axis (opposite)
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
     * Get cubelets for a specific face (cube-visualizer.js implementation)
     */
    getCubeletsForFace(face) {
        const baseFace = face.charAt(0);

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

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Only rotate cube when not animating moves AND not solving
        if (this.cube && !this.isAnimating && !this.isSolving) {
            this.cube.rotation.y += 0.005;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Reset cube to solved state
     */
    reset() {
        if (!this.cube) return;

        // Properly dispose of all cubelets to prevent memory leaks
        this.cubelets.forEach((cubelet) => {
            // Dispose geometry
            if (cubelet.geometry) {
                cubelet.geometry.dispose();
            }

            // Dispose materials (array of materials)
            if (Array.isArray(cubelet.material)) {
                cubelet.material.forEach(mat => {
                    if (mat) mat.dispose();
                });
            } else if (cubelet.material) {
                cubelet.material.dispose();
            }

            // Dispose edge lines
            cubelet.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });

            // Remove from cube
            this.cube.remove(cubelet);
        });

        this.cubelets = [];

        // Recreate cubelets in solved state
        this.createCubelets();

        console.log('🔄 CPU cube reset to solved state');
    },

    /**
     * Simulate human-like solving with realistic trial and error
     * Difficulty determines efficiency (higher = more direct path)
     */
    async simulateHumanSolving(scramble, targetTimeMs, difficulty = 'beginner') {
        console.log('🤖 Starting human-like solving simulation...');
        this.isSolving = true;

        // Reset cube group rotation to prevent coordinate system drift
        if (this.cube) {
            this.cube.rotation.set(0, 0, 0);
        }

        // Efficiency based on difficulty - 10 levels
        const efficiencySettings = {
            beginner: { efficiency: 0.35, thinkPause: 0.35 },      // 35% efficient (many wrong moves)
            novice: { efficiency: 0.45, thinkPause: 0.32 },        // 45% efficient
            amateur: { efficiency: 0.55, thinkPause: 0.28 },       // 55% efficient
            intermediate: { efficiency: 0.65, thinkPause: 0.25 },  // 65% efficient
            skilled: { efficiency: 0.73, thinkPause: 0.22 },       // 73% efficient
            advanced: { efficiency: 0.80, thinkPause: 0.18 },      // 80% efficient
            expert: { efficiency: 0.87, thinkPause: 0.15 },        // 87% efficient
            master: { efficiency: 0.93, thinkPause: 0.12 },        // 93% efficient
            champion: { efficiency: 0.97, thinkPause: 0.09 },      // 97% efficient
            legend: { efficiency: 0.99, thinkPause: 0.06 }         // 99% efficient (nearly perfect)
        };

        const settings = efficiencySettings[difficulty] || efficiencySettings.beginner;
        const scrambleMoves = scramble.trim().split(/\s+/);
        const reverseMoves = this.reverseScramble(scrambleMoves);

        // Build move sequence with errors based on efficiency
        const finalMoves = [];
        const allMoves = ['R', 'R\'', 'L', 'L\'', 'U', 'U\'', 'D', 'D\'', 'F', 'F\'', 'B', 'B\''];

        for (const correctMove of reverseMoves) {
            // Sometimes do the correct move
            if (Math.random() < settings.efficiency) {
                finalMoves.push(correctMove);
            } else {
                // Do a wrong move first, then correct it
                const wrongMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                finalMoves.push(wrongMove);
                // Undo the wrong move
                finalMoves.push(this.reverseScramble([wrongMove])[0]);
                // Then do the correct move
                finalMoves.push(correctMove);
            }
        }

        // Execute all moves
        const moveInterval = targetTimeMs / finalMoves.length;

        for (let i = 0; i < finalMoves.length; i++) {
            await this.applyMove(finalMoves[i]);

            // Thinking pause
            if (Math.random() < settings.thinkPause) {
                await new Promise(resolve => setTimeout(resolve, moveInterval * 0.6));
            }

            await new Promise(resolve => setTimeout(resolve, moveInterval * 0.5));
        }

        this.isSolving = false;
        console.log('✅ Human-like solving complete');

        // Notify completion via callback
        if (this.onSolveComplete) {
            this.onSolveComplete();
        }
    },

    /**
     * Reverse a scramble sequence
     */
    reverseScramble(moves) {
        return moves.reverse().map(move => {
            if (move.includes('\'')) {
                return move.replace('\'', '');
            } else if (move.includes('2')) {
                return move; // 180° moves are their own inverse
            } else {
                return move + '\'';
            }
        });
    },

    /**
     * Cleanup
     */
    destroy() {
        // Cancel animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Dispose all cubelets properly
        this.cubelets.forEach((cubelet) => {
            if (cubelet.geometry) cubelet.geometry.dispose();
            if (Array.isArray(cubelet.material)) {
                cubelet.material.forEach(mat => {
                    if (mat) mat.dispose();
                });
            } else if (cubelet.material) {
                cubelet.material.dispose();
            }
            cubelet.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.cubelets = [];

        // Remove cube from scene
        if (this.scene && this.cube) {
            this.scene.remove(this.cube);
            this.cube = null;
        }

        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
            this.renderer = null;
        }

        // Clear references
        this.scene = null;
        this.camera = null;
        this.container = null;

        console.log('🗑️ BattleCubeVisualizer destroyed and cleaned up');
    }
};

// Export
export default BattleCubeVisualizer;
window.BattleCubeVisualizer = BattleCubeVisualizer;

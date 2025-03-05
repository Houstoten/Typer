import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class TextAnimation {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private letters: THREE.Mesh[] = [];
    private text: string = '';
    private font: Font | null = null;
    private fontLoader: FontLoader;
    private clock: THREE.Clock;
    private readonly targetFrameRate: number = 60;
    private readonly frameInterval: number = 1 / this.targetFrameRate;
    private accumulator: number = 0;
    private audioContext: AudioContext;
    private mousePosition: THREE.Vector2;
    private raycaster: THREE.Raycaster;
    private selectedLetter: THREE.Mesh | null = null;
    private isReplaying: boolean = false;
    private replayButton: HTMLButtonElement;
    private textDisplay: HTMLTextAreaElement;
    private fontLoaded: boolean = false;
    private overlay: HTMLDivElement;
    private hasStarted: boolean = false;

    constructor() {
        // Initialize audio context
        this.audioContext = new AudioContext();
        this.mousePosition = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.overlay.style.display = 'flex';
        this.overlay.style.flexDirection = 'column';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.zIndex = '1000';
        this.overlay.style.cursor = 'pointer';
        this.overlay.style.fontFamily = 'monospace';

        const tutorialText = document.createElement('div');
        tutorialText.style.color = 'white';
        tutorialText.style.fontSize = '22px';
        tutorialText.style.marginBottom = '30px';
        tutorialText.style.textAlign = 'center';
        tutorialText.style.padding = '0 20px';
        tutorialText.style.lineHeight = '1.6';
        tutorialText.style.letterSpacing = '0.5px';
        tutorialText.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 20px; color: #FFB200">🎮 Interactive Text Animation</div>
            <div style="opacity: 0.9">
                Type letters to create falling 3D text<br>
                Click letters to make them bounce<br>
                Use mouse/touch to rotate the view
            </div>
        `;

        const startButton = document.createElement('button');
        startButton.textContent = '▶ Click to Start';
        startButton.style.padding = '15px 30px';
        startButton.style.fontSize = '20px';
        startButton.style.fontFamily = 'monospace';
        startButton.style.backgroundColor = '#FFB200';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '8px';
        startButton.style.cursor = 'pointer';
        startButton.style.transition = 'transform 0.2s, background-color 0.2s';
        startButton.style.marginTop = '20px';
        startButton.style.letterSpacing = '1px';
        startButton.style.textTransform = 'uppercase';
        startButton.style.fontWeight = 'bold';
        startButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

        startButton.addEventListener('mouseover', () => {
            startButton.style.transform = 'scale(1.1)';
            startButton.style.backgroundColor = '#EB5B00';
        });

        startButton.addEventListener('mouseout', () => {
            startButton.style.transform = 'scale(1)';
            startButton.style.backgroundColor = '#FFB200';
        });

        this.overlay.appendChild(tutorialText);
        this.overlay.appendChild(startButton);
        document.body.appendChild(this.overlay);

        // Handle start click
        const handleStart = () => {
            this.hasStarted = true;
            this.overlay.style.opacity = '0';
            this.overlay.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                this.overlay.remove();
            }, 500);
            this.audioContext.resume();
            if (this.fontLoaded) {
                this.loadTextFromUrl();
                this.startReplay();
            }
        };

        this.overlay.addEventListener('click', handleStart);
        startButton.addEventListener('click', handleStart);

        // Create text display
        this.textDisplay = document.createElement('textarea');
        this.textDisplay.style.position = 'fixed';
        this.textDisplay.style.top = '70px';
        this.textDisplay.style.left = '50%';
        this.textDisplay.style.transform = 'translateX(-50%)';
        this.textDisplay.style.padding = '15px 20px';
        this.textDisplay.style.fontSize = '18px';
        this.textDisplay.style.fontFamily = 'monospace';
        this.textDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.textDisplay.style.border = '2px solid rgba(255, 178, 0, 0.3)';
        this.textDisplay.style.borderRadius = '8px';
        this.textDisplay.style.maxWidth = '80vw';
        this.textDisplay.style.width = '400px';
        this.textDisplay.style.height = 'auto';
        this.textDisplay.style.resize = 'none';
        this.textDisplay.style.overflow = 'hidden';
        this.textDisplay.style.minHeight = '30px';
        this.textDisplay.style.textAlign = 'center';
        this.textDisplay.style.color = '#333';
        this.textDisplay.style.outline = 'none';
        this.textDisplay.style.transition = 'all 0.3s ease';
        this.textDisplay.style.lineHeight = '1.4';
        this.textDisplay.placeholder = 'Type or edit text here...';
        this.textDisplay.spellcheck = false;

        // Function to adjust textarea height
        const adjustHeight = () => {
            this.textDisplay.style.height = 'auto';
            this.textDisplay.style.height = `${this.textDisplay.scrollHeight}px`;
        };

        // Add input and change events for height adjustment
        this.textDisplay.addEventListener('input', adjustHeight);
        this.textDisplay.addEventListener('change', adjustHeight);

        // Add focus/blur effects
        this.textDisplay.addEventListener('focus', () => {
            this.textDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            this.textDisplay.style.border = '2px solid rgba(255, 178, 0, 0.6)';
        });

        this.textDisplay.addEventListener('blur', () => {
            this.textDisplay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            this.textDisplay.style.border = '2px solid rgba(255, 178, 0, 0.3)';
        });

        // Handle input changes
        this.textDisplay.addEventListener('input', () => {
            const newText = this.textDisplay.value;
            if (newText.length < this.text.length) {
                // Text was deleted, clear scene and rebuild
                this.text = newText;
                this.letters.forEach(letter => this.scene.remove(letter));
                this.letters = [];
                
                // Rebuild letters
                for (const char of newText) {
                    const displayChar = char === ' ' ? '_' : char;
                    this.addLetter(displayChar, true);
                }
            } else if (newText.length > this.text.length) {
                // New character was added
                const newChar = newText[newText.length - 1];
                this.text = newText;
                const displayChar = newChar === ' ' ? '_' : newChar;
                this.addLetter(displayChar);
                this.playPopSound();
            }
            this.updateDisplays();
        });

        document.body.appendChild(this.textDisplay);

        // Create replay button
        this.replayButton = document.createElement('button');
        this.replayButton.textContent = '▶ Replay';
        this.replayButton.style.position = 'fixed';
        this.replayButton.style.bottom = '20px';
        this.replayButton.style.left = '10px';
        this.replayButton.style.padding = '10px 20px';
        this.replayButton.style.fontSize = '16px';
        this.replayButton.style.backgroundColor = '#4CAF50';
        this.replayButton.style.color = 'white';
        this.replayButton.style.border = 'none';
        this.replayButton.style.borderRadius = '5px';
        this.replayButton.style.cursor = 'pointer';
        this.replayButton.style.transition = 'background-color 0.3s';
        this.replayButton.style.marginRight = '10px';  // Add margin for share button
        
        // Create share button
        const shareButton = document.createElement('button');
        shareButton.textContent = '🔗 Share';
        shareButton.style.position = 'fixed';
        shareButton.style.bottom = '20px';
        shareButton.style.right = '10px';
        shareButton.style.padding = '10px 20px';
        shareButton.style.fontSize = '16px';
        shareButton.style.backgroundColor = '#FFB200';
        shareButton.style.color = 'white';
        shareButton.style.border = 'none';
        shareButton.style.borderRadius = '5px';
        shareButton.style.cursor = 'pointer';
        shareButton.style.transition = 'all 0.3s ease';
        
        // Create notification element
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '70px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontSize = '14px';
        notification.style.fontFamily = 'monospace';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);

        // Share button hover effects
        shareButton.addEventListener('mouseover', () => {
            shareButton.style.backgroundColor = '#EB5B00';
            shareButton.style.transform = 'scale(1.05)';
        });
        
        shareButton.addEventListener('mouseout', () => {
            shareButton.style.backgroundColor = '#FFB200';
            shareButton.style.transform = 'scale(1)';
        });

        // Share button click handler
        shareButton.addEventListener('click', async () => {
            const url = new URL(window.location.href);
            url.searchParams.set('text', this.text);
            const shareUrl = url.toString();
            const shareData = {
                title: 'Interactive Text Animation',
                text: `Check out this 3D text animation: "${this.text}"`,
                url: shareUrl
            };

            // Try native sharing on mobile first
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                    notification.textContent = '✨ Opened sharing!';
                    notification.style.opacity = '1';
                    setTimeout(() => {
                        notification.style.opacity = '0';
                    }, 2000);
                } catch (err) {
                    // User cancelled or sharing failed, fall back to clipboard
                    this.copyToClipboard(shareUrl, notification);
                }
            } else {
                // Fall back to clipboard on desktop or when sharing isn't supported
                this.copyToClipboard(shareUrl, notification);
            }
        });

        this.replayButton.addEventListener('mouseover', () => {
            this.replayButton.style.backgroundColor = '#45a049';
        });
        
        this.replayButton.addEventListener('mouseout', () => {
            this.replayButton.style.backgroundColor = '#4CAF50';
        });
        
        this.replayButton.addEventListener('click', this.startReplay.bind(this));
        document.body.appendChild(this.replayButton);
        document.body.appendChild(shareButton);

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFFAF0);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Initialize clock for fixed timestep
        this.clock = new THREE.Clock();

        // Camera position and controls
        this.camera.position.set(0, 15, 15);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 10, 5);
        pointLight.castShadow = true;
        pointLight.shadow.mapSize.width = 1024;
        pointLight.shadow.mapSize.height = 1024;
        this.scene.add(pointLight);

        // Font loader
        this.fontLoader = new FontLoader();
        this.loadFont();

        // Event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        window.addEventListener('keydown', this.onKeyPress.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onClick.bind(this));

        // Start animation loop
        this.animate();
    }

    private loadFont(): void {
        this.fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font: Font) => {
            this.font = font;
            this.fontLoaded = true;
            if (this.hasStarted) {
                this.loadTextFromUrl();
                this.startReplay();
            }
        });
    }

    private loadTextFromUrl(): void {
        const params = new URLSearchParams(window.location.search);
        const textParam = params.get('text');
        
        if (textParam && this.fontLoaded && !this.text) {
            const decodedText = decodeURIComponent(textParam);
            this.text = decodedText;
            
            // Add all letters without animation or sound
            for (const char of decodedText) {
                const displayChar = char === ' ' ? '_' : char;
                this.addLetter(displayChar, true);
            }
            
            // Update displays
            this.updateDisplays();
        }
    }

    private onMouseMove(event: MouseEvent): void {
        this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    private onClick(): void {
        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        const intersects = this.raycaster.intersectObjects(this.letters);
        
        if (intersects.length > 0) {
            const clickedLetter = intersects[0].object as THREE.Mesh;
            if ((clickedLetter as any).isGrounded) {
                this.playClickSound();
                this.bounceLetter(clickedLetter);
            }
        }
    }

    private bounceLetter(letter: THREE.Mesh): void {
        (letter as any).velocity.y = 0.3;
        (letter as any).isGrounded = false;
        this.highlightLetter(letter);
    }

    private highlightLetter(letter: THREE.Mesh): void {
        const material = letter.material as THREE.MeshPhongMaterial;
        const originalColor = material.color.getHex();
        material.emissive.setHex(0x333333);
        
        setTimeout(() => {
            material.emissive.setHex(0x000000);
        }, 200);
    }

    private playClickSound(): void {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(220, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    private playPopSound(): void {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    private onKeyPress(event: KeyboardEvent): void {
        // Disable direct key handling as we're now using input element
        return;
    }

    private addLetter(letter: string, skipPhysics: boolean = false): void {
        if (!this.font) return;

        const geometry = new TextGeometry(letter, {
            font: this.font,
            size: 1,
            depth: 0.1,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.02,
            bevelSegments: 5
        });

        const material = new THREE.MeshPhongMaterial({
            color: this.getRandomColor(),
            shininess: 100,
            specular: 0x444444,
            emissive: 0x000000,
            flatShading: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox!;
        (mesh as any).size = new THREE.Vector3(
            boundingBox.max.x - boundingBox.min.x,
            boundingBox.max.y - boundingBox.min.y,
            boundingBox.max.z - boundingBox.min.z
        );

        if (skipPhysics) {
            // Place letters in a grid formation
            const index = this.letters.length;
            const row = Math.floor(index / 10);
            const col = index % 10;
            mesh.position.set(
                (col - 5) * 1.5,  // Center the grid horizontally
                0.1,              // Just above the ground
                row * 1.5         // Stack rows back
            );
            mesh.rotation.set(0, 0, 0);
            (mesh as any).velocity = new THREE.Vector3(0, 0, 0);
            (mesh as any).rotationSpeed = new THREE.Vector3(0, 0, 0);
            (mesh as any).isGrounded = true;
        } else {
            mesh.position.x = (Math.random() - 0.5) * 10;
            mesh.position.y = 10;
            mesh.position.z = 0;
            (mesh as any).velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                0,
                (Math.random() - 0.5) * 0.3
            );
            (mesh as any).rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );
            (mesh as any).isGrounded = false;
        }

        this.scene.add(mesh);
        this.letters.push(mesh);
    }

    private getRandomColor(): number {
        const colors = [
            0xFFB200, // Bright Orange/Yellow
            0xEB5B00, // Deep Orange
            0xD91656, // Vibrant Pink/Red
            0x640D5F  // Deep Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    private checkCollision(letter1: THREE.Mesh, letter2: THREE.Mesh): boolean {
        const box1 = new THREE.Box3().setFromObject(letter1);
        const box2 = new THREE.Box3().setFromObject(letter2);
        return box1.intersectsBox(box2);
    }

    private updateLetters(deltaTime: number): void {
        // Update raycaster for hover effects
        this.raycaster.setFromCamera(this.mousePosition, this.camera);
        const intersects = this.raycaster.intersectObjects(this.letters);

        // Reset all letters' emissive color
        this.letters.forEach(letter => {
            const material = letter.material as THREE.MeshPhongMaterial;
            if ((letter as any).isGrounded && !letter.userData.isHighlighted) {
                material.emissive.setHex(0x000000);
            }
        });

        // Highlight hovered letter
        if (intersects.length > 0) {
            const hoveredLetter = intersects[0].object as THREE.Mesh;
            if ((hoveredLetter as any).isGrounded) {
                const material = hoveredLetter.material as THREE.MeshPhongMaterial;
                material.emissive.setHex(0x222222);
            }
        }

        // Update physics
        for (const letter of this.letters) {
            if (!(letter as any).isGrounded) {
                const previousPosition = letter.position.clone();
                
                letter.position.add((letter as any).velocity.clone().multiplyScalar(deltaTime * 60));
                (letter as any).velocity.y -= 0.02 * deltaTime * 60;

                letter.rotation.x += (letter as any).rotationSpeed.x * deltaTime * 60;
                letter.rotation.y += (letter as any).rotationSpeed.y * deltaTime * 60;
                letter.rotation.z += (letter as any).rotationSpeed.z * deltaTime * 60;

                if (letter.position.y < 0.1) {
                    // this.groundLetter(letter);
                    continue;
                }

                for (const otherLetter of this.letters) {
                    if (letter === otherLetter || !(otherLetter as any).isGrounded) continue;

                    if (this.checkCollision(letter, otherLetter)) {
                        const otherBox = new THREE.Box3().setFromObject(otherLetter);
                        letter.position.copy(previousPosition);
                        letter.position.y = otherBox.max.y;
                        // this.groundLetter(letter);
                        break;
                    }
                }
            }
        }
    }

    private groundLetter(letter: THREE.Mesh): void {
        (letter as any).velocity.set(0, 0, 0);
        (letter as any).rotationSpeed.set(0, 0, 0);
        (letter as any).isGrounded = true;
        letter.rotation.set(0, 0, 0);
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls.update();
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));

        // Update controls
        this.controls.update();

        // Fixed timestep update
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);
        this.accumulator += deltaTime;

        while (this.accumulator >= this.frameInterval) {
            this.updateLetters(this.frameInterval);
            this.accumulator -= this.frameInterval;
        }

        this.renderer.render(this.scene, this.camera);
    }

    private updateDisplays(): void {
        this.textDisplay.value = this.text;
        this.replayButton.textContent = `▶ Replay (${this.text.length})`;
    }

    private async startReplay(): Promise<void> {
        if (this.isReplaying || !this.text) return;
        
        this.isReplaying = true;
        this.replayButton.disabled = true;
        this.replayButton.style.backgroundColor = '#cccccc';
        this.replayButton.textContent = '⏳ Replaying...';

        // Clear existing letters
        for (const letter of this.letters) {
            this.scene.remove(letter);
        }
        this.letters = [];

        // Replay each letter with delay
        for (const char of this.text) {
            await new Promise(resolve => setTimeout(resolve, 200));
            this.addLetter(char);
            this.playPopSound();
        }

        this.isReplaying = false;
        this.replayButton.disabled = false;
        this.replayButton.style.backgroundColor = '#4CAF50';
        this.replayButton.textContent = `▶ Replay (${this.text.length})`;
    }

    private copyToClipboard(text: string, notification: HTMLDivElement): void {
        navigator.clipboard.writeText(text).then(() => {
            notification.textContent = '✨ Link copied to clipboard!';
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.opacity = '0';
            }, 2000);
        }).catch(() => {
            notification.textContent = '❌ Failed to copy link';
            notification.style.opacity = '1';
            setTimeout(() => {
                notification.style.opacity = '0';
            }, 2000);
        });
    }
}

// Start the application
new TextAnimation(); 
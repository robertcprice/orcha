/**
 * Game initialization and main loop
 */
import { Game } from './game.js';
import { InputHandler } from './utils/input.js';

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        this.input = new InputHandler();
        this.game = new Game(this.canvas, this.input);

        this.lastTime = 0;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;

        this.start();
    }

    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;

        // Only update if enough time has passed (frame rate limiting)
        if (deltaTime >= this.frameInterval) {
            this.lastTime = timestamp - (deltaTime % this.frameInterval);

            // Update game state
            this.game.update(deltaTime);

            // Check for restart
            this.game.checkRestart();

            // Draw game
            this.game.draw();
        }

        // Continue the loop
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    /**
     * Start the game engine
     */
    start() {
        console.log('Game starting...');
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    new GameEngine();
});

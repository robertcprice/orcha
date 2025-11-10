/**
 * Main game logic and state management
 */
import { Player } from './entities/player.js';
import { Platform } from './entities/platform.js';
import { CollisionDetector } from './utils/collision.js';

export class Game {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = input;
        this.state = 'playing'; // 'playing', 'won', 'lost'
        this.score = 0;
        this.startTime = Date.now();

        // Make CollisionDetector globally accessible for player
        window.CollisionDetector = CollisionDetector;

        this.initializeGame();
    }

    initializeGame() {
        // Create player
        this.player = new Player(50, 100);
        this.startX = 50;
        this.startY = 100;

        // Create platforms
        this.platforms = [
            // Starting platform
            new Platform(0, 450, 200, 20),

            // Middle platforms
            new Platform(250, 400, 150, 20),
            new Platform(450, 350, 120, 20),
            new Platform(300, 250, 150, 20),
            new Platform(500, 200, 120, 20),

            // Upper platforms
            new Platform(150, 150, 120, 20),
            new Platform(350, 100, 150, 20),

            // Goal platform (top right)
            new Platform(650, 50, 100, 30, '#228B22', true)
        ];

        // Find goal platform
        this.goalPlatform = this.platforms.find(p => p.isGoal);
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time elapsed since last frame
     */
    update(deltaTime) {
        if (this.state !== 'playing') {
            return;
        }

        // Handle input
        this.player.handleInput(this.input);

        // Update player physics
        this.player.update(deltaTime);

        // Check platform collisions
        for (const platform of this.platforms) {
            this.player.checkPlatformCollision(platform);

            // Check if player reached goal
            if (platform.isGoal && CollisionDetector.checkCollision(this.player, platform)) {
                this.state = 'won';
                this.score = Math.max(0, 10000 - Math.floor((Date.now() - this.startTime) / 100));
            }
        }

        // Check if player fell off screen
        if (this.player.isOutOfBounds(this.canvas.width, this.canvas.height)) {
            this.state = 'lost';
        }

        // Horizontal boundaries (prevent player from going off sides)
        if (this.player.x < 0) {
            this.player.x = 0;
        }
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
    }

    /**
     * Draw game elements
     */
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw platforms
        for (const platform of this.platforms) {
            platform.draw(this.ctx);
        }

        // Draw player
        this.player.draw(this.ctx);

        // Draw UI
        this.drawUI();

        // Draw game state overlays
        if (this.state === 'won') {
            this.drawWinScreen();
        } else if (this.state === 'lost') {
            this.drawLoseScreen();
        }
    }

    /**
     * Draw UI elements
     */
    drawUI() {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Time: ${Math.floor((Date.now() - this.startTime) / 1000)}s`, 10, 30);
    }

    /**
     * Draw win screen overlay
     */
    drawWinScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Win text
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2 - 40);

        // Score
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

        // Restart instruction
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }

    /**
     * Draw lose screen overlay
     */
    drawLoseScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Lose text
        this.ctx.fillStyle = '#FF4444';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 20);

        // Restart instruction
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }

    /**
     * Restart the game
     */
    restart() {
        this.state = 'playing';
        this.score = 0;
        this.startTime = Date.now();
        this.player.reset(this.startX, this.startY);
    }

    /**
     * Check if restart key is pressed
     */
    checkRestart() {
        if ((this.state === 'won' || this.state === 'lost') &&
            (this.input.isPressed('r') || this.input.isPressed('R'))) {
            this.restart();
        }
    }
}

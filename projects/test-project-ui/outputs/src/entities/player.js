/**
 * Player entity with physics and movement
 */
export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpPower = 12;
        this.gravity = 0.5;
        this.maxFallSpeed = 15;
        this.isGrounded = false;
        this.color = '#FF4444';
    }

    /**
     * Apply movement input
     * @param {InputHandler} input - Input handler instance
     */
    handleInput(input) {
        // Horizontal movement
        if (input.isLeft()) {
            this.velocityX = -this.speed;
        } else if (input.isRight()) {
            this.velocityX = this.speed;
        } else {
            this.velocityX = 0;
        }

        // Jump (only when grounded)
        if (input.isJump() && this.isGrounded) {
            this.velocityY = -this.jumpPower;
            this.isGrounded = false;
        }
    }

    /**
     * Apply physics and update position
     * @param {number} deltaTime - Time elapsed since last frame
     */
    update(deltaTime) {
        // Apply gravity
        this.velocityY += this.gravity;

        // Cap fall speed
        if (this.velocityY > this.maxFallSpeed) {
            this.velocityY = this.maxFallSpeed;
        }

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Reset grounded flag (will be set by collision detection)
        if (this.velocityY > 0) {
            this.isGrounded = false;
        }
    }

    /**
     * Handle collision with platform
     * @param {Platform} platform - Platform to check collision with
     */
    checkPlatformCollision(platform) {
        const CollisionDetector = window.CollisionDetector;

        if (CollisionDetector.isOnPlatform(this, platform)) {
            // Land on platform
            this.y = platform.y - this.height;
            this.velocityY = 0;
            this.isGrounded = true;
            return true;
        }

        return false;
    }

    /**
     * Draw the player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Draw player body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw border
        ctx.strokeStyle = '#CC0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Draw eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(this.x + 7, this.y + 10, 6, 8);
        ctx.fillRect(this.x + 17, this.y + 10, 6, 8);

        // Draw pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(this.x + 9, this.y + 14, 3, 3);
        ctx.fillRect(this.x + 19, this.y + 14, 3, 3);
    }

    /**
     * Check if player is out of bounds
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {boolean} True if out of bounds
     */
    isOutOfBounds(canvasWidth, canvasHeight) {
        return this.x < -this.width ||
               this.x > canvasWidth ||
               this.y > canvasHeight;
    }

    /**
     * Reset player to starting position
     * @param {number} x - Starting x position
     * @param {number} y - Starting y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = false;
    }
}

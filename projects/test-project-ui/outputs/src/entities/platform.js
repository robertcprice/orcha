/**
 * Platform entity
 */
export class Platform {
    constructor(x, y, width, height, color = '#8B4513', isGoal = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.isGoal = isGoal;
    }

    /**
     * Draw the platform on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        // Draw platform
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Add border
        ctx.strokeStyle = this.isGoal ? '#FFD700' : '#654321';
        ctx.lineWidth = this.isGoal ? 4 : 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // Add goal indicator
        if (this.isGoal) {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GOAL', this.x + this.width / 2, this.y + this.height / 2);
        }
    }

    /**
     * Update platform (currently static, but can be extended for moving platforms)
     * @param {number} deltaTime - Time elapsed since last frame
     */
    update(deltaTime) {
        // Platforms are static for now
        // This method can be extended for moving platforms
    }
}

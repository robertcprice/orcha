/**
 * Collision detection utilities
 */
export class CollisionDetector {
    /**
     * Check if two rectangles are colliding using AABB collision detection
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if rectangles overlap
     */
    static checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Check if player is on top of a platform
     * @param {Object} player - Player object with position and velocity
     * @param {Object} platform - Platform object
     * @returns {boolean} True if player is standing on platform
     */
    static isOnPlatform(player, platform) {
        // Check if player is falling and colliding from above
        const playerBottom = player.y + player.height;
        const platformTop = platform.y;
        const isAbove = playerBottom >= platformTop - 5 && playerBottom <= platformTop + 10;
        const isOverlapping = player.x + player.width > platform.x &&
                            player.x < platform.x + platform.width;

        return isAbove && isOverlapping && player.velocityY >= 0;
    }

    /**
     * Get collision side between two rectangles
     * @param {Object} moving - Moving rectangle
     * @param {Object} stationary - Stationary rectangle
     * @returns {string|null} 'top', 'bottom', 'left', 'right', or null
     */
    static getCollisionSide(moving, stationary) {
        if (!this.checkCollision(moving, stationary)) {
            return null;
        }

        const overlapLeft = (moving.x + moving.width) - stationary.x;
        const overlapRight = (stationary.x + stationary.width) - moving.x;
        const overlapTop = (moving.y + moving.height) - stationary.y;
        const overlapBottom = (stationary.y + stationary.height) - moving.y;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop) return 'top';
        if (minOverlap === overlapBottom) return 'bottom';
        if (minOverlap === overlapLeft) return 'left';
        if (minOverlap === overlapRight) return 'right';

        return null;
    }
}

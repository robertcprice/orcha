class Physics {
    constructor() {
        this.gravity = 1500;
        this.maxFallSpeed = 800;
        this.maxHorizontalSpeed = 600;
    }

    applyGravity(entity, deltaTime) {
        entity.velocity.y += this.gravity * deltaTime;
        if (entity.velocity.y > this.maxFallSpeed) {
            entity.velocity.y = this.maxFallSpeed;
        }
    }

    applyGravityWellForce(entity, well, deltaTime) {
        const dx = well.x - (entity.x + entity.width / 2);
        const dy = well.y - (entity.y + entity.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < well.radius) {
            const forceMultiplier = well.isRepulsion ? -1 : 1;
            const strength = well.strength * (1 - distance / well.radius);

            const angle = Math.atan2(dy, dx);
            const force = strength * forceMultiplier;

            entity.velocity.x += Math.cos(angle) * force * deltaTime;
            entity.velocity.y += Math.sin(angle) * force * deltaTime;
        }
    }

    checkAABBCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    resolveCollision(entity, platform) {
        const overlapLeft = (entity.x + entity.width) - platform.x;
        const overlapRight = (platform.x + platform.width) - entity.x;
        const overlapTop = (entity.y + entity.height) - platform.y;
        const overlapBottom = (platform.y + platform.height) - entity.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
            if (overlapLeft < overlapRight) {
                entity.x = platform.x - entity.width;
                entity.velocity.x = Math.min(0, entity.velocity.x);
            } else {
                entity.x = platform.x + platform.width;
                entity.velocity.x = Math.max(0, entity.velocity.x);
            }
        } else {
            if (overlapTop < overlapBottom) {
                entity.y = platform.y - entity.height;
                entity.velocity.y = Math.min(0, entity.velocity.y);
                entity.onGround = true;
                entity.canDoubleJump = true;
            } else {
                entity.y = platform.y + platform.height;
                entity.velocity.y = Math.max(0, entity.velocity.y);
            }
        }
    }

    clampVelocity(entity) {
        const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);
        const maxSpeed = 1200;

        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            entity.velocity.x *= scale;
            entity.velocity.y *= scale;
        }

        if (Math.abs(entity.velocity.x) > this.maxHorizontalSpeed) {
            entity.velocity.x = Math.sign(entity.velocity.x) * this.maxHorizontalSpeed;
        }
    }

    applyFriction(entity, deltaTime) {
        if (entity.onGround) {
            const friction = 800;
            if (Math.abs(entity.velocity.x) > 0) {
                const sign = Math.sign(entity.velocity.x);
                entity.velocity.x -= sign * friction * deltaTime;
                if (Math.sign(entity.velocity.x) !== sign) {
                    entity.velocity.x = 0;
                }
            }
        }
    }
}

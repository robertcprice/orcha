class Level {
    constructor(levelData) {
        this.platforms = levelData.platforms || [];
        this.hazards = levelData.hazards || [];
        this.collectibles = levelData.collectibles || [];
        this.startPosition = levelData.startPosition || { x: 100, y: 100 };
        this.goal = levelData.goal || { x: 1100, y: 600, width: 60, height: 60 };
        this.background = levelData.background || null;
    }

    render(ctx) {
        if (this.background) {
            ctx.fillStyle = this.background;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        this.platforms.forEach(platform => {
            ctx.fillStyle = platform.color || '#ffffff';
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        });

        this.hazards.forEach(hazard => {
            ctx.save();
            ctx.fillStyle = '#ff3333';

            if (hazard.type === 'spike') {
                const spikeCount = Math.floor(hazard.width / 20);
                for (let i = 0; i < spikeCount; i++) {
                    const x = hazard.x + i * 20;
                    ctx.beginPath();
                    ctx.moveTo(x, hazard.y + hazard.height);
                    ctx.lineTo(x + 10, hazard.y);
                    ctx.lineTo(x + 20, hazard.y + hazard.height);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
            }

            ctx.restore();
        });

        this.collectibles.forEach(star => {
            if (!star.collected) {
                ctx.save();
                ctx.translate(star.x + 10, star.y + 10);
                ctx.rotate(Date.now() * 0.002);

                ctx.fillStyle = '#ffd700';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;

                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const x = Math.cos(angle) * 10;
                    const y = Math.sin(angle) * 10;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    const innerAngle = angle + Math.PI / 5;
                    const innerX = Math.cos(innerAngle) * 5;
                    const innerY = Math.sin(innerAngle) * 5;
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        });

        ctx.save();
        const gradient = ctx.createRadialGradient(
            this.goal.x + this.goal.width / 2,
            this.goal.y + this.goal.height / 2,
            0,
            this.goal.x + this.goal.width / 2,
            this.goal.y + this.goal.height / 2,
            this.goal.width
        );
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#00cc00');
        gradient.addColorStop(1, '#009900');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.goal.x, this.goal.y, this.goal.width, this.goal.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(this.goal.x, this.goal.y, this.goal.width, this.goal.height);

        const pulseSize = Math.sin(Date.now() * 0.003) * 5;
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.goal.x - pulseSize,
            this.goal.y - pulseSize,
            this.goal.width + pulseSize * 2,
            this.goal.height + pulseSize * 2
        );

        ctx.restore();
    }

    checkCollisions(player, physics) {
        this.platforms.forEach(platform => {
            if (physics.checkAABBCollision(player.getBounds(), platform)) {
                physics.resolveCollision(player, platform);
            }
        });
    }

    checkHazards(player) {
        for (let hazard of this.hazards) {
            if (this.checkAABBCollision(player.getBounds(), hazard)) {
                return true;
            }
        }

        if (player.y > 720) {
            return true;
        }

        return false;
    }

    checkCollectibles(player) {
        this.collectibles.forEach(star => {
            if (!star.collected && this.checkAABBCollision(player.getBounds(), star)) {
                star.collected = true;
            }
        });
    }

    checkGoal(player) {
        return this.checkAABBCollision(player.getBounds(), this.goal);
    }

    checkAABBCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    getCollectedStars() {
        return this.collectibles.filter(s => s.collected).length;
    }

    getTotalStars() {
        return this.collectibles.length;
    }

    reset() {
        this.collectibles.forEach(star => star.collected = false);
    }
}

const LEVELS = [
    {
        platforms: [
            { x: 0, y: 650, width: 400, height: 70 },
            { x: 500, y: 550, width: 200, height: 30 },
            { x: 800, y: 450, width: 200, height: 30 },
            { x: 1050, y: 600, width: 230, height: 120 }
        ],
        hazards: [
            { x: 420, y: 630, width: 60, height: 20, type: 'spike' }
        ],
        collectibles: [
            { x: 570, y: 510, width: 20, height: 20, collected: false },
            { x: 870, y: 410, width: 20, height: 20, collected: false }
        ],
        startPosition: { x: 50, y: 550 },
        goal: { x: 1150, y: 540, width: 60, height: 60 }
    },
    {
        platforms: [
            { x: 0, y: 650, width: 200, height: 70 },
            { x: 300, y: 500, width: 150, height: 30 },
            { x: 600, y: 350, width: 150, height: 30 },
            { x: 900, y: 500, width: 150, height: 30 },
            { x: 1100, y: 650, width: 180, height: 70 }
        ],
        hazards: [
            { x: 220, y: 630, width: 60, height: 20, type: 'spike' },
            { x: 470, y: 630, width: 100, height: 20, type: 'spike' },
            { x: 770, y: 630, width: 100, height: 20, type: 'spike' }
        ],
        collectibles: [
            { x: 350, y: 460, width: 20, height: 20, collected: false },
            { x: 650, y: 310, width: 20, height: 20, collected: false },
            { x: 950, y: 460, width: 20, height: 20, collected: false }
        ],
        startPosition: { x: 50, y: 550 },
        goal: { x: 1150, y: 590, width: 60, height: 60 }
    },
    {
        platforms: [
            { x: 0, y: 650, width: 150, height: 70 },
            { x: 250, y: 550, width: 100, height: 30 },
            { x: 450, y: 400, width: 100, height: 30 },
            { x: 650, y: 300, width: 100, height: 30 },
            { x: 850, y: 400, width: 100, height: 30 },
            { x: 1050, y: 550, width: 100, height: 30 },
            { x: 1180, y: 650, width: 100, height: 70 }
        ],
        hazards: [
            { x: 170, y: 630, width: 60, height: 20, type: 'spike' },
            { x: 370, y: 630, width: 60, height: 20, type: 'spike' },
            { x: 570, y: 630, width: 60, height: 20, type: 'spike' },
            { x: 770, y: 630, width: 60, height: 20, type: 'spike' },
            { x: 970, y: 630, width: 60, height: 20, type: 'spike' }
        ],
        collectibles: [
            { x: 280, y: 510, width: 20, height: 20, collected: false },
            { x: 680, y: 260, width: 20, height: 20, collected: false },
            { x: 1080, y: 510, width: 20, height: 20, collected: false }
        ],
        startPosition: { x: 50, y: 550 },
        goal: { x: 1200, y: 590, width: 60, height: 60 }
    }
];

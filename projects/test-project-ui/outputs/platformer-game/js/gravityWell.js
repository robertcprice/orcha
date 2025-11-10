class GravityWell {
    constructor(x, y, isRepulsion = false) {
        this.x = x;
        this.y = y;
        this.radius = 200;
        this.strength = 800;
        this.lifetime = 3000;
        this.age = 0;
        this.isRepulsion = isRepulsion;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = Math.random() * this.radius;
            this.particles.push({
                angle: angle,
                distance: distance,
                speed: 0.5 + Math.random() * 1.5,
                size: 2 + Math.random() * 3,
                alpha: 0.5 + Math.random() * 0.5
            });
        }
    }

    update(deltaTime) {
        this.age += deltaTime * 1000;

        this.particles.forEach(particle => {
            if (this.isRepulsion) {
                particle.distance += particle.speed * 2;
                if (particle.distance > this.radius) {
                    particle.distance = 0;
                }
            } else {
                particle.distance -= particle.speed * 2;
                if (particle.distance < 0) {
                    particle.distance = this.radius;
                }
            }
            particle.angle += deltaTime * 0.5;
        });

        return this.age < this.lifetime;
    }

    render(ctx) {
        const alpha = 1 - (this.age / this.lifetime);

        ctx.save();
        ctx.globalAlpha = alpha * 0.3;

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        if (this.isRepulsion) {
            gradient.addColorStop(0, 'rgba(255, 50, 50, 0.4)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 50, 50, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        this.particles.forEach(particle => {
            const px = this.x + Math.cos(particle.angle) * particle.distance;
            const py = this.y + Math.sin(particle.angle) * particle.distance;

            ctx.fillStyle = this.isRepulsion ?
                `rgba(255, 100, 100, ${particle.alpha})` :
                `rgba(255, 215, 0, ${particle.alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = this.isRepulsion ? '#ff6666' : '#ffd700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.isRepulsion ? '#ff3333' : '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class GravityWellManager {
    constructor() {
        this.wells = [];
        this.maxWells = 2;
        this.cooldown = 2000;
        this.lastPlaced = -this.cooldown;
    }

    canPlace() {
        return Date.now() - this.lastPlaced >= this.cooldown;
    }

    getCooldownProgress() {
        const elapsed = Date.now() - this.lastPlaced;
        return Math.min(1, elapsed / this.cooldown);
    }

    placeWell(x, y, isRepulsion = false) {
        if (!this.canPlace()) return false;

        if (this.wells.length >= this.maxWells) {
            this.wells.shift();
        }

        this.wells.push(new GravityWell(x, y, isRepulsion));
        this.lastPlaced = Date.now();
        return true;
    }

    update(deltaTime) {
        this.wells = this.wells.filter(well => well.update(deltaTime));
    }

    render(ctx) {
        this.wells.forEach(well => well.render(ctx));
    }

    clear() {
        this.wells = [];
    }
}

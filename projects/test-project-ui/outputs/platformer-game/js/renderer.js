class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particleEffects = [];
    }

    clear() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(1, '#1a1a3e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderStarField();
    }

    renderStarField() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const starCount = 100;
        const seed = 12345;

        for (let i = 0; i < starCount; i++) {
            const x = (seed * i * 9301 + 49297) % this.canvas.width;
            const y = (seed * i * 4339 + 17569) % this.canvas.height;
            const size = ((seed * i * 7919) % 3) / 2;

            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    render(level, player, gravityWellManager) {
        this.clear();

        if (level) {
            level.render(this.ctx);
        }

        if (gravityWellManager) {
            gravityWellManager.render(this.ctx);
        }

        if (player) {
            player.render(this.ctx);
        }

        this.updateParticleEffects();
        this.renderParticleEffects();
    }

    addParticleEffect(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 100 + Math.random() * 100;
            this.particleEffects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02,
                size: 3 + Math.random() * 3,
                color: color
            });
        }
    }

    updateParticleEffects() {
        const deltaTime = 1 / 60;
        this.particleEffects = this.particleEffects.filter(particle => {
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.life -= particle.decay;
            return particle.life > 0;
        });
    }

    renderParticleEffects() {
        this.particleEffects.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    renderText(text, x, y, size = 24, color = '#ffffff') {
        this.ctx.save();
        this.ctx.font = `bold ${size}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }
}

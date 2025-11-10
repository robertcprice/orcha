class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velocity = { x: 0, y: 0 };
        this.speed = 200;
        this.jumpForce = 600;
        this.onGround = false;
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        this.trail = [];
        this.maxTrailLength = 15;
    }

    update(deltaTime, input) {
        this.onGround = false;

        if (input.left) {
            this.velocity.x = -this.speed;
        } else if (input.right) {
            this.velocity.x = this.speed;
        }

        if (input.jump && this.onGround) {
            this.velocity.y = -this.jumpForce;
            this.hasDoubleJumped = false;
        } else if (input.jump && this.canDoubleJump && !this.hasDoubleJumped && !this.onGround) {
            this.velocity.y = -this.jumpForce * 0.8;
            this.hasDoubleJumped = true;
            this.canDoubleJump = false;
        }

        this.trail.push({ x: this.x + this.width / 2, y: this.y + this.height / 2 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
    }

    move(deltaTime) {
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
    }

    render(ctx) {
        ctx.save();

        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const size = (i / this.trail.length) * 8;
            const alpha = (i / this.trail.length) * 0.6;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        const gradient = ctx.createRadialGradient(
            this.x + this.width / 2,
            this.y + this.height / 2,
            0,
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.width
        );
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(0.7, '#0099cc');
        gradient.addColorStop(1, '#006699');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = '#ffffff';
        const eyeSize = 4;
        const eyeOffsetX = 8;
        const eyeOffsetY = 10;
        ctx.fillRect(this.x + eyeOffsetX, this.y + eyeOffsetY, eyeSize, eyeSize);
        ctx.fillRect(this.x + this.width - eyeOffsetX - eyeSize, this.y + eyeOffsetY, eyeSize, eyeSize);

        ctx.restore();
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0 };
        this.onGround = false;
        this.canDoubleJump = false;
        this.hasDoubleJumped = false;
        this.trail = [];
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

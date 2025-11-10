class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.physics = new Physics();
        this.gravityWellManager = new GravityWellManager();

        this.currentLevelIndex = 0;
        this.level = null;
        this.player = null;

        this.input = {
            left: false,
            right: false,
            jump: false,
            jumpPressed: false
        };

        this.state = 'menu';
        this.lastTime = 0;

        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('tutorial-button').addEventListener('click', () => this.showTutorial());
        document.getElementById('close-tutorial').addEventListener('click', () => this.hideTutorial());
        document.getElementById('resume-button').addEventListener('click', () => this.resumeGame());
        document.getElementById('restart-button').addEventListener('click', () => this.restartLevel());
        document.getElementById('menu-button').addEventListener('click', () => this.showMenu());
        document.getElementById('next-level-button').addEventListener('click', () => this.nextLevel());
        document.getElementById('replay-button').addEventListener('click', () => this.restartLevel());
        document.getElementById('retry-button').addEventListener('click', () => this.restartLevel());
        document.getElementById('death-menu-button').addEventListener('click', () => this.showMenu());
    }

    handleKeyDown(e) {
        if (this.state !== 'playing') return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.input.left = true;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.input.right = true;
                break;
            case ' ':
                if (!this.input.jumpPressed) {
                    this.input.jump = true;
                    this.input.jumpPressed = true;
                }
                e.preventDefault();
                break;
            case 'Escape':
                this.pauseGame();
                break;
            case 'r':
            case 'R':
                this.restartLevel();
                break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.input.left = false;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.input.right = false;
                break;
            case ' ':
                this.input.jump = false;
                this.input.jumpPressed = false;
                break;
        }
    }

    handleMouseClick(e) {
        if (this.state !== 'playing') return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const isRepulsion = e.button === 2;
        const placed = this.gravityWellManager.placeWell(x, y, isRepulsion);

        if (placed) {
            this.renderer.addParticleEffect(x, y, isRepulsion ? '#ff6666' : '#ffd700', 15);
        }
    }

    startGame() {
        this.currentLevelIndex = 0;
        this.loadLevel(this.currentLevelIndex);
        this.hideAllOverlays();
        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    loadLevel(index) {
        if (index >= LEVELS.length) {
            this.showMenu();
            alert('Congratulations! You completed all levels!');
            return;
        }

        this.level = new Level(LEVELS[index]);
        this.player = new Player(this.level.startPosition.x, this.level.startPosition.y);
        this.gravityWellManager.clear();
        this.updateUI();
    }

    restartLevel() {
        this.level.reset();
        this.player.reset(this.level.startPosition.x, this.level.startPosition.y);
        this.gravityWellManager.clear();
        this.hideAllOverlays();
        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    nextLevel() {
        this.currentLevelIndex++;
        this.loadLevel(this.currentLevelIndex);
        this.hideAllOverlays();
        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.showOverlay('pause-overlay');
        }
    }

    resumeGame() {
        this.hideAllOverlays();
        this.state = 'playing';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    showMenu() {
        this.state = 'menu';
        this.hideAllOverlays();
        this.showOverlay('menu-overlay');
    }

    showTutorial() {
        this.hideAllOverlays();
        this.showOverlay('tutorial-overlay');
    }

    hideTutorial() {
        this.hideAllOverlays();
        this.showOverlay('menu-overlay');
    }

    showOverlay(id) {
        document.getElementById(id).classList.add('active');
    }

    hideAllOverlays() {
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
    }

    updateUI() {
        document.getElementById('current-level').textContent = this.currentLevelIndex + 1;

        if (this.level) {
            document.getElementById('stars-count').textContent = this.level.getCollectedStars();
            document.getElementById('stars-total').textContent = this.level.getTotalStars();
        }

        const progress = this.gravityWellManager.getCooldownProgress();
        document.getElementById('cooldown-fill').style.width = `${progress * 100}%`;
        document.getElementById('cooldown-text').textContent =
            progress >= 1 ? 'Gravity Well Ready' : 'Recharging...';
    }

    gameLoop(currentTime) {
        if (this.state !== 'playing') return;

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        this.player.update(deltaTime, this.input);

        this.physics.applyGravity(this.player, deltaTime);

        this.gravityWellManager.wells.forEach(well => {
            this.physics.applyGravityWellForce(this.player, well, deltaTime);
        });

        this.physics.clampVelocity(this.player);

        this.player.move(deltaTime);

        this.level.checkCollisions(this.player, this.physics);

        if (!this.input.left && !this.input.right) {
            this.physics.applyFriction(this.player, deltaTime);
        }

        this.gravityWellManager.update(deltaTime);

        this.level.checkCollectibles(this.player);

        if (this.level.checkHazards(this.player)) {
            this.handleDeath();
        }

        if (this.level.checkGoal(this.player)) {
            this.handleWin();
        }

        this.updateUI();
    }

    render() {
        this.renderer.render(this.level, this.player, this.gravityWellManager);
    }

    handleDeath() {
        this.state = 'dead';
        this.renderer.addParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#00ffff',
            30
        );
        this.showOverlay('death-overlay');
    }

    handleWin() {
        this.state = 'won';
        this.renderer.addParticleEffect(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            '#00ff00',
            40
        );

        document.getElementById('win-stars').textContent = this.level.getCollectedStars();
        document.getElementById('win-total').textContent = this.level.getTotalStars();

        this.showOverlay('win-overlay');
    }
}

const game = new Game();

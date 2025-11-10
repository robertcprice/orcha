// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.5;
const JUMP_STRENGTH = -12;
const MOVE_SPEED = 5;
const GROUND_Y = canvas.height - 50;

// Game State
let gameState = {
    score: 0,
    lives: 3,
    gameOver: false,
    gameWon: false
};

// Player Object
const player = {
    x: 50,
    y: GROUND_Y - 40,
    width: 30,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    color: '#FF6B6B'
};

// Input Handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Platforms
const platforms = [
    // Ground
    { x: 0, y: GROUND_Y, width: canvas.width, height: 50, color: '#8B4513' },

    // Floating platforms
    { x: 150, y: 450, width: 120, height: 20, color: '#228B22' },
    { x: 350, y: 380, width: 100, height: 20, color: '#228B22' },
    { x: 550, y: 320, width: 120, height: 20, color: '#228B22' },
    { x: 300, y: 250, width: 100, height: 20, color: '#228B22' },
    { x: 500, y: 180, width: 150, height: 20, color: '#228B22' },
    { x: 200, y: 120, width: 100, height: 20, color: '#228B22' }
];

// Collectibles (coins)
const coins = [
    { x: 200, y: 420, width: 20, height: 20, collected: false },
    { x: 390, y: 350, width: 20, height: 20, collected: false },
    { x: 600, y: 290, width: 20, height: 20, collected: false },
    { x: 350, y: 220, width: 20, height: 20, collected: false },
    { x: 560, y: 150, width: 20, height: 20, collected: false },
    { x: 240, y: 90, width: 20, height: 20, collected: false }
];

// Obstacles (spikes)
const obstacles = [
    { x: 280, y: GROUND_Y - 15, width: 30, height: 15, color: '#FF0000' },
    { x: 470, y: 365, width: 30, height: 15, color: '#FF0000' },
    { x: 680, y: 305, width: 30, height: 15, color: '#FF0000' }
];

// Goal
const goal = {
    x: 700,
    y: 40,
    width: 40,
    height: 40,
    color: '#FFD700'
};

// Update Player Position
function updatePlayer() {
    if (gameState.gameOver || gameState.gameWon) return;

    // Horizontal movement
    player.velocityX = 0;
    if (keys['ArrowLeft'] || keys['a']) {
        player.velocityX = -MOVE_SPEED;
    }
    if (keys['ArrowRight'] || keys['d']) {
        player.velocityX = MOVE_SPEED;
    }

    // Jumping
    if ((keys[' '] || keys['ArrowUp'] || keys['w']) && !player.isJumping) {
        player.velocityY = JUMP_STRENGTH;
        player.isJumping = true;
    }

    // Apply gravity
    player.velocityY += GRAVITY;

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Boundary checks
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Platform collision
    let onPlatform = false;
    platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            // Landing on platform from above
            if (player.velocityY > 0 && player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                onPlatform = true;
            }
        }
    });

    // Coin collection
    coins.forEach(coin => {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            gameState.score += 10;
            updateScore();
        }
    });

    // Obstacle collision
    obstacles.forEach(obstacle => {
        if (checkCollision(player, obstacle)) {
            handleDeath();
        }
    });

    // Goal reached
    if (checkCollision(player, goal)) {
        gameState.gameWon = true;
        endGame(true);
    }

    // Fall off screen
    if (player.y > canvas.height) {
        handleDeath();
    }
}

// Collision Detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Handle Player Death
function handleDeath() {
    gameState.lives--;
    updateLives();

    if (gameState.lives <= 0) {
        gameState.gameOver = true;
        endGame(false);
    } else {
        // Reset player position
        player.x = 50;
        player.y = GROUND_Y - 40;
        player.velocityX = 0;
        player.velocityY = 0;
        player.isJumping = false;
    }
}

// Draw Functions
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 8, player.y + 10, 5, 5);
    ctx.fillRect(player.x + 17, player.y + 10, 5, 5);
}

function drawPlatforms() {
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

        // Add texture
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
}

function drawCoins() {
    coins.forEach(coin => {
        if (!coin.collected) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // Coin shine
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width / 2 - 3, coin.y + coin.height / 2 - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y - obstacle.height);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
        ctx.closePath();
        ctx.fill();
    });
}

function drawGoal() {
    ctx.fillStyle = goal.color;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    // Draw star pattern
    ctx.fillStyle = '#FFF';
    ctx.font = '30px Arial';
    ctx.fillText('★', goal.x + 5, goal.y + 32);
}

function drawBackground() {
    // Sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    drawCloud(100, 50);
    drawCloud(400, 80);
    drawCloud(650, 60);
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

// UI Updates
function updateScore() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
}

function updateLives() {
    document.getElementById('lives').textContent = `Lives: ${gameState.lives}`;
}

function endGame(won) {
    const restartBtn = document.getElementById('restartBtn');
    restartBtn.style.display = 'block';

    // Draw game over/won message on canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    if (won) {
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
    } else {
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
    }
    ctx.textAlign = 'left';
}

// Game Loop
function gameLoop() {
    if (!gameState.gameOver && !gameState.gameWon) {
        // Clear canvas
        drawBackground();

        // Update
        updatePlayer();

        // Draw
        drawPlatforms();
        drawCoins();
        drawObstacles();
        drawGoal();
        drawPlayer();
    }

    requestAnimationFrame(gameLoop);
}

// Restart Game
document.getElementById('restartBtn').addEventListener('click', () => {
    // Reset game state
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameOver = false;
    gameState.gameWon = false;

    // Reset player
    player.x = 50;
    player.y = GROUND_Y - 40;
    player.velocityX = 0;
    player.velocityY = 0;
    player.isJumping = false;

    // Reset coins
    coins.forEach(coin => coin.collected = false);

    // Update UI
    updateScore();
    updateLives();
    document.getElementById('restartBtn').style.display = 'none';
});

// Start Game
updateScore();
updateLives();
gameLoop();

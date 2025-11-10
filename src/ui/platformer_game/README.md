# Platformer Game

A simple browser-based platformer game built with HTML5 Canvas and vanilla JavaScript.

## Game Overview

Navigate through platforms, collect coins, avoid obstacles, and reach the golden star to win!

## Features

- **Player Movement**: Smooth left/right movement and jumping mechanics
- **Physics**: Realistic gravity and collision detection
- **Platforms**: Multiple platforms at different heights to navigate
- **Collectibles**: 6 coins scattered throughout the level (10 points each)
- **Obstacles**: Red spikes that reduce player lives
- **Lives System**: 3 lives to complete the level
- **Goal**: Reach the golden star at the top to win
- **Scoring**: Collect coins to increase your score

## Controls

- **Arrow Keys** or **WASD**: Move left/right
- **Space** or **Up Arrow** or **W**: Jump

## How to Play

1. Open `index.html` in a web browser
2. Use the controls to navigate the platforms
3. Collect yellow coins for points
4. Avoid red spike obstacles
5. Reach the golden star at the top to win

## Game Mechanics

### Player
- Size: 30x40 pixels
- Jump strength: -12 (upward velocity)
- Move speed: 5 pixels per frame
- Gravity: 0.5 pixels per frame squared

### Platforms
- Ground platform at the bottom
- 6 floating green platforms at various heights
- Collision detection from above (can jump through from below)

### Collectibles
- 6 coins worth 10 points each
- Maximum possible score: 60 points

### Obstacles
- 3 red spike obstacles
- Contact with spikes reduces lives by 1
- Player respawns at starting position after hit

### Lives
- Start with 3 lives
- Game over when all lives are lost
- Can restart after game over

## Technical Implementation

### Technologies Used
- HTML5 Canvas for rendering
- Vanilla JavaScript for game logic
- CSS3 for styling and layout

### Core Systems
1. **Game Loop**: RequestAnimationFrame-based loop for smooth 60fps gameplay
2. **Physics Engine**: Custom gravity and velocity system
3. **Collision Detection**: AABB (Axis-Aligned Bounding Box) collision
4. **Input Handling**: Keyboard event listeners for responsive controls
5. **State Management**: Game state object tracking score, lives, and game status

### Code Structure
- `index.html`: Game container and UI elements
- `style.css`: Styling for game container and UI
- `game.js`: Complete game logic including:
  - Player physics and movement
  - Platform collision detection
  - Coin collection system
  - Obstacle interaction
  - Win/lose conditions
  - Rendering functions

## Game Design

### Level Layout
The level is designed with increasing difficulty:
1. Easy jumps near the ground
2. Medium difficulty middle platforms
3. Challenging upper platforms requiring precision
4. Strategic coin placement to guide player path
5. Obstacles placed to test timing and awareness

### Difficulty Curve
- Initial platforms are easier to reach
- Platforms get smaller and farther apart as you climb
- Obstacles increase in frequency at higher levels
- Final jump to the goal requires collecting most coins

## Future Enhancements

Possible improvements:
- Multiple levels
- Enemy AI
- Power-ups (double jump, invincibility)
- Sound effects and music
- Mobile touch controls
- High score persistence
- Animated sprites
- Particle effects

## License

This is a simple educational project created for learning game development concepts.

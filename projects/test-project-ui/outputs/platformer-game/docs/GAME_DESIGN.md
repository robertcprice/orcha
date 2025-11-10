# Gravity Flux - Platformer Game Design Document

## Game Concept
A physics-based platformer where players manipulate gravity to navigate challenging levels. Players can create "gravity wells" that pull or push them in custom directions, enabling creative solutions to platforming challenges.

## Core Mechanics

### 1. Movement
- **WASD/Arrow Keys**: Standard platformer movement
- **Space**: Jump (with double-jump capability)
- **Left/Right Movement**: Smooth acceleration/deceleration
- **Air Control**: Reduced but present for player comfort

### 2. Gravity Wells (Unique Feature)
- **Right Click**: Place gravity well at cursor position
- **Effect**: Creates attraction/repulsion zone
- **Cooldown**: 2-second recharge between wells
- **Duration**: 3 seconds per well
- **Visual**: Glowing particle effect with directional indicators
- **Limit**: Maximum 2 active wells at once

### 3. Physics System
- **Base Gravity**: Downward pull (standard platformer)
- **Well Gravity**: Directional pull/push from gravity wells
- **Momentum**: Velocity preservation when entering wells
- **Max Velocity**: Cap to prevent uncontrollable speeds
- **Collision**: AABB (Axis-Aligned Bounding Box) detection

## Level Design Philosophy

### Progressive Difficulty
1. **Tutorial Levels (1-3)**: Basic movement + single gravity well usage
2. **Intermediate (4-7)**: Multiple wells, timing challenges
3. **Advanced (8-10)**: Complex well chains, precise timing

### Level Elements
- **Platforms**: Static, moving, crumbling
- **Hazards**: Spikes, pits, moving obstacles
- **Collectibles**: Stars/gems for optional challenge
- **Checkpoints**: Mid-level respawn points
- **Goal**: End portal/flag

## Visual Style
- **Art Direction**: Minimalist geometric design
- **Color Palette**:
  - Background: Deep space blues/purples
  - Player: Bright cyan
  - Platforms: White/light gray
  - Gravity Wells: Pulsing yellow/orange
  - Hazards: Red
- **Particle Effects**: Trailing effects for movement, well activation
- **UI**: Clean, non-intrusive HUD showing cooldowns

## Technical Architecture

### File Structure
```
platformer-game/
├── index.html          # Entry point
├── css/
│   └── style.css       # Minimal styling
├── js/
│   ├── game.js         # Main game loop
│   ├── player.js       # Player character logic
│   ├── physics.js      # Physics engine
│   ├── gravityWell.js  # Gravity well system
│   ├── level.js        # Level management
│   └── renderer.js     # Canvas rendering
└── assets/
    └── levels.json     # Level definitions
```

### Technologies
- **HTML5 Canvas**: Rendering
- **Vanilla JavaScript**: Game logic (ES6+)
- **CSS3**: UI/styling
- **localStorage**: Progress saving

## Game Loop
```
1. Input Processing
2. Physics Update
   - Apply base gravity
   - Apply gravity well forces
   - Update velocities
   - Handle collisions
3. Game State Update
   - Update player position
   - Update gravity wells (lifetime, cooldowns)
   - Check win/lose conditions
4. Render Frame
   - Clear canvas
   - Draw background
   - Draw platforms/hazards
   - Draw gravity wells + particles
   - Draw player + trail effect
   - Draw UI
5. Request next frame
```

## Player Character Stats
- **Size**: 32x32 pixels
- **Base Speed**: 200 px/s
- **Jump Force**: 600 px/s
- **Gravity**: 1500 px/s²
- **Max Fall Speed**: 800 px/s
- **Well Pull Force**: 400-800 px/s² (distance-based)

## Success Metrics
- **Playable**: Smooth 60 FPS gameplay
- **Learnable**: Clear tutorial introducing mechanics
- **Challenging**: Difficulty curve from easy to hard
- **Replayable**: Collectibles and time trials
- **Unique**: Gravity well mechanic feels fresh and fun

## Future Expansion Ideas
- **Level Editor**: Community-created levels
- **Speedrun Mode**: Timer + leaderboards
- **Additional Mechanics**: Wall-sliding, dash ability
- **Mobile Support**: Touch controls adaptation
- **Multiplayer**: Race mode or cooperative puzzles

# Gravity Flux - Browser Platformer Game

A unique physics-based platformer where players manipulate gravity to navigate challenging levels.

## Unique Feature: Gravity Wells

Unlike traditional platformers, Gravity Flux allows players to create temporary gravity wells that pull or push them in custom directions. This mechanic enables creative solutions to platforming challenges and adds a puzzle-solving element to the gameplay.

## How to Play

### Controls
- **Arrow Keys / WASD**: Move left and right
- **Space**: Jump (press twice for double jump)
- **Left Click**: Create attraction gravity well at cursor
- **Right Click**: Create repulsion gravity well at cursor
- **R**: Restart current level
- **Escape**: Pause game

### Gameplay
1. Navigate through platforms to reach the green goal
2. Avoid red hazards (spikes and pits)
3. Collect golden stars for bonus points
4. Use gravity wells strategically to reach difficult areas
5. Chain multiple wells together for complex maneuvers

### Gravity Well Mechanics
- **Cooldown**: 2 seconds between well placements
- **Duration**: Each well lasts 3 seconds
- **Limit**: Maximum 2 active wells at once
- **Range**: Wells affect objects within their visible radius
- **Types**:
  - Attraction (Left Click): Pulls you toward the well
  - Repulsion (Right Click): Pushes you away from the well

## Project Structure

```
platformer-game/
├── index.html          # Game entry point
├── css/
│   └── style.css       # UI styling
├── js/
│   ├── game.js         # Main game loop and state management
│   ├── player.js       # Player character logic
│   ├── physics.js      # Physics engine (gravity, collisions)
│   ├── gravityWell.js  # Gravity well system
│   ├── level.js        # Level management and data
│   └── renderer.js     # Canvas rendering
├── docs/
│   ├── GAME_DESIGN.md      # Comprehensive design document
│   └── RESEARCH_FINDINGS.md # Platformer research and concept
└── README.md           # This file
```

## Technical Details

### Technologies Used
- **HTML5 Canvas**: For 2D rendering
- **Vanilla JavaScript (ES6+)**: Game logic
- **CSS3**: UI styling and overlays

### Architecture
- **Component-based design**: Separate classes for player, physics, rendering
- **Custom physics engine**: No external dependencies
- **State management**: Clean state transitions (menu → playing → paused → won/dead)
- **60 FPS gameplay**: RequestAnimationFrame loop

### Performance
- Optimized particle effects
- Efficient collision detection (AABB)
- Smooth 60 FPS on modern browsers
- Canvas size: 1280x720 (responsive scaling)

## Installation

1. Simply open `index.html` in a modern web browser
2. No build process or dependencies required
3. Works offline once loaded

## Browser Support

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ⚠️ Keyboard/mouse required (desktop only)

## Levels

### Level 1 (Tutorial)
- Simple jumps with gravity well introduction
- 2 stars to collect

### Level 2 (Intermediate)
- Multiple gaps requiring gravity well chains
- 3 stars to collect

### Level 3 (Advanced)
- Complex platforming with precise timing
- 3 stars to collect

## Future Enhancements

- Additional levels with increasing difficulty
- Level editor for community content
- Speedrun timer and leaderboards
- Mobile touch controls
- Additional mechanics (wall-sliding, dash)
- Sound effects and music
- Save system for progress

## Credits

Developed as a unique browser-based platformer game with gravity manipulation mechanics.

## License

Educational/demonstration project - free to use and modify.

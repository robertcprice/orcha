/**
 * Input handler for keyboard controls
 */
export class InputHandler {
    constructor() {
        this.keys = {};
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            // Prevent default for arrow keys and space to avoid page scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    isPressed(key) {
        return this.keys[key] || false;
    }

    isLeft() {
        return this.isPressed('ArrowLeft') || this.isPressed('a') || this.isPressed('A');
    }

    isRight() {
        return this.isPressed('ArrowRight') || this.isPressed('d') || this.isPressed('D');
    }

    isJump() {
        return this.isPressed('ArrowUp') || this.isPressed(' ') ||
               this.isPressed('w') || this.isPressed('W');
    }
}

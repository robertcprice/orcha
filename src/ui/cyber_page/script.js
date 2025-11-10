'use strict';

(function () {
  const PHRASE_ATTRIBUTE = 'data-glitch-text';

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeroTyping() {
    const heroEl = document.querySelector('.hero-text');
    if (!heroEl) {
      return;
    }

    let phrases;
    try {
      const raw = heroEl.getAttribute('data-phrases');
      phrases = raw ? JSON.parse(raw) : [];
    } catch (error) {
      phrases = [];
    }

    if (!Array.isArray(phrases) || phrases.length === 0) {
      phrases = [heroEl.textContent.trim() || 'Cyber Brutalist Portal'];
    }

    const updateGlitchAttribute = (value) => {
      heroEl.setAttribute(PHRASE_ATTRIBUTE, value);
    };

    const firstPhrase = phrases[0];
    heroEl.textContent = '';
    updateGlitchAttribute(firstPhrase);

    if (phrases.length === 1 || prefersReducedMotion()) {
      heroEl.textContent = firstPhrase;
      updateGlitchAttribute(firstPhrase);
      return;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let typingForward = true;

    const typeSpeed = 90;
    const deleteSpeed = 45;
    const holdDuration = 1400;

    const schedule = (callback, baseDelay) => {
      const variance = Math.random() * 60;
      setTimeout(callback, baseDelay + variance);
    };

    const typeLoop = () => {
      const currentPhrase = phrases[phraseIndex];

      if (typingForward) {
        if (charIndex < currentPhrase.length) {
          charIndex += 1;
          const nextText = currentPhrase.slice(0, charIndex);
          heroEl.textContent = nextText;
          updateGlitchAttribute(nextText || ' ');
          schedule(typeLoop, typeSpeed);
          return;
        }

        typingForward = false;
        setTimeout(typeLoop, holdDuration);
        return;
      }

      if (charIndex > 0) {
        charIndex -= 1;
        const nextText = currentPhrase.slice(0, charIndex);
        heroEl.textContent = nextText;
        updateGlitchAttribute(nextText || ' ');
        schedule(typeLoop, deleteSpeed);
        return;
      }

      typingForward = true;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(typeLoop, 300);
    };

    setTimeout(typeLoop, 500);
  }

  function initGlitchEffects() {
    const targets = Array.from(document.querySelectorAll('[data-glitch]'));
    if (targets.length === 0) {
      return;
    }

    targets.forEach((target) => {
      if (!target.getAttribute(PHRASE_ATTRIBUTE)) {
        target.setAttribute(PHRASE_ATTRIBUTE, target.textContent.trim());
      }
    });

    if (prefersReducedMotion()) {
      return;
    }

    const triggerGlitch = (el) => {
      if (el.classList.contains('is-glitching')) {
        scheduleNext(el);
        return;
      }

      el.classList.add('is-glitching');
      const duration = 120 + Math.random() * 220;
      setTimeout(() => {
        el.classList.remove('is-glitching');
        scheduleNext(el);
      }, duration);
    };

    const scheduleNext = (el) => {
      const delay = 1200 + Math.random() * 4800;
      setTimeout(() => triggerGlitch(el), delay);
    };

    targets.forEach((target) => scheduleNext(target));
  }

  function initMatrixRain() {
    const canvas = document.getElementById('matrix-rain');
    if (!canvas || prefersReducedMotion()) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const fontSize = 16;
    const characters = Array.from('アイウエオカキクケコサシスセソ0123456789#*+=<>?');
    let width = 0;
    let height = 0;
    let columns = 0;
    let animationFrameId = null;
    const drops = [];

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(pixelRatio, pixelRatio);
      columns = Math.ceil(width / fontSize);
      drops.length = columns;
      for (let index = 0; index < columns; index += 1) {
        drops[index] = Math.floor(Math.random() * height / fontSize);
      }
    };

    const draw = () => {
      context.fillStyle = 'rgba(5, 6, 8, 0.08)';
      context.fillRect(0, 0, width, height);

      context.fillStyle = 'rgba(47, 255, 188, 0.85)';
      context.font = `${fontSize}px ${getComputedStyle(document.body).fontFamily || 'monospace'}`;

      for (let index = 0; index < drops.length; index += 1) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        const x = index * fontSize;
        const y = drops[index] * fontSize;

        context.fillText(text, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[index] = 0;
        } else {
          drops[index] += 1;
        }
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    const handleResize = () => {
      resizeCanvas();
    };

    resizeCanvas();
    draw();
    window.addEventListener('resize', handleResize);
  }

  function initTerminalSimulation() {
    const terminalEl = document.querySelector('[data-terminal]');
    if (!terminalEl) {
      return;
    }

    const outputEl = terminalEl.querySelector('[data-terminal-output]');
    const promptEl = terminalEl.querySelector('[data-terminal-prompt]');
    const commandEl = terminalEl.querySelector('[data-terminal-command]');
    const pathEl = terminalEl.querySelector('.terminal__path');

    if (!outputEl || !promptEl || !commandEl) {
      return;
    }

    const promptPrefix = pathEl ? pathEl.textContent.trim() : '$';

    const script = [
      {
        command: 'boot_sequence --init',
        output: [
          '[OK] Power relays engaged',
          '[OK] Neural uplink synchronized',
          '[OK] Sensory grid calibrated'
        ],
        pause: 800
      },
      {
        command: 'diagnostics --all',
        output: [
          '[WARN] Signal noise detected on channel 7',
          '[OK] Thermal variance nominal'
        ],
        pause: 900
      },
      {
        command: 'deploy --module="glitch-shield"',
        output: [
          '[OK] Quantum barrier activated',
          '[OK] Threat countermeasures armed'
        ],
        pause: 1100
      },
      {
        command: 'status --summary',
        output: [
          'Uplink latency: 4.2ms',
          'Subroutines active: 17',
          'Signal integrity: 99.2%'
        ],
        pause: 0
      }
    ];

    const appendLine = (text, modifier) => {
      const line = document.createElement('div');
      line.classList.add('terminal__line');
      if (modifier) {
        line.classList.add(modifier);
      }
      line.textContent = text;
      outputEl.appendChild(line);
      outputEl.scrollTop = outputEl.scrollHeight;
    };

    if (prefersReducedMotion()) {
      script.forEach((entry) => {
        appendLine(`${promptPrefix} ${entry.command}`, 'terminal__line--command');
        entry.output.forEach((line) => appendLine(line));
      });
      commandEl.textContent = '';
      return;
    }

    const typeCommand = (text) =>
      new Promise((resolve) => {
        let index = 0;

        const typeNext = () => {
          if (index <= text.length) {
            commandEl.textContent = text.slice(0, index);
            index += 1;
            if (index <= text.length) {
              const delay = 60 + Math.random() * 40;
              setTimeout(typeNext, delay);
              return;
            }
          }

          resolve();
        };

        typeNext();
      });

    const wait = (duration) =>
      new Promise((resolve) => setTimeout(resolve, duration));

    const run = async () => {
      for (const entry of script) {
        await typeCommand(entry.command);
        appendLine(`${promptPrefix} ${entry.command}`, 'terminal__line--command');
        commandEl.textContent = '';
        await wait(200);
        for (const line of entry.output) {
          await wait(220 + Math.random() * 160);
          appendLine(line);
        }
        if (entry.pause) {
          await wait(entry.pause);
        }
      }
    };

    run();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeroTyping();
    initGlitchEffects();
    initMatrixRain();
    initTerminalSimulation();
  });
})();

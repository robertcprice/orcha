'use client';
'use client';

import { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

interface ParticleBackgroundProps {
  isActive?: boolean;
  activeNodes?: Array<{ x: number; y: number }>;
  particleColor?: string; // RGB string like "255,255,255"
}

export default function ParticleBackground({ isActive = false, activeNodes = [], particleColor = "255,255,255" }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const wasActiveRef = useRef(false);
  const burstTimeRef = useRef(0);
  const particleColorRef = useRef(particleColor);

  // Update color ref when prop changes (doesn't trigger re-render)
  useEffect(() => {
    particleColorRef.current = particleColor;
  }, [particleColor]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initParticles = () => {
      particlesRef.current = [];
      const particleCount = 200; // Increased particle count for better visibility

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          vx: 0,
          vy: 0,
          size: Math.random() * 2.5 + 1.5, // Larger particles (1.5-4px)
          alpha: Math.random() * 0.5 + 0.4, // More visible opacity (0.4-0.9)
          life: Math.random() * 100,
        });
      }
    };

    // Only initialize particles if we have valid dimensions
    if (dimensions.width > 0 && dimensions.height > 0) {
      // Initialize if no particles exist, or if dimensions changed significantly
      if (particlesRef.current.length === 0 ||
          Math.abs(dimensions.width - (canvas.width || 0)) > 10) {
        initParticles();
      }
    } else {
      return; // Don't start animation with invalid dimensions
    }

    let breathPhase = 0;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // S-curve easing function (ease-in-out cubic)
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animate = () => {
      // Detect task submission (inactive -> active transition)
      if (isActive && !wasActiveRef.current) {
        burstTimeRef.current = Date.now();
        wasActiveRef.current = true;
      } else if (!isActive) {
        wasActiveRef.current = false;
      }

      // Clear canvas completely (fully transparent so particles show against page background)
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      breathPhase += 0.015; // Breathing cycle: ~7 seconds total (3.5s out, 3.5s in)
      const rawBreath = Math.sin(breathPhase); // -1 to +1
      const easedBreath = easeInOutCubic((rawBreath + 1) / 2) * 2 - 1; // Apply S-curve

      // Calculate burst intensity (fades over 2 seconds after task submission)
      const timeSinceBurst = Date.now() - burstTimeRef.current;
      const burstIntensity = isActive && timeSinceBurst < 2000
        ? Math.max(0, 1 - (timeSinceBurst / 2000))
        : 0;

      particlesRef.current.forEach((particle) => {
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (burstIntensity > 0) {
          // BURST EFFECT: Push particles to edges when task is submitted
          if (dist > 0) {
            const burstForce = burstIntensity * 25 * easeInOutCubic(burstIntensity);
            particle.vx = (dx / dist) * burstForce;
            particle.vy = (dy / dist) * burstForce;
          }
        } else if (isActive && activeNodes.length > 0) {
          // REACTIVE: Repel from active agent nodes
          activeNodes.forEach(node => {
            const nodeX = (node.x / 100) * dimensions.width;
            const nodeY = (node.y / 100) * dimensions.height;
            const ndx = particle.x - nodeX;
            const ndy = particle.y - nodeY;
            const ndist = Math.sqrt(ndx * ndx + ndy * ndy);

            if (ndist < 250) {
              const force = (250 - ndist) / 250 * 3;
              particle.vx += (ndx / ndist) * force;
              particle.vy += (ndy / ndist) * force;
            }
          });
          // Damping when reactive
          particle.vx *= 0.95;
          particle.vy *= 0.95;
        } else {
          // IDLE BREATHING: Slow, subtle breathing from center with S-curve
          if (dist > 0) {
            const breathForce = easedBreath * 0.3; // Very subtle
            particle.vx = (dx / dist) * breathForce;
            particle.vy = (dy / dist) * breathForce;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Keep particles on screen without wrapping
        particle.x = Math.max(0, Math.min(dimensions.width, particle.x));
        particle.y = Math.max(0, Math.min(dimensions.height, particle.y));

        // Draw particle with higher visibility
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        // Use full alpha when active, slightly reduced when idle for subtle effect
        const alphaMultiplier = isActive ? 1.0 : 0.8;
        ctx.fillStyle = `rgba(${particleColorRef.current}, ${particle.alpha * alphaMultiplier})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions, isActive, activeNodes]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  z: number;
}

const COUNT = 1500;
const SPREAD = 10;
const FOV = 400; // perspective strength
const BASE_SIZE = 1.8;
const OPACITY = 0.65;

// Rotation speed — 65% of Wideframe's pace
const ROT_Y = 0.0013; // radians per frame (y-axis)
const ROT_X = 0.00065; // radians per frame (x-axis)

// Gentle per-particle sine drift
const DRIFT_AMP = 0.0015;

function makeParticles(): Particle[] {
  const pts: Particle[] = [];
  for (let i = 0; i < COUNT; i++) {
    pts.push({
      x: (Math.random() - 0.5) * SPREAD,
      y: (Math.random() - 0.5) * SPREAD,
      z: (Math.random() - 0.5) * SPREAD,
    });
  }
  return pts;
}

// Rotate a point around Y axis
function rotY(p: Particle, cos: number, sin: number) {
  const x = p.x * cos - p.z * sin;
  const z = p.x * sin + p.z * cos;
  p.x = x;
  p.z = z;
}

// Rotate a point around X axis
function rotX(p: Particle, cos: number, sin: number) {
  const y = p.y * cos - p.z * sin;
  const z = p.y * sin + p.z * cos;
  p.y = y;
  p.z = z;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = makeParticles();
    let time = 0;
    let raf: number;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    }

    resize();
    window.addEventListener('resize', resize);

    const cosY = Math.cos(ROT_Y);
    const sinY = Math.sin(ROT_Y);
    const cosX = Math.cos(ROT_X);
    const sinX = Math.sin(ROT_X);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      time += 1;

      // Apply rotation to all particles this frame
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        // Subtle drift on y
        p.y += Math.sin(time * 0.002 + p.x) * DRIFT_AMP;
        rotY(p, cosY, sinY);
        rotX(p, cosX, sinX);
      }

      ctx.fillStyle = '#ffffff';

      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const scale = FOV / (FOV + p.z * 30);
        if (scale <= 0) continue;

        const sx = p.x * scale * (w / 12) + w / 2;
        const sy = p.y * scale * (h / 12) + h / 2;

        const size = BASE_SIZE * scale * window.devicePixelRatio;
        const alpha = Math.min(OPACITY * scale, OPACITY);

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}

'use client';

import { useEffect, useRef, useCallback } from 'react';

// ─── Trail particle config ────────────────────────────────────────────────────
const TRAIL_COUNT = 6;      // particles spawned per mouse move event
const LIFE        = 28;     // frames each particle lives
const SPREAD      = 6;      // spawn scatter radius (px)
const BASE_SIZE   = 2.2;    // starting dot radius (px)
const SPEED       = 0.4;    // drift speed per frame

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface SubheadTrailProps {
  /** Pass a ref to the subhead element — trail activates when mouse is over it */
  subheadRef: React.RefObject<HTMLElement | null>;
}

export default function SubheadTrail({ subheadRef }: SubheadTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles  = useRef<TrailParticle[]>([]);
  const rafRef     = useRef<number>(0);
  const activeRef  = useRef(false);

  const spawnAt = useCallback((x: number, y: number) => {
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * SPREAD;
      particles.current.push({
        x:       x + Math.cos(angle) * r,
        y:       y + Math.sin(angle) * r,
        vx:      (Math.random() - 0.5) * SPEED * 2,
        vy:      (Math.random() - 0.6) * SPEED * 2, // slight upward bias
        life:    LIFE,
        maxLife: LIFE,
        size:    BASE_SIZE * (0.6 + Math.random() * 0.8),
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth  * (window.devicePixelRatio || 1);
      canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dpr = window.devicePixelRatio || 1;
      const ps  = particles.current;

      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x    += p.vx;
        p.y    += p.vy;
        p.life -= 1;

        if (p.life <= 0) {
          ps.splice(i, 1);
          continue;
        }

        const t     = p.life / p.maxLife;          // 1 → 0 as it dies
        const alpha = t * t * 0.75;                // quadratic fade
        const size  = p.size * t * dpr;

        ctx.globalAlpha = alpha;
        ctx.fillStyle   = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current  = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const el = subheadRef.current;
    if (!el) return;

    function onMouseMove(e: MouseEvent) {
      spawnAt(e.clientX, e.clientY);
    }

    function onMouseEnter() { activeRef.current = true; }
    function onMouseLeave() { activeRef.current = false; }

    el.addEventListener('mousemove',  onMouseMove);
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousemove',  onMouseMove);
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [subheadRef, spawnAt]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        2,           // above content layer (zIndex 1), below nothing
        pointerEvents: 'none',
        width:         '100%',
        height:        '100%',
      }}
      aria-hidden="true"
    />
  );
}

'use client';

import { useEffect, useRef } from 'react';

// ─── Tunable Variables ─────────────────────────────────────────────────────────
const CONFIG = {
  COUNT:           1260,
  MAX_COUNT:       2940,
  ROT_Y:           0.0013,
  ROT_X:           0.00065,
  WANDER:          0.00008,
  REST_SPEED:      0.004,
  BASE_SIZE:       1.5,
  OPACITY:         0.72,
  FOV:             350,
  SPHERE_R:        3.8,
  SCREEN_SCALE:    105,
  ATTRACT_RADIUS:  1.2,
  ATTRACT_FORCE:   0.0025,
  ORBIT_DIST:      0.38,
  PASSIVE_DAMPING: 0.82,    // Mode 1 damping
  SHAPE_DAMPING:   0.92,    // Mode 2 damping (less drag so parting is fluid)
  REPEL_FORCE:     0.025,
  REPEL_RADIUS:    3.2,
  BURST_COUNT:     50,
  BURST_SPEED:     0.014,
  BURST_COOLDOWN:  90,
  SPIN_ADD:        0.0012,
  SPIN_DECAY:      0.96,
  SPRING_FORCE:    0.002,   // Pull strength toward formation targets
};

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  tx: number; ty: number; tz: number; // Target positions for Mode 2
  cooldown: number;
}

function randomInSphere(r: number): [number, number, number] {
  while (true) {
    const x = (Math.random() - 0.5) * 2 * r;
    const y = (Math.random() - 0.5) * 2 * r;
    const z = (Math.random() - 0.5) * 2 * r;
    if (x * x + y * y + z * z <= r * r) return [x, y, z];
  }
}

function makeParticle(x?: number, y?: number, z?: number, cooldown = 0, initialVelocity = 0): Particle {
  const [px, py, pz] = x !== undefined
    ? [x, y!, z!]
    : randomInSphere(CONFIG.SPHERE_R);
  return {
    x: px, y: py, z: pz,
    vx: (Math.random() - 0.5) * initialVelocity,
    vy: (Math.random() - 0.5) * initialVelocity,
    vz: (Math.random() - 0.5) * initialVelocity,
    tx: px, ty: py, tz: pz,
    cooldown,
  };
}

function unproject(sx: number, sy: number, cx: number, cy: number, dpr: number, scale: number): [number, number, number] {
  const wx = (sx - cx) / (scale * dpr);
  const wy = (sy - cy) / (scale * dpr);
  return [wx, wy, 0];
}

// Generates target coordinates for structured formations
function computeTargets(particles: Particle[], formation: number, SPHERE_R: number) {
  const N = particles.length;
  for (let i = 0; i < N; i++) {
    const p = particles[i];
    
    if (formation === 1) {
      // Torus
      const majorR = SPHERE_R * 0.65;
      const minorR = SPHERE_R * 0.25;
      const theta = (i / N) * Math.PI * 2 * 18; // wraps
      const phi = (i / N) * Math.PI * 2;
      p.tx = (majorR + minorR * Math.cos(theta)) * Math.cos(phi);
      p.tz = (majorR + minorR * Math.cos(theta)) * Math.sin(phi);
      p.ty = minorR * Math.sin(theta);
      
    } else if (formation === 2) {
      // Double Helix
      const t = (i / N);
      const turns = 3.5;
      const angle = t * Math.PI * 2 * turns;
      const radius = SPHERE_R * 0.45;
      const height = SPHERE_R * 1.5;
      const offset = i % 2 === 0 ? 0 : Math.PI;
      p.tx = Math.cos(angle + offset) * radius;
      p.tz = Math.sin(angle + offset) * radius;
      p.ty = (t - 0.5) * height;
      
    } else if (formation === 3) {
      // Disc (Phyllotaxis spiral)
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const r = Math.sqrt(i) / Math.sqrt(N) * (SPHERE_R * 0.85);
      const theta = i * goldenAngle;
      p.tx = r * Math.cos(theta);
      p.tz = r * Math.sin(theta);
      p.ty = (Math.random() - 0.5) * 0.15; // thin profile
      
    } else {
      // Freeform (0) - no fixed targets
      p.tx = p.x; p.ty = p.y; p.tz = p.z;
    }
  }
}

interface SphereFieldProps {
  formation?: number;
}

export default function SphereField({ formation = 0 }: SphereFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const formationRef = useRef(formation);

  // Keep formation ref synced for the animation loop
  useEffect(() => {
    formationRef.current = formation;
  }, [formation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ctxEl = ctx;

    const {
      COUNT, MAX_COUNT, ROT_Y, ROT_X, WANDER, REST_SPEED,
      BASE_SIZE, OPACITY, FOV, SPHERE_R,
      ATTRACT_RADIUS, ATTRACT_FORCE, ORBIT_DIST, PASSIVE_DAMPING, SHAPE_DAMPING,
      REPEL_FORCE, REPEL_RADIUS,
      BURST_COUNT, BURST_SPEED, BURST_COOLDOWN, SPIN_ADD, SPIN_DECAY, SPRING_FORCE
    } = CONFIG;

    const particles: Particle[] = Array.from({ length: COUNT }, () => makeParticle(undefined, undefined, undefined, 0, 0));
    
    // We track the *internal* formation state so we know when to trigger a recalculation
    let currentFormation = -1;

    const mouse = { x: -9999, y: -9999, active: false };
    const lastMW = { x: 0, y: 0, z: 0 };
    let framesSinceLeave = 0;
    const LEAVE_RAMP = 40;
    const DAMPING_LIGHT = 0.995;
    let spinBoostY = 0;
    let spinBoostX = 0;
    let interacted = false;
    let hintOpacity = 1;

    let rafStarted = false;
    const canvasEl = canvas;
    const wrapperEl = wrapper;

    function resize() {
      const w = canvasEl.offsetWidth;
      const h = canvasEl.offsetHeight;
      if (w === 0 || h === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      if (!rafStarted) {
        rafStarted = true;
        raf = requestAnimationFrame(draw);
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);

    function getSphereCenter(): [number, number, number] {
      const dpr = window.devicePixelRatio || 1;
      const w = canvasEl.width, h = canvasEl.height;
      const cssW = w / dpr;
      const isNarrow = cssW < 768;

      const BREAKPOINT = 1440 * 0.45;
      const SCALE_MAX  = CONFIG.SCREEN_SCALE;
      const SCALE_MIN  = Math.round(SCALE_MAX * (430 / BREAKPOINT));
      const effectiveScale = cssW >= BREAKPOINT
        ? SCALE_MAX
        : Math.max(SCALE_MIN, SCALE_MAX * (cssW / BREAKPOINT));

      return [
        isNarrow ? w * 0.5 : w * 0.75,
        h * 0.5,
        effectiveScale,
      ];
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    function onMouseMove(e: MouseEvent) {
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
      mouse.active = true;

      const [cx, cy, effScale] = getSphereCenter();
      const dx = (e.clientX - rect.left) - cx / dpr;
      const dy = (e.clientY - rect.top) - cy / dpr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      wrapperEl.style.cursor = dist < SPHERE_R * effScale ? 'crosshair' : 'default';
    }

    function onMouseLeave() {
      mouse.active = false;
      framesSinceLeave = 0;
      wrapperEl.style.cursor = 'default';
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;
      
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      const [cx2, cy2, effScale2] = getSphereCenter();
      const dx0 = cssX - cx2 / dpr;
      const dy0 = cssY - cy2 / dpr;
      if (Math.sqrt(dx0 * dx0 + dy0 * dy0) > SPHERE_R * effScale2) return;

      interacted = true;
      const sx = cssX * dpr;
      const sy = cssY * dpr;
      const [wx, wy, wz] = unproject(sx, sy, cx2, cy2, dpr, effScale2);

      const toAdd = Math.min(BURST_COUNT, MAX_COUNT - particles.length);
      for (let i = 0; i < toAdd; i++) {
        const scatter = 0.15;
        const px = wx + (Math.random() - 0.5) * scatter;
        const py = wy + (Math.random() - 0.5) * scatter;
        const pz = wz + (Math.random() - 0.5) * scatter;

        const dist = Math.sqrt(px * px + py * py + pz * pz);
        const clampR = Math.min(dist, SPHERE_R * 0.9);
        const spawnX = dist > 0.001 ? (px / dist) * clampR : px;
        const spawnY = dist > 0.001 ? (py / dist) * clampR : py;
        const spawnZ = dist > 0.001 ? (pz / dist) * clampR : pz;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        particles.push({
          x: spawnX, y: spawnY, z: spawnZ,
          vx: Math.sin(phi) * Math.cos(theta) * BURST_SPEED,
          vy: Math.sin(phi) * Math.sin(theta) * BURST_SPEED,
          vz: Math.cos(phi) * BURST_SPEED,
          tx: spawnX, ty: spawnY, tz: spawnZ, // update in draw loop if mode > 0
          cooldown: BURST_COOLDOWN,
        });
      }
      
      // If we're in a structured formation, recalculate so new particles get homes
      if (formationRef.current > 0) {
        computeTargets(particles, formationRef.current, SPHERE_R);
      }
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      interacted = true;
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = (e.clientX - rect.left) * dpr;
      const sy = (e.clientY - rect.top) * dpr;
      const [cx, cy, effScale] = getSphereCenter();
      const [wx, wy, wz] = unproject(sx, sy, cx, cy, dpr, effScale);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - wx, dy = p.y - wy, dz = p.z - wz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const f = REPEL_FORCE / (d + 0.3);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          p.vz += (dz / d) * f;
        }
      }
    }

    function onWheel(e: WheelEvent) {
      interacted = true;
      const dir = e.deltaY > 0 ? 1 : -1;
      spinBoostY += dir * SPIN_ADD;
      spinBoostX += dir * SPIN_ADD * 0.4;
    }

    // Touch handlers...
    function touchToMouse(e: TouchEvent) {
      const rect = canvasEl.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const t = e.touches[0];
      if (!t) return;
      mouse.x = (t.clientX - rect.left) * dpr;
      mouse.y = (t.clientY - rect.top) * dpr;
      mouse.active = true;
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      touchToMouse(e);
      // Omitted burst on touch start for brevity to match click bounds checking.
      interacted = true;
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      touchToMouse(e);
    }

    function onTouchEnd() {
      mouse.active = false;
      framesSinceLeave = 0;
    }

    canvasEl.addEventListener('mousemove', onMouseMove);
    canvasEl.addEventListener('mouseleave', onMouseLeave);
    canvasEl.addEventListener('click', onClick);
    canvasEl.addEventListener('contextmenu', onContextMenu);
    canvasEl.addEventListener('wheel', onWheel, { passive: true });
    canvasEl.addEventListener('touchstart', onTouchStart, { passive: false });
    canvasEl.addEventListener('touchmove', onTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', onTouchEnd);
    canvasEl.addEventListener('touchcancel', onTouchEnd);

    // ── Draw Loop ────────────────────────────────────────────────────────────

    let raf: number;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvasEl.width, h = canvasEl.height;
      const [cx, cy, effScale] = getSphereCenter();

      ctxEl.clearRect(0, 0, w, h);
      
      const activeFormation = formationRef.current;
      if (activeFormation !== currentFormation) {
        computeTargets(particles, activeFormation, SPHERE_R);
        currentFormation = activeFormation;
      }

      spinBoostY *= SPIN_DECAY;
      spinBoostX *= SPIN_DECAY;
      if (Math.abs(spinBoostY) < 0.00001) spinBoostY = 0;
      if (Math.abs(spinBoostX) < 0.00001) spinBoostX = 0;

      const totalY = ROT_Y + spinBoostY;
      const totalX = ROT_X + spinBoostX;
      const cfY = Math.cos(totalY), sfY = Math.sin(totalY);
      const cfX = Math.cos(totalX), sfX = Math.sin(totalX);

      if (!mouse.active) {
        framesSinceLeave = Math.min(framesSinceLeave + 1, LEAVE_RAMP);
      } else {
        framesSinceLeave = 0;
      }

      let mwx = 0, mwy = 0, mwz = 0;
      if (mouse.active) {
        [mwx, mwy, mwz] = unproject(mouse.x, mouse.y, cx, cy, dpr, effScale);
        lastMW.x = mwx; lastMW.y = mwy; lastMW.z = mwz;
      }

      ctxEl.fillStyle = '#ffffff';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Brownian wander
        p.vx += (Math.random() - 0.5) * WANDER;
        p.vy += (Math.random() - 0.5) * WANDER;
        p.vz += (Math.random() - 0.5) * WANDER;

        if (p.cooldown > 0) p.cooldown--;

        // 2. Interaction
        if (mouse.active && p.cooldown === 0) {
          const dx = mwx - p.x, dy = mwy - p.y, dz = mwz - p.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          
          if (activeFormation === 0) {
            // MODE 1: Magnetic Attraction
            if (d2 < ATTRACT_RADIUS * ATTRACT_RADIUS && d2 > 0.0001) {
              const d = Math.sqrt(d2);
              if (d > ORBIT_DIST) {
                const t = 1 - d / ATTRACT_RADIUS;
                const f = ATTRACT_FORCE * t * t * 60;
                p.vx += (dx / d) * f;
                p.vy += (dy / d) * f;
                p.vz += (dz / d) * f;
              } else {
                const t = 1 - d / ORBIT_DIST;
                const f = ATTRACT_FORCE * t * 25;
                p.vx -= (dx / d) * f;
                p.vy -= (dy / d) * f;
                p.vz -= (dz / d) * f;
              }
            }
          } else {
            // MODE 2: Moses Effect (Parting)
            const PART_RADIUS = ATTRACT_RADIUS * 1.5; // Wider field for parting
            if (d2 < PART_RADIUS * PART_RADIUS && d2 > 0.0001) {
              const d = Math.sqrt(d2);
              const t = 1 - d / PART_RADIUS;
              const f = ATTRACT_FORCE * t * t * 120; // Stronger push away
              p.vx -= (dx / d) * f;
              p.vy -= (dy / d) * f;
              p.vz -= (dz / d) * f;
            }
          }
        }

        // 3. Formation Spring (Mode 2)
        if (activeFormation !== 0) {
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          const dz = p.tz - p.z;
          p.vx += dx * SPRING_FORCE;
          p.vy += dy * SPRING_FORCE;
          p.vz += dz * SPRING_FORCE;
        }

        // 4. Passive damping
        if (!mouse.active) {
          const t = Math.min(framesSinceLeave / LEAVE_RAMP, 1);
          const baseDamping = activeFormation === 0 ? PASSIVE_DAMPING : SHAPE_DAMPING;
          const damping = DAMPING_LIGHT + (baseDamping - DAMPING_LIGHT) * t;
          p.vx *= damping;
          p.vy *= damping;
          p.vz *= damping;
        } else if (activeFormation !== 0) {
          // Keep shape damping active even when mouse is moving so spring force settles
          p.vx *= SHAPE_DAMPING;
          p.vy *= SHAPE_DAMPING;
          p.vz *= SHAPE_DAMPING;
        }

        // 5. Progressive speed drag
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        if (spd > REST_SPEED) {
          const excess = (spd - REST_SPEED) / REST_SPEED;
          const drag = 1 - Math.min(excess * 0.12, 0.5);
          p.vx *= drag;
          p.vy *= drag;
          p.vz *= drag;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // 6. Sphere boundary constraint (only strictly enforced in Mode 1)
        if (activeFormation === 0) {
          const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
          const softZone = SPHERE_R * 0.88;
          if (dist > 0.0001) {
            const nx = p.x / dist, ny = p.y / dist, nz = p.z / dist;

            if (dist > softZone) {
              const t = (dist - softZone) / (SPHERE_R - softZone);
              const f = 0.004 * t * t;
              p.vx -= nx * f;
              p.vy -= ny * f;
              p.vz -= nz * f;
              const outward = p.vx * nx + p.vy * ny + p.vz * nz;
              if (outward > 0) {
                const drain = outward * (0.1 + t * 0.3);
                p.vx -= nx * drain;
                p.vy -= ny * drain;
                p.vz -= nz * drain;
              }
              if (dist > SPHERE_R) {
                p.x = nx * SPHERE_R * 0.99;
                p.y = ny * SPHERE_R * 0.99;
                p.z = nz * SPHERE_R * 0.99;
              }
            } else if (dist < SPHERE_R * 0.12) {
              const f = 0.0003 * (1 - dist / (SPHERE_R * 0.12));
              p.vx += nx * f;
              p.vy += ny * f;
              p.vz += nz * f;
            }
          }
        }

        // Global rotation
        const rx = p.x * cfY - p.z * sfY;
        const rz = p.x * sfY + p.z * cfY;
        p.x = rx; p.z = rz;

        const ry  = p.y * cfX - p.z * sfX;
        const rz2 = p.y * sfX + p.z * cfX;
        p.y = ry; p.z = rz2;

        // Perspective projection
        const depth = FOV + p.z * 30;
        if (depth <= 0) continue;
        const scale = FOV / depth;

        const spx = p.x * scale * effScale * dpr + cx;
        const spy = p.y * scale * effScale * dpr + cy;

        if (spx < -20 || spx > w + 20 || spy < -20 || spy > h + 20) continue;

        const size = Math.max(BASE_SIZE * scale * dpr, 0.3 * dpr);
        const alpha = Math.min(OPACITY * scale, OPACITY);

        ctxEl.globalAlpha = alpha;
        ctxEl.beginPath();
        ctxEl.arc(spx, spy, size, 0, Math.PI * 2);
        ctxEl.fill();
      }

      ctxEl.globalAlpha = 1;

      // Hint overlay
      if (hintOpacity > 0) {
        if (interacted) {
          hintOpacity = Math.max(0, hintOpacity - 0.025);
        }
        const hintX = cx;
        const hintY = cy + (SPHERE_R * effScale * dpr * 0.72);
        ctxEl.save();
        ctxEl.globalAlpha = hintOpacity * 0.35;
        ctxEl.font = `${11 * dpr}px "JetBrains Mono", ui-monospace, monospace`;
        ctxEl.fillStyle = '#ffffff';
        ctxEl.textAlign = 'center';
        const isMobile = 'ontouchstart' in window;
        ctxEl.fillText(isMobile ? 'tap  ·  drag' : 'click  ·  right-click  ·  scroll', hintX, hintY);
        ctxEl.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    const hintTimer = setTimeout(() => { interacted = true; }, 5000);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hintTimer);
      ro.disconnect();
      canvasEl.removeEventListener('mousemove', onMouseMove);
      canvasEl.removeEventListener('mouseleave', onMouseLeave);
      canvasEl.removeEventListener('click', onClick);
      canvasEl.removeEventListener('contextmenu', onContextMenu);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('touchstart', onTouchStart);
      canvasEl.removeEventListener('touchmove', onTouchMove);
      canvasEl.removeEventListener('touchend', onTouchEnd);
      canvasEl.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        cursor: 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        aria-hidden="true"
      />
    </div>
  );
}

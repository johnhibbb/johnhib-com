'use client';

import { useEffect, useRef } from 'react';

// ─── Tunable Variables ─────────────────────────────────────────────────────────
//
//  1. COUNT              initial particle count
//  2. MAX_COUNT          density cap — click bursts can't exceed this
//  3. ROT_Y              base left/right spin speed (rad/frame)
//  4. ROT_X              base tilt speed (rad/frame)
//  5. WANDER             Brownian drift force per frame — organic feel
//  6. REST_SPEED         natural drift ceiling — above this, progressive drag pulls back
//                        toward suspension; replaces hard velocity cap
//  7. BASE_SIZE          dot radius in px (depth-scaled)
//  8. OPACITY            max dot opacity (depth-attenuated)
//  9. FOV                perspective strength (lower = deeper 3D)
// 10. SPHERE_R           invisible container radius (world units)
// 11. SCREEN_SCALE       sphere screen size (px per world unit)
//
//  Interaction params:
// 12. ATTRACT_RADIUS     pull zone radius (world units) — tight, local effect only
// 13. ATTRACT_FORCE      peak force magnitude (quadratic falloff from ORBIT_DIST outward)
// 14. ORBIT_DIST         inner hover distance — inside this, particles gently push away
//                        so they form a suspended cloud rather than piling on the cursor
// 15. PASSIVE_DAMPING    per-frame velocity multiplier when cursor is inactive (< 1.0)
//                        bleeds off interaction energy so sphere returns to natural drift
// 16. REPEL_FORCE        right-click scatter strength
// 17. REPEL_RADIUS       right-click repulsion range
// 18. BURST_COUNT        particles added per left-click
// 19. BURST_SPEED        initial velocity of burst particles (disperses them)
// 22. BURST_COOLDOWN     frames burst particles are immune to magnet attraction
// 20. SPIN_ADD           rotation boost per scroll tick
// 21. SPIN_DECAY         how fast scroll boost decays (per frame, 0–1)
//
const CONFIG = {
  COUNT:           1260,    // 1  — +5%
  MAX_COUNT:       2940,    // 2
  ROT_Y:           0.0013,  // 3
  ROT_X:           0.00065, // 4
  WANDER:          0.00008, // 5
  REST_SPEED:      0.004,   // 6 — above this, progressive drag increases with excess speed
  BASE_SIZE:       1.5,     // 7
  OPACITY:         0.72,    // 8
  FOV:             350,     // 9
  SPHERE_R:        3.8,     // 10
  SCREEN_SCALE:    105,     // 11
  ATTRACT_RADIUS:  1.2,     // 12 — tight local field, ~1/3 of sphere
  ATTRACT_FORCE:   0.0025,  // 13 — 2× stronger pull within the same radius
  ORBIT_DIST:      0.38,    // 14
  PASSIVE_DAMPING: 0.82,    // 15 — very fast bleed: back to suspension in ~20 frames
  REPEL_FORCE:     0.025,   // 16
  REPEL_RADIUS:    3.2,     // 17
  BURST_COUNT:     50,      // 18
  BURST_SPEED:     0.014,   // 19 — gentler launch, drifts through swarm rather than firing
  BURST_COOLDOWN:  90,      // 22 — ~1.5s at 60fps to disperse before magnet kicks in
  SPIN_ADD:        0.0012,  // 20
  SPIN_DECAY:      0.96,    // 21
};

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  cooldown: number; // frames remaining before magnet attraction applies
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
    cooldown,
  };
}

// Unproject screen point → 3D world point at z=0 plane
function unproject(sx: number, sy: number, cx: number, cy: number, dpr: number): [number, number, number] {
  const wx = (sx - cx) / (CONFIG.SCREEN_SCALE * dpr);
  const wy = (sy - cy) / (CONFIG.SCREEN_SCALE * dpr);
  return [wx, wy, 0];
}

export default function SphereField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      COUNT, MAX_COUNT, ROT_Y, ROT_X, WANDER, REST_SPEED,
      BASE_SIZE, OPACITY, FOV, SPHERE_R, SCREEN_SCALE,
      ATTRACT_RADIUS, ATTRACT_FORCE, ORBIT_DIST, PASSIVE_DAMPING,
      REPEL_FORCE, REPEL_RADIUS,
      BURST_COUNT, BURST_SPEED, BURST_COOLDOWN, SPIN_ADD, SPIN_DECAY,
    } = CONFIG;

    // Spawn at rest — wander builds the field organically, no initial collision surge
    const particles: Particle[] = Array.from({ length: COUNT }, () => makeParticle(undefined, undefined, undefined, 0, 0));

    // Interaction state (live refs, no re-render needed)
    const mouse = { x: -9999, y: -9999, active: false };
    // Last known world-space cursor position
    const lastMW = { x: 0, y: 0, z: 0 };
    let framesSinceLeave = 0;   // ramps damping smoothly after cursor exits
    const LEAVE_RAMP = 40;      // frames to ease from light → full damping
    const DAMPING_LIGHT = 0.995; // barely-there drag during active interaction
    let spinBoostY = 0;
    let spinBoostX = 0;
    let interacted = false;
    let hintOpacity = 1;

    let rafStarted = false;

    function resize() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return; // not laid out yet — wait for observer
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      // Start draw loop only once we have real dimensions
      if (!rafStarted) {
        rafStarted = true;
        raf = requestAnimationFrame(draw);
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function getSphereCenter(): [number, number] {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width, h = canvas.height;
      const isNarrow = w / dpr < 768;
      return [
        isNarrow ? w * 0.5 : w * 0.75,
        h * 0.5,
      ];
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      mouse.x = cssX * dpr;
      mouse.y = cssY * dpr;
      mouse.active = true;

      // Switch cursor to crosshair only when inside sphere radius
      const [cx, cy] = getSphereCenter();
      const sphereCSSX = cx / dpr;
      const sphereCSSY = cy / dpr;
      const sphereRadiusCSS = SPHERE_R * SCREEN_SCALE;
      const dx = cssX - sphereCSSX;
      const dy = cssY - sphereCSSY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      wrapper.style.cursor = dist < sphereRadiusCSS ? 'crosshair' : 'default';
    }

    function onMouseLeave() {
      mouse.active = false;
      framesSinceLeave = 0; // start the ramp
      wrapper.style.cursor = 'default';
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      // Only spawn if click is inside the sphere area
      const [cx2, cy2] = getSphereCenter();
      const sphereCSSX = cx2 / dpr;
      const sphereCSSY = cy2 / dpr;
      const dx0 = cssX - sphereCSSX;
      const dy0 = cssY - sphereCSSY;
      if (Math.sqrt(dx0 * dx0 + dy0 * dy0) > SPHERE_R * SCREEN_SCALE) return;

      interacted = true;

      const sx = cssX * dpr;
      const sy = cssY * dpr;
      const [cx, cy] = getSphereCenter();
      const [wx, wy, wz] = unproject(sx, sy, cx, cy, dpr);

      const toAdd = Math.min(BURST_COUNT, MAX_COUNT - particles.length);
      for (let i = 0; i < toAdd; i++) {
        // Spawn at cursor with tiny positional scatter
        const scatter = 0.15;
        const px = wx + (Math.random() - 0.5) * scatter;
        const py = wy + (Math.random() - 0.5) * scatter;
        const pz = wz + (Math.random() - 0.5) * scatter;

        // Clamp inside sphere
        const dist = Math.sqrt(px * px + py * py + pz * pz);
        const clampR = Math.min(dist, SPHERE_R * 0.9);
        const spawnX = dist > 0.001 ? (px / dist) * clampR : px;
        const spawnY = dist > 0.001 ? (py / dist) * clampR : py;
        const spawnZ = dist > 0.001 ? (pz / dist) * clampR : pz;

        // Random 3D direction — uniformly distributed on sphere surface
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const bvx = Math.sin(phi) * Math.cos(theta) * BURST_SPEED;
        const bvy = Math.sin(phi) * Math.sin(theta) * BURST_SPEED;
        const bvz = Math.cos(phi) * BURST_SPEED;

        particles.push({
          x: spawnX, y: spawnY, z: spawnZ,
          vx: bvx, vy: bvy, vz: bvz,
          cooldown: BURST_COOLDOWN,
        });
      }
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      interacted = true;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const sx = (e.clientX - rect.left) * dpr;
      const sy = (e.clientY - rect.top) * dpr;
      const [cx, cy] = getSphereCenter();
      const [wx, wy, wz] = unproject(sx, sy, cx, cy, dpr);

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

    // ── Touch Handlers ───────────────────────────────────────────────────────

    function touchToMouse(e: TouchEvent) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const t = e.touches[0];
      if (!t) return;
      const cssX = t.clientX - rect.left;
      const cssY = t.clientY - rect.top;
      mouse.x = cssX * dpr;
      mouse.y = cssY * dpr;
      mouse.active = true;
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      touchToMouse(e);

      // Burst if inside sphere
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const t = e.touches[0];
      if (!t) return;
      const cssX = t.clientX - rect.left;
      const cssY = t.clientY - rect.top;
      const [cx2, cy2] = getSphereCenter();
      const dx0 = cssX - cx2 / dpr;
      const dy0 = cssY - cy2 / dpr;
      if (Math.sqrt(dx0 * dx0 + dy0 * dy0) > SPHERE_R * SCREEN_SCALE) return;

      interacted = true;
      const sx = cssX * dpr;
      const sy = cssY * dpr;
      const [cx, cy] = getSphereCenter();
      const [wx, wy, wz] = unproject(sx, sy, cx, cy, dpr);

      const toAdd = Math.min(BURST_COUNT, MAX_COUNT - particles.length);
      for (let i = 0; i < toAdd; i++) {
        const scatter = 0.15;
        const px = wx + (Math.random() - 0.5) * scatter;
        const py = wy + (Math.random() - 0.5) * scatter;
        const pz = wz + (Math.random() - 0.5) * scatter;
        const d = Math.sqrt(px * px + py * py + pz * pz);
        const clampR = Math.min(d, SPHERE_R * 0.9);
        const spawnX = d > 0.001 ? (px / d) * clampR : px;
        const spawnY = d > 0.001 ? (py / d) * clampR : py;
        const spawnZ = d > 0.001 ? (pz / d) * clampR : pz;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        particles.push({
          x: spawnX, y: spawnY, z: spawnZ,
          vx: Math.sin(phi) * Math.cos(theta) * BURST_SPEED,
          vy: Math.sin(phi) * Math.sin(theta) * BURST_SPEED,
          vz: Math.cos(phi) * BURST_SPEED,
          cooldown: BURST_COOLDOWN,
        });
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      touchToMouse(e);
    }

    function onTouchEnd() {
      mouse.active = false;
      framesSinceLeave = 0;
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    // ── Draw Loop ────────────────────────────────────────────────────────────

    let raf: number;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width, h = canvas.height;
      const [cx, cy] = getSphereCenter();

      ctx.clearRect(0, 0, w, h);

      // Decay spin boost
      spinBoostY *= SPIN_DECAY;
      spinBoostX *= SPIN_DECAY;
      if (Math.abs(spinBoostY) < 0.00001) spinBoostY = 0;
      if (Math.abs(spinBoostX) < 0.00001) spinBoostX = 0;

      // Current frame rotation (base + boost)
      const totalY = ROT_Y + spinBoostY;
      const totalX = ROT_X + spinBoostX;
      const cfY = Math.cos(totalY), sfY = Math.sin(totalY);
      const cfX = Math.cos(totalX), sfX = Math.sin(totalX);

      // Advance leave-ramp counter
      if (!mouse.active) {
        framesSinceLeave = Math.min(framesSinceLeave + 1, LEAVE_RAMP);
      } else {
        framesSinceLeave = 0;
      }

      // Mouse in world space (for attraction)
      let mwx = 0, mwy = 0, mwz = 0;
      if (mouse.active) {
        [mwx, mwy, mwz] = unproject(mouse.x, mouse.y, cx, cy, dpr);
        lastMW.x = mwx; lastMW.y = mwy; lastMW.z = mwz;
      }

      ctx.fillStyle = '#ffffff';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Brownian wander
        p.vx += (Math.random() - 0.5) * WANDER;
        p.vy += (Math.random() - 0.5) * WANDER;
        p.vz += (Math.random() - 0.5) * WANDER;

        // 2. Tick cooldown
        if (p.cooldown > 0) p.cooldown--;

        // 3. Orbital attraction/repulsion — snappy pull from distance, soft push inside orbit
        //    Skip if particle is still in burst cooldown (let it disperse first)
        if (mouse.active && p.cooldown === 0) {
          const dx = mwx - p.x, dy = mwy - p.y, dz = mwz - p.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < ATTRACT_RADIUS * ATTRACT_RADIUS && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            if (d > ORBIT_DIST) {
              // Outside orbit: pull toward cursor, sharper the closer they get
              const t = 1 - d / ATTRACT_RADIUS;
              const f = ATTRACT_FORCE * t * t * 60;
              p.vx += (dx / d) * f;
              p.vy += (dy / d) * f;
              p.vz += (dz / d) * f;
            } else {
              // Inside orbit: gentle repulsion — keeps particles suspended, not piled
              const t = 1 - d / ORBIT_DIST;
              const f = ATTRACT_FORCE * t * 25;
              p.vx -= (dx / d) * f;
              p.vy -= (dy / d) * f;
              p.vz -= (dz / d) * f;
            }
          }
        }

        // 4. Passive damping — eases in over LEAVE_RAMP frames after cursor exits
        if (!mouse.active) {
          const t = Math.min(framesSinceLeave / LEAVE_RAMP, 1);
          const damping = DAMPING_LIGHT + (PASSIVE_DAMPING - DAMPING_LIGHT) * t;
          p.vx *= damping;
          p.vy *= damping;
          p.vz *= damping;
        }

        // 4. Progressive speed drag — above REST_SPEED, apply friction proportional
        //    to excess; the faster a particle goes, the harder it's pulled back to rest
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        if (spd > REST_SPEED) {
          const excess = (spd - REST_SPEED) / REST_SPEED; // how far over threshold (0+)
          const drag = 1 - Math.min(excess * 0.12, 0.5);  // scale drag, cap at 50% reduction
          p.vx *= drag;
          p.vy *= drag;
          p.vz *= drag;
        }

        // 5. Move
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // 6. Sphere boundary — thickening medium near edge only, never bounces
        //    Soft zone starts at 88% so particles roam freely through most of the sphere.
        //    Gentle center dispersal prevents accumulation near the origin.
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        const softZone = SPHERE_R * 0.88;
        if (dist > 0.0001) {
          const nx = p.x / dist, ny = p.y / dist, nz = p.z / dist;

          if (dist > softZone) {
            // Edge zone: inward pull + drain outward velocity
            const t = (dist - softZone) / (SPHERE_R - softZone); // 0→1
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
            // Center zone: tiny outward nudge — keeps distribution volumetric
            const f = 0.0003 * (1 - dist / (SPHERE_R * 0.12));
            p.vx += nx * f;
            p.vy += ny * f;
            p.vz += nz * f;
          }
        }

        // 7. Global rotation — Y axis
        const rx = p.x * cfY - p.z * sfY;
        const rz = p.x * sfY + p.z * cfY;
        p.x = rx; p.z = rz;

        // 8. Global rotation — X axis
        const ry  = p.y * cfX - p.z * sfX;
        const rz2 = p.y * sfX + p.z * cfX;
        p.y = ry; p.z = rz2;

        // 9. Perspective projection
        const depth = FOV + p.z * 30;
        if (depth <= 0) continue;
        const scale = FOV / depth;

        const spx = p.x * scale * SCREEN_SCALE * dpr + cx;
        const spy = p.y * scale * SCREEN_SCALE * dpr + cy;

        if (spx < -20 || spx > w + 20 || spy < -20 || spy > h + 20) continue;

        const size = Math.max(BASE_SIZE * scale * dpr, 0.3 * dpr);
        const alpha = Math.min(OPACITY * scale, OPACITY);

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(spx, spy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // ── Hint overlay ────────────────────────────────────────────────────
      if (hintOpacity > 0) {
        if (interacted) {
          hintOpacity = Math.max(0, hintOpacity - 0.025);
        }
        const hintX = cx;
        const hintY = cy + (SPHERE_R * SCREEN_SCALE * dpr * 0.72);
        ctx.save();
        ctx.globalAlpha = hintOpacity * 0.35;
        ctx.font = `${11 * dpr}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const isMobile = 'ontouchstart' in window;
        ctx.fillText(isMobile ? 'tap  ·  drag' : 'click  ·  right-click  ·  scroll', hintX, hintY);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    // Fade hint out after 5s even without interaction
    const hintTimer = setTimeout(() => { interacted = true; }, 5000);

    // Attempt initial resize in case canvas already has dimensions
    resize();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hintTimer);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
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

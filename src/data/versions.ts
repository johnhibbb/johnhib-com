export interface Version {
  version: string;
  date: string;
  title: string;
  notes: string[];
  screenshot?: string; // path relative to /public
}

export const versions: Version[] = [
  {
    version: "1.2",
    date: "2026-03-17",
    title: "Sphere interaction polish",
    notes: [
      "Touch support added — touchstart/touchmove/touchend for mobile attraction",
      "Increased mouse attraction force (ATTRACT_FORCE 0.0012 → 0.0025)",
      "Soft speed cap via REST_SPEED — particles ease rather than snap",
      "Soft zone pushed to 88% — wider calm radius before attraction kicks in",
      "Center dispersal added — idle particles drift outward from origin",
    ],
  },
  {
    version: "1.1",
    date: "2026-03-17",
    title: "Security hardening + file structure",
    notes: [
      "Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy",
      "middleware.ts stub added — documented extension points for rate limiting, auth, AI input validation",
      "hooks/ directory established for canvas and interactive component state",
      "types/ directory established for shared TypeScript interfaces",
    ],
  },
  {
    version: "1.0",
    date: "2026-03-16",
    title: "Initial launch",
    notes: [
      "Full-viewport single-page layout — name left, particle sphere right",
      "Interactive particle sphere: click to spawn, hover to attract, right-click to repel, scroll to spin",
      "Cycling subhead with 3 lines — click to advance",
      "Subtle text shadows to separate copy from particles on mobile",
      "johnhib.tech link in bottom-right corner",
    ],
    screenshot: "/versions/v1.0.png",
  },
];

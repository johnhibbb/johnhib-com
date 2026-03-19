export interface Version {
  version: string;
  date: string;
  title: string;
  notes: string[];
  screenshot?: string; // path relative to /public
}

export const versions: Version[] = [
  {
    version: "1.1",
    date: "2026-03-17",
    title: "Security hardening + sphere physics tuning",
    notes: [
      "Security headers across all responses — CSP, HSTS, X-Frame-Options, and more",
      "Sphere feel tuned — touch support, smoother easing, wider calm radius, idle drift",
      "Project architecture established — hooks/ and types/ directories scaffolded for scale",
    ],
  },
  {
    version: "1.0",
    date: "2026-03-16",
    title: "Initial launch",
    notes: [
      "Full-viewport layout — name and sphere share the screen without competing",
      "Particle sphere: click to spawn, hover to attract, right-click to repel",
      "Cycling subhead — three lines, click to advance",
    ],
    screenshot: "/versions/v1.0.png",
  },
];

/**
 * generate-og.mjs
 * Pre-generates static OG image for johnhib.com at build time.
 * Output: public/og/home.png
 *
 * Run: node scripts/generate-og.mjs
 * Hooked into: package.json "build" script (runs before next build)
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Load fonts ───────────────────────────────────────────────────────────────
const cormorantData = readFileSync(join(ROOT, 'public/fonts/CormorantGaramond-Italic-700.ttf'));
const interData     = readFileSync(join(ROOT, 'public/fonts/Inter-Regular.ttf'));

// ─── Card design ──────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';
const BG   = '#0a0a0a';
const W    = 1200;
const H    = 630;

const card = {
  type: 'div',
  props: {
    style: {
      width:         `${W}px`,
      height:        `${H}px`,
      background:    BG,
      display:       'flex',
      flexDirection: 'column',
      justifyContent:'space-between',
      padding:       '60px 72px',
    },
    children: [
      // Top bar — domain label
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
          children: [
            {
              type: 'span',
              props: {
                style: {
                  color:       '#555',
                  fontSize:    25,
                  letterSpacing: '0.06em',
                  fontFamily:  'Inter',
                  fontWeight:  400,
                },
                children: 'johnhib.com',
              },
            },
            { type: 'span', props: { children: '' } },
          ],
        },
      },

      // Center — name + gold rule + subhead + location
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', gap: 0 },
          children: [
            // Name
            {
              type: 'span',
              props: {
                style: {
                  fontFamily:    'Cormorant Garamond',
                  fontStyle:     'italic',
                  fontSize:      108,
                  color:         '#ffffff',
                  lineHeight:    1.0,
                  letterSpacing: '-0.02em',
                },
                children: 'John Hibionada',
              },
            },
            // Gold rule
            {
              type: 'div',
              props: {
                style: {
                  width:      '48px',
                  height:     '1px',
                  background: GOLD,
                  marginTop:  '28px',
                  marginBottom: '20px',
                },
              },
            },
            // Subhead
            {
              type: 'span',
              props: {
                style: {
                  fontFamily:    'Inter',
                  fontWeight:    400,
                  color:         '#666',
                  fontSize:      26,
                  letterSpacing: '0.01em',
                },
                children: 'Just a guy that takes technology seriously.',
              },
            },

          ],
        },
      },

      // Bottom rule + tagline
      {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', gap: 14 },
          children: [
            { type: 'div', props: { style: { width: '100%', height: 1, background: '#1c1c1c' } } },
            {
              type: 'span',
              props: {
                style: {
                  fontFamily:    'Inter',
                  fontWeight:    400,
                  color:         '#444',
                  fontSize:      21,
                  letterSpacing: '0.04em',
                },
                children: 'Creative Technologist. Los Angeles.',
              },
            },
          ],
        },
      },
    ],
  },
};

// ─── Generate PNG ─────────────────────────────────────────────────────────────
const outDir = join(ROOT, 'public/og');
mkdirSync(outDir, { recursive: true });

const svg = await satori(card, {
  width: W,
  height: H,
  fonts: [
    { name: 'Cormorant Garamond', data: cormorantData, style: 'italic', weight: 700 },
    { name: 'Inter',              data: interData,     style: 'normal', weight: 400 },
  ],
});

const resvg   = new Resvg(svg, { fitTo: { mode: 'width', value: W } });
const png     = resvg.render().asPng();
const outPath = join(outDir, 'home.png');
writeFileSync(outPath, png);

console.log(`✓ home.png (${Math.round(png.length / 1024)}KB)`);

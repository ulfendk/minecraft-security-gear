// Block textures, painted in code at vanilla's 16x16 resolution and palette.
import { Canvas, hash2, hex, mix, rng, shade, strip } from './lib/pixels.mjs';

const T = '#00000000';

// ---------------------------------------------------------------- materials

/** Poured concrete: grey with aggregate speckle. */
function concrete(seed = 1, base = '#8e9095') {
  const c = new Canvas(16, 16, base).noise(0.05, seed);
  const r = rng(seed * 7 + 3);
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    c.set(x, y, (old) => shade(old, r() < 0.5 ? 0.82 : 1.12));
  }
  return c;
}

/** Dark painted steel. */
function darkSteel(seed = 5) {
  return new Canvas(16, 16, '#4b5057').brushed(0.05, seed);
}

/** Light galvanised steel. */
function steel(seed = 9) {
  return new Canvas(16, 16, '#b9bec4').brushed(0.06, seed);
}

/** Vanilla-like stone bricks (4 courses of offset bricks). */
function stoneBricks(seed = 2) {
  const c = new Canvas(16, 16, '#7b7b7b');
  const mortar = hex('#5d5d5d');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const off = row % 2 ? 4 : 0;
      const bx = (x + off) % 8;
      const edge = y % 4 === 3 || bx === 7;
      if (edge) c.set(x, y, mortar);
      else {
        const brick = Math.floor((x + off) / 8) + row * 3;
        const tone = 1 + (hash2(brick, row, seed) - 0.5) * 0.12;
        let col = shade(hex('#7d7d7d'), tone * (1 + (hash2(x, y, seed + 1) - 0.5) * 0.12));
        if (y % 4 === 0) col = shade(col, 1.1); // lit top edge of each brick
        if (bx === 6) col = shade(col, 0.9);
        c.set(x, y, col);
      }
    }
  return c;
}

function planks(seed = 4, base = '#7a5a36') {
  const c = new Canvas(16, 16, base);
  for (let y = 0; y < 16; y++) {
    const board = Math.floor(y / 4);
    for (let x = 0; x < 16; x++) {
      const grain = (hash2(Math.floor(x / 3) + board * 11, y, seed) - 0.5) * 0.1;
      let col = shade(hex(base), 1 + grain + (board % 2 ? -0.04 : 0.03));
      if (y % 4 === 3) col = shade(hex(base), 0.68);
      c.set(x, y, col);
    }
  }
  return c;
}

// ---------------------------------------------------------------- prison

export function reinforcedConcrete() {
  const c = concrete(1);
  // Formwork panel seams and tie holes, like cast-in-place prison walls.
  c.frame(0, 0, 16, 16, (o) => shade(o, 0.88));
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) {
    c.set(x, y, '#55575c');
    c.set(x + 1, y, '#6a6c71');
    c.set(x, y + 1, '#6a6c71');
  }
  return c.png();
}

/** Prison wall: big cinder blocks in concrete grey. */
export function prisonWall() {
  const c = concrete(3, '#999ba0');
  for (let x = 0; x < 16; x++) {
    c.set(x, 7, (o) => shade(o, 0.72));
    c.set(x, 15, (o) => shade(o, 0.72));
  }
  for (let y = 0; y < 7; y++) c.set(7, y, (o) => shade(o, 0.72));
  for (let y = 8; y < 15; y++) c.set(15, y, (o) => shade(o, 0.72));
  return c.png();
}

/** Thick steel bars: dark iron with a highlight down each bar. */
export function prisonBars() {
  const c = new Canvas(16, 16, '#3f444b');
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const t = (x % 4) / 3;
      c.set(x, y, shade(hex('#4a5058'), 0.8 + 0.5 * Math.sin(t * Math.PI) + (hash2(x, y, 4) - 0.5) * 0.08));
    }
  return c.png();
}

/** Barbed wire: two twisted strands with barbs, on transparency (cross model). */
export function barbedWire() {
  const c = new Canvas(16, 16, T);
  const wire = ['#6d6f72', '#8a8d91', '#55575a'];
  for (const base of [4, 11]) {
    for (let x = 0; x < 16; x++) {
      const y = base + Math.round(Math.sin(x * 0.8 + base) * 1);
      c.set(x, y, wire[x % 3]);
      if (x % 5 === 2) {
        // Barb: a small X.
        c.set(x - 1, y - 1, '#7c7f83').set(x + 1, y + 1, '#55575a').set(x + 1, y - 1, '#7c7f83').set(x - 1, y + 1, '#55575a');
      }
    }
  }
  // Rust specks.
  const r = rng(17);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    if (c.get(x, y)[3]) c.set(x, y, '#7a4a2a');
  }
  return c.png();
}

/** Razor wire: shiny loops of coiled blade tape. */
export function razorWire() {
  const c = new Canvas(16, 16, T);
  for (let k = 0; k < 3; k++) {
    const cx = 3 + k * 5, cy = 8;
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(t) * 3.4), y = Math.round(cy + Math.sin(t) * 6.2);
      c.set(x, y, a % 4 === 0 ? '#eef2f5' : a % 2 ? '#a7adb3' : '#c9ced3');
    }
  }
  return c.png();
}

/** Cell door halves: an iron frame with bars and open gaps between them. */
export function cellDoor(top) {
  const c = new Canvas(16, 16, T);
  const frame = '#5a6068';
  c.rect(0, 0, 3, 16, frame).rect(13, 0, 3, 16, frame);
  if (top) c.rect(0, 0, 16, 3, frame);
  else c.rect(0, 13, 16, 3, frame).rect(0, 0, 16, 2, frame);
  for (const x of [4, 7, 10]) c.rect(x, 0, 2, 16, '#6b7280');
  for (let y = 0; y < 16; y++) for (const x of [4, 7, 10]) c.set(x, y, '#7f8792');
  if (!top) {
    // Lock box and handle.
    c.rect(11, 5, 5, 5, '#454a51').set(12, 7, '#1f2226').set(13, 7, '#c9a227');
  }
  c.noise(0.05, top ? 3 : 4);
  for (const y of top ? [4, 13] : [3, 11]) c.rivet(1, y, frame).rivet(14, y, frame);
  return c.png();
}

export function cellDoorIcon() {
  const c = new Canvas(16, 16, T);
  c.rect(3, 0, 10, 16, '#5a6068');
  c.rect(4, 1, 8, 14, T);
  for (const x of [5, 7, 9]) c.rect(x, 1, 1, 14, '#7f8792');
  c.rect(10, 8, 2, 2, '#c9a227');
  return c.png();
}

// ---------------------------------------------------------------- surveillance

/** Monitor casing: dark grey plastic. */
export function monitorCase() {
  return new Canvas(16, 16, '#3a3d42').noise(0.04, 21).png();
}

export function monitorBack() {
  const c = new Canvas(16, 16, '#34373b').noise(0.04, 22);
  for (let y = 4; y < 12; y += 2) c.rect(3, y, 10, 1, '#1d1f22');
  return c.png();
}

/** Bezel: plastic frame, with a power LED. The screen itself is a separate face. */
export function monitorFront() {
  const c = new Canvas(16, 16, '#2e3135').noise(0.04, 23);
  c.rect(2, 2, 12, 10, '#111316');
  c.set(13, 13, '#46e046').set(12, 13, '#2f9a2f');
  c.rect(3, 13, 3, 1, '#4b4f55');
  return c.png();
}

/** Animated TV static (no signal): 4 frames, used by both editions. */
export function monitorStatic() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = new Canvas(16, 16);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const v = hash2(x, y, f * 13 + 5);
        const g = Math.round(40 + v * 150 + (y % 2 ? -18 : 0));
        c.set(x, y, [g, g, Math.min(255, g + 12), 255]);
      }
    frames.push(c);
  }
  return strip(frames).png();
}

// ---------------------------------------------------------------- lasers, sensors, alarms

export function laserCasing() {
  const c = darkSteel(31);
  c.frame(0, 0, 16, 16, (o) => shade(o, 0.8));
  c.rivet(2, 2).rivet(12, 2).rivet(2, 12).rivet(12, 12);
  return c.png();
}

/** Glowing lens (laser emitter, receiver eye). */
export function lens(color, { ring = '#1b1d20', bright = 1.35 } = {}) {
  const c = new Canvas(16, 16, ring);
  const base = hex(color);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5) / 8;
      c.set(x, y, shade(base, bright - d * 0.9));
    }
  c.set(5, 5, '#ffffff').set(6, 5, mix(base, hex('#ffffff'), 0.6));
  return c.png();
}

export function receiverFront(lit) {
  const c = darkSteel(33);
  c.disc(8, 8, 6, '#1b1d20');
  c.disc(8, 8, 4.2, lit ? '#ff4b3a' : '#5e1712');
  c.disc(8, 8, 2, lit ? '#ffd2c8' : '#3a0d0a');
  c.frame(0, 0, 16, 16, (o) => shade(o, 0.8));
  return c.png();
}

/** White plastic housing (motion sensor, keycard reader sides). */
export function whitePlastic(seed = 41) {
  return new Canvas(16, 16, '#d9dcd8').noise(0.03, seed).png();
}

/** Faceted PIR lens of a motion sensor, with a status LED. */
export function sensorLens(active) {
  const c = new Canvas(16, 16, '#d9dcd8').noise(0.03, 42);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const facet = (Math.floor(x / 3) + Math.floor(y / 3)) % 2;
      c.set(x, y, facet ? '#2b2e33' : '#3a3e44');
    }
  c.set(7, 7, active ? '#ff3b30' : '#5c1b17').set(8, 7, active ? '#ff8a80' : '#5c1b17');
  return c.png();
}

export function sirenLens(lit) {
  const c = new Canvas(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const stripe = Math.floor((x + y) / 3) % 2;
      const base = lit ? (stripe ? '#ff5a3c' : '#ff8a5c') : stripe ? '#8e1e15' : '#a8281c';
      c.set(x, y, base);
    }
  if (lit) c.rect(5, 5, 3, 3, '#ffe0c0');
  return c.png();
}

export function sirenBase() {
  const c = steel(43);
  c.frame(0, 0, 16, 16, (o) => shade(o, 0.75));
  return c.png();
}

/** Searchlight housing: olive drab painted metal. */
export function searchlightBody() {
  const c = new Canvas(16, 16, '#4d5a3a').brushed(0.05, 51);
  c.rivet(2, 2, '#6b7a52').rivet(12, 12, '#6b7a52');
  return c.png();
}

export function searchlightLens(lit) {
  const c = new Canvas(16, 16, lit ? '#fff6c8' : '#9aa2a8');
  for (let r = 1; r < 8; r += 2) {
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      c.set(Math.round(7.5 + Math.cos(t) * r), Math.round(7.5 + Math.sin(t) * r), lit ? '#ffe68a' : '#7f878d');
    }
  }
  if (lit) c.rect(6, 6, 4, 4, '#ffffff');
  return c.png();
}

// ---------------------------------------------------------------- access control

const LEVEL_COLORS = { 1: '#3f7fd9', 2: '#e08a1e', 3: '#9a3fd1' };

/** Keycard reader front: card slot, level stripe, status LED. */
export function readerFront(level, granted) {
  const c = new Canvas(16, 16, '#2f3236').noise(0.03, 60 + level);
  c.rect(4, 2, 8, 12, '#3b3f44').bevel(4, 2, 8, 12);
  c.rect(5, 4, 6, 1, '#0e0f11'); // card slot
  c.rect(5, 7, 6, 2, LEVEL_COLORS[level]);
  c.set(6, 11, granted ? '#2fe05a' : '#1c4a26').set(9, 11, granted ? '#3a1414' : '#ff3b30');
  return c.png();
}

export function readerSide() {
  return new Canvas(16, 16, '#2f3236').noise(0.03, 64).png();
}

// ---------------------------------------------------------------- traps and bridges

/** The trapdoor is camouflaged as stone bricks... nearly. One faint seam gives it away. */
export function pitTrapdoor() {
  const c = stoneBricks(2);
  for (let x = 1; x < 7; x++) c.set(x, 8, (o) => shade(o, 0.93));
  return c.png();
}

export function pitTrapdoorUnderside() {
  const c = new Canvas(16, 16, '#4f4a44').noise(0.05, 71);
  for (const y of [3, 12]) c.rect(1, y, 14, 1, '#3a3631');
  c.rivet(2, 2, '#6d6862').rivet(13, 13, '#6d6862');
  return c.png();
}

export function winchSide() {
  const c = planks(81, '#6b4f30');
  c.rect(0, 0, 16, 2, '#4b5057').rect(0, 14, 16, 2, '#4b5057');
  c.rect(0, 0, 2, 16, '#4b5057').rect(14, 0, 2, 16, '#4b5057');
  c.rivet(0, 0).rivet(14, 0).rivet(0, 14).rivet(14, 14);
  return c.png();
}

/** The winch drum: coils of rope seen from the front. */
export function winchFront() {
  const c = new Canvas(16, 16).paste(new Canvas(16, 16, '#4b5057').brushed(0.05, 82));
  c.rect(2, 3, 12, 10, '#8a6a3e');
  for (let y = 3; y < 13; y++)
    for (let x = 2; x < 14; x++) {
      const coil = (x + Math.floor(y / 2)) % 3;
      c.set(x, y, coil === 0 ? '#6e5230' : coil === 1 ? '#a2814e' : '#8a6a3e');
    }
  c.rect(0, 7, 2, 2, '#2a2d31').rect(14, 7, 2, 2, '#2a2d31');
  return c.png();
}

export function winchTop() {
  const c = new Canvas(16, 16, '#4b5057').brushed(0.05, 83);
  c.disc(8, 8, 3, '#3a3d42');
  c.disc(8, 8, 1.5, '#8f959c');
  return c.png();
}

export function deckPlanks() {
  const c = planks(91, '#8a6a42');
  // Planks run across the deck, with nail heads.
  for (let y = 1; y < 16; y += 4) c.set(2, y, '#3d3f42').set(13, y, '#3d3f42');
  return c.png();
}

export function rope() {
  const c = new Canvas(16, 16, '#a88a5a');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 < 2) c.set(x, y, '#8a6e42');
  return c.png();
}

// ---------------------------------------------------------------- item icons

const P = {
  k: '#1b1d20', d: '#3a3d42', g: '#6b7078', l: '#b9bec4', w: '#f2f2f2', r: '#d8352a', R: '#ff6b5e',
  y: '#e8c547', b: '#3f7fd9', o: '#e08a1e', p: '#9a3fd1', n: '#7a5a36', N: '#5a3f22', t: '#c9b48a',
  c: '#4f7fb8', C: '#89b3e0', G: '#3c8f3c', s: '#c7c7c7',
};

/** Hand-pixelled icons, one row of 16 characters per pixel row. */
export const ICONS = {
  security_camera: [
    '................',
    '................',
    '...llllllllll...',
    '..lsssssssssskd.',
    '..lsssssssssskkk',
    '..lsssssssssskkk',
    '..lddddddddddkd.',
    '...kkkkkkkkkk...',
    '......kgk.......',
    '......kgk.......',
    '.....dgggd......',
    '....dggggg d....',
    '....ddddddd.....',
    '.........r......',
    '................',
    '................',
  ],
  camera_linker: [
    '................',
    '....kkkkkkkk....',
    '...kddddddddk...',
    '...kdCCCCCCdk...',
    '...kdCcccccdk...',
    '...kdCcGGccdk...',
    '...kdCccccCdk...',
    '...kdCCCCCCdk...',
    '...kddddddddk...',
    '...kdrdgdgddk...',
    '...kddddddddk...',
    '...kdgdgdgddk...',
    '...kddddddddk...',
    '....kkkkkkkk....',
    '......k..k......',
    '................',
  ],
  baton: [
    '................',
    '............kk..',
    '...........kgk..',
    '..........kgk...',
    '.........kgk....',
    '........kgk.....',
    '.......kgk......',
    '......kgk.......',
    '.....kdk........',
    '....kdkk........',
    '...kkdk.........',
    '..kddk..........',
    '..kdk...........',
    '...k............',
    '................',
    '................',
  ],
};

/** Keycards: white plastic card with a coloured band and a chip. */
export function keycardIcon(level) {
  const band = { 1: 'b', 2: 'o', 3: 'p' }[level];
  const rows = [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kwwwwwwwwwwwwk.',
    `.k${band.repeat(12)}k.`,
    `.k${band.repeat(12)}k.`,
    '.kwwwwwwwwwwwwk.',
    '.kwyywwwddddwwk.',
    '.kwyywwwwwwwwwk.',
    '.kwwwwwwddddwwk.',
    '.kwwwwwwwwwwwwk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ];
  return { rows, palette: P };
}

/** Blueprints: rolled blue paper with a white drawing of what it builds. */
export function blueprintIcon(kind) {
  const drawings = {
    guard_tower: ['...ww...', '..wwww..', '..w..w..', '...ww...', '...ww...', '..w..w..', '.w....w.', 'w......w'],
    prison_cell: ['wwwwwwww', 'w.w.w..w', 'w.w.w..w', 'w.w.w..w', 'w.w.w..w', 'w.w.w..w', 'w.w.w..w', 'wwwwwwww'],
    gatehouse: ['www..www', 'w.w..w.w', 'www..www', 'w.w..w.w', 'w.wrrw.w', 'w.w..w.w', 'w.w..w.w', 'www..www'],
  }[kind];
  const rows = [
    '................',
    '..tttttttttttt..',
    '.tcccccccccccct.',
    '.tcccccccccccct.',
    ...drawings.map((d) => `.tcc${d.replace(/\./g, "c").replace(/w/g, "W")}cct.`),
    '.tcccccccccccct.',
    '.tcccccccccccct.',
    '..tttttttttttt..',
    '................',
  ];
  return { rows, palette: { ...P, W: "#e8f0ff" } };
}

export { LEVEL_COLORS };

// ---------------------------------------------------------------- bombs

/** Dynamite stick paper: red with a pale label band. */
export function dynamite() {
  const c = new Canvas(16, 16, '#b3261e').noise(0.06, 101);
  for (let x = 0; x < 16; x++) {
    c.set(x, 6, '#e9dcc0').set(x, 7, '#e9dcc0').set(x, 8, '#d8c8a8');
    if (x % 4 === 1) c.set(x, 7, '#3a1a14');
  }
  for (let y = 0; y < 16; y++) c.set(0, y, (o) => shade(o, 0.7)).set(15, y, (o) => shade(o, 0.7));
  return c.png();
}

export function dynamiteEnd() {
  const c = new Canvas(16, 16, '#d9c9a5');
  c.disc(8, 8, 3, '#8a7a5a').disc(8, 8, 1.2, '#2a2420');
  return c.png();
}

/** Timer display: an LCD that reads 0:10 (green) or counts in red when armed. */
export function bombClock(armed) {
  const c = new Canvas(16, 16, '#26282b').noise(0.03, 102);
  c.rect(2, 3, 12, 8, armed ? '#2a0606' : '#0d2410');
  const on = armed ? '#ff3b30' : '#4cff6a';
  // Seven-segment-ish "0:10".
  const digit0 = (x) => c.frame(x, 4, 3, 6, on);
  digit0(3);
  c.set(7, 5, on).set(7, 8, on);
  c.rect(9, 4, 1, 6, on);
  digit0(11);
  c.set(3, 13, armed ? '#ff3b30' : '#5c1b17').set(12, 13, '#c9a227');
  return c.png();
}

export function tape() {
  return new Canvas(16, 16, '#3a3d42').brushed(0.08, 103).png();
}

/** Olive drab directional mine casing. */
export function mineBody() {
  return new Canvas(16, 16, '#58603f').noise(0.05, 104).png();
}

export function mineFront() {
  const c = new Canvas(16, 16, '#58603f').noise(0.05, 105);
  // Raised lettering band and the tripwire spool.
  for (let x = 2; x < 14; x++) if (x % 2 === 0) c.set(x, 4, '#c8c3a0');
  for (let x = 3; x < 13; x++) if (x % 3 !== 0) c.set(x, 6, '#c8c3a0');
  c.disc(8, 11, 2.2, '#2a2d31').disc(8, 11, 1, '#9aa0a6');
  return c.png();
}

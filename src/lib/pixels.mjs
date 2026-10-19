// Tiny pixel canvas for hand-composed block and item textures. Everything is
// drawn in code with deterministic noise, so builds are reproducible.
import { PNG } from 'pngjs';
import { hex, mix, shade } from './texture.mjs';

/** Deterministic pseudo-random generator (LCG) returning floats in [0, 1). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Per-texel hash in [0, 1), stable across builds. */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 144665) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Canvas {
  constructor(w = 16, h = 16, fill) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null).map(() => [0, 0, 0, 0]);
    if (fill) this.fill(fill);
  }

  get(x, y) {
    return this.px[y * this.w + x];
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = typeof c === 'function' ? c(this.get(x, y), x, y) : hex(c);
    return this;
  }

  fill(c) {
    return this.rect(0, 0, this.w, this.h, c);
  }

  /** Filled rectangle; c may be a colour or (old, x, y) => colour. */
  rect(x0, y0, w, h, c) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
    return this;
  }

  /** One-pixel outline of a rectangle. */
  frame(x0, y0, w, h, c) {
    for (let x = x0; x < x0 + w; x++) {
      this.set(x, y0, c);
      this.set(x, y0 + h - 1, c);
    }
    for (let y = y0; y < y0 + h; y++) {
      this.set(x0, y, c);
      this.set(x0 + w - 1, y, c);
    }
    return this;
  }

  /** Bevel: light top/left edge, dark bottom/right edge. */
  bevel(x0, y0, w, h, light = 1.18, dark = 0.72) {
    for (let x = x0; x < x0 + w; x++) {
      this.set(x, y0, (c) => shade(c, light));
      this.set(x, y0 + h - 1, (c) => shade(c, dark));
    }
    for (let y = y0 + 1; y < y0 + h - 1; y++) {
      this.set(x0, y, (c) => shade(c, light));
      this.set(x0 + w - 1, y, (c) => shade(c, dark));
    }
    return this;
  }

  /** Brightness jitter per texel. */
  noise(amount = 0.08, seed = 1, where) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (where && !where(x, y)) continue;
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        this.set(x, y, shade(c, 1 + (hash2(x, y, seed) - 0.5) * 2 * amount));
      }
    return this;
  }

  /** Horizontal brushed-metal streaks. */
  brushed(amount = 0.06, seed = 3) {
    for (let y = 0; y < this.h; y++) {
      const row = (hash2(0, y, seed) - 0.5) * 2 * amount;
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        this.set(x, y, shade(c, 1 + row + (hash2(x, y, seed + 9) - 0.5) * amount * 0.6));
      }
    }
    return this;
  }

  /** Rivet: light top-left, dark bottom-right pixel pair. */
  rivet(x, y, base = '#9aa0a6') {
    this.set(x, y, shade(hex(base), 1.3));
    this.set(x + 1, y + 1, shade(hex(base), 0.6));
    return this;
  }

  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
    return this;
  }

  disc(cx, cy, r, c) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) this.set(x, y, c);
    return this;
  }

  /** Paste another canvas at (dx, dy). Transparent texels are skipped. */
  paste(other, dx = 0, dy = 0) {
    for (let y = 0; y < other.h; y++)
      for (let x = 0; x < other.w; x++) {
        const c = other.get(x, y);
        if (c[3]) this.set(dx + x, dy + y, c);
      }
    return this;
  }

  clone() {
    const c = new Canvas(this.w, this.h);
    c.px = this.px.map((p) => [...p]);
    return c;
  }

  map(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, fn(this.get(x, y), x, y));
    return this;
  }

  png() {
    const png = new PNG({ width: this.w, height: this.h });
    this.px.forEach((c, i) => png.data.set(c, i * 4));
    return PNG.sync.write(png);
  }

  /** Nearest-neighbour upscale (for previews and pack icons). */
  scaled(f) {
    const out = new Canvas(this.w * f, this.h * f);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = [...this.get(Math.floor(x / f), Math.floor(y / f))];
    return out;
  }
}

/** Stack frames vertically (Java .mcmeta and Bedrock flipbook animation strips). */
export function strip(frames) {
  const out = new Canvas(frames[0].w, frames[0].h * frames.length);
  frames.forEach((f, i) => out.paste(f, 0, i * f.h));
  return out;
}

export { hex, mix, shade };

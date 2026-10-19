// Pack and mod icon: a security camera on a prison wall at night, with a laser
// beam across the yard. Drawn at 32x32 and scaled up.
import { Canvas, hash2, hex, mix } from './lib/pixels.mjs';

export function packIcon(scale = 8) {
  const c = new Canvas(32, 32);
  // Night sky gradient with a few stars.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) c.set(x, y, mix(hex('#0b1026'), hex('#28345e'), y / 20));
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash2(i, 1, 7) * 32), y = Math.floor(hash2(i, 2, 7) * 14);
    c.set(x, y, '#dfe6ff');
  }
  // Searchlight cone.
  for (let y = 4; y < 22; y++)
    for (let x = 0; x < 32; x++) {
      const t = (22 - y) / 18;
      const centre = 25 - t * 18;
      if (Math.abs(x - centre) < 1 + t * 4) c.set(x, y, (o) => mix(o, hex('#fff3b8'), 0.35));
    }
  // Concrete wall with bars window.
  c.rect(0, 20, 32, 12, '#8e9095').noise(0.06, 3, (x, y) => y >= 20);
  for (let x = 0; x < 32; x++) c.set(x, 20, '#a8aab0');
  c.rect(3, 23, 9, 7, '#1b1d20');
  for (const x of [4, 6, 8, 10]) c.rect(x, 23, 1, 7, '#6b7280');
  // Laser beam.
  for (let x = 13; x < 32; x++) c.set(x, 28, x % 2 ? '#ff3b30' : '#ff8a80');
  c.rect(12, 27, 2, 3, '#3a3d42');
  // Camera on a bracket.
  c.rect(20, 14, 2, 6, '#5a5f66');
  c.rect(14, 10, 11, 5, '#e4e5e0');
  c.rect(14, 9, 12, 1, '#cfd1cb');
  c.rect(12, 11, 2, 3, '#121519');
  c.set(12, 11, '#6fa8ff');
  c.set(23, 13, '#ff3b30');
  return c.scaled(scale).png();
}

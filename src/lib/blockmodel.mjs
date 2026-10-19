// Block models are written once as Java-style elements (0..16 pixel boxes with a
// texture per face) and converted to both Java block models and Bedrock block
// geometry. Directional models face north (-z) and are left/right symmetric, so
// the two editions agree even though Bedrock mirrors the x axis.
import { NS } from './constants.mjs';

const FACES = ['north', 'south', 'east', 'west', 'up', 'down'];

/** Box with the same texture on every face (or a { face: texture } map, with `rest` as fallback). */
export function box(from, to, tex, extra = {}) {
  const faces = {};
  for (const f of FACES) {
    const t = typeof tex === 'string' ? tex : tex[f] ?? tex.rest;
    if (t) faces[f] = t;
  }
  return { from, to, faces, ...extra };
}

/** Vanilla's automatic UVs: what Java uses when a face gives no "uv". */
function autoUV(face, [x0, y0, z0], [x1, y1, z1]) {
  switch (face) {
    case 'north': return [16 - x1, 16 - y1, 16 - x0, 16 - y0];
    case 'south': return [x0, 16 - y1, x1, 16 - y0];
    case 'west': return [z0, 16 - y1, z1, 16 - y0];
    case 'east': return [16 - z1, 16 - y1, 16 - z0, 16 - y0];
    case 'up': return [x0, z0, x1, z1];
    case 'down': return [x0, 16 - z1, x1, 16 - z0];
  }
  throw new Error(face);
}

const faceTexture = (f) => (typeof f === 'string' ? { tex: f } : f);

/**
 * Java block model JSON.
 * model: { elements: [{ from, to, faces: { north: 'tex' | { tex, uv, rotation, cull } }, rotation?, shade? }], particle? }
 * textures: { key: 'secgear:block/<file>' }
 */
export function javaModel(model, textures) {
  const elements = model.elements.map((el) => {
    const faces = {};
    for (const [f, spec] of Object.entries(el.faces)) {
      const { tex, uv, rotation, cull, tint } = faceTexture(spec);
      faces[f] = { uv: uv ?? autoUV(f, el.from, el.to), texture: `#${tex}` };
      if (rotation) faces[f].rotation = rotation;
      if (cull) faces[f].cullface = cull === true ? f : cull;
      if (tint !== undefined) faces[f].tintindex = tint;
    }
    const out = { from: el.from, to: el.to, faces };
    if (el.rotation) out.rotation = { origin: el.rotation.origin ?? [8, 8, 8], axis: el.rotation.axis, angle: el.rotation.angle };
    if (el.shade === false) out.shade = false;
    if (el.light) out.light_emission = el.light;
    return out;
  });
  const used = new Set(model.elements.flatMap((el) => Object.values(el.faces).map((f) => faceTexture(f).tex)));
  const tex = Object.fromEntries([...used].map((k) => [k, textures[k]]));
  tex.particle = textures[model.particle ?? [...used][0]];
  const out = { parent: 'minecraft:block/block', textures: tex, elements };
  if (model.ao === false) out.ambientocclusion = false;
  if (model.display) out.display = model.display;
  return out;
}

/**
 * Bedrock block geometry. Each element becomes a cube in the bone named by
 * `el.bone` (default "block"); each face references a material instance named
 * after its texture key, which the block's material_instances map to textures.
 */
export function bedrockGeometry(identifier, model) {
  const bones = new Map();
  for (const el of model.elements) {
    const name = el.bone ?? 'block';
    if (!bones.has(name)) bones.set(name, { name, pivot: [0, 0, 0], cubes: [] });
    const [x0, y0, z0] = el.from, [x1, y1, z1] = el.to;
    const uv = {};
    for (const [f, spec] of Object.entries(el.faces)) {
      const { tex, uv: u } = faceTexture(spec);
      const [u0, v0, u1, v1] = u ?? autoUV(f, el.from, el.to);
      // Bedrock flips the up and down faces vertically compared with Java.
      uv[f] = f === 'up' || f === 'down'
        ? { uv: [u1, v1], uv_size: [u0 - u1, v0 - v1], material_instance: tex }
        : { uv: [u0, v0], uv_size: [u1 - u0, v1 - v0], material_instance: tex };
    }
    const cube = { origin: [8 - x1, y0, z0 - 8], size: [x1 - x0, y1 - y0, z1 - z0], uv };
    if (el.rotation) {
      const o = el.rotation.origin ?? [8, 8, 8];
      const r = [0, 0, 0];
      const i = { x: 0, y: 1, z: 2 }[el.rotation.axis];
      // Mirrored x axis: rotations about y and z change sign.
      r[i] = i === 0 ? el.rotation.angle : -el.rotation.angle;
      cube.rotation = r;
      cube.pivot = [8 - o[0], o[1], o[2] - 8];
    }
    bones.get(name).cubes.push(cube);
  }
  return {
    description: { identifier, texture_width: 16, texture_height: 16 },
    bones: [...bones.values()],
  };
}

export function geometryFile(geometries) {
  return { format_version: '1.21.0', 'minecraft:geometry': geometries };
}

// ---------------------------------------------------------------- Java blockstates

const H_ROT = { north: 0, east: 90, south: 180, west: 270 };

/** variants keyed by facing (horizontal), with optional extra properties: { 'open=true': 'model' }. */
export function horizontalVariants(modelFor, extra = ['']) {
  const variants = {};
  for (const [facing, y] of Object.entries(H_ROT)) {
    for (const e of extra) {
      const key = [`facing=${facing}`, e].filter(Boolean).join(',');
      const v = { model: modelFor(e) };
      if (y) v.y = y;
      variants[key] = v;
    }
  }
  return { variants };
}

/** All six directions; the model's front faces north. */
export function facingVariants(modelFor, extra = ['']) {
  const rot = { ...Object.fromEntries(Object.entries(H_ROT).map(([k, y]) => [k, { y }])), up: { x: 270 }, down: { x: 90 } };
  const variants = {};
  for (const [facing, r] of Object.entries(rot)) {
    for (const e of extra) {
      const key = [`facing=${facing}`, e].filter(Boolean).join(',');
      const v = { model: modelFor(e) };
      if (r.x) v.x = r.x;
      if (r.y) v.y = r.y;
      variants[key] = v;
    }
  }
  return { variants };
}

export const blockId = (name) => `${NS}:block/${name}`;

// ---------------------------------------------------------------- Bedrock permutations

/** Rotate by the cardinal_direction placement trait (front faces that direction). */
export function cardinalPermutations(extra = []) {
  const rot = { north: 0, west: 90, south: 180, east: -90 };
  return Object.entries(rot).map(([d, y]) => ({
    condition: `q.block_state('minecraft:cardinal_direction') == '${d}'`,
    components: { 'minecraft:transformation': { rotation: [0, y, 0] }, ...extra },
  }));
}

/** Rotate by the face the block was placed against (six directions; the front points away from it). */
export function facingPermutations() {
  const rot = { north: [0, 0, 0], west: [0, 90, 0], south: [0, 180, 0], east: [0, -90, 0], up: [90, 0, 0], down: [-90, 0, 0] };
  return Object.entries(rot).map(([d, r]) => ({
    condition: `q.block_state('minecraft:block_face') == '${d}'`,
    components: { 'minecraft:transformation': { rotation: r } },
  }));
}

/** Bedrock selection/collision box from Java pixel bounds. */
export function bedrockBox([x0, y0, z0], [x1, y1, z1]) {
  return { origin: [8 - x1, y0, z0 - 8], size: [x1 - x0, y1 - y0, z1 - z0] };
}

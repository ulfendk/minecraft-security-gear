// Box-UV models (Bedrock geometry, read as-is by GeckoLib on Java): the security
// camera, the searchlight, the security guard, the criminals and the guard dog.
// Coordinates: pixels, y up, the model faces north (-z), +x is the model's left.
import { quadruped } from './lib/anim.mjs';
import { felid } from './lib/bodies.mjs';
import { all, bone, face, LEGS, notFace } from './lib/parts.mjs';
import { fur, gradient, mottle, region, TRANSPARENT, underside } from './lib/texture.mjs';

const r = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- security camera

/**
 * Bullet camera. `head` pans (yaw, set from code on Java and by animation on
 * Bedrock); `tilt` looks 20 degrees down. The wall bracket sits against the
 * block's back (+z); the ceiling bracket is shown instead when hung from a ceiling.
 */
export const CAMERA_TILT = 20;

export const camera = {
  id: 'security_camera',
  model: {
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      {
        name: 'wall_mount', parent: 'root', pivot: [0, 8, 8],
        cubes: [
          { origin: [-3, 5, 7], size: [6, 6, 1], mat: 'bracket' },
          { origin: [-1, 7, 2], size: [2, 2, 5], mat: 'bracket' },
        ],
      },
      {
        name: 'ceiling_mount', parent: 'root', pivot: [0, 16, 0],
        cubes: [
          { origin: [-3, 15, -3], size: [6, 1, 6], mat: 'bracket' },
          { origin: [-1, 11, -1], size: [2, 4, 2], mat: 'bracket' },
        ],
      },
      { name: 'head', parent: 'root', pivot: [0, 9, 1] },
      {
        name: 'tilt', parent: 'head', pivot: [0, 9, 1], rotation: [CAMERA_TILT, 0, 0],
        cubes: [
          { origin: [-3, 6, -6], size: [6, 5, 10], mat: 'housing' },
          { origin: [-3, 11, -8], size: [6, 1, 11], mat: 'hood' },
          {
            origin: [-2, 7, -7], size: [4, 3, 1], mat: 'lens',
            marks: [{ face: 'front', x: 1, y: 1, color: '#6fa8ff' }, { face: 'front', x: 2, y: 0, color: '#ff3b30' }],
          },
        ],
      },
    ],
  },
  materials: {
    housing: { base: '#e4e5e0', layers: [mottle(0.03)] },
    hood: '#cfd1cb',
    lens: '#121519',
    bracket: { base: '#5a5f66', layers: [mottle(0.04)] },
  },
  anims: {
    pan: {
      loop: true, animation_length: 8,
      bones: { head: { rotation: { '0.0': [0, -40, 0], '4.0': [0, 40, 0], '8.0': [0, -40, 0] } } },
    },
    still: { loop: true, bones: {} },
  },
};

// ---------------------------------------------------------------- searchlight

export const searchlight = {
  id: 'searchlight',
  model: {
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      {
        name: 'base', parent: 'root', pivot: [0, 0, 0],
        cubes: [
          { origin: [-5, 0, -5], size: [10, 2, 10], mat: 'base' },
          { origin: [-1, 2, -1], size: [2, 3, 2], mat: 'base' },
        ],
      },
      {
        name: 'head', parent: 'root', pivot: [0, 9, 0],
        cubes: [
          { origin: [-6, 5, -1], size: [1, 7, 2], mat: 'base' },
          { origin: [5, 5, -1], size: [1, 7, 2], mat: 'base' },
          { origin: [-6, 5, -1], size: [12, 1, 2], mat: 'base' },
        ],
      },
      {
        name: 'drum', parent: 'head', pivot: [0, 10, 0], rotation: [-10, 0, 0],
        cubes: [
          { origin: [-4, 6, -4], size: [8, 8, 8], mat: 'body' },
          { origin: [-5, 5, -6], size: [10, 10, 2], mat: 'body' },
          { origin: [-4, 6, -7], size: [8, 8, 1], mat: 'lens' },
          { origin: [-3, 7, 4], size: [6, 6, 1], mat: 'body' },
        ],
      },
    ],
  },
  materials: {
    body: { base: '#4d5a3a', layers: [mottle(0.05)] },
    base: { base: '#3f444a', layers: [mottle(0.04)] },
    lens: '#9aa2a8',
  },
  litMaterials: { lens: '#fff3b8' },
};

// ---------------------------------------------------------------- security guard

const SKINS = ['#c99a78', '#8d5e3f', '#e3b994'];

function guardModel() {
  return {
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      {
        name: 'body', parent: 'root', pivot: [0, 24, 0],
        cubes: [{
          origin: [-4, 12, -2], size: [8, 12, 4], mat: 'uniform',
          marks: [
            { face: 'front', x: 1, y: 2, w: 2, h: 2, color: '#e8c547' }, // badge
            { face: 'front', x: 5, y: 2, w: 2, h: 1, color: '#d8dde3' }, // name tag
            { face: 'front', x: 0, y: 10, w: 8, h: 1, color: '#1b1b1b' }, // belt
            { face: 'front', x: 3, y: 10, w: 2, h: 1, color: '#b9bec4' }, // buckle
            { face: 'back', x: 0, y: 10, w: 8, h: 1, color: '#1b1b1b' },
            { face: 'left', x: 0, y: 10, w: 4, h: 1, color: '#1b1b1b' },
            { face: 'right', x: 0, y: 10, w: 4, h: 1, color: '#1b1b1b' },
          ],
        }],
      },
      {
        name: 'head', parent: 'body', pivot: [0, 24, 0],
        cubes: [
          {
            origin: [-4, 24, -4], size: [8, 8, 8], mat: 'skin',
            marks: [
              { face: 'front', x: 1, y: 4, w: 2, h: 1, color: '#f2f2f2' },
              { face: 'front', x: 5, y: 4, w: 2, h: 1, color: '#f2f2f2' },
              { face: 'front', x: 2, y: 4, color: '#2a3f66' },
              { face: 'front', x: 5, y: 4, color: '#2a3f66' },
              { face: 'front', x: 1, y: 3, w: 2, h: 1, color: '#3a2a20' }, // brows
              { face: 'front', x: 5, y: 3, w: 2, h: 1, color: '#3a2a20' },
              { face: 'front', x: 3, y: 6, w: 2, h: 1, color: '#7a4a3a' }, // mouth
              { face: 'left', x: 0, y: 2, w: 8, h: 2, color: '#3a2a20' }, // short hair under the cap
              { face: 'right', x: 0, y: 2, w: 8, h: 2, color: '#3a2a20' },
              { face: 'back', x: 0, y: 2, w: 8, h: 3, color: '#3a2a20' },
            ],
          },
        ],
      },
      {
        name: 'cap', parent: 'head', pivot: [0, 32, 0],
        cubes: [
          { origin: [-4, 30, -4], size: [8, 3, 8], mat: 'cap', inflate: 0.3, marks: [{ face: 'front', x: 3, y: 1, w: 2, h: 1, color: '#e8c547' }] },
          { origin: [-4, 30, -7], size: [8, 1, 3], mat: 'brim' },
        ],
      },
      {
        name: 'arm_r', parent: 'body', pivot: [-6, 22, 0],
        cubes: [
          { origin: [-8, 12, -2], size: [4, 12, 4], mat: 'sleeve', marks: [{ face: 'right', x: 1, y: 1, w: 2, h: 2, color: '#e8c547' }] },
        ],
      },
      {
        name: 'baton', parent: 'arm_r', pivot: [-6, 13, -1],
        cubes: [{ origin: [-7, 12, -11], size: [2, 2, 10], mat: 'baton' }],
      },
      {
        name: 'arm_l', parent: 'body', pivot: [6, 22, 0],
        cubes: [
          { origin: [4, 12, -2], size: [4, 12, 4], mat: 'sleeve', marks: [{ face: 'left', x: 1, y: 1, w: 2, h: 2, color: '#e8c547' }] },
        ],
      },
      { name: 'leg_r', parent: 'root', pivot: [-2, 12, 0], cubes: [{ origin: [-4, 0, -2], size: [4, 12, 4], mat: 'trousers' }] },
      { name: 'leg_l', parent: 'root', pivot: [2, 12, 0], cubes: [{ origin: [0, 0, -2], size: [4, 12, 4], mat: 'trousers' }] },
    ],
  };
}

const hands = (skin) => region(skin, ({ p }) => p[1] < 15);
const boots = region('#1d1d1f', ({ p }) => p[1] < 2);

function guardMaterials(skin) {
  return {
    skin,
    uniform: { base: '#2f4a7a', layers: [mottle(0.05)] },
    sleeve: { base: '#2f4a7a', layers: [hands(skin), mottle(0.05)] },
    trousers: { base: '#1f2a40', layers: [boots, mottle(0.04)] },
    cap: { base: '#1c2a46', layers: [mottle(0.04)] },
    brim: '#111827',
    baton: '#1d1d1f',
  };
}

/** Upright two-legged walk, idle breathing and a baton swing. */
function bipedAnims() {
  const cycle = (len, n, f) => {
    const out = {};
    for (let k = 0; k <= n; k++) out[r((k / n) * len).toFixed(2)] = f((k % n) / n).map(r);
    return out;
  };
  const s = (p, o = 0) => Math.sin((p + o) * Math.PI * 2);
  const walk = (len, amp) => ({
    loop: true, animation_length: len,
    bones: {
      leg_l: { rotation: cycle(len, 8, (p) => [amp * s(p), 0, 0]) },
      leg_r: { rotation: cycle(len, 8, (p) => [-amp * s(p), 0, 0]) },
      arm_l: { rotation: cycle(len, 8, (p) => [-amp * 0.8 * s(p), 0, 0]) },
      arm_r: { rotation: cycle(len, 8, (p) => [amp * 0.8 * s(p) - 10, 0, 0]) },
    },
  });
  return {
    idle: {
      loop: true, animation_length: 4,
      bones: {
        arm_l: { rotation: cycle(4, 8, (p) => [0, 0, 2 + 2 * s(p)]) },
        arm_r: { rotation: cycle(4, 8, (p) => [-10, 0, -2 - 2 * s(p)]) },
        head: { rotation: cycle(4, 8, (p) => [0, 8 * s(p, 0.2), 0]) },
      },
    },
    walk: walk(1.0, 30),
    run: walk(0.6, 45),
    attack: {
      animation_length: 0.5,
      bones: { arm_r: { rotation: { '0.0': [-10, 0, 0], '0.15': [-140, 0, 10], '0.3': [-20, 0, -5], '0.5': [-10, 0, 0] } } },
    },
  };
}

export const guard = {
  id: 'security_guard',
  model: guardModel(),
  materials: guardMaterials(SKINS[0]),
  variants: SKINS.map((skin, i) => ({ texture: i === 0 ? null : `skin${i}`, materials: guardMaterials(skin) })),
  anims: bipedAnims(),
  egg: ['#2f4a7a', '#e8c547'],
};

// ---------------------------------------------------------------- criminals

/**
 * Guard-shaped body without the cap and baton. `hat` is a head overlay (like the
 * player's hat layer) and `crown`/`brim` make a fedora; each outfit paints them
 * or leaves them transparent.
 */
function criminalModel() {
  const face = [
    { face: 'front', x: 1, y: 4, w: 2, h: 1, color: '#f2f2f2' },
    { face: 'front', x: 5, y: 4, w: 2, h: 1, color: '#f2f2f2' },
    { face: 'front', x: 2, y: 4, color: '#3a2a20' },
    { face: 'front', x: 5, y: 4, color: '#3a2a20' },
    { face: 'front', x: 1, y: 3, w: 2, h: 1, color: '#2a1d16' }, // brows
    { face: 'front', x: 5, y: 3, w: 2, h: 1, color: '#2a1d16' },
    { face: 'front', x: 3, y: 6, w: 2, h: 1, color: '#7a4a3a' }, // mouth
  ];
  return {
    bones: [
      { name: 'root', pivot: [0, 0, 0] },
      { name: 'body', parent: 'root', pivot: [0, 24, 0], cubes: [{ origin: [-4, 12, -2], size: [8, 12, 4], mat: 'shirt' }] },
      { name: 'head', parent: 'body', pivot: [0, 24, 0], cubes: [{ origin: [-4, 24, -4], size: [8, 8, 8], mat: 'head', marks: face }] },
      {
        name: 'hat', parent: 'head', pivot: [0, 32, 0],
        cubes: [
          { origin: [-4, 24, -4], size: [8, 8, 8], mat: 'hat', inflate: 0.5 },
          { origin: [-6, 30, -6], size: [12, 1, 12], mat: 'brim' },
          { origin: [-3, 32, -3], size: [6, 2, 6], mat: 'crown', inflate: 0.25 },
        ],
      },
      { name: 'arm_r', parent: 'body', pivot: [-6, 22, 0], cubes: [{ origin: [-8, 12, -2], size: [4, 12, 4], mat: 'sleeve' }] },
      { name: 'arm_l', parent: 'body', pivot: [6, 22, 0], cubes: [{ origin: [4, 12, -2], size: [4, 12, 4], mat: 'sleeve' }] },
      { name: 'leg_r', parent: 'root', pivot: [-2, 12, 0], cubes: [{ origin: [-4, 0, -2], size: [4, 12, 4], mat: 'trousers' }] },
      { name: 'leg_l', parent: 'root', pivot: [2, 12, 0], cubes: [{ origin: [0, 0, -2], size: [4, 12, 4], mat: 'trousers' }] },
    ],
  };
}

const T = TRANSPARENT;
const CRIMINAL_SKIN = '#c99a78'; // one neutral tone for every outfit
/** Hair on top, a fringe along the front's top row, and down the sides and back. */
const hair = (color, low = 29) => region(color, ({ p, face: f, j }) => f === 'top' || (f === 'front' ? j === 0 : f !== 'bottom' && p[1] > (f === 'back' ? low - 3 : low)));
const bands = (color, { size = 2, axis = 1 } = {}) => region(color, ({ p }) => Math.floor(p[axis] / size) % 2 === 0);
const shoes = (color) => region(color, ({ p }) => p[1] < 2);

/** Four outfits: striped convict, orange jumpsuit, masked burglar and pinstriped gangster. */
const OUTFITS = [
  {
    skin: CRIMINAL_SKIN, hairColor: '#4a3020',
    shirt: { base: '#efe9da', layers: [bands('#26262a'), region('#ffffff', ({ face: f, i, j }) => f === 'front' && i >= 1 && i <= 3 && j >= 2 && j <= 3), region('#26262a', ({ face: f, i, j }) => f === 'front' && j === 3 && (i === 1 || i === 3))] },
    sleeve: { base: '#efe9da', layers: [bands('#26262a')] },
    trousers: { base: '#efe9da', layers: [bands('#26262a'), shoes('#2a2420')] },
    hat: { base: T, layers: [bands('#26262a', { size: 1 }), region(T, ({ p }) => p[1] < 30)] }, // pillbox cap
    hatBase: '#efe9da',
  },
  {
    skin: CRIMINAL_SKIN, hairColor: '#17110d',
    shirt: { base: '#e8742a', layers: [region('#1d1d1f', ({ face: f, i, j }) => f === 'back' && j >= 2 && j <= 3 && i >= 1 && i <= 6 && (i + j) % 3), mottle(0.05)] },
    sleeve: { base: '#e8742a', layers: [mottle(0.05)] },
    trousers: { base: '#e8742a', layers: [shoes('#e6e6e6'), mottle(0.05)] },
  },
  {
    skin: CRIMINAL_SKIN, hairColor: '#8a4a22',
    // Eye mask across the brows and eyes.
    mask: region('#141416', ({ face: f, j, i }) => (f === 'front' && j >= 3 && j <= 4) || ((f === 'left' || f === 'right') && j >= 3 && j <= 4 && i >= 6)),
    shirt: { base: '#f0f0f0', layers: [bands('#1d1d1f', { size: 1 })] },
    sleeve: { base: '#f0f0f0', layers: [bands('#1d1d1f', { size: 1 })] },
    trousers: { base: '#1f1f22', layers: [shoes('#3b2a1e'), mottle(0.05)] },
    hat: { base: T, layers: [region('#1f1f22', ({ p }) => p[1] > 28.5), region('#2c2c30', ({ p }) => p[1] > 28.5 && p[1] < 29.5)] }, // beanie
  },
  {
    skin: CRIMINAL_SKIN, hairColor: '#120d0a',
    shirt: {
      base: '#2b2d33',
      layers: [
        region('#4a4d55', ({ i }) => i % 3 === 0),
        region('#f2f2f2', ({ face: f, i, j }) => f === 'front' && i >= 2 && i <= 5 && j <= 1), // shirt collar
        region('#a51d24', ({ face: f, i, j }) => f === 'front' && i >= 3 && i <= 4 && j <= 7), // tie
      ],
    },
    sleeve: { base: '#2b2d33', layers: [region('#4a4d55', ({ i }) => i % 3 === 0)] },
    trousers: { base: '#2b2d33', layers: [region('#4a4d55', ({ i }) => i % 3 === 0), shoes('#141414')] },
    hat: { base: T, layers: [region('#1b1b1f', ({ p }) => p[1] > 30.5)] },
    brim: '#1b1b1f',
    crown: { base: '#1b1b1f', layers: [region('#7a1d1d', ({ p, face: f }) => f !== 'top' && p[1] < 32.6)] },
  },
];

function criminalMaterials(o) {
  return {
    head: { base: o.skin, layers: [hair(o.hairColor), ...(o.mask ? [o.mask] : [])] },
    hat: o.hat ? { ...o.hat, base: o.hatBase ?? o.hat.base } : T,
    brim: o.brim ?? T,
    crown: o.crown ?? T,
    shirt: o.shirt,
    sleeve: { ...o.sleeve, layers: [...o.sleeve.layers, hands(o.skin)] },
    trousers: o.trousers,
  };
}

export const criminal = {
  id: 'criminal',
  model: criminalModel(),
  materials: criminalMaterials(OUTFITS[0]),
  variants: OUTFITS.map((o, i) => ({ texture: i === 0 ? null : `outfit${i}`, materials: criminalMaterials(o) })),
  anims: bipedAnims(),
  egg: ['#e8742a', '#26262a'],
};

// ---------------------------------------------------------------- guard dog

function dogModel() {
  const m = felid({ bodyW: 6, bodyH: 6, bodyL: 14, legH: 9, legW: 2, headW: 6, headH: 6, headD: 5, muzzleW: 4, muzzleH: 3, muzzleD: 4, tailL: 9, earH: 4, earW: 2, eyeColor: '#5a3a1a' });
  const head = m.bones.find((b) => b.name === 'head');
  // A red collar with a tag.
  head.cubes.push({ origin: [-3, 12, -7], size: [6, 1, 1], mat: 'collar', inflate: 0.2, marks: [{ face: 'front', x: 2, y: 0, w: 2, color: '#e8c547' }] });
  return m;
}

export const dog = {
  id: 'guard_dog',
  model: dogModel(),
  materials: {
    // German shepherd: tan with a black saddle and a dark muzzle.
    fur: {
      base: '#b98446',
      layers: [
        region('#2b2420', all(bone('body'), ({ p, face: f }) => p[1] > 12 && f !== 'bottom')),
        region('#2b2420', all(bone('tail', 'tail2'), ({ p }) => p[1] > 7)),
        underside('#d6a865', { y: 10, soft: 2, where: bone('body') }),
        gradient('#8a5a2a', { axis: 1, from: 0, to: 9, where: bone(...LEGS) }),
        mottle(0.06),
        fur(0.07),
      ],
    },
    muzzle: { base: '#2b2420', layers: [fur(0.05)] },
    ear: '#2b2420',
    tail: { base: '#3a2e24', layers: [fur(0.08)] },
    tuft: '#2b2420',
    paw: '#a8743a',
    collar: '#c0281e',
  },
  anims: quadruped({ tail: ['tail', 'tail2'], ears: ['ear_l', 'ear_r'], swing: 35, sleepDrop: 6, legFold: 80, walkLength: 0.7, runLength: 0.35 }),
  egg: ['#b98446', '#2b2420'],
};

export const ENTITY_MODELS = [camera, searchlight, guard, criminal, dog];
export { face, notFace };

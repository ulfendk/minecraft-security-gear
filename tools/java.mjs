// Generates the Java edition's resources (java/src/generated/resources) from the
// same specs as the Bedrock packs. GeckoLib reads the Bedrock geometry and
// animation formats directly, so box-UV models and animations are shared as-is.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { NS } from '../src/lib/constants.mjs';
import { blockId, javaModel } from '../src/lib/blockmodel.mjs';
import { eggIcon } from '../src/lib/texture.mjs';
import { TEXTURES } from '../src/blocks.mjs';
import { BLOCK_ICONS } from '../src/items.mjs';
import { javaLang, LOCALES } from '../src/lang.mjs';
import { criminal, dog, guard } from '../src/models.mjs';
import { structureData } from '../src/structures.mjs';

// Recipes are written with Bedrock item ids; these differ on Java.
const RENAMES = { noteblock: 'note_block' };
const javaItem = (id) => {
  const [ns, name] = id.includes(':') ? id.split(':') : ['minecraft', id];
  return `${ns}:${ns === 'minecraft' ? RENAMES[name] ?? name : name}`;
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

/** Bedrock recipe -> Java recipe. */
function javaRecipe(recipe) {
  const [type, body] = Object.entries(recipe)[0];
  const result = { id: javaItem(body.result.item), count: body.result.count ?? 1 };
  if (type === 'minecraft:recipe_shaped') {
    return {
      type: 'minecraft:crafting_shaped', category: 'redstone', pattern: body.pattern,
      key: Object.fromEntries(Object.entries(body.key).map(([k, v]) => [k, javaItem(v.item)])), result,
    };
  }
  return { type: 'minecraft:crafting_shapeless', category: 'redstone', ingredients: body.ingredients.map((i) => javaItem(i.item)), result };
}

const blockLoot = (name, conditions = []) => ({
  type: 'minecraft:block',
  pools: [{ rolls: 1, entries: [{ type: 'minecraft:item', name: `${NS}:${name}` }], conditions: [{ condition: 'minecraft:survives_explosion' }, ...conditions] }],
});

// GeckoLib wants at least one animation per file; the pan and sweep are set from code.
const emptyAnimations = (id) => ({ format_version: '1.8.0', animations: { [`animation.${NS}.${id}.still`]: { loop: true, bones: {} } } });

export async function buildJava({ blocks, items, models, icon, OUT }) {
  await rm(OUT, { recursive: true, force: true });
  const A = join(OUT, 'assets', NS);
  const D = join(OUT, 'data', NS);
  const texIds = new Proxy({}, { get: (_, k) => blockId(k) });

  for (const [name, { png, animation }] of Object.entries(TEXTURES)) {
    await write(join(A, 'textures', 'block', `${name}.png`), png);
    if (animation) await write(join(A, 'textures', 'block', `${name}.png.mcmeta`), { animation: { frametime: animation.frametime } });
  }

  for (const b of blocks) {
    for (const [name, m] of Object.entries(b.java.models)) {
      const json = m.elements ? javaModel(m, texIds) : m;
      await write(join(A, 'models', 'block', `${name}.json`), json);
    }
    await write(join(A, 'blockstates', `${b.id}.json`), b.java.blockstate);
    const item = b.java.item;
    if (item === 'block') {
      await itemDefinition(A, b.id, blockId(Object.keys(b.java.models)[0]));
    } else if (item?.model) {
      await itemDefinition(A, b.id, item.model);
    } else if (item?.icon) {
      await write(join(A, 'textures', 'item', `${b.id}.png`), item.png ?? BLOCK_ICONS[b.id] ?? TEXTURES[item.icon].png);
      await itemModel(A, b.id, 'minecraft:item/generated');
    }
    if (b.loot !== false) {
      const cond = b.id === 'cell_door'
        ? [{ condition: 'minecraft:block_state_property', block: `${NS}:cell_door`, properties: { half: 'lower' } }]
        : [];
      await write(join(D, 'loot_table', 'blocks', `${b.id}.json`), blockLoot(b.id, cond));
    }
    if (b.recipe) await write(join(D, 'recipe', `${b.id}.json`), javaRecipe(b.recipe));
  }

  for (const item of items) {
    await write(join(A, 'textures', 'item', `${item.id}.png`), item.icon);
    await itemModel(A, item.id, item.handheld ? 'minecraft:item/handheld' : 'minecraft:item/generated');
    if (item.recipe) await write(join(D, 'recipe', `${item.id}.json`), javaRecipe(item.recipe));
  }

  // GeckoLib block entities: the camera and the searchlight.
  for (const id of ['security_camera', 'searchlight']) {
    await write(join(A, 'geckolib', 'models', 'block', `${id}.geo.json`), models[id].geometry);
    await write(join(A, 'geckolib', 'animations', 'block', `${id}.animation.json`), emptyAnimations(id));
    await write(join(A, 'textures', 'block', `${id}.png`), models[id].texture);
  }
  await write(join(A, 'textures', 'block', 'searchlight_lit.png'), models.searchlight.litTexture);

  // GeckoLib entities: the guard (with skin variants), the criminals (with outfits) and the dog.
  for (const [spec, id] of [[guard, 'security_guard'], [criminal, 'criminal'], [dog, 'guard_dog']]) {
    await write(join(A, 'geckolib', 'models', 'entity', `${id}.geo.json`), models[id].geometry);
    await write(join(A, 'geckolib', 'animations', 'entity', `${id}.animation.json`), models[id].anims);
    await write(join(A, 'textures', 'entity', `${id}.png`), models[id].texture);
    for (const [suffix, png] of models[id].variants) await write(join(A, 'textures', 'entity', `${id}_${suffix}.png`), png);
    await write(join(A, 'textures', 'item', `${id}_spawn_egg.png`), eggIcon(spec.egg[0], spec.egg[1], id.length));
    await itemModel(A, `${id}_spawn_egg`, 'minecraft:item/generated');
  }

  await write(join(D, 'structures.json'), structureData());

  for (const locale of LOCALES) await write(join(A, 'lang', `${locale.toLowerCase()}.json`), javaLang(locale, { blocks, items }));
  await write(join(A, 'icon.png'), icon);
}

async function itemDefinition(A, id, model) {
  await write(join(A, 'items', `${id}.json`), { model: { type: 'minecraft:model', model } });
}

async function itemModel(A, id, parent) {
  await write(join(A, 'models', 'item', `${id}.json`), { parent, textures: { layer0: `${NS}:item/${id}` } });
  await itemDefinition(A, id, `${NS}:item/${id}`);
}

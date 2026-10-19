// In-game texts in English and Danish. Names come from the block/item specs;
// messages are shared by the Bedrock scripts and the Java mod (secgear.* keys).
import { NS } from './lib/constants.mjs';

export const LOCALES = ['en_US', 'da_DK'];

export const ENTITY_NAMES = {
  security_guard: { en_US: 'Security Guard', da_DK: 'Sikkerhedsvagt' },
  guard_dog: { en_US: 'Guard Dog', da_DK: 'Vagthund' },
  security_camera: { en_US: 'Security Camera', da_DK: 'Overvågningskamera' },
};

export const MESSAGES = {
  'itemGroup': { en_US: 'Security Gear', da_DK: 'Sikkerhedsudstyr' },
  'linker.added': { en_US: 'Camera stored in the linker (%s in total)', da_DK: 'Kamera gemt i forbinderen (%s i alt)' },
  'linker.known': { en_US: 'This camera is already stored (%s in total)', da_DK: 'Dette kamera er allerede gemt (%s i alt)' },
  'linker.full': { en_US: 'The linker is full (8 cameras)', da_DK: 'Forbinderen er fuld (8 kameraer)' },
  'linker.linked': { en_US: 'Linked %s cameras to this monitor', da_DK: '%s kameraer forbundet til denne skærm' },
  'linker.empty': { en_US: 'Use the linker on cameras first, then on a monitor', da_DK: 'Brug forbinderen på kameraer først og derefter på en skærm' },
  'monitor.none': { en_US: 'No cameras linked. Use a Camera Linker.', da_DK: 'Ingen kameraer forbundet. Brug en kameraforbinder.' },
  'monitor.showing': { en_US: 'Showing camera %s of %s', da_DK: 'Viser kamera %s af %s' },
  'monitor.viewing': { en_US: 'Camera %s of %s - sneak to exit', da_DK: 'Kamera %s af %s - snig for at stoppe' },
  'monitor.lost': { en_US: 'Camera signal lost', da_DK: 'Kamerasignal mistet' },
  'monitor.pick': { en_US: 'Choose a camera', da_DK: 'Vælg et kamera' },
  'monitor.camera': { en_US: 'Camera %s', da_DK: 'Kamera %s' },
  'camera.panning': { en_US: 'Camera is panning', da_DK: 'Kameraet panorerer' },
  'camera.still': { en_US: 'Camera holds still', da_DK: 'Kameraet står stille' },
  'reader.level': { en_US: 'Required clearance: %s', da_DK: 'Krævet adgangsniveau: %s' },
  'reader.granted': { en_US: 'Access granted', da_DK: 'Adgang tilladt' },
  'reader.denied': { en_US: 'Access denied', da_DK: 'Adgang nægtet' },
  'level.1': { en_US: 'Guard', da_DK: 'Vagt' },
  'level.2': { en_US: 'Officer', da_DK: 'Betjent' },
  'level.3': { en_US: 'Warden', da_DK: 'Direktør' },
  'bomb.timer': { en_US: 'Timer set to %s seconds. Sneak and use to arm.', da_DK: 'Timer sat til %s sekunder. Snig og brug for at aktivere.' },
  'bomb.armed': { en_US: 'Bomb armed: %s seconds! Defuse it with shears.', da_DK: 'Bomben er aktiveret: %s sekunder! Desarmér den med en saks.' },
  'bomb.defused': { en_US: 'Bomb defused', da_DK: 'Bomben er desarmeret' },
  'blueprint.blocked': { en_US: 'Not enough room here', da_DK: 'Der er ikke plads her' },
  'blueprint.built': { en_US: 'Built: %s', da_DK: 'Bygget: %s' },
  'view.hud': { en_US: 'CAM %s', da_DK: 'KAM %s' },
  'guard.home': { en_US: 'The guard will patrol here', da_DK: 'Vagten patruljerer her' },
};

/** [key, text] pairs in Bedrock .lang form. */
export function langEntries(locale, { blocks, items, description, version }) {
  const out = [];
  out.push(['pack.description', locale === 'da_DK'
    ? `Overvågningskameraer, lasere, bomber, faldlemme, fængselsmure, broer og vagttårne (v${version})`
    : `${description.split(': ')[1] ?? description} (v${version})`]);
  for (const b of blocks) if (b.bedrock) out.push([`tile.${NS}:${b.id}.name`, b.name[locale]]);
  out.push([`tile.${NS}:cell_door_upper.name`, blocks.find((b) => b.id === 'cell_door').name[locale]]);
  for (const b of blocks) if (!b.bedrock) out.push([`item.${NS}:${b.id}.name`, b.name[locale]]);
  for (const i of items) out.push([`item.${NS}:${i.id}.name`, i.name[locale]]);
  for (const [id, n] of Object.entries(ENTITY_NAMES)) {
    out.push([`entity.${NS}:${id}.name`, n[locale]]);
    if (id !== 'security_camera') out.push([`item.spawn_egg.entity.${NS}:${id}.name`, `${locale === 'da_DK' ? 'Fremkald' : 'Spawn'} ${n[locale]}`]);
  }
  for (const [k, v] of Object.entries(MESSAGES)) out.push([k === 'itemGroup' ? `itemGroup.name.${NS}` : `${NS}.${k}`, v[locale]]);
  return out;
}

/** Java lang JSON object. */
export function javaLang(locale, { blocks, items }) {
  const out = {};
  for (const b of blocks) out[`block.${NS}.${b.id}`] = b.name[locale];
  for (const i of items) out[`item.${NS}.${i.id}`] = i.name[locale];
  for (const [id, n] of Object.entries(ENTITY_NAMES)) {
    out[`entity.${NS}.${id}`] = n[locale];
    if (id !== 'security_camera') out[`item.${NS}.${id}_spawn_egg`] = `${n[locale]} ${locale === 'da_DK' ? 'fremkaldelsesæg' : 'Spawn Egg'}`;
  }
  out[`entity.${NS}.camera_view`] = n2(locale);
  for (const [k, v] of Object.entries(MESSAGES)) out[k === 'itemGroup' ? `itemGroup.${NS}` : `${NS}.${k}`] = v[locale];
  return out;
}

const n2 = (locale) => (locale === 'da_DK' ? 'Kamerabillede' : 'Camera View');

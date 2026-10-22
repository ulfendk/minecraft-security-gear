// Builds the GitHub Pages site into build/site/ (English at the root, Danish in da/).
// The latest release is looked up in the browser (GitHub API), with the version
// from package.json as the fallback, so the page stays current between deploys.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { build } from './build.mjs';
import { blockAtlas, render } from './render.mjs';
import { TEXTURES } from '../src/blocks.mjs';
import { items } from '../src/items.mjs';
import { LANGUAGES, STRINGS } from '../src/i18n.mjs';

const OUT = 'build/site';
const RP = 'build/resource_pack';
const repo = process.env.GITHUB_REPOSITORY ?? process.env.SITE_REPO ?? 'ulfendk/minecraft-security-gear';
const [owner, name] = repo.split('/');
// The index of all our mods, which every mod's site links back to.
const INDEX_URL = `https://${owner}.github.io/minecraft-index/`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** What each piece of gear does, grouped as on the page. [id, image, en, da] */
const SECTIONS = [
  {
    id: 'surveillance',
    title: { en: 'Surveillance', da: 'Overvågning' },
    gear: [
      ['security_camera', 'entity:security_camera', ['Security Camera', 'Hangs on a wall or from a ceiling and pans slowly from side to side. Sneak and use it to make it hold still.'], ['Overvågningskamera', 'Hænger på en væg eller i loftet og panorerer langsomt fra side til side. Snig og brug det for at få det til at stå stille.']],
      ['monitor', 'block:monitor', ['Security Monitor', 'Java: shows a live picture from the camera, right on the screen. Use it to look through the camera, sneak and use it to switch camera. Bedrock: use it to look through the camera.'], ['Overvågningsskærm', 'Java: viser et levende billede fra kameraet direkte på skærmen. Brug den for at se gennem kameraet, snig og brug den for at skifte kamera. Bedrock: brug den for at se gennem kameraet.']],
      ['camera_linker', 'item:camera_linker', ['Camera Linker', 'Use it on up to 8 cameras, then on a monitor, to link them.'], ['Kameraforbinder', 'Brug den på op til 8 kameraer og derefter på en skærm for at forbinde dem.']],
      ['searchlight', 'block:searchlight', ['Searchlight', 'Powered, it sweeps the yard and really lights up where the beam lands. An inverted daylight sensor switches it on at night.'], ['Projektør', 'Med strøm fejer den hen over gården og lyser virkelig op, hvor strålen rammer. En omvendt dagslyssensor tænder den om natten.']],
    ],
  },
  {
    id: 'alarms',
    title: { en: 'Lasers and alarms', da: 'Lasere og alarmer' },
    gear: [
      ['laser_emitter', 'block:laser_emitter', ['Laser Tripwire', 'A red beam up to 16 blocks long. When something crosses it, a Laser Receiver at the far end gives a redstone pulse. Redstone switches the laser off.'], ['Laserstråle', 'En rød stråle på op til 16 blokke. Når noget krydser den, giver en lasermodtager i den anden ende et redstone-signal. Redstone slukker laseren.']],
      ['laser_fence', 'block:laser_fence', ['Laser Fence', 'A blue beam that also burns whatever walks through it.'], ['Laserhegn', 'En blå stråle, der også brænder alt, der går igennem den.']],
      ['laser_receiver', 'block:laser_receiver', ['Laser Receiver', 'Gives a redstone pulse while its beam is broken.'], ['Lasermodtager', 'Giver et redstone-signal, mens strålen er brudt.']],
      ['motion_sensor', 'block:motion_sensor', ['Motion Sensor', 'Gives a signal while it sees a creature within 8 blocks. Sneak past it and it won’t notice you.'], ['Bevægelsessensor', 'Giver et signal, mens den ser et væsen inden for 8 blokke. Snig dig forbi, så opdager den dig ikke.']],
      ['alarm_siren', 'block:alarm_siren', ['Alarm Siren', 'Flashes red and wails while powered.'], ['Alarmsirene', 'Blinker rødt og hyler, når den får strøm.']],
    ],
  },
  {
    id: 'prisons',
    title: { en: 'Access control and prisons', da: 'Adgangskontrol og fængsler' },
    gear: [
      ['keycard_reader', 'block:keycard_reader', ['Keycard Reader', 'Swipe a Guard, Officer or Warden keycard. With enough clearance it opens the cell door next to it. Sneak and use a Warden card to change the level.'], ['Nøglekortlæser', 'Stryg et vagt-, betjent- eller direktørnøglekort. Med højt nok adgangsniveau åbner den celledøren ved siden af. Snig og brug et direktørkort for at ændre niveauet.']],
      ['warden_keycard', 'item:warden_keycard', ['Keycards', 'Guard (blue), Officer (orange) and Warden (purple) clearance.'], ['Nøglekort', 'Adgangsniveau Vagt (blå), Betjent (orange) og Direktør (lilla).']],
      ['cell_door', 'block:cell_door', ['Cell Door', 'A barred iron door. Only redstone or a keycard reader opens it.'], ['Celledør', 'En jerndør med tremmer. Kun redstone eller en nøglekortlæser kan åbne den.']],
      ['prison_bars', 'block:prison_bars', ['Prison Bars', 'Thick steel bars that join up like iron bars.'], ['Fængselstremmer', 'Tykke ståltremmer, der sætter sig sammen som jerntremmer.']],
      ['prison_wall', 'block:prison_wall', ['Prison Wall and Reinforced Concrete', 'Very hard and blast proof.'], ['Fængselsmur og armeret beton', 'Meget hårde og bombesikre.']],
      ['razor_wire', 'block:razor_wire', ['Barbed and Razor Wire', 'Slows you down and cuts.'], ['Pigtråd og knivtråd', 'Sinker dig og skærer.']],
    ],
  },
  {
    id: 'traps',
    title: { en: 'Traps and bombs', da: 'Fælder og bomber' },
    gear: [
      ['pit_trapdoor', 'block:pit_trapdoor_open', ['Pit Trapdoor', 'Looks just like stone bricks. Step on it and the whole pit swings open, then closes again.'], ['Faldlem', 'Ligner helt almindelige stenmursten. Træd på den, og hele graven åbner sig og lukker igen.']],
      ['timed_bomb', 'block:timed_bomb', ['Timed Bomb', 'Use it to choose a 5, 10, 30 or 60 second fuse, sneak and use it (or power it) to arm it. It beeps as it counts down. Shears defuse it.'], ['Tidsindstillet bombe', 'Brug den for at vælge 5, 10, 30 eller 60 sekunders lunte, snig og brug den (eller giv den strøm) for at aktivere den. Den bipper, mens den tæller ned. En saks desarmerer den.']],
      ['tripwire_bomb', 'block:tripwire_bomb', ['Tripwire Bomb', 'Strings a thin wire up to 8 blocks. Crossing it, or a redstone signal, sets it off.'], ['Snubletrådsbombe', 'Spænder en tynd tråd ud på op til 8 blokke. Krydser man den, eller får den et redstone-signal, springer den.']],
    ],
  },
  {
    id: 'guards',
    title: { en: 'Bridges, towers and guards', da: 'Broer, tårne og vagter' },
    gear: [
      ['bridge_winch', 'block:bridge_deck', ['Bridge Winch', 'Powered, it winds out a rope bridge, one plank at a time, up to 12 blocks. Without power it winds it back in.'], ['Brospil', 'Med strøm vikler det en rebbro ud, en planke ad gangen, op til 12 blokke. Uden strøm vikler det den ind igen.']],
      ['guard_tower_blueprint', 'item:guard_tower_blueprint', ['Blueprints', 'Build a guard tower (with searchlight and guard), a prison cell with an inmate or a gatehouse with a laser fence, right in front of you.'], ['Tegninger', 'Byg et vagttårn (med projektør og vagt), en fængselscelle med en indsat eller et porthus med laserhegn lige foran dig.']],
      ['security_guard', 'entity:security_guard', ['Security Guard', 'Patrols, fights hostile mobs and is friendly unless you hit it.'], ['Sikkerhedsvagt', 'Patruljerer, bekæmper fjendtlige monstre og er venlig, medmindre du slår den.']],
      ['criminal', 'entity:criminal', ['Criminal', 'Someone to lock up: a striped convict, an inmate in an orange jumpsuit, a masked burglar or a gangster. Keeps away from guard dogs, hits back when hit, and guards leave them alone. The prison cell blueprint comes with one.'], ['Forbryder', 'En at spærre inde: en stribet fange, en indsat i orange kedeldragt, en maskeret indbrudstyv eller en gangster. Holder sig fra vagthunde, slår igen, hvis du slår, og vagterne lader dem være. Fængselscelle-tegningen kommer med en.']],
      ['brute', 'entity:brute', ['Brute', 'The big one: a muscular inmate in a tank top. Twice as tough as the others, hits hard, is hard to push back and is not afraid of guard dogs.'], ['Bølle', 'Den store: en muskuløs fange i undertrøje. Dobbelt så sej som de andre, slår hårdt, er svær at skubbe og er ikke bange for vagthunde.']],
      ['guard_dog', 'entity:guard_dog', ['Guard Dog', 'Tame it with bones. It follows you, sits on command and goes for monsters.'], ['Vagthund', 'Tæm den med knogler. Den følger dig, sætter sig på kommando og går efter monstre.']],
      ['baton', 'item:baton', ['Baton', 'A hit slows the target down.'], ['Knippel', 'Et slag sinker den, du rammer.']],
    ],
  },
];

function upscale(buf, k) {
  const src = PNG.sync.read(buf);
  const out = new PNG({ width: src.width * k, height: src.height * k });
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const s = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(s, s + 4), (y * out.width + x) * 4);
    }
  return PNG.sync.write(out);
}

const { version, models } = await build({ quiet: true });
await mkdir(join(OUT, 'img'), { recursive: true });

// Pictures: rendered blocks and entities, upscaled item icons.
const geos = {};
for (const file of ['monitor', 'searchlight', 'laser_emitter', 'laser_fence', 'laser_receiver', 'motion_sensor', 'alarm_siren', 'keycard_reader', 'cell_door', 'prison_bars', 'prison_wall', 'razor_wire', 'pit_trapdoor', 'timed_bomb', 'tripwire_bomb', 'bridge_deck']) {
  const g = JSON.parse(await readFile(join(RP, 'models', 'blocks', `${file}.geo.json`), 'utf8'));
  for (const geo of g['minecraft:geometry']) geos[geo.description.identifier.split('.').pop()] = geo;
}
for (const section of SECTIONS) {
  for (const [id, image] of section.gear) {
    const [kind, ref] = image.split(':');
    let png;
    if (kind === 'item') png = upscale(items.find((i) => i.id === ref).icon, 12);
    else if (kind === 'entity') png = render(models[ref].geometry, models[ref].texture, { yaw: 35, size: 192, hidden: new Set(['ceiling_mount']) });
    else if (ref === 'searchlight') png = render({ format_version: '1.12.0', 'minecraft:geometry': [geos.searchlight] }, models.searchlight.litTexture, { yaw: 35, size: 192 });
    else {
      const pair = blockAtlas(geos[ref], (n) => TEXTURES[n].png);
      png = render(pair.geometry, pair.texture, { yaw: 35, size: 192 });
    }
    await writeFile(join(OUT, 'img', `${id}.png`), png);
  }
}
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'img', 'icon.png'));
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'favicon.png'));

const releases = `https://github.com/${repo}/releases`;
const dl = (file) => `${releases}/latest/download/${file}`;

const ROOT_URL = `https://${owner}.github.io/${name}/`;

/** Builds the page for one language. Pages for other languages live in a subfolder. */
function page(lang) {
  const L = LANGUAGES[lang];
  const t = STRINGS[lang];
  const up = L.dir ? '../' : '';
  const link = (href) => (text) => `<a href="${href}">${esc(text)}</a>`;
  const home = `${INDEX_URL}${L.dir ? L.dir + '/' : ''}`;

  const sections = SECTIONS.map((s) => `
  <section id="${s.id}">
    <h2>${esc(s.title[lang])}</h2>
    <div class="grid">${s.gear.map(([id, , en, da]) => {
      const [title, text] = lang === 'en' ? en : da;
      return `
      <article class="card">
        <div class="portrait"><img src="${up}img/${id}.png" alt="" loading="lazy" width="192" height="192"></div>
        <div class="card-body">
          <h3>${esc(title)}</h3>
          <p>${esc(text)}</p>
        </div>
      </article>`;
    }).join('')}
    </div>
  </section>`).join('\n');

  const switcher = Object.entries(LANGUAGES)
    .filter(([code]) => code !== lang)
    .map(([code, other]) => `<a class="lang" href="${up}${other.dir ? other.dir + '/' : ''}" hreflang="${other.htmlLang}" lang="${other.htmlLang}">${esc(other.label)}</a>`)
    .join('');
  const alternates = Object.values(LANGUAGES)
    .map((other) => `<link rel="alternate" hreflang="${other.htmlLang}" href="${ROOT_URL}${other.dir ? other.dir + '/' : ''}">`)
    .join('\n');

const html = `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
${alternates}
<link rel="icon" href="${up}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #e9ecef; --surface: #ffffff; --ink: #1d2126; --muted: #5a6370; --line: #d3d8de;
  --accent: #c0281e; --accent-ink: #fff; --accent-2: #3d5a80; --chip: #e1e5ea; --hero-from: #0b1026; --hero-to: #28345e;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14171b; --surface: #1d2126; --ink: #e8ebee; --muted: #9aa3ad; --line: #2c3238;
    --accent: #ff5a4c; --accent-ink: #14171b; --accent-2: #8fb3d9; --chip: #262b31; --hero-from: #060914; --hero-to: #1b2444;
  }
}
:root[data-theme="dark"] {
  --bg: #14171b; --surface: #1d2126; --ink: #e8ebee; --muted: #9aa3ad; --line: #2c3238;
  --accent: #ff5a4c; --accent-ink: #14171b; --accent-2: #8fb3d9; --chip: #262b31; --hero-from: #060914; --hero-to: #1b2444;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
img { image-rendering: pixelated; max-width: 100%; }
a { color: var(--accent); }
h1, h2, h3 { font-family: "Pixelify Sans", system-ui, sans-serif; font-weight: 500; line-height: 1.15; letter-spacing: .01em; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 0 16px; }
header.hero { color: #fff8ec; background: linear-gradient(180deg, var(--hero-from), var(--hero-to)); padding: 48px 0 56px; }
.hero .wrap { display: grid; grid-template-columns: auto 1fr; gap: 32px; align-items: center; }
.hero img.icon { width: 160px; height: 160px; border-radius: 12px; box-shadow: 0 8px 30px rgb(0 0 0 / .35); }
.hero h1 { font-size: clamp(2.2rem, 6vw, 3.6rem); margin: 0 0 8px; }
.hero p { margin: 0 0 20px; font-size: 1.15rem; max-width: 52ch; color: #dfe3f0; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; background: #ffd36b; color: #2b1d0e; box-shadow: 0 3px 0 #b8862c; }
.btn:hover { transform: translateY(-1px); }
.btn.ghost { background: transparent; color: #fff3df; box-shadow: inset 0 0 0 2px rgb(255 243 223 / .6); }
.version { font-size: .95rem; color: #dfe3f0; }
.which { margin: 16px 0 6px; background: rgb(0 0 0 / .22); border: 1px solid rgb(255 243 223 / .35); border-radius: 10px; padding: 10px 14px; max-width: 62ch; font-size: .95rem; color: #fff3df; }
.which b { color: #fff; }
.hero .langs { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: -28px; margin-bottom: 8px; }
.hero .langs a { color: #fff3df; font-weight: 600; text-decoration: none; padding: 4px 12px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px rgb(255 243 223 / .55); font-size: .9rem; }
.hero .langs a:hover { background: rgb(255 255 255 / .12); }
.version strong { color: #fff; }
main section { padding: 48px 0 8px; }
h2 { font-size: 2rem; margin: 0 0 8px; }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 0; list-style: none; counter-reset: s; }
.steps li { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 16px 16px 16px 56px; position: relative; }
.steps li::before { counter-increment: s; content: counter(s); position: absolute; left: 16px; top: 14px; width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; font-weight: 700; }
.note { color: var(--muted); font-size: .92rem; }
h3.edition { margin: 18px 0 10px; font: 700 1.15rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
.portrait { background: radial-gradient(circle at 50% 60%, #c9d1db 0, #9aa6b4 100%); aspect-ratio: 4 / 3; display: grid; place-items: center; }
.portrait img { width: 60%; height: auto; }
.card-body { padding: 14px 16px 16px; }
.card h3 { margin: 0 0 6px; font: 700 1.2rem/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; }
.card p { margin: 0; }
footer { margin-top: 56px; padding: 28px 0 40px; border-top: 1px solid var(--line); color: var(--muted); font-size: .9rem; }
@media (max-width: 640px) {
  .hero .wrap { grid-template-columns: 1fr; text-align: center; justify-items: center; }
  .hero img.icon { width: 112px; height: 112px; }
  .actions { justify-content: center; }
}
</style>
</head>
<body>
<header class="hero">
  <nav class="langs wrap"><a class="home" href="${home}">← ${esc(t.allMods)}</a><span>${switcher}</span></nav>
  <div class="wrap">
    <img class="icon" src="${up}img/icon.png" alt="" width="160" height="160">
    <div>
      <h1>${esc(t.name)}</h1>
      <p>${esc(t.tagline)}</p>
      <div class="actions">
        <a class="btn" id="download" href="${dl('SecurityGear.mcaddon')}">⬇ ${esc(t.download)}</a>
        <a class="btn" href="${dl('SecurityGear-fabric.jar')}">⬇ ${esc(t.downloadJava)}</a>
        <a class="btn ghost" href="${releases}">${esc(t.allVersions)}</a>
      </div>
      <p class="which">${t.which}</p>
      <p class="version" id="version">${esc(t.latestVersion)}: <strong>${esc(version)}</strong></p>
    </div>
  </div>
</header>
<main class="wrap">
  <section id="install">
    <h2>${esc(t.install)}</h2>
    <h3 class="edition">${esc(t.bedrockTitle)}</h3>
    <ol class="steps">
${t.steps(`<a href="${dl('SecurityGear.mcaddon')}">SecurityGear.mcaddon</a>`).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.serverNote(link(dl('SecurityGear_BP.mcpack')), link(dl('SecurityGear_RP.mcpack')))}</p>
    <h3 class="edition">${esc(t.javaTitle)}</h3>
    <ol class="steps">
${t.javaSteps(
    `<a href="${dl('SecurityGear-fabric.jar')}">SecurityGear-fabric.jar</a>`,
    '<a href="https://fabricmc.net/use/installer/">Fabric Loader</a>',
    '<a href="https://modrinth.com/mod/fabric-api">Fabric API</a>',
    '<a href="https://modrinth.com/mod/geckolib">GeckoLib</a>',
  ).map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <h3 class="edition">${esc(t.upgradeTitle)}</h3>
    <ol class="steps">
${t.upgradeSteps.map((step) => `      <li>${step}</li>`).join('\n')}
    </ol>
    <p class="note">${t.upgradeServer}</p>
    <p class="note">${t.upgradeJava}</p>
  </section>
${sections}
</main>
<footer>
  <div class="wrap">
    <p>${t.footerSource(link(`https://github.com/${repo}`), link(`https://github.com/${repo}/issues`))}</p>
    <p>${esc(t.footerLegal)}</p>
    <p>${link(home)(`← ${t.allMods}`)}</p>
  </div>
</footer>
<script>
// Latest release from GitHub
fetch('https://api.github.com/repos/${owner}/${name}/releases/latest')
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel || !rel.tag_name) return;
    const date = new Date(rel.published_at).toLocaleDateString('${L.dateLocale}', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('version').innerHTML = '${t.latestVersion}: <strong>' + rel.tag_name.replace(/^v/, '') + '</strong> · ${t.released} ' + date;
  })
  .catch(() => {});

// Reload when a new release has been published. The site is redeployed with every release
// and writes version.json; compare it with the version this page was built with.
const PAGE_VERSION = '${version}';
let reloading = false;
function checkForUpdate() {
  if (reloading || document.hidden) return;
  fetch('${up}version.json?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || !v.version || v.version === PAGE_VERSION) return;
      // Reload once per new version: if the cached page is still the old one, don't loop.
      let tried = null;
      try { tried = sessionStorage.getItem('security-gear-reloaded-for'); } catch {}
      if (tried === v.version) return;
      try { sessionStorage.setItem('security-gear-reloaded-for', v.version); } catch {}
      reloading = true;
      location.reload();
    })
    .catch(() => {});
}
setInterval(checkForUpdate, 10 * 60 * 1000);
checkForUpdate();
document.addEventListener('visibilitychange', checkForUpdate);
</script>
</body>
</html>
`;
  return html;
}

for (const [lang, L] of Object.entries(LANGUAGES)) {
  const dir = join(OUT, L.dir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), page(lang));
}
await writeFile(join(OUT, '.nojekyll'), '');
await writeFile(join(OUT, 'version.json'), JSON.stringify({ version }) + '\n');
console.log(`Site written to ${OUT}/ (${name} ${version}, ${Object.keys(LANGUAGES).join(' + ')})`);

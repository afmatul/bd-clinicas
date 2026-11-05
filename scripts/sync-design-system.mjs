#!/usr/bin/env node
// Copia el design system "Red Clínica" (fuente única de diseño) dentro del repo.
//
// Fuente: la carpeta design-system/ del proyecto (por defecto ../design-system,
// o la ruta en DESIGN_SYSTEM_DIR). Destino: packages/design-system/.
//
// - tokens.css, tokens.json, components.css, motion.css, logos/ e iconos/ se copian tal cual.
// - layout.css se extrae de prototipo.html: es el CSS de páginas del prototipo
//   (shell, login, tarjetas de signos, agenda…) sin los tokens ni los componentes,
//   que ya vienen en sus propios archivos. Así las pantallas de la web usan las
//   mismas clases que los mockups.
//
// Nunca edite packages/design-system a mano: cambie el design system y vuelva a
// correr `npm run sync:design-system`.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.env.DESIGN_SYSTEM_DIR ?? join(root, '..', 'design-system'));
const dest = join(root, 'packages', 'design-system');

if (!existsSync(join(src, 'tokens.css'))) {
  console.error(`No encontré el design system en ${src}. Indique la ruta con DESIGN_SYSTEM_DIR=/ruta/design-system.`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });

for (const f of ['tokens.css', 'tokens.json', 'components.css', 'motion.css']) cpSync(join(src, f), join(dest, f));
for (const d of ['logos', 'iconos']) cpSync(join(src, d), join(dest, d), { recursive: true });

// --- layout.css desde prototipo.html ---
const html = readFileSync(join(src, 'prototipo.html'), 'utf8');
let css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
const tokens = readFileSync(join(src, 'tokens.css'), 'utf8').trim();
const components = readFileSync(join(src, 'components.css'), 'utf8').trim();
const componentsBody = components.slice(components.indexOf('\n') + 1).trim(); // sin el @import de fuentes
if (!css.includes(tokens) || !css.includes(componentsBody)) {
  console.error('prototipo.html ya no incluye tokens.css y components.css textuales; revise la extracción de layout.css.');
  process.exit(1);
}
css = css.replace(tokens, '').replace(componentsBody, '').replace(/@import url\([^)]*\);\s*/g, '').trim();
writeFileSync(
  join(dest, 'layout.css'),
  `/* Red Clínica — layout de páginas extraído de prototipo.html por scripts/sync-design-system.mjs.\n   No editar: cambie el prototipo y vuelva a sincronizar. Solo lee variables de tokens.css. */\n\n${css}\n`,
);

console.log(`Design system sincronizado desde ${src}`);

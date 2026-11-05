#!/usr/bin/env node
// Verifica que la web derive su estilo solo del design system:
// en apps/web/src no se permiten colores literales (#hex, rgb(), hsl()),
// familias tipográficas propias ni hojas de estilo nuevas fuera del design system.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'apps', 'web', 'src');
const rules = [
  [/(?<![\w/&])#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, 'color hexadecimal literal; use una variable de tokens.css'],
  [/\b(rgb|rgba|hsl|hsla)\(/, 'color literal; use una variable de tokens.css'],
  [/font-family\s*:|fontFamily\s*:/, 'familia tipográfica propia; use var(--font-sans) o var(--font-display) desde las clases rc-*'],
];
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) files.push(p);
  }
})(dir);

let errors = 0;
for (const file of files) {
  if (file.endsWith('.css')) {
    console.error(`${relative(root, file)}: hoja de estilo fuera del design system. Agregue la regla al design system y sincronice.`);
    errors++;
    continue;
  }
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    for (const [re, msg] of rules) {
      // href="#/ruta" y anclas no son colores
      const clean = line.replace(/(href|to)=["'`]#[^"'`]*["'`]/g, '');
      if (re.test(clean)) { console.error(`${relative(root, file)}:${i + 1}: ${msg}\n    ${line.trim()}`); errors++; }
    }
  });
}
if (errors) { console.error(`\n${errors} problema(s). La web solo puede usar tokens y clases del design system.`); process.exit(1); }
console.log(`OK: ${files.length} archivos de apps/web/src usan solo el design system.`);

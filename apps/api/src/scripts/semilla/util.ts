import { createHash } from 'node:crypto';

/**
 * Utilidades de la semilla. Todo es determinista: la misma semilla produce los mismos datos
 * (salvo las fechas, que se calculan desde "hoy" para que la agenda del día siempre tenga citas).
 */

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function azar(semilla: number) {
  let a = semilla >>> 0;
  const sig = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    sig,
    entre: (min: number, max: number) => min + Math.floor(sig() * (max - min + 1)),
    real: (min: number, max: number, dec = 1) => Number((min + sig() * (max - min)).toFixed(dec)),
    uno: <T>(xs: readonly T[]): T => xs[Math.floor(sig() * xs.length)]!,
    prob: (p: number) => sig() < p,
  };
}

/** "Hoy" de la semilla: SEED_HOY=yyyy-mm-dd lo fija (útil para capturas); si no, la fecha local. */
export const HOY: string = (() => {
  if (process.env.SEED_HOY) return process.env.SEED_HOY;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const aUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);
const aISO = (d: Date) => d.toISOString().slice(0, 10);

/** Fecha a `dias` de hoy (negativo = pasado). */
export function dia(dias: number): string {
  const d = aUTC(HOY);
  d.setUTCDate(d.getUTCDate() + dias);
  return aISO(d);
}

/** Fecha hábil: corre sábados y domingos al viernes anterior (pasado) o al lunes siguiente (futuro). */
export function diaHabil(dias: number): string {
  const d = aUTC(dia(dias));
  const w = d.getUTCDay();
  if (w === 6) d.setUTCDate(d.getUTCDate() + (dias < 0 ? -1 : 2));
  if (w === 0) d.setUTCDate(d.getUTCDate() + (dias < 0 ? -2 : 1));
  return aISO(d);
}

export function sumarDias(iso: string, dias: number): string {
  const d = aUTC(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return aISO(d);
}

export function sumarMeses(iso: string, meses: number): string {
  const d = aUTC(iso);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return aISO(d);
}

export function mesesEntre(desde: string, hasta: string): number {
  const a = aUTC(desde), b = aUTC(hasta);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m--;
  return m;
}

export const edadEn = (nacimiento: string, fecha = HOY) => Math.floor(mesesEntre(nacimiento, fecha) / 12);

export const fechaDate = (iso: string) => aUTC(iso);

/** UUID estable a partir de una clave (formato v4 válido, contenido derivado de SHA-1). */
export function uuidDe(clave: string): string {
  const h = createHash('sha1').update(`red-clinica:${clave}`).digest('hex');
  const v = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** ObjectId estable (24 hex) a partir de una clave. */
export const hexDe = (clave: string) => createHash('sha1').update(`red-clinica:${clave}`).digest('hex').slice(0, 24);

/** Función de distribución normal estándar (para percentiles OMS aproximados). */
export function cdfNormal(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/** Interpolación lineal en una tabla [x, y] ordenada por x. */
export function interpolar(tabla: readonly (readonly [number, number])[], x: number): number {
  if (x <= tabla[0]![0]) return tabla[0]![1];
  for (let i = 1; i < tabla.length; i++) {
    const [x1, y1] = tabla[i]!;
    const [x0, y0] = tabla[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return tabla[tabla.length - 1]![1];
}

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const r2 = (n: number) => Math.round(n * 100) / 100;

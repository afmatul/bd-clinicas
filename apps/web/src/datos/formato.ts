/** Formatos del design system: 1,248.5 · dd/mm/aaaa · teléfono 4-4 · CUI 4-5-4. */
const numero = new Intl.NumberFormat('en-US');
export const formatoNumero = (n: number) => numero.format(n);
export const formatoTelefono = (t: string | null) => (t && /^\d{8}$/.test(t) ? `${t.slice(0, 4)} ${t.slice(4)}` : t ?? '—');
export const formatoCui = (c: string | null) => (c && /^\d{13}$/.test(c) ? `${c.slice(0, 4)} ${c.slice(4, 9)} ${c.slice(9)}` : c ?? '—');
/** El prototipo muestra los grupos sanguíneos negativos con el signo menos tipográfico. */
export const formatoSangre = (s: string | null) => (s ? s.replace('-', '−') : '—');

export function edad(fechaNacimiento: string, hoy = new Date()): number {
  const [y, m, d] = fechaNacimiento.split('-').map(Number) as [number, number, number];
  let e = hoy.getFullYear() - y;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
  return e;
}

/** Iniciales de nombre + primer apellido, como en el prototipo (ML, CA…). */
export const iniciales = (nombres: string, apellidos: string) => `${nombres[0] ?? ''}${apellidos[0] ?? ''}`.toUpperCase();

/** Variante de avatar estable por persona (el prototipo alterna base, neutral y accent). */
export const varianteAvatar = (id: string) =>
  ['', 'rc-avatar--neutral', '', 'rc-avatar--accent', 'rc-avatar--neutral'][[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 5];

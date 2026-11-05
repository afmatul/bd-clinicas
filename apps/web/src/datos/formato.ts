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

/** yyyy-mm-dd → dd/mm/aaaa (sin pasar por Date, para no correr el día por la zona horaria). */
export const formatoFecha = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

const fechaHora = new Intl.DateTimeFormat('es-GT', {
  timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
/** Marca de tiempo ISO → "04/11/2026 · 08:12", hora de Guatemala. */
export const formatoFechaHora = (iso: string) => fechaHora.format(new Date(iso)).replace(', ', ' · ').replace(/\s(\d{2}:\d{2})$/, ' $1');

export const NOMBRE_ROL: Record<string, string> = {
  RECEPCION: 'Recepción', MEDICO: 'Médico', ENFERMERIA: 'Enfermería', TRABAJO_SOCIAL: 'Trabajo social', AUDITOR: 'Auditoría', ADMIN: 'Administración',
};

/** "Dra. Ana Lucía Pérez" → "AP": primer nombre + último apellido, sin el título. */
export const inicialesDeNombre = (nombre: string) => {
  const p = nombre.replace(/^(Dra?\.|Lic\.)\s*/, '').split(/\s+/).filter(Boolean);
  return `${p[0]?.[0] ?? ''}${p.length > 1 ? p[p.length - 1]![0] : ''}`.toUpperCase();
};

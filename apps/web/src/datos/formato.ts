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

// ---------- Fechas de agenda (zona de Guatemala, igual que la API) ----------

/** Hoy y la hora actual en Guatemala: yyyy-mm-dd y HH:mm. */
export function ahoraLocal(d = new Date()): { fecha: string; hora: string } {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d);
  const [fecha, hora] = s.split(' ') as [string, string];
  return { fecha, hora };
}

const aDate = (f: string) => new Date(`${f}T12:00:00Z`);
export const sumarDias = (f: string, n: number) => { const d = aDate(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** Lunes de la semana de la fecha. */
export const lunesDe = (f: string) => sumarDias(f, -((aDate(f).getUTCDay() + 6) % 7));
export const diaDelMes = (f: string) => aDate(f).getUTCDate();
export const diaCorto = (f: string) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][aDate(f).getUTCDay()]!;

const largo = new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const sinAnio = new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Jueves 5 de noviembre de 2026" */
export const fechaLarga = (f: string) => mayus(largo.format(aDate(f)).replace(',', ''));
/** "Lunes 9 de noviembre" */
export const fechaSinAnio = (f: string) => mayus(sinAnio.format(aDate(f)).replace(',', ''));
/** dd/mm/aaaa */
export const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;

/** Minutos entre dos horas HH:mm del mismo día. */
export const minutosEntre = (desde: string, hasta: string) => {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return Math.max(0, m(hasta) - m(desde));
};

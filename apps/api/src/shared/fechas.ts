/** yyyy-mm-dd a partir de un Date o de una cadena ISO, sin desfase de zona horaria. */
export function aFechaISO(v: Date | string): string {
  if (typeof v === 'string') return v.slice(0, 10);
  const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function edadEnAnios(fechaNacimiento: string, hoy = new Date()): number {
  const [y, m, d] = fechaNacimiento.split('-').map(Number);
  let edad = hoy.getFullYear() - y!;
  if (hoy.getMonth() + 1 < m! || (hoy.getMonth() + 1 === m && hoy.getDate() < d!)) edad--;
  return edad;
}

/** Fecha y hora actuales en Guatemala (las cuatro instituciones están en UTC−6, sin horario de verano). */
export function ahoraLocal(d = new Date()): { fecha: string; hora: string; iso: string } {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d); // "2026-11-05 08:31"
  const [fecha, hora] = s.split(' ') as [string, string];
  return { fecha, hora, iso: `${fecha}T${hora}` };
}

/** Suma días a una fecha yyyy-mm-dd. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

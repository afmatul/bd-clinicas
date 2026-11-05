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

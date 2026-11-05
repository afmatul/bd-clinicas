/** Formatos propios de la vista de crecimiento (fechas dd/mm/aaaa y edades pediátricas). */

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatoFecha = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export function mesesEntre(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.slice(0, 10).split('-').map(Number) as [number, number, number];
  const [yb, mb, db] = hasta.slice(0, 10).split('-').map(Number) as [number, number, number];
  return (yb - ya) * 12 + (mb - ma) - (db < da ? 1 : 0);
}

/** "6 años, 7 meses" · "1 año" · "13 días" para recién nacidos. */
export function edadLarga(nacimiento: string, hoy = hoyISO()): string {
  const total = mesesEntre(nacimiento, hoy);
  if (total < 1) {
    const dias = Math.round((Date.parse(hoy) - Date.parse(nacimiento)) / 86_400_000);
    return `${dias} ${dias === 1 ? 'día' : 'días'}`;
  }
  const a = Math.floor(total / 12), m = total % 12;
  const anios = a ? `${a} ${a === 1 ? 'año' : 'años'}` : '';
  const meses = m ? `${m} ${m === 1 ? 'mes' : 'meses'}` : '';
  return [anios, meses].filter(Boolean).join(', ');
}

/** "6 a 7 m", como la tabla del prototipo. */
export const edadCorta = (meses: number) => {
  const a = Math.floor(meses / 12), m = meses % 12;
  return a ? `${a} a ${m} m` : `${m} m`;
};

export const percentil = (p: number | null) => (p === null ? '—' : `P${Math.round(p)}`);

/** Fuera de P3–P97 la medición merece atención. */
export const percentilFueraDeRango = (p: number | null) => p !== null && (p < 3 || p > 97);

export const decimal = (n: number | null, digitos = 1) => (n === null ? '—' : n.toFixed(digitos));

export const SEXO: Record<string, string> = { M: 'Masculino', F: 'Femenino' };

export const diasDeAtraso = (fecha: string, hoy = hoyISO()) => Math.round((Date.parse(hoy) - Date.parse(fecha)) / 86_400_000);

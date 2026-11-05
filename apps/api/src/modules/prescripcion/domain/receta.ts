import type { Alergia, AlertaAlergia, Medicamento, Receta, RenglonRecetaInput } from '@red-clinica/shared';
import { sumarDias } from '../../../shared/fechas.js';

/** Unidades a dispensar: tomas por día × días (24 h y 90 días → 90). */
export function cantidadSugerida(frecuenciaHoras?: number, duracionDias?: number): number | undefined {
  if (!frecuenciaHoras || !duracionDias) return undefined;
  return Math.ceil((24 / frecuenciaHoras) * duracionDias);
}

const normal = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Renglones que chocan con una alergia del paciente: por id de medicamento o, si la alergia
 * se registró como texto, por el nombre del medicamento dentro de la descripción.
 */
export function alertasDeAlergia(renglones: RenglonRecetaInput[], medicamentos: Medicamento[], alergias: Alergia[]): AlertaAlergia[] {
  const porId = new Map(medicamentos.map((m) => [m.id, m]));
  const alertas: AlertaAlergia[] = [];
  for (const r of renglones) {
    const m = porId.get(r.idMedicamento);
    if (!m) continue;
    const a = alergias.find((x) =>
      x.idMedicamento === m.id ||
      [x.descripcion, x.tipo].some((t) => t && normal(t).includes(normal(m.nombre))));
    if (a) alertas.push({ idMedicamento: m.id, medicamento: m.nombre, alergia: a.descripcion ?? a.tipo, severidad: a.severidad });
  }
  return alertas;
}

/** Una receta está vigente mientras dure su renglón más largo (sin duración: solo el día de emisión). */
export function esVigente(r: Pick<Receta, 'fechaEmision' | 'renglones'>, hoy: string): boolean {
  const dias = Math.max(0, ...r.renglones.map((x) => x.duracionDias ?? 0));
  return sumarDias(r.fechaEmision, Math.max(dias - 1, 0)) >= hoy;
}

import type { CerrarConsultaInput, ConsultaDetalle } from '@red-clinica/shared';
import { Prohibido, ReglaDeNegocio } from '../../../shared/errores.js';

/** Solo el médico que abrió la consulta la edita o la cierra; una consulta cerrada ya no se edita. */
export function validarEdicion(c: ConsultaDetalle, idMedico: string): void {
  if (c.idMedico !== idMedico) throw new Prohibido('Solo el médico que abrió la consulta puede editarla.');
  if (c.cerrada) throw new ReglaDeNegocio('La consulta ya está cerrada y no se puede editar.');
}

/** Reglas clínicas del cierre que no dependen del motor (los rangos de signos los valida el contrato). */
export function validarCierre(i: CerrarConsultaInput): void {
  const s = i.signos;
  if (s.presionSistolica !== undefined && s.presionDiastolica !== undefined && s.presionDiastolica >= s.presionSistolica) {
    throw new ReglaDeNegocio('La presión diastólica debe ser menor que la sistólica.');
  }
  for (const d of i.diagnosticos) {
    for (const t of d.tratamientos) {
      const ids = t.receta?.renglones.map((r) => r.idMedicamento) ?? [];
      if (new Set(ids).size !== ids.length) throw new ReglaDeNegocio('Un medicamento aparece dos veces en la misma receta.');
    }
  }
}

/** Índice de masa corporal con un decimal. */
export const imc = (pesoKg?: number | null, tallaCm?: number | null) =>
  pesoKg && tallaCm ? Math.round((pesoKg / (tallaCm / 100) ** 2) * 10) / 10 : null;

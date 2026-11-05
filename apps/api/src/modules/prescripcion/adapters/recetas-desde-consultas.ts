import type { ConsultaDetalle, Receta } from '@red-clinica/shared';

/** Aplana las recetas de una lista de consultas (de la más reciente a la más antigua). */
export function recetasDe(consultas: ConsultaDetalle[]): Receta[] {
  return consultas.flatMap((c) =>
    c.diagnosticos.flatMap((d) =>
      d.tratamientos.flatMap((t) => (t.receta ? [{ ...t.receta, diagnostico: d.enfermedadDetectada }] : [])),
    ),
  ).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
}

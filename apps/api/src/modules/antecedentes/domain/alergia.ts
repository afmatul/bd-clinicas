import type { Alergia } from '@red-clinica/shared';

/** Regla usada por prescripcion: ¿el medicamento a recetar choca con una alergia registrada? */
export function alergiaQueBloquea(alergias: Alergia[], idMedicamento: string): Alergia | undefined {
  return alergias.find((a) => a.idMedicamento === idMedicamento);
}

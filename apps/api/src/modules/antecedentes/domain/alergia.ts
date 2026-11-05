import type { Alergia, Antecedente } from '@red-clinica/shared';
import { Conflicto } from '../../../shared/errores.js';

/** Regla usada por prescripcion: ¿el medicamento a recetar choca con una alergia registrada? */
export function alergiaQueBloquea(alergias: Alergia[], idMedicamento: string): Alergia | undefined {
  return alergias.find((a) => a.idMedicamento === idMedicamento);
}

const clave = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

/** No se registra dos veces la misma alergia (sin distinguir mayúsculas ni acentos): se edita la existente. */
export function validarAlergiaNueva(existentes: Alergia[], tipo: string, idMedicamento?: string): void {
  const repetida = existentes.find((a) => clave(a.tipo) === clave(tipo) || (idMedicamento && a.idMedicamento === idMedicamento));
  if (repetida) throw new Conflicto(`El paciente ya tiene registrada la alergia "${repetida.tipo}".`);
}

export function validarAntecedenteNuevo(existentes: Antecedente[], tipo: string): void {
  const repetido = existentes.find((a) => clave(a.tipo) === clave(tipo));
  if (repetido) throw new Conflicto(`El antecedente "${repetido.tipo}" ya está registrado.`);
}

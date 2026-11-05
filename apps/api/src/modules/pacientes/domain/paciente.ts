import type { InstitucionClave, PacienteFicha, RegistrarPacienteInput } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

/** Ficha sin el cuadro clínico: alergias y antecedentes son del módulo antecedentes. */
export type PacienteDatos = Omit<PacienteFicha, 'alergias' | 'antecedentes'>;

export interface Baja {
  fecha: string;
  motivo: string;
  idPersonal: string | null;
}

/** Reglas de alta que no dependen del motor. */
export function validarAlta(input: RegistrarPacienteInput, institucion: InstitucionClave): void {
  if (institucion === 'pediatrico' && !input.responsable) {
    throw new ReglaDeNegocio('Todo menor debe registrarse con al menos un responsable.');
  }
  if (input.fechaNacimiento > new Date().toISOString().slice(0, 10)) {
    throw new ReglaDeNegocio('La fecha de nacimiento no puede ser futura.');
  }
}

/** Una baja es lógica, exige motivo y no se repite. */
export function validarBaja(p: PacienteDatos): void {
  if (p.estado === 'BAJA') throw new ReglaDeNegocio('El expediente ya está dado de baja.');
}

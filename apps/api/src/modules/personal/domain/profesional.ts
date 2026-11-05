import type { InstitucionClave } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

/** Departamentos y la tabla puente medico_especialidad existen solo en el modelo del hospital (Entrega I). */
export function exigirCatalogoDeEspecialidades(institucion: InstitucionClave): void {
  if (institucion !== 'hospital') {
    throw new ReglaDeNegocio('Las especialidades y departamentos se administran solo en el Hospital general.');
  }
}

/** Especialidad implícita del centro pediátrico: su tabla pediatra no tiene especialidades. */
export const PEDIATRIA = { id: 'pediatria', nombre: 'Pediatría' } as const;

import { z } from 'zod';

/** Motores de base de datos soportados. Cada institución usa uno distinto. */
export const Motor = z.enum(['postgres', 'mysql', 'mongo', 'couch']);
export type Motor = z.infer<typeof Motor>;

/** Módulos de la API (ver documento de arquitectura). */
export const ModuloId = z.enum([
  'identidad',
  'pacientes',
  'antecedentes',
  'agenda',
  'atencion',
  'prescripcion',
  'personal',
  'auditoria',
  'pediatria',
  'odontologia',
  'laboratorio',
]);
export type ModuloId = z.infer<typeof ModuloId>;

export const MODULOS_COMUNES: ModuloId[] = [
  'identidad', 'pacientes', 'antecedentes', 'agenda', 'atencion', 'prescripcion', 'personal', 'auditoria',
];

export const InstitucionClave = z.enum(['hospital', 'pediatrico', 'laboratorio', 'odontologia']);
export type InstitucionClave = z.infer<typeof InstitucionClave>;

export interface InstitucionInfo {
  clave: InstitucionClave;
  nombre: string;
  motor: Motor;
  motorNombre: string;
  modulos: ModuloId[];
}

/** Asignación de motores de la Entrega I. La base plataforma guarda la misma información. */
export const INSTITUCIONES: Record<InstitucionClave, InstitucionInfo> = {
  hospital: {
    clave: 'hospital', nombre: 'Hospital general', motor: 'postgres', motorNombre: 'PostgreSQL',
    modulos: [...MODULOS_COMUNES],
  },
  pediatrico: {
    clave: 'pediatrico', nombre: 'Centro médico pediátrico', motor: 'mysql', motorNombre: 'MySQL',
    modulos: [...MODULOS_COMUNES, 'pediatria'],
  },
  laboratorio: {
    clave: 'laboratorio', nombre: 'Laboratorio clínico', motor: 'mongo', motorNombre: 'MongoDB',
    modulos: [...MODULOS_COMUNES, 'laboratorio'],
  },
  odontologia: {
    clave: 'odontologia', nombre: 'Clínica odontológica', motor: 'couch', motorNombre: 'CouchDB',
    modulos: [...MODULOS_COMUNES, 'odontologia'],
  },
};

import { z } from 'zod';
import { InstitucionClave, ModuloId, Motor } from './instituciones.js';

export const Rol = z.enum(['RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL', 'AUDITOR', 'ADMIN']);
export type Rol = z.infer<typeof Rol>;

export const LoginInput = z.object({
  username: z.string().trim().min(1, 'Escriba su usuario.'),
  password: z.string().min(1, 'Escriba su contraseña.'),
  /** Institución elegida en el login. Solo se usa para confirmar que el usuario pertenece a ella. */
  institucion: InstitucionClave.optional(),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** Lo que la web necesita saber de la sesión: quién es y qué módulos mostrar. */
export const Perfil = z.object({
  usuario: z.object({
    id: z.string(),
    username: z.string(),
    nombre: z.string(),
    rol: Rol,
    idPersonal: z.string().nullable(),
  }),
  institucion: z.object({
    id: z.string(),
    clave: InstitucionClave,
    nombre: z.string(),
    motor: Motor,
    modulos: z.array(ModuloId),
  }),
});
export type Perfil = z.infer<typeof Perfil>;

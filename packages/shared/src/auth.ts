import { z } from 'zod';
import { InstitucionClave, ModuloId, Motor } from './instituciones.js';

export const Rol = z.enum(['RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL', 'AUDITOR', 'ADMIN']);
export type Rol = z.infer<typeof Rol>;

export const LoginInput = z.object({
  username: z.string().trim().min(1, 'Escriba su usuario.'),
  password: z.string().min(1, 'Escriba su contraseña.'),
});
export type LoginInput = z.infer<typeof LoginInput>;

/** Solo ADMIN: la institución a la que pasa su sesión. */
export const CambiarInstitucionInput = z.object({ institucion: InstitucionClave });
export type CambiarInstitucionInput = z.infer<typeof CambiarInstitucionInput>;

export const ActualizarPerfilInput = z
  .object({
    nombre: z.string().trim().min(3, 'Escriba su nombre completo.').max(150, 'Máximo 150 caracteres.').optional(),
    passwordActual: z.string().optional(),
    passwordNueva: z.string().min(8, 'La contraseña nueva debe tener al menos 8 caracteres.').max(100).optional(),
  })
  .refine((v) => v.nombre !== undefined || v.passwordNueva !== undefined, { message: 'No hay cambios que guardar.' })
  .refine((v) => v.passwordNueva === undefined || !!v.passwordActual, { message: 'Escriba su contraseña actual para cambiarla.', path: ['passwordActual'] });
export type ActualizarPerfilInput = z.infer<typeof ActualizarPerfilInput>;

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

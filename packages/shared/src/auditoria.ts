import { z } from 'zod';
import { Rol } from './auth.js';

export const AccionBitacora = z.enum(['LOGIN', 'LOGOUT', 'LEER', 'CREAR', 'MODIFICAR', 'BAJA', 'EXPORTAR']);
export type AccionBitacora = z.infer<typeof AccionBitacora>;

/** Una fila de la bitácora tal como la ve un auditor: quién, qué, cuándo. Nunca contenido clínico. */
export const EntradaBitacora = z.object({
  id: z.string(),
  momento: z.string(), // ISO 8601 con zona
  usuario: z.object({ id: z.string(), username: z.string(), nombre: z.string(), rol: Rol }).nullable(),
  accion: AccionBitacora,
  entidad: z.string().nullable(),
  idRegistro: z.string().nullable(),
  idPaciente: z.string().nullable(),
  ip: z.string().nullable(),
});
export type EntradaBitacora = z.infer<typeof EntradaBitacora>;

export const ConsultarBitacoraQuery = z.object({
  accion: AccionBitacora.optional(),
  usuario: z.string().trim().optional(), // username
  idPaciente: z.string().trim().optional(),
  desde: z.string().date('Use una fecha válida.').optional(),
  hasta: z.string().date('Use una fecha válida.').optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(25),
});
export type ConsultarBitacoraQuery = z.infer<typeof ConsultarBitacoraQuery>;

/** "Quién vio a este paciente": un renglón por usuario con su último acceso. */
export const AccesoPaciente = z.object({
  usuario: z.object({ id: z.string(), username: z.string(), nombre: z.string(), rol: Rol }),
  ultimoAcceso: z.string(),
  lecturas: z.number().int(),
  modificaciones: z.number().int(),
});
export type AccesoPaciente = z.infer<typeof AccesoPaciente>;

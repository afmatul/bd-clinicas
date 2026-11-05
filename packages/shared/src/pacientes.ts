import { z } from 'zod';

/** Los ids viajan como texto: enteros en SQL, ObjectId en Mongo, cadenas en Couch. */
export const Id = z.string().min(1);

export const EstadoPaciente = z.enum(['ACTIVO', 'BAJA']);
export type EstadoPaciente = z.infer<typeof EstadoPaciente>;

export const Sexo = z.enum(['F', 'M']);

const cui = z.string().regex(/^\d{13}$/, 'El CUI debe tener 13 dígitos.');

export const PacienteResumen = z.object({
  id: Id,
  cui: z.string().nullable(),
  nombres: z.string(),
  apellidos: z.string(),
  fechaNacimiento: z.string(), // ISO yyyy-mm-dd
  sexo: z.string().nullable(),
  tipoSangre: z.string().nullable(),
  /** Primer teléfono de contacto (en pediatría, el del responsable). */
  telefono: z.string().nullable(),
  estado: EstadoPaciente,
});
export type PacienteResumen = z.infer<typeof PacienteResumen>;

export const Alergia = z.object({
  id: Id,
  tipo: z.string(),
  descripcion: z.string().nullable(),
  severidad: z.enum(['LEVE', 'MODERADA', 'SEVERA']).nullable(),
  idMedicamento: Id.nullable(),
});
export type Alergia = z.infer<typeof Alergia>;

export const Antecedente = z.object({ id: Id, tipo: z.string(), descripcion: z.string().nullable() });
export type Antecedente = z.infer<typeof Antecedente>;

export const PacienteFicha = PacienteResumen.extend({
  direccion: z.string().nullable(),
  procedencia: z.string().nullable(),
  telefonos: z.array(z.string()),
  emails: z.array(z.string()),
  alergias: z.array(Alergia),
  antecedentes: z.array(Antecedente),
  baja: z.object({ fecha: z.string(), motivo: z.string() }).nullable(),
});
export type PacienteFicha = z.infer<typeof PacienteFicha>;

export const BuscarPacientesQuery = z.object({
  q: z.string().trim().optional(),
  estado: EstadoPaciente.optional(),
  sexo: Sexo.optional(),
  tipoSangre: z.string().max(5).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type BuscarPacientesQuery = z.infer<typeof BuscarPacientesQuery>;

export const Pagina = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int(), pagina: z.number().int(), porPagina: z.number().int() });

export const RegistrarPacienteInput = z.object({
  cui: cui.optional(),
  nombres: z.string().trim().min(1, 'Escriba los nombres.'),
  apellidos: z.string().trim().min(1, 'Escriba los apellidos.'),
  fechaNacimiento: z.string().date('Use una fecha válida.'),
  sexo: Sexo,
  tipoSangre: z.string().max(5).optional(),
  direccion: z.string().optional(),
  procedencia: z.string().optional(),
  telefonos: z.array(z.string().min(8)).default([]),
  emails: z.array(z.string().email()).default([]),
  /** Pediátrico: todo menor entra con su primer responsable en la misma transacción. */
  responsable: z
    .object({
      nombreCompleto: z.string().min(1),
      cui: cui.optional(),
      parentesco: z.string().min(1),
      telefonos: z.array(z.string()).default([]),
      esTutorLegal: z.boolean().default(true),
    })
    .optional(),
});
export type RegistrarPacienteInput = z.infer<typeof RegistrarPacienteInput>;

export const DarDeBajaInput = z.object({
  motivo: z.string().trim().min(3, 'Indique el motivo de la baja.'),
});
export type DarDeBajaInput = z.infer<typeof DarDeBajaInput>;

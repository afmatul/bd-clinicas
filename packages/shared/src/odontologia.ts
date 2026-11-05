import { z } from 'zod';
import { Id } from './pacientes.js';

/** Notación FDI de la dentición permanente: cuadrante 1–4 y pieza 1–8 (11–18, 21–28, 31–38, 41–48). */
export const PIEZAS = ([1, 2, 3, 4] as const).flatMap((c) => [1, 2, 3, 4, 5, 6, 7, 8].map((p) => `${c}${p}`));
export const Pieza = z.string().refine((p) => PIEZAS.includes(p), 'Pieza inválida: use notación FDI (11–48).');

export const ESTADOS_PIEZA = ['SANA', 'CARIES', 'OBTURADA', 'AUSENTE', 'CORONA', 'ENDODONCIA'] as const;
/** Caras de la pieza: mesial, distal, oclusal/incisal, vestibular, lingual/palatina. */
export const CARAS = ['M', 'D', 'O', 'V', 'L'] as const;

export const EstadoPieza = z.object({
  estado: z.enum(ESTADOS_PIEZA),
  caras: z.array(z.enum(CARAS)).max(5).optional(),
  nota: z.string().trim().max(200).optional(),
});
export type EstadoPieza = z.infer<typeof EstadoPieza>;

export const Odontograma = z.record(Pieza, EstadoPieza);
export type Odontograma = z.infer<typeof Odontograma>;

export const AplicarOdontogramaInput = z.object({
  cambios: z.record(Pieza, EstadoPieza).refine((c) => Object.keys(c).length > 0, 'Indique al menos una pieza.'),
});
export type AplicarOdontogramaInput = z.infer<typeof AplicarOdontogramaInput>;

/** Un procedimiento registrado en una consulta cerrada (historial del odontograma). */
export const ProcedimientoPieza = z.object({
  idConsulta: Id,
  fecha: z.string(),
  pieza: z.string(),
  procedimiento: z.string(),
  caras: z.array(z.string()),
  estadoResultante: z.string().nullable(),
});
export type ProcedimientoPieza = z.infer<typeof ProcedimientoPieza>;

export const OdontogramaPaciente = z.object({
  idPaciente: Id,
  piezas: Odontograma,
  historial: z.array(ProcedimientoPieza),
});
export type OdontogramaPaciente = z.infer<typeof OdontogramaPaciente>;

// ---------- Recepción (Clínica odontológica) ----------

export const EstadoTurno = z.enum(['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA']);
export type EstadoTurno = z.infer<typeof EstadoTurno>;

export const Turno = z.object({
  id: Id,
  hora: z.string(), // HH:mm
  idPaciente: Id,
  paciente: z.object({ nombres: z.string(), apellidos: z.string() }).nullable(),
  motivo: z.string().nullable(),
  estado: EstadoTurno,
  /** Hora ISO en que recepción marcó la llegada; null si aún no llega. */
  llegada: z.string().nullable(),
  idOdontologo: Id,
  odontologo: z.string(),
});
export type Turno = z.infer<typeof Turno>;

export const RecepcionDelDia = z.object({
  fecha: z.string(),
  odontologos: z.array(z.object({ id: Id, nombre: z.string() })),
  turnos: z.array(Turno),
  /** Primer horario libre desde ahora, con el odontólogo que lo tiene libre. */
  siguienteLibre: z.object({ hora: z.string(), idOdontologo: Id, odontologo: z.string() }).nullable(),
});
export type RecepcionDelDia = z.infer<typeof RecepcionDelDia>;

export const MOTIVOS_RECEPCION = ['Limpieza', 'Dolor', 'Resina', 'Extracción', 'Ortodoncia'] as const;

export const RegistroRapidoInput = z.object({
  nombreCompleto: z
    .string().trim()
    .refine((n) => n.split(/\s+/).length >= 2, 'Escriba al menos un nombre y un apellido.'),
  telefono: z.string().transform((t) => t.replace(/\D/g, '')).pipe(z.string().regex(/^\d{8}$/, 'El teléfono debe tener 8 dígitos.')),
  fechaNacimiento: z.string().date('Use una fecha válida.'),
  motivo: z.enum(MOTIVOS_RECEPCION, { error: 'Seleccione el motivo.' }),
  asignarTurno: z.boolean().default(true),
});
export type RegistroRapidoInput = z.infer<typeof RegistroRapidoInput>;

export const RegistroRapidoResultado = z.object({
  idPaciente: Id,
  turno: z.object({ id: Id, hora: z.string(), odontologo: z.string() }).nullable(),
});
export type RegistroRapidoResultado = z.infer<typeof RegistroRapidoResultado>;

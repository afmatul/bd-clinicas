import type { AgendarCitaInput, CitaDetalle, Disponibilidad, EstadoCita, Perfil } from '@red-clinica/shared';
import { HORARIOS } from '@red-clinica/shared';
import { api, ApiError } from './cliente';
import { MODO_DEMO, PACIENTES_DEMO } from '../datos/demo';
import { ahoraLocal } from '../datos/formato';

export interface AgendaRango { idMedico: string; desde: string; hasta: string; citas: CitaDetalle[] }

/** Profesional del directorio (GET /personal, módulo personal). */
export interface Profesional { id: string; nombres: string; apellidos: string; especialidades: { id: string; nombre: string }[] }
export interface Especialidad { id: string; nombre: string }

export const nombreProfesional = (p: Pick<Profesional, 'nombres' | 'apellidos'>) => `${p.nombres} ${p.apellidos}`.trim();

/**
 * Médicos con agenda en la institución. Si el directorio de personal aún no responde
 * (404), se usa al médico de la sesión para que la agenda siga funcionando.
 */
export async function listarMedicos(perfil: Perfil): Promise<Profesional[]> {
  const propio: Profesional[] = perfil.usuario.idPersonal
    ? [{ id: perfil.usuario.idPersonal, nombres: perfil.usuario.nombre, apellidos: '', especialidades: [] }]
    : [];
  if (MODO_DEMO) return [{ id: 'demo', nombres: 'Dra. Ana Lucía', apellidos: 'Pérez', especialidades: [] }, { id: 'demo2', nombres: 'Dr. Carlos', apellidos: 'Méndez', especialidades: [] }];
  try {
    const r = await api<{ items: Profesional[] }>('/personal');
    return r.items.length ? r.items : propio;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return propio;
    throw e;
  }
}

export async function listarEspecialidades(): Promise<Especialidad[]> {
  if (MODO_DEMO) return [{ id: '1', nombre: 'Medicina interna' }, { id: '2', nombre: 'Cardiología' }];
  try {
    return await api<Especialidad[]>('/personal/especialidades');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}

export function agenda(q: { idMedico?: string; desde: string; hasta?: string }): Promise<AgendaRango> {
  if (MODO_DEMO) return Promise.resolve(agendaDemo(q.desde, q.hasta ?? q.desde));
  return api<AgendaRango>('/agenda', { query: q });
}

export function disponibilidad(idMedico: string, fecha: string): Promise<Disponibilidad> {
  if (MODO_DEMO) return Promise.resolve({ idMedico, fecha, libres: HORARIOS.filter((h) => !agendaDemo(fecha, fecha).citas.some((c) => c.hora === h)) });
  return api<Disponibilidad>('/agenda/disponibilidad', { query: { idMedico, fecha } });
}

export function proximasDelPaciente(idPaciente: string): Promise<CitaDetalle[]> {
  if (MODO_DEMO) return Promise.resolve([]);
  return api<CitaDetalle[]>(`/agenda/paciente/${encodeURIComponent(idPaciente)}`);
}

export function agendar(input: AgendarCitaInput): Promise<{ id: string }> {
  if (MODO_DEMO) return Promise.resolve({ id: 'demo' });
  return api<{ id: string }>('/agenda/citas', { method: 'POST', body: input });
}

export function cambiarEstadoCita(id: string, estado: Extract<EstadoCita, 'CONFIRMADA' | 'CANCELADA' | 'NO_ASISTIO'>): Promise<CitaDetalle> {
  if (MODO_DEMO) return Promise.reject(new ApiError(400, 'En modo demostración la agenda no se modifica.'));
  return api<CitaDetalle>(`/agenda/citas/${encodeURIComponent(id)}/estado`, { method: 'PATCH', body: { estado } });
}

/** La agenda del prototipo, para revisar el diseño sin API (NEXT_PUBLIC_DEMO=true). */
function agendaDemo(desde: string, hasta: string): AgendaRango {
  const hoy = ahoraLocal().fecha;
  const filas: [string, number, string, EstadoCita][] = [
    ['08:00', 0, 'Control de hipertensión', 'ATENDIDA'], ['08:30', 1, 'Dolor torácico', 'EN_CONSULTA'],
    ['09:00', 2, 'Resultados de laboratorio', 'CONFIRMADA'], ['09:30', 3, 'Primera consulta', 'CONFIRMADA'],
    ['10:00', 4, 'Seguimiento postoperatorio', 'PROGRAMADA'], ['10:30', 5, 'Control de diabetes', 'NO_ASISTIO'],
    ['11:30', 6, 'Chequeo general', 'CANCELADA'],
  ];
  const citas = hoy >= desde && hoy <= hasta
    ? filas.map(([hora, i, motivo, estado]) => {
        const p = PACIENTES_DEMO[i]!;
        return { id: `d${i}`, idPaciente: p.id, paciente: { nombres: p.nombres, apellidos: p.apellidos, cui: p.cui }, idMedico: 'demo', idEspecialidad: null, fecha: hoy, hora, motivo, estado };
      })
    : [];
  return { idMedico: 'demo', desde, hasta, citas };
}

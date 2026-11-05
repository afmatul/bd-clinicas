import type { Departamento, DirectorioQuery, Especialidad, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO, PERSONAL_DEMO } from '../datos/demo';

export async function listarPersonal(q: DirectorioQuery = {}): Promise<{ items: Profesional[] }> {
  if (MODO_DEMO) {
    const t = q.q?.toLowerCase();
    return {
      items: PERSONAL_DEMO.filter((p) =>
        (!t || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(t) || p.numeroColegiado === q.q) &&
        (!q.especialidad || p.especialidades.some((e) => e.id === q.especialidad))),
    };
  }
  return api('/personal', { query: q });
}

export async function miPerfilProfesional(): Promise<Profesional | null> {
  if (MODO_DEMO) return PERSONAL_DEMO[0]!;
  return (await api<{ profesional: Profesional | null }>('/personal/yo')).profesional;
}

export async function especialidades(): Promise<Especialidad[]> {
  if (MODO_DEMO) {
    const m = new Map(PERSONAL_DEMO.flatMap((p) => p.especialidades).map((e) => [e.id, e]));
    return [...m.values()].map((e) => ({ ...e, idDepartamento: null }));
  }
  return api('/personal/especialidades');
}

export async function departamentos(): Promise<Departamento[]> {
  if (MODO_DEMO) return [];
  return api('/personal/departamentos');
}

export const registrarProfesional = (input: RegistrarProfesionalInput) =>
  api<{ id: string }>('/personal', { method: 'POST', body: input });

export const asignarEspecialidad = (id: string, idEsp: string) =>
  api<Profesional>(`/personal/${id}/especialidades/${idEsp}`, { method: 'PUT' });

export const quitarEspecialidad = (id: string, idEsp: string) =>
  api<Profesional>(`/personal/${id}/especialidades/${idEsp}`, { method: 'DELETE' });

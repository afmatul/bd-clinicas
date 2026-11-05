import type {
  CapturarResultadosInput,
  ExamenDetalle,
  ListaExamenes,
  ListarExamenesQuery,
  OrdenarExamenInput,
  TipoExamen,
} from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO } from '../datos/demo';
import { EXAMENES_DEMO } from '../datos/laboratorio-demo';

/** Módulo laboratorio (solo Laboratorio clínico · MongoDB). */
export async function listarExamenes(q: Partial<ListarExamenesQuery> = {}): Promise<ListaExamenes> {
  if (MODO_DEMO) {
    const items = EXAMENES_DEMO.filter((e) => !q.tipo || e.tipo === q.tipo);
    return { items, total: items.length, ultimas48h: EXAMENES_DEMO.length, criticos: EXAMENES_DEMO.filter((e) => e.critico).length };
  }
  return api<ListaExamenes>('/laboratorio/examenes', { query: q });
}

export async function obtenerExamen(id: string): Promise<ExamenDetalle> {
  if (MODO_DEMO) return EXAMENES_DEMO.find((e) => e.id === id)!;
  return api<ExamenDetalle>(`/laboratorio/examenes/${id}`);
}

export async function tiposDeExamen(): Promise<TipoExamen[]> {
  if (MODO_DEMO) return [];
  return api<TipoExamen[]>('/laboratorio/tipos');
}

export const ordenarExamen = (input: OrdenarExamenInput) =>
  api<{ id: string; codigo: string }>('/laboratorio/examenes', { method: 'POST', body: input });

export const capturarResultados = (id: string, input: CapturarResultadosInput) =>
  api<ExamenDetalle>(`/laboratorio/examenes/${id}/resultados`, { method: 'PUT', body: input });

export const validarExamen = (id: string) =>
  api<ExamenDetalle>(`/laboratorio/examenes/${id}/validar`, { method: 'POST' });

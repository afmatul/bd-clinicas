import type { BuscarPacientesQuery, PacienteResumen } from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO, PACIENTES_DEMO } from '../datos/demo';

export interface PaginaPacientes { items: PacienteResumen[]; total: number; pagina: number; porPagina: number }

export async function buscarPacientes(q: Partial<BuscarPacientesQuery>): Promise<PaginaPacientes> {
  const pagina = q.pagina ?? 1, porPagina = q.porPagina ?? 20;
  if (MODO_DEMO) {
    const texto = q.q?.toLowerCase();
    const items = PACIENTES_DEMO.filter((p) =>
      (!texto || p.cui === q.q || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(texto)) &&
      (!q.estado || p.estado === q.estado) && (!q.sexo || p.sexo === q.sexo) && (!q.tipoSangre || p.tipoSangre === q.tipoSangre));
    return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), total: items.length, pagina, porPagina };
  }
  return api<PaginaPacientes>('/pacientes', { query: { ...q, pagina, porPagina } });
}

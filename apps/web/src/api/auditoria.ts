import type { AccesoPaciente, ConsultarBitacoraQuery, EntradaBitacora } from '@red-clinica/shared';
import { api } from './cliente';
import { BITACORA_DEMO, MODO_DEMO } from '../datos/demo';

export interface PaginaBitacora { items: EntradaBitacora[]; total: number; pagina: number; porPagina: number }

export async function buscarBitacora(q: Partial<ConsultarBitacoraQuery>): Promise<PaginaBitacora> {
  const pagina = q.pagina ?? 1, porPagina = q.porPagina ?? 25;
  if (MODO_DEMO) {
    const items = BITACORA_DEMO.filter((e) => (!q.accion || e.accion === q.accion) && (!q.usuario || e.usuario?.username === q.usuario));
    return { items: items.slice((pagina - 1) * porPagina, pagina * porPagina), total: items.length, pagina, porPagina };
  }
  return api('/auditoria/bitacora', { query: { ...q, pagina, porPagina } });
}

/** Enlace de descarga del CSV con los mismos filtros (la cookie de sesión viaja sola). */
export function urlExportarBitacora(q: Partial<ConsultarBitacoraQuery>): string {
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  return `/api/auditoria/bitacora.csv${qs.size ? `?${qs}` : ''}`;
}

export async function accesosAPaciente(idPaciente: string): Promise<AccesoPaciente[]> {
  if (MODO_DEMO) {
    const vistos = new Map<string, AccesoPaciente>();
    for (const e of BITACORA_DEMO.filter((x) => x.idPaciente === idPaciente && x.usuario)) {
      const a = vistos.get(e.usuario!.id) ?? { usuario: e.usuario!, ultimoAcceso: e.momento, lecturas: 0, modificaciones: 0 };
      if (e.accion === 'LEER') a.lecturas++; else a.modificaciones++;
      vistos.set(e.usuario!.id, a);
    }
    return [...vistos.values()];
  }
  return (await api<{ items: AccesoPaciente[] }>(`/auditoria/pacientes/${idPaciente}/accesos`)).items;
}

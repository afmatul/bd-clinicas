import type { ConsultarBitacoraQuery, EntradaBitacora } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import type { ConsultaBitacora } from '../ports/consulta-bitacora.js';
import type { Auditoria } from './registrar-en-bitacora.js';

const MAX_EXPORTACION = 5000;

/** Celda CSV segura: entre comillas y sin fórmulas (=, +, -, @) que una hoja de cálculo ejecutaría. */
const celda = (v: string | null | undefined) => {
  const s = v ?? '';
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/**
 * Consultas de auditoría. Solo ven la bitácora de su propia institución: los datos de una
 * institución no salen de ella. Consultar o exportar la bitácora también queda en la bitácora.
 */
export function crearConsultasAuditoria(deps: { consulta: ConsultaBitacora; auditoria: Auditoria }) {
  return {
    async buscar(ctx: ContextoInstitucion, q: ConsultarBitacoraQuery) {
      exigirRol(ctx, ['AUDITOR']);
      const r = await deps.consulta.buscar(ctx.institucion.id, q);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'bitacora', idPaciente: q.idPaciente });
      return { ...r, pagina: q.pagina, porPagina: q.porPagina };
    },

    /** Quién vio o modificó el expediente. Lo consultan el auditor y el médico desde la ficha. */
    async accesosAPaciente(ctx: ContextoInstitucion, idPaciente: string) {
      exigirRol(ctx, ['AUDITOR', 'MEDICO']);
      return { items: await deps.consulta.accesosAPaciente(ctx.institucion.id, idPaciente) };
    },

    async exportarCsv(ctx: ContextoInstitucion, q: ConsultarBitacoraQuery) {
      exigirRol(ctx, ['AUDITOR']);
      const { items } = await deps.consulta.buscar(ctx.institucion.id, { ...q, pagina: 1, porPagina: MAX_EXPORTACION });
      await deps.auditoria.registrar(ctx, 'EXPORTAR', { entidad: 'bitacora', idPaciente: q.idPaciente });
      const fila = (e: EntradaBitacora) =>
        [e.momento, e.usuario?.username, e.usuario?.nombre, e.usuario?.rol, e.accion, e.entidad, e.idRegistro, e.idPaciente, e.ip]
          .map(celda)
          .join(',');
      return ['momento,usuario,nombre,rol,accion,entidad,id_registro,id_paciente,ip', ...items.map(fila)].join('\r\n');
    },
  };
}
export type ConsultasAuditoria = ReturnType<typeof crearConsultasAuditoria>;

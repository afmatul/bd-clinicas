import type { ContextoInstitucion } from '../../../shared/contexto.js';
import type { AccionBitacora } from '../domain/entrada-bitacora.js';
import type { Bitacora } from '../ports/bitacora.js';

/**
 * API pública del módulo auditoria para los demás módulos. Se llama desde el caso de uso,
 * no desde el adaptador, para que la bitácora sea igual en los cuatro motores.
 */
export function crearAuditoria(bitacora: Bitacora) {
  return {
    registrar(ctx: ContextoInstitucion, accion: AccionBitacora, datos: { entidad: string; idRegistro?: string; idPaciente?: string }) {
      return bitacora.registrar({
        idUsuario: ctx.usuario.id,
        idInstitucion: ctx.institucion.id,
        accion,
        ...datos,
        ip: ctx.ip,
      });
    },
  };
}
export type Auditoria = ReturnType<typeof crearAuditoria>;

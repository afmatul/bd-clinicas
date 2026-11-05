import type { Rol } from '@red-clinica/shared';
import type { ContextoInstitucion } from './contexto.js';
import { Prohibido } from './errores.js';

/** Autorización por rol dentro del caso de uso (clasificación pública / confidencial / restringida de la Entrega I). */
export function exigirRol(ctx: ContextoInstitucion, permitidos: Rol[]): void {
  if (ctx.usuario.rol !== 'ADMIN' && !permitidos.includes(ctx.usuario.rol)) throw new Prohibido();
}

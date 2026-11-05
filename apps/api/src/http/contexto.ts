import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ModuloId } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../shared/contexto.js';
import { NoAutorizado, NoEncontrado } from '../shared/errores.js';
import type { ClaimsSesion } from '../modules/identidad/application/iniciar-sesion.js';
import type { Institucion } from '../modules/identidad/ports/usuario-repository.js';

export const COOKIE_SESION = 'rc_sesion';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: ClaimsSesion;
    user: ClaimsSesion;
  }
}
declare module 'fastify' {
  interface FastifyRequest {
    contexto: ContextoInstitucion;
  }
}

/**
 * preHandler: verifica el JWT de la cookie y arma el ContextoInstitucion.
 * Con `modulo`, responde 404 si la institución no tiene ese módulo (p. ej. /pediatria desde el hospital).
 */
export function requiereSesion(instituciones: () => Map<string, Institucion>, modulo?: ModuloId) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    try {
      await req.jwtVerify({ onlyCookie: true });
    } catch {
      throw new NoAutorizado();
    }
    const c = req.user;
    const inst = instituciones().get(c.id_institucion);
    if (!inst) throw new NoAutorizado();
    if (modulo && !inst.modulos.includes(modulo)) throw new NoEncontrado('La sección');
    req.contexto = {
      usuario: { id: c.sub, username: '', rol: c.rol, idPersonal: c.id_personal },
      institucion: inst,
      ip: req.ip,
    };
  };
}

import {
  createParamDecorator, Inject, Injectable, SetMetadata,
  type CanActivate, type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { ModuloId } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../shared/contexto.js';
import { NoAutorizado, NoEncontrado } from '../shared/errores.js';
import type { ClaimsSesion } from '../modules/identidad/application/iniciar-sesion.js';
import type { Institucion } from '../modules/identidad/ports/usuario-repository.js';
import { INSTITUCIONES } from '../tokens.js';

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

const MODULO = 'rc:modulo';
/** Marca un controlador con el módulo que la institución debe tener habilitado (si no, 404). */
export const Modulo = (m: ModuloId) => SetMetadata(MODULO, m);

/**
 * Verifica el JWT de la cookie y arma el ContextoInstitucion de la petición.
 * Una petición a un módulo que la institución no tiene (p. ej. /pediatria desde el hospital) responde 404.
 */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(INSTITUCIONES) private readonly instituciones: () => Map<string, Institucion>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    try {
      await req.jwtVerify({ onlyCookie: true });
    } catch {
      throw new NoAutorizado();
    }
    const c = req.user;
    const inst = this.instituciones().get(c.id_institucion);
    if (!inst) throw new NoAutorizado();
    const modulo = this.reflector.getAllAndOverride<ModuloId | undefined>(MODULO, [ctx.getHandler(), ctx.getClass()]);
    if (modulo && !inst.modulos.includes(modulo)) throw new NoEncontrado('La sección');
    req.contexto = {
      usuario: { id: c.sub, username: '', rol: c.rol, idPersonal: c.id_personal },
      institucion: inst,
      ip: req.ip,
    };
    return true;
  }
}

/** Inyecta el ContextoInstitucion en el parámetro de un handler. */
export const Contexto = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ContextoInstitucion => ctx.switchToHttp().getRequest<FastifyRequest>().contexto,
);

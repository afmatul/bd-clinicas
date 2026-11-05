import type { FastifyInstance } from 'fastify';
import { LoginInput } from '@red-clinica/shared';
import { COOKIE_SESION, requiereSesion } from '../../../../http/contexto.js';
import type { Identidad } from '../../application/iniciar-sesion.js';
import type { Institucion } from '../../ports/usuario-repository.js';
import type { Bitacora } from '../../../auditoria/ports/bitacora.js';

const OCHO_HORAS = 8 * 60 * 60;

export function rutasIdentidad(app: FastifyInstance, deps: { identidad: Identidad; instituciones: () => Map<string, Institucion>; bitacora: Bitacora }) {
  app.post('/auth/login', async (req, reply) => {
    const { perfil, claims } = await deps.identidad.iniciarSesion(LoginInput.parse(req.body), req.ip);
    const token = await reply.jwtSign(claims, { expiresIn: OCHO_HORAS });
    reply.setCookie(COOKIE_SESION, token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: OCHO_HORAS,
    });
    return perfil;
  });

  app.get('/auth/perfil', { preHandler: requiereSesion(deps.instituciones) }, async (req) =>
    deps.identidad.obtenerPerfil(req.contexto.usuario.id),
  );

  app.post('/auth/logout', { preHandler: requiereSesion(deps.instituciones) }, async (req, reply) => {
    await deps.bitacora.registrar({ idUsuario: req.contexto.usuario.id, idInstitucion: req.contexto.institucion.id, accion: 'LOGOUT', ip: req.ip });
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  });
}

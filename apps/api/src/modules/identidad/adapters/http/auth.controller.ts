import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoginInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../../shared/contexto.js';
import { COOKIE_SESION, Contexto, SesionGuard } from '../../../../http/contexto.js';
import type { Bitacora } from '../../../auditoria/ports/bitacora.js';
import type { Identidad } from '../../application/iniciar-sesion.js';
import { BITACORA, IDENTIDAD } from '../../../../tokens.js';

const OCHO_HORAS = 8 * 60 * 60;

/** Adaptador HTTP del módulo identidad. */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IDENTIDAD) private readonly identidad: Identidad,
    @Inject(BITACORA) private readonly bitacora: Bitacora,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const { perfil, claims } = await this.identidad.iniciarSesion(LoginInput.parse(body), req.ip);
    const token = await reply.jwtSign(claims, { expiresIn: OCHO_HORAS });
    reply.setCookie(COOKIE_SESION, token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: OCHO_HORAS,
    });
    return perfil;
  }

  @Get('perfil')
  @UseGuards(SesionGuard)
  perfil(@Contexto() ctx: ContextoInstitucion) {
    return this.identidad.obtenerPerfil(ctx.usuario.id);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SesionGuard)
  async logout(@Contexto() ctx: ContextoInstitucion, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.bitacora.registrar({ idUsuario: ctx.usuario.id, idInstitucion: ctx.institucion.id, accion: 'LOGOUT', ip: ctx.ip });
    reply.clearCookie(COOKIE_SESION, { path: '/' });
    return { ok: true };
  }
}

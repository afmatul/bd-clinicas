import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import type { Env } from './config/env.js';
import type { Conexiones } from './infrastructure/conexiones.js';
import { RegistroDeAdaptadores } from './infrastructure/registro-adaptadores.js';
import { COOKIE_SESION } from './http/contexto.js';
import { registrarManejoDeErrores } from './http/errores.js';
import { BitacoraPlataforma } from './modules/auditoria/adapters/bitacora-plataforma.js';
import { crearAuditoria } from './modules/auditoria/application/registrar-en-bitacora.js';
import { InstitucionRepositoryPlataforma, UsuarioRepositoryPlataforma } from './modules/identidad/adapters/plataforma-postgres.js';
import { crearIdentidad } from './modules/identidad/application/iniciar-sesion.js';
import { rutasIdentidad } from './modules/identidad/adapters/http/rutas.js';
import type { Institucion } from './modules/identidad/ports/usuario-repository.js';
import { crearCuadroClinico } from './modules/antecedentes/application/consultar-cuadro-clinico.js';
import { crearCasosDeUsoPacientes } from './modules/pacientes/application/casos-de-uso.js';
import { rutasPacientes } from './modules/pacientes/adapters/http/rutas.js';

/** Raíz de composición: aquí, y solo aquí, se conectan puertos con adaptadores. */
export async function construirApp(env: Env, conexiones: Conexiones) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(jwt, { secret: env.JWT_SECRET, cookie: { cookieName: COOKIE_SESION, signed: false } });
  registrarManejoDeErrores(app);

  // Las instituciones cambian muy poco: se cargan al arrancar.
  const listado = await new InstitucionRepositoryPlataforma(conexiones.plataforma).listar();
  const mapa = new Map<string, Institucion>(listado.map((i) => [i.id, i]));
  const instituciones = () => mapa;

  const registro = new RegistroDeAdaptadores(conexiones);
  const bitacora = new BitacoraPlataforma(conexiones.plataforma);
  const auditoria = crearAuditoria(bitacora);
  const identidad = crearIdentidad({ usuarios: new UsuarioRepositoryPlataforma(conexiones.plataforma), instituciones, bitacora });
  const cuadroClinico = crearCuadroClinico(registro);
  const pacientes = crearCasosDeUsoPacientes({ registro, auditoria, cuadroClinico });

  app.get('/salud', async () => ({ ok: true }));
  await app.register(async (api) => {
    rutasIdentidad(api, { identidad, instituciones, bitacora });
    rutasPacientes(api, { pacientes, instituciones });
  }, { prefix: '/api' });

  return app;
}

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { AppModule } from './app.module.js';
import { ErroresFilter } from './http/errores.filter.js';
import { COOKIE_SESION } from './http/contexto.js';
import type { Env } from './config/env.js';
import { ENV } from './tokens.js';

// NestJS sobre Fastify: los plugins de cookie y JWT de Fastify se registran en la instancia de Nest.
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
const env = app.get<Env>(ENV);

await app.register(cookie);
await app.register(jwt, { secret: env.JWT_SECRET, cookie: { cookieName: COOKIE_SESION, signed: false } });
app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
app.setGlobalPrefix('api', { exclude: ['salud'] });
app.useGlobalFilters(new ErroresFilter());
app.enableShutdownHooks();

await app.listen(env.API_PORT, '0.0.0.0');

import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { ErrorDeDominio } from '../shared/errores.js';

const ESTADO: Record<string, number> = {
  NO_AUTORIZADO: 401,
  PROHIBIDO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  REGLA_DE_NEGOCIO: 422,
};

/** Traduce errores de dominio y de validación a respuestas con mensaje para el usuario. */
export function registrarManejoDeErrores(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof ErrorDeDominio) {
      return reply.status(ESTADO[err.codigo] ?? 400).send({ codigo: err.codigo, mensaje: err.message });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({
        codigo: 'VALIDACION',
        mensaje: 'Revise los campos marcados.',
        campos: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
      });
    }
    req.log.error(err);
    return reply.status(500).send({ codigo: 'ERROR_INTERNO', mensaje: 'No pudimos completar la operación. Intente de nuevo en unos minutos.' });
  });
}

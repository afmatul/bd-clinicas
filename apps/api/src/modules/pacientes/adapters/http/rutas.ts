import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BuscarPacientesQuery, DarDeBajaInput, RegistrarPacienteInput } from '@red-clinica/shared';
import { requiereSesion } from '../../../../http/contexto.js';
import type { Institucion } from '../../../identidad/ports/usuario-repository.js';
import type { CasosDeUsoPacientes } from '../../application/casos-de-uso.js';

const Params = z.object({ id: z.string().min(1) });

/** Controlador HTTP: traduce JSON ↔ casos de uso. El mismo JSON para los cuatro motores. */
export function rutasPacientes(app: FastifyInstance, deps: { pacientes: CasosDeUsoPacientes; instituciones: () => Map<string, Institucion> }) {
  const preHandler = requiereSesion(deps.instituciones, 'pacientes');

  app.get('/pacientes', { preHandler }, async (req) =>
    deps.pacientes.buscar(req.contexto, BuscarPacientesQuery.parse(req.query)),
  );
  app.get('/pacientes/:id', { preHandler }, async (req) =>
    deps.pacientes.obtenerFicha(req.contexto, Params.parse(req.params).id),
  );
  app.post('/pacientes', { preHandler }, async (req, reply) => {
    const r = await deps.pacientes.registrar(req.contexto, RegistrarPacienteInput.parse(req.body));
    return reply.status(201).send(r);
  });
  app.post('/pacientes/:id/baja', { preHandler }, async (req, reply) => {
    await deps.pacientes.darDeBaja(req.contexto, Params.parse(req.params).id, DarDeBajaInput.parse(req.body));
    return reply.status(204).send();
  });
}

import { Module } from '@nestjs/common';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import { AUDITORIA, CONEXIONES, CONSULTAS_AUDITORIA } from '../../tokens.js';
import type { Auditoria } from './application/registrar-en-bitacora.js';
import { crearConsultasAuditoria } from './application/consultar-bitacora.js';
import { ConsultaBitacoraPlataforma } from './adapters/consulta-bitacora-plataforma.js';
import { AuditoriaController } from './adapters/http/auditoria.controller.js';

/**
 * Registrar en la bitácora es global (AUDITORIA, en InfraestructuraModule) porque lo usan todos los módulos.
 * Este módulo agrega la lectura: la bitácora vive en la base plataforma, igual para los cuatro motores.
 */
@Module({
  controllers: [AuditoriaController],
  providers: [
    {
      provide: CONSULTAS_AUDITORIA,
      useFactory: (c: Conexiones, auditoria: Auditoria) =>
        crearConsultasAuditoria({ consulta: new ConsultaBitacoraPlataforma(c.plataforma), auditoria }),
      inject: [CONEXIONES, AUDITORIA],
    },
  ],
})
export class AuditoriaModule {}

import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { AGENDA, AUDITORIA, REGISTRO } from '../../tokens.js';
import { crearCasosDeUsoAgenda } from './application/casos-de-uso.js';
import { AgendaController } from './adapters/http/agenda.controller.js';

/** Exporta AGENDA: atencion (y odontologia) cambian el estado de las citas por aquí, no por sus tablas. */
@Module({
  controllers: [AgendaController],
  providers: [
    {
      provide: AGENDA,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria) => crearCasosDeUsoAgenda({ registro, auditoria }),
      inject: [REGISTRO, AUDITORIA],
    },
  ],
  exports: [AGENDA],
})
export class AgendaModule {}

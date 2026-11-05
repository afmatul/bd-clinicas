import { Module } from '@nestjs/common';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import type { CasosDeUsoAgenda } from '../agenda/application/casos-de-uso.js';
import { AgendaModule } from '../agenda/agenda.module.js';
import { AGENDA, AUDITORIA, CONEXIONES, ODONTOLOGIA } from '../../tokens.js';
import { crearCasosDeUsoOdontologia } from './application/casos-de-uso.js';
import { RegistroOdontologia } from './odontologia.registro.js';
import { OdontologiaController } from './adapters/http/odontologia.controller.js';

@Module({
  // Recepción agenda por la capa application de agenda: la regla del choque de horario vive allí.
  imports: [AgendaModule],
  controllers: [OdontologiaController],
  providers: [
    {
      provide: ODONTOLOGIA,
      useFactory: (c: Conexiones, auditoria: Auditoria, agenda: CasosDeUsoAgenda) =>
        crearCasosDeUsoOdontologia({ registro: new RegistroOdontologia(c), auditoria, agenda }),
      inject: [CONEXIONES, AUDITORIA, AGENDA],
    },
  ],
})
export class OdontologiaModule {}

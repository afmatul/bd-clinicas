import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import type { CasosDeUsoAgenda } from '../agenda/application/casos-de-uso.js';
import type { CasosDeUsoPrescripcion } from '../prescripcion/application/casos-de-uso.js';
import { AgendaModule } from '../agenda/agenda.module.js';
import { PrescripcionModule } from '../prescripcion/prescripcion.module.js';
import { AGENDA, ATENCION, AUDITORIA, PRESCRIPCION, REGISTRO } from '../../tokens.js';
import { crearCasosDeUsoAtencion } from './application/casos-de-uso.js';
import { ConsultasController } from './adapters/http/consultas.controller.js';

@Module({
  // atencion usa agenda (estado de la cita) y prescripcion (catálogo y alergias) por su capa application.
  imports: [AgendaModule, PrescripcionModule],
  controllers: [ConsultasController],
  providers: [
    {
      provide: ATENCION,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria, agenda: CasosDeUsoAgenda, prescripcion: CasosDeUsoPrescripcion) =>
        crearCasosDeUsoAtencion({ registro, auditoria, agenda, prescripcion }),
      inject: [REGISTRO, AUDITORIA, AGENDA, PRESCRIPCION],
    },
  ],
})
export class AtencionModule {}

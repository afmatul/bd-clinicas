import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Institucion } from '../identidad/ports/usuario-repository.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { AUDITORIA, INSTITUCIONES, PERSONAL, REGISTRO } from '../../tokens.js';
import { crearCasosDeUsoPersonal } from './application/casos-de-uso.js';
import { DirectorioController, PersonalController } from './adapters/http/personal.controller.js';

@Module({
  controllers: [DirectorioController, PersonalController],
  providers: [
    {
      provide: PERSONAL,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria, instituciones: () => Map<string, Institucion>) =>
        crearCasosDeUsoPersonal({ registro, auditoria, instituciones }),
      inject: [REGISTRO, AUDITORIA, INSTITUCIONES],
    },
  ],
  // Otros módulos (agenda) pueden validar que el médico exista por esta capa application.
  exports: [PERSONAL],
})
export class PersonalModule {}

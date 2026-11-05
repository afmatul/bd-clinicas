import { Module } from '@nestjs/common';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { AUDITORIA, CONEXIONES, ODONTOLOGIA } from '../../tokens.js';
import { crearCasosDeUsoOdontologia } from './application/casos-de-uso.js';
import { RegistroOdontologia } from './odontologia.registro.js';
import { OdontologiaController } from './adapters/http/odontologia.controller.js';

@Module({
  controllers: [OdontologiaController],
  providers: [
    {
      provide: ODONTOLOGIA,
      useFactory: (c: Conexiones, auditoria: Auditoria) => crearCasosDeUsoOdontologia({ registro: new RegistroOdontologia(c), auditoria }),
      inject: [CONEXIONES, AUDITORIA],
    },
  ],
})
export class OdontologiaModule {}

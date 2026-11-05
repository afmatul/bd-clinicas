import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { ANTECEDENTES, AUDITORIA, CUADRO_CLINICO, REGISTRO } from '../../tokens.js';
import { crearCuadroClinico } from './application/consultar-cuadro-clinico.js';
import { crearCasosDeUsoAntecedentes } from './application/registrar-antecedentes.js';
import { AntecedentesController } from './adapters/http/antecedentes.controller.js';

/** Expone su capa application (CUADRO_CLINICO) a los módulos que la importan, y sus rutas de escritura. */
@Module({
  controllers: [AntecedentesController],
  providers: [
    { provide: CUADRO_CLINICO, useFactory: (r: RegistroDeAdaptadores) => crearCuadroClinico(r), inject: [REGISTRO] },
    {
      provide: ANTECEDENTES,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria) => crearCasosDeUsoAntecedentes({ registro, auditoria }),
      inject: [REGISTRO, AUDITORIA],
    },
  ],
  exports: [CUADRO_CLINICO],
})
export class AntecedentesModule {}

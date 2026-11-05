import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import type { CuadroClinico } from '../antecedentes/application/consultar-cuadro-clinico.js';
import { AntecedentesModule } from '../antecedentes/antecedentes.module.js';
import { AUDITORIA, CUADRO_CLINICO, PRESCRIPCION, REGISTRO } from '../../tokens.js';
import { crearCasosDeUsoPrescripcion } from './application/casos-de-uso.js';
import { PrescripcionController } from './adapters/http/prescripcion.controller.js';

/** Exporta PRESCRIPCION para atencion. Lee alergias por la capa application de antecedentes. */
@Module({
  imports: [AntecedentesModule],
  controllers: [PrescripcionController],
  providers: [
    {
      provide: PRESCRIPCION,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria, cuadroClinico: CuadroClinico) =>
        crearCasosDeUsoPrescripcion({ registro, auditoria, cuadroClinico }),
      inject: [REGISTRO, AUDITORIA, CUADRO_CLINICO],
    },
  ],
  exports: [PRESCRIPCION],
})
export class PrescripcionModule {}

import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import type { CuadroClinico } from '../antecedentes/application/consultar-cuadro-clinico.js';
import { AntecedentesModule } from '../antecedentes/antecedentes.module.js';
import { AUDITORIA, CUADRO_CLINICO, PACIENTES, REGISTRO } from '../../tokens.js';
import { crearCasosDeUsoPacientes } from './application/casos-de-uso.js';
import { PacientesController } from './adapters/http/pacientes.controller.js';

@Module({
  // Los módulos se hablan por su capa application: pacientes importa antecedentes, no sus tablas.
  imports: [AntecedentesModule],
  controllers: [PacientesController],
  providers: [
    {
      provide: PACIENTES,
      useFactory: (registro: RegistroDeAdaptadores, auditoria: Auditoria, cuadroClinico: CuadroClinico) =>
        crearCasosDeUsoPacientes({ registro, auditoria, cuadroClinico }),
      inject: [REGISTRO, AUDITORIA, CUADRO_CLINICO],
    },
  ],
})
export class PacientesModule {}

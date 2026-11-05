import { Module } from '@nestjs/common';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import { CUADRO_CLINICO, REGISTRO } from '../../tokens.js';
import { crearCuadroClinico } from './application/consultar-cuadro-clinico.js';

/** Expone su capa application (CUADRO_CLINICO) a los módulos que la importan. */
@Module({
  providers: [{ provide: CUADRO_CLINICO, useFactory: (r: RegistroDeAdaptadores) => crearCuadroClinico(r), inject: [REGISTRO] }],
  exports: [CUADRO_CLINICO],
})
export class AntecedentesModule {}

import { Module } from '@nestjs/common';
import type { Motor } from '@red-clinica/shared';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { NoEncontrado } from '../../shared/errores.js';
import { AUDITORIA, CONEXIONES, PEDIATRIA } from '../../tokens.js';
import { crearCasosDeUsoPediatria } from './application/casos-de-uso.js';
import { MysqlSeguimientoPediatricoRepository } from './adapters/mysql/seguimiento-pediatrico-repository.js';
import type { SeguimientoPediatricoRepository } from './ports/seguimiento-pediatrico-repository.js';
import { PediatriaController } from './adapters/http/pediatria.controller.js';

/**
 * Módulo exclusivo del Centro pediátrico. Como solo tiene adaptador MySQL, arma aquí su propio
 * mapa por motor en lugar de sumar un puerto opcional a RepositoriosInstitucion.
 */
@Module({
  controllers: [PediatriaController],
  providers: [
    {
      provide: PEDIATRIA,
      useFactory: (c: Conexiones, auditoria: Auditoria) => {
        const porMotor: Partial<Record<Motor, SeguimientoPediatricoRepository>> = {
          mysql: new MysqlSeguimientoPediatricoRepository(c.mysql),
        };
        return crearCasosDeUsoPediatria({
          auditoria,
          repo: (ctx) => {
            const r = porMotor[ctx.institucion.motor];
            if (!r) throw new NoEncontrado('La sección');
            return r;
          },
        });
      },
      inject: [CONEXIONES, AUDITORIA],
    },
  ],
})
export class PediatriaModule {}

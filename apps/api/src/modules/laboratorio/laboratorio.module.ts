import { Module } from '@nestjs/common';
import type { Motor } from '@red-clinica/shared';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { RegistroDeAdaptadores } from '../../infrastructure/registro-adaptadores.js';
import type { ContextoInstitucion } from '../../shared/contexto.js';
import { NoEncontrado } from '../../shared/errores.js';
import type { Auditoria } from '../auditoria/application/registrar-en-bitacora.js';
import { IdentidadModule } from '../identidad/identidad.module.js';
import type { crearIdentidad } from '../identidad/application/iniciar-sesion.js';
import { AUDITORIA, CONEXIONES, IDENTIDAD, REGISTRO } from '../../tokens.js';
import { MongoExamenRepository } from './adapters/mongo/examen-repository.js';
import { LaboratorioController } from './adapters/http/laboratorio.controller.js';
import { crearCasosDeUsoLaboratorio } from './application/casos-de-uso.js';
import type { ExamenRepository } from './ports/examen-repository.js';
import { LABORATORIO } from './laboratorio.tokens.js';

@Module({
  imports: [IdentidadModule],
  controllers: [LaboratorioController],
  providers: [
    {
      provide: LABORATORIO,
      useFactory: (c: Conexiones, registro: RegistroDeAdaptadores, auditoria: Auditoria, identidad: ReturnType<typeof crearIdentidad>) => {
        // Solo el Laboratorio clínico tiene este módulo, así que solo hay adaptador para MongoDB.
        // El motor se elige igual que en el RegistroDeAdaptadores: por la institución de la sesión.
        const porMotor: Partial<Record<Motor, ExamenRepository>> = { mongo: new MongoExamenRepository(c.mongo) };
        const examenes = (ctx: ContextoInstitucion) => {
          const repo = porMotor[ctx.institucion.motor];
          if (!repo) throw new NoEncontrado('La sección');
          return repo;
        };
        return crearCasosDeUsoLaboratorio({
          examenes,
          pacientes: (ctx) => registro.para(ctx).pacientes,
          auditoria,
          nombreUsuario: async (ctx) => (await identidad.obtenerPerfil(ctx.usuario.id)).usuario.nombre,
        });
      },
      inject: [CONEXIONES, REGISTRO, AUDITORIA, IDENTIDAD],
    },
  ],
})
export class LaboratorioModule {}

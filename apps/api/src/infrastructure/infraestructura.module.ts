import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { cargarEnv, type Env } from '../config/env.js';
import { abrirConexiones, type Conexiones } from './conexiones.js';
import { RegistroDeAdaptadores } from './registro-adaptadores.js';
import { InstitucionRepositoryPlataforma } from '../modules/identidad/adapters/plataforma-postgres.js';
import type { Institucion } from '../modules/identidad/ports/usuario-repository.js';
import { BitacoraPlataforma } from '../modules/auditoria/adapters/bitacora-plataforma.js';
import { crearAuditoria } from '../modules/auditoria/application/registrar-en-bitacora.js';
import type { Bitacora } from '../modules/auditoria/ports/bitacora.js';
import { AUDITORIA, BITACORA, CONEXIONES, ENV, INSTITUCIONES, REGISTRO } from '../tokens.js';

/**
 * Infraestructura compartida por todos los módulos: conexiones (abiertas una vez al arrancar),
 * registro de adaptadores, instituciones y bitácora. Es global para no repetir imports.
 */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: cargarEnv },
    { provide: CONEXIONES, useFactory: (env: Env) => abrirConexiones(env), inject: [ENV] },
    { provide: REGISTRO, useFactory: (c: Conexiones) => new RegistroDeAdaptadores(c), inject: [CONEXIONES] },
    {
      // Las instituciones cambian muy poco: se cargan al arrancar.
      provide: INSTITUCIONES,
      useFactory: async (c: Conexiones) => {
        const lista = await new InstitucionRepositoryPlataforma(c.plataforma).listar();
        const mapa = new Map<string, Institucion>(lista.map((i) => [i.id, i]));
        return () => mapa;
      },
      inject: [CONEXIONES],
    },
    { provide: BITACORA, useFactory: (c: Conexiones) => new BitacoraPlataforma(c.plataforma), inject: [CONEXIONES] },
    { provide: AUDITORIA, useFactory: (b: Bitacora) => crearAuditoria(b), inject: [BITACORA] },
  ],
  exports: [ENV, CONEXIONES, REGISTRO, INSTITUCIONES, BITACORA, AUDITORIA],
})
export class InfraestructuraModule implements OnApplicationShutdown {
  constructor(@Inject(CONEXIONES) private readonly conexiones: Conexiones) {}

  async onApplicationShutdown() {
    await this.conexiones.cerrar();
  }
}

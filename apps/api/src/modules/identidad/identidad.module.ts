import { Module } from '@nestjs/common';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { Bitacora } from '../auditoria/ports/bitacora.js';
import { BITACORA, CONEXIONES, IDENTIDAD, INSTITUCIONES } from '../../tokens.js';
import { UsuarioRepositoryPlataforma } from './adapters/plataforma-postgres.js';
import { AuthController } from './adapters/http/auth.controller.js';
import { crearIdentidad } from './application/iniciar-sesion.js';
import type { Institucion } from './ports/usuario-repository.js';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: IDENTIDAD,
      useFactory: (c: Conexiones, instituciones: () => Map<string, Institucion>, bitacora: Bitacora) =>
        crearIdentidad({ usuarios: new UsuarioRepositoryPlataforma(c.plataforma), instituciones, bitacora }),
      inject: [CONEXIONES, INSTITUCIONES, BITACORA],
    },
  ],
  // Otros módulos la usan para mostrar el nombre de quien firma (p. ej. el laboratorio al validar).
  exports: [IDENTIDAD],
})
export class IdentidadModule {}

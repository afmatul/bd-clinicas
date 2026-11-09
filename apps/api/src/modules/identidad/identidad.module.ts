import { Module } from '@nestjs/common';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { Bitacora } from '../auditoria/ports/bitacora.js';
import type { ResolverMedicoAdmin } from '../../infrastructure/medico-demostracion.js';
import { BITACORA, CONEXIONES, IDENTIDAD, INSTITUCIONES, MEDICO_ADMIN } from '../../tokens.js';
import { UsuarioRepositoryPlataforma } from './adapters/plataforma-postgres.js';
import { AuthController } from './adapters/http/auth.controller.js';
import { crearIdentidad } from './application/iniciar-sesion.js';
import type { Institucion } from './ports/usuario-repository.js';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: IDENTIDAD,
      useFactory: (c: Conexiones, instituciones: () => Map<string, Institucion>, bitacora: Bitacora, medicoAdmin: ResolverMedicoAdmin) =>
        crearIdentidad({ usuarios: new UsuarioRepositoryPlataforma(c.plataforma), instituciones, bitacora, medicoAdmin }),
      inject: [CONEXIONES, INSTITUCIONES, BITACORA, MEDICO_ADMIN],
    },
  ],
  // Otros módulos la usan para mostrar el nombre de quien firma (p. ej. el laboratorio al validar).
  exports: [IDENTIDAD],
})
export class IdentidadModule {}

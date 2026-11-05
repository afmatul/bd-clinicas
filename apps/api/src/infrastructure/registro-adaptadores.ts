import type { Motor } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../shared/contexto.js';
import type { Conexiones } from './conexiones.js';
import type { PacienteRepository } from '../modules/pacientes/ports/paciente-repository.js';
import type { AntecedenteRepository } from '../modules/antecedentes/ports/antecedente-repository.js';
import { PostgresPacienteRepository } from '../modules/pacientes/adapters/postgres/paciente-repository.js';
import { MysqlPacienteRepository } from '../modules/pacientes/adapters/mysql/paciente-repository.js';
import { MongoPacienteRepository } from '../modules/pacientes/adapters/mongo/paciente-repository.js';
import { CouchPacienteRepository } from '../modules/pacientes/adapters/couch/paciente-repository.js';
import { PostgresAntecedenteRepository } from '../modules/antecedentes/adapters/postgres/antecedente-repository.js';
import { MysqlAntecedenteRepository } from '../modules/antecedentes/adapters/mysql/antecedente-repository.js';
import { MongoAntecedenteRepository } from '../modules/antecedentes/adapters/mongo/antecedente-repository.js';
import { CouchAntecedenteRepository } from '../modules/antecedentes/adapters/couch/antecedente-repository.js';

/**
 * Juego de repositorios de una institución. Al agregar un módulo, sume aquí su puerto
 * y su adaptador en cada motor; los casos de uso no cambian.
 */
export interface RepositoriosInstitucion {
  pacientes: PacienteRepository;
  antecedentes: AntecedenteRepository;
  // agenda: CitaRepository; atencion: ConsultaRepository; prescripcion: RecetaRepository; …
}

/**
 * Elige el adaptador por el motor de la institución del usuario (que viene en el JWT).
 * Cambiar el motor de una institución es cambiar el campo motor en la base plataforma.
 */
export class RegistroDeAdaptadores {
  private readonly porMotor: Record<Motor, RepositoriosInstitucion>;

  constructor(c: Conexiones) {
    this.porMotor = {
      postgres: { pacientes: new PostgresPacienteRepository(c.postgres), antecedentes: new PostgresAntecedenteRepository(c.postgres) },
      mysql: { pacientes: new MysqlPacienteRepository(c.mysql), antecedentes: new MysqlAntecedenteRepository(c.mysql) },
      mongo: { pacientes: new MongoPacienteRepository(c.mongo), antecedentes: new MongoAntecedenteRepository(c.mongo) },
      couch: { pacientes: new CouchPacienteRepository(c.couch), antecedentes: new CouchAntecedenteRepository(c.couch) },
    };
  }

  para(ctx: ContextoInstitucion): RepositoriosInstitucion {
    return this.porMotor[ctx.institucion.motor];
  }
}

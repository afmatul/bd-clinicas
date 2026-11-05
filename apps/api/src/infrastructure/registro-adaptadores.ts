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
import type { PersonalRepository } from '../modules/personal/ports/personal-repository.js';
import { PostgresPersonalRepository } from '../modules/personal/adapters/postgres/personal-repository.js';
import { MysqlPersonalRepository } from '../modules/personal/adapters/mysql/personal-repository.js';
import { MongoPersonalRepository } from '../modules/personal/adapters/mongo/personal-repository.js';
import { CouchPersonalRepository } from '../modules/personal/adapters/couch/personal-repository.js';

/**
 * Juego de repositorios de una institución. Al agregar un módulo, sume aquí su puerto
 * y su adaptador en cada motor; los casos de uso no cambian.
 */
export interface RepositoriosInstitucion {
  pacientes: PacienteRepository;
  antecedentes: AntecedenteRepository;
  personal: PersonalRepository;
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
      postgres: {
        pacientes: new PostgresPacienteRepository(c.postgres),
        antecedentes: new PostgresAntecedenteRepository(c.postgres),
        personal: new PostgresPersonalRepository(c.postgres),
      },
      mysql: {
        pacientes: new MysqlPacienteRepository(c.mysql),
        antecedentes: new MysqlAntecedenteRepository(c.mysql),
        personal: new MysqlPersonalRepository(c.mysql),
      },
      mongo: {
        pacientes: new MongoPacienteRepository(c.mongo),
        antecedentes: new MongoAntecedenteRepository(c.mongo),
        personal: new MongoPersonalRepository(c.mongo),
      },
      couch: {
        pacientes: new CouchPacienteRepository(c.couch),
        antecedentes: new CouchAntecedenteRepository(c.couch),
        personal: new CouchPersonalRepository(c.couch),
      },
    };
  }

  /** Solo lee la institución: el directorio público de personal lo usa sin usuario en sesión. */
  para(ctx: Pick<ContextoInstitucion, 'institucion'>): RepositoriosInstitucion {
    return this.porMotor[ctx.institucion.motor];
  }
}

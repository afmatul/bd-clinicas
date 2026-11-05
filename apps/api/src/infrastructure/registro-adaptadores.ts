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
import type { CitaRepository } from '../modules/agenda/ports/cita-repository.js';
import type { ConsultaRepository } from '../modules/atencion/ports/consulta-repository.js';
import type { MedicamentoRepository, RecetaRepository } from '../modules/prescripcion/ports/prescripcion-repository.js';
import { PostgresCitaRepository } from '../modules/agenda/adapters/postgres/cita-repository.js';
import { MysqlCitaRepository } from '../modules/agenda/adapters/mysql/cita-repository.js';
import { MongoCitaRepository } from '../modules/agenda/adapters/mongo/cita-repository.js';
import { CouchCitaRepository } from '../modules/agenda/adapters/couch/cita-repository.js';
import { PostgresConsultaRepository } from '../modules/atencion/adapters/postgres/consulta-repository.js';
import { MysqlConsultaRepository } from '../modules/atencion/adapters/mysql/consulta-repository.js';
import { MongoConsultaRepository } from '../modules/atencion/adapters/mongo/consulta-repository.js';
import { CouchConsultaRepository } from '../modules/atencion/adapters/couch/consulta-repository.js';
import { PostgresMedicamentoRepository, PostgresRecetaRepository } from '../modules/prescripcion/adapters/postgres/prescripcion-repository.js';
import { MysqlMedicamentoRepository, MysqlRecetaRepository } from '../modules/prescripcion/adapters/mysql/prescripcion-repository.js';
import { MongoMedicamentoRepository, MongoRecetaRepository } from '../modules/prescripcion/adapters/mongo/prescripcion-repository.js';
import { CouchMedicamentoRepository, CouchRecetaRepository } from '../modules/prescripcion/adapters/couch/prescripcion-repository.js';

/**
 * Juego de repositorios de una institución. Al agregar un módulo, sume aquí su puerto
 * y su adaptador en cada motor; los casos de uso no cambian.
 */
export interface RepositoriosInstitucion {
  pacientes: PacienteRepository;
  antecedentes: AntecedenteRepository;
  agenda: CitaRepository;
  atencion: ConsultaRepository;
  medicamentos: MedicamentoRepository;
  recetas: RecetaRepository;
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
        pacientes: new PostgresPacienteRepository(c.postgres), antecedentes: new PostgresAntecedenteRepository(c.postgres),
        agenda: new PostgresCitaRepository(c.postgres), atencion: new PostgresConsultaRepository(c.postgres),
        medicamentos: new PostgresMedicamentoRepository(c.postgres), recetas: new PostgresRecetaRepository(c.postgres),
      },
      mysql: {
        pacientes: new MysqlPacienteRepository(c.mysql), antecedentes: new MysqlAntecedenteRepository(c.mysql),
        agenda: new MysqlCitaRepository(c.mysql), atencion: new MysqlConsultaRepository(c.mysql),
        medicamentos: new MysqlMedicamentoRepository(c.mysql), recetas: new MysqlRecetaRepository(c.mysql),
      },
      mongo: {
        pacientes: new MongoPacienteRepository(c.mongo), antecedentes: new MongoAntecedenteRepository(c.mongo),
        agenda: new MongoCitaRepository(c.mongo), atencion: new MongoConsultaRepository(c.mongo),
        medicamentos: new MongoMedicamentoRepository(c.mongo), recetas: new MongoRecetaRepository(c.mongo),
      },
      couch: {
        pacientes: new CouchPacienteRepository(c.couch), antecedentes: new CouchAntecedenteRepository(c.couch),
        agenda: new CouchCitaRepository(c.couch), atencion: new CouchConsultaRepository(c.couch),
        medicamentos: new CouchMedicamentoRepository(c.couch), recetas: new CouchRecetaRepository(c.couch),
      },
    };
  }

  para(ctx: ContextoInstitucion): RepositoriosInstitucion {
    return this.porMotor[ctx.institucion.motor];
  }
}

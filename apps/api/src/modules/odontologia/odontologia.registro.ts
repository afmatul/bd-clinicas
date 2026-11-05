import type { Motor } from '@red-clinica/shared';
import type { Conexiones } from '../../infrastructure/conexiones.js';
import type { ContextoInstitucion } from '../../shared/contexto.js';
import { NoEncontrado } from '../../shared/errores.js';
import type { OdontogramaRepository } from './ports/odontograma-repository.js';
import type { RecepcionRepository } from './ports/recepcion-repository.js';
import { CouchOdontogramaRepository } from './adapters/couch/odontograma-repository.js';
import { CouchRecepcionRepository } from './adapters/couch/recepcion-repository.js';

export interface RepositoriosOdontologia {
  odontograma: OdontogramaRepository;
  recepcion: RecepcionRepository;
}

/**
 * Registro de adaptadores propio del módulo: odontología solo existe en la Clínica odontológica,
 * así que solo hay adaptador para CouchDB. Si mañana otra institución habilitara el módulo,
 * bastaría con sumar aquí su motor.
 */
export class RegistroOdontologia {
  private readonly porMotor: Partial<Record<Motor, RepositoriosOdontologia>>;

  constructor(c: Pick<Conexiones, 'couch'>) {
    this.porMotor = {
      couch: { odontograma: new CouchOdontogramaRepository(c.couch), recepcion: new CouchRecepcionRepository(c.couch) },
    };
  }

  para(ctx: ContextoInstitucion): RepositoriosOdontologia {
    const r = this.porMotor[ctx.institucion.motor];
    if (!r) throw new NoEncontrado('La sección');
    return r;
  }
}

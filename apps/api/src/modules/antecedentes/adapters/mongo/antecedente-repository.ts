import { ObjectId, type Collection, type Db } from 'mongodb';
import type { PacienteDoc } from '../../../pacientes/adapters/mongo/paciente-repository.js';
import type { AntecedenteRepository } from '../../ports/antecedente-repository.js';

/** En Mongo las alergias y antecedentes viven embebidos en el documento del paciente. */
export class MongoAntecedenteRepository implements AntecedenteRepository {
  private readonly col: Collection<PacienteDoc>;
  constructor(db: Db) {
    this.col = db.collection<PacienteDoc>('pacientes');
  }

  private async paciente(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return this.col.findOne({ _id: new ObjectId(id) }, { projection: { alergias: 1, antecedentes: 1 } });
  }

  async listarAlergias(idPaciente: string) {
    const p = await this.paciente(idPaciente);
    return (p?.alergias ?? []).map((a) => ({
      id: a._id.toHexString(), tipo: a.tipo, descripcion: a.descripcion,
      severidad: a.severidad as 'LEVE' | 'MODERADA' | 'SEVERA' | null,
      idMedicamento: a.medicamento_id ? a.medicamento_id.toHexString() : null,
    }));
  }

  async listarAntecedentes(idPaciente: string) {
    const p = await this.paciente(idPaciente);
    return (p?.antecedentes ?? []).map((a) => ({ id: a._id.toHexString(), tipo: a.tipo, descripcion: a.descripcion }));
  }
}

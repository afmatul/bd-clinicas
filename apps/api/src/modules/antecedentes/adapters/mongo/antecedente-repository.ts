import { ObjectId, type Collection, type Db } from 'mongodb';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import { NoEncontrado } from '../../../../shared/errores.js';
import type { PacienteDoc } from '../../../pacientes/adapters/mongo/paciente-repository.js';
import type { AntecedenteRepository } from '../../ports/antecedente-repository.js';

/** En Mongo las alergias y antecedentes viven embebidos en el documento del paciente. */
export class MongoAntecedenteRepository implements AntecedenteRepository {
  private readonly col: Collection<PacienteDoc>;
  constructor(private readonly db: Db) {
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

  /** $push sobre el documento del paciente: atómico en Mongo. matchedCount 0 = el paciente no existe. */
  async registrarAlergia(idPaciente: string, a: RegistrarAlergiaInput) {
    if (!ObjectId.isValid(idPaciente)) return null;
    let medicamento: ObjectId | null = null;
    if (a.idMedicamento) {
      if (!ObjectId.isValid(a.idMedicamento)) throw new NoEncontrado('El medicamento');
      medicamento = new ObjectId(a.idMedicamento);
      const existe = await this.db.collection('medicamentos').countDocuments({ _id: medicamento }, { limit: 1 });
      if (!existe) throw new NoEncontrado('El medicamento');
    }
    const _id = new ObjectId();
    const r = await this.col.updateOne(
      { _id: new ObjectId(idPaciente) },
      { $push: { alergias: { _id, tipo: a.tipo, descripcion: a.descripcion ?? null, severidad: a.severidad, medicamento_id: medicamento } } },
    );
    return r.matchedCount ? _id.toHexString() : null;
  }

  async registrarAntecedente(idPaciente: string, a: RegistrarAntecedenteInput) {
    if (!ObjectId.isValid(idPaciente)) return null;
    const _id = new ObjectId();
    const r = await this.col.updateOne(
      { _id: new ObjectId(idPaciente) },
      { $push: { antecedentes: { _id, tipo: a.tipo, descripcion: a.descripcion ?? null } } },
    );
    return r.matchedCount ? _id.toHexString() : null;
  }
}

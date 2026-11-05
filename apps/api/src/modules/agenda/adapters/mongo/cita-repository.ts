import { MongoServerError, ObjectId, type Collection, type Db, type Document, type Filter } from 'mongodb';
import type { CitaDetalle, EstadoCita } from '@red-clinica/shared';
import { Conflicto } from '../../../../shared/errores.js';
import type { CitaRepository, NuevaCita } from '../../ports/cita-repository.js';

export interface CitaDoc {
  _id: ObjectId;
  paciente_id: ObjectId;
  medico_id: string;
  fecha: string; // yyyy-mm-dd: la agenda se consulta por día, sin zonas horarias de por medio
  hora: string; // HH:mm
  motivo: string | null;
  estado: EstadoCita;
  creada_en: Date;
}

/**
 * Laboratorio clínico · MongoDB. Colección citas con referencia al paciente; el nombre se trae
 * con $lookup. El choque de horario lo impide el índice único parcial { medico_id, fecha, hora }
 * que solo indexa citas activas (error 11000).
 */
export class MongoCitaRepository implements CitaRepository {
  private readonly col: Collection<CitaDoc>;
  constructor(db: Db) {
    this.col = db.collection<CitaDoc>('citas');
  }

  private async buscar(filtro: Filter<CitaDoc>, limite = 0): Promise<CitaDetalle[]> {
    const pipeline: Document[] = [{ $match: filtro }, { $sort: { fecha: 1, hora: 1, _id: 1 } }];
    if (limite) pipeline.push({ $limit: limite });
    pipeline.push(
      { $lookup: { from: 'pacientes', localField: 'paciente_id', foreignField: '_id', as: 'p', pipeline: [{ $project: { nombres: 1, apellidos: 1, cui: 1 } }] } },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
    );
    const docs = await this.col.aggregate<CitaDoc & { p?: { nombres: string; apellidos: string; cui: string | null } }>(pipeline).toArray();
    return docs.map((d) => ({
      id: d._id.toHexString(),
      idPaciente: d.paciente_id.toHexString(),
      paciente: { nombres: d.p?.nombres ?? '—', apellidos: d.p?.apellidos ?? '', cui: d.p?.cui ?? null },
      idMedico: d.medico_id,
      idEspecialidad: null,
      fecha: d.fecha,
      hora: d.hora,
      motivo: d.motivo,
      estado: d.estado,
    }));
  }

  delMedico(idMedico: string, desde: string, hasta: string) {
    return this.buscar({ medico_id: idMedico, fecha: { $gte: desde, $lte: hasta } });
  }

  proximasDelPaciente(idPaciente: string, desde: string) {
    if (!ObjectId.isValid(idPaciente)) return Promise.resolve([]);
    return this.buscar({ paciente_id: new ObjectId(idPaciente), fecha: { $gte: desde }, estado: { $in: ['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA'] } }, 10);
  }

  async obtener(id: string) {
    if (!ObjectId.isValid(id)) return null;
    return (await this.buscar({ _id: new ObjectId(id) }))[0] ?? null;
  }

  async agendar(c: NuevaCita) {
    const _id = new ObjectId();
    try {
      await this.col.insertOne({
        _id, paciente_id: new ObjectId(c.idPaciente), medico_id: c.idMedico, fecha: c.fecha, hora: c.hora,
        motivo: c.motivo, estado: 'PROGRAMADA', creada_en: new Date(),
      });
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new Conflicto(`El médico ya tiene una cita el ${c.fecha} a las ${c.hora}. Elija otro horario.`);
      }
      throw err;
    }
    return _id.toHexString();
  }

  /** updateOne con el estado actual en el filtro: atómico sobre el documento. */
  async cambiarEstado(id: string, desde: EstadoCita[], a: EstadoCita) {
    try {
      const r = await this.col.updateOne({ _id: new ObjectId(id), estado: { $in: desde } }, { $set: { estado: a } });
      return r.modifiedCount > 0;
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) throw new Conflicto('Ese horario ya lo ocupa otra cita.');
      throw err;
    }
  }

  inasistencias(desde: string, hasta: string) {
    return this.buscar({ estado: 'NO_ASISTIO', fecha: { $gte: desde, $lte: hasta } });
  }
}

import { ObjectId, type Collection, type Db } from 'mongodb';
import type { CierreDeConsulta, ConsultaRepository, NuevaConsulta } from '../../ports/consulta-repository.js';
import { aConsultaDetalle, camposDeCierre, type CamposConsulta } from '../documento.js';

export interface ConsultaDoc extends CamposConsulta {
  _id: ObjectId;
  paciente_id: ObjectId;
  cita_id: ObjectId | null;
}

/**
 * Laboratorio clínico · MongoDB. La consulta es un documento con diagnósticos, tratamientos y
 * recetas embebidos: cerrarla es un solo updateOne con filtro cerrada: false (atómico por documento,
 * sin transacciones multi-documento y sin doble cierre).
 */
export class MongoConsultaRepository implements ConsultaRepository {
  private readonly col: Collection<ConsultaDoc>;
  constructor(db: Db) {
    this.col = db.collection<ConsultaDoc>('consultas');
  }

  private aDetalle = (d: ConsultaDoc) =>
    aConsultaDetalle(d._id.toHexString(), d.paciente_id.toHexString(), d.cita_id ? d.cita_id.toHexString() : null, d);

  async abrir(d: NuevaConsulta) {
    const _id = new ObjectId();
    await this.col.insertOne({
      _id, paciente_id: new ObjectId(d.idPaciente), cita_id: d.idCita ? new ObjectId(d.idCita) : null,
      medico_id: d.idMedico, fecha: d.fecha, hora: d.hora, motivo_consulta: d.motivo, historia_enfermedad_actual: null,
      notas_evolucion: null, observaciones: null, peso_kg: null, talla_cm: null, signos_vitales: null, diagnosticos: [],
      cerrada: false, cerrada_en: null,
    });
    return _id.toHexString();
  }

  async obtener(id: string) {
    if (!ObjectId.isValid(id)) return null;
    const d = await this.col.findOne({ _id: new ObjectId(id) });
    return d ? this.aDetalle(d) : null;
  }

  async abiertaDe(idPaciente: string, idMedico: string) {
    if (!ObjectId.isValid(idPaciente)) return null;
    const d = await this.col.findOne(
      { paciente_id: new ObjectId(idPaciente), medico_id: idMedico, cerrada: { $ne: true } },
      { sort: { fecha: -1, hora: -1 } },
    );
    return d ? this.aDetalle(d) : null;
  }

  async guardarBorrador(id: string, d: { motivo?: string; historiaEnfermedadActual?: string }) {
    const set: Partial<ConsultaDoc> = {};
    if (d.motivo !== undefined) set.motivo_consulta = d.motivo;
    if (d.historiaEnfermedadActual !== undefined) set.historia_enfermedad_actual = d.historiaEnfermedadActual;
    if (Object.keys(set).length) await this.col.updateOne({ _id: new ObjectId(id), cerrada: { $ne: true } }, { $set: set });
  }

  async cerrar(id: string, x: CierreDeConsulta) {
    const r = await this.col.updateOne(
      { _id: new ObjectId(id), cerrada: { $ne: true } },
      { $set: camposDeCierre(x, () => new ObjectId().toHexString()) },
    );
    return r.modifiedCount > 0;
  }

  async historial(idPaciente: string) {
    if (!ObjectId.isValid(idPaciente)) return [];
    const docs = await this.col.find({ paciente_id: new ObjectId(idPaciente) }).sort({ fecha: -1, hora: -1, _id: -1 }).toArray();
    return docs.map(this.aDetalle);
  }
}

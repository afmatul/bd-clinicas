import { randomUUID } from 'node:crypto';
import type { DocumentScope } from 'nano';
import type { CierreDeConsulta, ConsultaRepository, NuevaConsulta } from '../../ports/consulta-repository.js';
import { aConsultaDetalle, camposDeCierre, type CamposConsulta } from '../documento.js';

export interface ConsultaCouch extends CamposConsulta {
  _id: string; // consulta:<uuid>
  _rev?: string;
  type: 'consulta';
  paciente_id: string;
  cita_id: string | null;
  /** Campos de otros módulos (p. ej. odontograma_cambios de odontologia): se conservan al reescribir. */
  [extra: string]: unknown;
}

const PREFIJO = 'consulta:';

/**
 * Clínica odontológica · CouchDB. Un documento por consulta con todo embebido; el cierre es una
 * sola escritura con _rev (si alguien la cambió, 409 y se reintenta sobre la versión nueva). El
 * design doc rechaza editar una consulta cerrada.
 */
export class CouchConsultaRepository implements ConsultaRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  private aDetalle = (d: ConsultaCouch) => aConsultaDetalle(d._id.slice(PREFIJO.length), d.paciente_id, d.cita_id ?? null, d);

  private async leer(id: string): Promise<ConsultaCouch | null> {
    try {
      return (await this.db.get(PREFIJO + id)) as unknown as ConsultaCouch;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }

  async abrir(d: NuevaConsulta) {
    const id = randomUUID();
    const doc: ConsultaCouch = {
      _id: PREFIJO + id, type: 'consulta', paciente_id: d.idPaciente, cita_id: d.idCita, medico_id: d.idMedico,
      fecha: d.fecha, hora: d.hora, motivo_consulta: d.motivo, historia_enfermedad_actual: null, notas_evolucion: null,
      observaciones: null, peso_kg: null, talla_cm: null, signos_vitales: null, diagnosticos: [], cerrada: false, cerrada_en: null,
    };
    await this.db.insert(doc as never);
    return id;
  }

  async obtener(id: string) {
    const d = await this.leer(id);
    return d ? this.aDetalle(d) : null;
  }

  async abiertaDe(idPaciente: string, idMedico: string) {
    const r = await this.db.find({ selector: { type: 'consulta', paciente_id: idPaciente, medico_id: idMedico, cerrada: false }, limit: 50 });
    const docs = (r.docs as unknown as ConsultaCouch[]).sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`));
    return docs[0] ? this.aDetalle(docs[0]) : null;
  }

  private async reescribir(id: string, cambios: (d: ConsultaCouch) => Partial<ConsultaCouch> | null): Promise<boolean> {
    for (let intento = 0; intento < 2; intento++) {
      const d = await this.leer(id);
      if (!d || d.cerrada) return false;
      const c = cambios(d);
      if (!c) return false;
      try {
        await this.db.insert({ ...d, ...c } as never);
        return true;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode !== 409 || intento === 1) throw err;
      }
    }
    return false;
  }

  async guardarBorrador(id: string, d: { motivo?: string; historiaEnfermedadActual?: string }) {
    await this.reescribir(id, () => ({
      ...(d.motivo !== undefined ? { motivo_consulta: d.motivo } : {}),
      ...(d.historiaEnfermedadActual !== undefined ? { historia_enfermedad_actual: d.historiaEnfermedadActual } : {}),
    }));
  }

  cerrar(id: string, x: CierreDeConsulta) {
    return this.reescribir(id, () => camposDeCierre(x, randomUUID));
  }

  async historial(idPaciente: string) {
    const r = await this.db.find({ selector: { type: 'consulta', paciente_id: idPaciente }, limit: 10_000 });
    return (r.docs as unknown as ConsultaCouch[])
      .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`))
      .map(this.aDetalle);
  }
}

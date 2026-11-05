import { randomUUID } from 'node:crypto';
import type { DocumentScope, MangoSelector } from 'nano';
import type { CitaDetalle, EstadoCita } from '@red-clinica/shared';
import { Conflicto } from '../../../../shared/errores.js';
import { esActiva } from '../../domain/cita.js';
import type { CitaRepository, NuevaCita } from '../../ports/cita-repository.js';

export interface CitaCouch {
  _id: string; // cita:<medico_id>:<yyyy-mm-dd>T<HH:mm>  (o cita:<uuid> si se archivó al reutilizar el horario)
  _rev?: string;
  type: 'cita';
  paciente_id: string;
  medico_id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: EstadoCita;
  creada_en: string;
  /** Otros módulos pueden agregar campos (p. ej. llegada_en de recepción): se leen y reescriben enteros. */
  [extra: string]: unknown;
}

const PREFIJO = 'cita:';
const estado409 = (err: unknown) => (err as { statusCode?: number }).statusCode === 409;

/**
 * Clínica odontológica · CouchDB. No hay índices únicos: el _id determinista por médico y horario
 * hace que el segundo insert del mismo horario reciba 409. Como en Couch no se borra, cuando el
 * horario lo tenía una cita cancelada (o con inasistencia) esa cita se archiva con otro _id y el
 * horario se reutiliza.
 */
export class CouchCitaRepository implements CitaRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  private async buscar(selector: MangoSelector, limite = 10_000): Promise<CitaDetalle[]> {
    const r = await this.db.find({ selector: { type: 'cita', ...selector }, limit: limite });
    const docs = (r.docs as unknown as CitaCouch[]).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
    return this.conPacientes(docs);
  }

  /** Una sola lectura de _all_docs para los nombres de todos los pacientes de la lista. */
  private async conPacientes(docs: CitaCouch[]): Promise<CitaDetalle[]> {
    const keys = [...new Set(docs.map((d) => `paciente:${d.paciente_id}`))];
    const pacientes = new Map<string, { nombres: string; apellidos: string; cui: string | null }>();
    if (keys.length) {
      const r = await this.db.fetch({ keys });
      for (const row of r.rows) {
        const doc = 'doc' in row ? (row.doc as unknown as { _id: string; nombres: string; apellidos: string; cui: string | null } | null) : null;
        if (doc) pacientes.set(doc._id.slice('paciente:'.length), doc);
      }
    }
    return docs.map((d) => {
      const p = pacientes.get(d.paciente_id);
      return {
        id: d._id.slice(PREFIJO.length),
        idPaciente: d.paciente_id,
        paciente: { nombres: p?.nombres ?? '—', apellidos: p?.apellidos ?? '', cui: p?.cui ?? null },
        idMedico: d.medico_id,
        idEspecialidad: null,
        fecha: d.fecha,
        hora: d.hora,
        motivo: d.motivo ?? null,
        estado: d.estado,
      };
    });
  }

  private async leer(id: string): Promise<CitaCouch | null> {
    try {
      return (await this.db.get(PREFIJO + id)) as unknown as CitaCouch;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }

  delMedico(idMedico: string, desde: string, hasta: string) {
    return this.buscar({ medico_id: idMedico, fecha: { $gte: desde, $lte: hasta } });
  }

  async proximasDelPaciente(idPaciente: string, desde: string) {
    const todas = await this.buscar({ paciente_id: idPaciente, fecha: { $gte: desde } });
    return todas.filter((c) => esActiva(c.estado)).slice(0, 10);
  }

  async obtener(id: string) {
    const d = await this.leer(id);
    return d ? (await this.conPacientes([d]))[0]! : null;
  }

  async agendar(c: NuevaCita) {
    const id = `${c.idMedico}:${c.fecha}T${c.hora}`;
    const doc: CitaCouch = {
      _id: PREFIJO + id, type: 'cita', paciente_id: c.idPaciente, medico_id: c.idMedico,
      fecha: c.fecha, hora: c.hora, motivo: c.motivo, estado: 'PROGRAMADA', creada_en: new Date().toISOString(),
    };
    const ocupado = () => new Conflicto(`El médico ya tiene una cita el ${c.fecha} a las ${c.hora}. Elija otro horario.`);
    try {
      await this.db.insert(doc as never);
      return id;
    } catch (err) {
      if (!estado409(err)) throw err;
    }
    // El horario tiene documento: si la cita está activa, choca; si no, se archiva y se reutiliza.
    const previa = await this.leer(id);
    if (!previa || esActiva(previa.estado)) throw ocupado();
    const { _rev, ...resto } = previa;
    await this.db.insert({ ...resto, _id: PREFIJO + randomUUID(), reemplazada_por: id } as never);
    try {
      await this.db.insert({ ...doc, _rev } as never);
    } catch (err) {
      if (estado409(err)) throw ocupado(); // otra recepcionista la tomó en ese instante
      throw err;
    }
    return id;
  }

  /** Lee el documento entero y lo reescribe con su _rev: no pierde campos de otros módulos. */
  async cambiarEstado(id: string, desde: EstadoCita[], a: EstadoCita) {
    for (let intento = 0; intento < 2; intento++) {
      const d = await this.leer(id);
      if (!d || !desde.includes(d.estado)) return false;
      try {
        await this.db.insert({ ...d, estado: a } as never);
        return true;
      } catch (err) {
        if (!estado409(err) || intento === 1) throw err;
      }
    }
    return false;
  }

  inasistencias(desde: string, hasta: string) {
    return this.buscar({ estado: 'NO_ASISTIO', fecha: { $gte: desde, $lte: hasta } });
  }
}

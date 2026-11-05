import type { DocumentScope } from 'nano';
import type { Odontograma, ProcedimientoPieza } from '@red-clinica/shared';
import type { PacienteCouch } from '../../../pacientes/adapters/couch/paciente-repository.js';
import type { OdontogramaRepository } from '../../ports/odontograma-repository.js';
import { estado, leer } from './couch.js';

interface ConsultaCouch {
  _id: string; // consulta:<uuid>
  fecha: string;
  procedimientos?: { pieza: string; procedimiento: string; caras?: string[]; estado_resultante?: string | null }[];
}

const INTENTOS = 3;

/**
 * Clínica odontológica · CouchDB. El odontograma vigente está embebido en paciente:<id>
 * (una lectura trae el expediente completo); cada guardado reescribe ese único documento
 * con su _rev, que es el control de concurrencia optimista de Couch.
 */
export class CouchOdontogramaRepository implements OdontogramaRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  async obtener(idPaciente: string) {
    const p = await leer<PacienteCouch>(this.db, `paciente:${idPaciente}`);
    return p ? ((p.odontograma ?? {}) as Odontograma) : null;
  }

  async historial(idPaciente: string): Promise<ProcedimientoPieza[]> {
    const r = await this.db.find({
      selector: { type: 'consulta', paciente_id: idPaciente, cerrada: true },
      fields: ['_id', 'fecha', 'procedimientos'],
      limit: 1000,
    });
    return (r.docs as unknown as ConsultaCouch[])
      .flatMap((c) => (c.procedimientos ?? []).map((p) => ({
        idConsulta: c._id.slice('consulta:'.length),
        fecha: c.fecha,
        pieza: String(p.pieza),
        procedimiento: p.procedimiento,
        caras: p.caras ?? [],
        estadoResultante: p.estado_resultante ?? null,
      })))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.pieza.localeCompare(b.pieza));
  }

  async actualizar(idPaciente: string, transformar: (actual: Odontograma) => Odontograma) {
    for (let intento = 1; ; intento++) {
      const p = await leer<PacienteCouch>(this.db, `paciente:${idPaciente}`);
      if (!p) return null;
      const nuevo = transformar((p.odontograma ?? {}) as Odontograma);
      try {
        await this.db.insert({ ...p, odontograma: nuevo } as never);
        return nuevo;
      } catch (err) {
        if (estado(err) !== 409 || intento === INTENTOS) throw err;
      }
    }
  }
}

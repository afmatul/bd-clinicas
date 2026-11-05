import { randomUUID } from 'node:crypto';
import type { DocumentScope } from 'nano';
import type { PacienteCouch } from '../../../pacientes/adapters/couch/paciente-repository.js';
import { Conflicto } from '../../../../shared/errores.js';
import { liberaHorario } from '../../domain/recepcion.js';
import type { Odontologo, PacienteRapido, RecepcionRepository, TurnoDatos } from '../../ports/recepcion-repository.js';
import { estado, leer } from './couch.js';

/** Documento cita (misma forma que el adaptador Couch del módulo agenda). */
interface CitaCouch {
  _id: string; // cita:<medico_id>:<yyyy-mm-dd>T<HH:mm> — determinista: dos citas en el mismo horario chocan con 409
  _rev?: string;
  type: 'cita';
  paciente_id: string;
  medico_id: string;
  fecha: string;
  hora: string;
  motivo: string | null;
  estado: TurnoDatos['estado'];
  creada_en: string;
  llegada_en?: string | null;
  reemplazada_por?: string;
}

interface PersonalCouch {
  _id: string; // personal:<id>
  type: 'personal';
  nombres: string;
  apellidos: string;
  rol?: string;
  estado?: string;
}

const CITA = 'cita:';
const idCita = (medico: string, fecha: string, hora: string) => `${CITA}${medico}:${fecha}T${hora}`;

function aTurno(c: CitaCouch): TurnoDatos {
  return {
    id: c._id.slice(CITA.length),
    idPaciente: c.paciente_id,
    idOdontologo: c.medico_id,
    fecha: c.fecha,
    hora: c.hora,
    motivo: c.motivo,
    estado: c.estado,
    llegada: c.llegada_en ?? null,
  };
}

/** Clínica odontológica · CouchDB. Recepción: turnos del día, registro rápido y llegada. */
export class CouchRecepcionRepository implements RecepcionRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  async odontologos(): Promise<Odontologo[]> {
    const r = await this.db.find({ selector: { type: 'personal', rol: 'ODONTOLOGO' }, limit: 200 });
    return (r.docs as unknown as PersonalCouch[])
      .filter((p) => p.estado !== 'BAJA' && p.estado !== 'INACTIVO')
      .map((p) => ({ id: p._id.slice('personal:'.length), nombre: `Dr. ${p.nombres} ${p.apellidos}`.trim() }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async turnosDelDia(fecha: string) {
    const r = await this.db.find({
      selector: { type: 'cita', fecha },
      use_index: 'type-fecha-hora',
      sort: [{ type: 'asc' }, { fecha: 'asc' }, { hora: 'asc' }],
      limit: 1000,
    });
    // Las copias de citas reemplazadas viven en cita:<uuid> y no ocupan horario.
    return (r.docs as unknown as CitaCouch[]).filter((c) => c._id === idCita(c.medico_id, c.fecha, c.hora)).map(aTurno);
  }

  async nombresDePacientes(ids: string[]) {
    const mapa = new Map<string, { nombres: string; apellidos: string }>();
    if (!ids.length) return mapa;
    // Una sola petición para todos los expedientes del día.
    const r = await this.db.fetch({ keys: [...new Set(ids)].map((id) => `paciente:${id}`) });
    for (const fila of r.rows) {
      if ('doc' in fila && fila.doc) {
        const p = fila.doc as unknown as PacienteCouch;
        mapa.set(p._id.slice('paciente:'.length), { nombres: p.nombres, apellidos: p.apellidos });
      }
    }
    return mapa;
  }

  /** Registro rápido: lo mínimo para atender hoy; registro_completo:false avisa que falta completar la ficha. */
  async registrarPaciente(p: PacienteRapido) {
    const id = randomUUID();
    const doc: PacienteCouch & { registro_completo: boolean } = {
      _id: `paciente:${id}`,
      type: 'paciente',
      cui: null,
      nombres: p.nombres,
      apellidos: p.apellidos,
      fecha_nacimiento: p.fechaNacimiento,
      sexo: null,
      tipo_sangre: null,
      direccion: null,
      procedencia: null,
      estado: 'ACTIVO',
      baja: null,
      telefonos: [p.telefono],
      emails: [],
      contactos_emergencia: [],
      alergias: [],
      antecedentes: [],
      odontograma: {},
      registro_completo: false,
    };
    await this.db.insert(doc as never);
    return id;
  }

  /**
   * El _id determinista hace que Couch rechace (409) un segundo documento en el mismo horario.
   * Si el horario lo tenía una cita cancelada o con inasistencia, esa cita se copia a cita:<uuid>
   * (con reemplazada_por) y el _id se reutiliza para la nueva, porque en Couch no se borra.
   */
  async agendar(t: Omit<TurnoDatos, 'id' | 'estado' | 'llegada'>) {
    const _id = idCita(t.idOdontologo, t.fecha, t.hora);
    const nueva: CitaCouch = {
      _id, type: 'cita', paciente_id: t.idPaciente, medico_id: t.idOdontologo, fecha: t.fecha, hora: t.hora,
      motivo: t.motivo, estado: 'PROGRAMADA', creada_en: new Date().toISOString(), llegada_en: null,
    };
    try {
      await this.db.insert(nueva as never);
      return _id.slice(CITA.length);
    } catch (err) {
      if (estado(err) !== 409) throw err;
    }
    const ocupante = await leer<CitaCouch>(this.db, _id);
    if (!ocupante || !liberaHorario(ocupante.estado)) {
      throw new Conflicto(`El horario de las ${t.hora} ya está ocupado. Elija otro.`);
    }
    const { _rev, ...vieja } = ocupante;
    await this.db.insert({ ...vieja, _id: `${CITA}${randomUUID()}`, reemplazada_por: _id.slice(CITA.length) } as never);
    try {
      await this.db.insert({ ...nueva, _rev } as never);
    } catch (err) {
      if (estado(err) === 409) throw new Conflicto(`El horario de las ${t.hora} se acaba de ocupar. Elija otro.`);
      throw err;
    }
    return _id.slice(CITA.length);
  }

  async obtenerTurno(id: string) {
    const c = await leer<CitaCouch>(this.db, CITA + id);
    return c ? aTurno(c) : null;
  }

  /** Lee y reescribe el documento completo para no perder campos de otros módulos; reintenta una vez ante 409. */
  async marcarLlegada(id: string, cuando: string) {
    for (let intento = 0; intento < 2; intento++) {
      const c = await leer<CitaCouch>(this.db, CITA + id);
      if (!c) return;
      try {
        await this.db.insert({ ...c, llegada_en: cuando } as never);
        return;
      } catch (err) {
        if (estado(err) !== 409 || intento === 1) throw err;
      }
    }
  }
}

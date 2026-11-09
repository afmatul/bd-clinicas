import { randomUUID } from 'node:crypto';
import type { DocumentScope, MangoQuery } from 'nano';
import type { BuscarPacientesQuery, PacienteResumen, RegistrarPacienteInput } from '@red-clinica/shared';
import { digitosDeCui, palabrasDeBusqueda, patronSinAcentos } from '../../../../shared/texto.js';
import type { Baja, PacienteDatos } from '../../domain/paciente.js';
import type { PacienteRepository } from '../../ports/paciente-repository.js';

export interface PacienteCouch {
  _id: string; // paciente:<uuid>
  _rev?: string;
  type: 'paciente';
  cui: string | null;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: string | null;
  tipo_sangre: string | null;
  direccion: string | null;
  procedencia: string | null;
  estado: 'ACTIVO' | 'BAJA';
  baja: { fecha: string; motivo: string; medico_id: string | null } | null;
  telefonos: string[];
  emails: string[];
  contactos_emergencia: unknown[];
  alergias: { id: string; tipo: string; descripcion: string | null; severidad: string | null; medicamento_id: string | null }[];
  antecedentes: { id: string; tipo: string; descripcion: string | null }[];
  /** Odontograma actual en notación FDI (11–48); lo mantiene el módulo odontologia. */
  odontograma: Record<string, unknown>;
}

const PREFIJO = 'paciente:';

/**
 * Clínica odontológica · CouchDB. Una sola base con campo type; el expediente se lee entero
 * en una sola lectura. Cada operación escribe un solo documento, con control optimista por _rev.
 */
export class CouchPacienteRepository implements PacienteRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  async buscar(q: BuscarPacientesQuery) {
    const selector: MangoQuery['selector'] = { type: 'paciente' };
    if (q.q) {
      // (*UTF8): el regex de Erlang trata la cadena como bytes si no se le indica; sin esto "[oó]" no coincide.
      const porNombre = palabrasDeBusqueda(q.q).map((palabra) => {
        const re = `(*UTF8)(?i)${patronSinAcentos(palabra)}`;
        return { $or: [{ nombres: { $regex: re } }, { apellidos: { $regex: re } }] };
      });
      const alternativas: object[] = [{ $and: porNombre }];
      const cui = digitosDeCui(q.q);
      if (cui) alternativas.push({ cui: { $regex: cui } });
      selector.$or = alternativas;
    }
    if (q.estado) selector.estado = q.estado;
    if (q.sexo) selector.sexo = q.sexo;
    if (q.tipoSangre) selector.tipo_sangre = q.tipoSangre;
    // Mango no cuenta: para volúmenes de proyecto basta traer los ids y paginar en memoria.
    const todos = await this.db.find({ selector, fields: ['_id'], limit: 100_000 });
    const r = await this.db.find({
      selector,
      sort: [{ type: 'asc' }, { apellidos: 'asc' }],
      use_index: 'type-apellidos',
      skip: (q.pagina - 1) * q.porPagina,
      limit: q.porPagina,
    });
    return { items: (r.docs as unknown as PacienteCouch[]).map(aResumen), total: todos.docs.length };
  }

  async obtener(id: string): Promise<PacienteDatos | null> {
    const p = await this.leer(id);
    if (!p) return null;
    return {
      ...aResumen(p),
      direccion: p.direccion,
      procedencia: p.procedencia,
      telefonos: p.telefonos ?? [],
      emails: p.emails ?? [],
      baja: p.baja ? { fecha: p.baja.fecha, motivo: p.baja.motivo } : null,
    };
  }

  async existeCui(cui: string) {
    const r = await this.db.find({ selector: { type: 'paciente', cui }, fields: ['_id'], limit: 1 });
    return r.docs.length > 0;
  }

  async registrar(i: RegistrarPacienteInput): Promise<string> {
    const id = randomUUID();
    const doc: PacienteCouch = {
      _id: PREFIJO + id,
      type: 'paciente',
      cui: i.cui ?? null,
      nombres: i.nombres,
      apellidos: i.apellidos,
      fecha_nacimiento: i.fechaNacimiento,
      sexo: i.sexo,
      tipo_sangre: i.tipoSangre ?? null,
      direccion: i.direccion ?? null,
      procedencia: i.procedencia ?? null,
      estado: 'ACTIVO',
      baja: null,
      telefonos: i.telefonos,
      emails: i.emails,
      contactos_emergencia: [],
      alergias: [],
      antecedentes: [],
      odontograma: {},
    };
    await this.db.insert(doc as never);
    return id;
  }

  /** Si otra secretaria guardó antes (409 por _rev), se relee y se reintenta una vez. */
  async darDeBaja(id: string, b: Baja) {
    for (let intento = 0; intento < 2; intento++) {
      const p = await this.leer(id);
      if (!p) return;
      p.estado = 'BAJA';
      p.baja = { fecha: b.fecha, motivo: b.motivo, medico_id: b.idPersonal };
      try {
        await this.db.insert(p as never);
        return;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode !== 409 || intento === 1) throw err;
      }
    }
  }

  private async leer(id: string): Promise<PacienteCouch | null> {
    try {
      return (await this.db.get(PREFIJO + id)) as unknown as PacienteCouch;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }
}

function aResumen(p: PacienteCouch): PacienteResumen {
  return {
    id: p._id.slice(PREFIJO.length),
    cui: p.cui,
    nombres: p.nombres,
    apellidos: p.apellidos,
    fechaNacimiento: p.fecha_nacimiento,
    sexo: p.sexo,
    tipoSangre: p.tipo_sangre,
    telefono: p.telefonos?.[0] ?? null,
    estado: p.estado,
  };
}

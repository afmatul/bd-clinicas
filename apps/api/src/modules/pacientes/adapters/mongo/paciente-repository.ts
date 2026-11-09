import { ObjectId, type Collection, type Db, type Filter } from 'mongodb';
import type { BuscarPacientesQuery, PacienteResumen, RegistrarPacienteInput } from '@red-clinica/shared';
import { aFechaISO } from '../../../../shared/fechas.js';
import { digitosDeCui, palabrasDeBusqueda, patronSinAcentos } from '../../../../shared/texto.js';
import type { Baja, PacienteDatos } from '../../domain/paciente.js';
import type { PacienteRepository } from '../../ports/paciente-repository.js';

export interface PacienteDoc {
  _id: ObjectId;
  cui: string | null;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: Date;
  sexo: string | null;
  tipo_sangre: string | null;
  direccion: string | null;
  procedencia: string | null;
  estado: 'ACTIVO' | 'BAJA';
  baja: { fecha: Date; motivo: string; medico_id: string | null } | null;
  telefonos: string[];
  emails: string[];
  contactos_emergencia: unknown[];
  alergias: { _id: ObjectId; tipo: string; descripcion: string | null; severidad: string | null; medicamento_id: ObjectId | null }[];
  antecedentes: { _id: ObjectId; tipo: string; descripcion: string | null }[];
}


/** Laboratorio clínico · MongoDB. Lo acotado (contactos, alergias, antecedentes) va embebido en el paciente. */
export class MongoPacienteRepository implements PacienteRepository {
  private readonly col: Collection<PacienteDoc>;
  constructor(db: Db) {
    this.col = db.collection<PacienteDoc>('pacientes');
  }

  async buscar(q: BuscarPacientesQuery) {
    const filtro: Filter<PacienteDoc> = {};
    if (q.q) {
      const porNombre = palabrasDeBusqueda(q.q).map((palabra) => {
        const re = new RegExp(patronSinAcentos(palabra), 'i');
        return { $or: [{ nombres: re }, { apellidos: re }] };
      });
      const alternativas: Filter<PacienteDoc>[] = [{ $and: porNombre }];
      const cui = digitosDeCui(q.q);
      if (cui) alternativas.push({ cui: new RegExp(cui) });
      filtro.$or = alternativas;
    }
    if (q.estado) filtro.estado = q.estado;
    if (q.sexo) filtro.sexo = q.sexo;
    if (q.tipoSangre) filtro.tipo_sangre = q.tipoSangre;
    const [items, total] = await Promise.all([
      this.col.find(filtro, { projection: { alergias: 0, antecedentes: 0 } })
        .sort({ apellidos: 1, nombres: 1 })
        .skip((q.pagina - 1) * q.porPagina)
        .limit(q.porPagina)
        .toArray(),
      this.col.countDocuments(filtro),
    ]);
    return { items: items.map(aResumen), total };
  }

  async obtener(id: string): Promise<PacienteDatos | null> {
    if (!ObjectId.isValid(id)) return null;
    const p = await this.col.findOne({ _id: new ObjectId(id) });
    if (!p) return null;
    return {
      ...aResumen(p),
      direccion: p.direccion,
      procedencia: p.procedencia,
      telefonos: p.telefonos ?? [],
      emails: p.emails ?? [],
      baja: p.baja ? { fecha: aFechaISO(p.baja.fecha), motivo: p.baja.motivo } : null,
    };
  }

  async existeCui(cui: string) {
    return (await this.col.countDocuments({ cui }, { limit: 1 })) > 0;
  }

  /** Un solo insertOne: atómico por definición. */
  async registrar(i: RegistrarPacienteInput): Promise<string> {
    const _id = new ObjectId();
    await this.col.insertOne({
      _id,
      cui: i.cui ?? null,
      nombres: i.nombres,
      apellidos: i.apellidos,
      fecha_nacimiento: new Date(`${i.fechaNacimiento}T00:00:00Z`),
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
    });
    return _id.toHexString();
  }

  async darDeBaja(id: string, b: Baja) {
    await this.col.updateOne(
      { _id: new ObjectId(id), estado: 'ACTIVO' },
      { $set: { estado: 'BAJA', baja: { fecha: new Date(`${b.fecha}T00:00:00Z`), motivo: b.motivo, medico_id: b.idPersonal } } },
    );
  }
}

function aResumen(p: Pick<PacienteDoc, '_id' | 'cui' | 'nombres' | 'apellidos' | 'fecha_nacimiento' | 'sexo' | 'tipo_sangre' | 'telefonos' | 'estado'>): PacienteResumen {
  return {
    id: p._id.toHexString(),
    cui: p.cui,
    nombres: p.nombres,
    apellidos: p.apellidos,
    fechaNacimiento: p.fecha_nacimiento.toISOString().slice(0, 10),
    sexo: p.sexo,
    tipoSangre: p.tipo_sangre,
    telefono: p.telefonos?.[0] ?? null,
    estado: p.estado,
  };
}

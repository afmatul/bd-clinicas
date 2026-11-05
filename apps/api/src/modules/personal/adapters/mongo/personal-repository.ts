import { ObjectId, type Collection, type Db, type Filter } from 'mongodb';
import type { DirectorioQuery, Especialidad, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../../shared/errores.js';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { PersonalRepository } from '../../ports/personal-repository.js';

export interface PersonalDoc {
  _id: ObjectId;
  nombres: string;
  apellidos: string;
  numero_colegiado: string;
  /** Embebidas como texto: el laboratorio no tiene catálogo de especialidades. */
  especialidades: string[];
  rol?: string;
}

const aProfesional = (d: PersonalDoc): Profesional => ({
  id: d._id.toHexString(), nombres: d.nombres, apellidos: d.apellidos, numeroColegiado: d.numero_colegiado,
  especialidades: (d.especialidades ?? []).map((e) => ({ id: e, nombre: e })),
});

/** Laboratorio clínico · MongoDB. Colección personal; la especialidad se identifica por su nombre. */
export class MongoPersonalRepository implements PersonalRepository {
  private readonly col: Collection<PersonalDoc>;
  constructor(db: Db) {
    this.col = db.collection<PersonalDoc>('personal');
  }

  async directorio(f: DirectorioQuery) {
    const filtro: Filter<PersonalDoc> = {};
    if (f.q) {
      const re = new RegExp(patronSinAcentos(f.q), 'i');
      filtro.$or = [{ nombres: re }, { apellidos: re }, { numero_colegiado: f.q }];
    }
    if (f.especialidad) filtro.especialidades = f.especialidad;
    const docs = await this.col.find(filtro).sort({ apellidos: 1, nombres: 1 }).toArray();
    return docs.map(aProfesional);
  }

  async obtener(id: string) {
    if (!ObjectId.isValid(id)) return null;
    const d = await this.col.findOne({ _id: new ObjectId(id) });
    return d ? aProfesional(d) : null;
  }

  async existeColegiado(n: string) {
    return (await this.col.countDocuments({ numero_colegiado: n }, { limit: 1 })) > 0;
  }

  async registrar(input: RegistrarProfesionalInput) {
    const _id = new ObjectId();
    try {
      await this.col.insertOne({
        _id, nombres: input.nombres, apellidos: input.apellidos, numero_colegiado: input.numeroColegiado,
        especialidades: [...new Set(input.especialidades)],
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new Conflicto(`Ya existe un profesional con el colegiado ${input.numeroColegiado}.`);
      throw err;
    }
    return _id.toHexString();
  }

  /** Catálogo derivado: las especialidades distintas que tiene el personal. */
  async especialidades(): Promise<Especialidad[]> {
    const nombres = (await this.col.distinct('especialidades')) as string[];
    return nombres.sort((a, b) => a.localeCompare(b, 'es')).map((n) => ({ id: n, nombre: n, idDepartamento: null }));
  }

  async departamentos() {
    return [];
  }

  async asignarEspecialidad(): Promise<void> {
    throw new ReglaDeNegocio('Las especialidades se administran solo en el Hospital general.');
  }

  async quitarEspecialidad(): Promise<void> {
    throw new ReglaDeNegocio('Las especialidades se administran solo en el Hospital general.');
  }
}

import { randomUUID } from 'node:crypto';
import type { DocumentScope, MangoQuery } from 'nano';

type MangoSelector = MangoQuery['selector'];
import type { DirectorioQuery, Especialidad, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../../shared/errores.js';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { PersonalRepository } from '../../ports/personal-repository.js';

export interface PersonalCouch {
  _id: string; // personal:<uuid>
  _rev?: string;
  type: 'personal';
  nombres: string;
  apellidos: string;
  numero_colegiado: string;
  especialidades: string[];
  rol?: string;
}

const PREFIJO = 'personal:';

const aProfesional = (d: PersonalCouch): Profesional => ({
  id: d._id.slice(PREFIJO.length), nombres: d.nombres, apellidos: d.apellidos, numeroColegiado: d.numero_colegiado,
  especialidades: (d.especialidades ?? []).map((e) => ({ id: e, nombre: e })),
});

const porApellido = (a: Profesional, b: Profesional) =>
  a.apellidos.localeCompare(b.apellidos, 'es') || a.nombres.localeCompare(b.nombres, 'es');

/** Clínica odontológica · CouchDB. Documentos personal:<uuid> en la base única con campo type. */
export class CouchPersonalRepository implements PersonalRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  private async buscar(selector: MangoSelector): Promise<PersonalCouch[]> {
    const r = await this.db.find({ selector: { type: 'personal', ...selector }, limit: 1000 });
    return r.docs as unknown as PersonalCouch[];
  }

  async directorio(f: DirectorioQuery) {
    const selector: MangoSelector = {};
    if (f.q) {
      // (*UTF8) para que el $regex de Couch (PCRE) entienda las vocales acentuadas.
      const re = `(*UTF8)(?i)${patronSinAcentos(f.q)}`;
      selector.$or = [{ nombres: { $regex: re } }, { apellidos: { $regex: re } }, { numero_colegiado: f.q }];
    }
    if (f.especialidad) selector.especialidades = { $elemMatch: { $eq: f.especialidad } };
    return (await this.buscar(selector)).map(aProfesional).sort(porApellido);
  }

  async obtener(id: string) {
    try {
      const d = (await this.db.get(PREFIJO + id)) as unknown as PersonalCouch;
      return d.type === 'personal' ? aProfesional(d) : null;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }

  async existeColegiado(n: string) {
    return (await this.buscar({ numero_colegiado: n })).length > 0;
  }

  async registrar(input: RegistrarProfesionalInput) {
    if (await this.existeColegiado(input.numeroColegiado)) {
      throw new Conflicto(`Ya existe un profesional con el colegiado ${input.numeroColegiado}.`);
    }
    const id = randomUUID();
    const doc: PersonalCouch = {
      _id: PREFIJO + id, type: 'personal', nombres: input.nombres, apellidos: input.apellidos,
      numero_colegiado: input.numeroColegiado, especialidades: [...new Set(input.especialidades)],
    };
    await this.db.insert(doc as never);
    return id;
  }

  async especialidades(): Promise<Especialidad[]> {
    const nombres = new Set((await this.buscar({})).flatMap((d) => d.especialidades ?? []));
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es')).map((n) => ({ id: n, nombre: n, idDepartamento: null }));
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

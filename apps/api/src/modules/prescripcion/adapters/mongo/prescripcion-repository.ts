import { ObjectId, type Collection, type Db } from 'mongodb';
import type { Medicamento } from '@red-clinica/shared';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { MedicamentoRepository, RecetaRepository } from '../../ports/prescripcion-repository.js';
import { MongoConsultaRepository } from '../../../atencion/adapters/mongo/consulta-repository.js';
import { recetasDe } from '../recetas-desde-consultas.js';

interface MedicamentoDoc { _id: ObjectId; nombre: string; presentacion: string | null; concentracion: string | null }
const aMed = (m: MedicamentoDoc): Medicamento => ({
  id: m._id.toHexString(), nombre: m.nombre, presentacion: m.presentacion ?? null, concentracion: m.concentracion ?? null,
});

/** Laboratorio clínico · MongoDB. Colección medicamentos; la receta guarda una copia del nombre. */
export class MongoMedicamentoRepository implements MedicamentoRepository {
  private readonly col: Collection<MedicamentoDoc>;
  constructor(db: Db) {
    this.col = db.collection<MedicamentoDoc>('medicamentos');
  }

  async buscar(texto: string, limite: number) {
    const filtro = texto ? { nombre: new RegExp(patronSinAcentos(texto), 'i') } : {};
    return (await this.col.find(filtro).sort({ nombre: 1 }).limit(limite).toArray()).map(aMed);
  }

  async obtenerVarios(ids: string[]) {
    const oids = ids.filter((i) => ObjectId.isValid(i)).map((i) => new ObjectId(i));
    if (!oids.length) return [];
    return (await this.col.find({ _id: { $in: oids } }).toArray()).map(aMed);
  }
}

/** Las recetas viven embebidas en las consultas. */
export class MongoRecetaRepository implements RecetaRepository {
  private readonly consultas: MongoConsultaRepository;
  constructor(db: Db) {
    this.consultas = new MongoConsultaRepository(db);
  }
  async delPaciente(idPaciente: string) {
    return recetasDe(await this.consultas.historial(idPaciente));
  }
}

import type { DocumentScope, MangoSelector } from 'nano';
import type { Medicamento } from '@red-clinica/shared';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { MedicamentoRepository, RecetaRepository } from '../../ports/prescripcion-repository.js';
import { CouchConsultaRepository } from '../../../atencion/adapters/couch/consulta-repository.js';
import { recetasDe } from '../recetas-desde-consultas.js';

interface MedicamentoCouch { _id: string; type: 'medicamento'; nombre: string; presentacion: string | null; concentracion: string | null }
const PREFIJO = 'medicamento:';
const aMed = (m: MedicamentoCouch): Medicamento => ({
  id: m._id.slice(PREFIJO.length), nombre: m.nombre, presentacion: m.presentacion ?? null, concentracion: m.concentracion ?? null,
});

/** Clínica odontológica · CouchDB. Documentos medicamento:<uuid>; la receta guarda una copia del nombre. */
export class CouchMedicamentoRepository implements MedicamentoRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  async buscar(texto: string, limite: number) {
    const selector: MangoSelector = { type: 'medicamento' };
    // (*UTF8): sin esto el regex de Erlang compara bytes y "[oó]" no coincide.
    if (texto) selector.nombre = { $regex: `(*UTF8)(?i)${patronSinAcentos(texto)}` };
    const r = await this.db.find({ selector, limit: 1000 });
    return (r.docs as unknown as MedicamentoCouch[]).map(aMed).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).slice(0, limite);
  }

  async obtenerVarios(ids: string[]) {
    if (!ids.length) return [];
    const r = await this.db.fetch({ keys: ids.map((i) => PREFIJO + i) });
    return r.rows.flatMap((row) => ('doc' in row && row.doc ? [aMed(row.doc as unknown as MedicamentoCouch)] : []));
  }
}

/** Las recetas viven embebidas en los documentos consulta. */
export class CouchRecetaRepository implements RecetaRepository {
  private readonly consultas: CouchConsultaRepository;
  constructor(db: DocumentScope<unknown>) {
    this.consultas = new CouchConsultaRepository(db);
  }
  async delPaciente(idPaciente: string) {
    return recetasDe(await this.consultas.historial(idPaciente));
  }
}

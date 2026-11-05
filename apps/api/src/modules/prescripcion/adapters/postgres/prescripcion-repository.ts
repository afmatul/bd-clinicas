import type pg from 'pg';
import type { Medicamento } from '@red-clinica/shared';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { MedicamentoRepository, RecetaRepository } from '../../ports/prescripcion-repository.js';
import { PostgresConsultaRepository } from '../../../atencion/adapters/postgres/consulta-repository.js';
import { recetasDe } from '../recetas-desde-consultas.js';

const aMed = (r: Record<string, any>): Medicamento => ({
  id: String(r.id_medicamento), nombre: r.nombre, presentacion: r.presentacion, concentracion: r.concentracion ?? null,
});

/** Hospital general · PostgreSQL. */
export class PostgresMedicamentoRepository implements MedicamentoRepository {
  constructor(private readonly db: pg.Pool) {}

  async buscar(texto: string, limite: number) {
    const { rows } = await this.db.query(
      `SELECT * FROM medicamento WHERE $1 = '' OR nombre ~* $2 ORDER BY nombre, concentracion LIMIT $3`,
      [texto, patronSinAcentos(texto), limite],
    );
    return rows.map(aMed);
  }

  async obtenerVarios(ids: string[]) {
    const nums = ids.filter((i) => /^\d+$/.test(i)).map(Number);
    if (!nums.length) return [];
    const { rows } = await this.db.query(`SELECT * FROM medicamento WHERE id_medicamento = ANY($1)`, [nums]);
    return rows.map(aMed);
  }
}

/** Las recetas se leen con el historial de consultas (receta → tratamiento → diagnóstico → consulta). */
export class PostgresRecetaRepository implements RecetaRepository {
  private readonly consultas: PostgresConsultaRepository;
  constructor(db: pg.Pool) {
    this.consultas = new PostgresConsultaRepository(db);
  }
  async delPaciente(idPaciente: string) {
    return recetasDe(await this.consultas.historial(idPaciente));
  }
}

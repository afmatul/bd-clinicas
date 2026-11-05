import type mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import type { Medicamento } from '@red-clinica/shared';
import type { MedicamentoRepository, RecetaRepository } from '../../ports/prescripcion-repository.js';
import { MysqlConsultaRepository } from '../../../atencion/adapters/mysql/consulta-repository.js';
import { recetasDe } from '../recetas-desde-consultas.js';

/** En el ER pediátrico el medicamento no tiene concentración (va en la presentación). */
const aMed = (r: RowDataPacket): Medicamento => ({ id: String(r.id_medicamento), nombre: r.nombre, presentacion: r.presentacion, concentracion: null });

/** Centro pediátrico · MySQL. La collation *_ai_ci ya ignora mayúsculas y acentos en LIKE. */
export class MysqlMedicamentoRepository implements MedicamentoRepository {
  constructor(private readonly db: mysql.Pool) {}

  async buscar(texto: string, limite: number) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM medicamento WHERE ? = '' OR nombre LIKE ? ORDER BY nombre LIMIT ?`,
      [texto, `%${texto}%`, limite],
    );
    return rows.map(aMed);
  }

  async obtenerVarios(ids: string[]) {
    const nums = ids.filter((i) => /^\d+$/.test(i)).map(Number);
    if (!nums.length) return [];
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT * FROM medicamento WHERE id_medicamento IN (?)`, [nums]);
    return rows.map(aMed);
  }
}

export class MysqlRecetaRepository implements RecetaRepository {
  private readonly consultas: MysqlConsultaRepository;
  constructor(db: mysql.Pool) {
    this.consultas = new MysqlConsultaRepository(db);
  }
  async delPaciente(idPaciente: string) {
    return recetasDe(await this.consultas.historial(idPaciente));
  }
}

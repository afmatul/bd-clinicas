import type mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import type { AntecedenteRepository } from '../../ports/antecedente-repository.js';

export class MysqlAntecedenteRepository implements AntecedenteRepository {
  constructor(private readonly db: mysql.Pool) {}

  async listarAlergias(idPaciente: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT id_alergia, tipo, descripcion, severidad, id_medicamento FROM alergia WHERE id_paciente = ? ORDER BY id_alergia`,
      [Number(idPaciente)],
    );
    return rows.map((r) => ({
      id: String(r.id_alergia), tipo: r.tipo, descripcion: r.descripcion, severidad: r.severidad,
      idMedicamento: r.id_medicamento === null ? null : String(r.id_medicamento),
    }));
  }

  async listarAntecedentes(idPaciente: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT id_antecedente, tipo, descripcion FROM antecedente WHERE id_paciente = ? ORDER BY id_antecedente`,
      [Number(idPaciente)],
    );
    return rows.map((r) => ({ id: String(r.id_antecedente), tipo: r.tipo, descripcion: r.descripcion }));
  }
}

import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import { NoEncontrado } from '../../../../shared/errores.js';
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

  /** INSERT … SELECT … WHERE EXISTS: si el paciente no existe, affectedRows es 0 y se devuelve null. */
  async registrarAlergia(idPaciente: string, a: RegistrarAlergiaInput) {
    if (!/^\d+$/.test(idPaciente)) return null;
    if (a.idMedicamento && !/^\d+$/.test(a.idMedicamento)) throw new NoEncontrado('El medicamento');
    try {
      const [r] = await this.db.query<ResultSetHeader>(
        `INSERT INTO alergia (id_paciente, id_medicamento, tipo, descripcion, severidad)
         SELECT ?, ?, ?, ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM paciente WHERE id_paciente = ?)`,
        [Number(idPaciente), a.idMedicamento ? Number(a.idMedicamento) : null, a.tipo, a.descripcion ?? null, a.severidad, Number(idPaciente)],
      );
      return r.affectedRows ? String(r.insertId) : null;
    } catch (err) {
      // 1452: violación de llave foránea (el medicamento no está en el catálogo).
      if ((err as { errno?: number }).errno === 1452) throw new NoEncontrado('El medicamento');
      throw err;
    }
  }

  async registrarAntecedente(idPaciente: string, a: RegistrarAntecedenteInput) {
    if (!/^\d+$/.test(idPaciente)) return null;
    const [r] = await this.db.query<ResultSetHeader>(
      `INSERT INTO antecedente (id_paciente, tipo, descripcion)
       SELECT ?, ?, ? FROM DUAL WHERE EXISTS (SELECT 1 FROM paciente WHERE id_paciente = ?)`,
      [Number(idPaciente), a.tipo, a.descripcion ?? null, Number(idPaciente)],
    );
    return r.affectedRows ? String(r.insertId) : null;
  }
}

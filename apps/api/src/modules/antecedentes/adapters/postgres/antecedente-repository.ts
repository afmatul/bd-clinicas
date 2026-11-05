import type pg from 'pg';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import { NoEncontrado } from '../../../../shared/errores.js';
import type { AntecedenteRepository } from '../../ports/antecedente-repository.js';

export class PostgresAntecedenteRepository implements AntecedenteRepository {
  constructor(private readonly db: pg.Pool) {}

  async listarAlergias(idPaciente: string) {
    const { rows } = await this.db.query(
      `SELECT id_alergia, tipo, descripcion, severidad, id_medicamento FROM alergia WHERE id_paciente = $1 ORDER BY id_alergia`,
      [Number(idPaciente)],
    );
    return rows.map((r) => ({
      id: String(r.id_alergia), tipo: r.tipo, descripcion: r.descripcion, severidad: r.severidad,
      idMedicamento: r.id_medicamento === null ? null : String(r.id_medicamento),
    }));
  }

  async listarAntecedentes(idPaciente: string) {
    const { rows } = await this.db.query(
      `SELECT id_antecedente, tipo, descripcion FROM antecedente WHERE id_paciente = $1 ORDER BY id_antecedente`,
      [Number(idPaciente)],
    );
    return rows.map((r) => ({ id: String(r.id_antecedente), tipo: r.tipo, descripcion: r.descripcion }));
  }

  /** INSERT … SELECT … WHERE EXISTS: si el paciente no existe no se inserta nada y se devuelve null. */
  async registrarAlergia(idPaciente: string, a: RegistrarAlergiaInput) {
    if (!/^\d+$/.test(idPaciente)) return null;
    if (a.idMedicamento && !/^\d+$/.test(a.idMedicamento)) throw new NoEncontrado('El medicamento');
    try {
      const { rows } = await this.db.query(
        `INSERT INTO alergia (id_paciente, id_medicamento, tipo, descripcion, severidad)
         SELECT $1, $2, $3, $4, $5 WHERE EXISTS (SELECT 1 FROM paciente WHERE id_paciente = $1)
         RETURNING id_alergia`,
        [Number(idPaciente), a.idMedicamento ? Number(a.idMedicamento) : null, a.tipo, a.descripcion ?? null, a.severidad],
      );
      return rows[0] ? String(rows[0].id_alergia) : null;
    } catch (err) {
      // 23503: violación de llave foránea (el medicamento no está en el catálogo).
      if ((err as { code?: string }).code === '23503') throw new NoEncontrado('El medicamento');
      throw err;
    }
  }

  async registrarAntecedente(idPaciente: string, a: RegistrarAntecedenteInput) {
    if (!/^\d+$/.test(idPaciente)) return null;
    const { rows } = await this.db.query(
      `INSERT INTO antecedente (id_paciente, tipo, descripcion)
       SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM paciente WHERE id_paciente = $1)
       RETURNING id_antecedente`,
      [Number(idPaciente), a.tipo, a.descripcion ?? null],
    );
    return rows[0] ? String(rows[0].id_antecedente) : null;
  }
}

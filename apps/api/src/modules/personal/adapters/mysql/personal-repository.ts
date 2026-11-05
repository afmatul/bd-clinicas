import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DirectorioQuery, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../../shared/errores.js';
import { PEDIATRIA } from '../../domain/profesional.js';
import type { PersonalRepository } from '../../ports/personal-repository.js';

const aProfesional = (r: RowDataPacket): Profesional => ({
  id: String(r.id_usuario), nombres: r.nombres, apellidos: r.apellidos, numeroColegiado: r.numero_colegiado,
  especialidades: [{ ...PEDIATRIA }],
});

/**
 * Centro pediátrico · MySQL. La tabla pediatra no tiene especialidades ni departamentos:
 * todos los profesionales llevan la especialidad implícita Pediatría.
 */
export class MysqlPersonalRepository implements PersonalRepository {
  constructor(private readonly db: mysql.Pool) {}

  async directorio(f: DirectorioQuery) {
    if (f.especialidad && f.especialidad !== PEDIATRIA.id) return [];
    // La collation *_ai_ci de MySQL ya ignora mayúsculas y acentos.
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT id_usuario, nombres, apellidos, numero_colegiado FROM pediatra
        WHERE (? IS NULL OR CONCAT(nombres, ' ', apellidos) LIKE ? OR numero_colegiado = ?)
        ORDER BY apellidos, nombres`,
      [f.q ?? null, `%${f.q ?? ''}%`, f.q ?? null],
    );
    return rows.map(aProfesional);
  }

  async obtener(id: string) {
    if (!/^\d+$/.test(id)) return null;
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT id_usuario, nombres, apellidos, numero_colegiado FROM pediatra WHERE id_usuario = ?`, [Number(id)],
    );
    return rows[0] ? aProfesional(rows[0]) : null;
  }

  async existeColegiado(n: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT 1 FROM pediatra WHERE numero_colegiado = ?`, [n]);
    return rows.length > 0;
  }

  async registrar(input: RegistrarProfesionalInput) {
    try {
      const [r] = await this.db.query<ResultSetHeader>(
        `INSERT INTO pediatra (nombres, apellidos, numero_colegiado) VALUES (?, ?, ?)`,
        [input.nombres, input.apellidos, input.numeroColegiado],
      );
      return String(r.insertId);
    } catch (err) {
      if ((err as { errno?: number }).errno === 1062) throw new Conflicto(`Ya existe un pediatra con el colegiado ${input.numeroColegiado}.`);
      throw err;
    }
  }

  async especialidades() {
    return [{ ...PEDIATRIA, idDepartamento: null }];
  }

  async departamentos() {
    return [];
  }

  async asignarEspecialidad(): Promise<void> {
    throw new ReglaDeNegocio('En el centro pediátrico todos los profesionales son pediatras.');
  }

  async quitarEspecialidad(): Promise<void> {
    throw new ReglaDeNegocio('En el centro pediátrico todos los profesionales son pediatras.');
  }
}

import type pg from 'pg';
import type { Departamento, DirectorioQuery, Especialidad, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';
import { Conflicto, NoEncontrado } from '../../../../shared/errores.js';
import { patronSinAcentos } from '../../../../shared/texto.js';
import type { PersonalRepository } from '../../ports/personal-repository.js';

const esEntero = (s: string) => /^\d+$/.test(s);

/** Médico con sus especialidades en una sola consulta (json_agg sobre la tabla puente). */
const SELECT_MEDICO = `
  SELECT m.id_medico, m.nombres, m.apellidos, m.numero_colegiado,
         COALESCE(json_agg(json_build_object('id', e.id_especialidad::text, 'nombre', e.nombre) ORDER BY e.nombre)
                  FILTER (WHERE e.id_especialidad IS NOT NULL), '[]') AS especialidades
    FROM medico m
    LEFT JOIN medico_especialidad me ON me.id_medico = m.id_medico
    LEFT JOIN especialidad e ON e.id_especialidad = me.id_especialidad`;

const aProfesional = (r: Record<string, any>): Profesional => ({
  id: String(r.id_medico), nombres: r.nombres, apellidos: r.apellidos, numeroColegiado: r.numero_colegiado,
  especialidades: r.especialidades,
});

/** Hospital general · PostgreSQL: medico N:M especialidad, especialidad N:1 departamento. */
export class PostgresPersonalRepository implements PersonalRepository {
  constructor(private readonly db: pg.Pool) {}

  async directorio(f: DirectorioQuery) {
    if (f.especialidad && !esEntero(f.especialidad)) return [];
    const { rows } = await this.db.query(
      `${SELECT_MEDICO}
        WHERE ($1::text IS NULL OR (m.nombres || ' ' || m.apellidos) ~* $1 OR m.numero_colegiado = $2)
          AND ($3::int IS NULL OR EXISTS (
                SELECT 1 FROM medico_especialidad x WHERE x.id_medico = m.id_medico AND x.id_especialidad = $3))
        GROUP BY m.id_medico
        ORDER BY m.apellidos, m.nombres`,
      [f.q ? patronSinAcentos(f.q) : null, f.q ?? null, f.especialidad ? Number(f.especialidad) : null],
    );
    return rows.map(aProfesional);
  }

  async obtener(id: string) {
    if (!esEntero(id)) return null;
    const { rows } = await this.db.query(`${SELECT_MEDICO} WHERE m.id_medico = $1 GROUP BY m.id_medico`, [Number(id)]);
    return rows[0] ? aProfesional(rows[0]) : null;
  }

  async existeColegiado(n: string) {
    const { rowCount } = await this.db.query(`SELECT 1 FROM medico WHERE numero_colegiado = $1`, [n]);
    return !!rowCount;
  }

  /** Médico y sus especialidades en una sola transacción. */
  async registrar(input: RegistrarProfesionalInput) {
    const cx = await this.db.connect();
    try {
      await cx.query('BEGIN');
      const { rows } = await cx.query(
        `INSERT INTO medico (nombres, apellidos, numero_colegiado) VALUES ($1, $2, $3) RETURNING id_medico`,
        [input.nombres, input.apellidos, input.numeroColegiado],
      );
      const id = rows[0].id_medico as number;
      for (const e of input.especialidades) {
        if (!esEntero(e)) throw new NoEncontrado('La especialidad');
        await cx.query(`INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, Number(e)]);
      }
      await cx.query('COMMIT');
      return String(id);
    } catch (err) {
      await cx.query('ROLLBACK');
      const code = (err as { code?: string }).code;
      if (code === '23505') throw new Conflicto(`Ya existe un médico con el colegiado ${input.numeroColegiado}.`);
      if (code === '23503') throw new NoEncontrado('La especialidad');
      throw err;
    } finally {
      cx.release();
    }
  }

  async especialidades(): Promise<Especialidad[]> {
    const { rows } = await this.db.query(`SELECT id_especialidad, nombre, id_departamento FROM especialidad ORDER BY nombre`);
    return rows.map((r) => ({ id: String(r.id_especialidad), nombre: r.nombre, idDepartamento: String(r.id_departamento) }));
  }

  async departamentos(): Promise<Departamento[]> {
    const { rows } = await this.db.query(
      `SELECT d.id_departamento, d.nombre, d.ubicacion, d.extension_telefonica,
              COALESCE(json_agg(json_build_object('id', e.id_especialidad::text, 'nombre', e.nombre) ORDER BY e.nombre)
                       FILTER (WHERE e.id_especialidad IS NOT NULL), '[]') AS especialidades
         FROM departamento d LEFT JOIN especialidad e ON e.id_departamento = d.id_departamento
        GROUP BY d.id_departamento ORDER BY d.nombre`,
    );
    return rows.map((r) => ({
      id: String(r.id_departamento), nombre: r.nombre, ubicacion: r.ubicacion, extension: r.extension_telefonica,
      especialidades: r.especialidades,
    }));
  }

  async asignarEspecialidad(idProfesional: string, idEspecialidad: string) {
    if (!esEntero(idProfesional) || !esEntero(idEspecialidad)) throw new NoEncontrado('La especialidad');
    try {
      await this.db.query(
        `INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [Number(idProfesional), Number(idEspecialidad)],
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23503') throw new NoEncontrado('La especialidad');
      throw err;
    }
  }

  async quitarEspecialidad(idProfesional: string, idEspecialidad: string) {
    if (!esEntero(idProfesional) || !esEntero(idEspecialidad)) return;
    await this.db.query(`DELETE FROM medico_especialidad WHERE id_medico = $1 AND id_especialidad = $2`, [Number(idProfesional), Number(idEspecialidad)]);
  }
}

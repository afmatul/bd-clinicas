import type mysql from 'mysql2/promise';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { BuscarPacientesQuery, PacienteResumen, RegistrarPacienteInput } from '@red-clinica/shared';
import { edadEnAnios } from '../../../../shared/fechas.js';
import type { Baja, PacienteDatos } from '../../domain/paciente.js';
import type { PacienteRepository } from '../../ports/paciente-repository.js';

/**
 * Centro pediátrico · MySQL InnoDB. El paciente no tiene teléfonos propios: se contacta
 * a sus responsables. El ER no tiene fecha ni motivo de baja; quedan en la bitácora.
 */
export class MysqlPacienteRepository implements PacienteRepository {
  constructor(private readonly db: mysql.Pool) {}

  async buscar(q: BuscarPacientesQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.q) {
      where.push(`(p.cui = ? OR p.apellidos LIKE ? OR p.nombres LIKE ?)`);
      params.push(q.q, `%${q.q}%`, `%${q.q}%`);
    }
    for (const [col, v] of [['p.estado', q.estado], ['p.sexo', q.sexo], ['p.tipo_sangre', q.tipoSangre]] as const) {
      if (!v) continue;
      where.push(`${col} = ?`);
      params.push(v);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[total]] = await this.db.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM paciente p ${w}`, params);
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT p.id_paciente, p.cui, p.nombres, p.apellidos, p.fecha_nacimiento, p.sexo, p.tipo_sangre, p.estado,
              (SELECT rt.telefono FROM responsable r JOIN responsable_telefono rt ON rt.id_responsable = r.id_responsable
                WHERE r.id_paciente = p.id_paciente ORDER BY r.es_tutor_legal DESC, rt.id_telefono LIMIT 1) AS telefono
         FROM paciente p ${w} ORDER BY p.apellidos, p.nombres LIMIT ? OFFSET ?`,
      [...params, q.porPagina, (q.pagina - 1) * q.porPagina],
    );
    return { items: rows.map(aResumen), total: Number(total!.n) };
  }

  async obtener(id: string): Promise<PacienteDatos | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT * FROM paciente WHERE id_paciente = ?`, [Number(id)]);
    const p = rows[0];
    if (!p) return null;
    const [tel] = await this.db.query<RowDataPacket[]>(
      `SELECT rt.telefono FROM responsable r JOIN responsable_telefono rt ON rt.id_responsable = r.id_responsable
        WHERE r.id_paciente = ? ORDER BY r.es_tutor_legal DESC, rt.id_telefono`,
      [p.id_paciente],
    );
    return {
      ...aResumen({ ...p, telefono: tel[0]?.telefono ?? null } as RowDataPacket),
      direccion: p.direccion,
      procedencia: null,
      telefonos: tel.map((r) => r.telefono),
      emails: [],
      baja: null,
    };
  }

  async existeCui(cui: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT 1 FROM paciente WHERE cui = ?`, [cui]);
    return rows.length > 0;
  }

  /** Alta del menor y de su primer responsable en la misma transacción. */
  async registrar(i: RegistrarPacienteInput): Promise<string> {
    const c = await this.db.getConnection();
    try {
      await c.beginTransaction();
      const [res] = await c.query<ResultSetHeader>(
        `INSERT INTO paciente (cui, nombres, apellidos, fecha_nacimiento, edad, sexo, tipo_sangre, direccion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.cui ?? null, i.nombres, i.apellidos, i.fechaNacimiento, edadEnAnios(i.fechaNacimiento), i.sexo,
          i.tipoSangre ?? null, i.direccion ?? null],
      );
      const id = res.insertId;
      if (i.responsable) {
        const r = i.responsable;
        const [rr] = await c.query<ResultSetHeader>(
          `INSERT INTO responsable (id_paciente, nombre_completo, cui, parentesco, direccion, es_tutor_legal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, r.nombreCompleto, r.cui ?? null, r.parentesco, i.direccion ?? null, r.esTutorLegal],
        );
        for (const t of r.telefonos) {
          await c.query(`INSERT INTO responsable_telefono (id_responsable, telefono) VALUES (?, ?)`, [rr.insertId, t]);
        }
      }
      await c.commit();
      return String(id);
    } catch (err) {
      await c.rollback();
      throw err;
    } finally {
      c.release();
    }
  }

  async darDeBaja(id: string, _b: Baja) {
    await this.db.query(`UPDATE paciente SET estado = 'BAJA' WHERE id_paciente = ?`, [Number(id)]);
  }
}

function aResumen(r: RowDataPacket): PacienteResumen {
  return {
    id: String(r.id_paciente),
    cui: r.cui,
    nombres: r.nombres,
    apellidos: r.apellidos,
    fechaNacimiento: r.fecha_nacimiento,
    sexo: r.sexo,
    tipoSangre: r.tipo_sangre,
    telefono: r.telefono ?? null,
    estado: r.estado,
  };
}

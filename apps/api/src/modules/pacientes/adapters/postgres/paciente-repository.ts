import type pg from 'pg';
import type { BuscarPacientesQuery, PacienteResumen, RegistrarPacienteInput } from '@red-clinica/shared';
import { edadEnAnios } from '../../../../shared/fechas.js';
import { digitosDeCui, palabrasDeBusqueda, patronSinAcentos } from '../../../../shared/texto.js';
import type { Baja, PacienteDatos } from '../../domain/paciente.js';
import type { PacienteRepository } from '../../ports/paciente-repository.js';

/** Hospital general · PostgreSQL. Teléfonos y correos en tablas propias (1FN). */
export class PostgresPacienteRepository implements PacienteRepository {
  constructor(private readonly db: pg.Pool) {}

  async buscar(q: BuscarPacientesQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.q) {
      const porNombre = palabrasDeBusqueda(q.q).map((palabra) => {
        params.push(patronSinAcentos(palabra));
        return `(nombres || ' ' || apellidos) ~* $${params.length}`;
      });
      const alternativas = [`(${porNombre.join(' AND ')})`];
      const cui = digitosDeCui(q.q);
      if (cui) {
        params.push(`%${cui}%`);
        alternativas.push(`cui LIKE $${params.length}`);
      }
      where.push(`(${alternativas.join(' OR ')})`);
    }
    for (const [col, v] of [['estado', q.estado], ['sexo', q.sexo], ['tipo_sangre', q.tipoSangre]] as const) {
      if (!v) continue;
      params.push(v);
      where.push(`${col} = $${params.length}`);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.db.query(`SELECT count(*)::int AS n FROM paciente ${w}`, params);
    params.push(q.porPagina, (q.pagina - 1) * q.porPagina);
    const { rows } = await this.db.query(
      `SELECT id_paciente, cui, nombres, apellidos, fecha_nacimiento, sexo, tipo_sangre, estado,
              (SELECT telefono FROM paciente_telefono t WHERE t.id_paciente = paciente.id_paciente ORDER BY id_telefono LIMIT 1) AS telefono
         FROM paciente ${w} ORDER BY apellidos, nombres
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(aResumen), total: total.rows[0].n as number };
  }

  async obtener(id: string): Promise<PacienteDatos | null> {
    const { rows } = await this.db.query(`SELECT * FROM paciente WHERE id_paciente = $1`, [Number(id)]);
    const p = rows[0];
    if (!p) return null;
    const [tel, mail] = await Promise.all([
      this.db.query(`SELECT telefono FROM paciente_telefono WHERE id_paciente = $1 ORDER BY id_telefono`, [p.id_paciente]),
      this.db.query(`SELECT email FROM paciente_email WHERE id_paciente = $1 ORDER BY id_email`, [p.id_paciente]),
    ]);
    return {
      ...aResumen({ ...p, telefono: tel.rows[0]?.telefono ?? null }),
      direccion: p.direccion,
      procedencia: p.procedencia,
      telefonos: tel.rows.map((r) => r.telefono),
      emails: mail.rows.map((r) => r.email),
      baja: p.estado === 'BAJA' ? { fecha: p.fecha_baja, motivo: p.motivo_baja } : null,
    };
  }

  async existeCui(cui: string) {
    const { rowCount } = await this.db.query(`SELECT 1 FROM paciente WHERE cui = $1`, [cui]);
    return (rowCount ?? 0) > 0;
  }

  /** Alta con teléfonos y correos en una sola transacción. */
  async registrar(i: RegistrarPacienteInput): Promise<string> {
    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      const { rows } = await c.query(
        `INSERT INTO paciente (cui, nombres, apellidos, fecha_nacimiento, edad, sexo, tipo_sangre, direccion, procedencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id_paciente`,
        [i.cui ?? null, i.nombres, i.apellidos, i.fechaNacimiento, edadEnAnios(i.fechaNacimiento), i.sexo,
          i.tipoSangre ?? null, i.direccion ?? null, i.procedencia ?? null],
      );
      const id = rows[0].id_paciente as number;
      for (const t of i.telefonos) await c.query(`INSERT INTO paciente_telefono (id_paciente, telefono) VALUES ($1, $2)`, [id, t]);
      for (const e of i.emails) await c.query(`INSERT INTO paciente_email (id_paciente, email) VALUES ($1, $2)`, [id, e]);
      await c.query('COMMIT');
      return String(id);
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }

  async darDeBaja(id: string, b: Baja) {
    await this.db.query(
      `UPDATE paciente SET estado = 'BAJA', fecha_baja = $2, motivo_baja = $3, id_medico_baja = $4 WHERE id_paciente = $1`,
      [Number(id), b.fecha, b.motivo, b.idPersonal ? Number(b.idPersonal) : null],
    );
  }
}

function aResumen(r: Record<string, any>): PacienteResumen {
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

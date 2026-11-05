import type pg from 'pg';
import type { AccesoPaciente, ConsultarBitacoraQuery, EntradaBitacora } from '@red-clinica/shared';
import type { ConsultaBitacora } from '../ports/consulta-bitacora.js';

/** Las fechas de los filtros son días de Guatemala, no de UTC. */
const DIA_LOCAL = `(b.momento AT TIME ZONE 'America/Guatemala')::date`;

export class ConsultaBitacoraPlataforma implements ConsultaBitacora {
  constructor(private readonly db: pg.Pool) {}

  async buscar(idInstitucion: string, q: ConsultarBitacoraQuery) {
    const cond = ['b.id_institucion = $1'];
    const params: unknown[] = [Number(idInstitucion)];
    const sumar = (sql: string, v: unknown) => {
      params.push(v);
      cond.push(sql.replace('?', `$${params.length}`));
    };
    if (q.accion) sumar('b.accion = ?', q.accion);
    if (q.usuario) sumar('u.username = ?', q.usuario);
    if (q.idPaciente) sumar('b.id_paciente = ?', q.idPaciente);
    if (q.desde) sumar(`${DIA_LOCAL} >= ?::date`, q.desde);
    if (q.hasta) sumar(`${DIA_LOCAL} <= ?::date`, q.hasta);
    const where = cond.join(' AND ');
    const desde = `FROM bitacora b LEFT JOIN usuario u ON u.id_usuario = b.id_usuario WHERE ${where}`;
    const [filas, conteo] = await Promise.all([
      this.db.query(
        `SELECT b.id_bitacora, b.momento, b.accion, b.entidad, b.id_registro, b.id_paciente, b.ip,
                u.id_usuario, u.username, u.nombre, u.rol
           ${desde}
          ORDER BY b.momento DESC, b.id_bitacora DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, q.porPagina, (q.pagina - 1) * q.porPagina],
      ),
      this.db.query(`SELECT count(*) AS total ${desde}`, params),
    ]);
    const items: EntradaBitacora[] = filas.rows.map((r) => ({
      id: String(r.id_bitacora),
      momento: (r.momento as Date).toISOString(),
      usuario: r.id_usuario === null ? null : { id: String(r.id_usuario), username: r.username, nombre: r.nombre, rol: r.rol },
      accion: r.accion,
      entidad: r.entidad,
      idRegistro: r.id_registro,
      idPaciente: r.id_paciente,
      ip: r.ip,
    }));
    return { items, total: Number(conteo.rows[0].total) };
  }

  /** "Quién vio a este paciente": un renglón por usuario, del acceso más reciente al más antiguo. */
  async accesosAPaciente(idInstitucion: string, idPaciente: string): Promise<AccesoPaciente[]> {
    const { rows } = await this.db.query(
      `SELECT u.id_usuario, u.username, u.nombre, u.rol, max(b.momento) AS ultimo,
              count(*) FILTER (WHERE b.accion IN ('LEER', 'EXPORTAR')) AS lecturas,
              count(*) FILTER (WHERE b.accion IN ('CREAR', 'MODIFICAR', 'BAJA')) AS modificaciones
         FROM bitacora b JOIN usuario u ON u.id_usuario = b.id_usuario
        WHERE b.id_institucion = $1 AND b.id_paciente = $2
        GROUP BY u.id_usuario
        ORDER BY ultimo DESC
        LIMIT 50`,
      [Number(idInstitucion), idPaciente],
    );
    return rows.map((r) => ({
      usuario: { id: String(r.id_usuario), username: r.username, nombre: r.nombre, rol: r.rol },
      ultimoAcceso: (r.ultimo as Date).toISOString(),
      lecturas: Number(r.lecturas),
      modificaciones: Number(r.modificaciones),
    }));
  }
}

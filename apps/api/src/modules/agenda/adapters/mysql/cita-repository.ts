import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { CitaDetalle, EstadoCita } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../../shared/errores.js';
import type { CitaRepository, NuevaCita } from '../../ports/cita-repository.js';

const SELECT = `
  SELECT c.id_cita, c.id_paciente, c.id_pediatra, c.fecha, DATE_FORMAT(c.hora, '%H:%i') AS hora,
         c.motivo, c.estado, p.nombres, p.apellidos, p.cui
    FROM cita c JOIN paciente p ON p.id_paciente = c.id_paciente`;

/**
 * Centro pediátrico · MySQL. En el ER la hora es TIMESTAMP (fecha y hora juntas) y no hay índices
 * parciales: la columna generada horario_activo vale NULL en citas canceladas, así que el UNIQUE
 * solo choca entre citas activas del mismo pediatra (ER_DUP_ENTRY).
 */
export class MysqlCitaRepository implements CitaRepository {
  constructor(private readonly db: mysql.Pool) {}

  async delMedico(idMedico: string, desde: string, hasta: string) {
    if (!/^\d+$/.test(idMedico)) return [];
    const [rows] = await this.db.query<RowDataPacket[]>(
      `${SELECT} WHERE c.id_pediatra = ? AND c.fecha BETWEEN ? AND ? ORDER BY c.fecha, c.hora, c.id_cita`,
      [Number(idMedico), desde, hasta],
    );
    return rows.map(aCita);
  }

  async proximasDelPaciente(idPaciente: string, desde: string) {
    if (!/^\d+$/.test(idPaciente)) return [];
    const [rows] = await this.db.query<RowDataPacket[]>(
      `${SELECT} WHERE c.id_paciente = ? AND c.fecha >= ? AND c.estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA')
        ORDER BY c.fecha, c.hora LIMIT 10`,
      [Number(idPaciente), desde],
    );
    return rows.map(aCita);
  }

  async obtener(id: string) {
    if (!/^\d+$/.test(id)) return null;
    const [rows] = await this.db.query<RowDataPacket[]>(`${SELECT} WHERE c.id_cita = ?`, [Number(id)]);
    return rows[0] ? aCita(rows[0]) : null;
  }

  async agendar(c: NuevaCita) {
    try {
      const [res] = await this.db.query<ResultSetHeader>(
        `INSERT INTO cita (id_paciente, id_pediatra, fecha, hora, motivo) VALUES (?, ?, ?, ?, ?)`,
        [Number(c.idPaciente), Number(c.idMedico), c.fecha, `${c.fecha} ${c.hora}:00`, c.motivo],
      );
      return String(res.insertId);
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'ER_DUP_ENTRY') throw new Conflicto(`El pediatra ya tiene una cita el ${c.fecha} a las ${c.hora}. Elija otro horario.`);
      if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new ReglaDeNegocio('El paciente o el pediatra no existen en el centro.');
      throw err;
    }
  }

  async cambiarEstado(id: string, desde: EstadoCita[], a: EstadoCita) {
    try {
      const [res] = await this.db.query<ResultSetHeader>(
        `UPDATE cita SET estado = ? WHERE id_cita = ? AND estado IN (?)`,
        [a, Number(id), desde],
      );
      return res.affectedRows > 0;
    } catch (err) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') throw new Conflicto('Ese horario ya lo ocupa otra cita.');
      throw err;
    }
  }

  async inasistencias(desde: string, hasta: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `${SELECT} WHERE c.estado = 'NO_ASISTIO' AND c.fecha BETWEEN ? AND ? ORDER BY c.fecha, c.hora`,
      [desde, hasta],
    );
    return rows.map(aCita);
  }
}

function aCita(r: RowDataPacket): CitaDetalle {
  return {
    id: String(r.id_cita),
    idPaciente: String(r.id_paciente),
    paciente: { nombres: r.nombres, apellidos: r.apellidos, cui: r.cui },
    idMedico: String(r.id_pediatra),
    idEspecialidad: null,
    fecha: r.fecha,
    hora: r.hora,
    motivo: r.motivo,
    estado: r.estado,
  };
}

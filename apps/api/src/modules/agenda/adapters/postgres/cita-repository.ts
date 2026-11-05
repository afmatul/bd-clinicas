import type pg from 'pg';
import type { CitaDetalle, EstadoCita } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../../shared/errores.js';
import type { CitaRepository, NuevaCita } from '../../ports/cita-repository.js';

const SELECT = `
  SELECT c.id_cita, c.id_paciente, c.id_medico, c.id_especialidad, c.fecha, to_char(c.hora, 'HH24:MI') AS hora,
         c.motivo, c.estado, p.nombres, p.apellidos, p.cui
    FROM cita c JOIN paciente p ON p.id_paciente = c.id_paciente`;

/**
 * Hospital general · PostgreSQL. El doble agendamiento lo impide el índice único parcial
 * cita_medico_horario_uq (solo cuenta citas activas): dos recepcionistas a la vez → una recibe 23505.
 */
export class PostgresCitaRepository implements CitaRepository {
  constructor(private readonly db: pg.Pool) {}

  async delMedico(idMedico: string, desde: string, hasta: string) {
    if (!/^\d+$/.test(idMedico)) return [];
    const { rows } = await this.db.query(
      `${SELECT} WHERE c.id_medico = $1 AND c.fecha BETWEEN $2 AND $3 ORDER BY c.fecha, c.hora, c.id_cita`,
      [Number(idMedico), desde, hasta],
    );
    return rows.map(aCita);
  }

  async proximasDelPaciente(idPaciente: string, desde: string) {
    if (!/^\d+$/.test(idPaciente)) return [];
    const { rows } = await this.db.query(
      `${SELECT} WHERE c.id_paciente = $1 AND c.fecha >= $2 AND c.estado IN ('PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA')
        ORDER BY c.fecha, c.hora LIMIT 10`,
      [Number(idPaciente), desde],
    );
    return rows.map(aCita);
  }

  async obtener(id: string) {
    if (!/^\d+$/.test(id)) return null;
    const { rows } = await this.db.query(`${SELECT} WHERE c.id_cita = $1`, [Number(id)]);
    return rows[0] ? aCita(rows[0]) : null;
  }

  async agendar(c: NuevaCita) {
    try {
      const { rows } = await this.db.query(
        `INSERT INTO cita (id_paciente, id_medico, id_especialidad, fecha, hora, motivo)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_cita`,
        [Number(c.idPaciente), Number(c.idMedico), c.idEspecialidad ? Number(c.idEspecialidad) : null, c.fecha, c.hora, c.motivo],
      );
      return String(rows[0].id_cita);
    } catch (err) {
      const e = err as { code?: string; constraint?: string };
      if (e.code === '23505') throw new Conflicto(`El médico ya tiene una cita el ${c.fecha} a las ${c.hora}. Elija otro horario.`);
      if (e.code === '23503') throw new ReglaDeNegocio('El paciente, el médico o la especialidad no existen en el hospital.');
      throw err;
    }
  }

  async cambiarEstado(id: string, desde: EstadoCita[], a: EstadoCita) {
    try {
      const { rowCount } = await this.db.query(
        `UPDATE cita SET estado = $2 WHERE id_cita = $1 AND estado = ANY($3::varchar[])`,
        [Number(id), a, desde],
      );
      return (rowCount ?? 0) > 0;
    } catch (err) {
      // Reactivar una cita cuyo horario ya ocupó otra.
      if ((err as { code?: string }).code === '23505') throw new Conflicto('Ese horario ya lo ocupa otra cita.');
      throw err;
    }
  }

  async inasistencias(desde: string, hasta: string) {
    const { rows } = await this.db.query(
      `${SELECT} WHERE c.estado = 'NO_ASISTIO' AND c.fecha BETWEEN $1 AND $2 ORDER BY c.fecha, c.hora`,
      [desde, hasta],
    );
    return rows.map(aCita);
  }
}

function aCita(r: Record<string, any>): CitaDetalle {
  return {
    id: String(r.id_cita),
    idPaciente: String(r.id_paciente),
    paciente: { nombres: r.nombres, apellidos: r.apellidos, cui: r.cui },
    idMedico: String(r.id_medico),
    idEspecialidad: r.id_especialidad != null ? String(r.id_especialidad) : null,
    fecha: r.fecha,
    hora: r.hora,
    motivo: r.motivo,
    estado: r.estado,
  };
}

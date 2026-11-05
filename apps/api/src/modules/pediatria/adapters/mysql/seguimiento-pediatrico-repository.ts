import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { AplicarDosisInput, Dosis, DosisVencida, Responsable, Vacuna } from '@red-clinica/shared';
import { Conflicto } from '../../../../shared/errores.js';
import type {
  MenorPediatrico, NuevaMedicion, SeguimientoPediatricoRepository,
} from '../../ports/seguimiento-pediatrico-repository.js';

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Las UNIQUE de la base son la última defensa ante dos registros simultáneos. */
async function sinDuplicado<T>(fn: () => Promise<T>, mensaje: string): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new Conflicto(mensaje);
    throw e;
  }
}

/** Centro pediátrico · MySQL InnoDB: medicion_crecimiento, vacuna e historial_vacunacion. */
export class MysqlSeguimientoPediatricoRepository implements SeguimientoPediatricoRepository {
  constructor(private readonly db: mysql.Pool) {}

  async menor(id: string): Promise<MenorPediatrico | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT p.id_paciente, p.fecha_nacimiento, p.sexo, p.estado, p.fecha_baja, p.motivo_baja,
              CONCAT(pe.nombres, ' ', pe.apellidos) AS pediatra_baja
         FROM paciente p LEFT JOIN pediatra pe ON pe.id_usuario = p.id_pediatra_baja
        WHERE p.id_paciente = ?`,
      [Number(id)],
    );
    const p = rows[0];
    if (!p) return null;
    return {
      id: String(p.id_paciente),
      fechaNacimiento: p.fecha_nacimiento,
      sexo: p.sexo,
      estado: p.estado,
      baja: p.estado === 'BAJA' ? { fecha: p.fecha_baja, motivo: p.motivo_baja, pediatra: p.pediatra_baja ?? null } : null,
    };
  }

  registrarMedicion(id: string, m: NuevaMedicion): Promise<string> {
    return sinDuplicado(async () => {
      const [r] = await this.db.query<ResultSetHeader>(
        `INSERT INTO medicion_crecimiento
           (id_paciente, fecha_medicion, peso_kg, talla_cm, perimetro_cefalico_cm, observaciones,
            percentil_peso_edad, percentil_talla_edad, percentil_peso_talla)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [Number(id), m.fecha, m.pesoKg, m.tallaCm, m.perimetroCefalicoCm ?? null, m.observaciones || null,
          m.percentilPesoEdad, m.percentilTallaEdad, m.percentilPesoTalla],
      );
      return String(r.insertId);
    }, 'Ya hay una medición registrada en esa fecha.');
  }

  async curva(id: string) {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM medicion_crecimiento WHERE id_paciente = ? ORDER BY fecha_medicion DESC`,
      [Number(id)],
    );
    return rows.map((r) => ({
      id: String(r.id_medicion),
      fecha: r.fecha_medicion,
      pesoKg: num(r.peso_kg),
      tallaCm: num(r.talla_cm),
      perimetroCefalicoCm: num(r.perimetro_cefalico_cm),
      percentilPesoEdad: num(r.percentil_peso_edad),
      percentilTallaEdad: num(r.percentil_talla_edad),
      percentilPesoTalla: num(r.percentil_peso_talla),
      observaciones: r.observaciones,
    }));
  }

  async vacunas(): Promise<Vacuna[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT * FROM vacuna ORDER BY id_vacuna`);
    return rows.map(aVacuna);
  }

  async vacuna(id: string): Promise<Vacuna | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(`SELECT * FROM vacuna WHERE id_vacuna = ?`, [Number(id)]);
    return rows[0] ? aVacuna(rows[0]) : null;
  }

  async dosisDelPaciente(id: string): Promise<(Dosis & { idVacuna: string })[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT * FROM historial_vacunacion WHERE id_paciente = ? ORDER BY id_vacuna, numero_dosis`,
      [Number(id)],
    );
    return rows.map((r) => ({
      id: String(r.id_dosis),
      idVacuna: String(r.id_vacuna),
      numeroDosis: r.numero_dosis,
      fechaAplicacion: r.fecha_aplicacion,
      lote: num(r.lote),
      fechaProximaDosis: r.fecha_proxima_dosis,
      observaciones: r.observaciones,
    }));
  }

  aplicarDosis(id: string, d: AplicarDosisInput): Promise<string> {
    return sinDuplicado(async () => {
      const [r] = await this.db.query<ResultSetHeader>(
        `INSERT INTO historial_vacunacion
           (id_paciente, id_vacuna, numero_dosis, fecha_aplicacion, lote, fecha_proxima_dosis, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [Number(id), Number(d.idVacuna), d.numeroDosis, d.fechaAplicacion, d.lote ?? null,
          d.fechaProximaDosis ?? null, d.observaciones || null],
      );
      return String(r.insertId);
    }, `La dosis ${d.numeroDosis} de esa vacuna ya está registrada.`);
  }

  async responsables(id: string): Promise<Responsable[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT r.id_responsable, r.nombre_completo, r.parentesco, r.es_tutor_legal,
              GROUP_CONCAT(rt.telefono ORDER BY rt.id_telefono SEPARATOR ',') AS telefonos
         FROM responsable r LEFT JOIN responsable_telefono rt ON rt.id_responsable = r.id_responsable
        WHERE r.id_paciente = ?
        GROUP BY r.id_responsable, r.nombre_completo, r.parentesco, r.es_tutor_legal
        ORDER BY r.es_tutor_legal DESC, r.id_responsable`,
      [Number(id)],
    );
    return rows.map((r) => ({
      id: String(r.id_responsable),
      nombreCompleto: r.nombre_completo,
      parentesco: r.parentesco,
      esTutorLegal: !!r.es_tutor_legal,
      telefonos: r.telefonos ? String(r.telefonos).split(',') : [],
    }));
  }

  /** Usa el índice proxima_dosis_idx; la última dosis de cada esquema se busca con NOT EXISTS. */
  async dosisVencidas(hasta: string): Promise<DosisVencida[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT p.id_paciente, p.nombres, p.apellidos, p.fecha_nacimiento,
              v.id_vacuna, v.nombre, v.dosis_totales, h.numero_dosis, h.fecha_proxima_dosis
         FROM historial_vacunacion h
         JOIN vacuna v ON v.id_vacuna = h.id_vacuna
         JOIN paciente p ON p.id_paciente = h.id_paciente
        WHERE h.fecha_proxima_dosis < ?
          AND h.numero_dosis < v.dosis_totales
          AND p.estado = 'ACTIVO'
          AND NOT EXISTS (SELECT 1 FROM historial_vacunacion s
                           WHERE s.id_paciente = h.id_paciente AND s.id_vacuna = h.id_vacuna
                             AND s.numero_dosis > h.numero_dosis)
        ORDER BY h.fecha_proxima_dosis, p.apellidos`,
      [hasta],
    );
    return rows.map((r) => ({
      idPaciente: String(r.id_paciente),
      nombres: r.nombres,
      apellidos: r.apellidos,
      fechaNacimiento: r.fecha_nacimiento,
      idVacuna: String(r.id_vacuna),
      vacuna: r.nombre,
      numeroDosis: r.numero_dosis + 1,
      dosisTotales: r.dosis_totales,
      fechaProximaDosis: r.fecha_proxima_dosis,
    }));
  }
}

function aVacuna(r: RowDataPacket): Vacuna {
  return { id: String(r.id_vacuna), nombre: r.nombre, dosisTotales: r.dosis_totales };
}

import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ReglaDeNegocio } from '../../../../shared/errores.js';
import type { CierreDeConsulta, ConsultaRepository, NuevaConsulta } from '../../ports/consulta-repository.js';
import { ensamblarConsultas } from '../sql-ensamblar.js';

const esId = (id: string) => /^\d+$/.test(id);

/**
 * Centro pediátrico · MySQL InnoDB. Mismo cierre transaccional que el hospital; el médico es
 * id_pediatra y la consulta no guarda peso ni talla (eso va en medicion_crecimiento, módulo pediatria).
 */
export class MysqlConsultaRepository implements ConsultaRepository {
  constructor(private readonly db: mysql.Pool) {}

  async abrir(d: NuevaConsulta) {
    const [res] = await this.db.query<ResultSetHeader>(
      `INSERT INTO consulta (id_paciente, id_cita, id_pediatra, fecha, hora, motivo_consulta) VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(d.idPaciente), d.idCita ? Number(d.idCita) : null, Number(d.idMedico), d.fecha, d.hora, d.motivo],
    );
    return String(res.insertId);
  }

  async obtener(id: string) {
    if (!esId(id)) return null;
    return (await this.cargar([Number(id)]))[0] ?? null;
  }

  async abiertaDe(idPaciente: string, idMedico: string) {
    if (!esId(idPaciente) || !esId(idMedico)) return null;
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT c.id_consulta FROM consulta c
        WHERE c.id_paciente = ? AND c.id_pediatra = ?
          AND NOT EXISTS (SELECT 1 FROM diagnostico d WHERE d.id_consulta = c.id_consulta)
        ORDER BY c.fecha DESC, c.hora DESC LIMIT 1`,
      [Number(idPaciente), Number(idMedico)],
    );
    return rows[0] ? this.obtener(String(rows[0].id_consulta)) : null;
  }

  async guardarBorrador(id: string, d: { motivo?: string; historiaEnfermedadActual?: string }) {
    await this.db.query(
      `UPDATE consulta SET motivo_consulta = COALESCE(?, motivo_consulta),
              historia_enfermedad_actual = COALESCE(?, historia_enfermedad_actual) WHERE id_consulta = ?`,
      [d.motivo ?? null, d.historiaEnfermedadActual ?? null, Number(id)],
    );
  }

  async cerrar(id: string, x: CierreDeConsulta) {
    const c = await this.db.getConnection();
    try {
      await c.beginTransaction();
      const [bloqueo] = await c.query<RowDataPacket[]>(`SELECT id_consulta FROM consulta WHERE id_consulta = ? FOR UPDATE`, [Number(id)]);
      const [ya] = await c.query<RowDataPacket[]>(`SELECT 1 FROM diagnostico WHERE id_consulta = ? LIMIT 1`, [Number(id)]);
      if (!bloqueo.length || ya.length) { await c.rollback(); return false; }

      await c.query(
        `UPDATE consulta SET motivo_consulta = ?, historia_enfermedad_actual = ?, notas_evolucion = ?, observaciones = ?
          WHERE id_consulta = ?`,
        [x.motivo, x.historiaEnfermedadActual ?? null, x.notasEvolucion ?? null, x.observaciones ?? null, Number(id)],
      );
      const s = x.signos;
      if (Object.values(s).some((v) => v !== undefined)) {
        await c.query(
          `INSERT INTO signos_vitales (id_consulta, presion_sistolica, presion_diastolica, frecuencia_cardiaca,
                  frecuencia_respiratoria, saturacion_oxigeno, temperatura_c) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Number(id), s.presionSistolica ?? null, s.presionDiastolica ?? null, s.frecuenciaCardiaca ?? null,
            s.frecuenciaRespiratoria ?? null, s.saturacionOxigeno ?? null, s.temperaturaC ?? null],
        );
      }
      for (const d of x.diagnosticos) {
        const [dx] = await c.query<ResultSetHeader>(
          `INSERT INTO diagnostico (id_consulta, tipo, observaciones, diagnostico_final_enfermedad_detectada) VALUES (?, ?, ?, ?)`,
          [Number(id), d.tipo, d.observaciones ?? null, d.enfermedadDetectada],
        );
        for (const t of d.tratamientos) {
          const [tx] = await c.query<ResultSetHeader>(
            `INSERT INTO tratamiento (id_diagnostico, tipo, descripcion, indicaciones, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)`,
            [dx.insertId, t.tipo, t.descripcion, t.indicaciones ?? null, t.fechaInicio ?? null, t.fechaFin ?? null],
          );
          if (!t.receta) continue;
          const [rx] = await c.query<ResultSetHeader>(
            `INSERT INTO receta (id_tratamiento, id_pediatra, fecha_emision, observaciones) VALUES (?, ?, ?, ?)`,
            [tx.insertId, Number(x.idMedico), x.fechaEmision, t.receta.observaciones ?? null],
          );
          for (const r of t.receta.renglones) {
            await c.query(
              `INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, via_administracion, frecuencia_horas,
                      duracion_dias, cantidad, indicaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [rx.insertId, Number(r.idMedicamento), r.dosis, r.viaAdministracion ?? null, r.frecuenciaHoras ?? null,
                r.duracionDias ?? null, r.cantidad ?? null, r.indicaciones ?? null],
            );
          }
        }
      }
      await c.commit();
      return true;
    } catch (err) {
      await c.rollback();
      if ((err as { code?: string }).code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        throw new ReglaDeNegocio('Un valor está fuera del rango permitido; no se guardó nada de la consulta.');
      }
      throw err;
    } finally {
      c.release();
    }
  }

  async historial(idPaciente: string) {
    if (!esId(idPaciente)) return [];
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT id_consulta FROM consulta WHERE id_paciente = ? ORDER BY fecha DESC, hora DESC, id_consulta DESC`,
      [Number(idPaciente)],
    );
    return this.cargar(rows.map((r) => r.id_consulta));
  }

  private async cargar(ids: number[]) {
    if (!ids.length) return [];
    const q = async (sql: string) => (await this.db.query<RowDataPacket[]>(sql, [ids]))[0];
    const [consultas, signos, diagnosticos, tratamientos, recetas, detalles] = await Promise.all([
      q(`SELECT c.*, c.id_pediatra AS id_medico, TIME_FORMAT(c.hora, '%H:%i') AS hora FROM consulta c WHERE c.id_consulta IN (?)`),
      q(`SELECT s.* FROM signos_vitales s WHERE s.id_signos_vitales IN
           (SELECT MAX(id_signos_vitales) FROM signos_vitales WHERE id_consulta IN (?) GROUP BY id_consulta)`),
      q(`SELECT * FROM diagnostico WHERE id_consulta IN (?) ORDER BY id_diagnostico`),
      q(`SELECT t.* FROM tratamiento t JOIN diagnostico d USING (id_diagnostico) WHERE d.id_consulta IN (?) ORDER BY t.id_tratamiento`),
      q(`SELECT r.*, r.id_pediatra AS id_medico, d.id_consulta FROM receta r JOIN tratamiento t USING (id_tratamiento)
           JOIN diagnostico d USING (id_diagnostico) WHERE d.id_consulta IN (?)`),
      q(`SELECT rd.*, m.nombre, m.presentacion FROM receta_detalle rd
           JOIN medicamento m USING (id_medicamento) JOIN receta r USING (id_receta)
           JOIN tratamiento t USING (id_tratamiento) JOIN diagnostico d USING (id_diagnostico)
          WHERE d.id_consulta IN (?) ORDER BY rd.id_receta_detalle`),
    ]);
    const orden = new Map(ids.map((id, i) => [String(id), i]));
    consultas.sort((a, b) => orden.get(String(a.id_consulta))! - orden.get(String(b.id_consulta))!);
    return ensamblarConsultas({ consultas, signos, diagnosticos, tratamientos, recetas, detalles });
  }
}

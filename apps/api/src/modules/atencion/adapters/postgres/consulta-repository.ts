import type pg from 'pg';
import { ReglaDeNegocio } from '../../../../shared/errores.js';
import type { CierreDeConsulta, ConsultaRepository, NuevaConsulta } from '../../ports/consulta-repository.js';
import { ensamblarConsultas } from '../sql-ensamblar.js';

const esId = (id: string) => /^\d+$/.test(id);

/**
 * Hospital general · PostgreSQL. El cierre es una transacción sobre consulta, signos_vitales,
 * diagnostico, tratamiento, receta y receta_detalle; si un CHECK falla, no queda nada a medias.
 */
export class PostgresConsultaRepository implements ConsultaRepository {
  constructor(private readonly db: pg.Pool) {}

  async abrir(d: NuevaConsulta) {
    const { rows } = await this.db.query(
      `INSERT INTO consulta (id_paciente, id_cita, id_medico, fecha, hora, motivo_consulta)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_consulta`,
      [Number(d.idPaciente), d.idCita ? Number(d.idCita) : null, Number(d.idMedico), d.fecha, d.hora, d.motivo],
    );
    return String(rows[0].id_consulta);
  }

  async obtener(id: string) {
    if (!esId(id)) return null;
    return (await this.cargar([Number(id)]))[0] ?? null;
  }

  async abiertaDe(idPaciente: string, idMedico: string) {
    if (!esId(idPaciente) || !esId(idMedico)) return null;
    const { rows } = await this.db.query(
      `SELECT c.id_consulta FROM consulta c
        WHERE c.id_paciente = $1 AND c.id_medico = $2
          AND NOT EXISTS (SELECT 1 FROM diagnostico d WHERE d.id_consulta = c.id_consulta)
        ORDER BY c.fecha DESC, c.hora DESC LIMIT 1`,
      [Number(idPaciente), Number(idMedico)],
    );
    return rows[0] ? this.obtener(String(rows[0].id_consulta)) : null;
  }

  async guardarBorrador(id: string, d: { motivo?: string; historiaEnfermedadActual?: string }) {
    await this.db.query(
      `UPDATE consulta SET motivo_consulta = COALESCE($2, motivo_consulta),
              historia_enfermedad_actual = COALESCE($3, historia_enfermedad_actual)
        WHERE id_consulta = $1`,
      [Number(id), d.motivo ?? null, d.historiaEnfermedadActual ?? null],
    );
  }

  async cerrar(id: string, x: CierreDeConsulta) {
    const c = await this.db.connect();
    try {
      await c.query('BEGIN');
      // Bloquea la consulta: un segundo cierre simultáneo espera y luego ve los diagnósticos.
      const bloqueo = await c.query(`SELECT id_consulta FROM consulta WHERE id_consulta = $1 FOR UPDATE`, [Number(id)]);
      if (!bloqueo.rowCount) { await c.query('ROLLBACK'); return false; }
      const ya = await c.query(`SELECT 1 FROM diagnostico WHERE id_consulta = $1 LIMIT 1`, [Number(id)]);
      if (ya.rowCount) { await c.query('ROLLBACK'); return false; }

      await c.query(
        `UPDATE consulta SET motivo_consulta = $2, historia_enfermedad_actual = $3, notas_evolucion = $4,
                observaciones = $5, peso_kg = $6, talla_cm = $7 WHERE id_consulta = $1`,
        [Number(id), x.motivo, x.historiaEnfermedadActual ?? null, x.notasEvolucion ?? null, x.observaciones ?? null,
          x.pesoKg ?? null, x.tallaCm ?? null],
      );
      const s = x.signos;
      if (Object.values(s).some((v) => v !== undefined)) {
        await c.query(
          `INSERT INTO signos_vitales (id_consulta, presion_sistolica, presion_diastolica, frecuencia_cardiaca,
                  frecuencia_respiratoria, saturacion_oxigeno, temperatura_c) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [Number(id), s.presionSistolica ?? null, s.presionDiastolica ?? null, s.frecuenciaCardiaca ?? null,
            s.frecuenciaRespiratoria ?? null, s.saturacionOxigeno ?? null, s.temperaturaC ?? null],
        );
      }
      for (const d of x.diagnosticos) {
        const dx = await c.query(
          `INSERT INTO diagnostico (id_consulta, tipo, observaciones, diagnostico_final_enfermedad_detectada)
           VALUES ($1, $2, $3, $4) RETURNING id_diagnostico`,
          [Number(id), d.tipo, d.observaciones ?? null, d.enfermedadDetectada],
        );
        for (const t of d.tratamientos) {
          const tx = await c.query(
            `INSERT INTO tratamiento (id_diagnostico, tipo, descripcion, indicaciones, fecha_inicio, fecha_fin)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_tratamiento`,
            [dx.rows[0].id_diagnostico, t.tipo, t.descripcion, t.indicaciones ?? null, t.fechaInicio ?? null, t.fechaFin ?? null],
          );
          if (!t.receta) continue;
          const rx = await c.query(
            `INSERT INTO receta (id_tratamiento, id_medico, fecha_emision, observaciones) VALUES ($1, $2, $3, $4) RETURNING id_receta`,
            [tx.rows[0].id_tratamiento, Number(x.idMedico), x.fechaEmision, t.receta.observaciones ?? null],
          );
          for (const r of t.receta.renglones) {
            await c.query(
              `INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, via_administracion, frecuencia_horas,
                      duracion_dias, cantidad, indicaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [rx.rows[0].id_receta, Number(r.idMedicamento), r.dosis, r.viaAdministracion ?? null, r.frecuenciaHoras ?? null,
                r.duracionDias ?? null, r.cantidad ?? null, r.indicaciones ?? null],
            );
          }
        }
      }
      await c.query('COMMIT');
      return true;
    } catch (err) {
      await c.query('ROLLBACK');
      if ((err as { code?: string }).code === '23514') {
        throw new ReglaDeNegocio('Un valor está fuera del rango permitido; no se guardó nada de la consulta.');
      }
      throw err;
    } finally {
      c.release();
    }
  }

  async historial(idPaciente: string) {
    if (!esId(idPaciente)) return [];
    const { rows } = await this.db.query(
      `SELECT id_consulta FROM consulta WHERE id_paciente = $1 ORDER BY fecha DESC, hora DESC, id_consulta DESC`,
      [Number(idPaciente)],
    );
    return this.cargar(rows.map((r) => r.id_consulta));
  }

  /** Seis lecturas para todas las consultas pedidas, en el orden en que llegan los ids. */
  private async cargar(ids: number[]) {
    if (!ids.length) return [];
    const q = (sql: string) => this.db.query(sql, [ids]).then((r) => r.rows);
    const [consultas, signos, diagnosticos, tratamientos, recetas, detalles] = await Promise.all([
      q(`SELECT * FROM consulta WHERE id_consulta = ANY($1)`),
      q(`SELECT DISTINCT ON (id_consulta) * FROM signos_vitales WHERE id_consulta = ANY($1) ORDER BY id_consulta, id_signos_vitales DESC`),
      q(`SELECT * FROM diagnostico WHERE id_consulta = ANY($1) ORDER BY id_diagnostico`),
      q(`SELECT t.* FROM tratamiento t JOIN diagnostico d USING (id_diagnostico) WHERE d.id_consulta = ANY($1) ORDER BY t.id_tratamiento`),
      q(`SELECT r.*, d.id_consulta FROM receta r JOIN tratamiento t USING (id_tratamiento) JOIN diagnostico d USING (id_diagnostico)
          WHERE d.id_consulta = ANY($1)`),
      q(`SELECT rd.*, m.nombre, m.presentacion, m.concentracion FROM receta_detalle rd
           JOIN medicamento m USING (id_medicamento) JOIN receta r USING (id_receta)
           JOIN tratamiento t USING (id_tratamiento) JOIN diagnostico d USING (id_diagnostico)
          WHERE d.id_consulta = ANY($1) ORDER BY rd.id_receta_detalle`),
    ]);
    const orden = new Map(ids.map((id, i) => [String(id), i]));
    consultas.sort((a, b) => orden.get(String(a.id_consulta))! - orden.get(String(b.id_consulta))!);
    return ensamblarConsultas({ consultas, signos, diagnosticos, tratamientos, recetas, detalles });
  }
}

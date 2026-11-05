import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { edadEnAnios } from '../../../../shared/fechas.js';
import { calcularPercentiles } from '../../domain/crecimiento.js';

/**
 * Datos de demostración del módulo pediatria (los del prototipo). Idempotente: se salta
 * lo que ya existe. Lo llama src/scripts/seed.ts.
 */

const VACUNAS: [string, number][] = [
  ['BCG', 1], ['Hepatitis B', 3], ['Pentavalente', 3], ['Polio (IPV/OPV)', 4], ['SPR', 2], ['DPT refuerzo', 2],
];

interface Menor {
  cui: string; nombres: string; apellidos: string; nacimiento: string; sexo: 'F' | 'M'; sangre: string; direccion: string;
  responsables: { nombre: string; parentesco: string; tutor: boolean; telefono: string }[];
  alergias: { tipo: string; descripcion: string; severidad: 'LEVE' | 'MODERADA' | 'SEVERA' }[];
  /** fecha, peso, talla, perímetro cefálico y, si la OMS no cubre la edad, percentiles leídos de la curva. */
  mediciones: [string, number, number, number, [number, number, number]?][];
  /** vacuna, fechas de aplicación en orden, próxima dosis. */
  dosis: [string, string[], string?][];
}

const MENORES: Menor[] = [
  {
    cui: '3301445670101', nombres: 'Mateo', apellidos: 'Juárez Coc', nacimiento: '2020-04-02', sexo: 'M', sangre: 'A+',
    direccion: 'Zona 7, Ciudad de Guatemala',
    responsables: [
      { nombre: 'Andrea Coc de Juárez', parentesco: 'Madre', tutor: true, telefono: '55218890' },
      { nombre: 'Pedro Juárez', parentesco: 'Padre', tutor: false, telefono: '44021176' },
    ],
    alergias: [{ tipo: 'Alimentaria', descripcion: 'Huevo', severidad: 'MODERADA' }],
    // Mayor de 5 años: las tablas OMS 0–5 no lo cubren; percentiles del prototipo.
    mediciones: [
      ['2025-05-05', 17.8, 106.1, 50.5, [53, 50, 55]],
      ['2025-11-04', 19.0, 110.2, 50.8, [55, 52, 57]],
      ['2026-05-06', 20.4, 114.0, 51.0, [58, 55, 60]],
      ['2026-11-05', 22.1, 118.5, 51.2, [62, 58, 64]],
    ],
    dosis: [
      ['BCG', ['2020-04-03']],
      ['Hepatitis B', ['2020-04-03', '2020-06-04', '2020-10-05']],
      ['Pentavalente', ['2020-06-04', '2020-08-06'], '2026-10-12'],
      ['Polio (IPV/OPV)', ['2020-06-04', '2020-08-06', '2020-10-05'], '2027-01-15'],
      ['SPR', ['2021-04-05', '2021-10-04']],
      ['DPT refuerzo', ['2021-10-04'], '2027-03-12'],
    ],
  },
  {
    cui: '3415220980101', nombres: 'Valentina', apellidos: 'Ajú Sic', nacimiento: '2025-09-10', sexo: 'F', sangre: 'O+',
    direccion: 'Mixco, Guatemala',
    responsables: [{ nombre: 'Lucía Sic', parentesco: 'Madre', tutor: true, telefono: '30447812' }],
    alergias: [],
    // Menor de 5 años: la API calcula los percentiles con la OMS.
    mediciones: [
      ['2025-11-10', 5.0, 57.4, 38.4],
      ['2026-03-10', 7.2, 65.9, 42.0],
      ['2026-07-10', 8.4, 71.8, 44.1],
      ['2026-11-04', 9.1, 75.3, 45.2],
    ],
    dosis: [
      ['BCG', ['2025-09-11']],
      ['Hepatitis B', ['2025-09-11', '2025-11-10'], '2026-03-10'],
      ['Pentavalente', ['2025-11-10', '2026-01-12', '2026-03-10']],
      ['Polio (IPV/OPV)', ['2025-11-10', '2026-01-12'], '2026-11-20'],
    ],
  },
];

export async function sembrarPediatria(db: mysql.Pool): Promise<void> {
  for (const [nombre, total] of VACUNAS) {
    await db.query(`INSERT INTO vacuna (nombre, dosis_totales) VALUES (?, ?) ON DUPLICATE KEY UPDATE dosis_totales = VALUES(dosis_totales)`, [nombre, total]);
  }
  const [vs] = await db.query<RowDataPacket[]>(`SELECT id_vacuna, nombre FROM vacuna`);
  const idVacuna = new Map(vs.map((v) => [v.nombre as string, v.id_vacuna as number]));

  let nuevos = 0;
  for (const m of MENORES) {
    const [ya] = await db.query<RowDataPacket[]>(`SELECT 1 FROM paciente WHERE cui = ?`, [m.cui]);
    if (ya.length) continue;
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      const [p] = await c.query<ResultSetHeader>(
        `INSERT INTO paciente (cui, nombres, apellidos, fecha_nacimiento, edad, sexo, tipo_sangre, direccion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.cui, m.nombres, m.apellidos, m.nacimiento, edadEnAnios(m.nacimiento), m.sexo, m.sangre, m.direccion],
      );
      const id = p.insertId;
      for (const r of m.responsables) {
        const [rr] = await c.query<ResultSetHeader>(
          `INSERT INTO responsable (id_paciente, nombre_completo, parentesco, direccion, es_tutor_legal) VALUES (?, ?, ?, ?, ?)`,
          [id, r.nombre, r.parentesco, m.direccion, r.tutor],
        );
        await c.query(`INSERT INTO responsable_telefono (id_responsable, telefono) VALUES (?, ?)`, [rr.insertId, r.telefono]);
      }
      for (const a of m.alergias) {
        await c.query(`INSERT INTO alergia (id_paciente, tipo, descripcion, severidad) VALUES (?, ?, ?, ?)`, [id, a.tipo, a.descripcion, a.severidad]);
      }
      for (const [fecha, pesoKg, tallaCm, pc, manual] of m.mediciones) {
        const oms = calcularPercentiles({ fechaNacimiento: m.nacimiento, sexo: m.sexo }, { fecha, pesoKg, tallaCm });
        await c.query(
          `INSERT INTO medicion_crecimiento (id_paciente, fecha_medicion, peso_kg, talla_cm, perimetro_cefalico_cm,
             percentil_peso_edad, percentil_talla_edad, percentil_peso_talla) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, fecha, pesoKg, tallaCm, pc, oms.percentilPesoEdad ?? manual?.[0] ?? null,
            oms.percentilTallaEdad ?? manual?.[1] ?? null, oms.percentilPesoTalla ?? manual?.[2] ?? null],
        );
      }
      for (const [vacuna, fechas, proxima] of m.dosis) {
        for (const [i, fecha] of fechas.entries()) {
          await c.query(
            `INSERT INTO historial_vacunacion (id_paciente, id_vacuna, numero_dosis, fecha_aplicacion, lote, fecha_proxima_dosis)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, idVacuna.get(vacuna), i + 1, fecha, 20000 + i * 137, i === fechas.length - 1 ? (proxima ?? null) : null],
          );
        }
      }
      await c.commit();
      nuevos++;
    } catch (e) {
      await c.rollback();
      throw e;
    } finally {
      c.release();
    }
  }
  console.log(`Centro pediátrico: ${VACUNAS.length} vacunas en el catálogo, ${nuevos} expedientes pediátricos nuevos.`);
}

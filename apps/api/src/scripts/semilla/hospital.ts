/** Hospital general · PostgreSQL. Todo en una transacción: o se carga completo o no se carga. */
import type pg from 'pg';
import { MEDICAMENTOS_ADULTO } from './catalogos.js';
import { ADULTOS, DEPARTAMENTOS, ESPECIALIDADES, MEDICOS_HOSPITAL, type Adulto } from './personas.js';
import { notas, pesoEnConsulta, planHospital, recetaPara, signosAdulto } from './plan.js';
import { azar, edadEn, HOY, sumarDias } from './util.js';

export interface ResultadoHospital {
  medicos: Record<string, string>;     // clave → id_medico
  pacientes: Record<string, string>;   // clave → id_paciente
  consultas: { idPaciente: string; idConsulta: string; medico: string; fecha: string }[];
  omitido: boolean;
}

export function medicoHospitalPara(caso: string, rng: ReturnType<typeof azar>) {
  const pick = (m: string, especialidad: string) => ({ medico: m, especialidad });
  switch (caso) {
    case 'hta-doble': case 'dolor-toracico': case 'dislipidemia': return pick('cmendez', 'Cardiología');
    case 'dm2': case 'hipotiroidismo': return rng.prob(0.5) ? pick('snatareno', 'Endocrinología') : pick('aperez', 'Medicina interna');
    case 'asma': return pick('jochoa', 'Neumología');
    case 'colecistitis': case 'postoperatorio': return pick('restrada', 'Cirugía general');
    case 'faringo': case 'lumbalgia': case 'itu': return rng.prob(0.4) ? pick('mbarillas', 'Medicina de emergencias') : pick('aperez', 'Medicina general');
    default: return rng.prob(0.7) ? pick('aperez', 'Medicina interna') : pick('mbarillas', 'Medicina general');
  }
}

export async function sembrarHospital(pool: pg.Pool): Promise<ResultadoHospital> {
  const db = await pool.connect();
  const rng = azar(502);
  const res: ResultadoHospital = { medicos: {}, pacientes: {}, consultas: [], omitido: false };
  try {
    await db.query('BEGIN');
    const uno = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows[0];

    // Personal, departamentos y especialidades (idempotente por claves únicas).
    const deps: Record<string, number> = {};
    for (const d of DEPARTAMENTOS) {
      deps[d.nombre] = (await uno(
        `INSERT INTO departamento (nombre, ubicacion, extension_telefonica) VALUES ($1, $2, $3)
         ON CONFLICT (nombre) DO UPDATE SET ubicacion = EXCLUDED.ubicacion RETURNING id_departamento`, [d.nombre, d.ubicacion, d.extension],
      )).id_departamento;
    }
    const esps: Record<string, number> = {};
    for (const e of ESPECIALIDADES) {
      esps[e.nombre] = (await uno(
        `INSERT INTO especialidad (id_departamento, nombre, descripcion) VALUES ($1, $2, $3)
         ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion RETURNING id_especialidad`, [deps[e.departamento], e.nombre, e.descripcion],
      )).id_especialidad;
    }
    for (const m of MEDICOS_HOSPITAL) {
      const id = (await uno(
        `INSERT INTO medico (nombres, apellidos, numero_colegiado) VALUES ($1, $2, $3)
         ON CONFLICT (numero_colegiado) DO UPDATE SET nombres = EXCLUDED.nombres, apellidos = EXCLUDED.apellidos RETURNING id_medico`,
        [m.nombres, m.apellidos, m.colegiado],
      )).id_medico;
      res.medicos[m.clave] = String(id);
      for (const e of m.especialidades) {
        await db.query(`INSERT INTO medico_especialidad VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, esps[e]]);
      }
    }

    // Si ya hay consultas, el hospital ya se sembró: no se duplica nada (la app no puede borrar).
    if (Number((await uno(`SELECT count(*) AS n FROM consulta`)).n) > 0) {
      for (const r of (await db.query(`SELECT id_paciente, cui FROM paciente WHERE cui IS NOT NULL`)).rows) {
        const a = ADULTOS.find((x) => x.cui === r.cui);
        if (a) res.pacientes[a.clave] = String(r.id_paciente);
      }
      await db.query('COMMIT');
      return { ...res, omitido: true };
    }

    const meds: Record<string, number> = {};
    for (const m of MEDICAMENTOS_ADULTO) {
      const previo = await uno(`SELECT id_medicamento FROM medicamento WHERE nombre = $1 AND concentracion = $2`, [m.nombre, m.concentracion]);
      meds[m.clave] = previo?.id_medicamento ?? (await uno(
        `INSERT INTO medicamento (nombre, presentacion, concentracion) VALUES ($1, $2, $3) RETURNING id_medicamento`, [m.nombre, m.presentacion, m.concentracion],
      )).id_medicamento;
    }

    // Pacientes. Si el CUI ya existe (semilla anterior o alta manual), se reutiliza y no se duplican sus hijos.
    const adultos = ADULTOS.filter((a) => a.en.includes('hospital'));
    for (const p of adultos) {
      const baja = p.baja ? { fecha: sumarDias(HOY, -p.baja.hace), motivo: p.baja.motivo } : null;
      const r = await uno(
        `INSERT INTO paciente (cui, nombres, apellidos, fecha_nacimiento, edad, sexo, tipo_sangre, direccion, procedencia, estado, fecha_baja, motivo_baja, id_medico_baja)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (cui) DO UPDATE SET direccion = COALESCE(paciente.direccion, EXCLUDED.direccion), procedencia = COALESCE(paciente.procedencia, EXCLUDED.procedencia)
         RETURNING id_paciente, (xmax = 0) AS nuevo`,
        [p.cui, p.nombres, p.apellidos, p.nacimiento, edadEn(p.nacimiento), p.sexo, p.sangre, p.direccion, p.procedencia,
          baja ? 'BAJA' : 'ACTIVO', baja?.fecha ?? null, baja?.motivo ?? null, baja ? res.medicos.aperez : null],
      );
      const id = r.id_paciente as number;
      res.pacientes[p.clave] = String(id);
      if (!r.nuevo) continue;
      for (const t of p.telefonos) await db.query(`INSERT INTO paciente_telefono (id_paciente, telefono) VALUES ($1, $2)`, [id, t]);
      for (const e of p.emails) await db.query(`INSERT INTO paciente_email (id_paciente, email) VALUES ($1, $2)`, [id, e]);
      if (p.contacto) {
        const c = await uno(`INSERT INTO contacto_emergencia (id_paciente, nombre_completo, parentesco) VALUES ($1, $2, $3) RETURNING id_contacto`, [id, p.contacto.nombre, p.contacto.parentesco]);
        for (const t of p.contacto.telefonos) await db.query(`INSERT INTO contacto_emergencia_telefono (id_contacto, telefono) VALUES ($1, $2)`, [c.id_contacto, t]);
      }
      await insertarPerfilSocial(db, id, p, rng);
      for (const a of p.antecedentes) await db.query(`INSERT INTO antecedente (id_paciente, tipo, descripcion) VALUES ($1, $2, $3)`, [id, a.tipo, a.descripcion]);
      for (const a of p.alergias) {
        await db.query(`INSERT INTO alergia (id_paciente, id_medicamento, tipo, descripcion, severidad) VALUES ($1, $2, $3, $4, $5)`,
          [id, a.med ? meds[a.med] ?? null : null, a.tipo, a.descripcion, a.severidad]);
      }
    }

    // Citas, consultas, signos, diagnósticos, tratamientos y recetas.
    for (const e of planHospital(adultos, medicoHospitalPara)) {
      const p = adultos.find((a) => a.clave === e.paciente)!;
      const idPaciente = res.pacientes[p.clave]!;
      const idMedico = res.medicos[e.medico]!;
      let idCita: number | null = null;
      if (e.conCita) {
        idCita = (await uno(
          `INSERT INTO cita (id_paciente, id_medico, id_especialidad, fecha, hora, motivo, estado) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_cita`,
          [idPaciente, idMedico, e.especialidad ? esps[e.especialidad] : null, e.fecha, e.hora, e.caso.motivo, e.estado],
        )).id_cita;
      }
      if (!e.consulta) continue;
      const cerrada = e.consulta === 'cerrada';
      const consulta = (await uno(
        `INSERT INTO consulta (id_paciente, id_cita, id_medico, fecha, hora, motivo_consulta, historia_enfermedad_actual, notas_evolucion, peso_kg, talla_cm, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id_consulta`,
        [idPaciente, idCita, idMedico, e.fecha, e.hora, e.caso.motivo, e.caso.hea, cerrada ? notas(e, p) : null,
          pesoEnConsulta(p, rng), p.tallaCm, e.conCita ? null : 'Atendido sin cita previa.'],
      )).id_consulta;
      res.consultas.push({ idPaciente, idConsulta: String(consulta), medico: e.medico, fecha: e.fecha });
      const s = signosAdulto(e.caso.signos, rng);
      await db.query(
        `INSERT INTO signos_vitales (id_consulta, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, temperatura_c)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [consulta, s.presionSistolica, s.presionDiastolica, s.frecuenciaCardiaca, s.frecuenciaRespiratoria, s.saturacionOxigeno, s.temperaturaC],
      );
      if (!cerrada) continue; // Consulta en curso: aún sin diagnóstico.
      const dx = (await uno(
        `INSERT INTO diagnostico (id_consulta, tipo, observaciones, diagnostico_final_enfermedad_detectada) VALUES ($1, $2, $3, $4) RETURNING id_diagnostico`,
        [consulta, e.caso.tipoDx, e.caso.obsDx ?? null, e.caso.dx],
      )).id_diagnostico;
      const t = e.caso.tratamiento;
      const tr = (await uno(
        `INSERT INTO tratamiento (id_diagnostico, tipo, descripcion, indicaciones, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_tratamiento`,
        [dx, t.tipo, t.descripcion, t.indicaciones, e.fecha, t.dias ? sumarDias(e.fecha, t.dias - 1) : null],
      )).id_tratamiento;
      const receta = recetaPara(e.caso, p);
      if (!receta.length) continue;
      const rc = (await uno(
        `INSERT INTO receta (id_tratamiento, id_medico, fecha_emision, observaciones) VALUES ($1, $2, $3, $4) RETURNING id_receta`,
        [tr, idMedico, e.fecha, p.alergias.length ? `Alergias: ${p.alergias.map((a) => a.descripcion.toLowerCase()).join(', ')}.` : null],
      )).id_receta;
      for (const r of receta) {
        await db.query(
          `INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, via_administracion, frecuencia_horas, duracion_dias, cantidad, indicaciones)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [rc, meds[r.med], r.dosis, r.via, r.frecuencia, r.dias, r.cantidad, r.indicaciones ?? null],
        );
      }
    }
    await db.query('COMMIT');
    return res;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    db.release();
  }
}

async function insertarPerfilSocial(db: pg.PoolClient, id: number, p: Adulto, rng: ReturnType<typeof azar>) {
  const rural = /Aldea|Cantón|Paraje|Totonicapán|Sololá/.test(p.direccion);
  await db.query(
    `INSERT INTO perfil_social (id_paciente, estado_civil, ocupacion, escolaridad, tipo_vivienda, servicios_basicos, vicios, personas_a_cargo, ingreso_familiar, raza, religion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id_paciente) DO NOTHING`,
    [
      id, p.social.estadoCivil, p.social.ocupacion, p.social.escolaridad,
      rural ? 'Casa propia de block, piso de tierra' : rng.uno(['Casa propia', 'Casa alquilada', 'Apartamento alquilado', 'Casa familiar']),
      rural ? 'Agua entubada, luz eléctrica, letrina' : 'Agua potable, drenaje, luz eléctrica, internet',
      p.antecedentes.find((a) => a.tipo === 'Hábitos')?.descripcion ?? 'Niega',
      String(rng.entre(0, 4)),
      rural ? rng.entre(15, 35) * 100 : rng.entre(40, 180) * 100,
      p.social.etnia, p.social.religion,
    ],
  );
}

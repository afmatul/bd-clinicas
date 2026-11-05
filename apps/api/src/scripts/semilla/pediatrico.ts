/** Centro médico pediátrico · MySQL. Una transacción para todo el contenido clínico. */
import type mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { CASOS_PEDIATRICOS, MEDICAMENTOS_PEDIATRICO, OMS_PC, OMS_PESO, OMS_TALLA, VACUNAS } from './catalogos.js';
import { NINOS, PEDIATRAS, type Nino } from './personas.js';
import { Agenda, gruposAlergicos, type EstadoCita } from './plan.js';
import { azar, cdfNormal, diaHabil, edadEn, HOY, interpolar, mesesEntre, r1, r2, sumarDias, sumarMeses } from './util.js';

export interface ResultadoPediatrico {
  pediatras: Record<string, string>;
  pacientes: Record<string, string>;
  consultas: { idPaciente: string; idConsulta: string; medico: string; fecha: string }[];
  omitido: boolean;
}

type Rng = ReturnType<typeof azar>;

/** Peso, talla y perímetro cefálico para una edad, con el desvío propio del niño y percentiles OMS aproximados. */
export function medicionPara(n: Nino, meses: number, rng: Rng) {
  const f = n.sexo === 'F' ? { p: 0.955, t: 0.985, c: 0.98 } : { p: 1, t: 1, c: 1 };
  const zp = n.zPeso + rng.real(-0.15, 0.15, 2);
  const zt = n.zTalla + rng.real(-0.1, 0.1, 2);
  const peso = interpolar(OMS_PESO, meses) * f.p * (1 + 0.11 * zp);
  const talla = interpolar(OMS_TALLA, meses) * f.t * (1 + 0.037 * zt);
  const pc = meses <= 36 ? interpolar(OMS_PC, meses) * f.c * (1 + 0.03 * zt) : null;
  const pPeso = r2(cdfNormal(zp) * 100);
  const pTalla = r2(cdfNormal(zt) * 100);
  const pPesoTalla = r2(cdfNormal(zp - 0.7 * zt) * 100);
  let obs = 'Crecimiento adecuado para la edad.';
  if (pPeso < 3) obs = 'Peso bajo para la edad. Se refuerza alimentación y se cita en 1 mes.';
  else if (pPeso < 15) obs = 'Peso en límite inferior. Vigilar ganancia.';
  else if (pPesoTalla > 97) obs = 'Sobrepeso. Orientación alimentaria a la familia.';
  return { peso: r2(peso), talla: r1(talla), pc: pc === null ? null : r1(pc), pPeso, pTalla, pPesoTalla, obs };
}

function signosNino(meses: number, fiebre: boolean, rng: Rng) {
  const fc = meses < 12 ? rng.entre(110, 140) : meses < 60 ? rng.entre(90, 120) : rng.entre(75, 105);
  const fr = meses < 12 ? rng.entre(30, 45) : meses < 60 ? rng.entre(22, 30) : rng.entre(18, 24);
  return {
    sis: meses >= 36 ? rng.entre(90, 108) : null, dia: meses >= 36 ? rng.entre(55, 68) : null,
    fc: fiebre ? fc + 15 : fc, fr, sat: rng.entre(96, 99), temp: fiebre ? rng.real(38.0, 39.1) : rng.real(36.3, 37.1),
  };
}

const CONTROLES = [1, 2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 132];

export async function sembrarPediatrico(pool: mysql.Pool): Promise<ResultadoPediatrico> {
  const db = await pool.getConnection();
  const rng = azar(1207);
  const res: ResultadoPediatrico = { pediatras: {}, pacientes: {}, consultas: [], omitido: false };
  const q = async <T = RowDataPacket[]>(sql: string, params: unknown[] = []) => (await db.query(sql, params))[0] as T;
  const ins = async (sql: string, params: unknown[]) => (await q<ResultSetHeader>(sql, params)).insertId;
  try {
    await db.beginTransaction();
    for (const p of PEDIATRAS) {
      await q(`INSERT INTO pediatra (nombres, apellidos, numero_colegiado) VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos)`, [p.nombres, p.apellidos, p.colegiado]);
      const [r] = await q(`SELECT id_usuario FROM pediatra WHERE numero_colegiado = ?`, [p.colegiado]);
      res.pediatras[p.clave] = String(r!.id_usuario);
    }

    const [hay] = await q(`SELECT count(*) AS n FROM consulta`);
    if (Number(hay!.n) > 0) {
      for (const r of await q(`SELECT id_paciente, cui FROM paciente WHERE cui IS NOT NULL`)) {
        const k = NINOS.find((x) => x.cui === r.cui);
        if (k) res.pacientes[k.clave] = String(r.id_paciente);
      }
      await db.commit();
      return { ...res, omitido: true };
    }

    const meds: Record<string, number> = {};
    for (const m of MEDICAMENTOS_PEDIATRICO) {
      const [previo] = await q(`SELECT id_medicamento FROM medicamento WHERE nombre = ? AND presentacion = ?`, [m.nombre, m.presentacion]);
      meds[m.clave] = previo?.id_medicamento ?? (await ins(`INSERT INTO medicamento (nombre, presentacion) VALUES (?, ?)`, [m.nombre, m.presentacion]));
    }
    const vacunas: Record<string, number> = {};
    for (const v of VACUNAS) {
      await q(`INSERT INTO vacuna (nombre, dosis_totales) VALUES (?, ?) ON DUPLICATE KEY UPDATE dosis_totales = VALUES(dosis_totales)`, [v.nombre, v.dosisMeses.length]);
      const [r] = await q(`SELECT id_vacuna FROM vacuna WHERE nombre = ?`, [v.nombre]);
      vacunas[v.nombre] = r!.id_vacuna;
    }

    const agenda = new Agenda(rng);
    const pediatraDe = (n: Nino) => (['mjuarez', 'vlopez', 'dtum', 'isic', 'mcabrera', 'lbarrios-c'].includes(n.clave) ? 'jcastillo'
      : ['exoy', 'shernandez-c', 'sgarcia', 'sajanel'].includes(n.clave) ? 'lmendoza' : 'abatres');

    for (const n of NINOS) {
      const edadMeses = mesesEntre(n.nacimiento, HOY);
      const baja = n.baja ? { fecha: sumarDias(HOY, -n.baja.hace), motivo: n.baja.motivo } : null;
      const medico = pediatraDe(n);
      const idPed = res.pediatras[medico]!;

      const [previo] = await q(`SELECT id_paciente FROM paciente WHERE cui = ?`, [n.cui]);
      if (previo) { res.pacientes[n.clave] = String(previo.id_paciente); continue; }
      const id = await ins(
        `INSERT INTO paciente (cui, nombres, apellidos, fecha_nacimiento, edad, sexo, tipo_sangre, direccion, estado, fecha_baja, motivo_baja, id_pediatra_baja)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.cui, n.nombres, n.apellidos, n.nacimiento, edadEn(n.nacimiento), n.sexo, n.sangre, n.direccion,
          baja ? 'BAJA' : 'ACTIVO', baja?.fecha ?? null, baja?.motivo ?? null, baja ? idPed : null],
      );
      res.pacientes[n.clave] = String(id);
      for (const r of n.responsables) {
        const idR = await ins(`INSERT INTO responsable (id_paciente, nombre_completo, cui, parentesco, direccion, es_tutor_legal) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, r.nombre, r.cui, r.parentesco, n.direccion, r.tutor]);
        for (const t of r.telefonos) await q(`INSERT INTO responsable_telefono (id_responsable, telefono) VALUES (?, ?)`, [idR, t]);
      }
      for (const a of n.antecedentes) await q(`INSERT INTO antecedente (id_paciente, tipo, descripcion) VALUES (?, ?, ?)`, [id, a.tipo, a.descripcion]);
      for (const a of n.alergias) {
        await q(`INSERT INTO alergia (id_paciente, id_medicamento, tipo, descripcion, severidad) VALUES (?, ?, ?, ?, ?)`,
          [id, a.med ? meds[a.med] ?? null : null, a.tipo, a.descripcion, a.severidad]);
      }

      // Mediciones de crecimiento en las edades de control (y una reciente).
      const fin = baja ? baja.fecha : HOY;
      const fechasMedicion: { fecha: string; meses: number }[] = [];
      for (const m of CONTROLES) {
        const f = sumarDias(sumarMeses(n.nacimiento, m), rng.entre(0, 6));
        if (f <= sumarDias(fin, -1)) fechasMedicion.push({ fecha: f, meses: m });
      }
      const ultima = fechasMedicion.at(-1);
      // Mateo se mide hoy en la agenda del Dr. Castillo; los demás tienen una medición reciente.
      if (!baja && n.clave !== 'mjuarez' && edadMeses >= 1 && (!ultima || mesesEntre(ultima.fecha, HOY) >= 2)) {
        fechasMedicion.push({ fecha: sumarDias(HOY, -rng.entre(3, 20)), meses: edadMeses });
      }
      for (const { fecha, meses } of fechasMedicion) {
        const m = medicionPara(n, mesesEntre(n.nacimiento, fecha) || meses, rng);
        await q(
          `INSERT INTO medicion_crecimiento (id_paciente, fecha_medicion, peso_kg, talla_cm, perimetro_cefalico_cm, observaciones, percentil_peso_edad, percentil_talla_edad, percentil_peso_talla)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, fecha, m.peso, m.talla, m.pc, m.obs, m.pPeso, m.pTalla, m.pPesoTalla],
        );
      }

      // Vacunas según esquema; las de `pendientes` quedan con su última dosis vencida sin aplicar.
      for (const v of VACUNAS) {
        if (v.soloNinas && n.sexo !== 'F') continue;
        const vencidas = v.dosisMeses.map((m, i) => ({ i, due: sumarMeses(n.nacimiento, m) })).filter((d) => d.due <= fin);
        const pendiente = n.pendientes?.includes(v.nombre) ? vencidas.at(-1)?.i : undefined;
        for (const { i, due } of vencidas) {
          if (i === pendiente) break;
          const aplicada = sumarDias(due, rng.entre(0, 10));
          if (aplicada > fin) break;
          const siguiente = v.dosisMeses[i + 1] !== undefined ? sumarMeses(n.nacimiento, v.dosisMeses[i + 1]!) : null;
          await q(
            `INSERT INTO historial_vacunacion (id_paciente, id_vacuna, numero_dosis, fecha_aplicacion, lote, fecha_proxima_dosis, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, vacunas[v.nombre], i + 1, aplicada, rng.entre(100000, 999999), siguiente, rng.prob(0.12) ? 'Febrícula las primeras 24 horas, manejada con acetaminofén.' : null],
          );
        }
      }

      // Consultas: controles de niño sano (dos últimas mediciones) y cuadros agudos.
      const encuentros: { fecha: string; caso: string; estado: EstadoCita }[] = [];
      for (const f of fechasMedicion.slice(-2)) if (f.fecha < HOY) encuentros.push({ fecha: f.fecha, caso: 'nino-sano', estado: 'ATENDIDA' });
      for (const c of n.casos) {
        if (c === 'nino-sano') continue;
        const caso = CASOS_PEDIATRICOS[c]!;
        const minimo = Math.max(caso.edadMinMeses ?? 0, 2);
        const maxHace = Math.min(300, (edadMeses - minimo) * 30);
        if (maxHace < 10) continue;
        let fecha = diaHabil(-rng.entre(10, maxHace));
        if (baja && fecha >= baja.fecha) fecha = sumarDias(baja.fecha, -rng.entre(20, 60));
        encuentros.push({ fecha, caso: c, estado: 'ATENDIDA' });
      }
      if (rng.prob(0.3) && !baja) encuentros.push({ fecha: diaHabil(-rng.entre(5, 40)), caso: 'nino-sano', estado: rng.prob(0.5) ? 'NO_ASISTIO' : 'CANCELADA' });

      const alergicoPen = gruposAlergicos(n, MEDICAMENTOS_PEDIATRICO).has('penicilina');
      for (const e of encuentros) {
        const caso = CASOS_PEDIATRICOS[e.caso]!;
        const hora = agenda.reservar(medico, e.fecha);
        const idCita = await ins(`INSERT INTO cita (id_paciente, id_pediatra, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, idPed, e.fecha, `${e.fecha} ${hora}:00`, caso.motivo, e.estado]);
        if (e.estado !== 'ATENDIDA') continue;
        await consultaPediatrica(id, idCita, idPed, medico, e.fecha, hora, caso.clave, n, alergicoPen, true);
      }
      if (!baja && rng.prob(0.6)) {
        const fecha = diaHabil(rng.entre(10, 75));
        const hora = agenda.reservar(medico, fecha);
        await q(`INSERT INTO cita (id_paciente, id_pediatra, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, 'PROGRAMADA')`,
          [id, idPed, fecha, `${fecha} ${hora}:00`, edadMeses < 24 ? 'Control de crecimiento y vacunas' : 'Control de crecimiento']);
      }
    }

    // Agenda de hoy del Dr. Castillo (usuario `pediatra`) y de la Dra. Mendoza.
    const hoy: [string, string, string, string, EstadoCita][] = [
      ['mjuarez', 'jcastillo', '08:00', 'nino-sano', 'ATENDIDA'],
      ['vlopez', 'jcastillo', '08:30', 'rinofaringitis', 'EN_CONSULTA'],
      ['dtum', 'jcastillo', '09:00', 'sibilancias', 'CONFIRMADA'],
      ['rmejia', 'jcastillo', '09:30', 'nino-sano', 'PROGRAMADA'],
      ['mcaal', 'jcastillo', '10:30', 'nino-sano', 'PROGRAMADA'],
      ['shernandez-c', 'lmendoza', '08:00', 'nino-sano', 'CONFIRMADA'],
      ['exoy', 'lmendoza', '08:30', 'nino-sano', 'PROGRAMADA'],
    ];
    for (const [clave, medico, hora, c, estado] of hoy) {
      const n = NINOS.find((x) => x.clave === clave)!;
      const id = Number(res.pacientes[clave]);
      const idPed = res.pediatras[medico]!;
      agenda.reservar(medico, HOY, hora);
      const caso = CASOS_PEDIATRICOS[c]!;
      const motivo = c === 'nino-sano' && mesesEntre(n.nacimiento, HOY) < 24 ? 'Control de crecimiento y vacunas' : caso.motivo;
      const idCita = await ins(`INSERT INTO cita (id_paciente, id_pediatra, fecha, hora, motivo, estado) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, idPed, HOY, `${HOY} ${hora}:00`, motivo, estado]);
      if (estado === 'ATENDIDA' && c === 'nino-sano') {
        const m = medicionPara(n, mesesEntre(n.nacimiento, HOY), rng);
        await q(
          `INSERT IGNORE INTO medicion_crecimiento (id_paciente, fecha_medicion, peso_kg, talla_cm, perimetro_cefalico_cm, observaciones, percentil_peso_edad, percentil_talla_edad, percentil_peso_talla)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, HOY, m.peso, m.talla, m.pc, m.obs, m.pPeso, m.pTalla, m.pPesoTalla],
        );
      }
      if (estado === 'ATENDIDA' || estado === 'EN_CONSULTA') {
        const alergicoPen = gruposAlergicos(n, MEDICAMENTOS_PEDIATRICO).has('penicilina');
        await consultaPediatrica(id, idCita, idPed, medico, HOY, hora, c, n, alergicoPen, estado === 'ATENDIDA');
      }
    }

    await db.commit();
    return res;

    async function consultaPediatrica(id: number, idCita: number, idPed: string, medico: string, fecha: string, hora: string,
      c: string, n: Nino, alergicoPen: boolean, cerrada: boolean) {
      const caso = CASOS_PEDIATRICOS[c]!;
      const meses = mesesEntre(n.nacimiento, fecha);
      const peso = medicionPara(n, meses, rng).peso;
      const idC = await ins(
        `INSERT INTO consulta (id_paciente, id_cita, id_pediatra, fecha, hora, motivo_consulta, historia_enfermedad_actual, notas_evolucion, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, idCita, idPed, fecha, `${hora}:00`, caso.motivo, caso.hea, cerrada ? caso.evolucion : null, `Peso ${peso} kg. Acompañado por ${n.responsables[0]!.parentesco.toLowerCase()}.`],
      );
      res.consultas.push({ idPaciente: String(id), idConsulta: String(idC), medico, fecha });
      const s = signosNino(meses, caso.fiebre, rng);
      await q(`INSERT INTO signos_vitales (id_consulta, presion_sistolica, presion_diastolica, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, temperatura_c)
               VALUES (?, ?, ?, ?, ?, ?, ?)`, [idC, s.sis, s.dia, s.fc, s.fr, s.sat, s.temp]);
      if (!cerrada) return;
      const idDx = await ins(`INSERT INTO diagnostico (id_consulta, tipo, observaciones, diagnostico_final_enfermedad_detectada) VALUES (?, ?, ?, ?)`,
        [idC, caso.tipoDx, null, caso.dx]);
      const t = caso.tratamiento;
      const idT = await ins(`INSERT INTO tratamiento (id_diagnostico, tipo, descripcion, indicaciones, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)`,
        [idDx, t.tipo, t.descripcion, t.indicaciones, fecha, t.dias ? sumarDias(fecha, t.dias - 1) : null]);
      const receta = caso.receta(peso, meses, alergicoPen);
      if (!receta.length) return;
      const idR = await ins(`INSERT INTO receta (id_tratamiento, id_pediatra, fecha_emision, observaciones) VALUES (?, ?, ?, ?)`,
        [idT, idPed, fecha, `Dosis calculada para ${peso} kg.`]);
      for (const r of receta) {
        await q(`INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, via_administracion, frecuencia_horas, duracion_dias, cantidad, indicaciones)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [idR, meds[r.med], r.dosis, r.via, r.frecuencia, r.dias, r.cantidad, r.indicaciones ?? null]);
      }
    }
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}

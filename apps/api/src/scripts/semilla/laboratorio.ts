/**
 * Laboratorio clínico · MongoDB. Ids deterministas (ObjectId derivado de una clave), así una segunda
 * corrida encuentra lo mismo y no duplica.
 */
import { Double, ObjectId, type Db } from 'mongodb';
import { CASOS, MEDICAMENTOS_ADULTO } from './catalogos.js';
import { ADULTOS, NINOS, PERSONAL_LABORATORIO, type Adulto, type Nino } from './personas.js';
import { Agenda, pesoEnConsulta, recetaPara, signosAdulto } from './plan.js';
import { azar, dia, diaHabil, fechaDate, hexDe, HOY, sumarDias } from './util.js';

type Rng = ReturnType<typeof azar>;
const oid = (clave: string) => new ObjectId(hexDe(`laboratorio:${clave}`));
const d = (n: number) => new Double(n);

export interface ResultadoLaboratorio {
  personal: Record<string, string>;
  pacientes: Record<string, string>;
  examenes: { idPaciente: string; idExamen: string; fecha: string }[];
  omitido: boolean;
}

/** Catálogo de tipos de examen: la web arma el formulario de captura a partir de `campos`. */
export const TIPOS_EXAMEN = [
  {
    clave: 'hematologia', nombre: 'Hematología completa', muestra: 'Sangre total (EDTA)', tiempo_entrega_horas: 4,
    campos: [
      { clave: 'hemoglobina', nombre: 'Hemoglobina', unidad: 'g/dL', rango_min: 12.0, rango_max: 16.0 },
      { clave: 'hematocrito', nombre: 'Hematocrito', unidad: '%', rango_min: 36, rango_max: 46 },
      { clave: 'leucocitos', nombre: 'Leucocitos', unidad: '×10³/µL', rango_min: 4.5, rango_max: 11.0 },
      { clave: 'neutrofilos', nombre: 'Neutrófilos', unidad: '%', rango_min: 40, rango_max: 70 },
      { clave: 'linfocitos', nombre: 'Linfocitos', unidad: '%', rango_min: 20, rango_max: 40 },
      { clave: 'plaquetas', nombre: 'Plaquetas', unidad: '×10³/µL', rango_min: 150, rango_max: 400 },
      { clave: 'vcm', nombre: 'Volumen corpuscular medio', unidad: 'fL', rango_min: 80, rango_max: 100 },
    ],
  },
  {
    clave: 'orina', nombre: 'Orina simple', muestra: 'Orina, primera de la mañana', tiempo_entrega_horas: 2,
    campos: [
      { clave: 'color', nombre: 'Color' }, { clave: 'aspecto', nombre: 'Aspecto' },
      { clave: 'densidad', nombre: 'Densidad', rango_min: 1.005, rango_max: 1.03 },
      { clave: 'ph', nombre: 'pH', rango_min: 5, rango_max: 8 },
      { clave: 'proteinas', nombre: 'Proteínas' }, { clave: 'glucosa', nombre: 'Glucosa' }, { clave: 'nitritos', nombre: 'Nitritos' },
      { clave: 'leucocitos', nombre: 'Leucocitos', unidad: '/campo', rango_min: 0, rango_max: 5 },
      { clave: 'eritrocitos', nombre: 'Eritrocitos', unidad: '/campo', rango_min: 0, rango_max: 3 },
      { clave: 'bacterias', nombre: 'Bacterias' },
    ],
  },
  {
    clave: 'urocultivo', nombre: 'Urocultivo con antibiograma', muestra: 'Orina, chorro medio', tiempo_entrega_horas: 72,
    campos: [
      { clave: 'organismo', nombre: 'Microorganismo aislado' },
      { clave: 'recuento_ufc', nombre: 'Recuento', unidad: 'UFC/mL', rango_max: 100000 },
      { clave: 'antibiograma', nombre: 'Antibiograma (S, I, R)' },
    ],
  },
  {
    clave: 'quimica', nombre: 'Química sanguínea', muestra: 'Suero', tiempo_entrega_horas: 6,
    campos: [
      { clave: 'glucosa', nombre: 'Glucosa en ayunas', unidad: 'mg/dL', rango_min: 70, rango_max: 100 },
      { clave: 'hba1c', nombre: 'Hemoglobina glicosilada', unidad: '%', rango_min: 4.0, rango_max: 5.6 },
      { clave: 'creatinina', nombre: 'Creatinina', unidad: 'mg/dL', rango_min: 0.6, rango_max: 1.2 },
      { clave: 'bun', nombre: 'Nitrógeno de urea', unidad: 'mg/dL', rango_min: 7, rango_max: 20 },
      { clave: 'acido_urico', nombre: 'Ácido úrico', unidad: 'mg/dL', rango_min: 2.4, rango_max: 7.0 },
      { clave: 'colesterol', nombre: 'Colesterol total', unidad: 'mg/dL', rango_min: 0, rango_max: 200 },
      { clave: 'trigliceridos', nombre: 'Triglicéridos', unidad: 'mg/dL', rango_min: 0, rango_max: 150 },
      { clave: 'sodio', nombre: 'Sodio', unidad: 'mmol/L', rango_min: 136, rango_max: 145 },
      { clave: 'potasio', nombre: 'Potasio', unidad: 'mmol/L', rango_min: 3.5, rango_max: 5.1 },
    ],
  },
] as const;

type Tipo = (typeof TIPOS_EXAMEN)[number]['clave'];
type Perfil = 'normal' | 'dm2' | 'dislipidemia' | 'erc' | 'infeccion' | 'itu' | 'anemia' | 'nino';

/** Valores con unidad y rango (orina, química); fuera_de_rango se calcula. */
function valores(tipo: 'orina' | 'quimica', crudos: Record<string, number | string>) {
  const def = TIPOS_EXAMEN.find((t) => t.clave === tipo)!;
  return def.campos.filter((c) => crudos[c.clave] !== undefined).map((c) => {
    const valor = crudos[c.clave]!;
    const min = 'rango_min' in c ? c.rango_min : undefined;
    const max = 'rango_max' in c ? c.rango_max : undefined;
    const fuera = typeof valor === 'number' && ((min !== undefined && valor < min) || (max !== undefined && valor > max));
    return {
      clave: c.clave, nombre: c.nombre, valor: typeof valor === 'number' ? d(valor) : valor,
      unidad: 'unidad' in c ? c.unidad : null, rango_min: min ?? null, rango_max: max ?? null, fuera_de_rango: fuera,
    };
  });
}

export function resultados(tipo: Tipo, perfil: Perfil, rng: Rng, sexo: 'F' | 'M') {
  if (tipo === 'hematologia') {
    const hb = perfil === 'anemia' ? rng.real(9.2, 10.8) : perfil === 'erc' ? rng.real(10.5, 11.6) : sexo === 'F' ? rng.real(12.4, 14.6) : rng.real(13.6, 16.4);
    const leu = perfil === 'infeccion' ? rng.real(12.5, 16.8) : rng.real(5.2, 9.4);
    return {
      hemoglobina: d(hb), hematocrito: d(Number((hb * 3).toFixed(1))), leucocitos: d(leu),
      neutrofilos: d(perfil === 'infeccion' ? rng.real(76, 86) : rng.real(48, 66)), linfocitos: d(perfil === 'infeccion' ? rng.real(10, 18) : rng.real(24, 38)),
      plaquetas: d(rng.entre(180, 360)), vcm: d(perfil === 'anemia' ? rng.real(70, 78) : rng.real(84, 96)),
    };
  }
  if (tipo === 'urocultivo') {
    if (perfil !== 'itu') return { organismo: 'Sin crecimiento bacteriano', recuento_ufc: 0, antibiograma: [] };
    return {
      organismo: 'Escherichia coli', recuento_ufc: rng.uno([100000, 150000, 200000]),
      antibiograma: [
        { antibiotico: 'Nitrofurantoína', interpretacion: 'S' }, { antibiotico: 'Fosfomicina', interpretacion: 'S' },
        { antibiotico: 'Ciprofloxacino', interpretacion: rng.uno(['S', 'R']) }, { antibiotico: 'Trimetoprim/sulfametoxazol', interpretacion: 'R' },
        { antibiotico: 'Ampicilina', interpretacion: 'R' }, { antibiotico: 'Ceftriaxona', interpretacion: 'S' },
      ],
    };
  }
  if (tipo === 'orina') {
    const itu = perfil === 'itu';
    return {
      valores: valores('orina', {
        color: 'Amarillo', aspecto: itu ? 'Turbio' : 'Claro', densidad: rng.real(1.012, 1.025, 3), ph: rng.real(5.5, 6.5),
        proteinas: perfil === 'erc' ? 'Trazas' : 'Negativo', glucosa: perfil === 'dm2' ? '+' : 'Negativo', nitritos: itu ? 'Positivo' : 'Negativo',
        leucocitos: itu ? rng.entre(20, 40) : rng.entre(0, 3), eritrocitos: itu ? rng.entre(3, 8) : rng.entre(0, 2), bacterias: itu ? 'Abundantes' : 'Escasas',
      }),
    };
  }
  const base: Record<string, number> = {
    glucosa: rng.entre(78, 98), creatinina: sexo === 'F' ? rng.real(0.6, 0.95, 2) : rng.real(0.8, 1.15, 2), bun: rng.entre(9, 18),
    acido_urico: rng.real(3.2, 6.2), colesterol: rng.entre(150, 195), trigliceridos: rng.entre(90, 145), sodio: rng.entre(137, 143), potasio: rng.real(3.8, 4.8),
  };
  if (perfil === 'dm2') Object.assign(base, { glucosa: rng.entre(128, 168), hba1c: rng.real(6.8, 8.2) });
  if (perfil === 'dislipidemia') Object.assign(base, { colesterol: rng.entre(232, 262), trigliceridos: rng.entre(180, 240) });
  if (perfil === 'erc') Object.assign(base, { creatinina: rng.real(1.8, 2.2, 2), bun: rng.entre(32, 41), potasio: 6.4 });
  return { valores: valores('quimica', base) };
}

const SOLICITANTES = ['Dra. Ana Lucía Pérez (Hospital general)', 'Dr. Carlos Méndez', 'Dr. Jorge Castillo (Centro pediátrico)', 'Dra. Silvia Natareno', 'Particular, sin orden médica'];

export async function sembrarLaboratorio(db: Db): Promise<ResultadoLaboratorio> {
  const rng = azar(3303);
  const res: ResultadoLaboratorio = { personal: {}, pacientes: {}, examenes: [], omitido: false };

  // Catálogos: upsert por clave.
  for (const p of PERSONAL_LABORATORIO) {
    const _id = oid(`personal:${p.clave}`);
    await db.collection('personal').updateOne({ _id }, { $set: {
      nombres: p.nombres, apellidos: p.apellidos, numero_colegiado: p.colegiado, especialidades: p.especialidades, rol: p.rol, activo: true,
    } }, { upsert: true });
    res.personal[p.clave] = _id.toHexString();
  }
  const meds: Record<string, ObjectId> = {};
  for (const m of MEDICAMENTOS_ADULTO) {
    const _id = oid(`medicamento:${m.clave}`);
    await db.collection('medicamentos').updateOne({ _id }, { $set: { nombre: m.nombre, presentacion: m.presentacion, concentracion: m.concentracion } }, { upsert: true });
    meds[m.clave] = _id;
  }
  for (const t of TIPOS_EXAMEN) {
    await db.collection('tipos_examen').updateOne({ clave: t.clave }, { $set: { ...t, campos: t.campos.map((c) => ({ ...c })) } }, { upsert: true });
  }

  // Pacientes: adultos del laboratorio y Mateo (también paciente del pediátrico).
  const adultos = ADULTOS.filter((a) => a.en.includes('laboratorio'));
  const ninos = NINOS.filter((n) => n.enLaboratorio);
  const pacientes = db.collection('pacientes');
  for (const p of [...adultos, ...ninos]) {
    const previo = await pacientes.findOne({ cui: p.cui }, { projection: { _id: 1 } });
    if (previo) { res.pacientes[p.clave] = previo._id.toHexString(); continue; }
    const _id = oid(`paciente:${p.cui}`);
    await pacientes.insertOne(documentoPaciente(_id, p, meds));
    res.pacientes[p.clave] = _id.toHexString();
  }

  if ((await db.collection('examenes').countDocuments({}, { limit: 1 })) > 0) return { ...res, omitido: true };

  const examenes: Record<string, unknown>[] = [];
  const citas: Record<string, unknown>[] = [];
  const agenda = new Agenda(rng);
  const quimicos = ['msic', 'itoc'];
  const perfilDe = (p: Adulto | Nino): Perfil => {
    if (!('cronicos' in p)) return 'nino';
    if (p.antecedentes.some((a) => a.descripcion.includes('renal'))) return 'erc';
    if (p.cronicos.includes('dm2')) return 'dm2';
    if (p.cronicos.includes('dislipidemia')) return 'dislipidemia';
    if (p.agudos.includes('itu')) return 'itu';
    return 'normal';
  };
  const examen = (clave: string, p: Adulto | Nino, tipo: Tipo, fecha: string, hora: string, estado: 'PENDIENTE' | 'EN_PROCESO' | 'VALIDADO', perfil: Perfil) => {
    const _id = oid(`examen:${clave}`);
    const quimico = res.personal[rng.uno(quimicos)]!;
    const horas = TIPOS_EXAMEN.find((t) => t.clave === tipo)!.tiempo_entrega_horas;
    const orden = new Date(`${fecha}T${hora}:00-06:00`);
    const listo = new Date(orden.getTime() + horas * 3600_000);
    examenes.push({
      _id, paciente_id: new ObjectId(res.pacientes[p.clave]!), tipo, estado,
      fecha_orden: orden,
      fecha_toma: estado === 'PENDIENTE' ? null : new Date(orden.getTime() + 15 * 60_000),
      fecha_resultado: estado === 'VALIDADO' ? listo : null,
      solicitado_por: 'cronicos' in p ? rng.uno(SOLICITANTES) : 'Dr. Jorge Castillo (Centro pediátrico)',
      procesado_por: estado === 'PENDIENTE' ? null : quimico,
      validado_por: estado === 'VALIDADO' ? res.personal.rgodoy : null,
      observaciones: perfil === 'erc' && tipo === 'quimica' && estado === 'VALIDADO' ? 'Valor crítico de potasio comunicado al médico tratante.' : null,
      resultados: estado === 'VALIDADO' ? resultados(tipo, perfil, rng, p.sexo) : null,
    });
    res.examenes.push({ idPaciente: res.pacientes[p.clave]!, idExamen: _id.toHexString(), fecha });
  };

  // Historial de cada paciente: 1–3 exámenes validados en el último año, coherentes con su perfil.
  for (const p of [...adultos, ...ninos]) {
    const perfil = perfilDe(p);
    const tipos: Tipo[] = perfil === 'dm2' || perfil === 'dislipidemia' || perfil === 'erc' ? ['quimica', 'quimica', 'hematologia']
      : perfil === 'itu' ? ['orina', 'urocultivo'] : perfil === 'nino' ? ['hematologia', 'orina'] : ['hematologia', 'quimica'];
    const veces = Math.min(tipos.length, rng.entre(1, 3));
    for (let i = 0; i < veces; i++) {
      const fecha = diaHabil(-rng.entre(20, 330));
      const hora = rng.uno(['06:30', '07:00', '07:15', '07:40', '08:10', '09:00']);
      const t = tipos[i]!;
      examen(`${p.clave}:${i}`, p, t, fecha, hora, 'VALIDADO', t === 'urocultivo' && rng.prob(0.5) ? 'normal' : perfil);
    }
  }
  // Cola de trabajo de hoy (prototipo: Laboratorio).
  const buscar = (k: string) => [...adultos, ...ninos].find((x) => x.clave === k)!;
  examen('hoy:shernandez', buscar('shernandez'), 'quimica', HOY, '07:40', 'VALIDADO', 'erc');
  examen('hoy:cuaju', buscar('cuaju'), 'hematologia', HOY, '07:10', 'VALIDADO', 'normal');
  examen('hoy:mjuarez', buscar('mjuarez'), 'orina', HOY, '08:05', 'EN_PROCESO', 'nino');
  examen('hoy:rgomez', buscar('rgomez'), 'urocultivo', dia(-2), '09:30', 'EN_PROCESO', 'itu');
  examen('hoy:jtum', buscar('jtum'), 'quimica', HOY, '08:20', 'PENDIENTE', 'dm2');
  examen('hoy:echoc', buscar('echoc'), 'orina', HOY, '08:45', 'PENDIENTE', 'itu');
  examen('hoy:kmonzon', buscar('kmonzon'), 'hematologia', HOY, '09:00', 'PENDIENTE', 'normal');

  // Citas de toma de muestra (las atiende un químico biólogo).
  const citaLab = (p: Adulto | Nino, fecha: string, hora: string, motivo: string, estado: string) => {
    const quien = fecha === HOY ? 'msic' : rng.uno(quimicos);
    agenda.reservar(quien, fecha, hora);
    citas.push({
      _id: oid(`cita:${p.clave}:${fecha}:${hora}`), paciente_id: new ObjectId(res.pacientes[p.clave]!), medico_id: res.personal[quien],
      fecha, hora, motivo, estado, creada_en: fechaDate(sumarDias(fecha, -rng.entre(1, 7))),
    });
  };
  citaLab(buscar('cuaju'), HOY, '07:00', 'Toma de muestra: hematología completa', 'ATENDIDA');
  citaLab(buscar('shernandez'), HOY, '07:30', 'Toma de muestra: química sanguínea', 'ATENDIDA');
  citaLab(buscar('mjuarez'), HOY, '08:00', 'Entrega de muestra: orina simple', 'ATENDIDA');
  citaLab(buscar('jtum'), HOY, '08:15', 'Toma de muestra: química sanguínea (ayunas)', 'ATENDIDA');
  citaLab(buscar('echoc'), HOY, '08:45', 'Entrega de muestra: orina simple', 'CONFIRMADA');
  citaLab(buscar('kmonzon'), HOY, '09:00', 'Toma de muestra: hematología completa', 'CONFIRMADA');
  citaLab(buscar('lbarrios'), HOY, '09:30', 'Toma de muestra: TSH y química', 'PROGRAMADA');
  citaLab(buscar('vtzoc'), HOY, '10:00', 'Toma de muestra: hematología completa', 'PROGRAMADA');
  for (const k of ['mjlopez', 'rarriaga', 'jcux', 'msolares', 'grecinos', 'cchavez']) {
    const fecha = diaHabil(rng.entre(1, 20));
    citaLab(buscar(k), fecha, rng.uno(['06:30', '07:00', '07:30', '08:00']), 'Toma de muestra: control', rng.prob(0.5) ? 'CONFIRMADA' : 'PROGRAMADA');
  }
  for (const k of ['pxicara', 'msolares']) {
    const fecha = diaHabil(-rng.entre(5, 30));
    citaLab(buscar(k), fecha, '07:00', 'Toma de muestra: química sanguínea', 'NO_ASISTIO');
  }

  // Consultas de interpretación de resultados con la médica del laboratorio.
  const consultas: Record<string, unknown>[] = [];
  for (const k of ['jtum', 'jcux', 'rarriaga', 'shernandez', 'grecinos', 'mjlopez']) {
    const p = buscar(k) as Adulto;
    const c = CASOS[p.cronicos[0] ?? p.agudos[0] ?? 'chequeo']!;
    const fecha = diaHabil(-rng.entre(10, 120));
    const hora = agenda.reservar('emerida', fecha);
    const medico = res.personal.emerida!;
    const receta = recetaPara(c, p);
    const s = signosAdulto(c.signos, rng);
    consultas.push({
      _id: oid(`consulta:${k}`), paciente_id: new ObjectId(res.pacientes[k]!), cita_id: null, medico_id: medico,
      fecha, hora, motivo_consulta: `Interpretación de resultados: ${c.motivo.toLowerCase()}`, historia_enfermedad_actual: c.hea,
      notas_evolucion: `${c.evolucion} Se explican resultados al paciente.`, peso_kg: pesoEnConsulta(p, rng), talla_cm: p.tallaCm,
      signos_vitales: {
        presion_sistolica: s.presionSistolica, presion_diastolica: s.presionDiastolica, frecuencia_cardiaca: s.frecuenciaCardiaca,
        frecuencia_respiratoria: s.frecuenciaRespiratoria, saturacion_oxigeno: s.saturacionOxigeno, temperatura_c: s.temperaturaC,
      },
      diagnosticos: [{
        _id: oid(`consulta:${k}:dx`), tipo: c.tipoDx, enfermedad_detectada: c.dx, observaciones: c.obsDx ?? null,
        tratamientos: [{
          _id: oid(`consulta:${k}:tr`), tipo: c.tratamiento.tipo, descripcion: c.tratamiento.descripcion, indicaciones: c.tratamiento.indicaciones,
          fecha_inicio: fecha, fecha_fin: c.tratamiento.dias ? sumarDias(fecha, c.tratamiento.dias - 1) : null,
          receta: receta.length ? {
            _id: oid(`consulta:${k}:rx`), fecha_emision: fecha, medico_id: medico,
            renglones: receta.map((r) => {
              const m = MEDICAMENTOS_ADULTO.find((x) => x.clave === r.med)!;
              return {
                medicamento_id: meds[r.med], nombre: `${m.nombre} ${m.concentracion}`, dosis: r.dosis, via_administracion: r.via,
                frecuencia_horas: r.frecuencia, duracion_dias: r.dias, cantidad: r.cantidad, indicaciones: r.indicaciones ?? null,
              };
            }),
          } : null,
        }],
      }],
      cerrada: true,
      creada_en: new Date(`${fecha}T${hora}:00-06:00`),
    });
  }

  await db.collection('examenes').insertMany(examenes);
  await db.collection('citas').insertMany(citas);
  await db.collection('consultas').insertMany(consultas);
  return res;
}

function documentoPaciente(_id: ObjectId, p: Adulto | Nino, meds: Record<string, ObjectId>) {
  const adulto = 'cronicos' in p;
  const contactos = adulto
    ? (p.contacto ? [{ nombre_completo: p.contacto.nombre, parentesco: p.contacto.parentesco, telefonos: p.contacto.telefonos }] : [])
    : p.responsables.map((r) => ({ nombre_completo: r.nombre, parentesco: r.parentesco, telefonos: r.telefonos }));
  return {
    _id,
    cui: p.cui,
    nombres: p.nombres,
    apellidos: p.apellidos,
    fecha_nacimiento: fechaDate(p.nacimiento),
    sexo: p.sexo,
    tipo_sangre: p.sangre,
    direccion: p.direccion,
    procedencia: adulto ? p.procedencia : null,
    estado: 'ACTIVO' as const,
    baja: null,
    telefonos: adulto ? p.telefonos : p.responsables[0]!.telefonos,
    emails: adulto ? p.emails : [],
    contactos_emergencia: contactos,
    alergias: p.alergias.map((a, i) => ({
      _id: new ObjectId(hexDe(`laboratorio:alergia:${p.cui}:${i}`)), tipo: a.tipo, descripcion: a.descripcion, severidad: a.severidad,
      medicamento_id: a.med && meds[a.med] ? meds[a.med] : null,
    })),
    antecedentes: p.antecedentes.map((a, i) => ({ _id: new ObjectId(hexDe(`laboratorio:antecedente:${p.cui}:${i}`)), tipo: a.tipo, descripcion: a.descripcion })),
  };
}

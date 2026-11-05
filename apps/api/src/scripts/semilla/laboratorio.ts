/**
 * Laboratorio clínico · MongoDB. Ids deterministas (ObjectId derivado de una clave), así una segunda
 * corrida encuentra lo mismo y no duplica.
 */
import { ObjectId, type Db } from 'mongodb';
import type { CapturarResultadosInput, TipoExamenClave } from '@red-clinica/shared';
import { CATALOGO } from '../../modules/laboratorio/domain/catalogo.js';
import { construirResultados } from '../../modules/laboratorio/domain/examen.js';
import { MongoExamenRepository, prepararLaboratorio } from '../../modules/laboratorio/adapters/mongo/examen-repository.js';
import type { Firma } from '../../modules/laboratorio/ports/examen-repository.js';
import { CASOS, MEDICAMENTOS_ADULTO } from './catalogos.js';
import { ADULTOS, NINOS, PERSONAL_LABORATORIO, type Adulto, type Nino } from './personas.js';
import { Agenda, pesoEnConsulta, recetaPara, signosAdulto } from './plan.js';
import { azar, dia, diaHabil, fechaDate, hexDe, HOY, sumarDias } from './util.js';

type Rng = ReturnType<typeof azar>;
const oid = (clave: string) => new ObjectId(hexDe(`laboratorio:${clave}`));

export interface ResultadoLaboratorio {
  personal: Record<string, string>;
  pacientes: Record<string, string>;
  examenes: { idPaciente: string; idExamen: string; fecha: string }[];
  omitido: boolean;
}

/**
 * Los exámenes se crean con el repositorio del módulo laboratorio (ordenar → capturar → validar), así
 * tienen exactamente la forma que valida el $jsonSchema de `examenes` y que lee la pantalla Resultados.
 * El catálogo `tipos_examen` es el del módulo (modules/laboratorio/domain/catalogo.ts).
 */
const ENTREGA_HORAS: Record<TipoExamenClave, number> = { hematologia: 4, orina: 2, urocultivo: 72, quimica: 6 };

type Tipo = TipoExamenClave;
type Perfil = 'normal' | 'dm2' | 'dislipidemia' | 'erc' | 'infeccion' | 'itu' | 'anemia' | 'nino';

const texto = (xs: Record<string, number | string>) => Object.fromEntries(Object.entries(xs).map(([k, v]) => [k, String(v)]));

/** Lo que el químico biólogo escribiría en el formulario de captura, coherente con el perfil del paciente. */
export function captura(tipo: Tipo, perfil: Perfil, rng: Rng, sexo: 'F' | 'M'): CapturarResultadosInput {
  if (tipo === 'hematologia') {
    const hb = perfil === 'anemia' ? rng.real(9.2, 10.8) : perfil === 'erc' ? rng.real(10.5, 11.6) : sexo === 'F' ? rng.real(12.4, 14.6) : rng.real(13.6, 16.4);
    const leu = perfil === 'infeccion' ? rng.real(12.5, 16.8) : rng.real(5.2, 9.4);
    return {
      valores: texto({
        hemoglobina: hb, hematocrito: Number((hb * 3).toFixed(1)), leucocitos: leu,
        neutrofilos: perfil === 'infeccion' ? rng.real(76, 86) : rng.real(48, 66), linfocitos: perfil === 'infeccion' ? rng.real(10, 18) : rng.real(24, 38),
        plaquetas: rng.entre(180, 360),
      }),
      antibiograma: [],
    };
  }
  if (tipo === 'urocultivo') {
    if (perfil !== 'itu') return { valores: { organismo: 'Sin crecimiento' }, antibiograma: [] };
    return {
      valores: texto({ organismo: 'Escherichia coli', recuento_ufc: rng.uno([100000, 150000, 200000]) }),
      antibiograma: [
        { antibiotico: 'Nitrofurantoína', interpretacion: 'S' }, { antibiotico: 'Fosfomicina', interpretacion: 'S' },
        { antibiotico: 'Ciprofloxacino', interpretacion: rng.uno(['S', 'R'] as const) }, { antibiotico: 'Trimetoprim/sulfametoxazol', interpretacion: 'R' },
        { antibiotico: 'Ampicilina', interpretacion: 'R' }, { antibiotico: 'Ceftriaxona', interpretacion: 'S' },
      ],
    };
  }
  if (tipo === 'orina') {
    const itu = perfil === 'itu';
    return {
      valores: texto({
        color: 'Amarillo', aspecto: itu ? 'Turbio' : 'Transparente', densidad: rng.real(1.012, 1.025, 3), ph: rng.real(5.5, 6.5),
        proteinas: perfil === 'erc' ? 'Trazas' : 'Negativo', glucosa: perfil === 'dm2' ? '+' : 'Negativo', nitritos: itu ? 'Positivo' : 'Negativo',
        sangre: 'Negativo', leucocitos: itu ? rng.entre(20, 40) : rng.entre(0, 3), eritrocitos: itu ? rng.entre(3, 8) : rng.entre(0, 2),
        bacterias: itu ? 'Abundantes' : 'Escasas', cilindros: 'No se observan',
      }),
      antibiograma: [],
    };
  }
  const base: Record<string, number> = {
    glucosa: rng.entre(78, 98), creatinina: sexo === 'F' ? rng.real(0.6, 0.95, 2) : rng.real(0.8, 1.15, 2), nitrogeno_ureico: rng.entre(9, 18),
    colesterol: rng.entre(150, 195), trigliceridos: rng.entre(90, 145), sodio: rng.entre(137, 143), potasio: rng.real(3.8, 4.8),
  };
  if (perfil === 'dm2') Object.assign(base, { glucosa: rng.entre(128, 168) });
  if (perfil === 'dislipidemia') Object.assign(base, { colesterol: rng.entre(232, 262), trigliceridos: rng.entre(180, 240) });
  if (perfil === 'erc') Object.assign(base, { creatinina: rng.real(1.8, 2.2, 2), nitrogeno_ureico: rng.entre(32, 41), potasio: 6.4 });
  return { valores: texto(base), antibiograma: [] };
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
  // Catálogo de tipos de examen (upsert por clave) e índices de `examenes`.
  await prepararLaboratorio(db, CATALOGO);

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

  interface Orden { p: Adulto | Nino; tipo: Tipo; fecha: string; orden: Date; estado: 'PENDIENTE' | 'EN_PROCESO' | 'VALIDADO'; perfil: Perfil; quimico: string; solicitante: string; observaciones: string | null }
  const ordenes: Orden[] = [];
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
  const examen = (_clave: string, p: Adulto | Nino, tipo: Tipo, fecha: string, hora: string, estado: Orden['estado'], perfil: Perfil) => {
    ordenes.push({
      p, tipo, fecha, estado, perfil, quimico: rng.uno(quimicos), orden: new Date(`${fecha}T${hora}:00-06:00`),
      solicitante: 'cronicos' in p ? rng.uno(SOLICITANTES) : 'Dr. Jorge Castillo (Centro pediátrico)',
      observaciones: perfil === 'erc' && tipo === 'quimica' && estado === 'VALIDADO' ? 'Valor crítico de potasio comunicado al médico tratante.' : null,
    });
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
    // Dos citas al azar pueden caer en la misma hora del mismo químico: se corre 15 minutos.
    while (agenda.ocupada(quien, fecha, hora)) {
      const m = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + 15;
      hora = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    }
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

  // Exámenes en orden cronológico, para que los códigos LAB-aaaa-mm-nnnn sigan la fecha de la orden.
  const repo = new MongoExamenRepository(db);
  const ahora = Date.now();
  // Generador aparte: los valores no alteran la secuencia con la que se arman citas y consultas.
  const rngResultados = azar(3304);
  const nombreDe = (clave: string) => {
    const x = PERSONAL_LABORATORIO.find((q) => q.clave === clave)!;
    return `${x.rol === 'QUIMICO_BIOLOGO' ? 'Q.B.' : 'Dr.'} ${x.nombres} ${x.apellidos}`.replace(/^Dr\. (Elisa)/, 'Dra. $1');
  };
  const firma = (clave: string, fecha: Date): Firma => ({ idUsuario: res.personal[clave]!, nombre: nombreDe(clave), fecha: fecha.toISOString() });
  for (const o of ordenes.sort((x, y) => x.orden.getTime() - y.orden.getTime())) {
    const tipo = CATALOGO.find((t) => t.clave === o.tipo)!;
    const { id } = await repo.ordenar({ idPaciente: res.pacientes[o.p.clave]!, tipo: o.tipo, nombre: tipo.nombre, medicoSolicitante: o.solicitante, fecha: o.orden });
    if (o.estado !== 'PENDIENTE') {
      // Lo de hoy que aún no estaría listo se fecha unos minutos antes de correr la semilla.
      const listo = Math.min(o.orden.getTime() + ENTREGA_HORAS[o.tipo] * 3600_000, Math.max(ahora - 10 * 60_000, o.orden.getTime() + 20 * 60_000));
      const { resultados, critico } = construirResultados(tipo, captura(o.tipo, o.perfil, rngResultados, o.p.sexo));
      await repo.guardarResultados(id, { resultados, critico, observaciones: o.observaciones, por: firma(o.quimico, new Date(Math.max(listo - 30 * 60_000, o.orden.getTime() + 15 * 60_000))) });
      if (o.estado === 'VALIDADO') await repo.validar(id, firma('rgodoy', new Date(listo)));
    }
    res.examenes.push({ idPaciente: res.pacientes[o.p.clave]!, idExamen: id, fecha: o.fecha });
  }
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

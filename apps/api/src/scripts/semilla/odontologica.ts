/**
 * Clínica odontológica · CouchDB. Una sola base con campo `type`; _id con prefijo del tipo.
 * Ids deterministas (uuid derivado de una clave): una segunda corrida choca (409) y no duplica.
 */
import type { DocumentScope } from 'nano';
import { MEDICAMENTOS_ADULTO, MEDICAMENTOS_ODONTOLOGIA } from './catalogos.js';
import { ADULTOS, PERSONAL_ODONTOLOGIA, type Adulto } from './personas.js';
import { Agenda, gruposAlergicos, type EstadoCita } from './plan.js';
import { azar, diaHabil, edadEn, HOY, sumarDias, uuidDe } from './util.js';

type Rng = ReturnType<typeof azar>;
type EstadoPieza = 'SANA' | 'CARIES' | 'OBTURADA' | 'AUSENTE' | 'CORONA' | 'ENDODONCIA';
interface Pieza { estado: EstadoPieza; caras?: string[]; nota?: string }

export interface ResultadoOdontologia {
  personal: Record<string, string>;
  pacientes: Record<string, string>;
  consultas: { idPaciente: string; idConsulta: string; medico: string; fecha: string }[];
  omitido: boolean;
}

export const PIEZAS = [1, 2, 3, 4].flatMap((c) => [1, 2, 3, 4, 5, 6, 7, 8].map((p) => `${c}${p}`));
const MOLARES = PIEZAS.filter((p) => ['6', '7'].includes(p[1]!));
const PREMOLARES = PIEZAS.filter((p) => ['4', '5'].includes(p[1]!));
const CARAS = ['O', 'M', 'D', 'V', 'L'];

/** Tratamiento previsto para cada pieza: qué se hizo aquí (con consulta) y qué venía de antes. */
interface Plan { pieza: string; final: Pieza; hechoAqui: boolean }

function planBoca(p: Adulto, rng: Rng): Plan[] {
  const fijo: Record<string, Plan[]> = {
    mjlopez: [
      { pieza: '16', final: { estado: 'OBTURADA', caras: ['O', 'M'] }, hechoAqui: true },
      { pieza: '26', final: { estado: 'ENDODONCIA', nota: 'Pendiente corona' }, hechoAqui: true },
      { pieza: '38', final: { estado: 'AUSENTE', nota: 'Extraído antes del ingreso' }, hechoAqui: false },
      { pieza: '48', final: { estado: 'AUSENTE', nota: 'Extraído antes del ingreso' }, hechoAqui: false },
      { pieza: '37', final: { estado: 'CARIES', caras: ['O'] }, hechoAqui: false },
    ],
    dmonterroso: [{ pieza: '46', final: { estado: 'OBTURADA', caras: ['O'] }, hechoAqui: true }],
    korozco: [
      { pieza: '36', final: { estado: 'CARIES', caras: ['O', 'M', 'D', 'V'], nota: 'Resto radicular, indicada extracción' }, hechoAqui: false },
      { pieza: '26', final: { estado: 'OBTURADA', caras: ['O'] }, hechoAqui: true },
    ],
    plima: [
      { pieza: '14', final: { estado: 'CARIES', caras: ['O', 'D'] }, hechoAqui: false },
      { pieza: '15', final: { estado: 'CARIES', caras: ['M', 'O'] }, hechoAqui: false },
      { pieza: '36', final: { estado: 'OBTURADA', caras: ['O'] }, hechoAqui: false },
    ],
    hramirez: [
      { pieza: '16', final: { estado: 'OBTURADA', caras: ['O'] }, hechoAqui: false },
      { pieza: '46', final: { estado: 'CORONA', nota: 'Corona de porcelana sobre endodoncia' }, hechoAqui: true },
    ],
    avelasquez: [],
  };
  if (fijo[p.clave]) return fijo[p.clave]!;
  const plan: Plan[] = [];
  const usadas = new Set<string>();
  const libre = (xs: string[]) => { const x = rng.uno(xs.filter((y) => !usadas.has(y))); usadas.add(x); return x; };
  if (edadEn(p.nacimiento) > 25) {
    for (const t of ['18', '28', '38', '48']) if (rng.prob(0.45)) { usadas.add(t); plan.push({ pieza: t, final: { estado: 'AUSENTE', nota: 'Tercer molar extraído' }, hechoAqui: rng.prob(0.2) }); }
  }
  const caras = () => Array.from(new Set([rng.uno(CARAS), rng.uno(CARAS)])).sort();
  for (let i = rng.entre(0, 3); i > 0; i--) plan.push({ pieza: libre([...MOLARES, ...PREMOLARES]), final: { estado: 'OBTURADA', caras: caras() }, hechoAqui: rng.prob(0.6) });
  if (rng.prob(0.25)) plan.push({ pieza: libre(MOLARES), final: { estado: 'ENDODONCIA' }, hechoAqui: true });
  if (edadEn(p.nacimiento) > 45 && rng.prob(0.5)) plan.push({ pieza: libre(MOLARES), final: { estado: 'AUSENTE', nota: 'Extracción por enfermedad periodontal' }, hechoAqui: rng.prob(0.5) });
  for (let i = rng.entre(0, 2); i > 0; i--) plan.push({ pieza: libre([...MOLARES, ...PREMOLARES]), final: { estado: 'CARIES', caras: caras() }, hechoAqui: false });
  return plan;
}

/** La alergia apunta al medicamento del catálogo de la clínica; si no está, a uno del mismo grupo (penicilina → amoxicilina). */
function medicamentoAlergia(med: string | undefined, meds: Record<string, string>): string | null {
  if (!med) return null;
  if (meds[med]) return meds[med]!;
  const grupo = [...MEDICAMENTOS_ADULTO, ...MEDICAMENTOS_ODONTOLOGIA].find((m) => m.clave === med)?.grupo;
  const igual = grupo ? MEDICAMENTOS_ODONTOLOGIA.find((m) => m.grupo === grupo) : undefined;
  return igual ? meds[igual.clave]! : null;
}

export function odontograma(plan: Plan[]): Record<string, Pieza> {
  const o: Record<string, Pieza> = {};
  for (const p of PIEZAS) o[p] = { estado: 'SANA' };
  for (const x of plan) o[x.pieza] = x.final;
  return o;
}

const PROCEDIMIENTO: Record<EstadoPieza, { nombre: string; dx: string; tipoDx: 'DEFINITIVO' | 'PRESUNTIVO' }> = {
  OBTURADA: { nombre: 'Restauración con resina compuesta', dx: 'Caries de la dentina (K02.1)', tipoDx: 'DEFINITIVO' },
  ENDODONCIA: { nombre: 'Tratamiento de conductos (endodoncia)', dx: 'Pulpitis irreversible (K04.0)', tipoDx: 'DEFINITIVO' },
  CORONA: { nombre: 'Colocación de corona de porcelana', dx: 'Diente con tratamiento de conductos, estructura insuficiente (K08.8)', tipoDx: 'DEFINITIVO' },
  AUSENTE: { nombre: 'Extracción simple', dx: 'Necrosis de la pulpa / resto radicular (K04.1)', tipoDx: 'DEFINITIVO' },
  CARIES: { nombre: 'Diagnóstico de caries', dx: 'Caries de la dentina (K02.1)', tipoDx: 'DEFINITIVO' },
  SANA: { nombre: 'Revisión', dx: 'Examen odontológico (Z01.2)', tipoDx: 'DEFINITIVO' },
};

export async function sembrarOdontologica(db: DocumentScope<unknown>): Promise<ResultadoOdontologia> {
  const rng = azar(4404);
  const res: ResultadoOdontologia = { personal: {}, pacientes: {}, consultas: [], omitido: false };
  const docs: Record<string, unknown>[] = [];

  for (const p of PERSONAL_ODONTOLOGIA) {
    const id = uuidDe(`odontologia:personal:${p.clave}`);
    res.personal[p.clave] = id;
    docs.push({ _id: `personal:${id}`, type: 'personal', nombres: p.nombres, apellidos: p.apellidos, numero_colegiado: p.colegiado, especialidades: p.especialidades, rol: p.rol, activo: true });
  }
  const meds: Record<string, string> = {};
  for (const m of MEDICAMENTOS_ODONTOLOGIA) {
    const id = uuidDe(`odontologia:medicamento:${m.clave}`);
    meds[m.clave] = id;
    docs.push({ _id: `medicamento:${id}`, type: 'medicamento', nombre: m.nombre, presentacion: m.presentacion, concentracion: m.concentracion });
  }

  // Pacientes: si ya existe uno con el mismo CUI (alta manual o semilla anterior), se completa en lugar de duplicarlo.
  const adultos = ADULTOS.filter((a) => a.en.includes('odontologia'));
  const planes: Record<string, Plan[]> = {};
  for (const p of adultos) {
    planes[p.clave] = planBoca(p, azar(Number(p.cui.slice(0, 9))));
    const previo = (await db.find({ selector: { type: 'paciente', cui: p.cui }, limit: 1 })).docs[0] as Record<string, any> | undefined;
    const clinico = {
      contactos_emergencia: p.contacto ? [{ nombre_completo: p.contacto.nombre, parentesco: p.contacto.parentesco, telefonos: p.contacto.telefonos }] : [],
      alergias: p.alergias.map((a, i) => ({
        id: uuidDe(`odontologia:alergia:${p.cui}:${i}`), tipo: a.tipo, descripcion: a.descripcion, severidad: a.severidad,
        medicamento_id: medicamentoAlergia(a.med, meds),
      })),
      antecedentes: p.antecedentes.map((a, i) => ({ id: uuidDe(`odontologia:antecedente:${p.cui}:${i}`), tipo: a.tipo, descripcion: a.descripcion })),
      odontograma: odontograma(planes[p.clave]!),
    };
    if (previo) {
      res.pacientes[p.clave] = String(previo._id).slice('paciente:'.length);
      if (!Object.keys(previo.odontograma ?? {}).length && !(previo.alergias ?? []).length) await db.insert({ ...previo, ...clinico } as never);
      continue;
    }
    const id = uuidDe(`odontologia:paciente:${p.cui}`);
    res.pacientes[p.clave] = id;
    docs.push({
      _id: `paciente:${id}`, type: 'paciente', cui: p.cui, nombres: p.nombres, apellidos: p.apellidos, fecha_nacimiento: p.nacimiento,
      sexo: p.sexo, tipo_sangre: p.sangre, direccion: p.direccion, procedencia: p.procedencia, estado: 'ACTIVO', baja: null,
      telefonos: p.telefonos, emails: p.emails, ...clinico,
    });
  }

  const hayConsultas = (await db.find({ selector: { type: 'consulta' }, fields: ['_id'], limit: 1 })).docs.length > 0;
  if (!hayConsultas) {
    const agenda = new Agenda(rng);
    const cita = (p: string, medico: string, fecha: string, hora: string, motivo: string, estado: EstadoCita) => {
      const medicoId = res.personal[medico]!;
      const id = `${medicoId}:${fecha}T${hora}`;
      docs.push({
        _id: `cita:${id}`, type: 'cita', paciente_id: res.pacientes[p], medico_id: medicoId, fecha, hora, motivo, estado,
        creada_en: new Date(`${sumarDias(fecha, -rng.entre(1, 10))}T15:00:00-06:00`).toISOString(),
      });
      return id;
    };
    const consulta = (p: Adulto, medico: string, fecha: string, hora: string, citaId: string | null, motivo: string,
      procs: { pieza: string | null; nombre: string; caras?: string[]; estado: EstadoPieza | null; nota?: string }[],
      dx: { tipo: 'DEFINITIVO' | 'PRESUNTIVO'; enfermedad: string; obs?: string }[], receta: 'extraccion' | 'endodoncia' | null, cerrada = true) => {
      const id = uuidDe(`odontologia:consulta:${p.clave}:${fecha}:${hora}`);
      const medicoId = res.personal[medico]!;
      const alergico = gruposAlergicos(p, MEDICAMENTOS_ODONTOLOGIA);
      const renglon = (med: string, dosis: string, frecuencia: number, dias: number, cantidad: number, indicaciones?: string) => {
        const m = MEDICAMENTOS_ODONTOLOGIA.find((x) => x.clave === med)!;
        return { medicamento_id: meds[med], nombre: `${m.nombre} ${m.concentracion}`, dosis, via_administracion: 'Oral', frecuencia_horas: frecuencia, duracion_dias: dias, cantidad, indicaciones: indicaciones ?? null };
      };
      const analgesico = alergico.has('aine') ? renglon('acetaminofen', '1 tableta', 8, 3, 9, 'Alérgico a AINE.') : renglon('ibuprofeno', '1 tableta', 8, 3, 9, 'Después de comer.');
      const renglones = receta === 'extraccion'
        ? [alergico.has('penicilina') ? renglon('clindamicina', '1 cápsula', 8, 7, 21, 'Alérgico a penicilina.') : renglon('amoxicilina', '1 cápsula', 8, 7, 21), analgesico,
          { ...renglon('clorhexidina', '15 mL', 12, 7, 1, 'Enjuagar 30 segundos sin tragar, a partir de mañana.'), via_administracion: 'Enjuague bucal' }]
        : receta === 'endodoncia' ? [analgesico] : [];
      docs.push({
        _id: `consulta:${id}`, type: 'consulta', paciente_id: res.pacientes[p.clave], cita_id: citaId, medico_id: medicoId,
        fecha, hora, motivo_consulta: motivo, historia_enfermedad_actual: null,
        notas_evolucion: cerrada ? `Procedimiento sin complicaciones. ${receta === 'extraccion' ? 'Se dan indicaciones postextracción.' : 'Paciente tolera bien.'}` : null,
        signos_vitales: { presion_sistolica: rng.entre(108, 132), presion_diastolica: rng.entre(68, 84), frecuencia_cardiaca: rng.entre(64, 88) },
        diagnosticos: cerrada ? dx.map((x, i) => ({
          id: uuidDe(`${id}:dx:${i}`), tipo: x.tipo, enfermedad_detectada: x.enfermedad, observaciones: x.obs ?? null,
          tratamientos: i > 0 ? [] : [{
            id: uuidDe(`${id}:tr`), tipo: renglones.length ? 'Farmacológico y procedimiento' : 'Procedimiento', descripcion: procs.map((pr) => pr.nombre).join(', '),
            indicaciones: receta === 'extraccion' ? 'No escupir ni usar pajilla por 24 horas, dieta blanda y fría.' : 'Evitar alimentos duros por 24 horas.',
            fecha_inicio: fecha, fecha_fin: renglones.length ? sumarDias(fecha, 6) : fecha,
            receta: renglones.length ? { id: uuidDe(`${id}:rx`), fecha_emision: fecha, medico_id: medicoId, renglones } : null,
          }],
        })) : [],
        procedimientos: cerrada ? procs.map((pr) => ({ pieza: pr.pieza, procedimiento: pr.nombre, caras: pr.caras ?? [], estado_resultante: pr.estado, nota: pr.nota ?? null })) : [],
        cerrada,
        creada_en: new Date(`${fecha}T${hora}:00-06:00`).toISOString(),
      });
      res.consultas.push({ idPaciente: res.pacientes[p.clave]!, idConsulta: id, medico, fecha });
    };

    const generales = ['fcastillo', 'mvela'];
    for (const p of adultos) {
      if (p.clave === 'avelasquez') continue;
      const plan = planes[p.clave]!;
      const medico = p.clave === 'hramirez' || p.clave === 'korozco' || p.clave === 'plima' || p.clave === 'dmonterroso' ? 'fcastillo' : rng.uno(generales);
      // Primera consulta: valoración y profilaxis; se diagnostican las caries.
      const inicio = -rng.entre(160, 330);
      const f0 = diaHabil(inicio);
      const h0 = agenda.reservar(medico, f0);
      const c0 = cita(p.clave, medico, f0, h0, 'Valoración inicial y limpieza', 'ATENDIDA');
      const cariadas = plan.filter((x) => x.hechoAqui || x.final.estado === 'CARIES').filter((x) => x.final.estado !== 'AUSENTE' || x.hechoAqui);
      consulta(p, medico, f0, h0, c0, 'Valoración inicial y limpieza',
        [{ pieza: null, nombre: 'Profilaxis dental y detartraje', estado: null }, ...cariadas.map((x) => ({ pieza: x.pieza, nombre: 'Diagnóstico de caries', caras: x.final.caras, estado: 'CARIES' as const, nota: x.final.nota }))],
        [{ tipo: 'DEFINITIVO', enfermedad: 'Gingivitis crónica (K05.1)' }, ...(cariadas.length ? [{ tipo: 'DEFINITIVO' as const, enfermedad: `Caries de la dentina (K02.1) en piezas ${cariadas.map((x) => x.pieza).join(', ')}` }] : [])],
        null);
      // Un tratamiento por pieza hecha aquí, en orden.
      let t = inicio;
      for (const x of plan.filter((y) => y.hechoAqui)) {
        t += rng.entre(10, 40);
        if (t > -3) break;
        const quien = x.final.estado === 'ENDODONCIA' || x.final.estado === 'CORONA' ? 'mvela' : medico;
        const f = diaHabil(t);
        const h = agenda.reservar(quien, f);
        const proc = PROCEDIMIENTO[x.final.estado];
        const motivo = `${proc.nombre} pieza ${x.pieza}`;
        const c = cita(p.clave, quien, f, h, motivo, 'ATENDIDA');
        consulta(p, quien, f, h, c, motivo, [{ pieza: x.pieza, nombre: proc.nombre, caras: x.final.caras, estado: x.final.estado, nota: x.final.nota }],
          [{ tipo: proc.tipoDx, enfermedad: `${proc.dx}, pieza ${x.pieza}` }],
          x.final.estado === 'AUSENTE' ? 'extraccion' : x.final.estado === 'ENDODONCIA' ? 'endodoncia' : null);
      }
    }

    // Ortodoncia de Andrea con la Dra. Rosales.
    const andrea = adultos.find((a) => a.clave === 'avelasquez')!;
    const orto = [
      [-300, 'Valoración de ortodoncia', 'Valoración ortodóntica con modelos y radiografía panorámica', 'Maloclusión clase II, división 1 (K07.2)'],
      [-270, 'Colocación de brackets', 'Instalación de aparatología fija superior e inferior', 'Maloclusión clase II, división 1 (K07.2)'],
      [-90, 'Control de brackets', 'Cambio de arco y ligaduras', 'Control de ortodoncia (Z46.4)'],
      [-60, 'Control de brackets', 'Cambio de ligaduras', 'Control de ortodoncia (Z46.4)'],
      [-30, 'Control de brackets', 'Cambio de arco y ligaduras, se colocan elásticos clase II', 'Control de ortodoncia (Z46.4)'],
    ] as const;
    for (const [dias, motivo, proc, dx] of orto) {
      const f = diaHabil(dias);
      const h = agenda.reservar('crosales', f);
      const c = cita('avelasquez', 'crosales', f, h, motivo, 'ATENDIDA');
      consulta(andrea, 'crosales', f, h, c, motivo, [{ pieza: null, nombre: proc, estado: null }], [{ tipo: 'DEFINITIVO', enfermedad: dx }], null);
    }

    // Agenda de hoy del Dr. Castillo (prototipo: Recepción).
    const hoy = (k: string, hora: string, motivo: string, estado: EstadoCita, medico = 'fcastillo') =>
      cita(k, medico, HOY, agenda.reservar(medico, HOY, hora), motivo, estado);
    const p = (k: string) => adultos.find((a) => a.clave === k)!;
    const c1 = hoy('dmonterroso', '09:00', 'Limpieza dental', 'ATENDIDA');
    consulta(p('dmonterroso'), 'fcastillo', HOY, '09:00', c1, 'Limpieza dental', [{ pieza: null, nombre: 'Profilaxis dental y aplicación de flúor', estado: null }],
      [{ tipo: 'DEFINITIVO', enfermedad: 'Depósitos (acreción) en los dientes (K03.6)' }], null);
    const c2 = hoy('korozco', '09:30', 'Extracción molar 36', 'EN_CONSULTA');
    consulta(p('korozco'), 'fcastillo', HOY, '09:30', c2, 'Extracción molar 36', [], [], null, false);
    hoy('plima', '10:00', 'Resinas 14 y 15', 'CONFIRMADA');
    hoy('hramirez', '10:30', 'Valoración de ortodoncia', 'PROGRAMADA');
    hoy('avelasquez', '11:00', 'Control de brackets', 'PROGRAMADA');
    hoy('bcastaneda', '14:00', 'Dolor en molar inferior derecho', 'PROGRAMADA', 'mvela');
    hoy('mjlopez', '15:00', 'Corona pieza 26', 'CONFIRMADA', 'mvela');

    // Próximas citas e inasistencias.
    for (const [k, motivo, medico] of [['msolares', 'Limpieza dental', 'fcastillo'], ['cuaju', 'Resina pieza pendiente', 'fcastillo'], ['avelasquez', 'Control de brackets', 'crosales'], ['pxicara', 'Limpieza dental', 'mvela'], ['kmonzon', 'Blanqueamiento dental', 'fcastillo']] as const) {
      const f = diaHabil(rng.entre(2, 35));
      cita(k, medico, f, agenda.reservar(medico, f), motivo, rng.prob(0.4) ? 'CONFIRMADA' : 'PROGRAMADA');
    }
    for (const [k, estado] of [['grecinos', 'NO_ASISTIO'], ['ecifuentes', 'CANCELADA'], ['amorales', 'NO_ASISTIO']] as const) {
      const f = diaHabil(-rng.entre(4, 45));
      cita(k, 'fcastillo', f, agenda.reservar('fcastillo', f), 'Limpieza dental', estado);
    }
  }

  // bulk no falla por conflictos: cada documento existente responde 409 y se ignora.
  const r = await db.bulk({ docs: docs as never[] });
  const errores = r.filter((x) => x.error && x.error !== 'conflict');
  if (errores.length) throw new Error(`CouchDB rechazó documentos: ${JSON.stringify(errores.slice(0, 3))}`);
  return { ...res, omitido: hayConsultas };
}

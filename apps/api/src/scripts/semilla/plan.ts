/**
 * Plan de atención de adultos, independiente del motor: qué citas y consultas tiene cada paciente.
 * Hospital y laboratorio lo traducen a su propio modelo.
 */
import { CASOS, MEDICAMENTOS_ADULTO, MEDICAMENTOS_ODONTOLOGIA, MEDICAMENTOS_PEDIATRICO, type Caso, type Renglon } from './catalogos.js';
import type { Adulto } from './personas.js';
import { azar, dia, diaHabil, HOY, r1 } from './util.js';

export type EstadoCita = 'PROGRAMADA' | 'CONFIRMADA' | 'EN_CONSULTA' | 'ATENDIDA' | 'NO_ASISTIO' | 'CANCELADA';

export interface Encuentro {
  paciente: string;   // clave del adulto
  medico: string;     // clave del profesional
  fecha: string;
  hora: string;       // HH:mm
  estado: EstadoCita;
  caso: Caso;
  /** false = consulta sin cita previa (emergencia o espontánea). */
  conCita: boolean;
  /** Se crea consulta: ATENDIDA (cerrada) o EN_CONSULTA (abierta, sin diagnóstico). */
  consulta: 'cerrada' | 'abierta' | null;
  especialidad?: string;
}

export interface Signos {
  presionSistolica: number | null; presionDiastolica: number | null; frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number; saturacionOxigeno: number; temperaturaC: number;
}

const HORAS = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30'];

/** Lleva la cuenta de horarios ocupados por profesional para no chocar (los índices únicos lo exigen). */
export class Agenda {
  private ocupado = new Set<string>();
  constructor(private readonly rng: ReturnType<typeof azar>) {}
  ocupada(medico: string, fecha: string, hora: string): boolean {
    return this.ocupado.has(`${medico}|${fecha}|${hora}`);
  }
  reservar(medico: string, fecha: string, hora?: string): string {
    if (hora) {
      const k = `${medico}|${fecha}|${hora}`;
      if (this.ocupado.has(k)) throw new Error(`Horario repetido en la semilla: ${k}`);
      this.ocupado.add(k);
      return hora;
    }
    const inicio = this.rng.entre(0, HORAS.length - 1);
    for (let i = 0; i < HORAS.length; i++) {
      const h = HORAS[(inicio + i) % HORAS.length]!;
      const k = `${medico}|${fecha}|${h}`;
      if (!this.ocupado.has(k)) { this.ocupado.add(k); return h; }
    }
    throw new Error(`Agenda llena: ${medico} ${fecha}`);
  }
}

/** Grupos de medicamentos a los que el paciente es alérgico. */
export function gruposAlergicos(p: { alergias: { med?: string }[] }, catalogo = MEDICAMENTOS_ADULTO): Set<string> {
  const g = new Set<string>();
  const todos = [...catalogo, ...MEDICAMENTOS_ADULTO, ...MEDICAMENTOS_PEDIATRICO, ...MEDICAMENTOS_ODONTOLOGIA];
  for (const a of p.alergias) {
    const m = todos.find((x) => x.clave === a.med);
    if (m?.grupo) g.add(m.grupo);
    if (a.med) g.add(`med:${a.med}`);
  }
  return g;
}

/** Receta del caso respetando las alergias del paciente (nunca se receta algo a lo que es alérgico). */
export function recetaPara(caso: Caso, p: Adulto): Renglon[] {
  const alergico = gruposAlergicos(p);
  let receta = caso.receta;
  if (caso.alternativa && alergico.has(caso.alternativa.grupo)) receta = caso.alternativa.receta;
  return receta.filter((r) => {
    const m = MEDICAMENTOS_ADULTO.find((x) => x.clave === r.med);
    return !alergico.has(`med:${r.med}`) && !(m?.grupo && alergico.has(m.grupo));
  });
}

export function signosAdulto(tipo: Caso['signos'], rng: ReturnType<typeof azar>): Signos {
  const s: Signos = {
    presionSistolica: rng.entre(108, 126), presionDiastolica: rng.entre(68, 82), frecuenciaCardiaca: rng.entre(62, 86),
    frecuenciaRespiratoria: rng.entre(14, 18), saturacionOxigeno: rng.entre(96, 99), temperaturaC: rng.real(36.2, 36.9),
  };
  if (tipo === 'hta') { s.presionSistolica = rng.entre(132, 152); s.presionDiastolica = rng.entre(84, 96); }
  if (tipo === 'fiebre') { s.temperaturaC = rng.real(38.0, 39.2); s.frecuenciaCardiaca = rng.entre(92, 108); }
  if (tipo === 'respiratorio') { s.frecuenciaRespiratoria = rng.entre(20, 24); s.saturacionOxigeno = rng.entre(92, 95); }
  if (tipo === 'dolor') { s.presionSistolica = rng.entre(122, 138); s.frecuenciaCardiaca = rng.entre(80, 96); }
  return s;
}

export const pesoEnConsulta = (p: Adulto, rng: ReturnType<typeof azar>) => r1(p.pesoKg + rng.real(-1.5, 1.5));

/**
 * Plan del hospital. `medicoPara` elige al profesional según el caso.
 * Hoy reproduce las agendas del prototipo (Dra. Pérez 08:00–11:30).
 */
export function planHospital(adultos: Adulto[], medicoPara: (caso: string, rng: ReturnType<typeof azar>) => { medico: string; especialidad: string }): Encuentro[] {
  const rng = azar(20261109);
  const agenda = new Agenda(rng);
  const out: Encuentro[] = [];
  const caso = (c: string) => { const x = CASOS[c]; if (!x) throw new Error(`Caso desconocido: ${c}`); return x; };

  const hoy = (paciente: string, medico: string, especialidad: string, hora: string, c: string, estado: EstadoCita) => {
    agenda.reservar(medico, HOY, hora);
    out.push({
      paciente, medico, especialidad, fecha: HOY, hora, estado, caso: caso(c), conCita: true,
      consulta: estado === 'ATENDIDA' ? 'cerrada' : estado === 'EN_CONSULTA' ? 'abierta' : null,
    });
  };
  // Agenda de hoy de la Dra. Pérez (prototipo: Inicio y Citas).
  hoy('mjlopez', 'aperez', 'Medicina interna', '08:00', 'hta', 'ATENDIDA');
  hoy('cuaju', 'aperez', 'Medicina interna', '08:30', 'dolor-toracico', 'EN_CONSULTA');
  hoy('shernandez', 'aperez', 'Medicina interna', '09:00', 'erc-hiperk', 'CONFIRMADA');
  hoy('lmazariegos', 'aperez', 'Medicina general', '09:30', 'primera-consulta', 'CONFIRMADA');
  hoy('rgomez', 'aperez', 'Medicina interna', '10:00', 'postoperatorio', 'CONFIRMADA');
  hoy('jtum', 'aperez', 'Medicina interna', '10:30', 'dm2', 'PROGRAMADA');
  hoy('grecinos', 'aperez', 'Medicina general', '11:00', 'rinitis', 'CANCELADA');
  hoy('amorales', 'aperez', 'Medicina general', '11:30', 'chequeo', 'PROGRAMADA');
  // Otros médicos hoy.
  hoy('rarriaga', 'cmendez', 'Cardiología', '08:00', 'hta', 'ATENDIDA');
  hoy('jcux', 'cmendez', 'Cardiología', '09:00', 'hta-doble', 'CONFIRMADA');
  hoy('ecifuentes', 'mbarillas', 'Medicina general', '10:00', 'lumbalgia', 'PROGRAMADA');
  hoy('pxicara', 'jochoa', 'Neumología', '09:00', 'asma', 'CONFIRMADA');
  hoy('lbarrios', 'snatareno', 'Endocrinología', '08:30', 'hipotiroidismo', 'ATENDIDA');

  const pasado = (paciente: Adulto, c: string, haceDias: number, estado: EstadoCita = 'ATENDIDA', conCita = true) => {
    const fecha = diaHabil(-haceDias);
    if (paciente.baja && haceDias <= paciente.baja.hace) return;
    const { medico, especialidad } = medicoPara(c, rng);
    const hora = agenda.reservar(medico, fecha);
    out.push({ paciente: paciente.clave, medico, especialidad, fecha, hora, estado, caso: caso(c), conCita, consulta: estado === 'ATENDIDA' ? 'cerrada' : null });
  };

  for (const p of adultos) {
    if (!p.en.includes('hospital')) continue;
    for (const c of p.cronicos) {
      for (const hace of [rng.entre(250, 290), rng.entre(160, 200), rng.entre(70, 110)]) pasado(p, c, hace);
      // Próximo control.
      if (!p.baja && !['shernandez', 'jtum', 'jcux', 'pxicara', 'lbarrios', 'rarriaga'].includes(p.clave)) {
        const { medico, especialidad } = medicoPara(c, rng);
        const fecha = diaHabil(rng.entre(7, 60));
        out.push({ paciente: p.clave, medico, especialidad, fecha, hora: agenda.reservar(medico, fecha), estado: rng.prob(0.3) ? 'CONFIRMADA' : 'PROGRAMADA', caso: caso(c), conCita: true, consulta: null });
      }
    }
    for (const c of p.agudos) pasado(p, c, c === 'colecistitis' ? rng.entre(55, 75) : rng.entre(15, 320), 'ATENDIDA', rng.prob(0.75));
  }
  // Inasistencias y cancelaciones en el pasado (sin consulta).
  for (const [clave, c, estado] of [
    ['mperez', 'gastritis', 'NO_ASISTIO'], ['echoc', 'faringo', 'NO_ASISTIO'], ['msolares', 'cefalea', 'CANCELADA'],
    ['vtzoc', 'chequeo', 'NO_ASISTIO'], ['bcastaneda', 'chequeo', 'CANCELADA'], ['kmonzon', 'rinitis', 'NO_ASISTIO'],
  ] as const) {
    const p = adultos.find((a) => a.clave === clave)!;
    pasado(p, c, rng.entre(5, 60), estado);
  }
  // Seguimientos futuros de cuadros recientes.
  for (const [clave, c, en] of [['cuaju', 'dolor-toracico', 7], ['shernandez', 'erc-hiperk', 2], ['rgomez', 'postoperatorio', 14], ['grecinos', 'rinitis', 3]] as const) {
    const { medico, especialidad } = clave === 'rgomez' ? { medico: 'restrada', especialidad: 'Cirugía general' } : { medico: 'aperez', especialidad: 'Medicina interna' };
    const fecha = diaHabil(en);
    out.push({ paciente: clave, medico, especialidad, fecha, hora: agenda.reservar(medico, fecha), estado: 'PROGRAMADA', caso: caso(c), conCita: true, consulta: null });
  }
  return out.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

/** Notas de evolución con un toque propio de cada paciente. */
export function notas(e: Encuentro, p: Adulto): string {
  return `${e.caso.evolucion}${p.cronicos.length && e.caso.clave !== p.cronicos[0] ? ` Paciente con ${p.antecedentes[0]?.descripcion.toLowerCase() ?? 'antecedentes conocidos'}.` : ''}`;
}

export { dia };

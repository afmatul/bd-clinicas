import type { RecepcionDelDia, RegistroRapidoInput, RegistroRapidoResultado, Turno } from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO } from '../datos/demo';

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Turnos del prototipo (vista "recepcion") para el modo demo. */
const ODONTOLOGO_DEMO = { id: 'demo', nombre: 'Dr. Fernando Castillo' };
const turnoDemo = (hora: string, nombres: string, apellidos: string, motivo: string, estado: Turno['estado']): Turno => ({
  id: `demo:${hora}`, hora, idPaciente: `demo-${hora}`, paciente: { nombres, apellidos }, motivo, estado, llegada: null,
  idOdontologo: ODONTOLOGO_DEMO.id, odontologo: ODONTOLOGO_DEMO.nombre,
});
let demo: RecepcionDelDia | null = null;
const recepcionDemo = (): RecepcionDelDia =>
  (demo ??= {
    fecha: hoyLocal(),
    odontologos: [ODONTOLOGO_DEMO],
    turnos: [
      turnoDemo('09:00', 'Diana', 'Monterroso', 'Limpieza dental', 'ATENDIDA'),
      turnoDemo('09:30', 'Kevin', 'Orozco', 'Extracción molar 36', 'EN_CONSULTA'),
      turnoDemo('10:00', 'Paola', 'Lima', 'Resinas 14 y 15', 'CONFIRMADA'),
      turnoDemo('10:30', 'Héctor', 'Ramírez', 'Valoración de ortodoncia', 'PROGRAMADA'),
      turnoDemo('11:00', 'Andrea', 'Velásquez', 'Control de brackets', 'PROGRAMADA'),
    ],
    siguienteLibre: { hora: '11:30', idOdontologo: ODONTOLOGO_DEMO.id, odontologo: ODONTOLOGO_DEMO.nombre },
  });

export async function obtenerRecepcion(): Promise<RecepcionDelDia> {
  if (MODO_DEMO) return structuredClone(recepcionDemo());
  return api<RecepcionDelDia>('/odontologia/recepcion');
}

export async function marcarLlegada(idTurno: string): Promise<{ llegada: string }> {
  if (MODO_DEMO) {
    const llegada = new Date().toISOString();
    const t = recepcionDemo().turnos.find((x) => x.id === idTurno);
    if (t) t.llegada = llegada;
    return { llegada };
  }
  return api(`/odontologia/recepcion/turnos/${encodeURIComponent(idTurno)}/llegada`, { method: 'POST' });
}

export async function registroRapido(input: RegistroRapidoInput): Promise<RegistroRapidoResultado> {
  if (MODO_DEMO) {
    const d = recepcionDemo();
    const libre = input.asignarTurno ? d.siguienteLibre : null;
    if (!libre) return { idPaciente: 'demo-nuevo', turno: null };
    const [nombres = '', ...resto] = input.nombreCompleto.trim().split(/\s+/);
    d.turnos.push(turnoDemo(libre.hora, nombres, resto.join(' '), input.motivo, 'PROGRAMADA'));
    const [h, m] = libre.hora.split(':').map(Number) as [number, number];
    const sig = h * 60 + m + 30;
    d.siguienteLibre = sig + 30 <= 17 * 60 ? { ...libre, hora: `${String(Math.floor(sig / 60)).padStart(2, '0')}:${String(sig % 60).padStart(2, '0')}` } : null;
    return { idPaciente: 'demo-nuevo', turno: { id: `demo:${libre.hora}`, hora: libre.hora, odontologo: libre.odontologo } };
  }
  return api<RegistroRapidoResultado>('/odontologia/recepcion/registro-rapido', { method: 'POST', body: input });
}

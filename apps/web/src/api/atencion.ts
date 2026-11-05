import type { AbrirConsultaInput, BorradorConsultaInput, CerrarConsultaInput, ConsultaDetalle, Medicamento, PacienteFicha, Receta } from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO, PACIENTES_DEMO } from '../datos/demo';
import { ahoraLocal } from '../datos/formato';

export function fichaPaciente(id: string): Promise<PacienteFicha> {
  if (MODO_DEMO) {
    const p = PACIENTES_DEMO.find((x) => x.id === id) ?? PACIENTES_DEMO[0]!;
    return Promise.resolve({
      ...p, direccion: null, procedencia: null, telefonos: p.telefono ? [p.telefono] : [], emails: [], baja: null, antecedentes: [],
      alergias: [{ id: 'a1', tipo: 'Medicamento', descripcion: 'Penicilina', severidad: 'SEVERA', idMedicamento: null }],
    });
  }
  return api<PacienteFicha>(`/pacientes/${encodeURIComponent(id)}`);
}

export function abrirConsulta(input: AbrirConsultaInput): Promise<{ id: string; retomada: boolean }> {
  if (MODO_DEMO) return Promise.resolve({ id: 'demo', retomada: false });
  return api('/consultas', { method: 'POST', body: input });
}

export function obtenerConsulta(id: string): Promise<ConsultaDetalle> {
  if (MODO_DEMO) {
    return Promise.resolve({
      id, idPaciente: '1', idCita: null, idMedico: 'demo', fecha: ahoraLocal().fecha, hora: '08:31', motivo: 'Control de hipertensión',
      historiaEnfermedadActual: null, notasEvolucion: null, observaciones: null, pesoKg: null, tallaCm: null, signos: null, diagnosticos: [], cerrada: false,
    });
  }
  return api<ConsultaDetalle>(`/consultas/${encodeURIComponent(id)}`);
}

export function guardarBorrador(id: string, input: BorradorConsultaInput): Promise<void> {
  if (MODO_DEMO) return Promise.resolve();
  return api(`/consultas/${encodeURIComponent(id)}/borrador`, { method: 'PUT', body: input });
}

export function cerrarConsulta(id: string, input: CerrarConsultaInput): Promise<ConsultaDetalle> {
  if (MODO_DEMO) return obtenerConsulta(id).then((c) => ({ ...c, cerrada: true }));
  return api<ConsultaDetalle>(`/consultas/${encodeURIComponent(id)}/cierre`, { method: 'POST', body: input });
}

export function historialConsultas(idPaciente: string): Promise<ConsultaDetalle[]> {
  if (MODO_DEMO) return Promise.resolve([]);
  return api<ConsultaDetalle[]>('/consultas', { query: { paciente: idPaciente } });
}

const MEDICAMENTOS_DEMO: Medicamento[] = [
  { id: 'm1', nombre: 'Losartán', presentacion: 'tableta', concentracion: '50 mg' },
  { id: 'm2', nombre: 'Hidroclorotiazida', presentacion: 'tableta', concentracion: '12.5 mg' },
  { id: 'm3', nombre: 'Amoxicilina', presentacion: 'cápsula', concentracion: '500 mg' },
];

export function buscarMedicamentos(q: string): Promise<Medicamento[]> {
  if (MODO_DEMO) return Promise.resolve(MEDICAMENTOS_DEMO.filter((m) => m.nombre.toLowerCase().includes(q.toLowerCase())));
  return api<Medicamento[]>('/medicamentos', { query: { q } });
}

export function recetasDelPaciente(idPaciente: string, vigentes = false): Promise<Receta[]> {
  if (MODO_DEMO) return Promise.resolve([]);
  return api<Receta[]>('/recetas', { query: { paciente: idPaciente, vigentes } });
}

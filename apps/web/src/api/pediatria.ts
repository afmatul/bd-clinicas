import type {
  AplicarDosisInput, DosisVencida, PacienteFicha, RegistrarMedicionInput, SeguimientoPediatrico, Vacuna,
} from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO } from '../datos/demo';
import { FICHA_DEMO, SEGUIMIENTO_DEMO, VACUNAS_DEMO, VENCIDAS_DEMO } from '../datos/demo-pediatria';

/** Módulo pediatria (solo Centro pediátrico · MySQL). En modo demo usa los datos del prototipo. */

export function fichaPaciente(id: string): Promise<PacienteFicha> {
  if (MODO_DEMO) return Promise.resolve(FICHA_DEMO);
  return api<PacienteFicha>(`/pacientes/${encodeURIComponent(id)}`);
}

export function seguimientoPediatrico(id: string): Promise<SeguimientoPediatrico> {
  if (MODO_DEMO) return Promise.resolve(SEGUIMIENTO_DEMO);
  return api<SeguimientoPediatrico>(`/pediatria/pacientes/${encodeURIComponent(id)}`);
}

export function registrarMedicion(id: string, input: RegistrarMedicionInput) {
  if (MODO_DEMO) return Promise.resolve({ id: 'demo' });
  return api<{ id: string }>(`/pediatria/pacientes/${encodeURIComponent(id)}/mediciones`, { method: 'POST', body: input });
}

export function aplicarDosis(id: string, input: AplicarDosisInput) {
  if (MODO_DEMO) return Promise.resolve({ id: 'demo' });
  return api<{ id: string }>(`/pediatria/pacientes/${encodeURIComponent(id)}/dosis`, { method: 'POST', body: input });
}

export function listarVacunas(): Promise<Vacuna[]> {
  if (MODO_DEMO) return Promise.resolve(VACUNAS_DEMO);
  return api<Vacuna[]>('/pediatria/vacunas');
}

export function dosisVencidas(): Promise<DosisVencida[]> {
  if (MODO_DEMO) return Promise.resolve(VENCIDAS_DEMO);
  return api<DosisVencida[]>('/pediatria/dosis-vencidas');
}

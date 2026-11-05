import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import { api } from './cliente';
import { MODO_DEMO } from '../datos/demo';

const idDemo = () => String(Date.now());

export function registrarAlergia(idPaciente: string, input: RegistrarAlergiaInput): Promise<{ id: string }> {
  if (MODO_DEMO) return Promise.resolve({ id: idDemo() });
  return api(`/pacientes/${idPaciente}/alergias`, { method: 'POST', body: input });
}

export function registrarAntecedente(idPaciente: string, input: RegistrarAntecedenteInput): Promise<{ id: string }> {
  if (MODO_DEMO) return Promise.resolve({ id: idDemo() });
  return api(`/pacientes/${idPaciente}/antecedentes`, { method: 'POST', body: input });
}


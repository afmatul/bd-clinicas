import type { Alergia, Antecedente, RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';

export interface AntecedenteRepository {
  listarAlergias(idPaciente: string): Promise<Alergia[]>;
  listarAntecedentes(idPaciente: string): Promise<Antecedente[]>;
  /** Devuelve el id nuevo, o null si el paciente no existe en la institución. */
  registrarAlergia(idPaciente: string, a: RegistrarAlergiaInput): Promise<string | null>;
  registrarAntecedente(idPaciente: string, a: RegistrarAntecedenteInput): Promise<string | null>;
}

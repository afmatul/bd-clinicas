import type { Alergia, Antecedente } from '@red-clinica/shared';

export interface AntecedenteRepository {
  listarAlergias(idPaciente: string): Promise<Alergia[]>;
  listarAntecedentes(idPaciente: string): Promise<Antecedente[]>;
  // TODO (viernes 6): registrarAlergia, registrarAntecedente
}

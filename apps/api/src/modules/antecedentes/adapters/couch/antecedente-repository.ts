import type { DocumentScope } from 'nano';
import type { PacienteCouch } from '../../../pacientes/adapters/couch/paciente-repository.js';
import type { AntecedenteRepository } from '../../ports/antecedente-repository.js';

/** En Couch las alergias y antecedentes viven embebidos en el documento paciente:<id>. */
export class CouchAntecedenteRepository implements AntecedenteRepository {
  constructor(private readonly db: DocumentScope<unknown>) {}

  private async paciente(id: string): Promise<PacienteCouch | null> {
    try {
      return (await this.db.get(`paciente:${id}`)) as unknown as PacienteCouch;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }

  async listarAlergias(idPaciente: string) {
    const p = await this.paciente(idPaciente);
    return (p?.alergias ?? []).map((a) => ({
      id: a.id, tipo: a.tipo, descripcion: a.descripcion,
      severidad: a.severidad as 'LEVE' | 'MODERADA' | 'SEVERA' | null,
      idMedicamento: a.medicamento_id,
    }));
  }

  async listarAntecedentes(idPaciente: string) {
    const p = await this.paciente(idPaciente);
    return p?.antecedentes ?? [];
  }
}

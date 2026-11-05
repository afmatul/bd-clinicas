import { randomUUID } from 'node:crypto';
import type { DocumentScope } from 'nano';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import { NoEncontrado } from '../../../../shared/errores.js';
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

  /**
   * Couch no tiene $push: se relee el paciente, se agrega al arreglo y se guarda con su _rev.
   * Si otro usuario guardó antes (409), se relee y se reintenta una vez.
   */
  private async agregar(idPaciente: string, cambiar: (p: PacienteCouch) => void): Promise<boolean> {
    for (let intento = 0; intento < 2; intento++) {
      const p = await this.paciente(idPaciente);
      if (!p) return false;
      cambiar(p);
      try {
        await this.db.insert(p as never);
        return true;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode !== 409 || intento === 1) throw err;
      }
    }
    return false;
  }

  async registrarAlergia(idPaciente: string, a: RegistrarAlergiaInput) {
    if (a.idMedicamento) {
      const med = await this.db.get(`medicamento:${a.idMedicamento}`).catch(() => null);
      if (!med) throw new NoEncontrado('El medicamento');
    }
    const id = randomUUID();
    const ok = await this.agregar(idPaciente, (p) => {
      p.alergias = [...(p.alergias ?? []), {
        id, tipo: a.tipo, descripcion: a.descripcion ?? null, severidad: a.severidad, medicamento_id: a.idMedicamento ?? null,
      }];
    });
    return ok ? id : null;
  }

  async registrarAntecedente(idPaciente: string, a: RegistrarAntecedenteInput) {
    const id = randomUUID();
    const ok = await this.agregar(idPaciente, (p) => {
      p.antecedentes = [...(p.antecedentes ?? []), { id, tipo: a.tipo, descripcion: a.descripcion ?? null }];
    });
    return ok ? id : null;
  }
}

import type { Alergia, Antecedente } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';

/** API pública del módulo antecedentes para otros módulos (pacientes, prescripcion). */
export function crearCuadroClinico(registro: RegistroDeAdaptadores) {
  return {
    async consultar(ctx: ContextoInstitucion, idPaciente: string): Promise<{ alergias: Alergia[]; antecedentes: Antecedente[] }> {
      const repo = registro.para(ctx).antecedentes;
      const [alergias, antecedentes] = await Promise.all([repo.listarAlergias(idPaciente), repo.listarAntecedentes(idPaciente)]);
      return { alergias, antecedentes };
    },
  };
}
export type CuadroClinico = ReturnType<typeof crearCuadroClinico>;

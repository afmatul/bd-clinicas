import type { RegistrarAlergiaInput, RegistrarAntecedenteInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import { validarAlergiaNueva, validarAntecedenteNuevo } from '../domain/alergia.js';

/** Quién puede escribir el cuadro clínico: quien atiende y recepción al registrar al paciente. */
const ESCRIBEN = ['MEDICO', 'ENFERMERIA', 'RECEPCION'] as const;
const LEEN = ['MEDICO', 'ENFERMERIA', 'RECEPCION'] as const;

/**
 * Casos de uso de escritura del módulo antecedentes. Cada alta deja rastro en la bitácora
 * (entidad alergia / antecedente, con el id del paciente) igual en los cuatro motores.
 */
export function crearCasosDeUsoAntecedentes(deps: { registro: RegistroDeAdaptadores; auditoria: Auditoria }) {
  const repos = (ctx: ContextoInstitucion) => deps.registro.para(ctx);

  /** Un paciente de baja conserva su historial, pero no recibe registros nuevos. */
  async function exigirPacienteActivo(ctx: ContextoInstitucion, idPaciente: string) {
    const p = await repos(ctx).pacientes.obtener(idPaciente);
    if (!p) throw new NoEncontrado('El paciente');
    if (p.estado === 'BAJA') throw new ReglaDeNegocio('El paciente está de baja: su expediente es de solo lectura.');
  }

  return {
    async consultar(ctx: ContextoInstitucion, idPaciente: string) {
      exigirRol(ctx, [...LEEN]);
      const repo = repos(ctx).antecedentes;
      const [alergias, antecedentes] = await Promise.all([repo.listarAlergias(idPaciente), repo.listarAntecedentes(idPaciente)]);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'antecedentes', idPaciente });
      return { alergias, antecedentes };
    },

    async registrarAlergia(ctx: ContextoInstitucion, idPaciente: string, input: RegistrarAlergiaInput) {
      exigirRol(ctx, [...ESCRIBEN]);
      await exigirPacienteActivo(ctx, idPaciente);
      const repo = repos(ctx).antecedentes;
      validarAlergiaNueva(await repo.listarAlergias(idPaciente), input.tipo, input.idMedicamento);
      const id = await repo.registrarAlergia(idPaciente, input);
      if (!id) throw new NoEncontrado('El paciente');
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'alergia', idRegistro: id, idPaciente });
      return { id };
    },

    async registrarAntecedente(ctx: ContextoInstitucion, idPaciente: string, input: RegistrarAntecedenteInput) {
      exigirRol(ctx, [...ESCRIBEN]);
      await exigirPacienteActivo(ctx, idPaciente);
      const repo = repos(ctx).antecedentes;
      validarAntecedenteNuevo(await repo.listarAntecedentes(idPaciente), input.tipo);
      const id = await repo.registrarAntecedente(idPaciente, input);
      if (!id) throw new NoEncontrado('El paciente');
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'antecedente', idRegistro: id, idPaciente });
      return { id };
    },
  };
}
export type CasosDeUsoAntecedentes = ReturnType<typeof crearCasosDeUsoAntecedentes>;

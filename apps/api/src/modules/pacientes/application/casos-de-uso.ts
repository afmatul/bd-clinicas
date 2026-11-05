import {
  type BuscarPacientesQuery,
  type DarDeBajaInput,
  type PacienteFicha,
  type RegistrarPacienteInput,
} from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { Conflicto, NoEncontrado } from '../../../shared/errores.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import type { CuadroClinico } from '../../antecedentes/application/consultar-cuadro-clinico.js';
import { validarAlta, validarBaja } from '../domain/paciente.js';

/**
 * Casos de uso del módulo pacientes. No saben qué motor hay detrás:
 * piden el repositorio al registro con el contexto de la petición.
 */
export function crearCasosDeUsoPacientes(deps: {
  registro: RegistroDeAdaptadores;
  auditoria: Auditoria;
  cuadroClinico: CuadroClinico;
}) {
  const repo = (ctx: ContextoInstitucion) => deps.registro.para(ctx).pacientes;

  return {
    async buscar(ctx: ContextoInstitucion, q: BuscarPacientesQuery) {
      exigirRol(ctx, ['RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL']);
      const r = await repo(ctx).buscar(q);
      return { ...r, pagina: q.pagina, porPagina: q.porPagina };
    },

    /** Lectura de datos restringidos: siempre deja rastro en la bitácora. */
    async obtenerFicha(ctx: ContextoInstitucion, id: string): Promise<PacienteFicha> {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA', 'RECEPCION']);
      const datos = await repo(ctx).obtener(id);
      if (!datos) throw new NoEncontrado('El paciente');
      // Los módulos se hablan por su capa application, nunca leyendo tablas ajenas.
      const cuadro = await deps.cuadroClinico.consultar(ctx, id);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'paciente', idRegistro: id, idPaciente: id });
      return { ...datos, ...cuadro };
    },

    async registrar(ctx: ContextoInstitucion, input: RegistrarPacienteInput) {
      exigirRol(ctx, ['RECEPCION', 'MEDICO']);
      validarAlta(input, ctx.institucion.clave);
      if (input.cui && (await repo(ctx).existeCui(input.cui))) {
        throw new Conflicto(`Ya existe un paciente con el CUI ${input.cui}. Búsquelo antes de registrarlo de nuevo.`);
      }
      const id = await repo(ctx).registrar(input);
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'paciente', idRegistro: id, idPaciente: id });
      return { id };
    },

    async darDeBaja(ctx: ContextoInstitucion, id: string, input: DarDeBajaInput) {
      exigirRol(ctx, ['MEDICO']);
      const datos = await repo(ctx).obtener(id);
      if (!datos) throw new NoEncontrado('El paciente');
      validarBaja(datos);
      await repo(ctx).darDeBaja(id, {
        fecha: new Date().toISOString().slice(0, 10),
        motivo: input.motivo,
        idPersonal: ctx.usuario.idPersonal,
      });
      await deps.auditoria.registrar(ctx, 'BAJA', { entidad: 'paciente', idRegistro: id, idPaciente: id });
    },
  };
}
export type CasosDeUsoPacientes = ReturnType<typeof crearCasosDeUsoPacientes>;

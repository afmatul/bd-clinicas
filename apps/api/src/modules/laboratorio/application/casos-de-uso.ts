import type {
  CapturarResultadosInput,
  ExamenDetalle,
  ListaExamenes,
  ListarExamenesQuery,
  OrdenarExamenInput,
  TipoExamen,
} from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { Conflicto, NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import type { PacienteRepository } from '../../pacientes/ports/paciente-repository.js';
import { construirResultados, seccionesDe, validarCaptura, validarValidacion } from '../domain/examen.js';
import type { ExamenDatos, ExamenRepository, Firma } from '../ports/examen-repository.js';

const LEER = ['MEDICO', 'ENFERMERIA'] as const;
const ORDENAR = ['MEDICO', 'ENFERMERIA', 'RECEPCION'] as const;
const CAPTURAR = ['MEDICO'] as const; // químico biólogo del laboratorio

/**
 * Casos de uso del laboratorio. Piden el repositorio con el contexto de la petición, igual que
 * los módulos comunes; la diferencia es que solo existe adaptador para MongoDB.
 */
export function crearCasosDeUsoLaboratorio(deps: {
  examenes: (ctx: ContextoInstitucion) => ExamenRepository;
  pacientes: (ctx: ContextoInstitucion) => PacienteRepository;
  auditoria: Auditoria;
  /** Nombre para mostrar de quien firma (sale del módulo identidad). */
  nombreUsuario: (ctx: ContextoInstitucion) => Promise<string>;
}) {
  async function tipo(ctx: ContextoInstitucion, clave: TipoExamen['clave']): Promise<TipoExamen> {
    const t = (await deps.examenes(ctx).tipos()).find((x) => x.clave === clave);
    if (!t) throw new ReglaDeNegocio('El catálogo de exámenes no tiene ese tipo. Corra npm run db:seed.');
    return t;
  }

  async function examen(ctx: ContextoInstitucion, id: string): Promise<ExamenDatos> {
    const e = await deps.examenes(ctx).obtener(id);
    if (!e) throw new NoEncontrado('El examen');
    return e;
  }

  async function firma(ctx: ContextoInstitucion): Promise<Firma> {
    return { idUsuario: ctx.usuario.id, nombre: await deps.nombreUsuario(ctx), fecha: new Date().toISOString() };
  }

  async function detalle(ctx: ContextoInstitucion, e: ExamenDatos): Promise<ExamenDetalle> {
    const { capturadoPor, validadoPor, ...resto } = e;
    return {
      ...resto,
      capturadoPor: capturadoPor && { nombre: capturadoPor.nombre, fecha: capturadoPor.fecha },
      validadoPor: validadoPor && { nombre: validadoPor.nombre, fecha: validadoPor.fecha },
      secciones: seccionesDe(await tipo(ctx, e.tipo), e.resultados),
    };
  }

  return {
    async tipos(ctx: ContextoInstitucion) {
      exigirRol(ctx, [...ORDENAR]);
      return deps.examenes(ctx).tipos();
    },

    async listar(ctx: ContextoInstitucion, q: ListarExamenesQuery): Promise<ListaExamenes> {
      exigirRol(ctx, [...LEER]);
      const r = await deps.examenes(ctx).listar(q);
      return { ...r, items: r.items.map(({ id, codigo, tipo, nombre, estado, critico, fechaOrden, fechaActualizacion, paciente }) =>
        ({ id, codigo, tipo, nombre, estado, critico, fechaOrden, fechaActualizacion, paciente })) };
    },

    /** Lectura de datos restringidos: deja rastro en la bitácora. */
    async obtener(ctx: ContextoInstitucion, id: string): Promise<ExamenDetalle> {
      exigirRol(ctx, [...LEER]);
      const e = await examen(ctx, id);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'examen', idRegistro: id, idPaciente: e.paciente.id });
      return detalle(ctx, e);
    },

    async ordenar(ctx: ContextoInstitucion, input: OrdenarExamenInput) {
      exigirRol(ctx, [...ORDENAR]);
      const p = await deps.pacientes(ctx).obtener(input.idPaciente);
      if (!p) throw new NoEncontrado('El paciente');
      if (p.estado === 'BAJA') throw new ReglaDeNegocio('El paciente está de baja; no se le pueden registrar exámenes.');
      const t = await tipo(ctx, input.tipo);
      const r = await deps.examenes(ctx).ordenar({
        idPaciente: input.idPaciente,
        tipo: t.clave,
        nombre: t.nombre,
        medicoSolicitante: input.medicoSolicitante || null,
        fecha: new Date(),
      });
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'examen', idRegistro: r.id, idPaciente: input.idPaciente });
      return r;
    },

    /** Captura (o corrige) los resultados; el examen queda EN_PROCESO hasta que se valida. */
    async capturar(ctx: ContextoInstitucion, id: string, input: CapturarResultadosInput): Promise<ExamenDetalle> {
      exigirRol(ctx, [...CAPTURAR]);
      const e = await examen(ctx, id);
      validarCaptura(e.estado);
      const { resultados, critico } = construirResultados(await tipo(ctx, e.tipo), input);
      const ok = await deps.examenes(ctx).guardarResultados(id, {
        resultados, critico, observaciones: input.observaciones || null, por: await firma(ctx),
      });
      if (!ok) throw new Conflicto('Otro usuario validó este examen mientras usted capturaba. Recargue para ver la versión final.');
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'examen', idRegistro: id, idPaciente: e.paciente.id });
      return detalle(ctx, await examen(ctx, id));
    },

    async validar(ctx: ContextoInstitucion, id: string): Promise<ExamenDetalle> {
      exigirRol(ctx, [...CAPTURAR]);
      const e = await examen(ctx, id);
      validarValidacion(e.estado, e.resultados !== null);
      if (!(await deps.examenes(ctx).validar(id, await firma(ctx)))) {
        throw new Conflicto('El examen cambió mientras lo validaba. Recargue e intente de nuevo.');
      }
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'examen', idRegistro: id, idPaciente: e.paciente.id });
      return detalle(ctx, await examen(ctx, id));
    },
  };
}
export type CasosDeUsoLaboratorio = ReturnType<typeof crearCasosDeUsoLaboratorio>;

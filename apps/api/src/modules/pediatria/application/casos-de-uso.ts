import type {
  AplicarDosisInput, DosisVencida, RegistrarMedicionInput, SeguimientoPediatrico, Vacuna,
} from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { aFechaISO } from '../../../shared/fechas.js';
import { NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import { calcularPercentiles, mesesCumplidos, percentilesFinales, validarMedicion } from '../domain/crecimiento.js';
import { estadoEnCarne, validarDosis } from '../domain/vacunacion.js';
import type { MenorPediatrico, SeguimientoPediatricoRepository } from '../ports/seguimiento-pediatrico-repository.js';

/** Elige el adaptador por la institución. Solo el Centro pediátrico tiene este módulo. */
export type RepositorioPediatricoPara = (ctx: ContextoInstitucion) => SeguimientoPediatricoRepository;

const CLINICOS = ['MEDICO', 'ENFERMERIA'] as const;

export function crearCasosDeUsoPediatria(deps: {
  repo: RepositorioPediatricoPara;
  auditoria: Auditoria;
  hoy?: () => string;
}) {
  const hoy = deps.hoy ?? (() => aFechaISO(new Date()));

  async function menorActivo(ctx: ContextoInstitucion, id: string): Promise<MenorPediatrico> {
    const m = await deps.repo(ctx).menor(id);
    if (!m) throw new NoEncontrado('El paciente');
    if (m.estado === 'BAJA') {
      throw new ReglaDeNegocio(`El expediente está de baja desde el ${m.baja?.fecha ?? ''}: no admite registros nuevos.`);
    }
    return m;
  }

  return {
    /** Curva de crecimiento, carné de vacunación y responsables. Lectura restringida: queda en la bitácora. */
    async seguimiento(ctx: ContextoInstitucion, id: string): Promise<SeguimientoPediatrico> {
      exigirRol(ctx, [...CLINICOS]);
      const repo = deps.repo(ctx);
      const menor = await repo.menor(id);
      if (!menor) throw new NoEncontrado('El paciente');
      const [curva, vacunas, dosis, responsables] = await Promise.all([
        repo.curva(id), repo.vacunas(), repo.dosisDelPaciente(id), repo.responsables(id),
      ]);
      const h = hoy();
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'historial_vacunacion', idRegistro: id, idPaciente: id });
      return {
        mediciones: curva.map((m) => ({ ...m, edadMeses: mesesCumplidos(menor.fechaNacimiento, m.fecha) })),
        carne: vacunas.map((v) => estadoEnCarne(v, dosis.filter((d) => d.idVacuna === v.id), h)),
        responsables,
        baja: menor.baja,
      };
    },

    async registrarMedicion(ctx: ContextoInstitucion, id: string, input: RegistrarMedicionInput) {
      exigirRol(ctx, [...CLINICOS]);
      const menor = await menorActivo(ctx, id);
      validarMedicion(input, menor, hoy());
      const percentiles = percentilesFinales(calcularPercentiles(menor, input), input);
      const idMedicion = await deps.repo(ctx).registrarMedicion(id, { ...input, ...percentiles });
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'medicion_crecimiento', idRegistro: idMedicion, idPaciente: id });
      return { id: idMedicion, ...percentiles };
    },

    async vacunas(ctx: ContextoInstitucion): Promise<Vacuna[]> {
      exigirRol(ctx, [...CLINICOS, 'RECEPCION']);
      return deps.repo(ctx).vacunas();
    },

    async aplicarDosis(ctx: ContextoInstitucion, id: string, input: AplicarDosisInput) {
      exigirRol(ctx, [...CLINICOS]);
      const repo = deps.repo(ctx);
      const menor = await menorActivo(ctx, id);
      const vacuna = await repo.vacuna(input.idVacuna);
      if (!vacuna) throw new NoEncontrado('La vacuna');
      const aplicadas = (await repo.dosisDelPaciente(id)).filter((d) => d.idVacuna === vacuna.id);
      validarDosis(input, vacuna, aplicadas, menor.fechaNacimiento, hoy());
      const idDosis = await repo.aplicarDosis(id, input);
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'historial_vacunacion', idRegistro: idDosis, idPaciente: id });
      return { id: idDosis };
    },

    /** Lista de seguimiento del centro: a quién llamar porque su próxima dosis ya venció. */
    async dosisVencidas(ctx: ContextoInstitucion, hasta?: string): Promise<DosisVencida[]> {
      exigirRol(ctx, [...CLINICOS, 'RECEPCION', 'TRABAJO_SOCIAL']);
      return deps.repo(ctx).dosisVencidas(hasta ?? hoy());
    },
  };
}
export type CasosDeUsoPediatria = ReturnType<typeof crearCasosDeUsoPediatria>;

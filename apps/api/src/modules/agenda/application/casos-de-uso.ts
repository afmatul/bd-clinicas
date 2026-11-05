import type { AgendaQuery, AgendarCitaInput, CambiarEstadoCitaInput, CitaDetalle, DisponibilidadQuery } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import { ahoraLocal, sumarDias } from '../../../shared/fechas.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import { horariosLibres, origenesDe, validarAgendamiento, validarTransicion } from '../domain/cita.js';

const VEN_AGENDA = ['RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL'] as const;
const AGENDAN = ['RECEPCION', 'MEDICO', 'ENFERMERIA'] as const;

/**
 * Casos de uso del módulo agenda. También es la API pública del módulo: atencion la usa
 * para pasar la cita a EN_CONSULTA y ATENDIDA, y odontologia para la recepción.
 */
export function crearCasosDeUsoAgenda(deps: { registro: RegistroDeAdaptadores; auditoria: Auditoria }) {
  const repo = (ctx: ContextoInstitucion) => deps.registro.para(ctx).agenda;

  const medicoDe = (ctx: ContextoInstitucion, idMedico?: string) => {
    const id = idMedico ?? ctx.usuario.idPersonal;
    if (!id) throw new ReglaDeNegocio('Elija un médico para ver su agenda.');
    return id;
  };

  async function cambiar(ctx: ContextoInstitucion, id: string, a: CitaDetalle['estado']) {
    const cita = await repo(ctx).obtener(id);
    if (!cita) throw new NoEncontrado('La cita');
    validarTransicion(cita.estado, a);
    // Si otro usuario la cambió entre la lectura y la escritura, el adaptador no actualiza.
    const cambio = await repo(ctx).cambiarEstado(id, origenesDe(a), a);
    if (!cambio) throw new ReglaDeNegocio('La cita cambió mientras la editaba. Actualice la agenda e intente de nuevo.');
    await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'cita', idRegistro: id, idPaciente: cita.idPaciente });
    return { ...cita, estado: a };
  }

  return {
    async agenda(ctx: ContextoInstitucion, q: AgendaQuery) {
      exigirRol(ctx, [...VEN_AGENDA]);
      const idMedico = medicoDe(ctx, q.idMedico);
      const hasta = q.hasta ?? q.desde;
      if (hasta < q.desde) throw new ReglaDeNegocio('El rango de fechas está invertido.');
      if (hasta > sumarDias(q.desde, 41)) throw new ReglaDeNegocio('Pida como máximo seis semanas de agenda.');
      const citas = await repo(ctx).delMedico(idMedico, q.desde, hasta);
      return { idMedico, desde: q.desde, hasta, citas };
    },

    async disponibilidad(ctx: ContextoInstitucion, q: DisponibilidadQuery) {
      exigirRol(ctx, [...VEN_AGENDA]);
      const citas = await repo(ctx).delMedico(q.idMedico, q.fecha, q.fecha);
      return { fecha: q.fecha, idMedico: q.idMedico, libres: horariosLibres(citas, q.fecha, ahoraLocal().iso) };
    },

    async proximasDelPaciente(ctx: ContextoInstitucion, idPaciente: string) {
      exigirRol(ctx, [...VEN_AGENDA]);
      return repo(ctx).proximasDelPaciente(idPaciente, ahoraLocal().fecha);
    },

    async obtener(ctx: ContextoInstitucion, id: string) {
      exigirRol(ctx, [...VEN_AGENDA]);
      const c = await repo(ctx).obtener(id);
      if (!c) throw new NoEncontrado('La cita');
      return c;
    },

    async agendar(ctx: ContextoInstitucion, input: AgendarCitaInput) {
      exigirRol(ctx, [...AGENDAN]);
      validarAgendamiento(input.fecha, input.hora, ahoraLocal().iso);
      const paciente = await deps.registro.para(ctx).pacientes.obtener(input.idPaciente);
      if (!paciente) throw new NoEncontrado('El paciente');
      if (paciente.estado === 'BAJA') throw new ReglaDeNegocio('El paciente está dado de baja; no se le pueden agendar citas.');
      if (ctx.institucion.clave !== 'hospital' && input.idEspecialidad) {
        throw new ReglaDeNegocio('La especialidad solo aplica en el Hospital general.');
      }
      const id = await repo(ctx).agendar({
        idPaciente: input.idPaciente,
        idMedico: input.idMedico,
        idEspecialidad: input.idEspecialidad ?? null,
        fecha: input.fecha,
        hora: input.hora,
        motivo: input.motivo,
      });
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'cita', idRegistro: id, idPaciente: input.idPaciente });
      return { id };
    },

    async cambiarEstado(ctx: ContextoInstitucion, id: string, input: CambiarEstadoCitaInput) {
      exigirRol(ctx, [...AGENDAN]);
      return cambiar(ctx, id, input.estado);
    },

    /** Para atencion: abrir la consulta de una cita la pasa a EN_CONSULTA (si no lo estaba ya). */
    async iniciarAtencion(ctx: ContextoInstitucion, id: string) {
      const cita = await repo(ctx).obtener(id);
      if (!cita) throw new NoEncontrado('La cita');
      if (cita.estado === 'EN_CONSULTA') return cita;
      return cambiar(ctx, id, 'EN_CONSULTA');
    },

    /** Para atencion: al cerrar la consulta, la cita queda ATENDIDA. */
    async marcarAtendida(ctx: ContextoInstitucion, id: string) {
      const cita = await repo(ctx).obtener(id);
      if (!cita || cita.estado === 'ATENDIDA') return;
      if (cita.estado !== 'EN_CONSULTA') await repo(ctx).cambiarEstado(id, ['PROGRAMADA', 'CONFIRMADA'], 'EN_CONSULTA');
      await cambiar(ctx, id, 'ATENDIDA');
    },

    async inasistencias(ctx: ContextoInstitucion, desde: string, hasta: string) {
      exigirRol(ctx, [...AGENDAN]);
      return repo(ctx).inasistencias(desde, hasta);
    },
  };
}
export type CasosDeUsoAgenda = ReturnType<typeof crearCasosDeUsoAgenda>;

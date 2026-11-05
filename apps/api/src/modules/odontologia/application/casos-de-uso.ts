import type {
  AplicarOdontogramaInput, OdontogramaPaciente, RecepcionDelDia, RegistroRapidoInput, RegistroRapidoResultado,
} from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { Conflicto, NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import type { CasosDeUsoAgenda } from '../../agenda/application/casos-de-uso.js';
import { combinar, validarCambios } from '../domain/odontograma.js';
import { dividirNombre, liberaHorario, relojClinica, siguienteTurnoLibre } from '../domain/recepcion.js';
import type { RegistroOdontologia } from '../odontologia.registro.js';

/**
 * Casos de uso del módulo odontologia. Solo existen para la Clínica odontológica (CouchDB);
 * el controlador ya responde 404 a las demás instituciones por @Modulo('odontologia').
 */
export function crearCasosDeUsoOdontologia(deps: {
  registro: RegistroOdontologia;
  auditoria: Auditoria;
  /** API pública del módulo agenda: recepción agenda por ahí, no escribiendo citas a mano. */
  agenda: Pick<CasosDeUsoAgenda, 'agendar'>;
  /** Reloj inyectable para las pruebas. */
  ahora?: () => Date;
}) {
  const ahora = deps.ahora ?? (() => new Date());
  const repos = (ctx: ContextoInstitucion) => deps.registro.para(ctx);

  async function recepcion(ctx: ContextoInstitucion): Promise<RecepcionDelDia> {
    const { recepcion: repo } = repos(ctx);
    const { fecha, minutos } = relojClinica(ahora());
    const [odontologos, turnos] = await Promise.all([repo.odontologos(), repo.turnosDelDia(fecha)]);
    const nombres = await repo.nombresDePacientes(turnos.map((t) => t.idPaciente));
    const nombreDe = new Map(odontologos.map((o) => [o.id, o.nombre]));

    const ocupados = new Map<string, Set<string>>();
    for (const t of turnos) {
      if (liberaHorario(t.estado)) continue;
      if (!ocupados.has(t.idOdontologo)) ocupados.set(t.idOdontologo, new Set());
      ocupados.get(t.idOdontologo)!.add(t.hora);
    }
    // Los domingos no hay consulta (regla de agenda): no se ofrece turno.
    const domingo = new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0;
    const libre = domingo ? null : siguienteTurnoLibre(odontologos.map((o) => o.id), ocupados, minutos);

    return {
      fecha,
      odontologos,
      turnos: turnos.map((t) => ({
        id: t.id,
        hora: t.hora,
        idPaciente: t.idPaciente,
        paciente: nombres.get(t.idPaciente) ?? null,
        motivo: t.motivo,
        estado: t.estado,
        llegada: t.llegada,
        idOdontologo: t.idOdontologo,
        odontologo: nombreDe.get(t.idOdontologo) ?? 'Odontólogo',
      })),
      siguienteLibre: libre ? { ...libre, odontologo: nombreDe.get(libre.idOdontologo)! } : null,
    };
  }

  return {
    recepcion(ctx: ContextoInstitucion) {
      exigirRol(ctx, ['RECEPCION', 'MEDICO', 'ENFERMERIA']);
      return recepcion(ctx);
    },

    /**
     * Registro rápido: crea el expediente mínimo y, si se pide, le da el siguiente turno libre.
     * Couch no tiene transacciones entre documentos: si el turno se ocupa entre la lectura y la
     * escritura se intenta con el siguiente; el paciente ya registrado se conserva y, si no queda
     * turno, se devuelve turno null.
     */
    async registroRapido(ctx: ContextoInstitucion, input: RegistroRapidoInput): Promise<RegistroRapidoResultado> {
      exigirRol(ctx, ['RECEPCION', 'MEDICO']);
      const hoy = relojClinica(ahora()).fecha;
      if (input.fechaNacimiento > hoy) throw new ReglaDeNegocio('La fecha de nacimiento no puede ser futura.');
      const { nombres, apellidos } = dividirNombre(input.nombreCompleto);
      const { recepcion: repo } = repos(ctx);

      const idPaciente = await repo.registrarPaciente({ nombres, apellidos, telefono: input.telefono, fechaNacimiento: input.fechaNacimiento });
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'paciente', idRegistro: idPaciente, idPaciente });
      if (!input.asignarTurno) return { idPaciente, turno: null };

      for (let intento = 0; intento < 3; intento++) {
        const { siguienteLibre } = await recepcion(ctx);
        // El paciente ya quedó registrado: sin turno libre se responde igual con éxito (turno null)
        // para que recepción no lo registre dos veces al reintentar.
        if (!siguienteLibre) return { idPaciente, turno: null };
        try {
          // agenda valida el horario, el paciente, el choque (Conflicto) y deja la cita en la bitácora.
          const { id } = await deps.agenda.agendar(ctx, {
            idPaciente, idMedico: siguienteLibre.idOdontologo, fecha: hoy, hora: siguienteLibre.hora, motivo: input.motivo,
          });
          return { idPaciente, turno: { id, hora: siguienteLibre.hora, odontologo: siguienteLibre.odontologo } };
        } catch (err) {
          // Otro turno tomó ese horario: se prueba el siguiente.
          if (err instanceof Conflicto) continue;
          // Agenda rechazó el turno por una regla: el paciente ya existe, así que se responde sin turno.
          if (err instanceof ReglaDeNegocio) return { idPaciente, turno: null };
          throw err;
        }
      }
      return { idPaciente, turno: null };
    },

    async marcarLlegada(ctx: ContextoInstitucion, idCita: string) {
      exigirRol(ctx, ['RECEPCION', 'ENFERMERIA']);
      const { recepcion: repo } = repos(ctx);
      const t = await repo.obtenerTurno(idCita);
      if (!t) throw new NoEncontrado('La cita');
      if (t.fecha !== relojClinica(ahora()).fecha) throw new ReglaDeNegocio('Solo se marca la llegada de las citas de hoy.');
      if (t.estado !== 'PROGRAMADA' && t.estado !== 'CONFIRMADA') {
        throw new ReglaDeNegocio('Esta cita ya no espera la llegada del paciente.');
      }
      if (t.llegada) throw new Conflicto('La llegada de este paciente ya se había marcado.');
      const llegada = ahora().toISOString();
      await repo.marcarLlegada(idCita, llegada);
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'cita', idRegistro: idCita, idPaciente: t.idPaciente });
      return { llegada };
    },

    /** Lectura de datos clínicos: deja rastro en la bitácora. */
    async odontograma(ctx: ContextoInstitucion, idPaciente: string): Promise<OdontogramaPaciente> {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA']);
      const { odontograma: repo } = repos(ctx);
      const piezas = await repo.obtener(idPaciente);
      if (!piezas) throw new NoEncontrado('El paciente');
      const historial = await repo.historial(idPaciente);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'odontograma', idRegistro: idPaciente, idPaciente });
      return { idPaciente, piezas, historial };
    },

    /** Solo el odontólogo actualiza el odontograma; las reglas se validan contra la versión que se guarda. */
    async aplicarOdontograma(ctx: ContextoInstitucion, idPaciente: string, input: AplicarOdontogramaInput) {
      exigirRol(ctx, ['MEDICO']);
      const { odontograma: repo } = repos(ctx);
      const piezas = await repo.actualizar(idPaciente, (actual) => {
        validarCambios(actual, input.cambios);
        return combinar(actual, input.cambios);
      });
      if (!piezas) throw new NoEncontrado('El paciente');
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'odontograma', idRegistro: idPaciente, idPaciente });
      return { idPaciente, piezas };
    },
  };
}
export type CasosDeUsoOdontologia = ReturnType<typeof crearCasosDeUsoOdontologia>;

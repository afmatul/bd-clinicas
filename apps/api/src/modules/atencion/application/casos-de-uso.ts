import type { AbrirConsultaInput, BorradorConsultaInput, CerrarConsultaInput, ConsultaDetalle } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { Conflicto, NoEncontrado, ReglaDeNegocio } from '../../../shared/errores.js';
import { ahoraLocal } from '../../../shared/fechas.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import type { CasosDeUsoAgenda } from '../../agenda/application/casos-de-uso.js';
import type { CasosDeUsoPrescripcion } from '../../prescripcion/application/casos-de-uso.js';
import { validarCierre, validarEdicion } from '../domain/consulta.js';
import { cantidadSugerida } from '../../prescripcion/domain/receta.js';

/**
 * Casos de uso de atención. Habla con agenda (estado de la cita) y prescripcion (catálogo y
 * alergias) por su capa application; la consulta, el diagnóstico, el tratamiento y la receta
 * se escriben juntos en el adaptador de su motor.
 */
export function crearCasosDeUsoAtencion(deps: {
  registro: RegistroDeAdaptadores;
  auditoria: Auditoria;
  agenda: CasosDeUsoAgenda;
  prescripcion: CasosDeUsoPrescripcion;
}) {
  const repo = (ctx: ContextoInstitucion) => deps.registro.para(ctx).atencion;

  const medicoDeSesion = (ctx: ContextoInstitucion) => {
    const id = ctx.usuario.idPersonal;
    if (!id) throw new ReglaDeNegocio('Su usuario no está vinculado a un médico de la institución; no puede atender consultas.');
    return id;
  };

  async function cargar(ctx: ContextoInstitucion, id: string): Promise<ConsultaDetalle> {
    const c = await repo(ctx).obtener(id);
    if (!c) throw new NoEncontrado('La consulta');
    return c;
  }

  return {
    /** Abre la consulta (o retoma la que el médico dejó abierta con ese paciente) y pasa la cita a EN_CONSULTA. */
    async abrir(ctx: ContextoInstitucion, input: AbrirConsultaInput) {
      exigirRol(ctx, ['MEDICO']);
      const idMedico = medicoDeSesion(ctx);
      const paciente = await deps.registro.para(ctx).pacientes.obtener(input.idPaciente);
      if (!paciente) throw new NoEncontrado('El paciente');
      if (paciente.estado === 'BAJA') throw new ReglaDeNegocio('El paciente está dado de baja; no se le pueden abrir consultas.');

      const abierta = await repo(ctx).abiertaDe(input.idPaciente, idMedico);
      if (abierta) return { id: abierta.id, retomada: true };

      let motivo = input.motivo || null;
      if (input.idCita) {
        const cita = await deps.agenda.obtener(ctx, input.idCita);
        if (cita.idPaciente !== input.idPaciente) throw new ReglaDeNegocio('La cita no es de este paciente.');
        motivo ??= cita.motivo;
        await deps.agenda.iniciarAtencion(ctx, input.idCita);
      }
      const ahora = ahoraLocal();
      const id = await repo(ctx).abrir({
        idPaciente: input.idPaciente, idCita: input.idCita ?? null, idMedico, fecha: ahora.fecha, hora: ahora.hora, motivo,
      });
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'consulta', idRegistro: id, idPaciente: input.idPaciente });
      return { id, retomada: false };
    },

    async obtener(ctx: ContextoInstitucion, id: string) {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA']);
      const c = await cargar(ctx, id);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'consulta', idRegistro: id, idPaciente: c.idPaciente });
      return c;
    },

    async guardarBorrador(ctx: ContextoInstitucion, id: string, input: BorradorConsultaInput) {
      exigirRol(ctx, ['MEDICO']);
      validarEdicion(await cargar(ctx, id), medicoDeSesion(ctx));
      await repo(ctx).guardarBorrador(id, input);
    },

    /**
     * Cierra la consulta: signos, diagnósticos, tratamientos y recetas en una sola unidad atómica.
     * Si la receta choca con una alergia registrada, responde 409 con las alertas hasta que el
     * médico confirme.
     */
    async cerrar(ctx: ContextoInstitucion, id: string, input: CerrarConsultaInput) {
      exigirRol(ctx, ['MEDICO']);
      const idMedico = medicoDeSesion(ctx);
      const c = await cargar(ctx, id);
      validarEdicion(c, idMedico);
      validarCierre(input);

      const renglones = input.diagnosticos.flatMap((d) => d.tratamientos.flatMap((t) => t.receta?.renglones ?? []));
      const { medicamentos, alertas } = await deps.prescripcion.prepararRenglones(ctx, c.idPaciente, renglones);
      if (alertas.length && !input.confirmarAlergias) {
        const e = new Conflicto(`El paciente tiene alergia registrada a ${alertas.map((a) => a.medicamento).join(', ')}. Revise la receta o confirme.`);
        e.detalle = { alertas };
        throw e;
      }

      const { confirmarAlergias: _, ...resto } = input;
      // Sin cantidad escrita, se dispensa lo que alcanza para toda la duración.
      const cierre = {
        ...resto,
        diagnosticos: resto.diagnosticos.map((d) => ({
          ...d,
          tratamientos: d.tratamientos.map((t) => ({
            ...t,
            receta: t.receta && {
              ...t.receta,
              renglones: t.receta.renglones.map((r) => ({ ...r, cantidad: r.cantidad ?? cantidadSugerida(r.frecuenciaHoras, r.duracionDias) })),
            },
          })),
        })),
      };
      const cerro = await repo(ctx).cerrar(id, { ...cierre, idMedico, fechaEmision: ahoraLocal().fecha, medicamentos });
      if (!cerro) throw new ReglaDeNegocio('La consulta ya estaba cerrada.');

      if (c.idCita) await deps.agenda.marcarAtendida(ctx, c.idCita);
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'consulta', idRegistro: id, idPaciente: c.idPaciente });
      if (renglones.length) await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'receta', idRegistro: id, idPaciente: c.idPaciente });
      return cargar(ctx, id);
    },

    /** Historial longitudinal del paciente. */
    async historial(ctx: ContextoInstitucion, idPaciente: string) {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA']);
      const lista = await repo(ctx).historial(idPaciente);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'consulta', idPaciente });
      return lista;
    },
  };
}
export type CasosDeUsoAtencion = ReturnType<typeof crearCasosDeUsoAtencion>;

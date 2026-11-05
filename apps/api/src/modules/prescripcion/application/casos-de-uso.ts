import type { AlertaAlergia, Medicamento, RenglonRecetaInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { ReglaDeNegocio } from '../../../shared/errores.js';
import { ahoraLocal } from '../../../shared/fechas.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import type { CuadroClinico } from '../../antecedentes/application/consultar-cuadro-clinico.js';
import { alertasDeAlergia, esVigente } from '../domain/receta.js';

/** Casos de uso de prescripción. También es la API pública del módulo para atencion. */
export function crearCasosDeUsoPrescripcion(deps: { registro: RegistroDeAdaptadores; auditoria: Auditoria; cuadroClinico: CuadroClinico }) {
  const repos = (ctx: ContextoInstitucion) => deps.registro.para(ctx);

  return {
    async buscarMedicamentos(ctx: ContextoInstitucion, texto: string) {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA']);
      return repos(ctx).medicamentos.buscar(texto, 20);
    },

    async recetas(ctx: ContextoInstitucion, idPaciente: string, soloVigentes: boolean) {
      exigirRol(ctx, ['MEDICO', 'ENFERMERIA']);
      const todas = await repos(ctx).recetas.delPaciente(idPaciente);
      await deps.auditoria.registrar(ctx, 'LEER', { entidad: 'receta', idPaciente });
      const hoy = ahoraLocal().fecha;
      return soloVigentes ? todas.filter((r) => esVigente(r, hoy)) : todas;
    },

    /**
     * Para atencion: comprueba que los medicamentos existan en el catálogo de la institución y
     * devuelve sus datos (Mongo y Couch los guardan copiados en la receta) y las alertas de alergia.
     */
    async prepararRenglones(ctx: ContextoInstitucion, idPaciente: string, renglones: RenglonRecetaInput[]): Promise<{
      medicamentos: Map<string, Medicamento>; alertas: AlertaAlergia[];
    }> {
      const ids = [...new Set(renglones.map((r) => r.idMedicamento))];
      const lista = ids.length ? await repos(ctx).medicamentos.obtenerVarios(ids) : [];
      const faltan = ids.filter((id) => !lista.some((m) => m.id === id));
      if (faltan.length) throw new ReglaDeNegocio('Uno de los medicamentos no está en el catálogo de su institución.');
      const { alergias } = await deps.cuadroClinico.consultar(ctx, idPaciente);
      return { medicamentos: new Map(lista.map((m) => [m.id, m])), alertas: alertasDeAlergia(renglones, lista, alergias) };
    },
  };
}
export type CasosDeUsoPrescripcion = ReturnType<typeof crearCasosDeUsoPrescripcion>;

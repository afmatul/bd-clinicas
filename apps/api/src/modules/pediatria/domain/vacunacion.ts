import type { AplicarDosisInput, Dosis, EstadoVacuna, Vacuna, VacunaEnCarne } from '@red-clinica/shared';
import { Conflicto, ReglaDeNegocio } from '../../../shared/errores.js';

/**
 * Reglas del esquema de vacunación:
 * - Las dosis van en orden: no se registra la 3 sin la 2.
 * - No se pasa de las dosis totales de la vacuna, ni se repite una dosis (UNIQUE en la base).
 * - La próxima dosis va después de la aplicación y no existe si el esquema queda completo.
 */
export function validarDosis(
  d: AplicarDosisInput,
  vacuna: Vacuna,
  aplicadas: Pick<Dosis, 'numeroDosis' | 'fechaAplicacion'>[],
  nacimiento: string,
  hoy: string,
): void {
  if (d.fechaAplicacion > hoy) throw new ReglaDeNegocio('La fecha de aplicación no puede ser futura.');
  if (d.fechaAplicacion < nacimiento.slice(0, 10)) {
    throw new ReglaDeNegocio('La fecha de aplicación es anterior al nacimiento del paciente.');
  }
  if (d.numeroDosis > vacuna.dosisTotales) {
    throw new ReglaDeNegocio(`${vacuna.nombre} tiene ${vacuna.dosisTotales} dosis en total.`);
  }
  if (aplicadas.some((a) => a.numeroDosis === d.numeroDosis)) {
    throw new Conflicto(`La dosis ${d.numeroDosis} de ${vacuna.nombre} ya está registrada.`);
  }
  const anterior = aplicadas.find((a) => a.numeroDosis === d.numeroDosis - 1);
  if (d.numeroDosis > 1 && !anterior) {
    throw new ReglaDeNegocio(`Registre primero la dosis ${d.numeroDosis - 1} de ${vacuna.nombre}.`);
  }
  if (anterior && d.fechaAplicacion < anterior.fechaAplicacion) {
    throw new ReglaDeNegocio(`La dosis ${d.numeroDosis} no puede ser anterior a la dosis ${d.numeroDosis - 1}.`);
  }
  if (d.fechaProximaDosis) {
    if (d.numeroDosis === vacuna.dosisTotales) {
      throw new ReglaDeNegocio('Con esta dosis el esquema queda completo: no indique próxima dosis.');
    }
    if (d.fechaProximaDosis <= d.fechaAplicacion) {
      throw new ReglaDeNegocio('La próxima dosis debe ser posterior a la fecha de aplicación.');
    }
  }
}

/** Estado de una vacuna en el carné, a partir de sus dosis aplicadas. */
export function estadoEnCarne(vacuna: Vacuna, dosis: Dosis[], hoy: string): VacunaEnCarne {
  const orden = [...dosis].sort((a, b) => a.numeroDosis - b.numeroDosis);
  const ultima = orden.at(-1);
  const completo = orden.length >= vacuna.dosisTotales;
  const proximaFecha = completo ? null : (ultima?.fechaProximaDosis ?? null);
  let estado: EstadoVacuna;
  if (completo) estado = 'COMPLETO';
  else if (!ultima) estado = 'SIN_INICIAR';
  else if (proximaFecha && proximaFecha < hoy) estado = 'ATRASADA';
  else estado = 'PENDIENTE';
  return {
    ...vacuna,
    dosis: orden,
    estado,
    proximaFecha,
    siguienteDosis: completo ? null : (ultima?.numeroDosis ?? 0) + 1,
  };
}

import { heightForAge, weightForAge, weightForHeight, weightForLength, type Sex } from 'who-growth-standards';
import type { RegistrarMedicionInput } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

/** Datos del menor que necesitan las reglas de crecimiento. */
export interface MenorParaCrecimiento {
  fechaNacimiento: string;
  sexo: string | null;
}

export interface Percentiles {
  percentilPesoEdad: number | null;
  percentilTallaEdad: number | null;
  percentilPesoTalla: number | null;
}

const DIA = 86_400_000;
/** Último día publicado en las tablas OMS por edad (5 años). */
const MAX_DIAS_OMS = 1856;
const utc = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
};

export const diasDeVida = (nacimiento: string, fecha: string) => Math.floor((utc(fecha) - utc(nacimiento)) / DIA);

export function mesesCumplidos(nacimiento: string, fecha: string): number {
  const [ya, ma, da] = nacimiento.slice(0, 10).split('-').map(Number);
  const [yb, mb, db] = fecha.slice(0, 10).split('-').map(Number);
  return (yb! - ya!) * 12 + (mb! - ma!) - (db! < da! ? 1 : 0);
}

export function validarMedicion(m: RegistrarMedicionInput, menor: MenorParaCrecimiento, hoy: string): void {
  if (m.fecha > hoy) throw new ReglaDeNegocio('La fecha de la medición no puede ser futura.');
  if (m.fecha < menor.fechaNacimiento.slice(0, 10)) {
    throw new ReglaDeNegocio('La fecha de la medición es anterior al nacimiento del paciente.');
  }
}

/** Redondea a un decimal, como se guarda en DECIMAL(5,2) y se muestra (P62.4 → 62.4). */
const p1 = (v: number) => Math.round(v * 10) / 10;

function intentar(fn: () => { percentile: number }): number | null {
  try {
    return p1(fn().percentile);
  } catch {
    return null; // fuera del rango publicado por la OMS
  }
}

/**
 * Percentiles con los Patrones de Crecimiento Infantil de la OMS (método LMS):
 * peso y talla para la edad de 0 a 5 años; peso para la longitud (< 2 años, acostado)
 * o para la estatura (≥ 2 años, de pie). Fuera de esos rangos devuelve null y se usan
 * los percentiles que escribió el pediatra.
 */
export function calcularPercentiles(
  menor: MenorParaCrecimiento,
  m: Pick<RegistrarMedicionInput, 'fecha' | 'pesoKg' | 'tallaCm'>,
): Percentiles {
  const sex: Sex | null = menor.sexo === 'M' ? 'male' : menor.sexo === 'F' ? 'female' : null;
  if (!sex) return { percentilPesoEdad: null, percentilTallaEdad: null, percentilPesoTalla: null };
  const ageDays = diasDeVida(menor.fechaNacimiento, m.fecha);
  // Los patrones OMS de peso para la talla son de 0 a 5 años, aunque la talla caiga en la tabla.
  const dentroDeEdad = ageDays <= MAX_DIAS_OMS;
  return {
    percentilPesoEdad: intentar(() => weightForAge(m.pesoKg, { sex, ageDays })),
    percentilTallaEdad: intentar(() => heightForAge(m.tallaCm, { sex, ageDays })),
    percentilPesoTalla: !dentroDeEdad ? null : intentar(() =>
      ageDays < 730 ? weightForLength(m.pesoKg, m.tallaCm, sex) : weightForHeight(m.pesoKg, m.tallaCm, sex),
    ),
  };
}

/** Lo calculado con la OMS manda; lo escrito por el pediatra completa lo que la OMS no cubre. */
export function percentilesFinales(calculados: Percentiles, input: RegistrarMedicionInput): Percentiles {
  return {
    percentilPesoEdad: calculados.percentilPesoEdad ?? input.percentilPesoEdad ?? null,
    percentilTallaEdad: calculados.percentilTallaEdad ?? input.percentilTallaEdad ?? null,
    percentilPesoTalla: calculados.percentilPesoTalla ?? input.percentilPesoTalla ?? null,
  };
}

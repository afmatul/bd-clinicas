import type {
  CampoExamen,
  CapturarResultadosInput,
  EstadoExamen,
  FilaResultado,
  Interpretacion,
  SeccionResultado,
  TipoExamen,
} from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';
import { SECCIONES_ORINA } from './catalogo.js';

/**
 * Reglas puras del laboratorio. Aquí vive la forma del documento de resultados de cada tipo
 * de examen (lo que el $jsonSchema de MongoDB valida con oneOf):
 *
 *   hematologia  { hemoglobina, hematocrito, leucocitos, plaquetas, … }          (plano, numérico)
 *   orina        { fisico: {…}, quimico: {…}, sedimento: {…} }                    (subdocumentos, mixto)
 *   urocultivo   { crecimiento, organismo, recuento_ufc, antibiograma: [ … ] }    (con arreglo embebido)
 *   quimica      { valores: [ { analito, valor, unidad } ] }                       (panel variable)
 */
export type Resultados = Record<string, unknown>;
type Valor = number | string;

const sinAcentos = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
/** 1,248.5 como en el design system; con `decimales` fija la precisión del catálogo (12.0, 1.020). */
export const formatoValor = (v: Valor, decimales: number | null = null) =>
  typeof v === 'number'
    ? new Intl.NumberFormat('en-US', decimales === null ? { maximumFractionDigits: 3 } : { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(v)
    : v;

/** "13.8", "13,8" o "100,000" → número. */
function aNumero(texto: string): number | null {
  const limpio = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto) ? texto.replace(/,/g, '') : texto.replace(',', '.');
  const n = Number(limpio);
  return limpio !== '' && Number.isFinite(n) ? n : null;
}

/** Normal, alto, bajo o crítico según el rango del catálogo. */
export function interpretar(c: CampoExamen, v: Valor): Interpretacion | null {
  if (typeof v === 'number') {
    if (c.criticoMin !== null && v < c.criticoMin) return 'CRITICO_BAJO';
    if (c.criticoMax !== null && v > c.criticoMax) return 'CRITICO_ALTO';
    if (c.refMin === null && c.refMax === null) return null;
    // Con un solo límite el rango es abierto ("< 200"); con dos es cerrado ("12 – 16").
    if (c.refMin === null) return v >= c.refMax! ? 'ALTO' : 'NORMAL';
    if (c.refMax === null) return v <= c.refMin ? 'BAJO' : 'NORMAL';
    if (v < c.refMin) return 'BAJO';
    if (v > c.refMax) return 'ALTO';
    return 'NORMAL';
  }
  if (c.normal === null) return null;
  return sinAcentos(v) === sinAcentos(c.normal) ? 'NORMAL' : 'ANORMAL';
}

export function referencia(c: CampoExamen): string | null {
  if (c.tipo !== 'numero') return c.normal;
  const f = (n: number) => formatoValor(n, c.decimales);
  if (c.refMin !== null && c.refMax !== null) return `${f(c.refMin)} – ${f(c.refMax)}`;
  if (c.refMax !== null) return `< ${f(c.refMax)}`;
  if (c.refMin !== null) return `> ${f(c.refMin)}`;
  return null;
}

const esCritico = (i: Interpretacion | null) => i === 'CRITICO_ALTO' || i === 'CRITICO_BAJO';

/** Lee y valida lo capturado en el formulario contra el catálogo. */
function leerValores(tipo: TipoExamen, input: CapturarResultadosInput): Map<string, Valor> {
  const valores = new Map<string, Valor>();
  for (const c of tipo.campos) {
    const crudo = input.valores[c.clave]?.trim() ?? '';
    if (!crudo) {
      if (c.obligatorio) throw new ReglaDeNegocio(`Escriba el resultado de ${c.nombre.toLowerCase()}.`);
      continue;
    }
    if (c.tipo === 'numero') {
      const n = aNumero(crudo);
      if (n === null || n < 0) throw new ReglaDeNegocio(`${c.nombre}: escriba un número válido (por ejemplo 13.8).`);
      valores.set(c.clave, n);
    } else if (c.tipo === 'opcion') {
      const opcion = c.opciones?.find((o) => sinAcentos(o) === sinAcentos(crudo));
      if (!opcion) throw new ReglaDeNegocio(`${c.nombre}: elija una de las opciones (${c.opciones?.join(', ')}).`);
      valores.set(c.clave, opcion);
    } else {
      valores.set(c.clave, crudo);
    }
  }
  return valores;
}

/** Arma el documento de resultados con la forma de su tipo y dice si trae un valor crítico. */
export function construirResultados(tipo: TipoExamen, input: CapturarResultadosInput): { resultados: Resultados; critico: boolean } {
  const valores = leerValores(tipo, input);
  const critico = tipo.campos.some((c) => valores.has(c.clave) && esCritico(interpretar(c, valores.get(c.clave)!)));

  switch (tipo.clave) {
    case 'hematologia':
      return { resultados: Object.fromEntries(valores), critico };

    case 'orina': {
      const doc: Record<string, Record<string, Valor>> = { fisico: {}, quimico: {}, sedimento: {} };
      const claveSeccion = Object.fromEntries(Object.entries(SECCIONES_ORINA).map(([k, t]) => [t, k]));
      for (const c of tipo.campos) if (valores.has(c.clave)) doc[claveSeccion[c.seccion!]!]![c.clave] = valores.get(c.clave)!;
      return { resultados: doc, critico };
    }

    case 'urocultivo': {
      const organismo = String(valores.get('organismo'));
      const crecimiento = sinAcentos(organismo) !== 'sin crecimiento';
      const recuento = valores.get('recuento_ufc') as number | undefined;
      if (crecimiento && recuento === undefined) throw new ReglaDeNegocio('Escriba el recuento en UFC/mL del microorganismo aislado.');
      if (!crecimiento && input.antibiograma.length) throw new ReglaDeNegocio('Un cultivo sin crecimiento no lleva antibiograma.');
      return {
        resultados: {
          crecimiento,
          organismo: crecimiento ? organismo : 'Sin crecimiento',
          recuento_ufc: crecimiento ? recuento! : 0,
          antibiograma: input.antibiograma.map((a) => ({ antibiotico: a.antibiotico, interpretacion: a.interpretacion })),
        },
        critico,
      };
    }

    case 'quimica': {
      if (!valores.size) throw new ReglaDeNegocio('Escriba al menos un analito de la química sanguínea.');
      const porClave = new Map(tipo.campos.map((c) => [c.clave, c]));
      return {
        resultados: {
          valores: [...valores].map(([analito, valor]) => ({ analito, valor, unidad: porClave.get(analito)?.unidad ?? null })),
        },
        critico,
      };
    }
  }
}

/** Vuelve a aplanar el documento (clave del catálogo → valor) para interpretarlo y para precargar el formulario. */
export function valoresPlanos(tipo: TipoExamen['clave'], r: Resultados): Record<string, Valor> {
  switch (tipo) {
    case 'hematologia':
      return r as Record<string, Valor>;
    case 'orina':
      return { ...(r.fisico as object), ...(r.quimico as object), ...(r.sedimento as object) };
    case 'urocultivo':
      return r.crecimiento
        ? { organismo: r.organismo as string, recuento_ufc: r.recuento_ufc as number }
        : { organismo: r.organismo as string };
    case 'quimica':
      return Object.fromEntries((r.valores as { analito: string; valor: number }[]).map((v) => [v.analito, v.valor]));
  }
}

const ANTIBIOGRAMA: Record<string, [string, Interpretacion]> = {
  S: ['Sensible', 'SENSIBLE'], I: ['Intermedio', 'INTERMEDIO'], R: ['Resistente', 'RESISTENTE'],
};

/** Las secciones de la tabla de resultados, en el orden del catálogo y con su interpretación. */
export function seccionesDe(tipo: TipoExamen, r: Resultados | null): SeccionResultado[] {
  if (!r) return [];
  const planos = valoresPlanos(tipo.clave, r);
  const secciones: SeccionResultado[] = [];
  for (const c of tipo.campos) {
    if (planos[c.clave] === undefined) continue;
    const v = planos[c.clave]!;
    let s = secciones.at(-1);
    if (!s || s.titulo !== c.seccion) secciones.push((s = { titulo: c.seccion, columnas: 'parametro', filas: [] }));
    s.filas.push({ parametro: c.nombre, valor: formatoValor(v, c.decimales), unidad: c.unidad, referencia: referencia(c), interpretacion: interpretar(c, v) });
  }
  const antibiograma = (r.antibiograma as { antibiotico: string; interpretacion: string }[] | undefined) ?? [];
  if (antibiograma.length) {
    secciones.push({
      titulo: 'Antibiograma',
      columnas: 'antibiograma',
      filas: antibiograma.map((a): FilaResultado => {
        const [texto, interpretacion] = ANTIBIOGRAMA[a.interpretacion] ?? [a.interpretacion, 'ANORMAL'];
        return { parametro: a.antibiotico, valor: texto, unidad: null, referencia: null, interpretacion };
      }),
    });
  }
  return secciones;
}

/** Un examen validado queda cerrado: sus resultados ya se entregaron al médico. */
export function validarCaptura(estado: EstadoExamen): void {
  if (estado === 'VALIDADO') throw new ReglaDeNegocio('El examen ya fue validado; sus resultados no se pueden cambiar.');
}

export function validarValidacion(estado: EstadoExamen, tieneResultados: boolean): void {
  if (estado === 'VALIDADO') throw new ReglaDeNegocio('El examen ya está validado.');
  if (!tieneResultados) throw new ReglaDeNegocio('Capture los resultados antes de validar el examen.');
}

/** Código legible del examen: LAB-2026-11-0412. */
export const codigoExamen = (fecha: Date, consecutivo: number) =>
  `LAB-${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(consecutivo).padStart(4, '0')}`;

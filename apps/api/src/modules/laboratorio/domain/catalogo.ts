import type { CampoExamen, TipoExamen } from '@red-clinica/shared';

/**
 * Catálogo de tipos de examen. Es la fuente del seed de la colección `tipos_examen`;
 * en ejecución, la API lee el catálogo desde MongoDB (puerto ExamenRepository.tipos()).
 * Rangos de referencia para adultos, de uso didáctico.
 */
type Campo = Partial<CampoExamen> & Pick<CampoExamen, 'clave' | 'nombre' | 'tipo'>;

const campo = (c: Campo): CampoExamen => ({
  seccion: null, unidad: null, decimales: null, refMin: null, refMax: null, criticoMin: null, criticoMax: null,
  normal: null, opciones: null, obligatorio: false, ...c,
});

const num = (clave: string, nombre: string, unidad: string | null, refMin: number | null, refMax: number | null, extra: Partial<CampoExamen> = {}) =>
  campo({ clave, nombre, tipo: 'numero', unidad, refMin, refMax, ...extra });

const CRUCES = ['Negativo', 'Trazas', '+', '++', '+++'];

export const SECCIONES_ORINA = { fisico: 'Examen físico', quimico: 'Examen químico', sedimento: 'Sedimento' } as const;

export const CATALOGO: TipoExamen[] = [
  {
    clave: 'hematologia',
    nombre: 'Hematología completa',
    corto: 'Hematología',
    muestra: 'Sangre total (EDTA)',
    campos: [
      num('hemoglobina', 'Hemoglobina', 'g/dL', 12, 16, { decimales: 1, criticoMin: 7, criticoMax: 20, obligatorio: true }),
      num('hematocrito', 'Hematocrito', '%', 36, 46, { criticoMin: 20, criticoMax: 60 }),
      num('leucocitos', 'Leucocitos', '×10³/µL', 4.5, 11, { decimales: 1, criticoMin: 2, criticoMax: 30, obligatorio: true }),
      num('plaquetas', 'Plaquetas', '×10³/µL', 150, 400, { criticoMin: 50, criticoMax: 1000, obligatorio: true }),
      num('neutrofilos', 'Neutrófilos', '%', 40, 70),
      num('linfocitos', 'Linfocitos', '%', 20, 40),
    ],
  },
  {
    clave: 'orina',
    nombre: 'Orina simple',
    corto: 'Orina',
    muestra: 'Orina de chorro medio',
    campos: [
      campo({ clave: 'color', nombre: 'Color', tipo: 'opcion', seccion: SECCIONES_ORINA.fisico, opciones: ['Amarillo claro', 'Amarillo', 'Ámbar', 'Rojizo'], obligatorio: true }),
      campo({ clave: 'aspecto', nombre: 'Aspecto', tipo: 'opcion', seccion: SECCIONES_ORINA.fisico, opciones: ['Transparente', 'Ligeramente turbio', 'Turbio'], normal: 'Transparente', obligatorio: true }),
      num('densidad', 'Densidad', null, 1.005, 1.03, { decimales: 3, seccion: SECCIONES_ORINA.fisico }),
      num('ph', 'pH', null, 4.5, 8, { decimales: 1, seccion: SECCIONES_ORINA.quimico, obligatorio: true }),
      campo({ clave: 'proteinas', nombre: 'Proteínas', tipo: 'opcion', seccion: SECCIONES_ORINA.quimico, opciones: CRUCES, normal: 'Negativo' }),
      campo({ clave: 'glucosa', nombre: 'Glucosa', tipo: 'opcion', seccion: SECCIONES_ORINA.quimico, opciones: CRUCES, normal: 'Negativo' }),
      campo({ clave: 'nitritos', nombre: 'Nitritos', tipo: 'opcion', seccion: SECCIONES_ORINA.quimico, opciones: ['Negativo', 'Positivo'], normal: 'Negativo' }),
      campo({ clave: 'sangre', nombre: 'Sangre', tipo: 'opcion', seccion: SECCIONES_ORINA.quimico, opciones: CRUCES, normal: 'Negativo' }),
      num('leucocitos', 'Leucocitos', '/campo', 0, 5, { seccion: SECCIONES_ORINA.sedimento }),
      num('eritrocitos', 'Eritrocitos', '/campo', 0, 3, { seccion: SECCIONES_ORINA.sedimento }),
      campo({ clave: 'bacterias', nombre: 'Bacterias', tipo: 'opcion', seccion: SECCIONES_ORINA.sedimento, opciones: ['Escasas', 'Moderadas', 'Abundantes'], normal: 'Escasas' }),
      campo({ clave: 'cilindros', nombre: 'Cilindros', tipo: 'texto', seccion: SECCIONES_ORINA.sedimento, normal: 'No se observan' }),
    ],
  },
  {
    clave: 'urocultivo',
    nombre: 'Urocultivo',
    corto: 'Cultivo',
    muestra: 'Orina de chorro medio en frasco estéril',
    campos: [
      campo({ clave: 'organismo', nombre: 'Microorganismo', tipo: 'texto', normal: 'Sin crecimiento', obligatorio: true }),
      // Desde 100,000 UFC/mL el recuento es significativo.
      num('recuento_ufc', 'Recuento', 'UFC/mL', null, 100000),
    ],
  },
  {
    clave: 'quimica',
    nombre: 'Química sanguínea',
    corto: 'Química',
    muestra: 'Suero',
    campos: [
      num('glucosa', 'Glucosa', 'mg/dL', 70, 100, { criticoMin: 40, criticoMax: 400 }),
      num('creatinina', 'Creatinina', 'mg/dL', 0.6, 1.2, { decimales: 1, criticoMax: 7 }),
      num('nitrogeno_ureico', 'Nitrógeno ureico (BUN)', 'mg/dL', 7, 20),
      num('colesterol', 'Colesterol total', 'mg/dL', null, 200),
      num('trigliceridos', 'Triglicéridos', 'mg/dL', null, 150),
      num('sodio', 'Sodio', 'mmol/L', 135, 145, { criticoMin: 120, criticoMax: 160 }),
      num('potasio', 'Potasio', 'mmol/L', 3.5, 5, { decimales: 1, criticoMin: 2.8, criticoMax: 6 }),
    ],
  },
];

import type { ExamenDetalle, FilaResultado } from '@red-clinica/shared';

/** Los exámenes del prototipo (vista "laboratorio") para NEXT_PUBLIC_DEMO=true. */
const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
const fila = (parametro: string, valor: string, unidad: string | null, referencia: string | null, interpretacion: FilaResultado['interpretacion']): FilaResultado =>
  ({ parametro, valor, unidad, referencia, interpretacion });
const firma = (min: number) => ({ nombre: 'Q.B. Lucía Ramírez', fecha: hace(min) });
const base = { medicoSolicitante: 'Dra. Ana Lucía Pérez', observaciones: null, resultados: null, capturadoPor: null, validadoPor: null, secciones: [] };

export const EXAMENES_DEMO: ExamenDetalle[] = [
  {
    ...base, id: 'd1', codigo: 'LAB-2026-11-0415', tipo: 'quimica', nombre: 'Química sanguínea', estado: 'VALIDADO', critico: true,
    fechaOrden: hace(100), fechaActualizacion: hace(12), capturadoPor: firma(40), validadoPor: firma(12),
    paciente: { id: '3', nombres: 'Sofía', apellidos: 'Hernández Pérez', cui: '2210774500101' },
    secciones: [{ titulo: null, columnas: 'parametro', filas: [
      fila('Glucosa', '112', 'mg/dL', '70 – 100', 'ALTO'),
      fila('Creatinina', '1.1', 'mg/dL', '0.6 – 1.2', 'NORMAL'),
      fila('Sodio', '138', 'mmol/L', '135 – 145', 'NORMAL'),
      fila('Potasio', '6.4', 'mmol/L', '3.5 – 5.0', 'CRITICO_ALTO'),
    ] }],
  },
  {
    ...base, id: 'd2', codigo: 'LAB-2026-11-0412', tipo: 'hematologia', nombre: 'Hematología completa', estado: 'VALIDADO', critico: false,
    fechaOrden: hace(1980), fechaActualizacion: hace(1500), capturadoPor: firma(1560), validadoPor: firma(1500),
    paciente: { id: '2', nombres: 'Carlos', apellidos: 'Ajú Tzul', cui: '1987663010901' },
    secciones: [{ titulo: null, columnas: 'parametro', filas: [
      fila('Hemoglobina', '13.8', 'g/dL', '12.0 – 16.0', 'NORMAL'),
      fila('Hematocrito', '41.2', '%', '36 – 46', 'NORMAL'),
      fila('Leucocitos', '11.8', '×10³/µL', '4.5 – 11.0', 'ALTO'),
      fila('Plaquetas', '245', '×10³/µL', '150 – 400', 'NORMAL'),
      fila('Neutrófilos', '72', '%', '40 – 70', 'ALTO'),
      fila('Linfocitos', '21', '%', '20 – 40', 'NORMAL'),
    ] }],
  },
  {
    ...base, id: 'd3', codigo: 'LAB-2026-11-0410', tipo: 'orina', nombre: 'Orina simple', estado: 'EN_PROCESO', critico: false,
    fechaOrden: hace(1800), fechaActualizacion: hace(1680), capturadoPor: firma(1680),
    paciente: { id: '1', nombres: 'María José', apellidos: 'López Ramírez', cui: '2547881200101' },
    secciones: [
      { titulo: 'Examen físico', columnas: 'parametro', filas: [fila('Color', 'Amarillo', null, null, null), fila('Aspecto', 'Ligeramente turbio', null, 'Transparente', 'ANORMAL')] },
      { titulo: 'Examen químico', columnas: 'parametro', filas: [fila('pH', '6.0', null, '4.5 – 8.0', 'NORMAL'), fila('Nitritos', 'Positivo', null, 'Negativo', 'ANORMAL')] },
      { titulo: 'Sedimento', columnas: 'parametro', filas: [fila('Leucocitos', '12', '/campo', '0 – 5', 'ALTO'), fila('Bacterias', 'Moderadas', null, 'Escasas', 'ANORMAL')] },
    ],
  },
  {
    ...base, id: 'd4', codigo: 'LAB-2026-11-0405', tipo: 'urocultivo', nombre: 'Urocultivo', estado: 'PENDIENTE', critico: false,
    fechaOrden: hace(3000), fechaActualizacion: hace(3000),
    paciente: { id: '5', nombres: 'Rosa', apellidos: 'Gómez de León', cui: '1755441200108' },
  },
];

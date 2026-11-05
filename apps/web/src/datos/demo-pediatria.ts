import type { DosisVencida, PacienteFicha, SeguimientoPediatrico, Vacuna, VacunaEnCarne } from '@red-clinica/shared';

/** Datos de la vista "crecimiento" del prototipo, para NEXT_PUBLIC_DEMO=true. */

export const FICHA_DEMO: PacienteFicha = {
  id: '6', cui: '3301445670101', nombres: 'Mateo', apellidos: 'Juárez Coc', fechaNacimiento: '2020-04-02',
  sexo: 'M', tipoSangre: 'A+', telefono: '55218890', estado: 'ACTIVO', direccion: 'Zona 7, Ciudad de Guatemala',
  procedencia: null, telefonos: ['55218890', '44021176'], emails: [],
  alergias: [{ id: '1', tipo: 'Alimentaria', descripcion: 'Huevo', severidad: 'MODERADA', idMedicamento: null }],
  antecedentes: [], baja: null,
};

export const VACUNAS_DEMO: Vacuna[] = [
  { id: '1', nombre: 'BCG', dosisTotales: 1 },
  { id: '2', nombre: 'Hepatitis B', dosisTotales: 3 },
  { id: '3', nombre: 'Pentavalente', dosisTotales: 3 },
  { id: '4', nombre: 'Polio (IPV/OPV)', dosisTotales: 4 },
  { id: '5', nombre: 'SPR', dosisTotales: 2 },
  { id: '6', nombre: 'DPT refuerzo', dosisTotales: 2 },
];

const carne = (id: string, fechas: string[], estado: VacunaEnCarne['estado'], proximaFecha: string | null = null): VacunaEnCarne => {
  const v = VACUNAS_DEMO.find((x) => x.id === id)!;
  return {
    ...v, estado, proximaFecha,
    siguienteDosis: fechas.length < v.dosisTotales ? fechas.length + 1 : null,
    dosis: fechas.map((f, i) => ({ id: `${id}-${i}`, numeroDosis: i + 1, fechaAplicacion: f, lote: null, fechaProximaDosis: null, observaciones: null })),
  };
};

export const SEGUIMIENTO_DEMO: SeguimientoPediatrico = {
  mediciones: [
    ['2026-11-05', 79, 22.1, 118.5, 51.2, 62, 58, 64],
    ['2026-05-06', 73, 20.4, 114.0, 51.0, 58, 55, 60],
    ['2025-11-04', 67, 19.0, 110.2, 50.8, 55, 52, 57],
    ['2025-05-05', 61, 17.8, 106.1, 50.5, 53, 50, 55],
  ].map(([fecha, edadMeses, pesoKg, tallaCm, perimetroCefalicoCm, pe, te, pt], i) => ({
    id: String(i), fecha: fecha as string, edadMeses: edadMeses as number, pesoKg: pesoKg as number, tallaCm: tallaCm as number,
    perimetroCefalicoCm: perimetroCefalicoCm as number, percentilPesoEdad: pe as number, percentilTallaEdad: te as number,
    percentilPesoTalla: pt as number, observaciones: null,
  })),
  carne: [
    carne('1', ['2020-04-03'], 'COMPLETO'),
    carne('2', ['2020-04-03', '2020-06-04', '2020-10-05'], 'COMPLETO'),
    carne('3', ['2020-06-04', '2020-08-06'], 'ATRASADA', '2026-10-12'),
    carne('4', ['2020-06-04', '2020-08-06', '2020-10-05'], 'PENDIENTE', '2027-01-15'),
    carne('5', ['2021-04-05', '2021-10-04'], 'COMPLETO'),
    carne('6', ['2021-10-04'], 'PENDIENTE', '2027-03-12'),
  ],
  responsables: [
    { id: '1', nombreCompleto: 'Andrea Coc de Juárez', parentesco: 'Madre', esTutorLegal: true, telefonos: ['55218890'] },
    { id: '2', nombreCompleto: 'Pedro Juárez', parentesco: 'Padre', esTutorLegal: false, telefonos: ['44021176'] },
  ],
  baja: null,
};

export const VENCIDAS_DEMO: DosisVencida[] = [
  { idPaciente: '6', nombres: 'Mateo', apellidos: 'Juárez Coc', fechaNacimiento: '2020-04-02', idVacuna: '3', vacuna: 'Pentavalente', numeroDosis: 3, dosisTotales: 3, fechaProximaDosis: '2026-10-12' },
];

import {
  INSTITUCIONES, type EntradaBitacora, type InstitucionClave, type PacienteFicha, type PacienteResumen, type Perfil, type Profesional,
} from '@red-clinica/shared';

/** Los pacientes del prototipo (vista "pacientes"). */
export const PACIENTES_DEMO: PacienteResumen[] = [
  { id: '1', cui: '2547881200101', nombres: 'María José', apellidos: 'López Ramírez', fechaNacimiento: '1992-03-14', sexo: 'F', tipoSangre: 'O+', telefono: '55124478', estado: 'ACTIVO' },
  { id: '2', cui: '1987663010901', nombres: 'Carlos', apellidos: 'Ajú Tzul', fechaNacimiento: '1968-07-02', sexo: 'M', tipoSangre: 'B-', telefono: '44102290', estado: 'ACTIVO' },
  { id: '3', cui: '2210774500101', nombres: 'Sofía', apellidos: 'Hernández Pérez', fechaNacimiento: '1985-01-22', sexo: 'F', tipoSangre: 'O-', telefono: '30215567', estado: 'ACTIVO' },
  { id: '4', cui: '2899100230101', nombres: 'Luis', apellidos: 'Mazariegos', fechaNacimiento: '1999-05-10', sexo: 'M', tipoSangre: 'A+', telefono: '57891123', estado: 'ACTIVO' },
  { id: '5', cui: '1755441200108', nombres: 'Rosa', apellidos: 'Gómez de León', fechaNacimiento: '1963-09-30', sexo: 'F', tipoSangre: 'AB+', telefono: '41227781', estado: 'ACTIVO' },
  { id: '6', cui: '3120877021401', nombres: 'José', apellidos: 'Tum Chávez', fechaNacimiento: '1977-02-11', sexo: 'M', tipoSangre: 'O+', telefono: '55903341', estado: 'ACTIVO' },
  { id: '7', cui: '2066550180901', nombres: 'Elena', apellidos: 'Pac Xicará', fechaNacimiento: '1955-06-05', sexo: 'F', tipoSangre: 'A-', telefono: null, estado: 'BAJA' },
];

export const MODO_DEMO = process.env.NEXT_PUBLIC_DEMO === 'true';

/** Perfil de ejemplo para revisar las pantallas sin API (NEXT_PUBLIC_DEMO=true). */
export function perfilDemo(clave: InstitucionClave = 'hospital'): Perfil {
  const i = INSTITUCIONES[clave];
  return {
    usuario: { id: 'demo', username: 'aperez', nombre: 'Dra. Ana Lucía Pérez', rol: 'MEDICO', idPersonal: null },
    institucion: { id: clave, clave, nombre: i.nombre, motor: i.motor, modulos: i.modulos },
  };
}

/** Ficha del prototipo (vista "paciente"): alergias y antecedentes de María José López. */
export function FICHA_DEMO(id: string): PacienteFicha {
  const p = PACIENTES_DEMO.find((x) => x.id === id) ?? PACIENTES_DEMO[0]!;
  const esMaria = p.id === '1';
  return {
    ...p,
    direccion: esMaria ? '5a. avenida 12-40, zona 1, Mixco' : null,
    procedencia: esMaria ? 'Mixco' : null,
    telefonos: p.telefono ? [p.telefono] : [],
    emails: esMaria ? ['mjlopez@correo.gt'] : [],
    alergias: esMaria
      ? [
          { id: 'a1', tipo: 'Penicilina', descripcion: 'Reacción anafiláctica registrada en 2019. No recetar betalactámicos.', severidad: 'SEVERA', idMedicamento: null },
          { id: 'a2', tipo: 'Polen', descripcion: null, severidad: 'LEVE', idMedicamento: null },
        ]
      : [],
    antecedentes: esMaria
      ? [
          { id: 'h1', tipo: 'Hipertensión arterial', descripcion: null },
          { id: 'h2', tipo: 'Apendicectomía 2015', descripcion: null },
          { id: 'h3', tipo: 'Madre diabética', descripcion: null },
        ]
      : [],
    baja: p.estado === 'BAJA' ? { fecha: '2026-06-02', motivo: 'Traslado a otra institución' } : null,
  };
}

/** Personal del hospital para el directorio en modo demo. */
export const PERSONAL_DEMO: Profesional[] = [
  { id: '1', nombres: 'Ana Lucía', apellidos: 'Pérez', numeroColegiado: 'COL-10234', especialidades: [{ id: '1', nombre: 'Medicina interna' }] },
  { id: '2', nombres: 'Carlos', apellidos: 'Méndez', numeroColegiado: 'COL-11870', especialidades: [{ id: '2', nombre: 'Neurología' }] },
  { id: '3', nombres: 'Lucía', apellidos: 'Coyoy Batz', numeroColegiado: 'COL-12455', especialidades: [{ id: '3', nombre: 'Cardiología' }, { id: '1', nombre: 'Medicina interna' }] },
];

const USUARIO_DEMO = { id: 'demo', username: 'aperez', nombre: 'Dra. Ana Lucía Pérez', rol: 'MEDICO' as const };
const RECEPCION_DEMO = { id: 'r', username: 'recepcion.hg', nombre: 'Recepción Hospital general', rol: 'RECEPCION' as const };

/** Bitácora de ejemplo: quién vio y modificó el expediente de María José López. */
export const BITACORA_DEMO: EntradaBitacora[] = [
  { id: '6', momento: '2026-11-05T14:12:00Z', usuario: USUARIO_DEMO, accion: 'LEER', entidad: 'paciente', idRegistro: '1', idPaciente: '1', ip: '10.0.4.21' },
  { id: '5', momento: '2026-11-04T14:20:00Z', usuario: USUARIO_DEMO, accion: 'CREAR', entidad: 'alergia', idRegistro: 'a2', idPaciente: '1', ip: '10.0.4.21' },
  { id: '4', momento: '2026-11-04T14:08:00Z', usuario: USUARIO_DEMO, accion: 'LEER', entidad: 'paciente', idRegistro: '1', idPaciente: '1', ip: '10.0.4.21' },
  { id: '3', momento: '2026-11-04T13:55:00Z', usuario: RECEPCION_DEMO, accion: 'LEER', entidad: 'paciente', idRegistro: '1', idPaciente: '1', ip: '10.0.4.10' },
  { id: '2', momento: '2026-11-04T13:50:00Z', usuario: RECEPCION_DEMO, accion: 'CREAR', entidad: 'paciente', idRegistro: '2', idPaciente: '2', ip: '10.0.4.10' },
  { id: '1', momento: '2026-11-04T13:30:00Z', usuario: USUARIO_DEMO, accion: 'LOGIN', entidad: null, idRegistro: null, idPaciente: null, ip: '10.0.4.21' },
];

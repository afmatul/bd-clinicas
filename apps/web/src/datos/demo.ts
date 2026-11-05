import { INSTITUCIONES, type InstitucionClave, type PacienteResumen, type Perfil } from '@red-clinica/shared';

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

export const MODO_DEMO = import.meta.env.VITE_DEMO === 'true';

/** Perfil de ejemplo para revisar las pantallas sin API (VITE_DEMO=true). */
export function perfilDemo(clave: InstitucionClave = 'hospital'): Perfil {
  const i = INSTITUCIONES[clave];
  return {
    usuario: { id: 'demo', username: 'aperez', nombre: 'Dra. Ana Lucía Pérez', rol: 'MEDICO', idPersonal: null },
    institucion: { id: clave, clave, nombre: i.nombre, motor: i.motor, modulos: i.modulos },
  };
}

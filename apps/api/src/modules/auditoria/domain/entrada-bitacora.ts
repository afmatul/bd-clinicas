export type AccionBitacora = 'LOGIN' | 'LOGOUT' | 'LEER' | 'CREAR' | 'MODIFICAR' | 'BAJA' | 'EXPORTAR';

/** Quién tocó qué registro. Nunca guarda contenido clínico: los datos restringidos no salen de su institución. */
export interface EntradaBitacora {
  idUsuario: string | null;
  idInstitucion: string | null;
  accion: AccionBitacora;
  entidad?: string;
  idRegistro?: string;
  idPaciente?: string;
  ip?: string;
}

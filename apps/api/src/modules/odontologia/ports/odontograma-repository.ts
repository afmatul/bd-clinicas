// Puerto del módulo odontologia. Pendiente de implementar: ver README.md del módulo.

/** Notación FDI: piezas 11–18, 21–28, 31–38, 41–48. */
export type Pieza = `${1 | 2 | 3 | 4}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export interface EstadoPieza { estado: 'SANA' | 'CARIES' | 'OBTURADA' | 'AUSENTE' | 'CORONA' | 'ENDODONCIA'; caras?: string[]; nota?: string }

export interface OdontogramaRepository {
  obtener(idPaciente: string): Promise<Partial<Record<Pieza, EstadoPieza>>>;
  /** Escribe en el documento paciente con control optimista por _rev; relee y reintenta ante 409. */
  aplicar(idPaciente: string, cambios: Partial<Record<Pieza, EstadoPieza>>): Promise<void>;
}

// Puerto del módulo pediatria. Pendiente de implementar: ver README.md del módulo.

export interface Medicion {
  fecha: string; pesoKg: number; tallaCm: number; perimetroCefalicoCm?: number;
  percentilPesoEdad?: number; percentilTallaEdad?: number; percentilPesoTalla?: number; observaciones?: string;
}
export interface Dosis { idVacuna: string; numeroDosis: number; fechaAplicacion: string; lote?: number; fechaProximaDosis?: string }

export interface SeguimientoPediatricoRepository {
  registrarMedicion(idPaciente: string, m: Medicion): Promise<void>; // UNIQUE (paciente, fecha)
  curva(idPaciente: string): Promise<Medicion[]>;
  aplicarDosis(idPaciente: string, d: Dosis): Promise<void>;        // UNIQUE (paciente, vacuna, dosis)
  carne(idPaciente: string): Promise<unknown>;
  dosisVencidas(hasta: string): Promise<unknown[]>;
}

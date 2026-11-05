// Puerto del módulo personal. Pendiente de implementar: ver README.md del módulo.

export interface Profesional { id: string; nombres: string; apellidos: string; numeroColegiado: string; especialidades: string[] }

/** Información pública: no requiere sesión. */
export interface PersonalRepository {
  directorio(filtro?: { idEspecialidad?: string }): Promise<Profesional[]>;
}

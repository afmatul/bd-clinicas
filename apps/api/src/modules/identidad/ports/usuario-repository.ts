import type { InstitucionClave, ModuloId, Motor } from '@red-clinica/shared';
import type { UsuarioCredenciales } from '../domain/usuario.js';

export interface UsuarioRepository {
  buscarPorUsername(username: string): Promise<UsuarioCredenciales | null>;
  buscarPorId(id: string): Promise<UsuarioCredenciales | null>;
  registrarFallo(id: string, intentos: number, bloqueadoHasta: Date | null): Promise<void>;
  registrarAcceso(id: string): Promise<void>;
  actualizarDatos(id: string, cambios: { nombre?: string; passwordHash?: string }): Promise<void>;
}

export interface Institucion {
  id: string;
  clave: InstitucionClave;
  nombre: string;
  motor: Motor;
  modulos: ModuloId[];
}

export interface InstitucionRepository {
  listar(): Promise<Institucion[]>;
}

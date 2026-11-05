import type { Rol } from '@red-clinica/shared';

export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;

export interface UsuarioCredenciales {
  id: string;
  username: string;
  nombre: string;
  passwordHash: string;
  idInstitucion: string;
  rol: Rol;
  idPersonal: string | null;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  activo: boolean;
}

export function estaBloqueado(u: UsuarioCredenciales, ahora = new Date()): boolean {
  return u.bloqueadoHasta !== null && u.bloqueadoHasta > ahora;
}

/** Tras MAX_INTENTOS fallidos la cuenta se bloquea MINUTOS_BLOQUEO minutos. */
export function siguienteBloqueo(intentosTrasFallo: number, ahora = new Date()): Date | null {
  return intentosTrasFallo >= MAX_INTENTOS ? new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000) : null;
}

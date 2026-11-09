import type { Institucion } from '../modules/identidad/ports/usuario-repository.js';
import type { RegistroDeAdaptadores } from './registro-adaptadores.js';

/**
 * El ADMIN actúa con todos los roles (demostración del sistema), médico incluido. Como no tiene un
 * profesional propio, firma como el primer profesional del directorio de la institución activa.
 */
export type ResolverMedicoAdmin = (institucion: Institucion) => Promise<string | null>;

export function crearResolverMedicoAdmin(registro: RegistroDeAdaptadores): ResolverMedicoAdmin {
  const cache = new Map<string, string | null>();
  return async (institucion) => {
    if (cache.has(institucion.id)) return cache.get(institucion.id) ?? null;
    if (!institucion.modulos.includes('personal')) return null;
    const [primero] = await registro.para({ institucion }).personal.directorio({});
    const id = primero?.id ?? null;
    if (id) cache.set(institucion.id, id);
    return id;
  };
}

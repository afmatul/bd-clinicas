import type { InstitucionClave, ModuloId, Motor, Rol } from '@red-clinica/shared';

/**
 * Lo que un caso de uso sabe de quién lo llama. Se arma en cada petición a partir del JWT
 * y nunca expone el motor a la lógica de negocio: solo el RegistroDeAdaptadores lo lee.
 */
export interface ContextoInstitucion {
  usuario: { id: string; username: string; rol: Rol; idPersonal: string | null };
  institucion: { id: string; clave: InstitucionClave; nombre: string; motor: Motor; modulos: ModuloId[] };
  ip?: string;
}

import type { EntradaBitacora } from '../domain/entrada-bitacora.js';

/** Solo inserción. Si escribir falla, la operación falla. */
export interface Bitacora {
  registrar(entrada: EntradaBitacora): Promise<void>;
}

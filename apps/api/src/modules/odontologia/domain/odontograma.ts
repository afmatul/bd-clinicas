import type { EstadoPieza, Odontograma } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

/** Estados que se describen por caras (una caries u obturación ocupa caras concretas). */
const CON_CARAS = new Set<EstadoPieza['estado']>(['CARIES', 'OBTURADA']);

/**
 * Reglas del odontograma que no dependen del motor:
 * - Una pieza ausente solo puede volver como CORONA (implante con corona); no "sana" de nuevo.
 * - Caries y obturaciones indican al menos una cara; los demás estados no llevan caras.
 */
export function validarCambios(actual: Odontograma, cambios: Odontograma): void {
  for (const [pieza, nuevo] of Object.entries(cambios)) {
    const previo = actual[pieza];
    if (previo?.estado === 'AUSENTE' && nuevo.estado !== 'AUSENTE' && nuevo.estado !== 'CORONA') {
      throw new ReglaDeNegocio(`La pieza ${pieza} está ausente: solo puede registrarse una corona sobre implante.`);
    }
    if (CON_CARAS.has(nuevo.estado) && !nuevo.caras?.length) {
      throw new ReglaDeNegocio(`Indique las caras afectadas de la pieza ${pieza}.`);
    }
    if (!CON_CARAS.has(nuevo.estado) && nuevo.caras?.length) {
      throw new ReglaDeNegocio(`El estado ${nuevo.estado.toLowerCase()} de la pieza ${pieza} no lleva caras.`);
    }
  }
}

/** Aplica los cambios sobre el odontograma actual (las piezas no mencionadas se conservan). */
export function combinar(actual: Odontograma, cambios: Odontograma): Odontograma {
  const r: Odontograma = { ...actual };
  for (const [pieza, e] of Object.entries(cambios)) {
    r[pieza] = { estado: e.estado, ...(e.caras?.length ? { caras: [...new Set(e.caras)].sort() } : {}), ...(e.nota ? { nota: e.nota } : {}) };
  }
  return r;
}

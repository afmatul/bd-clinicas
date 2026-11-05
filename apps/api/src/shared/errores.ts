/** Errores de dominio. El manejador HTTP los traduce a códigos de estado; los casos de uso no saben de HTTP. */
export class ErrorDeDominio extends Error {
  /** Datos extra para la pantalla (p. ej. las alergias que chocan con una receta). */
  detalle?: unknown;
  constructor(message: string, readonly codigo: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class NoEncontrado extends ErrorDeDominio {
  constructor(entidad: string) { super(`${entidad} no existe o no pertenece a su institución.`, 'NO_ENCONTRADO'); }
}
export class Conflicto extends ErrorDeDominio {
  constructor(message: string) { super(message, 'CONFLICTO'); }
}
export class ReglaDeNegocio extends ErrorDeDominio {
  constructor(message: string) { super(message, 'REGLA_DE_NEGOCIO'); }
}
export class NoAutorizado extends ErrorDeDominio {
  constructor(message = 'Inicie sesión para continuar.') { super(message, 'NO_AUTORIZADO'); }
}
export class Prohibido extends ErrorDeDominio {
  constructor(message = 'Su rol no permite esta acción.') { super(message, 'PROHIBIDO'); }
}

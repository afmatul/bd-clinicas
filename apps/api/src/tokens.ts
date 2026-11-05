/**
 * Tokens de inyección de NestJS. Los casos de uso son funciones puras de TypeScript (no clases
 * decoradas), así que se registran con useFactory y se inyectan por token: el núcleo hexagonal
 * no depende de Nest.
 */
export const ENV = Symbol('ENV');
export const CONEXIONES = Symbol('CONEXIONES');
export const REGISTRO = Symbol('RegistroDeAdaptadores');
export const INSTITUCIONES = Symbol('INSTITUCIONES');
export const BITACORA = Symbol('Bitacora');
export const AUDITORIA = Symbol('Auditoria');
export const IDENTIDAD = Symbol('Identidad');
export const CUADRO_CLINICO = Symbol('CuadroClinico');
export const PACIENTES = Symbol('CasosDeUsoPacientes');
export const ODONTOLOGIA = Symbol('CasosDeUsoOdontologia');

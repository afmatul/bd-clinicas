import { INSTITUCIONES, type DirectorioQuery, type InstitucionClave, type RegistrarProfesionalInput } from '@red-clinica/shared';
import type { ContextoInstitucion } from '../../../shared/contexto.js';
import { exigirRol } from '../../../shared/autorizacion.js';
import { Conflicto, NoEncontrado } from '../../../shared/errores.js';
import type { RegistroDeAdaptadores } from '../../../infrastructure/registro-adaptadores.js';
import type { Institucion } from '../../identidad/ports/usuario-repository.js';
import type { Auditoria } from '../../auditoria/application/registrar-en-bitacora.js';
import { exigirCatalogoDeEspecialidades } from '../domain/profesional.js';

/**
 * Casos de uso del módulo personal. El directorio es información pública (clasificación de la Entrega I):
 * se puede consultar sin sesión indicando la institución. Altas y especialidades solo las hace ADMIN.
 */
export function crearCasosDeUsoPersonal(deps: {
  registro: RegistroDeAdaptadores;
  auditoria: Auditoria;
  instituciones: () => Map<string, Institucion>;
}) {
  const repo = (ctx: Pick<ContextoInstitucion, 'institucion'>) => deps.registro.para(ctx).personal;

  async function exigirProfesional(ctx: ContextoInstitucion, id: string) {
    const p = await repo(ctx).obtener(id);
    if (!p) throw new NoEncontrado('El profesional');
    return p;
  }

  return {
    /** Sin sesión: la institución viene en la URL. */
    async directorioPublico(clave: InstitucionClave, filtro: DirectorioQuery) {
      const institucion = [...deps.instituciones().values()].find((i) => i.clave === clave);
      if (!institucion || !institucion.modulos.includes('personal')) throw new NoEncontrado('La institución');
      return { institucion: INSTITUCIONES[clave].nombre, items: await repo({ institucion }).directorio(filtro) };
    },

    async listar(ctx: ContextoInstitucion, filtro: DirectorioQuery) {
      return { items: await repo(ctx).directorio(filtro) };
    },

    async obtener(ctx: ContextoInstitucion, id: string) {
      return exigirProfesional(ctx, id);
    },

    /** Profesional vinculado al usuario en sesión (usuario.id_personal), o null si es personal administrativo. */
    async yo(ctx: ContextoInstitucion) {
      if (!ctx.usuario.idPersonal) return null;
      return repo(ctx).obtener(ctx.usuario.idPersonal);
    },

    async especialidades(ctx: ContextoInstitucion) {
      return repo(ctx).especialidades();
    },

    async departamentos(ctx: ContextoInstitucion) {
      return repo(ctx).departamentos();
    },

    async registrar(ctx: ContextoInstitucion, input: RegistrarProfesionalInput) {
      exigirRol(ctx, []); // solo ADMIN
      if (await repo(ctx).existeColegiado(input.numeroColegiado)) {
        throw new Conflicto(`Ya existe un profesional con el colegiado ${input.numeroColegiado}.`);
      }
      const id = await repo(ctx).registrar(input);
      await deps.auditoria.registrar(ctx, 'CREAR', { entidad: 'personal', idRegistro: id });
      return { id };
    },

    async asignarEspecialidad(ctx: ContextoInstitucion, id: string, idEspecialidad: string) {
      exigirRol(ctx, []);
      exigirCatalogoDeEspecialidades(ctx.institucion.clave);
      await exigirProfesional(ctx, id);
      await repo(ctx).asignarEspecialidad(id, idEspecialidad);
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'medico_especialidad', idRegistro: id });
      return exigirProfesional(ctx, id);
    },

    async quitarEspecialidad(ctx: ContextoInstitucion, id: string, idEspecialidad: string) {
      exigirRol(ctx, []);
      exigirCatalogoDeEspecialidades(ctx.institucion.clave);
      await exigirProfesional(ctx, id);
      await repo(ctx).quitarEspecialidad(id, idEspecialidad);
      await deps.auditoria.registrar(ctx, 'MODIFICAR', { entidad: 'medico_especialidad', idRegistro: id });
      return exigirProfesional(ctx, id);
    },
  };
}
export type CasosDeUsoPersonal = ReturnType<typeof crearCasosDeUsoPersonal>;

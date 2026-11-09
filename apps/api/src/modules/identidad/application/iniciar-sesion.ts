import bcrypt from 'bcryptjs';
import type { ActualizarPerfilInput, InstitucionClave, LoginInput, Perfil } from '@red-clinica/shared';
import { NoAutorizado, NoEncontrado, Prohibido, ReglaDeNegocio } from '../../../shared/errores.js';
import type { Bitacora } from '../../auditoria/ports/bitacora.js';
import { estaBloqueado, MINUTOS_BLOQUEO, siguienteBloqueo } from '../domain/usuario.js';
import type { Institucion, UsuarioRepository } from '../ports/usuario-repository.js';

export interface ClaimsSesion {
  sub: string;
  rol: Perfil['usuario']['rol'];
  id_institucion: string;
  id_personal: string | null;
}

const CREDENCIALES_INVALIDAS = 'Usuario o contraseña incorrectos. Revise los datos e intente de nuevo.';

export function crearIdentidad(deps: {
  usuarios: UsuarioRepository;
  instituciones: () => Map<string, Institucion>;
  bitacora: Bitacora;
  /** Profesional con el que actúa un ADMIN en la institución (demostración: el ADMIN tiene todos los roles). */
  medicoAdmin: (institucion: Institucion) => Promise<string | null>;
}) {
  async function perfil(u: { id: string; username: string; nombre: string; rol: Perfil['usuario']['rol']; idPersonal: string | null; idInstitucion: string }): Promise<Perfil> {
    const inst = deps.instituciones().get(u.idInstitucion);
    if (!inst) throw new NoAutorizado('Su usuario no tiene una institución válida. Contacte al administrador.');
    const idPersonal = u.idPersonal ?? (u.rol === 'ADMIN' ? await deps.medicoAdmin(inst) : null);
    return {
      usuario: { id: u.id, username: u.username, nombre: u.nombre, rol: u.rol, idPersonal },
      institucion: { id: inst.id, clave: inst.clave, nombre: inst.nombre, motor: inst.motor, modulos: inst.modulos },
    };
  }

  return {
    /** Valida contra la base plataforma antes de tocar la base de la institución. */
    async iniciarSesion(input: LoginInput, ip?: string): Promise<{ perfil: Perfil; claims: ClaimsSesion }> {
      const u = await deps.usuarios.buscarPorUsername(input.username);
      if (!u || !u.activo) throw new NoAutorizado(CREDENCIALES_INVALIDAS);
      if (estaBloqueado(u)) {
        throw new NoAutorizado(`Su cuenta está bloqueada por ${MINUTOS_BLOQUEO} minutos tras varios intentos fallidos.`);
      }
      if (!(await bcrypt.compare(input.password, u.passwordHash))) {
        const intentos = u.intentosFallidos + 1;
        await deps.usuarios.registrarFallo(u.id, intentos, siguienteBloqueo(intentos));
        throw new NoAutorizado(CREDENCIALES_INVALIDAS);
      }
      await deps.usuarios.registrarAcceso(u.id);
      await deps.bitacora.registrar({ idUsuario: u.id, idInstitucion: u.idInstitucion, accion: 'LOGIN', ip });
      return {
        perfil: await perfil(u),
        claims: { sub: u.id, rol: u.rol, id_institucion: u.idInstitucion, id_personal: u.idPersonal },
      };
    },

    /**
     * Solo ADMIN: pasa la sesión a otra institución. Devuelve el perfil y los claims nuevos para reemitir la cookie.
     * Queda un LOGIN en la bitácora de la institución destino, para que el acceso transversal sea rastreable.
     */
    async cambiarInstitucion(idUsuario: string, clave: InstitucionClave, ip?: string): Promise<{ perfil: Perfil; claims: ClaimsSesion }> {
      const u = await deps.usuarios.buscarPorId(idUsuario);
      if (!u || !u.activo) throw new NoAutorizado();
      if (u.rol !== 'ADMIN') throw new Prohibido();
      const destino = [...deps.instituciones().values()].find((i) => i.clave === clave);
      if (!destino) throw new NoEncontrado('La institución');
      await deps.bitacora.registrar({ idUsuario: u.id, idInstitucion: destino.id, accion: 'LOGIN', ip });
      return {
        perfil: await perfil({ ...u, idInstitucion: destino.id }),
        claims: { sub: u.id, rol: u.rol, id_institucion: destino.id, id_personal: u.idPersonal },
      };
    },

    /** El propio usuario cambia su nombre y/o contraseña. Cambiar la contraseña exige la actual. */
    async actualizarPerfil(idUsuario: string, idInstitucionActiva: string, input: ActualizarPerfilInput): Promise<Perfil> {
      const u = await deps.usuarios.buscarPorId(idUsuario);
      if (!u || !u.activo) throw new NoAutorizado();
      let passwordHash: string | undefined;
      if (input.passwordNueva) {
        if (!input.passwordActual || !(await bcrypt.compare(input.passwordActual, u.passwordHash))) {
          throw new ReglaDeNegocio('La contraseña actual no es correcta.');
        }
        passwordHash = await bcrypt.hash(input.passwordNueva, 10);
      }
      await deps.usuarios.actualizarDatos(idUsuario, { nombre: input.nombre, passwordHash });
      await deps.bitacora.registrar({ idUsuario, idInstitucion: idInstitucionActiva, accion: 'MODIFICAR' });
      return perfil({ ...u, idInstitucion: idInstitucionActiva, nombre: input.nombre ?? u.nombre });
    },

    /** La institución del perfil es la de la sesión (un ADMIN puede estar en una distinta a la suya). */
    async obtenerPerfil(idUsuario: string, idInstitucionActiva: string): Promise<Perfil> {
      const u = await deps.usuarios.buscarPorId(idUsuario);
      if (!u || !u.activo) throw new NoAutorizado();
      return perfil({ ...u, idInstitucion: idInstitucionActiva });
    },
  };
}
export type Identidad = ReturnType<typeof crearIdentidad>;

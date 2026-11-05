import bcrypt from 'bcryptjs';
import type { LoginInput, Perfil } from '@red-clinica/shared';
import { NoAutorizado } from '../../../shared/errores.js';
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
}) {
  function perfil(u: { id: string; username: string; nombre: string; rol: Perfil['usuario']['rol']; idPersonal: string | null; idInstitucion: string }): Perfil {
    const inst = deps.instituciones().get(u.idInstitucion);
    if (!inst) throw new NoAutorizado('Su usuario no tiene una institución válida. Contacte al administrador.');
    return {
      usuario: { id: u.id, username: u.username, nombre: u.nombre, rol: u.rol, idPersonal: u.idPersonal },
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
      if (input.institucion && deps.instituciones().get(u.idInstitucion)?.clave !== input.institucion) {
        throw new NoAutorizado('Su usuario no pertenece a la institución elegida. Revise la institución e intente de nuevo.');
      }
      await deps.usuarios.registrarAcceso(u.id);
      await deps.bitacora.registrar({ idUsuario: u.id, idInstitucion: u.idInstitucion, accion: 'LOGIN', ip });
      return {
        perfil: perfil(u),
        claims: { sub: u.id, rol: u.rol, id_institucion: u.idInstitucion, id_personal: u.idPersonal },
      };
    },

    async obtenerPerfil(idUsuario: string): Promise<Perfil> {
      const u = await deps.usuarios.buscarPorId(idUsuario);
      if (!u || !u.activo) throw new NoAutorizado();
      return perfil(u);
    },
  };
}
export type Identidad = ReturnType<typeof crearIdentidad>;

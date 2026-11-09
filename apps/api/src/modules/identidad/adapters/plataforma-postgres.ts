import type pg from 'pg';
import type { UsuarioCredenciales } from '../domain/usuario.js';
import type { Institucion, InstitucionRepository, UsuarioRepository } from '../ports/usuario-repository.js';

const COLS = `id_usuario, username, nombre, password_hash, id_institucion, rol, id_personal,
              intentos_fallidos, bloqueado_hasta, activo`;

function aUsuario(r: Record<string, any>): UsuarioCredenciales {
  return {
    id: String(r.id_usuario),
    username: r.username,
    nombre: r.nombre,
    passwordHash: r.password_hash,
    idInstitucion: String(r.id_institucion),
    rol: r.rol,
    idPersonal: r.id_personal,
    intentosFallidos: r.intentos_fallidos,
    bloqueadoHasta: r.bloqueado_hasta,
    activo: r.activo,
  };
}

export class UsuarioRepositoryPlataforma implements UsuarioRepository {
  constructor(private readonly db: pg.Pool) {}

  async buscarPorUsername(username: string) {
    const { rows } = await this.db.query(`SELECT ${COLS} FROM usuario WHERE username = $1`, [username]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }
  async buscarPorId(id: string) {
    const { rows } = await this.db.query(`SELECT ${COLS} FROM usuario WHERE id_usuario = $1`, [Number(id)]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }
  async registrarFallo(id: string, intentos: number, bloqueadoHasta: Date | null) {
    await this.db.query(`UPDATE usuario SET intentos_fallidos = $2, bloqueado_hasta = $3 WHERE id_usuario = $1`, [
      Number(id), intentos, bloqueadoHasta,
    ]);
  }
  async actualizarDatos(id: string, c: { nombre?: string; passwordHash?: string }) {
    await this.db.query(
      `UPDATE usuario SET nombre = COALESCE($2, nombre), password_hash = COALESCE($3, password_hash) WHERE id_usuario = $1`,
      [Number(id), c.nombre ?? null, c.passwordHash ?? null],
    );
  }
  async registrarAcceso(id: string) {
    await this.db.query(
      `UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = now() WHERE id_usuario = $1`,
      [Number(id)],
    );
  }
}

export class InstitucionRepositoryPlataforma implements InstitucionRepository {
  constructor(private readonly db: pg.Pool) {}

  async listar(): Promise<Institucion[]> {
    const { rows } = await this.db.query(`SELECT id_institucion, clave, nombre, motor, modulos FROM institucion`);
    return rows.map((r) => ({ id: String(r.id_institucion), clave: r.clave, nombre: r.nombre, motor: r.motor, modulos: r.modulos }));
  }
}

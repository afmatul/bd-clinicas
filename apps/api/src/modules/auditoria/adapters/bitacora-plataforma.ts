import type pg from 'pg';
import type { EntradaBitacora } from '../domain/entrada-bitacora.js';
import type { Bitacora } from '../ports/bitacora.js';

/** La bitácora vive en la base plataforma (PostgreSQL), sin importar el motor de la institución. */
export class BitacoraPlataforma implements Bitacora {
  constructor(private readonly db: pg.Pool) {}

  async registrar(e: EntradaBitacora): Promise<void> {
    await this.db.query(
      `INSERT INTO bitacora (id_usuario, id_institucion, accion, entidad, id_registro, id_paciente, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [e.idUsuario, e.idInstitucion, e.accion, e.entidad ?? null, e.idRegistro ?? null, e.idPaciente ?? null, e.ip ?? null],
    );
  }
}

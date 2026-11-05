/** Base plataforma · PostgreSQL: usuarios de las cuatro instituciones y bitácora de ejemplo. */
import bcrypt from 'bcryptjs';
import type pg from 'pg';
import type { InstitucionClave } from '@red-clinica/shared';
import { azar, diaHabil, HOY } from './util.js';

export const PASSWORD = 'RedClinica2026!';

export interface UsuarioSemilla {
  username: string;
  nombre: string;
  institucion: InstitucionClave;
  rol: 'RECEPCION' | 'MEDICO' | 'ENFERMERIA' | 'TRABAJO_SOCIAL' | 'AUDITOR' | 'ADMIN';
  idPersonal: string | null;
  activo?: boolean;
}

/** Lo que cada institución sembró, para escribir una bitácora creíble. */
export interface ActividadInstitucion {
  clave: InstitucionClave;
  pacientes: string[];
  registros: { entidad: string; idRegistro: string; idPaciente: string; fecha: string; username: string }[];
}

export async function sembrarPlataforma(db: pg.Pool, usuarios: UsuarioSemilla[], actividad: ActividadInstitucion[]) {
  const { rows: insts } = await db.query(`SELECT id_institucion, clave FROM institucion`);
  const idInst = (clave: string) => insts.find((i) => i.clave === clave)!.id_institucion as number;
  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids: Record<string, number> = {};
  for (const u of usuarios) {
    const { rows } = await db.query(
      `INSERT INTO usuario (username, nombre, password_hash, id_institucion, rol, id_personal, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (username) DO UPDATE SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, id_institucion = EXCLUDED.id_institucion,
         rol = EXCLUDED.rol, id_personal = EXCLUDED.id_personal, activo = EXCLUDED.activo, intentos_fallidos = 0, bloqueado_hasta = NULL
       RETURNING id_usuario`,
      [u.username, u.nombre, hash, idInst(u.institucion), u.rol, u.idPersonal, u.activo ?? true],
    );
    ids[u.username] = rows[0].id_usuario;
  }

  // La bitácora es solo de inserción: si ya tiene filas, no se agregan más.
  const { rows: [{ n }] } = await db.query(`SELECT count(*)::int AS n FROM bitacora`);
  if (n > 0) return { usuarios: usuarios.length, bitacora: 0 };

  const rng = azar(77);
  const filas: unknown[][] = [];
  const momento = (fecha: string, hora: number, min: number) => `${fecha}T${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}:00-06:00`;
  const ip = () => `10.20.${rng.entre(1, 4)}.${rng.entre(10, 250)}`;

  for (const a of actividad) {
    const delInst = usuarios.filter((u) => u.institucion === a.clave && u.activo !== false);
    // Inicios y cierres de sesión de los últimos 10 días hábiles.
    for (let d = 10; d >= 0; d--) {
      const fecha = d === 0 ? HOY : diaHabil(-d);
      for (const u of delInst) {
        if (rng.prob(0.25)) continue;
        const h = rng.entre(6, 8);
        const dirIp = ip();
        filas.push([momento(fecha, h, rng.entre(0, 59)), ids[u.username], idInst(a.clave), 'LOGIN', null, null, null, dirIp]);
        if (d > 0) filas.push([momento(fecha, rng.entre(14, 17), rng.entre(0, 59)), ids[u.username], idInst(a.clave), 'LOGOUT', null, null, null, dirIp]);
      }
    }
    // Lo que se hizo con los pacientes: alta, consulta abierta (CREAR) y lecturas de ficha.
    for (const r of a.registros) {
      const u = usuarios.find((x) => x.username === r.username) ?? delInst[0]!;
      const h = rng.entre(7, 13);
      filas.push([momento(r.fecha, h, rng.entre(0, 29)), ids[u.username], idInst(a.clave), 'LEER', 'paciente', r.idPaciente, r.idPaciente, ip()]);
      filas.push([momento(r.fecha, h, rng.entre(30, 59)), ids[u.username], idInst(a.clave), 'CREAR', r.entidad, r.idRegistro, r.idPaciente, ip()]);
    }
    // Recepción busca y lee fichas.
    const recepcion = delInst.find((u) => u.rol === 'RECEPCION');
    if (recepcion) {
      for (const idP of a.pacientes.slice(0, 8)) {
        filas.push([momento(diaHabil(-rng.entre(0, 9)), rng.entre(7, 12), rng.entre(0, 59)), ids[recepcion.username], idInst(a.clave), 'LEER', 'paciente', idP, idP, ip()]);
      }
    }
  }
  // Un intento de exportación y una revisión del auditor, para que la pantalla de bitácora tenga variedad.
  const auditor = usuarios.find((u) => u.rol === 'AUDITOR');
  const hosp = actividad.find((a) => a.clave === 'hospital');
  if (auditor && hosp) {
    for (const idP of hosp.pacientes.slice(0, 3)) {
      filas.push([momento(diaHabil(-1), 10, rng.entre(0, 59)), ids[auditor.username], idInst('hospital'), 'EXPORTAR', 'expediente', idP, idP, ip()]);
    }
  }

  const ahora = Date.now();
  const validas = filas
    .filter((f) => new Date(f[0] as string).getTime() <= ahora)
    .sort((a, b) => (a[0] as string).localeCompare(b[0] as string));
  for (let i = 0; i < validas.length; i += 200) {
    const lote = validas.slice(i, i + 200);
    const valores = lote.map((_, j) => `(${Array.from({ length: 8 }, (_, k) => `$${j * 8 + k + 1}`).join(', ')})`).join(', ');
    await db.query(`INSERT INTO bitacora (momento, id_usuario, id_institucion, accion, entidad, id_registro, id_paciente, ip) VALUES ${valores}`, lote.flat());
  }
  return { usuarios: usuarios.length, bitacora: validas.length };
}

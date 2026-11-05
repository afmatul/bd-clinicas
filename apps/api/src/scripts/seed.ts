/**
 * Datos de demostración para las cinco bases. Idempotente: se puede correr varias veces.
 * Requiere `docker compose up -d` y un .env completo.
 *
 * Usuarios creados (contraseña de desarrollo: RedClinica2026!):
 *   aperez       Hospital general   MEDICO     (Dra. Ana Lucía Pérez)
 *   recepcion.hg Hospital general   RECEPCION
 *   pediatra     Centro pediátrico  MEDICO
 *   laboratorio  Laboratorio        MEDICO
 *   secretaria   Odontológica       RECEPCION
 */
import bcrypt from 'bcryptjs';
import nano from 'nano';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cargarEnv } from '../config/env.js';
import { abrirConexiones } from '../infrastructure/conexiones.js';
import { RegistroDeAdaptadores } from '../infrastructure/registro-adaptadores.js';
import { sembrarPediatria } from '../modules/pediatria/adapters/mysql/datos-demo.js';
import type { ContextoInstitucion } from '../shared/contexto.js';
import { INSTITUCIONES, type InstitucionClave, type RegistrarPacienteInput } from '@red-clinica/shared';

const PASSWORD = 'RedClinica2026!';
const infra = (ruta: string) => fileURLToPath(new URL(`../../../../infra/db/${ruta}`, import.meta.url));

const env = cargarEnv();

// 1. CouchDB primero: la API necesita la base para conectarse.
async function prepararCouch() {
  if (!env.COUCH_ADMIN_URL || !env.ODONTOLOGICA_DB_PASSWORD) {
    console.warn('COUCH_ADMIN_URL u ODONTOLOGICA_DB_PASSWORD sin definir: omito la preparación de CouchDB.');
    return;
  }
  const admin = nano(env.COUCH_ADMIN_URL);
  for (const db of ['_users', env.ODONTOLOGICA_COUCH_DB]) {
    try { await admin.db.create(db); } catch (e) { if ((e as { statusCode?: number }).statusCode !== 412) throw e; }
  }
  const users = admin.use<Record<string, unknown>>('_users');
  const userId = 'org.couchdb.user:app_odontologica';
  const previo = await users.get(userId).catch(() => null);
  await users.insert({
    _id: userId, ...(previo ? { _rev: previo._rev } : {}),
    name: 'app_odontologica', type: 'user', roles: [], password: env.ODONTOLOGICA_DB_PASSWORD,
  } as never);
  const db = admin.use<Record<string, unknown>>(env.ODONTOLOGICA_COUCH_DB);
  // Solo app_odontologica (y los administradores) pueden leer y escribir la base.
  await admin.request({ db: env.ODONTOLOGICA_COUCH_DB, path: '_security', method: 'PUT', body: {
    admins: { names: [], roles: [] }, members: { names: ['app_odontologica'], roles: [] },
  } });
  const design = JSON.parse(readFileSync(infra('odontologica/design-doc.json'), 'utf8'));
  const dPrevio = await db.get(design._id).catch(() => null);
  await db.insert({ ...design, ...(dPrevio ? { _rev: dPrevio._rev } : {}) });
  for (const idx of JSON.parse(readFileSync(infra('odontologica/indices.json'), 'utf8'))) await db.createIndex(idx);
  console.log('CouchDB listo: base, usuario, _security, design doc e índices.');
}
await prepararCouch();

const c = await abrirConexiones(env);
const registro = new RegistroDeAdaptadores(c);

// 2. Personal mínimo en las bases relacionales (para id_personal).
const medico = await c.postgres.query(
  `INSERT INTO medico (nombres, apellidos, numero_colegiado) VALUES ('Ana Lucía', 'Pérez', 'COL-10234')
   ON CONFLICT (numero_colegiado) DO UPDATE SET nombres = EXCLUDED.nombres RETURNING id_medico`,
);
await c.mysql.query(
  `INSERT INTO pediatra (nombres, apellidos, numero_colegiado) VALUES ('Jorge', 'Castillo', 'COL-20871')
   ON DUPLICATE KEY UPDATE nombres = VALUES(nombres)`,
);
const [[pediatra]] = (await c.mysql.query(`SELECT id_usuario FROM pediatra WHERE numero_colegiado = 'COL-20871'`)) as any;

// 3. Usuarios en la base plataforma.
const { rows: insts } = await c.plataforma.query(`SELECT id_institucion, clave FROM institucion`);
const idInst = (clave: InstitucionClave) => insts.find((i) => i.clave === clave)!.id_institucion;
const hash = await bcrypt.hash(PASSWORD, 10);
const usuarios: [string, string, InstitucionClave, string, string | null][] = [
  ['aperez', 'Dra. Ana Lucía Pérez', 'hospital', 'MEDICO', String(medico.rows[0].id_medico)],
  ['recepcion.hg', 'Recepción Hospital general', 'hospital', 'RECEPCION', null],
  ['pediatra', 'Dr. Jorge Castillo', 'pediatrico', 'MEDICO', String(pediatra.id_usuario)],
  ['laboratorio', 'Lic. Marta Sic', 'laboratorio', 'MEDICO', null],
  ['secretaria', 'Secretaría Clínica odontológica', 'odontologia', 'RECEPCION', null],
];
for (const [username, nombre, clave, rol, idPersonal] of usuarios) {
  await c.plataforma.query(
    `INSERT INTO usuario (username, nombre, password_hash, id_institucion, rol, id_personal) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, intentos_fallidos = 0, bloqueado_hasta = NULL`,
    [username, nombre, hash, idInst(clave), rol, idPersonal],
  );
}

// 4. Pacientes de ejemplo (los del prototipo) en los cuatro motores, por el mismo puerto.
const pacientes: RegistrarPacienteInput[] = [
  { cui: '2547881200101', nombres: 'María José', apellidos: 'López Ramírez', fechaNacimiento: '1992-03-14', sexo: 'F', tipoSangre: 'O+', telefonos: ['55124478'], emails: [] },
  { cui: '1987663010901', nombres: 'Carlos', apellidos: 'Ajú Tzul', fechaNacimiento: '1968-07-02', sexo: 'M', tipoSangre: 'B-', telefonos: ['44102290'], emails: [] },
  { cui: '2210774500101', nombres: 'Sofía', apellidos: 'Hernández Pérez', fechaNacimiento: '1985-01-22', sexo: 'F', tipoSangre: 'O-', telefonos: ['30215567'], emails: [] },
  { cui: '2899100230101', nombres: 'Luis', apellidos: 'Mazariegos', fechaNacimiento: '1999-05-10', sexo: 'M', tipoSangre: 'A+', telefonos: ['57891123'], emails: [] },
  { cui: '1755441200108', nombres: 'Rosa', apellidos: 'Gómez de León', fechaNacimiento: '1963-09-30', sexo: 'F', tipoSangre: 'AB+', telefonos: ['41227781'], emails: [] },
];
const responsable = { nombreCompleto: 'Ana Gómez', parentesco: 'Madre', telefonos: ['55001122'], esTutorLegal: true };

for (const clave of Object.keys(INSTITUCIONES) as InstitucionClave[]) {
  const info = INSTITUCIONES[clave];
  const ctx: ContextoInstitucion = {
    usuario: { id: '0', username: 'seed', rol: 'ADMIN', idPersonal: null },
    institucion: { id: String(idInst(clave)), clave, nombre: info.nombre, motor: info.motor, modulos: info.modulos },
  };
  const repo = registro.para(ctx).pacientes;
  let nuevos = 0;
  for (const p of pacientes) {
    if (await repo.existeCui(p.cui!)) continue;
    await repo.registrar(clave === 'pediatrico' ? { ...p, fechaNacimiento: '2021-04-18', responsable } : p);
    nuevos++;
  }
  console.log(`${info.nombre} (${info.motorNombre}): ${nuevos} pacientes nuevos.`);
}

// 5. Módulo pediatria: catálogo de vacunas, curvas de crecimiento y carnés de ejemplo.
await sembrarPediatria(c.mysql);

await c.cerrar();
console.log(`\nListo. Inicie sesión con cualquiera de: ${usuarios.map((u) => u[0]).join(', ')} · contraseña ${PASSWORD}`);

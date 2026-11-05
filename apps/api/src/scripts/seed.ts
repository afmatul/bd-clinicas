/**
 * Datos de demostración para las cinco bases (ver semilla/README.md). Se puede correr varias veces:
 * los catálogos y usuarios se actualizan y el contenido clínico solo se carga si la base está vacía.
 *
 *   npm run db:seed     carga sobre las bases actuales
 *   npm run db:reset    borra los volúmenes, levanta Docker de nuevo y carga desde cero
 *
 * Las fechas son relativas al día en que se corre (SEED_HOY=yyyy-mm-dd fija otro "hoy").
 * Contraseña de todos los usuarios de desarrollo: RedClinica2026!
 */
import nano from 'nano';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cargarEnv } from '../config/env.js';
import { abrirConexiones, type Conexiones } from '../infrastructure/conexiones.js';
import { sembrarHospital } from './semilla/hospital.js';
import { sembrarLaboratorio } from './semilla/laboratorio.js';
import { sembrarOdontologica } from './semilla/odontologica.js';
import { sembrarPediatrico } from './semilla/pediatrico.js';
import { PASSWORD, sembrarPlataforma, type ActividadInstitucion, type UsuarioSemilla } from './semilla/plataforma.js';
import { HOY } from './semilla/util.js';

const infra = (ruta: string) => fileURLToPath(new URL(`../../../../infra/db/${ruta}`, import.meta.url));
const env = cargarEnv();
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Los contenedores tardan en aceptar conexiones la primera vez (MySQL y Mongo corren sus scripts de inicio). */
async function reintentar<T>(que: string, fn: () => Promise<T>, segundos = 120): Promise<T> {
  const limite = Date.now() + segundos * 1000;
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (Date.now() > limite) throw err;
      if (i === 0) console.log(`Esperando a ${que}…`);
      await esperar(2000);
    }
  }
}

// 1. CouchDB primero: la API necesita la base, el usuario y el design doc.
async function prepararCouch() {
  if (!env.COUCH_ADMIN_URL || !env.ODONTOLOGICA_DB_PASSWORD) {
    console.warn('COUCH_ADMIN_URL u ODONTOLOGICA_DB_PASSWORD sin definir: omito la preparación de CouchDB.');
    return;
  }
  const admin = nano(env.COUCH_ADMIN_URL);
  await reintentar('CouchDB', () => admin.info());
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
const c: Conexiones = await reintentar('PostgreSQL, MySQL y MongoDB', async () => {
  const cx = await abrirConexiones(env);
  try {
    await Promise.all([cx.plataforma.query('SELECT 1 FROM institucion LIMIT 1'), cx.postgres.query('SELECT 1 FROM medico LIMIT 1'),
      cx.mysql.query('SELECT 1 FROM pediatra LIMIT 1'), cx.mongo.command({ ping: 1 }), cx.couch.info()]);
    return cx;
  } catch (err) {
    await cx.cerrar();
    throw err;
  }
});

console.log(`Sembrando con hoy = ${HOY}\n`);
const linea = (inst: string, motor: string, omitido: boolean, detalle: string) =>
  console.log(`${inst.padEnd(26)} ${motor.padEnd(11)} ${omitido ? 'ya tenía datos clínicos; solo se actualizaron catálogos' : detalle}`);

const hosp = await sembrarHospital(c.postgres);
linea('Hospital general', 'PostgreSQL', hosp.omitido, `${Object.keys(hosp.medicos).length} médicos, ${Object.keys(hosp.pacientes).length} pacientes, ${hosp.consultas.length} consultas`);
const ped = await sembrarPediatrico(c.mysql);
linea('Centro médico pediátrico', 'MySQL', ped.omitido, `${Object.keys(ped.pediatras).length} pediatras, ${Object.keys(ped.pacientes).length} pacientes, ${ped.consultas.length} consultas`);
const lab = await sembrarLaboratorio(c.mongo);
linea('Laboratorio clínico', 'MongoDB', lab.omitido, `${Object.keys(lab.personal).length} profesionales, ${Object.keys(lab.pacientes).length} pacientes, ${lab.examenes.length} exámenes`);
const odo = await sembrarOdontologica(c.couch);
linea('Clínica odontológica', 'CouchDB', odo.omitido, `${Object.keys(odo.personal).length} personas, ${Object.keys(odo.pacientes).length} pacientes, ${odo.consultas.length} consultas`);

const usuarios: UsuarioSemilla[] = [
  { username: 'aperez', nombre: 'Dra. Ana Lucía Pérez', institucion: 'hospital', rol: 'MEDICO', idPersonal: hosp.medicos.aperez! },
  { username: 'cmendez', nombre: 'Dr. Carlos Méndez', institucion: 'hospital', rol: 'MEDICO', idPersonal: hosp.medicos.cmendez! },
  { username: 'snatareno', nombre: 'Dra. Silvia Natareno', institucion: 'hospital', rol: 'MEDICO', idPersonal: hosp.medicos.snatareno! },
  { username: 'restrada', nombre: 'Dr. Rodrigo Estrada', institucion: 'hospital', rol: 'MEDICO', idPersonal: hosp.medicos.restrada! },
  { username: 'recepcion.hg', nombre: 'Recepción Hospital general', institucion: 'hospital', rol: 'RECEPCION', idPersonal: null },
  { username: 'enfermeria.hg', nombre: 'Enf. Rosa María Tuch', institucion: 'hospital', rol: 'ENFERMERIA', idPersonal: null },
  { username: 'tsocial.hg', nombre: 'Lic. Karen Valdez (Trabajo social)', institucion: 'hospital', rol: 'TRABAJO_SOCIAL', idPersonal: null },
  { username: 'auditor.hg', nombre: 'Lic. Mario Ralda (Auditoría)', institucion: 'hospital', rol: 'AUDITOR', idPersonal: null },
  { username: 'admin', nombre: 'Administración Red Clínica', institucion: 'hospital', rol: 'ADMIN', idPersonal: null },
  { username: 'lcontreras', nombre: 'Dr. Luis Contreras (retirado)', institucion: 'hospital', rol: 'MEDICO', idPersonal: null, activo: false },
  { username: 'pediatra', nombre: 'Dr. Jorge Castillo', institucion: 'pediatrico', rol: 'MEDICO', idPersonal: ped.pediatras.jcastillo! },
  { username: 'lmendoza', nombre: 'Dra. Lucía Mendoza', institucion: 'pediatrico', rol: 'MEDICO', idPersonal: ped.pediatras.lmendoza! },
  { username: 'recepcion.ped', nombre: 'Recepción Centro pediátrico', institucion: 'pediatrico', rol: 'RECEPCION', idPersonal: null },
  { username: 'enfermeria.ped', nombre: 'Enf. Gladys Coroy', institucion: 'pediatrico', rol: 'ENFERMERIA', idPersonal: null },
  { username: 'laboratorio', nombre: 'Lic. Marta Sic', institucion: 'laboratorio', rol: 'MEDICO', idPersonal: lab.personal.msic! },
  { username: 'rgodoy', nombre: 'Dr. Raúl Godoy', institucion: 'laboratorio', rol: 'MEDICO', idPersonal: lab.personal.rgodoy! },
  { username: 'recepcion.lab', nombre: 'Recepción Laboratorio clínico', institucion: 'laboratorio', rol: 'RECEPCION', idPersonal: null },
  { username: 'secretaria', nombre: 'Silvia Pac (Secretaría)', institucion: 'odontologia', rol: 'RECEPCION', idPersonal: odo.personal.spac! },
  { username: 'fcastillo', nombre: 'Dr. Fernando Castillo', institucion: 'odontologia', rol: 'MEDICO', idPersonal: odo.personal.fcastillo! },
  { username: 'crosales', nombre: 'Dra. Carmen Rosales', institucion: 'odontologia', rol: 'MEDICO', idPersonal: odo.personal.crosales! },
];

const porMedico: Record<string, string> = {
  aperez: 'aperez', cmendez: 'cmendez', snatareno: 'snatareno', restrada: 'restrada', jcastillo: 'pediatra', lmendoza: 'lmendoza',
  fcastillo: 'fcastillo', crosales: 'crosales', mvela: 'fcastillo', jochoa: 'aperez', mbarillas: 'aperez', abatres: 'pediatra',
};
const consultas = (clave: ActividadInstitucion['clave'], xs: { idPaciente: string; idConsulta: string; medico: string; fecha: string }[]) =>
  xs.filter((x) => x.fecha <= HOY).slice(-60).map((x) => ({ entidad: 'consulta', idRegistro: x.idConsulta, idPaciente: x.idPaciente, fecha: x.fecha, username: porMedico[x.medico] ?? '' }));
const actividad: ActividadInstitucion[] = [
  { clave: 'hospital', pacientes: Object.values(hosp.pacientes), registros: consultas('hospital', hosp.consultas) },
  { clave: 'pediatrico', pacientes: Object.values(ped.pacientes), registros: consultas('pediatrico', ped.consultas) },
  { clave: 'laboratorio', pacientes: Object.values(lab.pacientes), registros: lab.examenes.filter((x) => x.fecha <= HOY).map((x) => ({ entidad: 'examen', idRegistro: x.idExamen, idPaciente: x.idPaciente, fecha: x.fecha, username: 'laboratorio' })) },
  { clave: 'odontologia', pacientes: Object.values(odo.pacientes), registros: consultas('odontologia', odo.consultas) },
];
const plat = await sembrarPlataforma(c.plataforma, usuarios, actividad);
linea('Plataforma', 'PostgreSQL', false, `${plat.usuarios} usuarios, ${plat.bitacora} filas nuevas de bitácora`);

await c.cerrar();
console.log(`\nListo. Usuarios (contraseña ${PASSWORD}):`);
for (const inst of ['hospital', 'pediatrico', 'laboratorio', 'odontologia'] as const) {
  console.log(`  ${inst.padEnd(12)} ${usuarios.filter((u) => u.institucion === inst && u.activo !== false).map((u) => u.username).join(', ')}`);
}

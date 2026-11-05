// Laboratorio clínico · MongoDB
// Se ejecuta una sola vez al crear el volumen. Crea colecciones con $jsonSchema, índices y el usuario de la app.
/* global db, process */
const lab = db.getSiblingDB('laboratorio');

const str = { bsonType: 'string' };
const strOrNull = { bsonType: ['string', 'null'] };
const date = { bsonType: 'date' };

lab.createCollection('pacientes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['nombres', 'apellidos', 'fecha_nacimiento', 'estado'],
      properties: {
        cui: strOrNull,
        nombres: str,
        apellidos: str,
        fecha_nacimiento: date,
        sexo: strOrNull,
        tipo_sangre: strOrNull,
        direccion: strOrNull,
        procedencia: strOrNull,
        estado: { enum: ['ACTIVO', 'BAJA'] },
        baja: { bsonType: ['object', 'null'], required: ['fecha', 'motivo'], properties: { fecha: date, motivo: str } },
        telefonos: { bsonType: 'array', items: str },
        emails: { bsonType: 'array', items: str },
        contactos_emergencia: { bsonType: 'array' },
        alergias: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['_id', 'tipo'],
            properties: { tipo: str, severidad: { enum: ['LEVE', 'MODERADA', 'SEVERA', null] } },
          },
        },
        antecedentes: { bsonType: 'array' },
      },
    },
  },
  validationLevel: 'strict',
});

lab.createCollection('consultas');
lab.createCollection('tipos_examen');
lab.createCollection('citas');
lab.createCollection('personal');
lab.createCollection('medicamentos');

// El campo resultados cambia según el tipo de examen; oneOf valida cada forma.
lab.createCollection('examenes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['paciente_id', 'tipo', 'estado', 'fecha_orden'],
      properties: {
        tipo: { enum: ['hematologia', 'orina', 'urocultivo', 'quimica'] },
        estado: { enum: ['PENDIENTE', 'EN_PROCESO', 'VALIDADO'] },
        fecha_orden: date,
        resultados: {
          oneOf: [
            { bsonType: 'null' },
            {
              bsonType: 'object',
              description: 'hematologia',
              required: ['hemoglobina', 'leucocitos', 'plaquetas'],
              properties: { hemoglobina: { bsonType: 'double' }, leucocitos: { bsonType: 'double' }, plaquetas: { bsonType: 'double' } },
            },
            {
              bsonType: 'object',
              description: 'urocultivo',
              required: ['organismo', 'recuento_ufc'],
              properties: { organismo: str, recuento_ufc: { bsonType: ['int', 'long', 'double'] }, antibiograma: { bsonType: 'array' } },
            },
            {
              bsonType: 'object',
              description: 'orina / química: valores con unidad y rango',
              required: ['valores'],
              properties: { valores: { bsonType: 'array' } },
            },
          ],
        },
      },
    },
  },
});

lab.pacientes.createIndex({ cui: 1 }, { unique: true, partialFilterExpression: { cui: { $type: 'string' } } });
lab.pacientes.createIndex({ apellidos: 1 });
lab.consultas.createIndex({ paciente_id: 1, fecha: -1 });
lab.examenes.createIndex({ paciente_id: 1, fecha_orden: -1 });
lab.examenes.createIndex({ estado: 1 });
// Evita el doble agendamiento solo para citas activas.
lab.citas.createIndex(
  { medico_id: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { estado: { $in: ['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA'] } } },
);

lab.createUser({
  user: 'app_laboratorio',
  pwd: process.env.LABORATORIO_DB_PASSWORD,
  roles: [{ role: 'readWrite', db: 'laboratorio' }],
});

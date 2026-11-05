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

// El campo resultados cambia según el tipo de examen; oneOf valida cada forma
// (ver apps/api/src/modules/laboratorio/domain/examen.ts). Cada forma tiene campos obligatorios
// que las otras no tienen, así que un documento coincide con una sola.
const num = { bsonType: 'double' };
const firma = {
  bsonType: ['object', 'null'],
  required: ['usuario_id', 'nombre', 'fecha'],
  properties: { usuario_id: str, nombre: str, fecha: date },
};
lab.createCollection('examenes', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['codigo', 'paciente_id', 'tipo', 'nombre', 'estado', 'critico', 'fecha_orden', 'fecha_actualizacion'],
      properties: {
        codigo: str,
        paciente_id: { bsonType: 'objectId' },
        tipo: { enum: ['hematologia', 'orina', 'urocultivo', 'quimica'] },
        nombre: str,
        estado: { enum: ['PENDIENTE', 'EN_PROCESO', 'VALIDADO'] },
        critico: { bsonType: 'bool' },
        fecha_orden: date,
        fecha_actualizacion: date,
        medico_solicitante: strOrNull,
        capturado_por: firma,
        validado_por: firma,
        observaciones: strOrNull,
        resultados: {
          oneOf: [
            { bsonType: 'null' },
            {
              bsonType: 'object',
              description: 'hematologia: valores numéricos planos',
              required: ['hemoglobina', 'leucocitos', 'plaquetas'],
              properties: {
                hemoglobina: num, hematocrito: num, leucocitos: num, plaquetas: num, neutrofilos: num, linfocitos: num,
              },
            },
            {
              bsonType: 'object',
              description: 'orina: subdocumentos físico, químico y sedimento con valores mixtos',
              required: ['fisico', 'quimico', 'sedimento'],
              properties: {
                fisico: {
                  bsonType: 'object', required: ['color', 'aspecto'],
                  properties: { color: str, aspecto: str, densidad: num },
                },
                quimico: {
                  bsonType: 'object', required: ['ph'],
                  properties: { ph: num, proteinas: str, glucosa: str, nitritos: str, sangre: str },
                },
                sedimento: {
                  bsonType: 'object',
                  properties: { leucocitos: num, eritrocitos: num, bacterias: str, cilindros: str },
                },
              },
            },
            {
              bsonType: 'object',
              description: 'urocultivo: organismo, recuento y antibiograma embebido',
              required: ['crecimiento', 'organismo', 'recuento_ufc', 'antibiograma'],
              properties: {
                crecimiento: { bsonType: 'bool' },
                organismo: str,
                recuento_ufc: num,
                antibiograma: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    required: ['antibiotico', 'interpretacion'],
                    properties: { antibiotico: str, interpretacion: { enum: ['S', 'I', 'R'] } },
                  },
                },
              },
            },
            {
              bsonType: 'object',
              description: 'quimica: panel variable de analitos',
              required: ['valores'],
              properties: {
                valores: {
                  bsonType: 'array',
                  minItems: 1,
                  items: {
                    bsonType: 'object',
                    required: ['analito', 'valor'],
                    properties: { analito: str, valor: num, unidad: strOrNull },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
  validationLevel: 'strict',
});

lab.pacientes.createIndex({ cui: 1 }, { unique: true, partialFilterExpression: { cui: { $type: 'string' } } });
lab.pacientes.createIndex({ apellidos: 1 });
lab.consultas.createIndex({ paciente_id: 1, fecha: -1 });
lab.examenes.createIndex({ codigo: 1 }, { unique: true });
lab.examenes.createIndex({ paciente_id: 1, fecha_orden: -1 });
lab.examenes.createIndex({ fecha_actualizacion: -1 });
lab.examenes.createIndex({ tipo: 1, fecha_actualizacion: -1 });
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

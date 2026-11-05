import { Double, ObjectId, type Collection, type Db, type Document, type Filter } from 'mongodb';
import type { CampoExamen, ListarExamenesQuery, TipoExamen, TipoExamenClave } from '@red-clinica/shared';
import { codigoExamen, type Resultados } from '../../domain/examen.js';
import type { ExamenDatos, ExamenRepository, Firma, NuevaOrden } from '../../ports/examen-repository.js';

interface FirmaDoc { usuario_id: string; nombre: string; fecha: Date }

/** Colección `examenes`: un documento por examen; `resultados` cambia de forma según `tipo`. */
export interface ExamenDoc {
  _id: ObjectId;
  codigo: string;
  paciente_id: ObjectId;
  tipo: TipoExamenClave;
  nombre: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'VALIDADO';
  critico: boolean;
  fecha_orden: Date;
  fecha_actualizacion: Date;
  medico_solicitante: string | null;
  capturado_por: FirmaDoc | null;
  validado_por: FirmaDoc | null;
  observaciones: string | null;
  resultados: Document | null;
}

/** Colección `tipos_examen`: el catálogo, con _id = clave del tipo. */
export interface TipoExamenDoc {
  _id: TipoExamenClave;
  nombre: string;
  corto: string;
  muestra: string;
  campos: {
    clave: string; nombre: string; seccion: string | null; tipo: CampoExamen['tipo']; unidad: string | null; decimales: number | null;
    ref_min: number | null; ref_max: number | null; critico_min: number | null; critico_max: number | null;
    normal: string | null; opciones: string[] | null; obligatorio: boolean;
  }[];
}

/**
 * El $jsonSchema pide bsonType double en los valores numéricos; el driver guardaría 245 como int32,
 * así que todo número se envuelve en Double antes de escribir.
 */
function conDoubles(v: unknown): unknown {
  if (typeof v === 'number') return new Double(v);
  if (Array.isArray(v)) return v.map(conDoubles);
  if (v && typeof v === 'object' && v.constructor === Object) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, conDoubles(x)]));
  }
  return v;
}

const aFirma = (f: FirmaDoc | null): Firma | null => (f ? { idUsuario: f.usuario_id, nombre: f.nombre, fecha: f.fecha.toISOString() } : null);
const aFirmaDoc = (f: Firma): FirmaDoc => ({ usuario_id: f.idUsuario, nombre: f.nombre, fecha: new Date(f.fecha) });

export const aTipoExamenDoc = (t: TipoExamen): TipoExamenDoc => ({
  _id: t.clave, nombre: t.nombre, corto: t.corto, muestra: t.muestra,
  campos: t.campos.map((c) => ({
    clave: c.clave, nombre: c.nombre, seccion: c.seccion, tipo: c.tipo, unidad: c.unidad, decimales: c.decimales,
    ref_min: c.refMin, ref_max: c.refMax, critico_min: c.criticoMin, critico_max: c.criticoMax,
    normal: c.normal, opciones: c.opciones, obligatorio: c.obligatorio,
  })),
});

const aTipoExamen = (d: TipoExamenDoc): TipoExamen => ({
  clave: d._id, nombre: d.nombre, corto: d.corto, muestra: d.muestra,
  campos: d.campos.map((c) => ({
    clave: c.clave, nombre: c.nombre, seccion: c.seccion, tipo: c.tipo, unidad: c.unidad, decimales: c.decimales ?? null,
    refMin: c.ref_min, refMax: c.ref_max, criticoMin: c.critico_min, criticoMax: c.critico_max,
    normal: c.normal, opciones: c.opciones, obligatorio: c.obligatorio,
  })),
});

type ExamenConPaciente = ExamenDoc & { paciente: { _id: ObjectId; nombres: string; apellidos: string; cui: string | null } | null };

/** Une cada examen con su paciente en el servidor ($lookup), sin traer alergias ni antecedentes. */
const CON_PACIENTE: Document[] = [
  {
    $lookup: {
      from: 'pacientes',
      localField: 'paciente_id',
      foreignField: '_id',
      pipeline: [{ $project: { nombres: 1, apellidos: 1, cui: 1 } }],
      as: 'paciente',
    },
  },
  { $set: { paciente: { $first: '$paciente' } } },
];

function aDatos(d: ExamenConPaciente): ExamenDatos {
  return {
    id: d._id.toHexString(),
    codigo: d.codigo,
    tipo: d.tipo,
    nombre: d.nombre,
    estado: d.estado,
    critico: d.critico,
    fechaOrden: d.fecha_orden.toISOString(),
    fechaActualizacion: d.fecha_actualizacion.toISOString(),
    paciente: d.paciente
      ? { id: d.paciente._id.toHexString(), nombres: d.paciente.nombres, apellidos: d.paciente.apellidos, cui: d.paciente.cui }
      : { id: d.paciente_id.toHexString(), nombres: 'Paciente', apellidos: 'no encontrado', cui: null },
    medicoSolicitante: d.medico_solicitante,
    capturadoPor: aFirma(d.capturado_por),
    validadoPor: aFirma(d.validado_por),
    observaciones: d.observaciones,
    resultados: d.resultados as Resultados | null,
  };
}

/** Laboratorio clínico · MongoDB. */
export class MongoExamenRepository implements ExamenRepository {
  private readonly examenes: Collection<ExamenDoc>;
  private readonly tiposCol: Collection<TipoExamenDoc>;
  private readonly contadores: Collection<{ _id: string; seq: number }>;

  constructor(db: Db) {
    this.examenes = db.collection<ExamenDoc>('examenes');
    this.tiposCol = db.collection<TipoExamenDoc>('tipos_examen');
    this.contadores = db.collection<{ _id: string; seq: number }>('contadores');
  }

  async tipos(): Promise<TipoExamen[]> {
    const orden = ['hematologia', 'orina', 'urocultivo', 'quimica'];
    const docs = await this.tiposCol.find().toArray();
    return docs.map(aTipoExamen).sort((a, b) => orden.indexOf(a.clave) - orden.indexOf(b.clave));
  }

  async listar(q: ListarExamenesQuery) {
    const filtro: Filter<ExamenDoc> = {};
    if (q.tipo) filtro.tipo = q.tipo;
    if (q.estado) filtro.estado = q.estado;
    if (q.idPaciente) {
      if (!ObjectId.isValid(q.idPaciente)) return { items: [], total: 0, ultimas48h: 0, criticos: 0 };
      filtro.paciente_id = new ObjectId(q.idPaciente);
    }
    const hace48h = new Date(Date.now() - 48 * 3600 * 1000);
    const [items, total, ultimas48h, criticos] = await Promise.all([
      this.examenes
        .aggregate<ExamenConPaciente>([
          { $match: filtro },
          { $sort: { fecha_actualizacion: -1 } },
          { $limit: q.limite },
          { $project: { resultados: 0 } },
          ...CON_PACIENTE,
        ])
        .toArray(),
      this.examenes.countDocuments(filtro),
      this.examenes.countDocuments({ fecha_actualizacion: { $gte: hace48h } }),
      // Valores críticos de las últimas 48 h (la insignia del menú y la alerta de Inicio).
      this.examenes.countDocuments({ critico: true, fecha_actualizacion: { $gte: hace48h } }),
    ]);
    return { items: items.map((d) => aDatos({ ...d, resultados: null })), total, ultimas48h, criticos };
  }

  async obtener(id: string): Promise<ExamenDatos | null> {
    if (!ObjectId.isValid(id)) return null;
    const [d] = await this.examenes.aggregate<ExamenConPaciente>([{ $match: { _id: new ObjectId(id) } }, ...CON_PACIENTE]).toArray();
    return d ? aDatos(d) : null;
  }

  /** El consecutivo mensual sale de un contador atómico ($inc con upsert). */
  async ordenar(o: NuevaOrden) {
    const mes = `examen-${o.fecha.getFullYear()}-${String(o.fecha.getMonth() + 1).padStart(2, '0')}`;
    const c = await this.contadores.findOneAndUpdate({ _id: mes }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
    const codigo = codigoExamen(o.fecha, c!.seq);
    const _id = new ObjectId();
    await this.examenes.insertOne({
      _id,
      codigo,
      paciente_id: new ObjectId(o.idPaciente),
      tipo: o.tipo,
      nombre: o.nombre,
      estado: 'PENDIENTE',
      critico: false,
      fecha_orden: o.fecha,
      fecha_actualizacion: o.fecha,
      medico_solicitante: o.medicoSolicitante,
      capturado_por: null,
      validado_por: null,
      observaciones: null,
      resultados: null,
    });
    return { id: _id.toHexString(), codigo };
  }

  /** Un solo updateOne condicionado al estado: no hay carrera entre capturar y validar. */
  async guardarResultados(id: string, r: { resultados: Resultados; critico: boolean; observaciones: string | null; por: Firma }) {
    const res = await this.examenes.updateOne(
      { _id: new ObjectId(id), estado: { $ne: 'VALIDADO' } },
      {
        $set: {
          resultados: conDoubles(r.resultados) as Document,
          critico: r.critico,
          observaciones: r.observaciones,
          estado: 'EN_PROCESO',
          capturado_por: aFirmaDoc(r.por),
          fecha_actualizacion: new Date(r.por.fecha),
        },
      },
    );
    return res.matchedCount === 1;
  }

  async validar(id: string, por: Firma) {
    const res = await this.examenes.updateOne(
      { _id: new ObjectId(id), estado: 'EN_PROCESO', resultados: { $ne: null } },
      { $set: { estado: 'VALIDADO', validado_por: aFirmaDoc(por), fecha_actualizacion: new Date(por.fecha) } },
    );
    return res.matchedCount === 1;
  }
}

/**
 * Deja la base lista para el módulo: catálogo (upsert por clave) e índices.
 * Lo usa el seed con el usuario de la aplicación (readWrite basta para ambos).
 */
export async function prepararLaboratorio(db: Db, catalogo: TipoExamen[]) {
  const tipos = db.collection<TipoExamenDoc>('tipos_examen');
  for (const t of catalogo) {
    const { _id, ...resto } = aTipoExamenDoc(t);
    await tipos.updateOne({ _id }, { $set: resto }, { upsert: true });
  }
  const examenes = db.collection<ExamenDoc>('examenes');
  await examenes.createIndex({ codigo: 1 }, { unique: true });
  await examenes.createIndex({ fecha_actualizacion: -1 });
  await examenes.createIndex({ tipo: 1, fecha_actualizacion: -1 });
  await examenes.createIndex({ paciente_id: 1, fecha_orden: -1 });
}

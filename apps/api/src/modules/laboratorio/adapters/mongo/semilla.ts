import type { Db } from 'mongodb';
import type { CapturarResultadosInput, TipoExamenClave } from '@red-clinica/shared';
import { CATALOGO } from '../../domain/catalogo.js';
import { construirResultados } from '../../domain/examen.js';
import { MongoExamenRepository, prepararLaboratorio } from './examen-repository.js';

const QB = { idUsuario: 'seed', nombre: 'Q.B. Lucía Ramírez' };

interface Ejemplo {
  cui: string;
  tipo: TipoExamenClave;
  solicitante: string;
  /** Minutos atrás: orden, captura y validación. */
  hace: [number, number | null, number | null];
  captura?: CapturarResultadosInput;
}

const v = (valores: Record<string, string>, antibiograma: CapturarResultadosInput['antibiograma'] = []): CapturarResultadosInput =>
  ({ valores, antibiograma });

/** Los exámenes del prototipo (pantalla Resultados), uno por estado y por tipo. */
const EJEMPLOS: Ejemplo[] = [
  {
    cui: '2210774500101', tipo: 'quimica', solicitante: 'Dra. Ana Lucía Pérez', hace: [100, 40, 12],
    captura: v({ glucosa: '112', creatinina: '1.1', sodio: '138', potasio: '6.4' }),
  },
  {
    cui: '1987663010901', tipo: 'hematologia', solicitante: 'Dra. Ana Lucía Pérez', hace: [24 * 60 + 9 * 60, 24 * 60 + 2 * 60, 24 * 60 + 60],
    captura: v({ hemoglobina: '13.8', hematocrito: '41.2', leucocitos: '11.8', plaquetas: '245', neutrofilos: '72', linfocitos: '21' }),
  },
  {
    cui: '2547881200101', tipo: 'orina', solicitante: 'Dr. Jorge Castillo', hace: [30 * 60, 28 * 60, null],
    captura: v({
      color: 'Amarillo', aspecto: 'Ligeramente turbio', densidad: '1.020', ph: '6.0', proteinas: 'Trazas', glucosa: 'Negativo',
      nitritos: 'Positivo', sangre: 'Negativo', leucocitos: '12', eritrocitos: '2', bacterias: 'Moderadas', cilindros: 'No se observan',
    }),
  },
  { cui: '1755441200108', tipo: 'urocultivo', solicitante: 'Dra. Ana Lucía Pérez', hace: [50 * 60, null, null] },
  {
    cui: '2899100230101', tipo: 'urocultivo', solicitante: 'Dr. Jorge Castillo', hace: [5 * 24 * 60, 3 * 24 * 60, 3 * 24 * 60 - 30],
    captura: v({ organismo: 'Escherichia coli', recuento_ufc: '150,000' }, [
      { antibiotico: 'Nitrofurantoína', interpretacion: 'S' },
      { antibiotico: 'Ceftriaxona', interpretacion: 'S' },
      { antibiotico: 'Trimetoprim-sulfametoxazol', interpretacion: 'I' },
      { antibiotico: 'Ciprofloxacino', interpretacion: 'R' },
    ]),
  },
];

/** Catálogo e índices siempre; exámenes de ejemplo solo si la colección está vacía (idempotente). */
export async function sembrarLaboratorio(db: Db): Promise<string> {
  await prepararLaboratorio(db, CATALOGO);
  if ((await db.collection('examenes').countDocuments({}, { limit: 1 })) > 0) {
    return 'Laboratorio clínico (MongoDB): catálogo actualizado; ya había exámenes.';
  }
  const repo = new MongoExamenRepository(db);
  const pacientes = db.collection<{ cui: string | null }>('pacientes');
  const ahora = Date.now();
  const fecha = (min: number) => new Date(ahora - min * 60_000);
  let n = 0;
  for (const e of EJEMPLOS) {
    const p = await pacientes.findOne({ cui: e.cui });
    if (!p) continue;
    const tipo = CATALOGO.find((t) => t.clave === e.tipo)!;
    const { id } = await repo.ordenar({ idPaciente: p._id.toHexString(), tipo: tipo.clave, nombre: tipo.nombre, medicoSolicitante: e.solicitante, fecha: fecha(e.hace[0]) });
    if (e.captura && e.hace[1] !== null) {
      const { resultados, critico } = construirResultados(tipo, e.captura);
      await repo.guardarResultados(id, { resultados, critico, observaciones: null, por: { ...QB, fecha: fecha(e.hace[1]).toISOString() } });
    }
    if (e.hace[2] !== null) await repo.validar(id, { ...QB, fecha: fecha(e.hace[2]).toISOString() });
    n++;
  }
  return `Laboratorio clínico (MongoDB): catálogo de ${CATALOGO.length} tipos y ${n} exámenes de ejemplo.`;
}

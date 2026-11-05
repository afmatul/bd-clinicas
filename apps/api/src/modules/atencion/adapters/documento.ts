import type { ConsultaDetalle } from '@red-clinica/shared';
import type { CierreDeConsulta } from '../ports/consulta-repository.js';

/**
 * Forma documental de una consulta, compartida por MongoDB y CouchDB: diagnósticos, tratamientos
 * y receta van embebidos, así que el cierre es la escritura de un solo documento.
 * Los ids internos son texto (ObjectId hex en Mongo, uuid en Couch).
 */
export interface RenglonDoc {
  medicamento_id: string; nombre: string; presentacion: string | null; concentracion: string | null;
  dosis: string; via_administracion: string | null; frecuencia_horas: number | null; duracion_dias: number | null;
  cantidad: number | null; indicaciones: string | null;
}
export interface DiagnosticoDoc {
  id: string; tipo: string; enfermedad_detectada: string; observaciones: string | null;
  tratamientos: {
    id: string; tipo: string; descripcion: string; indicaciones: string | null; fecha_inicio: string | null; fecha_fin: string | null;
    receta: { id: string; fecha_emision: string; medico_id: string; observaciones: string | null; renglones: RenglonDoc[] } | null;
  }[];
}
export interface CamposConsulta {
  medico_id: string;
  fecha: string;
  hora: string;
  motivo_consulta: string | null;
  historia_enfermedad_actual: string | null;
  notas_evolucion: string | null;
  observaciones: string | null;
  peso_kg: number | null;
  talla_cm: number | null;
  signos_vitales: Record<string, number | null> | null;
  diagnosticos: DiagnosticoDoc[];
  cerrada: boolean;
  cerrada_en: string | null;
}


/** Campos que escribe el cierre, con ids nuevos generados por `nuevoId`. */
export function camposDeCierre(x: CierreDeConsulta, nuevoId: () => string): Partial<CamposConsulta> {
  const s = x.signos;
  return {
    motivo_consulta: x.motivo,
    historia_enfermedad_actual: x.historiaEnfermedadActual ?? null,
    notas_evolucion: x.notasEvolucion ?? null,
    observaciones: x.observaciones ?? null,
    peso_kg: x.pesoKg ?? null,
    talla_cm: x.tallaCm ?? null,
    signos_vitales: Object.values(s).some((v) => v !== undefined) ? {
      presion_sistolica: s.presionSistolica ?? null, presion_diastolica: s.presionDiastolica ?? null,
      frecuencia_cardiaca: s.frecuenciaCardiaca ?? null, frecuencia_respiratoria: s.frecuenciaRespiratoria ?? null,
      saturacion_oxigeno: s.saturacionOxigeno ?? null, temperatura_c: s.temperaturaC ?? null,
    } : null,
    diagnosticos: x.diagnosticos.map((d) => ({
      id: nuevoId(), tipo: d.tipo, enfermedad_detectada: d.enfermedadDetectada, observaciones: d.observaciones ?? null,
      tratamientos: d.tratamientos.map((t) => ({
        id: nuevoId(), tipo: t.tipo, descripcion: t.descripcion, indicaciones: t.indicaciones ?? null,
        fecha_inicio: t.fechaInicio ?? null, fecha_fin: t.fechaFin ?? null,
        receta: t.receta ? {
          id: nuevoId(), fecha_emision: x.fechaEmision, medico_id: x.idMedico, observaciones: t.receta.observaciones ?? null,
          renglones: t.receta.renglones.map((r) => {
            const m = x.medicamentos.get(r.idMedicamento)!;
            return {
              medicamento_id: r.idMedicamento, nombre: m.nombre, presentacion: m.presentacion, concentracion: m.concentracion,
              dosis: r.dosis, via_administracion: r.viaAdministracion ?? null, frecuencia_horas: r.frecuenciaHoras ?? null,
              duracion_dias: r.duracionDias ?? null, cantidad: r.cantidad ?? null, indicaciones: r.indicaciones ?? null,
            };
          }),
        } : null,
      })),
    })),
    cerrada: true,
    cerrada_en: new Date().toISOString(),
  };
}

/** Acepta `id` o `_id` (ObjectId) en los subdocumentos, por si se sembraron con cualquiera de los dos. */
const idDe = (x: { id?: unknown; _id?: unknown }) => String(x.id ?? x._id);

export function aConsultaDetalle(id: string, idPaciente: string, idCita: string | null, d: CamposConsulta): ConsultaDetalle {
  const s = d.signos_vitales;
  return {
    id, idPaciente, idCita,
    idMedico: d.medico_id,
    fecha: d.fecha,
    hora: d.hora,
    motivo: d.motivo_consulta ?? null,
    historiaEnfermedadActual: d.historia_enfermedad_actual ?? null,
    notasEvolucion: d.notas_evolucion ?? null,
    observaciones: d.observaciones ?? null,
    pesoKg: d.peso_kg ?? null,
    tallaCm: d.talla_cm ?? null,
    signos: s ? {
      presionSistolica: s.presion_sistolica ?? null, presionDiastolica: s.presion_diastolica ?? null,
      frecuenciaCardiaca: s.frecuencia_cardiaca ?? null, frecuenciaRespiratoria: s.frecuencia_respiratoria ?? null,
      saturacionOxigeno: s.saturacion_oxigeno ?? null, temperaturaC: s.temperatura_c ?? null,
    } : null,
    diagnosticos: (d.diagnosticos ?? []).map((dx) => ({
      id: idDe(dx), tipo: dx.tipo, enfermedadDetectada: dx.enfermedad_detectada ?? null, observaciones: dx.observaciones ?? null,
      tratamientos: (dx.tratamientos ?? []).map((t) => ({
        id: idDe(t), tipo: t.tipo, descripcion: t.descripcion ?? null, indicaciones: t.indicaciones ?? null,
        fechaInicio: t.fecha_inicio ?? null, fechaFin: t.fecha_fin ?? null,
        receta: t.receta ? {
          id: idDe(t.receta), idConsulta: id, idMedico: String(t.receta.medico_id), fechaEmision: t.receta.fecha_emision,
          observaciones: t.receta.observaciones ?? null,
          renglones: (t.receta.renglones ?? []).map((r) => ({
            idMedicamento: String(r.medicamento_id),
            medicamento: { nombre: r.nombre, presentacion: r.presentacion ?? null, concentracion: r.concentracion ?? null },
            dosis: r.dosis, viaAdministracion: r.via_administracion ?? null, frecuenciaHoras: r.frecuencia_horas ?? null,
            duracionDias: r.duracion_dias ?? null, cantidad: r.cantidad ?? null, indicaciones: r.indicaciones ?? null,
          })),
        } : null,
      })),
    })),
    cerrada: !!d.cerrada,
  };
}

import type { ConsultaDetalle, Diagnostico, Receta, Tratamiento } from '@red-clinica/shared';

/**
 * Arma ConsultaDetalle a partir de las filas de las seis tablas del ER (PostgreSQL y MySQL
 * usan los mismos alias). Se leen todas las consultas pedidas con una consulta por tabla, sin N+1.
 */
export interface FilasConsulta {
  consultas: Record<string, any>[];
  signos: Record<string, any>[];
  diagnosticos: Record<string, any>[];
  tratamientos: Record<string, any>[];
  recetas: Record<string, any>[];
  detalles: Record<string, any>[];
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

export function ensamblarConsultas(f: FilasConsulta): ConsultaDetalle[] {
  const detallesDe = agrupar(f.detalles, 'id_receta');
  const recetaDe = new Map<string, Omit<Receta, 'diagnostico'>>();
  for (const r of f.recetas) {
    recetaDe.set(String(r.id_tratamiento), {
      id: String(r.id_receta),
      idConsulta: String(r.id_consulta),
      idMedico: String(r.id_medico),
      fechaEmision: r.fecha_emision,
      observaciones: r.observaciones,
      renglones: (detallesDe.get(String(r.id_receta)) ?? []).map((d) => ({
        idMedicamento: String(d.id_medicamento),
        medicamento: { nombre: d.nombre, presentacion: d.presentacion ?? null, concentracion: d.concentracion ?? null },
        dosis: d.dosis,
        viaAdministracion: d.via_administracion,
        frecuenciaHoras: num(d.frecuencia_horas),
        duracionDias: num(d.duracion_dias),
        cantidad: num(d.cantidad),
        indicaciones: d.indicaciones,
      })),
    });
  }
  const tratamientosDe = agrupar(f.tratamientos, 'id_diagnostico');
  const diagnosticosDe = agrupar(f.diagnosticos, 'id_consulta');
  const signosDe = new Map(f.signos.map((s) => [String(s.id_consulta), s]));

  return f.consultas.map((c): ConsultaDetalle => {
    const s = signosDe.get(String(c.id_consulta));
    const diagnosticos = (diagnosticosDe.get(String(c.id_consulta)) ?? []).map((d): Diagnostico => ({
      id: String(d.id_diagnostico),
      tipo: d.tipo,
      enfermedadDetectada: d.diagnostico_final_enfermedad_detectada,
      observaciones: d.observaciones,
      tratamientos: (tratamientosDe.get(String(d.id_diagnostico)) ?? []).map((t): Tratamiento => ({
        id: String(t.id_tratamiento),
        tipo: t.tipo,
        descripcion: t.descripcion,
        indicaciones: t.indicaciones,
        fechaInicio: t.fecha_inicio,
        fechaFin: t.fecha_fin,
        receta: recetaDe.get(String(t.id_tratamiento)) ?? null,
      })),
    }));
    return {
      id: String(c.id_consulta),
      idPaciente: String(c.id_paciente),
      idCita: str(c.id_cita),
      idMedico: String(c.id_medico),
      fecha: c.fecha,
      hora: String(c.hora).slice(0, 5),
      motivo: c.motivo_consulta,
      historiaEnfermedadActual: c.historia_enfermedad_actual,
      notasEvolucion: c.notas_evolucion,
      observaciones: c.observaciones,
      pesoKg: num(c.peso_kg),
      tallaCm: num(c.talla_cm),
      signos: s ? {
        presionSistolica: num(s.presion_sistolica), presionDiastolica: num(s.presion_diastolica),
        frecuenciaCardiaca: num(s.frecuencia_cardiaca), frecuenciaRespiratoria: num(s.frecuencia_respiratoria),
        saturacionOxigeno: num(s.saturacion_oxigeno), temperaturaC: num(s.temperatura_c),
      } : null,
      diagnosticos,
      // En el ER no hay columna de estado: una consulta está cerrada cuando tiene diagnóstico.
      cerrada: diagnosticos.length > 0,
    };
  });
}

function agrupar(filas: Record<string, any>[], clave: string) {
  const m = new Map<string, Record<string, any>[]>();
  for (const f of filas) {
    const k = String(f[clave]);
    m.set(k, [...(m.get(k) ?? []), f]);
  }
  return m;
}

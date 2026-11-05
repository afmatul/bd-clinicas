'use client';
// Vista "consulta" del prototipo, conectada a /api/consultas. Cerrar la consulta guarda signos,
// diagnóstico, tratamiento y receta en una sola operación atómica de la API.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, Minus, Plus, ShieldAlert, Stethoscope, Trash2, TriangleAlert, X } from 'lucide-react';
import type { AlertaAlergia, Alergia, CerrarConsultaInput, CitaDetalle, ConsultaDetalle, Medicamento, PacienteFicha, PacienteResumen, TipoDiagnostico } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ApiError } from '../api/cliente';
import { buscarPacientes } from '../api/pacientes';
import { agenda } from '../api/agenda';
import { abrirConsulta, buscarMedicamentos, cerrarConsulta, fichaPaciente, guardarBorrador, obtenerConsulta } from '../api/atencion';
import { Buscador } from '../componentes/Buscador';
import { PillCita } from '../componentes/EstadoCita';
import { ahoraLocal, edad, formatoCui, iniciales, minutosEntre, varianteAvatar } from '../datos/formato';

interface Renglon { med: Medicamento; dosis: string; via: string; frecuencia: number; duracion: number }
interface Formulario {
  motivo: string; historia: string;
  signos: Record<'presionSistolica' | 'presionDiastolica' | 'frecuenciaCardiaca' | 'frecuenciaRespiratoria' | 'saturacionOxigeno' | 'temperaturaC', string>;
  peso: string; talla: string;
  dxTipo: TipoDiagnostico; dxTexto: string; dxObs: string;
  txTipo: string; txDescripcion: string; txIndicaciones: string;
  renglones: Renglon[];
}

const SIGNOS: { k: keyof Formulario['signos']; etiqueta: string; unidad: string; paso?: string }[] = [
  { k: 'presionSistolica', etiqueta: 'Presión sistólica', unidad: 'mmHg' },
  { k: 'presionDiastolica', etiqueta: 'Presión diastólica', unidad: 'mmHg' },
  { k: 'frecuenciaCardiaca', etiqueta: 'Frecuencia cardiaca', unidad: 'lpm' },
  { k: 'frecuenciaRespiratoria', etiqueta: 'Frec. respiratoria', unidad: 'rpm' },
  { k: 'saturacionOxigeno', etiqueta: 'Saturación O₂', unidad: '%' },
  { k: 'temperaturaC', etiqueta: 'Temperatura', unidad: '°C', paso: '0.1' },
];
const VIAS = ['Oral', 'Sublingual', 'Intravenosa', 'Intramuscular', 'Subcutánea', 'Tópica', 'Inhalada', 'Oftálmica', 'Ótica'];
const TIPOS_TX = ['Farmacológico', 'No farmacológico', 'Quirúrgico', 'Fisioterapia', 'Dieta y ejercicio'];

const vacio = (motivo = ''): Formulario => ({
  motivo, historia: '',
  signos: { presionSistolica: '', presionDiastolica: '', frecuenciaCardiaca: '', frecuenciaRespiratoria: '', saturacionOxigeno: '', temperaturaC: '' },
  peso: '', talla: '', dxTipo: 'DEFINITIVO', dxTexto: '', dxObs: '', txTipo: 'Farmacológico', txDescripcion: '', txIndicaciones: '', renglones: [],
});
const claveBorrador = (id: string) => `rc-consulta-${id}`;
const leerBorrador = (id: string): Formulario | null => {
  try { const s = localStorage.getItem(claveBorrador(id)); return s ? JSON.parse(s) as Formulario : null; } catch { return null; }
};
const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));
const normal = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
/** Misma regla que la API: por id de medicamento o por el nombre dentro de la alergia registrada. */
const alergiaDe = (m: Medicamento, alergias: Alergia[]) =>
  alergias.find((a) => a.idMedicamento === m.id || [a.descripcion, a.tipo].some((t) => t && normal(t).includes(normal(m.nombre))));
const cantidad = (r: Renglon) => (r.frecuencia > 0 && r.duracion > 0 ? Math.ceil((24 / r.frecuencia) * r.duracion) : 0);

export default function Consulta() {
  const params = useSearchParams();
  const idPaciente = params.get('paciente');
  return idPaciente ? <ConsultaEnCurso key={idPaciente} idPaciente={idPaciente} idCita={params.get('cita')} /> : <ElegirPaciente />;
}

/** Sin paciente: las citas activas de hoy del médico y un buscador, para empezar la consulta. */
function ElegirPaciente() {
  const { perfil } = useSesion();
  const router = useRouter();
  const [citas, setCitas] = useState<CitaDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hoy = ahoraLocal().fecha;
  const idMedico = perfil?.usuario.idPersonal;
  const buscar = useCallback((q: string) => buscarPacientes({ q, estado: 'ACTIVO', porPagina: 8 }).then((r) => r.items), []);

  useEffect(() => {
    if (!idMedico) { setCitas([]); return; }
    agenda({ idMedico, desde: hoy }).then((r) => setCitas(r.citas.filter((c) => ['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA'].includes(c.estado))))
      .catch((e: Error) => setError(e.message));
  }, [idMedico, hoy]);

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Consulta</h1>
            <p>Elija a quién atender: una cita de hoy o cualquier paciente activo.</p>
          </div>
        </div>
      </header>
      {!idMedico && (
        <div className="rc-alert rc-alert--warning" role="status">
          <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body">
            <span className="rc-alert__title">Su usuario no está vinculado a un médico</span>
            <span className="rc-alert__text">Solo los médicos de la institución pueden abrir consultas.</span>
          </div>
        </div>
      )}
      {error && <div className="rc-alert rc-alert--danger" role="alert"><div className="rc-alert__body"><span className="rc-alert__text">{error}</span></div></div>}
      <div className="split">
        <section className="rc-card agenda">
          <h2 className="rc-card__title" style={{ padding: '8px 0' }}>Citas de hoy</h2>
          {!citas && <span className="rc-skeleton" style={{ height: '44px' }} />}
          {citas?.length === 0 && (
            <div className="rc-empty">
              <span className="rc-empty__icon"><Stethoscope strokeWidth={1.75} aria-hidden="true" /></span>
              <span className="rc-empty__title">Sin citas pendientes hoy</span>
              <span className="rc-empty__text">Busque al paciente para atenderlo sin cita.</span>
            </div>
          )}
          {citas?.map((c) => (
            <div className="slot" key={c.id}>
              <span className="slot__h rc-num">{c.hora}</span>
              <Link className="slot__b" style={{ color: 'inherit', textDecoration: 'none' }} href={`/consulta?${new URLSearchParams({ paciente: c.idPaciente, cita: c.id })}`}>
                <div className="rc-person">
                  <span className={`rc-avatar rc-avatar--sm ${varianteAvatar(c.idPaciente)}`}>{iniciales(c.paciente.nombres, c.paciente.apellidos)}</span>
                  <div className="rc-person__text">
                    <span className="rc-person__name">{c.paciente.nombres} {c.paciente.apellidos}</span>
                    <span className="rc-person__meta">{c.motivo ?? 'Sin motivo'}</span>
                  </div>
                </div>
                <PillCita estado={c.estado} />
              </Link>
            </div>
          ))}
        </section>
        <aside className="col">
          <div className="rc-card form">
            <h2 className="rc-card__title">Atender sin cita</h2>
            <div className="rc-field">
              <label className="rc-label" htmlFor="co-buscar">Paciente</label>
              <Buscador<PacienteResumen>
                id="co-buscar" etiqueta="Paciente" placeholder="Buscar por nombre o CUI" buscar={buscar}
                opcion={(p) => ({ clave: p.id, titulo: `${p.nombres} ${p.apellidos}`, meta: `CUI ${formatoCui(p.cui)}` })}
                onElegir={(p) => router.push(`/consulta?paciente=${encodeURIComponent(p.id)}`)}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ConsultaEnCurso({ idPaciente, idCita }: { idPaciente: string; idCita: string | null }) {
  const { perfil } = useSesion();
  const toast = useToast();
  const router = useRouter();
  const [consulta, setConsulta] = useState<ConsultaDetalle | null>(null);
  const [paciente, setPaciente] = useState<PacienteFicha | null>(null);
  const [f, setF] = useState<Formulario>(vacio());
  const [error, setError] = useState<{ titulo: string; texto: string; campos: Record<string, string> } | null>(null);
  const [alertas, setAlertas] = useState<AlertaAlergia[] | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ahora, setAhora] = useState(ahoraLocal());
  const abierta = useRef(false);
  const pediatrico = perfil?.institucion.clave === 'pediatrico';

  useEffect(() => {
    if (abierta.current) return;
    abierta.current = true;
    fichaPaciente(idPaciente).then(setPaciente).catch(() => undefined);
    abrirConsulta({ idPaciente, idCita: idCita ?? undefined })
      .then((r) => obtenerConsulta(r.id))
      .then((c) => {
        setConsulta(c);
        setF(leerBorrador(c.id) ?? { ...vacio(c.motivo ?? ''), historia: c.historiaEnfermedadActual ?? '' });
      })
      .catch((e: Error) => setError({ titulo: 'No se pudo abrir la consulta', texto: e.message, campos: {} }));
  }, [idPaciente, idCita]);

  useEffect(() => {
    const t = setInterval(() => setAhora(ahoraLocal()), 30_000);
    return () => clearInterval(t);
  }, []);

  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((x) => ({ ...x, [k]: v }));
  const setSigno = (k: keyof Formulario['signos'], v: string) => setF((x) => ({ ...x, signos: { ...x.signos, [k]: v } }));
  const setRenglon = (i: number, cambios: Partial<Renglon>) =>
    setF((x) => ({ ...x, renglones: x.renglones.map((r, j) => (j === i ? { ...r, ...cambios } : r)) }));
  const buscarMed = useCallback((q: string) => buscarMedicamentos(q), []);

  const imc = useMemo(() => {
    const p = num(f.peso), t = num(f.talla);
    return p && t ? (p / (t / 100) ** 2).toFixed(1) : '';
  }, [f.peso, f.talla]);

  const pasos = [
    { nombre: 'Motivo', listo: f.motivo.trim().length >= 3 },
    { nombre: 'Signos vitales', listo: Object.values(f.signos).some((v) => v.trim() !== '') },
    { nombre: 'Diagnóstico', listo: f.dxTexto.trim().length >= 3 },
    { nombre: 'Tratamiento y receta', listo: f.txDescripcion.trim() !== '' || f.renglones.length > 0 },
  ];
  const actual = pasos.findIndex((p) => !p.listo);
  const err = (k: string) => error?.campos[k];
  const minutos = consulta && consulta.fecha === ahora.fecha ? minutosEntre(consulta.hora, ahora.hora) : null;

  function armar(confirmarAlergias: boolean): CerrarConsultaInput {
    const conTratamiento = f.txDescripcion.trim() !== '' || f.renglones.length > 0;
    return {
      motivo: f.motivo,
      historiaEnfermedadActual: f.historia || undefined,
      pesoKg: pediatrico ? undefined : num(f.peso),
      tallaCm: pediatrico ? undefined : num(f.talla),
      signos: Object.fromEntries(Object.entries(f.signos).map(([k, v]) => [k, num(v)]).filter(([, v]) => v !== undefined)),
      diagnosticos: [{
        tipo: f.dxTipo,
        enfermedadDetectada: f.dxTexto,
        observaciones: f.dxObs || undefined,
        tratamientos: conTratamiento ? [{
          tipo: f.txTipo,
          descripcion: f.txDescripcion.trim() || f.renglones.map((r) => r.med.nombre).join(', '),
          indicaciones: f.txIndicaciones || undefined,
          fechaInicio: ahora.fecha,
          receta: f.renglones.length ? {
            renglones: f.renglones.map((r) => ({
              idMedicamento: r.med.id, dosis: r.dosis, viaAdministracion: r.via,
              frecuenciaHoras: r.frecuencia || undefined, duracionDias: r.duracion || undefined, cantidad: cantidad(r) || undefined,
            })),
          } : undefined,
        }] : [],
      }],
      confirmarAlergias,
    };
  }

  async function guardar() {
    if (!consulta) return;
    try {
      localStorage.setItem(claveBorrador(consulta.id), JSON.stringify(f));
    } catch { /* sin almacenamiento local: se guarda solo lo del servidor */ }
    try {
      await guardarBorrador(consulta.id, { motivo: f.motivo || undefined, historiaEnfermedadActual: f.historia || undefined });
      toast('Borrador guardado', 'Puede retomar la consulta desde la agenda o la ficha del paciente.');
      router.push(`/pacientes/${idPaciente}`);
    } catch (e) {
      setError({ titulo: 'No se guardó el borrador', texto: (e as Error).message, campos: {} });
    }
  }

  async function cerrar(confirmarAlergias = false) {
    if (!consulta) return;
    setError(null);
    setGuardando(true);
    try {
      await cerrarConsulta(consulta.id, armar(confirmarAlergias));
      try { localStorage.removeItem(claveBorrador(consulta.id)); } catch { /* nada que limpiar */ }
      setAlertas(null);
      toast('Consulta cerrada', 'Diagnóstico, tratamiento y receta quedaron registrados.');
      router.push(`/pacientes/${idPaciente}`);
    } catch (e) {
      const a = e as ApiError;
      const det = a.detalle as { alertas?: AlertaAlergia[] } | undefined;
      if (a.status === 409 && det?.alertas) setAlertas(det.alertas);
      else {
        setAlertas(null);
        setError({ titulo: 'No se cerró la consulta: no se guardó nada', texto: a.message, campos: a.campos ?? {} });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setGuardando(false);
    }
  }

  const nombre = paciente ? `${paciente.nombres} ${paciente.apellidos}` : '…';
  const sistolica = num(f.signos.presionSistolica);

  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li><Link href="/pacientes">Pacientes</Link><ChevronRight strokeWidth={1.75} aria-hidden="true" /></li>
          <li><Link href={`/pacientes/${idPaciente}`}>{nombre}</Link><ChevronRight strokeWidth={1.75} aria-hidden="true" /></li>
          <li><span aria-current="page">Consulta</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Consulta en curso</h1>
            <p>{nombre}{paciente ? ` · ${edad(paciente.fechaNacimiento)} años` : ''}{consulta ? ` · iniciada ${consulta.hora}` : ''}</p>
          </div>
          <div className="ph__actions">
            <span className="rc-pill rc-pill--accent rc-pill--live rc-pill--lg">
              <span className="rc-pill__dot" />En consulta{minutos !== null ? ` · ${minutos} min` : ''}
            </span>
          </div>
        </div>
      </header>
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <X strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body">
            <span className="rc-alert__title">{error.titulo}</span>
            <span className="rc-alert__text">{error.texto}</span>
          </div>
        </div>
      )}
      <div className="rc-alert rc-alert--warning" role="status">
        <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
        <div className="rc-alert__body">
          <span className="rc-alert__title">Todo se guarda junto</span>
          <span className="rc-alert__text">
            Signos vitales, diagnóstico, tratamiento y receta se registran en una sola transacción: si algo falla, no se guarda nada a medias.
          </span>
        </div>
      </div>
      <div className="steps">
        {pasos.map((p, i) => p.listo
          ? <span key={p.nombre} className="step is-done"><Check strokeWidth={1.75} aria-hidden="true" />{p.nombre}</span>
          : <span key={p.nombre} className={`step${i === actual ? ' is-cur' : ''}`}>{i + 1} · {p.nombre}</span>)}
      </div>
      <fieldset disabled={!consulta} style={{ display: 'contents' }}>
        <section className="rc-card form">
          <h2 className="rc-card__title">Motivo y evolución</h2>
          <div className="rc-field">
            <label className="rc-label" htmlFor="co1">Motivo de consulta <span className="rc-req" aria-hidden="true">*</span></label>
            <div className={`rc-control${err('motivo') ? ' is-error' : ''}`}>
              <input className="rc-input" id="co1" value={f.motivo} onChange={(e) => set('motivo', e.target.value)} />
            </div>
            {err('motivo') && <div className="rc-help"><span className="rc-help--error">{err('motivo')}</span></div>}
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="co2">Historia de la enfermedad actual</label>
            <div className="rc-control rc-control--area">
              <textarea className="rc-input" id="co2" rows={3} value={f.historia} onChange={(e) => set('historia', e.target.value)} />
            </div>
          </div>
        </section>
        <section className="rc-card form">
          <h2 className="rc-card__title">Signos vitales</h2>
          <div className="grid3">
            {SIGNOS.map((s, i) => {
              const e = err(`signos.${s.k}`) ?? (s.k === 'presionSistolica' && sistolica && sistolica > 130 ? 'Por encima de 130.' : undefined);
              return (
                <div className="rc-field" key={s.k}>
                  <label className="rc-label" htmlFor={`sv${i + 1}`}>{s.etiqueta}</label>
                  <div className={`rc-control rc-num${e ? ' is-error' : ''}`}>
                    <input className="rc-input" id={`sv${i + 1}`} inputMode="decimal" value={f.signos[s.k]} onChange={(ev) => setSigno(s.k, ev.target.value)} />
                    <span className="rc-affix">{s.unidad}</span>
                  </div>
                  {e && <div className="rc-help"><span className="rc-help--error">{e}</span></div>}
                </div>
              );
            })}
            {!pediatrico && (
              <>
                <div className="rc-field">
                  <label className="rc-label" htmlFor="sv7">Peso</label>
                  <div className={`rc-control rc-num${err('pesoKg') ? ' is-error' : ''}`}>
                    <input className="rc-input" id="sv7" inputMode="decimal" value={f.peso} onChange={(e) => set('peso', e.target.value)} />
                    <span className="rc-affix">kg</span>
                  </div>
                </div>
                <div className="rc-field">
                  <label className="rc-label" htmlFor="sv8">Talla</label>
                  <div className={`rc-control rc-num${err('tallaCm') ? ' is-error' : ''}`}>
                    <input className="rc-input" id="sv8" inputMode="decimal" value={f.talla} onChange={(e) => set('talla', e.target.value)} />
                    <span className="rc-affix">cm</span>
                  </div>
                </div>
                <div className="rc-field">
                  <label className="rc-label" htmlFor="sv9">IMC</label>
                  <div className="rc-control is-readonly rc-num">
                    <input className="rc-input" id="sv9" value={imc} readOnly />
                  </div>
                  <div className="rc-help">Calculado.</div>
                </div>
              </>
            )}
          </div>
          {pediatrico && <span className="muted small">Peso, talla y perímetro cefálico se registran en Crecimiento y vacunas.</span>}
        </section>
        <section className="rc-card form">
          <h2 className="rc-card__title">Diagnóstico</h2>
          <div className="grid2">
            <div className="rc-field">
              <label className="rc-label" htmlFor="dx1">Tipo <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select">
                <select className="rc-input" id="dx1" value={f.dxTipo} onChange={(e) => set('dxTipo', e.target.value as TipoDiagnostico)}>
                  <option value="DEFINITIVO">Definitivo</option>
                  <option value="PRESUNTIVO">Presuntivo</option>
                  <option value="DIFERENCIAL">Diferencial</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            <div className="rc-field">
              <label className="rc-label" htmlFor="dx2">Diagnóstico final <span className="rc-req" aria-hidden="true">*</span></label>
              <div className={`rc-control${err('diagnosticos.0.enfermedadDetectada') ? ' is-error' : ''}`}>
                <input className="rc-input" id="dx2" value={f.dxTexto} placeholder="Hipertensión arterial esencial (I10)" onChange={(e) => set('dxTexto', e.target.value)} />
              </div>
              {err('diagnosticos.0.enfermedadDetectada') && <div className="rc-help"><span className="rc-help--error">{err('diagnosticos.0.enfermedadDetectada')}</span></div>}
            </div>
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="dx3">Observaciones</label>
            <div className="rc-control rc-control--area">
              <textarea className="rc-input" id="dx3" rows={2} placeholder="Hallazgos relevantes" value={f.dxObs} onChange={(e) => set('dxObs', e.target.value)} />
            </div>
          </div>
        </section>
        <section className="rc-card form">
          <div className="rc-card__header">
            <h2 className="rc-card__title">Tratamiento y receta</h2>
            <button className="rc-btn rc-btn--soft rc-btn--sm" type="button" onClick={() => setAgregando(true)}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Agregar medicamento
            </button>
          </div>
          <div className="grid2">
            <div className="rc-field">
              <label className="rc-label" htmlFor="tx1">Tipo de tratamiento</label>
              <div className="rc-control rc-control--select">
                <select className="rc-input" id="tx1" value={f.txTipo} onChange={(e) => set('txTipo', e.target.value)}>
                  {TIPOS_TX.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            <div className="rc-field">
              <label className="rc-label" htmlFor="tx2">Descripción</label>
              <div className="rc-control">
                <input className="rc-input" id="tx2" value={f.txDescripcion} placeholder="Antihipertensivo combinado" onChange={(e) => set('txDescripcion', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="tx3">Indicaciones</label>
            <div className="rc-control rc-control--area">
              <textarea className="rc-input" id="tx3" rows={2} placeholder="Dieta baja en sodio, control en 3 meses" value={f.txIndicaciones} onChange={(e) => set('txIndicaciones', e.target.value)} />
            </div>
          </div>
          {agregando && (
            <div className="rc-field">
              <label className="rc-label" htmlFor="tx-med">Medicamento del catálogo</label>
              <div className="row">
                <div className="grow" style={{ flex: 1 }}>
                  <Buscador<Medicamento>
                    id="tx-med" etiqueta="Medicamento" placeholder="Buscar medicamento" buscar={buscarMed} buscarVacio autoFocus
                    opcion={(m) => ({
                      clave: m.id, titulo: m.nombre,
                      meta: [m.concentracion, m.presentacion].filter(Boolean).join(' · ') + (paciente && alergiaDe(m, paciente.alergias) ? ' · alergia' : ''),
                    })}
                    onElegir={(m) => {
                      setF((x) => (x.renglones.some((r) => r.med.id === m.id) ? x
                        : { ...x, renglones: [...x.renglones, { med: m, dosis: '1 tableta', via: 'Oral', frecuencia: 24, duracion: 7 }] }));
                      setAgregando(false);
                    }}
                  />
                </div>
                <button className="rc-btn rc-btn--ghost rc-btn--sm" type="button" onClick={() => setAgregando(false)}>Listo</button>
              </div>
            </div>
          )}
          {paciente && f.renglones.map((r) => ({ r, a: alergiaDe(r.med, paciente.alergias) })).filter((x) => x.a).map(({ r, a }) => (
            <div className="rc-alert rc-alert--danger" role="alert" key={r.med.id}>
              <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body">
                <span className="rc-alert__title">Alergia registrada a {r.med.nombre}</span>
                <span className="rc-alert__text">{a!.descripcion ?? a!.tipo}{a!.severidad ? ` · ${a!.severidad.toLowerCase()}` : ''}. Revise la receta antes de cerrar.</span>
              </div>
            </div>
          ))}
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Medicamento</th>
                  <th>Dosis</th>
                  <th>Vía</th>
                  <th>Cada (horas)</th>
                  <th>Durante (días)</th>
                  <th className="rc-num">Cantidad</th>
                  <th className="rc-cell-actions"><span className="rc-sr">Quitar</span></th>
                </tr>
              </thead>
              <tbody>
                {f.renglones.length === 0 && (
                  <tr><td colSpan={7} className="muted">Sin medicamentos. Use “Agregar medicamento” para recetar.</td></tr>
                )}
                {f.renglones.map((r, i) => (
                  <tr key={r.med.id}>
                    <td>
                      <b>{r.med.nombre}</b>
                      <div className="muted small">{[r.med.concentracion, r.med.presentacion].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td>
                      <div className="rc-control rc-control--sm">
                        <input className="rc-input" value={r.dosis} aria-label={`Dosis de ${r.med.nombre}`} onChange={(e) => setRenglon(i, { dosis: e.target.value })} />
                      </div>
                    </td>
                    <td>
                      <div className="rc-control rc-control--select rc-control--sm">
                        <select className="rc-input" value={r.via} aria-label={`Vía de ${r.med.nombre}`} onChange={(e) => setRenglon(i, { via: e.target.value })}>
                          {VIAS.map((v) => <option key={v}>{v}</option>)}
                        </select>
                        <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
                      </div>
                    </td>
                    <td><Stepper valor={r.frecuencia} min={1} max={168} etiqueta="Frecuencia en horas" onChange={(v) => setRenglon(i, { frecuencia: v })} /></td>
                    <td><Stepper valor={r.duracion} min={1} max={365} etiqueta="Duración en días" onChange={(v) => setRenglon(i, { duracion: v })} /></td>
                    <td className="rc-num"><b>{cantidad(r)}</b> u</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" type="button" aria-label={`Quitar ${r.med.nombre}`}
                        onClick={() => setF((x) => ({ ...x, renglones: x.renglones.filter((_, j) => j !== i) }))}>
                        <Trash2 strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rc-card__footer">
            <button className="rc-btn rc-btn--ghost" type="button" onClick={() => void guardar()}>Guardar borrador</button>
            <button className="rc-btn rc-btn--primary" type="button" disabled={guardando || !consulta} onClick={() => void cerrar()}>
              <Check strokeWidth={1.75} aria-hidden="true" />
              {guardando ? 'Cerrando…' : 'Cerrar consulta'}
            </button>
          </div>
        </section>
      </fieldset>
      {alertas && (
        <div className="rc-scrim" style={{ position: 'fixed', inset: 0 }} onKeyDown={(e) => e.key === 'Escape' && setAlertas(null)}>
          <div className="rc-modal" role="dialog" aria-modal="true" aria-labelledby="al-titulo">
            <div className="rc-modal__header">
              <span className="rc-modal__icon"><ShieldAlert strokeWidth={1.75} aria-hidden="true" /></span>
              <div style={{ flex: 1 }}><h2 className="rc-modal__title" id="al-titulo">¿Recetar a pesar de la alergia?</h2></div>
              <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={() => setAlertas(null)}>
                <X strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="rc-modal__body" style={{ paddingLeft: '76px' }}>
              {alertas.map((a) => (
                <span key={a.idMedicamento}>
                  {nombre} tiene registrada alergia <strong>{a.severidad ? a.severidad.toLowerCase() : ''}</strong> a {a.alergia}, y la receta incluye <strong>{a.medicamento}</strong>.
                </span>
              ))}
            </div>
            <div className="rc-modal__footer">
              <button className="rc-btn rc-btn--ghost" autoFocus onClick={() => setAlertas(null)}>Volver</button>
              <button className="rc-btn rc-btn--danger" disabled={guardando} onClick={() => void cerrar(true)}>Recetar y cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** rc-stepper controlado por React (data-controlado lo saca del comportamiento del prototipo). */
function Stepper({ valor, min, max, etiqueta, onChange }: { valor: number; min: number; max: number; etiqueta: string; onChange: (v: number) => void }) {
  const fijar = (v: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)));
  return (
    <div className="rc-stepper" data-controlado>
      <button type="button" className="rc-stepper__btn" aria-label="Restar" onClick={() => fijar(valor - 1)}>
        <Minus strokeWidth={1.75} aria-hidden="true" />
      </button>
      <input className="rc-stepper__input" inputMode="numeric" value={valor} aria-label={etiqueta} onChange={(e) => fijar(Number(e.target.value))} />
      <button type="button" className="rc-stepper__btn" aria-label="Sumar" onClick={() => fijar(valor + 1)}>
        <Plus strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

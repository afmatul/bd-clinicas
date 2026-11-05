// Borrador generado desde prototipo.html (vista "paciente") por scripts/prototipo-a-jsx.py.
import { Activity, CalendarDays, ChevronRight, ClipboardList, Droplet, FlaskConical, HeartPulse, History, Loader2, Pill, ShieldAlert, Stethoscope, Thermometer, TriangleAlert, Users, Weight, Wind } from 'lucide-react';
import Link from 'next/link';

export default function Paciente() {
  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">María José López Ramírez</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">María José López Ramírez</h1>
            <p>Exp. HG-2026-004812 · CUI 2547 88120 0101 · 34 años · Femenino · O+</p>
          </div>
          <div className="ph__actions">
            <Link className="rc-btn rc-btn--secondary" href="/nueva-cita">
              <CalendarDays strokeWidth={1.75} aria-hidden="true" />
              Agendar cita
            </Link>
            <Link className="rc-btn rc-btn--primary" href="/consulta">
              <Stethoscope strokeWidth={1.75} aria-hidden="true" />
              Iniciar consulta
            </Link>
          </div>
        </div>
      </header>
      <div className="rc-alert rc-alert--danger" role="alert">
        <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
        <div className="rc-alert__body">
          <span className="rc-alert__title">Alergia severa a penicilina</span>
          <span className="rc-alert__text">Reacción anafiláctica registrada en 2019. No recetar betalactámicos.</span>
        </div>
      </div>
      <div className="rc-tabs" role="tablist">
        <button className="rc-tab" role="tab" aria-selected="true">
          <ClipboardList strokeWidth={1.75} aria-hidden="true" />
          Resumen
        </button>
        <button className="rc-tab" role="tab">
          <Stethoscope strokeWidth={1.75} aria-hidden="true" />
          Consultas
          <span className="rc-badge rc-badge--soft">12</span>
        </button>
        <button className="rc-tab" role="tab">
          <CalendarDays strokeWidth={1.75} aria-hidden="true" />
          Citas
          <span className="rc-badge rc-badge--soft">1</span>
        </button>
        <button className="rc-tab" role="tab">
          <Pill strokeWidth={1.75} aria-hidden="true" />
          Recetas
        </button>
        <button className="rc-tab" role="tab">
          <FlaskConical strokeWidth={1.75} aria-hidden="true" />
          Laboratorio
          <span className="rc-badge">1</span>
        </button>
        <button className="rc-tab" role="tab">
          <Users strokeWidth={1.75} aria-hidden="true" />
          Perfil social
        </button>
      </div>
      <div className="split">
        <div className="col">
          <section className="rc-card">
            <div className="rc-card__header">
              <div>
                <h2 className="rc-card__title">Signos vitales</h2>
                <p className="rc-card__sub">Última toma: 04/11/2026 · 08:12 · Enf. Marta Cifuentes</p>
              </div>
              <button className="rc-btn rc-btn--ghost rc-btn--sm">
                <History strokeWidth={1.75} aria-hidden="true" />
                Historial
              </button>
            </div>
            <div className="vitals">
              <div className="vital">
                <span className="vital__l">
                  <HeartPulse strokeWidth={1.75} aria-hidden="true" />
                  Presión arterial
                </span>
                <span className="vital__v rc-num">132/84<small>mmHg</small></span>
                <span className="rc-pill rc-pill--warning">
                  <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                  Elevada
                </span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Activity strokeWidth={1.75} aria-hidden="true" />
                  Frec. cardiaca
                </span>
                <span className="vital__v rc-num">78<small>lpm</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Thermometer strokeWidth={1.75} aria-hidden="true" />
                  Temperatura
                </span>
                <span className="vital__v rc-num">36.7<small>°C</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Droplet strokeWidth={1.75} aria-hidden="true" />
                  Saturación O₂
                </span>
                <span className="vital__v rc-num">97<small>%</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Wind strokeWidth={1.75} aria-hidden="true" />
                  Frec. respiratoria
                </span>
                <span className="vital__v rc-num">16<small>rpm</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Weight strokeWidth={1.75} aria-hidden="true" />
                  Peso · talla
                </span>
                <span className="vital__v rc-num">61.4 · 158<small>kg · cm</small></span>
                <span className="vital__n">IMC 24.6</span>
              </div>
            </div>
          </section>
          <section className="rc-card" style={{ padding: 0, gap: 0 }}>
            <div className="card-h">
              <h2 className="rc-card__title">Consultas recientes</h2>
              <Link className="rc-link" href="/paciente">Ver las 12</Link>
            </div>
            <div className="rc-table-wrap flat">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th className="hide-sm">Diagnóstico</th>
                    <th className="hide-sm">Médico</th>
                    <th className="rc-cell-actions"><span className="rc-sr">Abrir</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rc-num">04/11/2026</td>
                    <td>Control de hipertensión</td>
                    <td className="hide-sm">Hipertensión arterial esencial (I10)</td>
                    <td className="hide-sm">Dra. Ana Lucía Pérez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="rc-num">12/08/2026</td>
                    <td>Cefalea frecuente</td>
                    <td className="hide-sm">Cefalea tensional (G44.2)</td>
                    <td className="hide-sm">Dr. Carlos Méndez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="rc-num">03/05/2026</td>
                    <td>Chequeo general</td>
                    <td className="hide-sm">Sin hallazgos</td>
                    <td className="hide-sm">Dra. Ana Lucía Pérez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Tratamiento activo</h2>
              <span className="rc-pill rc-pill--info">
                <Loader2 strokeWidth={1.75} aria-hidden="true" />
                En curso
              </span>
            </div>
            <div className="rx">
              <span className="rx__icon">
                <Pill strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <b>Losartán 50 mg</b>
                · tableta · oral
                <div className="muted">1 tableta cada 24 horas · 90 días · desde 04/11/2026</div>
              </div>
              <span className="rc-tag rc-num">90 u</span>
            </div>
            <div className="rx">
              <span className="rx__icon">
                <Pill strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <b>Hidroclorotiazida 12.5 mg</b>
                · tableta · oral
                <div className="muted">1 tableta cada 24 horas por la mañana · 90 días</div>
              </div>
              <span className="rc-tag rc-num">90 u</span>
            </div>
          </section>
        </div>
        <aside className="col">
          <section className="rc-card">
            <div className="rc-card__header">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--lg">ML</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">María José López</span>
                  <span className="rc-person__meta">Paciente desde 2019</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--success"><span className="rc-pill__dot" />Activo</span>
            </div>
            <dl className="rc-dl">
              <div>
                <dt>Nacimiento</dt>
                <dd>14/02/1992</dd>
              </div>
              <div>
                <dt>Procedencia</dt>
                <dd>Mixco</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>5512 4478</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd className="ellip">mjlopez@correo.gt</dd>
              </div>
            </dl>
            <div className="rc-field">
              <span className="rc-overline">Dirección</span>
              <span>5a. avenida 12-40, zona 1, Mixco</span>
            </div>
          </section>
          <section className="rc-card">
            <h2 className="rc-card__title">Alergias y antecedentes</h2>
            <div className="tags">
              <span className="rc-tag rc-tag--danger">
                <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
                Penicilina · severa
              </span>
              <span className="rc-tag rc-tag--info">Polen · leve</span>
            </div>
            <div className="tags">
              <span className="rc-tag">Hipertensión arterial</span>
              <span className="rc-tag">Apendicectomía 2015</span>
              <span className="rc-tag">Madre diabética</span>
            </div>
          </section>
          <section className="rc-card">
            <h2 className="rc-card__title">Contacto de emergencia</h2>
            <div className="rc-person">
              <span className="rc-avatar rc-avatar--neutral">JL</span>
              <div className="rc-person__text">
                <span className="rc-person__name">Jorge López Ramírez</span>
                <span className="rc-person__meta">Hermano · 5530 1188 · 2244 9010</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

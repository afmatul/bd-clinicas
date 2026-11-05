// Borrador generado desde prototipo.html (vista "citas") por scripts/prototipo-a-jsx.py.
import { Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Clock, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function Citas() {
  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Citas</h1>
            <p>Jueves 5 de noviembre de 2026 · Dra. Ana Lucía Pérez</p>
          </div>
          <div className="ph__actions">
            <Link className="rc-btn rc-btn--primary" href="/nueva-cita">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Nueva cita
            </Link>
          </div>
        </div>
      </header>
      <div className="rc-toolbar">
        <div className="rc-segmented" role="group" aria-label="Vista">
          <button aria-pressed="true">Día</button>
          <button aria-pressed="false">Semana</button>
          <button aria-pressed="false">Mes</button>
        </div>
        <div className="row">
          <button className="rc-btn rc-btn--secondary rc-btn--sm rc-btn--icon" aria-label="Día anterior">
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button className="rc-btn rc-btn--secondary rc-btn--sm">Hoy</button>
          <button className="rc-btn rc-btn--secondary rc-btn--sm rc-btn--icon" aria-label="Día siguiente">
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <span className="rc-toolbar__spacer" />
        <div className="rc-control rc-control--select rc-control--sm">
          <select className="rc-input" aria-label="Médico">
            <option>Dra. Ana Lucía Pérez</option>
            <option>Dr. Carlos Méndez</option>
          </select>
          <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
        </div>
      </div>
      <div className="days">
        <button className="day is-past"><span>Lun</span><b className="rc-num">2</b></button>
        <button className="day is-past"><span>Mar</span><b className="rc-num">3</b></button>
        <button className="day is-past"><span>Mié</span><b className="rc-num">4</b></button>
        <button className="day is-sel"><span>Jue</span><b className="rc-num">5</b><i>14</i></button>
        <button className="day"><span>Vie</span><b className="rc-num">6</b></button>
        <button className="day"><span>Sáb</span><b className="rc-num">7</b></button>
      </div>
      <div className="split">
        <section className="rc-card agenda">
          <div className="slot is-free">
            <span className="slot__h rc-num">07:30</span>
            <Link className="slot__b free" href="/nueva-cita">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Disponible · agendar
            </Link>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">08:00</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">ML</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">María José López Ramírez</span>
                  <span className="rc-person__meta">Control de hipertensión</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--success">
                <Check strokeWidth={1.75} aria-hidden="true" />
                Atendida
              </span>
            </div>
          </div>
          <div className="slot is-now">
            <span className="slot__h rc-num">08:30</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">CA</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Carlos Ajú Tzul</span>
                  <span className="rc-person__meta">Dolor torácico</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>
            </div>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">09:00</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">SH</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Sofía Hernández Pérez</span>
                  <span className="rc-person__meta">Resultados de laboratorio</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--info">
                <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                Confirmada
              </span>
            </div>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">09:30</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">LM</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Luis Mazariegos</span>
                  <span className="rc-person__meta">Primera consulta</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--info">
                <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                Confirmada
              </span>
            </div>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">10:00</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">RG</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Rosa Gómez de León</span>
                  <span className="rc-person__meta">Seguimiento postoperatorio</span>
                </div>
              </div>
              <span className="rc-pill "><span className="rc-pill__dot" />Programada</span>
            </div>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">10:30</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">JT</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">José Tum Chávez</span>
                  <span className="rc-person__meta">Control de diabetes</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--warning">
                <Clock strokeWidth={1.75} aria-hidden="true" />
                No asistió
              </span>
            </div>
          </div>
          <div className="slot is-free">
            <span className="slot__h rc-num">11:00</span>
            <Link className="slot__b free" href="/nueva-cita">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Disponible · agendar
            </Link>
          </div>
          <div className="slot">
            <span className="slot__h rc-num">11:30</span>
            <div className="slot__b">
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--sm">AM</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Ana Morales</span>
                  <span className="rc-person__meta">Chequeo general</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--danger">
                <X strokeWidth={1.75} aria-hidden="true" />
                Cancelada
              </span>
            </div>
          </div>
          <div className="slot is-free">
            <span className="slot__h rc-num">12:00</span>
            <Link className="slot__b free" href="/nueva-cita">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Disponible · agendar
            </Link>
          </div>
        </section>
        <aside className="col">
          <div className="rc-card">
            <h2 className="rc-card__title">Resumen del día</h2>
            <dl className="rc-dl">
              <div>
                <dt>Programadas</dt>
                <dd>14</dd>
              </div>
              <div>
                <dt>Atendidas</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>Canceladas</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>No asistió</dt>
                <dd>1</dd>
              </div>
            </dl>
            <div className="rc-meter" role="meter" aria-valuenow={21} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del día"><span style={{ width: '21%' }} /></div>
            <span className="muted small">3 de 14 citas cerradas</span>
          </div>
          <div className="rc-card">
            <h2 className="rc-card__title">Leyenda</h2>
            <div className="tags">
              <span className="rc-pill "><span className="rc-pill__dot" />Programada</span>
              <span className="rc-pill rc-pill--info">
                <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                Confirmada
              </span>
              <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>
              <span className="rc-pill rc-pill--success">
                <Check strokeWidth={1.75} aria-hidden="true" />
                Atendida
              </span>
              <span className="rc-pill rc-pill--warning">
                <Clock strokeWidth={1.75} aria-hidden="true" />
                No asistió
              </span>
              <span className="rc-pill rc-pill--danger">
                <X strokeWidth={1.75} aria-hidden="true" />
                Cancelada
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Borrador generado desde prototipo.html (vista "nueva-cita") por scripts/prototipo-a-jsx.py.
import { CalendarDays, ChevronDown, ChevronRight, Info, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NuevaCita() {
  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link to="/citas">Citas</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">Nueva cita</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Nueva cita</h1>
            <p>Hospital general · Medicina interna</p>
          </div>
          <div className="ph__actions" />
        </div>
      </header>
      <div className="split">
        <section className="rc-card form">
          <h2 className="rc-card__title">Datos de la cita</h2>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="nc1">Paciente <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control">
              <Search strokeWidth={1.75} aria-hidden="true" />
              <span className="rc-value">María José López Ramírez</span>
              <span className="rc-affix rc-num">CUI 2547 88120 0101</span>
            </div>
          </div>
          <div className="grid2">
            <div className="rc-field ">
              <label className="rc-label" htmlFor="nc2">Fecha <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control ">
                <CalendarDays strokeWidth={1.75} aria-hidden="true" />
                <input className="rc-input" id="nc2" defaultValue="09/11/2026" placeholder="" />
              </div>
            </div>
            <div className="rc-field ">
              <label className="rc-label" htmlFor="nc3">Hora <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select ">
                <select className="rc-input" id="nc3">
                  <option>08:30</option>
                  <option>09:00</option>
                  <option>11:00</option>
                  <option>11:30</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
              <div className="rc-help">Se muestran solo horarios libres.</div>
            </div>
            <div className="rc-field ">
              <label className="rc-label" htmlFor="nc4">Especialidad <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select ">
                <select className="rc-input" id="nc4">
                  <option>Medicina interna</option>
                  <option>Cardiología</option>
                  <option>Pediatría</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            <div className="rc-field ">
              <label className="rc-label" htmlFor="nc5">Médico <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select ">
                <select className="rc-input" id="nc5">
                  <option>Dra. Ana Lucía Pérez · 3 libres</option>
                  <option>Dr. Carlos Méndez · 5 libres</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="nc6">Motivo <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--area">
              <textarea className="rc-input" id="nc6" rows={3} defaultValue="Control de hipertensión y revisión de tratamiento." />
            </div>
            <div className="rc-help"><span /><span className="rc-count">50 / 300</span></div>
          </div>
          <div className="rc-field">
            <span className="rc-label">Recordatorio</span>
            <div className="row">
              <label className="rc-switch">
                <input type="checkbox" role="switch" defaultChecked />
                <span>SMS al 5512 4478</span>
              </label>
              <label className="rc-switch">
                <input type="checkbox" role="switch" />
                <span>Correo</span>
              </label>
            </div>
          </div>
          <div className="rc-card__footer">
            <Link className="rc-btn rc-btn--ghost" to="/citas">Cancelar</Link>
            <button className="rc-btn rc-btn--primary" data-toast="Cita programada|Lunes 9 de noviembre, 08:30 con la Dra. Pérez.">Guardar cita</button>
          </div>
        </section>
        <aside className="col">
          <div className="rc-card">
            <h2 className="rc-card__title">Paciente</h2>
            <div className="rc-person">
              <span className="rc-avatar ">ML</span>
              <div className="rc-person__text">
                <span className="rc-person__name">María José López Ramírez</span>
                <span className="rc-person__meta">34 años · O+ · Exp. HG-2026-004812</span>
              </div>
            </div>
            <div className="tags">
              <span className="rc-tag rc-tag--danger">
                <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
                Penicilina · severa
              </span>
            </div>
          </div>
          <div className="rc-alert">
            <Info strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-alert__body">
              <span className="rc-alert__title">Ya tiene una cita</span>
              <span className="rc-alert__text">Confirmada para el lunes 9 de noviembre a las 08:30. Guardar esta cita no la reemplaza.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

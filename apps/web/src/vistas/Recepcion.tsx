// Borrador generado desde prototipo.html (vista "recepcion") por scripts/prototipo-a-jsx.py.
import { Check, ChevronDown, CircleCheck, Phone, Search, UserPlus } from 'lucide-react';

export default function Recepcion() {
  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Recepción</h1>
            <p>Clínica odontológica · jueves 5 de noviembre</p>
          </div>
          <div className="ph__actions" />
        </div>
      </header>
      <div className="split">
        <section className="rc-card">
          <div className="rc-card__header">
            <div>
              <h2 className="rc-card__title">Turnos de hoy</h2>
              <p className="rc-card__sub">5 pacientes · Dr. Fernando Castillo</p>
            </div>
            <div className="rc-control rc-control--sm" style={{ width: '220px', maxWidth: '100%' }}>
              <Search strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" placeholder="Buscar paciente" aria-label="Buscar paciente" />
            </div>
          </div>
          <div className="queue">
            <div className="qrow">
              <span className="rc-num slot__h">09:00</span>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">DM</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Diana Monterroso</span>
                  <span className="rc-person__meta">Limpieza dental</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--success">
                <Check strokeWidth={1.75} aria-hidden="true" />
                Atendida
              </span>
              <div className="qact" />
            </div>
            <div className="qrow">
              <span className="rc-num slot__h">09:30</span>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">KO</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Kevin Orozco</span>
                  <span className="rc-person__meta">Extracción molar 36</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>
              <div className="qact" />
            </div>
            <div className="qrow">
              <span className="rc-num slot__h">10:00</span>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">PL</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Paola Lima</span>
                  <span className="rc-person__meta">Resinas 14 y 15</span>
                </div>
              </div>
              <span className="rc-pill rc-pill--info">
                <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                Confirmada
              </span>
              <div className="qact">
                <button className="rc-btn rc-btn--soft rc-btn--sm">Marcar llegada</button>
              </div>
            </div>
            <div className="qrow">
              <span className="rc-num slot__h">10:30</span>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">HR</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Héctor Ramírez</span>
                  <span className="rc-person__meta">Valoración de ortodoncia</span>
                </div>
              </div>
              <span className="rc-pill "><span className="rc-pill__dot" />Programada</span>
              <div className="qact">
                <button className="rc-btn rc-btn--soft rc-btn--sm">Marcar llegada</button>
              </div>
            </div>
            <div className="qrow">
              <span className="rc-num slot__h">11:00</span>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">AV</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Andrea Velásquez</span>
                  <span className="rc-person__meta">Control de brackets</span>
                </div>
              </div>
              <span className="rc-pill "><span className="rc-pill__dot" />Programada</span>
              <div className="qact">
                <button className="rc-btn rc-btn--soft rc-btn--sm">Marcar llegada</button>
              </div>
            </div>
          </div>
        </section>
        <aside className="col">
          <section className="rc-card form">
            <h2 className="rc-card__title">Registro rápido</h2>
            <p className="rc-card__sub" style={{ marginTop: '-8px' }}>Solo lo necesario para atender hoy; el resto se completa después.</p>
            <div className="rc-field ">
              <label className="rc-label" htmlFor="rr1">Nombre completo <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control ">
                <input className="rc-input" id="rr1" placeholder="Ej. Paola Lima Cruz" />
              </div>
            </div>
            <div className="grid2">
              <div className="rc-field ">
                <label className="rc-label" htmlFor="rr2">Teléfono <span className="rc-req" aria-hidden="true">*</span></label>
                <div className="rc-control ">
                  <Phone strokeWidth={1.75} aria-hidden="true" />
                  <input className="rc-input" id="rr2" placeholder="5512 4478" />
                </div>
              </div>
              <div className="rc-field ">
                <label className="rc-label" htmlFor="rr3">Fecha de nacimiento</label>
                <div className="rc-control ">
                  <input className="rc-input" id="rr3" placeholder="dd/mm/aaaa" />
                </div>
              </div>
            </div>
            <div className="rc-field ">
              <label className="rc-label" htmlFor="rr4">Motivo <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select ">
                <select className="rc-input" id="rr4">
                  <option>Seleccione una opción</option>
                  <option>Limpieza</option>
                  <option>Dolor</option>
                  <option>Resina</option>
                  <option>Extracción</option>
                  <option>Ortodoncia</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            <label className="rc-check">
              <input type="checkbox" defaultChecked />
              <span>Asignar al siguiente turno libre (11:30)</span>
            </label>
            <button className="rc-btn rc-btn--primary rc-btn--lg rc-btn--block" data-toast="Paciente registrado|Turno de las 11:30 con el Dr. Castillo.">
              <UserPlus strokeWidth={1.75} aria-hidden="true" />
              Registrar y dar turno
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

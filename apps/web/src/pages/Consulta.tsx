// Borrador generado desde prototipo.html (vista "consulta") por scripts/prototipo-a-jsx.py.
import { Check, ChevronDown, ChevronRight, Minus, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Consulta() {
  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link to="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li>
            <Link to="/paciente">María José López Ramírez</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">Consulta</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Consulta en curso</h1>
            <p>María José López Ramírez · 34 años · iniciada 08:31</p>
          </div>
          <div className="ph__actions">
            <span className="rc-pill rc-pill--accent rc-pill--live rc-pill--lg"><span className="rc-pill__dot" />En consulta · 12 min</span>
          </div>
        </div>
      </header>
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
        <span className="step is-done">
          <Check strokeWidth={1.75} aria-hidden="true" />
          Motivo
        </span>
        <span className="step is-done">
          <Check strokeWidth={1.75} aria-hidden="true" />
          Signos vitales
        </span>
        <span className="step is-cur">3 · Diagnóstico</span>
        <span className="step">4 · Tratamiento y receta</span>
      </div>
      <section className="rc-card form">
        <h2 className="rc-card__title">Motivo y evolución</h2>
        <div className="rc-field ">
          <label className="rc-label" htmlFor="co1">Motivo de consulta <span className="rc-req" aria-hidden="true">*</span></label>
          <div className="rc-control ">
            <input className="rc-input" id="co1" defaultValue="Control de hipertensión" placeholder="" />
          </div>
        </div>
        <div className="rc-field ">
          <label className="rc-label" htmlFor="co2">Historia de la enfermedad actual</label>
          <div className="rc-control rc-control--area">
            <textarea className="rc-input" id="co2" rows={3} defaultValue="Paciente con HTA diagnosticada hace 2 años, refiere cefalea occipital matutina ocasional. Adherente al tratamiento." />
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <h2 className="rc-card__title">Signos vitales</h2>
        <div className="grid3">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv1">Presión sistólica</label>
            <div className="rc-control is-error rc-num">
              <input className="rc-input" id="sv1" defaultValue="132" placeholder="" />
              <span className="rc-affix">mmHg</span>
            </div>
            <div className="rc-help"><span className="rc-help--error">Por encima de 130.</span></div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv2">Presión diastólica</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv2" defaultValue="84" placeholder="" />
              <span className="rc-affix">mmHg</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv3">Frecuencia cardiaca</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv3" defaultValue="78" placeholder="" />
              <span className="rc-affix">lpm</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv4">Frec. respiratoria</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv4" defaultValue="16" placeholder="" />
              <span className="rc-affix">rpm</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv5">Saturación O₂</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv5" defaultValue="97" placeholder="" />
              <span className="rc-affix">%</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv6">Temperatura</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv6" defaultValue="36.7" placeholder="" />
              <span className="rc-affix">°C</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv7">Peso</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv7" defaultValue="61.4" placeholder="" />
              <span className="rc-affix">kg</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv8">Talla</label>
            <div className="rc-control ">
              <input className="rc-input" id="sv8" defaultValue="158" placeholder="" />
              <span className="rc-affix">cm</span>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="sv9">IMC</label>
            <div className="rc-control is-readonly">
              <input className="rc-input" id="sv9" defaultValue="24.6" placeholder="" readOnly />
            </div>
            <div className="rc-help">Calculado.</div>
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <h2 className="rc-card__title">Diagnóstico</h2>
        <div className="grid2">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="dx1">Tipo <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--select ">
              <select className="rc-input" id="dx1">
                <option>Definitivo</option>
                <option>Presuntivo</option>
                <option>Diferencial</option>
              </select>
              <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="dx2">Diagnóstico final <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <Search strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="dx2" defaultValue="Hipertensión arterial esencial (I10)" placeholder="" />
            </div>
          </div>
        </div>
        <div className="rc-field ">
          <label className="rc-label" htmlFor="dx3">Observaciones</label>
          <div className="rc-control rc-control--area">
            <textarea className="rc-input" id="dx3" rows={2} placeholder="Hallazgos relevantes" />
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <div className="rc-card__header">
          <h2 className="rc-card__title">Receta</h2>
          <button className="rc-btn rc-btn--soft rc-btn--sm">
            <Plus strokeWidth={1.75} aria-hidden="true" />
            Agregar medicamento
          </button>
        </div>
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Vía</th>
                <th>Cada (horas)</th>
                <th>Durante (días)</th>
                <th className="rc-num">Cantidad</th>
                <th className="rc-cell-actions"><span className="rc-sr">Quitar</span></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b>Losartán</b>
                  <div className="muted small">50 mg · tableta</div>
                </td>
                <td>Oral</td>
                <td>
                  <div className="rc-stepper">
                    <button className="rc-stepper__btn" aria-label="Restar">
                      <Minus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <input className="rc-stepper__input" defaultValue="24" aria-label="Frecuencia en horas" />
                    <button className="rc-stepper__btn" aria-label="Sumar">
                      <Plus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="rc-stepper">
                    <button className="rc-stepper__btn" aria-label="Restar">
                      <Minus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <input className="rc-stepper__input" defaultValue="90" aria-label="Duración en días" />
                    <button className="rc-stepper__btn" aria-label="Sumar">
                      <Plus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td className="rc-num"><b>90</b> u</td>
                <td className="rc-cell-actions">
                  <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Quitar">
                    <Trash2 strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Hidroclorotiazida</b>
                  <div className="muted small">12.5 mg · tableta</div>
                </td>
                <td>Oral</td>
                <td>
                  <div className="rc-stepper">
                    <button className="rc-stepper__btn" aria-label="Restar">
                      <Minus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <input className="rc-stepper__input" defaultValue="24" aria-label="Frecuencia en horas" />
                    <button className="rc-stepper__btn" aria-label="Sumar">
                      <Plus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="rc-stepper">
                    <button className="rc-stepper__btn" aria-label="Restar">
                      <Minus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <input className="rc-stepper__input" defaultValue="90" aria-label="Duración en días" />
                    <button className="rc-stepper__btn" aria-label="Sumar">
                      <Plus strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                </td>
                <td className="rc-num"><b>90</b> u</td>
                <td className="rc-cell-actions">
                  <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Quitar">
                    <Trash2 strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rc-card__footer">
          <Link className="rc-btn rc-btn--ghost" to="/paciente">Guardar borrador</Link>
          <button className="rc-btn rc-btn--primary" data-toast="Consulta cerrada|Diagnóstico, tratamiento y receta quedaron registrados.">
            <Check strokeWidth={1.75} aria-hidden="true" />
            Cerrar consulta
          </button>
        </div>
      </section>
    </div>
  );
}

// Borrador generado desde prototipo.html (vista "crecimiento") por scripts/prototipo-a-jsx.py.
import { Baby, ChevronRight, Ruler, ShieldAlert, Syringe, TriangleAlert, Weight } from 'lucide-react';
import Link from 'next/link';

export default function Crecimiento() {
  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">Mateo Juárez Coc</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Mateo Juárez Coc</h1>
            <p>Centro médico pediátrico · 6 años, 7 meses · Masculino · A+</p>
          </div>
          <div className="ph__actions">
            <button className="rc-btn rc-btn--secondary">
              <Syringe strokeWidth={1.75} aria-hidden="true" />
              Registrar vacuna
            </button>
            <button className="rc-btn rc-btn--primary">
              <Ruler strokeWidth={1.75} aria-hidden="true" />
              Nueva medición
            </button>
          </div>
        </div>
      </header>
      <div className="split">
        <div className="col">
          <div className="stats three">
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon">
                  <Weight strokeWidth={1.75} aria-hidden="true" />
                </span>
                Peso
              </span>
              <span className="rc-stat__value">22.1<small>kg</small></span>
              <span className="rc-delta rc-delta--up">P62 <span className="rc-delta__ctx">peso para la edad</span></span>
            </div>
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon">
                  <Ruler strokeWidth={1.75} aria-hidden="true" />
                </span>
                Talla
              </span>
              <span className="rc-stat__value">118.5<small>cm</small></span>
              <span className="rc-delta rc-delta--up">P58 <span className="rc-delta__ctx">talla para la edad</span></span>
            </div>
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon">
                  <Baby strokeWidth={1.75} aria-hidden="true" />
                </span>
                Perímetro cefálico
              </span>
              <span className="rc-stat__value">51.2<small>cm</small></span>
              <span className="rc-delta__ctx small">Dentro de lo esperado</span>
            </div>
          </div>
          <section className="rc-card" style={{ padding: 0, gap: 0 }}>
            <div className="card-h">
              <h2 className="rc-card__title">Control de crecimiento</h2>
              <span className="muted small">Percentiles OMS</span>
            </div>
            <div className="rc-table-wrap flat">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Edad</th>
                    <th className="rc-num">Peso kg</th>
                    <th className="rc-num">Talla cm</th>
                    <th className="rc-num hide-sm">P. cef. cm</th>
                    <th className="rc-num">Peso/edad</th>
                    <th className="rc-num">Talla/edad</th>
                    <th className="rc-num hide-sm">Peso/talla</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rc-num">05/11/2026</td>
                    <td className="rc-num">6 a 7 m</td>
                    <td className="rc-num">22.1</td>
                    <td className="rc-num">118.5</td>
                    <td className="rc-num hide-sm">51.2</td>
                    <td className="rc-num">P62</td>
                    <td className="rc-num">P58</td>
                    <td className="rc-num hide-sm">P64</td>
                  </tr>
                  <tr>
                    <td className="rc-num">06/05/2026</td>
                    <td className="rc-num">6 a 1 m</td>
                    <td className="rc-num">20.4</td>
                    <td className="rc-num">114.0</td>
                    <td className="rc-num hide-sm">51.0</td>
                    <td className="rc-num">P58</td>
                    <td className="rc-num">P55</td>
                    <td className="rc-num hide-sm">P60</td>
                  </tr>
                  <tr>
                    <td className="rc-num">04/11/2025</td>
                    <td className="rc-num">5 a 7 m</td>
                    <td className="rc-num">19.0</td>
                    <td className="rc-num">110.2</td>
                    <td className="rc-num hide-sm">50.8</td>
                    <td className="rc-num">P55</td>
                    <td className="rc-num">P52</td>
                    <td className="rc-num hide-sm">P57</td>
                  </tr>
                  <tr>
                    <td className="rc-num">05/05/2025</td>
                    <td className="rc-num">5 a 1 m</td>
                    <td className="rc-num">17.8</td>
                    <td className="rc-num">106.1</td>
                    <td className="rc-num hide-sm">50.5</td>
                    <td className="rc-num">P53</td>
                    <td className="rc-num">P50</td>
                    <td className="rc-num hide-sm">P55</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Esquema de vacunación</h2>
              <span className="rc-pill rc-pill--danger">
                <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                1 atrasada
              </span>
            </div>
            <div className="vaclist">
              <div className="vac">
                <div>
                  <b>BCG</b>
                  <div className="muted small">Esquema completo</div>
                </div>
                <div className="vac__dots" aria-label="1 de 1 dosis"><i className="on" /><span className="rc-num small muted">1 de 1</span></div>
                <span className="rc-pill rc-pill--success">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Al día
                </span>
              </div>
              <div className="vac">
                <div>
                  <b>Hepatitis B</b>
                  <div className="muted small">Esquema completo</div>
                </div>
                <div className="vac__dots" aria-label="3 de 3 dosis">
                  <i className="on" />
                  <i className="on" />
                  <i className="on" />
                  <span className="rc-num small muted">3 de 3</span>
                </div>
                <span className="rc-pill rc-pill--success">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Al día
                </span>
              </div>
              <div className="vac">
                <div>
                  <b>Pentavalente</b>
                  <div className="muted small">Dosis 3 vencida el 12/10/2026</div>
                </div>
                <div className="vac__dots" aria-label="2 de 3 dosis">
                  <i className="on" />
                  <i className="on" />
                  <i />
                  <span className="rc-num small muted">2 de 3</span>
                </div>
                <span className="rc-pill rc-pill--danger">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Atrasada
                </span>
              </div>
              <div className="vac">
                <div>
                  <b>Polio (IPV/OPV)</b>
                  <div className="muted small">Próxima: 15/01/2027</div>
                </div>
                <div className="vac__dots" aria-label="3 de 4 dosis">
                  <i className="on" />
                  <i className="on" />
                  <i className="on" />
                  <i />
                  <span className="rc-num small muted">3 de 4</span>
                </div>
                <span className="rc-pill rc-pill--warning">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Dosis pendiente
                </span>
              </div>
              <div className="vac">
                <div>
                  <b>SPR</b>
                  <div className="muted small">Esquema completo</div>
                </div>
                <div className="vac__dots" aria-label="2 de 2 dosis">
                  <i className="on" />
                  <i className="on" />
                  <span className="rc-num small muted">2 de 2</span>
                </div>
                <span className="rc-pill rc-pill--success">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Al día
                </span>
              </div>
              <div className="vac">
                <div>
                  <b>DPT refuerzo</b>
                  <div className="muted small">Próxima: 12/03/2027</div>
                </div>
                <div className="vac__dots" aria-label="1 de 2 dosis"><i className="on" /><i /><span className="rc-num small muted">1 de 2</span></div>
                <span className="rc-pill rc-pill--warning">
                  <Syringe strokeWidth={1.75} aria-hidden="true" />
                  Dosis pendiente
                </span>
              </div>
            </div>
          </section>
        </div>
        <aside className="col">
          <div className="rc-alert rc-alert--danger" role="alert">
            <Syringe strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-alert__body">
              <span className="rc-alert__title">Pentavalente atrasada</span>
              <span className="rc-alert__text">La dosis 3 debía aplicarse el 12/10/2026.</span>
              <div className="rc-alert__actions">
                <button className="rc-btn rc-btn--secondary rc-btn--sm">Aplicar hoy</button>
              </div>
            </div>
          </div>
          <section className="rc-card">
            <h2 className="rc-card__title">Responsables</h2>
            <div className="rc-person">
              <span className="rc-avatar ">AC</span>
              <div className="rc-person__text">
                <span className="rc-person__name">Andrea Coc de Juárez</span>
                <span className="rc-person__meta">Madre · tutora legal · 5521 8890</span>
              </div>
            </div>
            <span className="rc-tag">
              <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
              Tutor legal
            </span>
            <div className="rc-person">
              <span className="rc-avatar rc-avatar--neutral">PJ</span>
              <div className="rc-person__text">
                <span className="rc-person__name">Pedro Juárez</span>
                <span className="rc-person__meta">Padre · 4402 1176</span>
              </div>
            </div>
          </section>
          <section className="rc-card">
            <h2 className="rc-card__title">Alergias</h2>
            <div className="tags">
              <span className="rc-tag rc-tag--warning">
                <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                Huevo · moderada
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

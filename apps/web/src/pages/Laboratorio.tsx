// Borrador generado desde prototipo.html (vista "laboratorio") por scripts/prototipo-a-jsx.py.
import { ArrowUp, Check, CircleCheck, Clock, Info, Loader2, Plus, Printer, Send, TriangleAlert } from 'lucide-react';

export default function Laboratorio() {
  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Resultados de laboratorio</h1>
            <p>Laboratorio clínico · 4 exámenes en las últimas 48 h</p>
          </div>
          <div className="ph__actions">
            <button className="rc-btn rc-btn--primary">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Registrar examen
            </button>
          </div>
        </div>
      </header>
      <div className="rc-toolbar">
        <div className="rc-segmented" role="group" aria-label="Tipo de examen">
          <button aria-pressed="true">Todos</button>
          <button aria-pressed="false">Hematología</button>
          <button aria-pressed="false">Orina</button>
          <button aria-pressed="false">Cultivo</button>
          <button aria-pressed="false">Química</button>
        </div>
      </div>
      <div className="split rev">
        <section className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Paciente y examen</th>
                <th className="hide-sm">Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="rc-person">
                    <span className="rc-avatar ">SH</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">Sofía Hernández Pérez</span>
                      <span className="rc-person__meta">Química sanguínea</span>
                    </div>
                  </div>
                </td>
                <td className="rc-num hide-sm">Hoy 07:40</td>
                <td>
                  <span className="rc-pill rc-pill--danger">
                    <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                    Valor crítico
                  </span>
                </td>
              </tr>
              <tr aria-selected="true">
                <td>
                  <div className="rc-person">
                    <span className="rc-avatar ">CA</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">Carlos Ajú Tzul</span>
                      <span className="rc-person__meta">Hematología completa</span>
                    </div>
                  </div>
                </td>
                <td className="rc-num hide-sm">04/11 16:20</td>
                <td>
                  <span className="rc-pill rc-pill--success">
                    <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                    Validado
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="rc-person">
                    <span className="rc-avatar ">MJ</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">Mateo Juárez Coc</span>
                      <span className="rc-person__meta">Orina simple</span>
                    </div>
                  </div>
                </td>
                <td className="rc-num hide-sm">04/11 11:05</td>
                <td>
                  <span className="rc-pill rc-pill--info">
                    <Loader2 strokeWidth={1.75} aria-hidden="true" />
                    En proceso
                  </span>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="rc-person">
                    <span className="rc-avatar ">RG</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">Rosa Gómez de León</span>
                      <span className="rc-person__meta">Urocultivo</span>
                    </div>
                  </div>
                </td>
                <td className="rc-num hide-sm">03/11 09:30</td>
                <td>
                  <span className="rc-pill ">
                    <Clock strokeWidth={1.75} aria-hidden="true" />
                    Pendiente
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section className="rc-card">
          <div className="rc-card__header">
            <div>
              <span className="rc-overline">Hematología completa · LAB-2026-11-0412</span>
              <h2 className="rc-card__title">Carlos Ajú Tzul</h2>
              <p className="rc-card__sub">Muestra 04/11/2026 07:15 · validado por Q.B. Lucía Ramírez 16:20</p>
            </div>
            <span className="rc-pill rc-pill--success">
              <CircleCheck strokeWidth={1.75} aria-hidden="true" />
              Validado
            </span>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th className="rc-num">Resultado</th>
                  <th>Unidad</th>
                  <th className="rc-num">Referencia</th>
                  <th>Interpretación</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hemoglobina</td>
                  <td className="rc-num"><b>13.8</b></td>
                  <td>g/dL</td>
                  <td className="rc-num muted">12.0 – 16.0</td>
                  <td>
                    <span className="rc-pill rc-pill--success">
                      <Check strokeWidth={1.75} aria-hidden="true" />
                      Normal
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Hematocrito</td>
                  <td className="rc-num"><b>41.2</b></td>
                  <td>%</td>
                  <td className="rc-num muted">36 – 46</td>
                  <td>
                    <span className="rc-pill rc-pill--success">
                      <Check strokeWidth={1.75} aria-hidden="true" />
                      Normal
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Leucocitos</td>
                  <td className="rc-num"><b className="hi">11.8</b></td>
                  <td>×10³/µL</td>
                  <td className="rc-num muted">4.5 – 11.0</td>
                  <td>
                    <span className="rc-pill rc-pill--warning">
                      <ArrowUp strokeWidth={1.75} aria-hidden="true" />
                      Alto
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Plaquetas</td>
                  <td className="rc-num"><b>245</b></td>
                  <td>×10³/µL</td>
                  <td className="rc-num muted">150 – 400</td>
                  <td>
                    <span className="rc-pill rc-pill--success">
                      <Check strokeWidth={1.75} aria-hidden="true" />
                      Normal
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Neutrófilos</td>
                  <td className="rc-num"><b className="hi">72</b></td>
                  <td>%</td>
                  <td className="rc-num muted">40 – 70</td>
                  <td>
                    <span className="rc-pill rc-pill--warning">
                      <ArrowUp strokeWidth={1.75} aria-hidden="true" />
                      Alto
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Linfocitos</td>
                  <td className="rc-num"><b>21</b></td>
                  <td>%</td>
                  <td className="rc-num muted">20 – 40</td>
                  <td>
                    <span className="rc-pill rc-pill--success">
                      <Check strokeWidth={1.75} aria-hidden="true" />
                      Normal
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rc-alert">
            <Info strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-alert__body">
              <span className="rc-alert__title">Cada tipo de examen tiene sus propios campos</span>
              <span className="rc-alert__text">
                Una orina muestra aspecto, pH y sedimento; un cultivo, microorganismo y antibiograma. La tabla se arma con los campos del documento.
              </span>
            </div>
          </div>
          <div className="rc-card__footer">
            <button className="rc-btn rc-btn--ghost">
              <Printer strokeWidth={1.75} aria-hidden="true" />
              Imprimir
            </button>
            <button className="rc-btn rc-btn--secondary">
              <Send strokeWidth={1.75} aria-hidden="true" />
              Enviar al médico
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

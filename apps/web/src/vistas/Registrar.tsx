// Borrador generado desde prototipo.html (vista "registrar") por scripts/prototipo-a-jsx.py.
import { CalendarDays, ChevronDown, ChevronRight, Mail, Phone, Plus, ShieldAlert, X } from 'lucide-react';
import Link from 'next/link';

export default function Registrar() {
  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">Registrar paciente</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Registrar paciente</h1>
            <p>Hospital general · los campos con * son obligatorios</p>
          </div>
          <div className="ph__actions" />
        </div>
      </header>
      <section className="rc-card form">
        <h2 className="rc-card__title">Identificación</h2>
        <div className="grid2">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp1">Nombres <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <input className="rc-input" id="rp1" defaultValue="María José" placeholder="" />
            </div>
            <div className="rc-help">Como aparece en el DPI.</div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp2">Apellidos <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <input className="rc-input" id="rp2" defaultValue="López Ramírez" placeholder="" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp3">CUI <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control is-error rc-num">
              <input className="rc-input" id="rp3" defaultValue="2547 8812 01" placeholder="" aria-invalid="true" />
            </div>
            <div className="rc-help"><span className="rc-help--error">El CUI debe tener 13 dígitos. Faltan 3.</span></div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp4">Fecha de nacimiento <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <CalendarDays strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="rp4" defaultValue="14/02/1992" placeholder="" />
            </div>
            <div className="rc-help">Edad calculada: 34 años.</div>
          </div>
        </div>
        <div className="grid3">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp5">Sexo <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--select ">
              <select className="rc-input" id="rp5">
                <option>Femenino</option>
                <option>Masculino</option>
              </select>
              <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp6">Tipo de sangre</label>
            <div className="rc-control rc-control--select ">
              <select className="rc-input" id="rp6">
                <option>O+</option>
                <option>O−</option>
                <option>A+</option>
                <option>A−</option>
                <option>B+</option>
                <option>B−</option>
                <option>AB+</option>
                <option>AB−</option>
              </select>
              <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp7">Procedencia</label>
            <div className="rc-control ">
              <input className="rc-input" id="rp7" defaultValue="Mixco" placeholder="" />
            </div>
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <h2 className="rc-card__title">Contacto</h2>
        <div className="grid2">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp8">Teléfonos</label>
            <div className="rc-control ">
              <Phone strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="rp8" defaultValue="5512 4478" placeholder="" />
            </div>
            <div className="rc-help">
              <button className="rc-link small">+ Agregar otro teléfono</button>
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp9">Correos</label>
            <div className="rc-control is-success">
              <Mail strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="rp9" defaultValue="mjlopez@correo.gt" placeholder="" />
            </div>
            <div className="rc-help"><span className="rc-help--success">Correo con formato válido.</span></div>
          </div>
        </div>
        <div className="rc-field ">
          <label className="rc-label" htmlFor="rp10">Dirección</label>
          <div className="rc-control ">
            <input className="rc-input" id="rp10" defaultValue="5a. avenida 12-40, zona 1, Mixco" placeholder="" />
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <h2 className="rc-card__title">Contacto de emergencia</h2>
        <div className="grid3">
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp11">Nombre completo <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <input className="rc-input" id="rp11" defaultValue="Jorge López Ramírez" placeholder="" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp12">Parentesco <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--select ">
              <select className="rc-input" id="rp12">
                <option>Hermano</option>
                <option>Madre</option>
                <option>Padre</option>
                <option>Cónyuge</option>
                <option>Otro</option>
              </select>
              <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
            </div>
          </div>
          <div className="rc-field ">
            <label className="rc-label" htmlFor="rp13">Teléfono <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control ">
              <Phone strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="rp13" defaultValue="5530 1188" placeholder="" />
            </div>
          </div>
        </div>
      </section>
      <section className="rc-card form">
        <h2 className="rc-card__title">Alergias y antecedentes</h2>
        <div className="tags">
          <span className="rc-tag rc-tag--danger">
            <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
            Penicilina · severa
            <button className="rc-tag__remove" aria-label="Quitar">
              <X strokeWidth={1.75} aria-hidden="true" />
            </button>
          </span>
          <span className="rc-tag">
            Hipertensión arterial
            <button className="rc-tag__remove" aria-label="Quitar">
              <X strokeWidth={1.75} aria-hidden="true" />
            </button>
          </span>
          <button className="rc-btn rc-btn--soft rc-btn--sm">
            <Plus strokeWidth={1.75} aria-hidden="true" />
            Agregar
          </button>
        </div>
        <div className="grid3 checks">
          <label className="rc-check">
            <input type="checkbox" defaultChecked />
            <span>Hipertensión</span>
          </label>
          <label className="rc-check">
            <input type="checkbox" />
            <span>Diabetes</span>
          </label>
          <label className="rc-check">
            <input type="checkbox" />
            <span>Asma</span>
          </label>
          <label className="rc-check">
            <input type="checkbox" />
            <span>Cardiopatía</span>
          </label>
          <label className="rc-check">
            <input type="checkbox" />
            <span>Cirugías previas</span>
          </label>
          <label className="rc-check">
            <input type="checkbox" />
            <span>Tabaquismo</span>
          </label>
        </div>
        <div className="rc-card__footer">
          <Link className="rc-btn rc-btn--ghost" href="/pacientes">Cancelar</Link>
          <button className="rc-btn rc-btn--primary" data-toast="Paciente registrado|Expediente HG-2026-004812 creado.">Registrar paciente</button>
        </div>
      </section>
    </div>
  );
}

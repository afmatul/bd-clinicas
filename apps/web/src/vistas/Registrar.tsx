'use client';
// Vista "registrar" del prototipo, conectada a POST /pacientes y, con el id nuevo,
// a POST /pacientes/:id/alergias y /antecedentes (módulo antecedentes).
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronRight, Mail, Phone, Plus, ShieldAlert, X } from 'lucide-react';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput, RegistrarPacienteInput } from '@red-clinica/shared';
import { ApiError } from '../api/cliente';
import { registrarPaciente } from '../api/pacientes';
import { registrarAlergia, registrarAntecedente } from '../api/antecedentes';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ModalCuadroClinico, type Registro } from '../componentes/ModalCuadroClinico';
import { edad, formatoSangre } from '../datos/formato';

const SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const COMUNES = ['Hipertensión', 'Diabetes', 'Asma', 'Cardiopatía', 'Cirugías previas', 'Tabaquismo'];
const soloDigitos = (s: FormDataEntryValue | null) => String(s ?? '').replace(/\D/g, '');
const texto = (s: FormDataEntryValue | null) => String(s ?? '').trim() || undefined;

type Errores = Record<string, string>;

function Ayuda({ error, children }: { error?: string; children?: React.ReactNode }) {
  if (error) return <div className="rc-help"><span className="rc-help--error">{error}</span></div>;
  return children ? <div className="rc-help">{children}</div> : null;
}

export default function Registrar() {
  const { perfil } = useSesion();
  const toast = useToast();
  const router = useRouter();
  const pediatrico = perfil?.institucion.clave === 'pediatrico';

  const [nacimiento, setNacimiento] = useState('');
  const [telefonos, setTelefonos] = useState(['']);
  const [alergias, setAlergias] = useState<RegistrarAlergiaInput[]>([]);
  const [otros, setOtros] = useState<RegistrarAntecedenteInput[]>([]);
  const [comunes, setComunes] = useState<string[]>([]);
  const [modal, setModal] = useState<Registro | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const input: RegistrarPacienteInput = {
      nombres: String(f.get('nombres') ?? ''),
      apellidos: String(f.get('apellidos') ?? ''),
      cui: soloDigitos(f.get('cui')) || undefined,
      fechaNacimiento: String(f.get('nacimiento') ?? ''),
      sexo: f.get('sexo') as 'F' | 'M',
      tipoSangre: texto(f.get('sangre')),
      procedencia: texto(f.get('procedencia')),
      direccion: texto(f.get('direccion')),
      telefonos: telefonos.map((t) => t.replace(/\D/g, '')).filter(Boolean),
      emails: texto(f.get('email')) ? [texto(f.get('email'))!] : [],
      responsable: pediatrico
        ? {
            nombreCompleto: String(f.get('resp_nombre') ?? '').trim(),
            parentesco: String(f.get('resp_parentesco') ?? ''),
            telefonos: [soloDigitos(f.get('resp_telefono'))].filter(Boolean),
            esTutorLegal: true,
          }
        : undefined,
    };
    const err: Errores = {};
    if (input.cui && input.cui.length !== 13) err.cui = `El CUI debe tener 13 dígitos. ${input.cui.length < 13 ? `Faltan ${13 - input.cui.length}` : `Sobran ${input.cui.length - 13}`}.`;
    if (pediatrico && !input.responsable?.nombreCompleto) err['responsable.nombreCompleto'] = 'Escriba el nombre del responsable.';
    setErrores(err);
    setMensaje(null);
    if (Object.keys(err).length) return;

    setEnviando(true);
    let id: string;
    try {
      ({ id } = await registrarPaciente(input));
    } catch (ex) {
      setEnviando(false);
      if (ex instanceof ApiError && Object.keys(ex.campos).length) setErrores(ex.campos);
      setMensaje((ex as Error).message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // El paciente ya existe: lo que falle del cuadro clínico se avisa y se completa desde la ficha.
    const antecedentes = [...comunes.map((tipo) => ({ tipo })), ...otros];
    const resultados = await Promise.allSettled([
      ...alergias.map((a) => registrarAlergia(id, a)),
      ...antecedentes.map((a) => registrarAntecedente(id, a)),
    ]);
    const fallidos = resultados.filter((r) => r.status === 'rejected').length;
    toast('Paciente registrado', fallidos
      ? `${input.nombres} ${input.apellidos} quedó registrado, pero ${fallidos} de sus alergias o antecedentes no se guardaron. Agréguelos desde la ficha.`
      : `${input.nombres} ${input.apellidos} quedó registrado.`);
    router.push(`/pacientes/${id}`);
  };

  const campo = (id: string, nombre: string, etiqueta: string, opts: { req?: boolean; ayuda?: string; ph?: string; tipo?: string; icono?: React.ReactNode; num?: boolean } = {}) => (
    <div className="rc-field">
      <label className="rc-label" htmlFor={id}>{etiqueta} {opts.req && <span className="rc-req" aria-hidden="true">*</span>}</label>
      <div className={`rc-control${opts.num ? ' rc-num' : ''}${errores[nombre] ? ' is-error' : ''}`}>
        {opts.icono}
        <input className="rc-input" id={id} name={nombre} type={opts.tipo ?? 'text'} placeholder={opts.ph} aria-invalid={!!errores[nombre] || undefined} />
      </div>
      <Ayuda error={errores[nombre]}>{opts.ayuda}</Ayuda>
    </div>
  );

  return (
    <>
      <form className="view" onSubmit={guardar} noValidate>
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
              <p>{perfil?.institucion.nombre} · los campos con * son obligatorios</p>
            </div>
            <div className="ph__actions" />
          </div>
        </header>
        {mensaje && (
          <div className="rc-alert rc-alert--danger" role="alert">
            <div className="rc-alert__body"><span className="rc-alert__title">No pudimos registrar al paciente</span><span className="rc-alert__text">{mensaje}</span></div>
          </div>
        )}
        <section className="rc-card form">
          <h2 className="rc-card__title">Identificación</h2>
          <div className="grid2">
            {campo('rp1', 'nombres', 'Nombres', { req: true, ayuda: 'Como aparece en el DPI.' })}
            {campo('rp2', 'apellidos', 'Apellidos', { req: true })}
            {campo('rp3', 'cui', 'CUI', { req: !pediatrico, num: true, ph: '2547 88120 0101', ayuda: pediatrico ? 'Si el menor aún no tiene CUI, déjelo vacío.' : undefined })}
            <div className="rc-field">
              <label className="rc-label" htmlFor="rp4">Fecha de nacimiento <span className="rc-req" aria-hidden="true">*</span></label>
              <div className={`rc-control${errores.fechaNacimiento ? ' is-error' : ''}`}>
                <CalendarDays strokeWidth={1.75} aria-hidden="true" />
                <input className="rc-input" id="rp4" name="nacimiento" type="date" value={nacimiento} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNacimiento(e.target.value)} />
              </div>
              <Ayuda error={errores.fechaNacimiento}>{nacimiento ? `Edad calculada: ${edad(nacimiento)} años.` : undefined}</Ayuda>
            </div>
          </div>
          <div className="grid3">
            <div className="rc-field">
              <label className="rc-label" htmlFor="rp5">Sexo <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select">
                <select className="rc-input" id="rp5" name="sexo">
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            <div className="rc-field">
              <label className="rc-label" htmlFor="rp6">Tipo de sangre</label>
              <div className="rc-control rc-control--select">
                <select className="rc-input" id="rp6" name="sangre" defaultValue="">
                  <option value="">Sin dato</option>
                  {SANGRE.map((s) => <option key={s} value={s}>{formatoSangre(s)}</option>)}
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
            {campo('rp7', 'procedencia', 'Procedencia', { ph: 'Mixco' })}
          </div>
        </section>
        <section className="rc-card form">
          <h2 className="rc-card__title">Contacto</h2>
          <div className="grid2">
            <div className="rc-field">
              <label className="rc-label" htmlFor="rp8">Teléfonos</label>
              {telefonos.map((t, i) => (
                <div className={`rc-control${errores[`telefonos.${i}`] ? ' is-error' : ''}`} key={i}>
                  <Phone strokeWidth={1.75} aria-hidden="true" />
                  <input className="rc-input" id={i === 0 ? 'rp8' : undefined} aria-label={i ? `Teléfono ${i + 1}` : undefined} value={t} inputMode="tel" placeholder="5512 4478"
                    onChange={(e) => setTelefonos((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
                </div>
              ))}
              <Ayuda error={Object.entries(errores).find(([k]) => k.startsWith('telefonos'))?.[1]}>
                <button type="button" className="rc-link small" onClick={() => setTelefonos((xs) => [...xs, ''])}>+ Agregar otro teléfono</button>
              </Ayuda>
            </div>
            {campo('rp9', 'email', 'Correos', { tipo: 'email', icono: <Mail strokeWidth={1.75} aria-hidden="true" />, ph: 'nombre@correo.gt' })}
          </div>
          {campo('rp10', 'direccion', 'Dirección', { ph: '5a. avenida 12-40, zona 1, Mixco' })}
        </section>
        {pediatrico && (
          <section className="rc-card form">
            <h2 className="rc-card__title">Responsable</h2>
            <div className="grid3">
              {campo('rp11', 'resp_nombre', 'Nombre completo', { req: true })}
              <div className="rc-field">
                <label className="rc-label" htmlFor="rp12">Parentesco <span className="rc-req" aria-hidden="true">*</span></label>
                <div className="rc-control rc-control--select">
                  <select className="rc-input" id="rp12" name="resp_parentesco">
                    <option>Madre</option>
                    <option>Padre</option>
                    <option>Abuela</option>
                    <option>Abuelo</option>
                    <option>Tutor legal</option>
                    <option>Otro</option>
                  </select>
                  <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
                </div>
              </div>
              {campo('rp13', 'resp_telefono', 'Teléfono', { req: true, icono: <Phone strokeWidth={1.75} aria-hidden="true" /> })}
            </div>
            <Ayuda error={errores['responsable.nombreCompleto']} />
          </section>
        )}
        <section className="rc-card form">
          <h2 className="rc-card__title">Alergias y antecedentes</h2>
          <div className="tags">
            {alergias.map((a, i) => (
              <span key={`a${i}`} className={`rc-tag ${a.severidad === 'SEVERA' ? 'rc-tag--danger' : a.severidad === 'MODERADA' ? 'rc-tag--warning' : 'rc-tag--info'}`}>
                {a.severidad === 'SEVERA' && <ShieldAlert strokeWidth={1.75} aria-hidden="true" />}
                {a.tipo} · {a.severidad.toLowerCase()}
                <button type="button" className="rc-tag__remove" aria-label={`Quitar ${a.tipo}`} onClick={() => setAlergias((xs) => xs.filter((_, j) => j !== i))}>
                  <X strokeWidth={1.75} aria-hidden="true" />
                </button>
              </span>
            ))}
            {otros.map((a, i) => (
              <span key={`h${i}`} className="rc-tag">
                {a.tipo}
                <button type="button" className="rc-tag__remove" aria-label={`Quitar ${a.tipo}`} onClick={() => setOtros((xs) => xs.filter((_, j) => j !== i))}>
                  <X strokeWidth={1.75} aria-hidden="true" />
                </button>
              </span>
            ))}
            <button type="button" className="rc-btn rc-btn--soft rc-btn--sm" onClick={() => setModal('alergia')}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Agregar
            </button>
          </div>
          <div className="grid3 checks">
            {COMUNES.map((c) => (
              <label className="rc-check" key={c}>
                <input type="checkbox" checked={comunes.includes(c)}
                  onChange={(e) => setComunes((xs) => (e.target.checked ? [...xs, c] : xs.filter((x) => x !== c)))} />
                <span>{c}</span>
              </label>
            ))}
          </div>
          <div className="rc-card__footer">
            <Link className="rc-btn rc-btn--ghost" href="/pacientes">Cancelar</Link>
            <button type="submit" className="rc-btn rc-btn--primary" disabled={enviando}>
              {enviando && <span className="rc-spinner" aria-hidden="true" />}
              Registrar paciente
            </button>
          </div>
        </section>
      </form>
      {modal && (
        <ModalCuadroClinico inicial={modal} onCerrar={() => setModal(null)}
          enviar={async (r) => {
            const repetido = (r.tipo === 'alergia' ? alergias : otros).some((x) => x.tipo.toLowerCase() === r.datos.tipo.toLowerCase());
            if (repetido) throw new ApiError(409, '', { tipo: `"${r.datos.tipo}" ya está en la lista.` });
            if (r.tipo === 'alergia') setAlergias((xs) => [...xs, r.datos]);
            else setOtros((xs) => [...xs, r.datos]);
          }}
          onGuardado={() => setModal(null)} />
      )}
    </>
  );
}

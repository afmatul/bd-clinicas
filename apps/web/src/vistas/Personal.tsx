'use client';
// Directorio de personal de la institución (módulo personal). No hay vista en el prototipo: se arma
// con los mismos componentes de la vista "pacientes" (PageHeader, Toolbar, Table, EmptyState, Modal).
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, IdCard, Settings, Stethoscope, UserPlus } from 'lucide-react';
import { CampoBusqueda } from '../componentes/CampoBusqueda';
import { Selector } from '../componentes/Selector';
import type { Departamento, Especialidad, Profesional } from '@red-clinica/shared';
import {
  asignarEspecialidad, departamentos as cargarDepartamentos, especialidades as cargarEspecialidades, listarPersonal,
  quitarEspecialidad, registrarProfesional,
} from '../api/personal';
import { ApiError } from '../api/cliente';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { Modal } from '../layout/Modal';
import { formatoNumero, iniciales, varianteAvatar } from '../datos/formato';

const TITULO: Record<string, string> = { hospital: 'Médicos', pediatrico: 'Pediatras', laboratorio: 'Personal del laboratorio', odontologia: 'Odontólogos' };

function ModalRegistrar({ hospital, catalogo, onCerrar, onGuardado }: {
  hospital: boolean; catalogo: Especialidad[]; onCerrar(): void; onGuardado(nombre: string): void;
}) {
  const [error, setError] = useState<{ mensaje: string; campos: Record<string, string> } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const especialidades = hospital
      ? f.getAll('especialidad').map(String)
      : String(f.get('especialidades') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const input = {
      nombres: String(f.get('nombres') ?? ''), apellidos: String(f.get('apellidos') ?? ''),
      numeroColegiado: String(f.get('colegiado') ?? ''), especialidades,
    };
    setEnviando(true);
    setError(null);
    try {
      await registrarProfesional(input);
      onGuardado(`${input.nombres} ${input.apellidos}`);
    } catch (err) {
      setError({ mensaje: (err as Error).message, campos: err instanceof ApiError ? err.campos : {} });
      setEnviando(false);
    }
  };

  const campo = (id: string, nombre: string, etiqueta: string, req = true) => (
    <div className="rc-field">
      <label className="rc-label" htmlFor={id}>{etiqueta} {req && <span className="rc-req" aria-hidden="true">*</span>}</label>
      <div className={`rc-control${error?.campos[nombre] ? ' is-error' : ''}`}><input className="rc-input" id={id} name={nombre} /></div>
      {error?.campos[nombre] && <div className="rc-help"><span className="rc-help--error">{error.campos[nombre]}</span></div>}
    </div>
  );

  return (
    <Modal titulo="¿A quién registramos?" icono={UserPlus} onCerrar={onCerrar}
      pie={<>
        <button type="button" className="rc-btn rc-btn--ghost" onClick={onCerrar}>Volver</button>
        <button type="submit" form="form-personal" className="rc-btn rc-btn--primary" disabled={enviando}>
          {enviando && <span className="rc-spinner" aria-hidden="true" />}
          Registrar profesional
        </button>
      </>}>
      <form id="form-personal" className="col" onSubmit={guardar} noValidate>
        <div className="grid2">
          {campo('rp-nombres', 'nombres', 'Nombres')}
          {campo('rp-apellidos', 'apellidos', 'Apellidos')}
        </div>
        <div className="rc-field">
          <label className="rc-label" htmlFor="rp-col">Número de colegiado <span className="rc-req" aria-hidden="true">*</span></label>
          <div className={`rc-control rc-num${error?.campos.numeroColegiado ? ' is-error' : ''}`}><input className="rc-input" id="rp-col" name="colegiado" placeholder="COL-10234" /></div>
          {error?.campos.numeroColegiado && <div className="rc-help"><span className="rc-help--error">{error.campos.numeroColegiado}</span></div>}
        </div>
        {hospital ? (
          <fieldset className="rc-field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="rc-label">Especialidades</legend>
            <div className="grid2 checks">
              {catalogo.map((e) => (
                <label className="rc-check" key={e.id}><input type="checkbox" name="especialidad" value={e.id} /><span>{e.nombre}</span></label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="rc-field">
            <label className="rc-label" htmlFor="rp-esp">Especialidades</label>
            <div className="rc-control"><input className="rc-input" id="rp-esp" name="especialidades" placeholder="Separadas por comas" /></div>
          </div>
        )}
        {error && !Object.keys(error.campos).length && (
          <div className="rc-alert rc-alert--danger" role="alert"><div className="rc-alert__body"><span className="rc-alert__text">{error.mensaje}</span></div></div>
        )}
      </form>
    </Modal>
  );
}

/** Hospital: marcar o desmarcar especialidades escribe en la tabla puente medico_especialidad. */
function ModalEspecialidades({ profesional, catalogo, onCerrar, onCambio }: {
  profesional: Profesional; catalogo: Especialidad[]; onCerrar(): void; onCambio(p: Profesional): void;
}) {
  const [actual, setActual] = useState(profesional);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tiene = (id: string) => actual.especialidades.some((e) => e.id === id);

  const cambiar = async (id: string) => {
    setOcupado(id);
    setError(null);
    try {
      const p = tiene(id) ? await quitarEspecialidad(actual.id, id) : await asignarEspecialidad(actual.id, id);
      setActual(p);
      onCambio(p);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Modal titulo={`Especialidades de ${actual.nombres} ${actual.apellidos}`} icono={Stethoscope} onCerrar={onCerrar}
      pie={<button type="button" className="rc-btn rc-btn--primary" onClick={onCerrar}>Listo</button>}>
      <span>Cada cambio se guarda al momento y queda en la bitácora.</span>
      <div className="grid2 checks">
        {catalogo.map((e) => (
          <label className="rc-check" key={e.id}>
            <input type="checkbox" checked={tiene(e.id)} disabled={ocupado !== null} onChange={() => cambiar(e.id)} />
            <span>{e.nombre}</span>
          </label>
        ))}
      </div>
      {error && <div className="rc-alert rc-alert--danger" role="alert"><div className="rc-alert__body"><span className="rc-alert__text">{error}</span></div></div>}
    </Modal>
  );
}

export default function Personal() {
  const { perfil } = useSesion();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get('q') ?? '';
  const especialidad = params.get('especialidad') ?? '';

  const [items, setItems] = useState<Profesional[] | null>(null);
  const [catalogo, setCatalogo] = useState<Especialidad[]>([]);
  const [deptos, setDeptos] = useState<Departamento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [registrar, setRegistrar] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);

  const clave = perfil?.institucion.clave ?? 'hospital';
  const hospital = clave === 'hospital';
  const admin = perfil?.usuario.rol === 'ADMIN';

  const cargar = useCallback(() => {
    setError(null);
    listarPersonal({ q: q || undefined, especialidad: especialidad || undefined })
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, [q, especialidad]);
  useEffect(cargar, [cargar]);

  useEffect(() => {
    cargarEspecialidades().then(setCatalogo).catch(() => undefined);
    if (hospital) cargarDepartamentos().then(setDeptos).catch(() => undefined);
  }, [hospital]);

  const cambiar = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">{TITULO[clave]}</h1>
            <p>{items ? `${formatoNumero(items.length)} profesionales · ` : ''}{perfil?.institucion.nombre} · directorio público</p>
          </div>
          {admin && (
            <div className="ph__actions">
              <button className="rc-btn rc-btn--primary" onClick={() => setRegistrar(true)}>
                <UserPlus strokeWidth={1.75} aria-hidden="true" />
                Registrar profesional
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="rc-toolbar">
        <CampoBusqueda valor={q} onBuscar={(t) => cambiar({ q: t || undefined })}
          placeholder="Buscar por nombre o colegiado" etiqueta="Buscar profesional" />
        {catalogo.length > 1 && (
          <Selector pequeno aria-label="Especialidad" value={especialidad} onChange={(v) => cambiar({ especialidad: v || undefined })}>
            <option value="">Especialidad: todas</option>
            {catalogo.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Selector>
        )}
        <button className="rc-btn rc-btn--ghost rc-btn--sm" disabled={!q && !especialidad} onClick={() => cambiar({ q: undefined, especialidad: undefined })}>
          Limpiar filtros
        </button>
      </div>
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos cargar el personal</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="rc-table-wrap">
        <table className="rc-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Especialidades</th>
              {admin && hospital && <th className="rc-cell-actions"><span className="rc-sr">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {!items && !error && Array.from({ length: 4 }, (_, i) => (
              <tr key={i}><td colSpan={3}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
            ))}
            {items?.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="rc-person">
                    <span className={`rc-avatar ${varianteAvatar(p.id)}`}>{iniciales(p.nombres, p.apellidos)}</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">{p.nombres} {p.apellidos}</span>
                      <span className="rc-person__meta rc-num">Colegiado {p.numeroColegiado}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="tags">
                    {p.especialidades.length
                      ? p.especialidades.map((e) => <span key={e.id} className="rc-tag">{e.nombre}</span>)
                      : <span className="muted small">Sin especialidad asignada</span>}
                  </div>
                </td>
                {admin && hospital && (
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label={`Especialidades de ${p.nombres} ${p.apellidos}`} onClick={() => setEditando(p)}>
                      <Settings strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items && items.length === 0 && (
          <div className="rc-empty">
            <span className="rc-empty__icon"><IdCard strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="rc-empty__title">{q || especialidad ? 'Sin profesionales que coincidan' : 'Aún no hay personal registrado'}</span>
            <span className="rc-empty__text">{q || especialidad ? 'Revise el nombre o quite el filtro de especialidad.' : 'El personal aparece aquí cuando administración lo registra.'}</span>
          </div>
        )}
      </div>
      {hospital && deptos.length > 0 && (
        <section className="rc-card">
          <div className="rc-card__header">
            <h2 className="rc-card__title">Departamentos</h2>
            <Building2 strokeWidth={1.75} aria-hidden="true" className="muted" />
          </div>
          <dl className="rc-dl">
            {deptos.map((d) => (
              <div key={d.id}>
                <dt>{d.nombre}</dt>
                <dd>
                  {d.especialidades.map((e) => e.nombre).join(', ') || '—'}
                  {(d.ubicacion || d.extension) && <span className="muted small"><br />{[d.ubicacion, d.extension && `Ext. ${d.extension}`].filter(Boolean).join(' · ')}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {registrar && (
        <ModalRegistrar hospital={hospital} catalogo={catalogo} onCerrar={() => setRegistrar(false)}
          onGuardado={(n) => { setRegistrar(false); toast('Profesional registrado', `${n} ya aparece en el directorio.`); cargar(); }} />
      )}
      {editando && (
        <ModalEspecialidades profesional={editando} catalogo={catalogo} onCerrar={() => setEditando(null)}
          onCambio={(p) => setItems((xs) => xs?.map((x) => (x.id === p.id ? p : x)) ?? xs)} />
      )}
    </div>
  );
}

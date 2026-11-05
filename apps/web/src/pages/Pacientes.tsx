// Vista "pacientes" del prototipo, conectada a GET /api/pacientes (mismo JSON en los cuatro motores).
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Download, MoreVertical, Search, UserPlus, Users } from 'lucide-react';
import type { EstadoPaciente } from '@red-clinica/shared';
import { useSesion } from '../app/sesion';
import { buscarPacientes, type PaginaPacientes } from '../api/pacientes';
import { edad, formatoCui, formatoNumero, formatoSangre, formatoTelefono, iniciales, varianteAvatar } from '../datos/formato';

const POR_PAGINA = 20;
const SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** Páginas visibles como en el prototipo: 1 2 3 … última. */
function paginas(actual: number, total: number): (number | '…')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, actual - 1, actual, actual + 1, total].filter((p) => p >= 1 && p <= total));
  const orden = [...set].sort((a, b) => a - b);
  return orden.flatMap((p, i) => (i > 0 && p - orden[i - 1]! > 1 ? ['…' as const, p] : [p]));
}

export default function Pacientes() {
  const { perfil } = useSesion();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const estado = (params.get('estado') as EstadoPaciente | null) ?? undefined;
  const sexo = (params.get('sexo') as 'F' | 'M' | null) ?? undefined;
  const tipoSangre = params.get('sangre') ?? undefined;
  const pagina = Number(params.get('pagina') ?? 1);

  const [datos, setDatos] = useState<PaginaPacientes | null>(null);
  const [conteo, setConteo] = useState<{ todos: number; activos: number; baja: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    buscarPacientes({ q: q || undefined, estado, sexo, tipoSangre, pagina, porPagina: POR_PAGINA })
      .then((d) => vigente && setDatos(d))
      .catch((e: Error) => vigente && setError(e.message));
    return () => { vigente = false; };
  }, [q, estado, sexo, tipoSangre, pagina]);

  useEffect(() => {
    Promise.all([
      buscarPacientes({ porPagina: 1 }),
      buscarPacientes({ estado: 'BAJA', porPagina: 1 }),
    ]).then(([t, b]) => setConteo({ todos: t.total, activos: t.total - b.total, baja: b.total })).catch(() => undefined);
  }, []);

  const cambiar = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k);
    if (!('pagina' in cambios)) p.delete('pagina');
    setParams(p, { replace: true });
  };

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;
  const desde = datos && datos.total ? (pagina - 1) * POR_PAGINA + 1 : 0;
  const hasta = datos ? Math.min(pagina * POR_PAGINA, datos.total) : 0;
  const hayFiltros = !!(q || sexo || tipoSangre);

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Pacientes</h1>
            <p>
              {conteo ? `${formatoNumero(conteo.activos)} activos · ${formatoNumero(conteo.baja)} de baja · ` : ''}
              {perfil?.institucion.nombre}
            </p>
          </div>
          <div className="ph__actions">
            <button className="rc-btn rc-btn--secondary" data-toast="Exportación pendiente|Se conecta con el módulo de auditoría.">
              <Download strokeWidth={1.75} aria-hidden="true" />
              Exportar
            </button>
            <Link className="rc-btn rc-btn--primary" to="/registrar">
              <UserPlus strokeWidth={1.75} aria-hidden="true" />
              Registrar paciente
            </Link>
          </div>
        </div>
      </header>
      <div className="rc-tabs" role="tablist" data-controlado>
        <button className="rc-tab" role="tab" aria-selected={estado !== 'BAJA'} onClick={() => cambiar({ estado: undefined })}>
          Todos <span className={`rc-badge ${estado !== 'BAJA' ? 'rc-badge--soft' : 'rc-badge--neutral'}`}>{conteo ? formatoNumero(conteo.todos) : '–'}</span>
        </button>
        {/* Se activan con los módulos agenda y antecedentes. */}
        <button className="rc-tab" role="tab" aria-selected={false} disabled>Con cita hoy</button>
        <button className="rc-tab" role="tab" aria-selected={false} disabled>Alergias severas</button>
        <button className="rc-tab" role="tab" aria-selected={estado === 'BAJA'} onClick={() => cambiar({ estado: 'BAJA' })}>
          De baja <span className={`rc-badge ${estado === 'BAJA' ? 'rc-badge--soft' : 'rc-badge--neutral'}`}>{conteo ? formatoNumero(conteo.baja) : '–'}</span>
        </button>
      </div>
      <div className="rc-toolbar">
        <form className="rc-control rc-control--sm grow" role="search"
          onSubmit={(e) => { e.preventDefault(); cambiar({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined }); }}>
          <Search strokeWidth={1.75} aria-hidden="true" />
          <input className="rc-input" name="q" key={q} defaultValue={q} placeholder="Buscar por nombre, CUI o expediente" aria-label="Buscar paciente" />
        </form>
        <div className="rc-control rc-control--select rc-control--sm">
          <select className="rc-input" aria-label="Sexo" value={sexo ?? ''} onChange={(e) => cambiar({ sexo: e.target.value || undefined })}>
            <option value="">Sexo: todos</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
          <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
        </div>
        <div className="rc-control rc-control--select rc-control--sm">
          <select className="rc-input" aria-label="Tipo de sangre" value={tipoSangre ?? ''} onChange={(e) => cambiar({ sangre: e.target.value || undefined })}>
            <option value="">Sangre: todos</option>
            {SANGRE.map((s) => <option key={s} value={s}>{formatoSangre(s)}</option>)}
          </select>
          <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
        </div>
        <button className="rc-btn rc-btn--ghost rc-btn--sm" disabled={!hayFiltros} onClick={() => cambiar({ q: undefined, sexo: undefined, sangre: undefined })}>
          Limpiar filtros
        </button>
      </div>
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos cargar los pacientes</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="rc-table-wrap">
        <table className="rc-table">
          <thead>
            <tr>
              <th className="rc-cell-check">
                <label className="rc-check">
                  <input type="checkbox" aria-label="Seleccionar todos" />
                </label>
              </th>
              <th aria-sort="ascending">
                <button>
                  Paciente
                  <ArrowUp strokeWidth={1.75} aria-hidden="true" />
                </button>
              </th>
              <th className="rc-num">
                <button>
                  Edad
                  <ChevronsUpDown strokeWidth={1.75} aria-hidden="true" />
                </button>
              </th>
              <th className="hide-sm">Sexo</th>
              <th className="hide-sm">Sangre</th>
              <th className="hide-sm">Teléfono</th>
              <th className="hide-sm">
                <button>
                  Próxima cita
                  <ChevronsUpDown strokeWidth={1.75} aria-hidden="true" />
                </button>
              </th>
              <th>Estado</th>
              <th className="rc-cell-actions"><span className="rc-sr">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            {!datos && !error && Array.from({ length: 5 }, (_, i) => (
              <tr key={i}><td colSpan={9}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
            ))}
            {datos?.items.map((p) => {
              const nombre = `${p.nombres} ${p.apellidos}`;
              return (
                <tr key={p.id}>
                  <td className="rc-cell-check">
                    <label className="rc-check">
                      <input type="checkbox" aria-label={`Seleccionar ${nombre}`} />
                    </label>
                  </td>
                  <td>
                    <Link className="rowlink" to={`/pacientes/${p.id}`}>
                      <div className="rc-person">
                        <span className={`rc-avatar ${varianteAvatar(p.id)}`}>{iniciales(p.nombres, p.apellidos)}</span>
                        <div className="rc-person__text">
                          <span className="rc-person__name">{nombre}</span>
                          <span className="rc-person__meta">CUI {formatoCui(p.cui)}</span>
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="rc-num">{edad(p.fechaNacimiento)}</td>
                  <td className="hide-sm">{p.sexo ?? '—'}</td>
                  <td className="hide-sm">{formatoSangre(p.tipoSangre)}</td>
                  <td className="rc-num hide-sm">{formatoTelefono(p.telefono)}</td>
                  {/* Próxima cita: llega con el módulo agenda. */}
                  <td className="rc-num hide-sm">—</td>
                  <td>
                    {p.estado === 'ACTIVO'
                      ? <span className="rc-pill rc-pill--success"><span className="rc-pill__dot" />Activo</span>
                      : <span className="rc-pill"><span className="rc-pill__dot" />De baja</span>}
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label={`Acciones para ${nombre}`}>
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {datos && datos.items.length === 0 && (
          <div className="rc-empty">
            <span className="rc-empty__icon"><Users strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="rc-empty__title">Sin pacientes que coincidan</span>
            <span className="rc-empty__text">Revise el CUI o los apellidos, o registre al paciente si es de nuevo ingreso.</span>
          </div>
        )}
      </div>
      <nav className="rc-pagination" aria-label="Paginación">
        <span className="rc-num">Mostrando {desde}–{hasta} de {formatoNumero(datos?.total ?? 0)} pacientes</span>
        <div className="rc-pagination__pages">
          <button className="rc-page" aria-label="Anterior" disabled={pagina <= 1} onClick={() => cambiar({ pagina: String(pagina - 1) })}>
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </button>
          {paginas(pagina, totalPaginas).map((p, i) =>
            p === '…'
              ? <span key={`e${i}`} aria-hidden="true">…</span>
              : <button key={p} className="rc-page" aria-current={p === pagina ? 'page' : undefined} onClick={() => cambiar({ pagina: String(p) })}>{p}</button>,
          )}
          <button className="rc-page" aria-label="Siguiente" disabled={pagina >= totalPaginas} onClick={() => cambiar({ pagina: String(pagina + 1) })}>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </nav>
    </div>
  );
}

'use client';
// Bitácora de la institución (módulo auditoria), solo para el rol AUDITOR. No hay vista en el prototipo:
// se arma con los componentes de la vista "pacientes" (PageHeader, Toolbar, Table, Pagination, EmptyState).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { AccionBitacora } from '@red-clinica/shared';
import { buscarBitacora, urlExportarBitacora, type PaginaBitacora } from '../api/auditoria';
import { useSesion } from '../lib/sesion';
import { CampoBusqueda } from '../componentes/CampoBusqueda';
import { Selector } from '../componentes/Selector';
import { SelectorFecha } from '../componentes/SelectorFecha';
import { NOMBRE_ROL, formatoFechaHora, formatoNumero, inicialesDeNombre, varianteAvatar } from '../datos/formato';

const POR_PAGINA = 25;

const ACCION: Record<AccionBitacora, { texto: string; pill: string }> = {
  LOGIN: { texto: 'Inicio de sesión', pill: '' },
  LOGOUT: { texto: 'Cierre de sesión', pill: '' },
  LEER: { texto: 'Lectura', pill: 'rc-pill--info' },
  CREAR: { texto: 'Alta', pill: 'rc-pill--success' },
  MODIFICAR: { texto: 'Cambio', pill: 'rc-pill--warning' },
  BAJA: { texto: 'Baja', pill: 'rc-pill--danger' },
  EXPORTAR: { texto: 'Exportación', pill: 'rc-pill--accent' },
};

export default function Bitacora() {
  const { perfil } = useSesion();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filtros = {
    usuario: params.get('usuario') ?? undefined,
    accion: (params.get('accion') as AccionBitacora | null) ?? undefined,
    idPaciente: params.get('paciente') ?? undefined,
    desde: params.get('desde') ?? undefined,
    hasta: params.get('hasta') ?? undefined,
  };
  const pagina = Number(params.get('pagina') ?? 1);
  const clave = params.toString();

  const [datos, setDatos] = useState<PaginaBitacora | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setError(null);
    buscarBitacora({ ...filtros, pagina, porPagina: POR_PAGINA })
      .then((d) => vigente && setDatos(d))
      .catch((e: Error) => vigente && setError(e.message));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  const cambiar = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k);
    if (!('pagina' in cambios)) p.delete('pagina');
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;
  const desde = datos && datos.total ? (pagina - 1) * POR_PAGINA + 1 : 0;
  const hasta = datos ? Math.min(pagina * POR_PAGINA, datos.total) : 0;
  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Bitácora</h1>
            <p>Quién vio, registró o cambió cada expediente · {perfil?.institucion.nombre}</p>
          </div>
          <div className="ph__actions">
            <a className="rc-btn rc-btn--secondary" href={urlExportarBitacora(filtros)} download>
              <Download strokeWidth={1.75} aria-hidden="true" />
              Exportar CSV
            </a>
          </div>
        </div>
      </header>
      <div className="rc-toolbar">
        <CampoBusqueda valor={filtros.usuario ?? ''} onBuscar={(t) => cambiar({ usuario: t || undefined })}
          placeholder="Usuario (p. ej. aperez)" etiqueta="Usuario" />
        <Selector pequeno aria-label="Acción" value={filtros.accion ?? ''} onChange={(v) => cambiar({ accion: v || undefined })}>
          <option value="">Acción: todas</option>
          {AccionBitacora.options.map((a) => <option key={a} value={a}>{ACCION[a].texto}</option>)}
        </Selector>
        <SelectorFecha pequeno aria-label="Desde" placeholder="Desde" max={filtros.hasta} value={filtros.desde ?? ''} onChange={(f) => cambiar({ desde: f || undefined })} />
        <SelectorFecha pequeno aria-label="Hasta" placeholder="Hasta" min={filtros.desde} value={filtros.hasta ?? ''} onChange={(f) => cambiar({ hasta: f || undefined })} />
        <button className="rc-btn rc-btn--ghost rc-btn--sm" disabled={!hayFiltros}
          onClick={() => cambiar({ usuario: undefined, accion: undefined, paciente: undefined, desde: undefined, hasta: undefined })}>
          Limpiar filtros
        </button>
      </div>
      {filtros.idPaciente && (
        <div className="rc-alert" role="status">
          <div className="rc-alert__body">
            <span className="rc-alert__text">Mostrando solo el expediente <Link className="rc-link" href={`/pacientes/${filtros.idPaciente}`}>{filtros.idPaciente}</Link>.</span>
          </div>
        </div>
      )}
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos cargar la bitácora</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="rc-table-wrap">
        <table className="rc-table">
          <thead>
            <tr>
              <th className="rc-num">Fecha y hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th className="hide-sm">Registro</th>
              <th className="hide-sm">Expediente</th>
              <th className="rc-num hide-sm">IP</th>
            </tr>
          </thead>
          <tbody>
            {!datos && !error && Array.from({ length: 6 }, (_, i) => (
              <tr key={i}><td colSpan={6}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
            ))}
            {datos?.items.map((e) => (
              <tr key={e.id}>
                <td className="rc-num">{formatoFechaHora(e.momento)}</td>
                <td>
                  {e.usuario ? (
                    <button className="rowlink" style={{ border: 0, background: 'none', padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                      onClick={() => cambiar({ usuario: e.usuario!.username })} title={`Ver solo a ${e.usuario.username}`}>
                      <div className="rc-person">
                        <span className={`rc-avatar rc-avatar--sm ${varianteAvatar(e.usuario.id)}`}>{inicialesDeNombre(e.usuario.nombre)}</span>
                        <div className="rc-person__text">
                          <span className="rc-person__name">{e.usuario.nombre}</span>
                          <span className="rc-person__meta">{e.usuario.username} · {NOMBRE_ROL[e.usuario.rol]}</span>
                        </div>
                      </div>
                    </button>
                  ) : <span className="muted">Sistema</span>}
                </td>
                <td><span className={`rc-pill ${ACCION[e.accion].pill}`}><span className="rc-pill__dot" />{ACCION[e.accion].texto}</span></td>
                <td className="hide-sm">{e.entidad ? `${e.entidad}${e.idRegistro ? ` · ${e.idRegistro}` : ''}` : '—'}</td>
                <td className="hide-sm">
                  {e.idPaciente
                    ? <button className="rc-link" onClick={() => cambiar({ paciente: e.idPaciente! })}>{e.idPaciente}</button>
                    : '—'}
                </td>
                <td className="rc-num hide-sm">{e.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {datos && datos.items.length === 0 && (
          <div className="rc-empty">
            <span className="rc-empty__icon"><FileText strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="rc-empty__title">{hayFiltros ? 'Sin movimientos que coincidan' : 'La bitácora está vacía'}</span>
            <span className="rc-empty__text">{hayFiltros ? 'Amplíe el rango de fechas o quite filtros.' : 'Cada inicio de sesión, lectura y cambio aparecerá aquí.'}</span>
          </div>
        )}
      </div>
      <nav className="rc-pagination" aria-label="Paginación">
        <span className="rc-num">Mostrando {desde}–{hasta} de {formatoNumero(datos?.total ?? 0)} movimientos</span>
        <div className="rc-pagination__pages">
          <button className="rc-page" aria-label="Anterior" disabled={pagina <= 1} onClick={() => cambiar({ pagina: String(pagina - 1) })}>
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </button>
          <span className="rc-num small">{pagina} / {totalPaginas}</span>
          <button className="rc-page" aria-label="Siguiente" disabled={pagina >= totalPaginas} onClick={() => cambiar({ pagina: String(pagina + 1) })}>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </nav>
    </div>
  );
}

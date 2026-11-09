'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Baby, Bell, CalendarDays, ChevronsUpDown, ClipboardList, FileText, FlaskConical, Hospital, IdCard, LayoutDashboard,
  LogOut, Menu, Moon, Ruler, Search, Smile, Stethoscope, UserPlus, UserRound, Users, type LucideProps,
} from 'lucide-react';
import { INSTITUCIONES, type InstitucionClave, type Rol } from '@red-clinica/shared';
import logo from '@red-clinica/design-system/logos/red-clinica-horizontal.svg';
import { useSesion } from '../lib/sesion';
import { MODO_DEMO } from '../datos/demo';
import { useInteraccionesPrototipo } from './useInteraccionesPrototipo';
import { CampoBusqueda } from '../componentes/CampoBusqueda';
import { ModalMisDatos } from '../componentes/ModalMisDatos';
import { useToast } from './Toasts';
import { agenda } from '../api/agenda';
import { ahoraLocal } from '../datos/formato';

type Icono = ComponentType<LucideProps>;

const ICONO_INSTITUCION: Record<InstitucionClave, Icono> = {
  hospital: Hospital, pediatrico: Baby, laboratorio: FlaskConical, odontologia: Smile,
};

/** Navegación del prototipo: cada ítem se muestra solo en las instituciones de su data-for. */
const TODAS: InstitucionClave[] = ['hospital', 'pediatrico', 'laboratorio', 'odontologia'];
const NAV: { to: string; label: string; icono: Icono; para: InstitucionClave[]; roles?: Rol[]; badge?: { n: number; soft?: boolean } }[] = [
  { to: '/', label: 'Inicio', icono: LayoutDashboard, para: ['hospital', 'pediatrico', 'laboratorio', 'odontologia'] },
  { to: '/pacientes', label: 'Pacientes', icono: Users, para: ['hospital', 'pediatrico', 'laboratorio', 'odontologia'] },
  { to: '/citas', label: 'Citas', icono: CalendarDays, para: ['hospital', 'pediatrico', 'odontologia'], badge: { n: 0, soft: true } },
  { to: '/consulta', label: 'Consulta', icono: Stethoscope, para: ['hospital', 'pediatrico'] },
  { to: '/crecimiento', label: 'Crecimiento y vacunas', icono: Ruler, para: ['pediatrico'] },
  { to: '/laboratorio', label: 'Resultados', icono: FlaskConical, para: ['laboratorio'], badge: { n: 1 } },
  { to: '/recepcion', label: 'Recepción', icono: ClipboardList, para: ['odontologia'] },
  // Módulos personal y auditoria (sin vista en el prototipo).
  { to: '/personal', label: 'Personal', icono: IdCard, para: TODAS },
  { to: '/bitacora', label: 'Bitácora', icono: FileText, para: TODAS, roles: ['AUDITOR', 'ADMIN'] },
];

/** "Dra. Ana Lucía Pérez" → "AP": primer nombre + apellido, sin el título. */
const iniciales = (nombre: string) => {
  const p = nombre.replace(/^(Dra?\.|Lic\.)\s*/, '').split(/\s+/).filter(Boolean);
  return `${p[0]?.[0] ?? ''}${p.length > 1 ? p[p.length - 1]![0] : ''}`.toUpperCase();
};

/** Enlace de navegación con aria-current="page" cuando su ruta está activa (como en el prototipo). */
function NavItem({ href, exacto, children }: { href: string; exacto?: boolean; children: ReactNode }) {
  const ruta = usePathname();
  const activo = exacto ? ruta === href : ruta === href || ruta.startsWith(`${href}/`);
  return <Link className="rc-nav-item" href={href} aria-current={activo ? 'page' : undefined}>{children}</Link>;
}

/** Shell de la app: sidebar + topbar del prototipo. Las páginas se pintan en children. */
export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, cerrarSesion, cambiarInstitucion } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const navigate = (r: string) => router.push(r);
  const [navAbierta, setNavAbierta] = useState(false);
  const [menuInst, setMenuInst] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [editando, setEditando] = useState(false);
  const toast = useToast();
  const [citasHoy, setCitasHoy] = useState(0);
  useInteraccionesPrototipo();

  // Citas pendientes de hoy del médico de la sesión; si no tiene agenda propia, no se muestra contador.
  useEffect(() => {
    if (!perfil) return;
    const hoy = ahoraLocal().fecha;
    agenda({ desde: hoy })
      .then((r) => setCitasHoy(r.citas.filter((c) => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA').length))
      .catch(() => setCitasHoy(0));
  }, [perfil, pathname]);

  useEffect(() => { setNavAbierta(false); window.scrollTo(0, 0); }, [pathname]);
  // Tema: claro por defecto; solo se pasa a oscuro si el usuario lo eligió antes.
  useEffect(() => {
    try { document.documentElement.dataset.theme = localStorage.getItem('tema') === 'dark' ? 'dark' : 'light'; } catch { /* sin almacenamiento: queda el claro */ }
  }, []);
  useEffect(() => {
    if (!menuUsuario) return;
    const cerrar = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.instwrap')) setMenuUsuario(false); };
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [menuUsuario]);
  useEffect(() => {
    if (!menuInst) return;
    const cerrar = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.instwrap')) setMenuInst(false); };
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [menuInst]);

  if (!perfil) return null;
  const inst = perfil.institucion;
  const IconoInst = ICONO_INSTITUCION[inst.clave];
  const ini = iniciales(perfil.usuario.nombre);
  // La institución viene del usuario; solo el ADMIN (o el modo demo) puede pasar a otra.
  const puedeCambiar = perfil.usuario.rol === 'ADMIN' || MODO_DEMO;

  const cambiarTema = () => {
    const root = document.documentElement;
    const siguiente = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = siguiente;
    try { localStorage.setItem('tema', siguiente); } catch { /* sin almacenamiento: el cambio dura la sesión */ }
  };

  return (
    <div className={`app${navAbierta ? ' nav-open' : ''}`}>
      <nav className="rc-sidebar" aria-label="Principal">
        <div className="rc-sidebar__brand">
          <img src={logo.src} alt="Red Clínica" style={{ height: '28px', width: 'auto' }} />
        </div>
        <div className="instwrap">
          <button
            className={`rc-inst-switch rc-inst--${inst.clave}`}
            aria-haspopup={puedeCambiar ? 'listbox' : undefined}
            aria-expanded={puedeCambiar ? menuInst : undefined}
            onClick={() => puedeCambiar && setMenuInst((v) => !v)}
            style={{ width: '100%', font: 'inherit', color: 'inherit', textAlign: 'left' }}
          >
            <span className="rc-inst-switch__icon"><IconoInst strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="rc-inst-switch__text">
              <span className="rc-inst-switch__name">{inst.nombre}</span>
              <span className="rc-inst-switch__engine">{INSTITUCIONES[inst.clave].motorNombre}</span>
            </span>
            {puedeCambiar && <ChevronsUpDown strokeWidth={1.75} aria-hidden="true" />}
          </button>
          {puedeCambiar && menuInst && (
            <div className="rc-menu" role="listbox">
              {Object.values(INSTITUCIONES).map((i) => {
                const Ic = ICONO_INSTITUCION[i.clave];
                return (
                  <button key={i.clave} className="rc-option" role="option" aria-selected={i.clave === inst.clave}
                    onClick={async () => {
                      setMenuInst(false);
                      if (i.clave !== inst.clave) {
                        try { await cambiarInstitucion(i.clave); navigate('/'); }
                        catch { toast('No se pudo cambiar de institución', 'Intente de nuevo.'); }
                      }
                    }}>
                    <span className={`rc-inst-switch__icon rc-inst--${i.clave}`} style={{ width: '28px', height: '28px' }}>
                      <Ic strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="rc-inst-switch__text">
                      <span className="rc-inst-switch__name">{i.nombre}</span>
                      <span className="rc-inst-switch__engine">{i.motorNombre}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="rc-sidebar__section">
          {NAV.filter((n) => n.para.includes(inst.clave) && (!n.roles || n.roles.includes(perfil.usuario.rol))).map(({ to, label, icono: Ic, badge }) => (
            <NavItem key={to} href={to} exacto={to === '/'}>
              <Ic strokeWidth={1.75} aria-hidden="true" />
              {label}
              {badge && (to === '/citas' ? citasHoy : badge.n) > 0 && (
                <span className={`rc-badge${badge.soft ? ' rc-badge--soft' : ''}`}>{to === '/citas' ? citasHoy : badge.n}</span>
              )}
            </NavItem>
          ))}
        </div>
        <div className="rc-sidebar__section">
          <span className="rc-overline">Cuenta</span>
          <NavItem href="/registrar">
            <UserPlus strokeWidth={1.75} aria-hidden="true" />
            Registrar paciente
          </NavItem>
        </div>
        <div className="rc-sidebar__user">
          <span className="rc-avatar rc-avatar--sm rc-avatar--solid">{ini}</span>
          <div className="rc-person__text" style={{ flex: 1, minWidth: 0 }}>
            <span className="rc-person__name ellip" style={{ fontSize: '13px' }}>{perfil.usuario.nombre}</span>
            <span className="rc-person__meta ellip">{inst.nombre}</span>
          </div>
        </div>
      </nav>
      <div className="scrim" onClick={() => setNavAbierta(false)} />
      <div className="main">
        <div className="topbar">
          <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon menu-btn" aria-label="Abrir menú" onClick={() => setNavAbierta(true)}>
            <Menu strokeWidth={1.75} aria-hidden="true" />
          </button>
          <CampoBusqueda
            valor="" className="rc-control rc-control--sm" placeholder="Buscar paciente por nombre o CUI" etiqueta="Buscar paciente"
            onBuscar={(q) => {
              if (!q) return;
              const destino = `/pacientes?q=${encodeURIComponent(q)}`;
              // Ya en Pacientes, la lista se actualiza sin sumar una entrada al historial por cada pausa.
              if (pathname.startsWith('/pacientes')) router.replace(destino); else navigate(destino);
            }}
          />
          <span className="sp" />
          <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon" aria-label="Cambiar tema" onClick={cambiarTema}>
            <Moon strokeWidth={1.75} aria-hidden="true" />
          </button>
          <span className="rc-badge-anchor">
            <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon" aria-label="Notificaciones, 3 nuevas">
              <Bell strokeWidth={1.75} aria-hidden="true" />
            </button>
            <span className="rc-badge">3</span>
          </span>
          <div className="instwrap" style={{ position: 'relative' }}>
            <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon" aria-label="Menú de usuario"
              aria-haspopup="menu" aria-expanded={menuUsuario}
              onClick={() => setMenuUsuario((v) => !v)}>
              <span className="rc-avatar rc-avatar--sm rc-avatar--solid">{ini}</span>
            </button>
            {menuUsuario && (
              <div className="rc-menu" role="menu" style={{ right: 0, left: 'auto', minWidth: '220px' }}>
                <div className="rc-person" style={{ padding: '8px 12px' }}>
                  <div className="rc-person__text">
                    <span className="rc-person__name ellip">{perfil.usuario.nombre}</span>
                    <span className="rc-person__meta ellip">@{perfil.usuario.username}</span>
                  </div>
                </div>
                <button className="rc-option" role="menuitem" onClick={() => { setMenuUsuario(false); setEditando(true); }}>
                  <UserRound strokeWidth={1.75} aria-hidden="true" />
                  Mis datos
                </button>
                <button className="rc-option" role="menuitem" onClick={async () => { setMenuUsuario(false); await cerrarSesion(); navigate('/login'); }}>
                  <LogOut strokeWidth={1.75} aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
        {editando && (
          <ModalMisDatos onCerrar={() => setEditando(false)} onGuardado={() => { setEditando(false); toast('Datos actualizados', 'Sus cambios quedaron guardados.'); }} />
        )}
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

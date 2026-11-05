'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Baby, Bell, CalendarDays, ChevronsUpDown, ClipboardList, FlaskConical, Hospital, LayoutDashboard,
  LogOut, Menu, Moon, Ruler, Search, Smile, Stethoscope, UserPlus, Users, type LucideProps,
} from 'lucide-react';
import { INSTITUCIONES, type InstitucionClave } from '@red-clinica/shared';
import logo from '@red-clinica/design-system/logos/red-clinica-horizontal.svg';
import { useSesion } from '../lib/sesion';
import { useInteraccionesPrototipo } from './useInteraccionesPrototipo';

type Icono = ComponentType<LucideProps>;

const ICONO_INSTITUCION: Record<InstitucionClave, Icono> = {
  hospital: Hospital, pediatrico: Baby, laboratorio: FlaskConical, odontologia: Smile,
};

/** Navegación del prototipo: cada ítem se muestra solo en las instituciones de su data-for. */
const NAV: { to: string; label: string; icono: Icono; para: InstitucionClave[]; badge?: { n: number; soft?: boolean } }[] = [
  { to: '/', label: 'Inicio', icono: LayoutDashboard, para: ['hospital', 'pediatrico', 'laboratorio', 'odontologia'] },
  { to: '/pacientes', label: 'Pacientes', icono: Users, para: ['hospital', 'pediatrico', 'laboratorio', 'odontologia'] },
  { to: '/citas', label: 'Citas', icono: CalendarDays, para: ['hospital', 'pediatrico', 'odontologia'], badge: { n: 14, soft: true } },
  { to: '/consulta', label: 'Consulta', icono: Stethoscope, para: ['hospital', 'pediatrico'] },
  { to: '/crecimiento', label: 'Crecimiento y vacunas', icono: Ruler, para: ['pediatrico'] },
  { to: '/laboratorio', label: 'Resultados', icono: FlaskConical, para: ['laboratorio'], badge: { n: 1 } },
  { to: '/recepcion', label: 'Recepción', icono: ClipboardList, para: ['odontologia'] },
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
  const { perfil, cerrarSesion, cambiarInstitucionDemo } = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const navigate = (r: string) => router.push(r);
  const [navAbierta, setNavAbierta] = useState(false);
  const [menuInst, setMenuInst] = useState(false);
  useInteraccionesPrototipo();

  useEffect(() => { setNavAbierta(false); window.scrollTo(0, 0); }, [pathname]);
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

  const cambiarTema = () => {
    const root = document.documentElement;
    const oscuro = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = oscuro ? 'light' : 'dark';
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
            aria-haspopup={cambiarInstitucionDemo ? 'listbox' : undefined}
            aria-expanded={cambiarInstitucionDemo ? menuInst : undefined}
            onClick={() => cambiarInstitucionDemo && setMenuInst((v) => !v)}
            style={{ width: '100%', font: 'inherit', color: 'inherit', textAlign: 'left' }}
          >
            <span className="rc-inst-switch__icon"><IconoInst strokeWidth={1.75} aria-hidden="true" /></span>
            <span className="rc-inst-switch__text">
              <span className="rc-inst-switch__name">{inst.nombre}</span>
              <span className="rc-inst-switch__engine">{INSTITUCIONES[inst.clave].motorNombre}</span>
            </span>
            {cambiarInstitucionDemo && <ChevronsUpDown strokeWidth={1.75} aria-hidden="true" />}
          </button>
          {cambiarInstitucionDemo && menuInst && (
            <div className="rc-menu" role="listbox">
              {Object.values(INSTITUCIONES).map((i) => {
                const Ic = ICONO_INSTITUCION[i.clave];
                return (
                  <button key={i.clave} className="rc-option" role="option" aria-selected={i.clave === inst.clave}
                    onClick={() => { cambiarInstitucionDemo(i.clave); setMenuInst(false); navigate('/'); }}>
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
          {NAV.filter((n) => n.para.includes(inst.clave)).map(({ to, label, icono: Ic, badge }) => (
            <NavItem key={to} href={to} exacto={to === '/'}>
              <Ic strokeWidth={1.75} aria-hidden="true" />
              {label}
              {badge && <span className={`rc-badge${badge.soft ? ' rc-badge--soft' : ''}`}>{badge.n}</span>}
            </NavItem>
          ))}
        </div>
        <div className="rc-sidebar__section">
          <span className="rc-overline">Cuenta</span>
          <NavItem href="/registrar">
            <UserPlus strokeWidth={1.75} aria-hidden="true" />
            Registrar paciente
          </NavItem>
          <button className="rc-nav-item" style={{ border: 0, background: 'none', width: '100%', font: 'inherit', textAlign: 'left' }}
            onClick={async () => { await cerrarSesion(); navigate('/login'); }}>
            <LogOut strokeWidth={1.75} aria-hidden="true" />
            Cerrar sesión
          </button>
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
          <form className="rc-control rc-control--sm" role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get('q');
              navigate(`/pacientes?q=${encodeURIComponent(String(q ?? ''))}`);
            }}>
            <Search strokeWidth={1.75} aria-hidden="true" />
            <input className="rc-input" name="q" placeholder="Buscar paciente por nombre o CUI" aria-label="Buscar paciente" />
          </form>
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
          <span className="rc-avatar rc-avatar--sm rc-avatar--solid">{ini}</span>
        </div>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Baby, CircleAlert, FlaskConical, Hospital, Lock, Smile, User } from 'lucide-react';
import logo from '@red-clinica/design-system/logos/red-clinica-horizontal.svg';
import { useSesion } from '../lib/sesion';
import { ApiError } from '../api/cliente';
import { MODO_DEMO } from '../datos/demo';

const RECORDAR = 'rc-usuario-recordado';
const leerRecordado = () => { try { return localStorage.getItem(RECORDAR) ?? ''; } catch { return ''; } };

/** Vista "login" del prototipo, conectada a POST /api/auth/login. */
export default function Login() {
  const { perfil, iniciarSesion } = useSesion();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recordado, setRecordado] = useState('');
  useEffect(() => setRecordado(leerRecordado()), []);
  useEffect(() => { if (perfil) router.replace('/'); }, [perfil, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const username = String(f.get('username') ?? '').trim();
    const password = String(f.get('password') ?? '');
    if (!username || (!password && !MODO_DEMO)) return setError('Escriba su usuario y su contraseña.');
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion({ username, password });
      try { if (f.get('recordar')) localStorage.setItem(RECORDAR, username); else localStorage.removeItem(RECORDAR); } catch { /* sin almacenamiento */ }
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos conectar con el servidor. Revise que la API esté corriendo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="login__brand">
        <div>
          <img src={logo.src} alt="Red Clínica" style={{ height: '34px', width: 'auto' }} />
        </div>
        <div className="login__claim">
          <h2>Un solo historial clínico para cuatro instituciones.</h2>
          <p>
            Hospital general, Centro pediátrico, Laboratorio clínico y Clínica odontológica, cada una con su propia base de datos.
          </p>
        </div>
        <div className="login__insts">
          <span><Hospital strokeWidth={1.75} aria-hidden="true" />Hospital general</span>
          <span><Baby strokeWidth={1.75} aria-hidden="true" />Centro pediátrico</span>
          <span><FlaskConical strokeWidth={1.75} aria-hidden="true" />Laboratorio clínico</span>
          <span><Smile strokeWidth={1.75} aria-hidden="true" />Clínica odontológica</span>
        </div>
      </div>
      <div className="login__form">
        <form className="form" onSubmit={onSubmit} noValidate>
          <div>
            <h1 className="h1">Iniciar sesión</h1>
            <p className="muted">Use el usuario que le asignó su institución.</p>
          </div>
          {error && (
            <div className="rc-alert rc-alert--danger" role="alert">
              <CircleAlert strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body"><span className="rc-alert__text">{error}</span></div>
            </div>
          )}
          <div className="rc-field">
            <label className="rc-label" htmlFor="lg2">Usuario <span className="rc-req" aria-hidden="true">*</span></label>
            <div className={`rc-control${error ? ' is-error' : ''}`}>
              <User strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="lg2" name="username" autoComplete="username" key={recordado} defaultValue={recordado || (MODO_DEMO ? 'aperez' : '')} aria-invalid={!!error} />
            </div>
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="lg3">Contraseña <span className="rc-req" aria-hidden="true">*</span></label>
            <div className={`rc-control${error ? ' is-error' : ''}`}>
              <Lock strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" id="lg3" name="password" placeholder="••••••••" type="password" autoComplete="current-password" aria-invalid={!!error} />
            </div>
          </div>
          <div className="row between">
            <label className="rc-check">
              <input type="checkbox" name="recordar" key={`r${recordado}`} defaultChecked={!!recordado} />
              <span>Recordar usuario</span>
            </label>
            <button type="button" className="rc-link small" data-toast="Contacte a su administrador|Él puede restablecer su contraseña desde la base plataforma.">Olvidé mi contraseña</button>
          </div>
          <button className="rc-btn rc-btn--primary rc-btn--lg rc-btn--block" type="submit" disabled={enviando}>
            {enviando ? <><span className="rc-spinner" aria-hidden="true" />Entrando…</> : 'Entrar'}
          </button>
          <p className="muted small center">Acceso solo para personal autorizado. Cada ingreso queda en bitácora.</p>
        </form>
      </div>
    </div>
  );
}

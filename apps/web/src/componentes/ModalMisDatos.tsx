'use client';
// Modal "Mis datos": el usuario cambia su nombre y/o su contraseña desde el menú del avatar.
import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { ActualizarPerfilInput } from '@red-clinica/shared';
import { ApiError } from '../api/cliente';
import { Modal } from '../layout/Modal';
import { useSesion } from '../lib/sesion';

export function ModalMisDatos({ onCerrar, onGuardado }: { onCerrar(): void; onGuardado(): void }) {
  const { perfil, actualizarPerfil } = useSesion();
  const [error, setError] = useState<{ mensaje: string; campos: Record<string, string> } | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!perfil) return null;

  const guardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nombre = String(f.get('nombre') ?? '').trim();
    const passwordActual = String(f.get('passwordActual') ?? '');
    const passwordNueva = String(f.get('passwordNueva') ?? '');
    const cambios = {
      nombre: nombre && nombre !== perfil.usuario.nombre ? nombre : undefined,
      passwordActual: passwordNueva ? passwordActual : undefined,
      passwordNueva: passwordNueva || undefined,
    };
    setEnviando(true);
    setError(null);
    const valido = ActualizarPerfilInput.safeParse(cambios);
    if (!valido.success) {
      const campos: Record<string, string> = {};
      for (const i of valido.error.issues) campos[String(i.path[0] ?? 'general')] = i.message;
      setError({ mensaje: valido.error.issues[0]?.message ?? 'Revise los datos.', campos });
      setEnviando(false);
      return;
    }
    try {
      await actualizarPerfil(valido.data);
      onGuardado();
    } catch (err) {
      setError({ mensaje: (err as Error).message, campos: err instanceof ApiError ? err.campos : {} });
      setEnviando(false);
    }
  };

  const campo = (id: string, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement>, clave: string) => (
    <div className="rc-field">
      <label className="rc-label" htmlFor={id}>{etiqueta}</label>
      <div className={`rc-control${error?.campos[clave] ? ' is-error' : ''}`}>
        <input className="rc-input" id={id} name={clave} {...props} />
      </div>
      {error?.campos[clave] && <div className="rc-help"><span className="rc-help--error">{error.campos[clave]}</span></div>}
    </div>
  );

  return (
    <Modal titulo="Mis datos" icono={UserRound} onCerrar={onCerrar}
      pie={<>
        <button type="button" className="rc-btn rc-btn--ghost" onClick={onCerrar}>Volver</button>
        <button type="submit" form="form-mis-datos" className="rc-btn rc-btn--primary" disabled={enviando}>
          {enviando && <span className="rc-spinner" aria-hidden="true" />}
          Guardar cambios
        </button>
      </>}>
      <form id="form-mis-datos" className="col" onSubmit={guardar} noValidate>
        {campo('md-usuario', 'Usuario', { value: perfil.usuario.username, readOnly: true, disabled: true }, 'username')}
        {campo('md-nombre', 'Nombre', { defaultValue: perfil.usuario.nombre, maxLength: 150, autoComplete: 'name' }, 'nombre')}
        <span className="rc-overline">Cambiar contraseña (opcional)</span>
        {campo('md-actual', 'Contraseña actual', { type: 'password', autoComplete: 'current-password' }, 'passwordActual')}
        {campo('md-nueva', 'Contraseña nueva', { type: 'password', autoComplete: 'new-password', minLength: 8 }, 'passwordNueva')}
        {error && !Object.keys(error.campos).length && (
          <div className="rc-alert rc-alert--danger" role="alert">
            <div className="rc-alert__body"><span className="rc-alert__text">{error.mensaje}</span></div>
          </div>
        )}
      </form>
    </Modal>
  );
}

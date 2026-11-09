'use client';

import { useState } from 'react';
import { ClipboardList, ShieldAlert } from 'lucide-react';
import { Selector } from './Selector';
import type { RegistrarAlergiaInput, RegistrarAntecedenteInput, Severidad } from '@red-clinica/shared';
import { ApiError } from '../api/cliente';
import { Modal } from '../layout/Modal';

export type Registro = 'alergia' | 'antecedente';

export type NuevoRegistro =
  | { tipo: 'alergia'; datos: RegistrarAlergiaInput }
  | { tipo: 'antecedente'; datos: RegistrarAntecedenteInput };

/**
 * Formulario corto (Modal) para una alergia o un antecedente. `enviar` decide qué hacer:
 * en la ficha lo guarda en la API; al registrar un paciente lo agrega a la lista del formulario.
 */
export function ModalCuadroClinico({ inicial, enviar, onCerrar, onGuardado }: {
  inicial: Registro; enviar(r: NuevoRegistro): Promise<void>; onCerrar(): void; onGuardado(tipo: Registro, nombre: string): void;
}) {
  const [tipo, setTipo] = useState<Registro>(inicial);
  const [error, setError] = useState<{ mensaje: string; campos: Record<string, string> } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nombre = String(f.get('tipo') ?? '').trim();
    const descripcion = String(f.get('descripcion') ?? '').trim() || undefined;
    setEnviando(true);
    setError(null);
    try {
      if (nombre.length < 2) throw new ApiError(400, '', { tipo: tipo === 'alergia' ? 'Indique a qué es alérgico el paciente.' : 'Indique el antecedente.' });
      await enviar(tipo === 'alergia'
        ? { tipo, datos: { tipo: nombre, descripcion, severidad: f.get('severidad') as Severidad } }
        : { tipo, datos: { tipo: nombre, descripcion } });
      onGuardado(tipo, nombre);
    } catch (err) {
      setError({ mensaje: (err as Error).message, campos: err instanceof ApiError ? err.campos : {} });
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={tipo === 'alergia' ? '¿Qué alergia agregamos?' : '¿Qué antecedente agregamos?'} icono={tipo === 'alergia' ? ShieldAlert : ClipboardList}
      onCerrar={onCerrar}
      pie={<>
        <button type="button" className="rc-btn rc-btn--ghost" onClick={onCerrar}>Volver</button>
        <button type="submit" form="form-cuadro" className="rc-btn rc-btn--primary" disabled={enviando}>
          {enviando && <span className="rc-spinner" aria-hidden="true" />}
          {tipo === 'alergia' ? 'Agregar alergia' : 'Agregar antecedente'}
        </button>
      </>}>
      <form id="form-cuadro" className="col" onSubmit={guardar} noValidate>
        <div className="rc-segmented" role="group" aria-label="Tipo de registro">
          <button type="button" aria-pressed={tipo === 'alergia'} onClick={() => setTipo('alergia')}>Alergia</button>
          <button type="button" aria-pressed={tipo === 'antecedente'} onClick={() => setTipo('antecedente')}>Antecedente</button>
        </div>
        <div className="rc-field">
          <label className="rc-label" htmlFor="cc-tipo">
            {tipo === 'alergia' ? 'Alérgico a' : 'Antecedente'} <span className="rc-req" aria-hidden="true">*</span>
          </label>
          <div className={`rc-control${error?.campos.tipo ? ' is-error' : ''}`}>
            <input className="rc-input" id="cc-tipo" name="tipo" required maxLength={100}
              placeholder={tipo === 'alergia' ? 'Penicilina, polen, mariscos…' : 'Hipertensión arterial, apendicectomía 2015…'} />
          </div>
          {error?.campos.tipo && <div className="rc-help"><span className="rc-help--error">{error.campos.tipo}</span></div>}
        </div>
        {tipo === 'alergia' && (
          <div className="rc-field">
            <label className="rc-label" htmlFor="cc-sev">Severidad <span className="rc-req" aria-hidden="true">*</span></label>
            <Selector id="cc-sev" name="severidad" defaultValue="MODERADA">
              <option value="LEVE">Leve</option>
              <option value="MODERADA">Moderada</option>
              <option value="SEVERA">Severa</option>
            </Selector>
          </div>
        )}
        <div className="rc-field">
          <label className="rc-label" htmlFor="cc-desc">Detalle</label>
          <div className="rc-control">
            <input className="rc-input" id="cc-desc" name="descripcion" maxLength={2000}
              placeholder={tipo === 'alergia' ? 'Reacción, año, indicaciones' : 'Año, tratamiento, parentesco'} />
          </div>
        </div>
        {error && !Object.keys(error.campos).length && (
          <div className="rc-alert rc-alert--danger" role="alert">
            <div className="rc-alert__body"><span className="rc-alert__text">{error.mensaje}</span></div>
          </div>
        )}
      </form>
    </Modal>
  );
}

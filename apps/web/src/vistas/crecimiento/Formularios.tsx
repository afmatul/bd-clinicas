'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown, Ruler, Syringe } from 'lucide-react';
import type { VacunaEnCarne } from '@red-clinica/shared';
import { ApiError } from '../../api/cliente';
import { aplicarDosis, registrarMedicion } from '../../api/pediatria';
import { Campo, ModalFormulario } from './Modal';
import { formatoFecha, hoyISO, mesesEntre } from './formato';

type Errores = Record<string, string>;

/** Lee el formulario sin campos vacíos: la API valida y responde con mensajes por campo. */
function datos(e: FormEvent<HTMLFormElement>): Record<string, string> {
  return Object.fromEntries([...new FormData(e.currentTarget)].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v !== ''));
}

function useEnvio(onListo: () => void) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campos, setCampos] = useState<Errores>({});
  async function enviar(fn: () => Promise<unknown>) {
    setEnviando(true); setError(null); setCampos({});
    try {
      await fn();
      onListo();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.campos).length) setCampos(e.campos);
      else setError(e instanceof Error ? e.message : 'No pudimos guardar. Intente de nuevo.');
    } finally {
      setEnviando(false);
    }
  }
  return { enviando, error, campos, enviar };
}

const ayuda = (id: string, campos: Errores) => (campos[id] ? { 'aria-invalid': true, 'aria-describedby': `${id}-ayuda` } : {});

export function FormularioMedicion({ idPaciente, nacimiento, onCerrar, onGuardada }: {
  idPaciente: string; nacimiento: string; onCerrar(): void; onGuardada(): void;
}) {
  const { enviando, error, campos, enviar } = useEnvio(onGuardada);
  const [fecha, setFecha] = useState(hoyISO());
  // Las tablas OMS por edad llegan a los 5 años; después el pediatra lee los percentiles de la curva.
  const sinOms = fecha.length === 10 && mesesEntre(nacimiento, fecha) >= 61;

  return (
    <ModalFormulario titulo="Nueva medición" icono={<Ruler strokeWidth={1.75} aria-hidden="true" />} enviando={enviando}
      textoEnviar="Guardar medición" error={error} onCerrar={onCerrar}
      onEnviar={(e) => { e.preventDefault(); const d = datos(e); void enviar(() => registrarMedicion(idPaciente, d as never)); }}>
      <Campo id="fecha" etiqueta="Fecha de la medición" requerido error={campos.fecha}>
        <input className="rc-input rc-num" id="fecha" name="fecha" type="date" max={hoyISO()} min={nacimiento} required
          value={fecha} onChange={(e) => setFecha(e.target.value)} {...ayuda('fecha', campos)} />
      </Campo>
      <div className="grid3">
        <Campo id="pesoKg" etiqueta="Peso" requerido affix="kg" error={campos.pesoKg}>
          <input className="rc-input rc-num" id="pesoKg" name="pesoKg" inputMode="decimal" placeholder="Ej. 18.4" required {...ayuda('pesoKg', campos)} />
        </Campo>
        <Campo id="tallaCm" etiqueta="Talla" requerido affix="cm" error={campos.tallaCm}>
          <input className="rc-input rc-num" id="tallaCm" name="tallaCm" inputMode="decimal" placeholder="Ej. 106.5" required {...ayuda('tallaCm', campos)} />
        </Campo>
        <Campo id="perimetroCefalicoCm" etiqueta="P. cefálico" opcional affix="cm" error={campos.perimetroCefalicoCm}>
          <input className="rc-input rc-num" id="perimetroCefalicoCm" name="perimetroCefalicoCm" inputMode="decimal" {...ayuda('perimetroCefalicoCm', campos)} />
        </Campo>
      </div>
      {sinOms ? (
        <>
          <span className="small">Las tablas OMS de 0 a 5 años no cubren esta edad. Si los tiene, escriba los percentiles leídos de la curva.</span>
          <div className="grid3">
            {([['percentilPesoEdad', 'Peso/edad'], ['percentilTallaEdad', 'Talla/edad'], ['percentilPesoTalla', 'Peso/talla']] as const).map(([id, et]) => (
              <Campo key={id} id={id} etiqueta={et} opcional affix="P" error={campos[id]}>
                <input className="rc-input rc-num" id={id} name={id} inputMode="decimal" placeholder="0–100" {...ayuda(id, campos)} />
              </Campo>
            ))}
          </div>
        </>
      ) : (
        <span className="small">Los percentiles se calculan con los patrones de crecimiento de la OMS al guardar.</span>
      )}
      <Campo id="observaciones" etiqueta="Observaciones" opcional clase="rc-control--area" error={campos.observaciones}>
        <textarea className="rc-input" id="observaciones" name="observaciones" rows={2} />
      </Campo>
    </ModalFormulario>
  );
}

export function FormularioDosis({ idPaciente, carne, idVacunaInicial, onCerrar, onGuardada }: {
  idPaciente: string; carne: VacunaEnCarne[]; idVacunaInicial?: string; onCerrar(): void; onGuardada(): void;
}) {
  const { enviando, error, campos, enviar } = useEnvio(onGuardada);
  const disponibles = carne.filter((v) => v.siguienteDosis !== null);
  const [idVacuna, setIdVacuna] = useState(idVacunaInicial ?? disponibles[0]?.id ?? '');
  const vacuna = disponibles.find((v) => v.id === idVacuna);
  const ultima = !!vacuna && vacuna.siguienteDosis === vacuna.dosisTotales;

  return (
    <ModalFormulario titulo="Registrar vacuna" icono={<Syringe strokeWidth={1.75} aria-hidden="true" />} enviando={enviando}
      textoEnviar="Registrar vacuna" error={error} onCerrar={onCerrar}
      onEnviar={(e) => {
        e.preventDefault();
        if (!vacuna) return;
        const d = datos(e);
        void enviar(() => aplicarDosis(idPaciente, { ...d, idVacuna: vacuna.id, numeroDosis: vacuna.siguienteDosis! } as never));
      }}>
      <div className="grid2">
        <Campo id="idVacuna" etiqueta="Vacuna" requerido clase="rc-control--select" error={campos.idVacuna}>
          <select className="rc-input" id="idVacuna" value={idVacuna} onChange={(e) => setIdVacuna(e.target.value)}>
            {disponibles.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
          <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
        </Campo>
        <Campo id="numeroDosis" etiqueta="Dosis" clase="is-readonly" error={campos.numeroDosis}
          ayuda={vacuna?.proximaFecha ? `Programada para el ${formatoFecha(vacuna.proximaFecha)}.` : undefined}>
          <input className="rc-input rc-num" id="numeroDosis" readOnly
            value={vacuna ? `${vacuna.siguienteDosis} de ${vacuna.dosisTotales}` : '—'} />
        </Campo>
      </div>
      <div className="grid2">
        <Campo id="fechaAplicacion" etiqueta="Fecha de aplicación" requerido error={campos.fechaAplicacion}>
          <input className="rc-input rc-num" id="fechaAplicacion" name="fechaAplicacion" type="date" max={hoyISO()} defaultValue={hoyISO()} required {...ayuda('fechaAplicacion', campos)} />
        </Campo>
        <Campo id="lote" etiqueta="Lote" opcional error={campos.lote}>
          <input className="rc-input rc-num" id="lote" name="lote" inputMode="numeric" placeholder="Ej. 20471" {...ayuda('lote', campos)} />
        </Campo>
      </div>
      {!ultima && (
        <Campo id="fechaProximaDosis" etiqueta="Próxima dosis" opcional error={campos.fechaProximaDosis}
          ayuda="Con esta fecha el paciente aparece en Dosis vencidas si no regresa.">
          <input className="rc-input rc-num" id="fechaProximaDosis" name="fechaProximaDosis" type="date" min={hoyISO()}
            aria-describedby="fechaProximaDosis-ayuda" />
        </Campo>
      )}
      <Campo id="observacionesDosis" etiqueta="Observaciones" opcional clase="rc-control--area" error={campos.observaciones}>
        <textarea className="rc-input" id="observacionesDosis" name="observaciones" rows={2} />
      </Campo>
    </ModalFormulario>
  );
}

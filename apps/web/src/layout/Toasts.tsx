'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, X } from 'lucide-react';

interface Toast { id: number; titulo: string; texto: string }
const Ctx = createContext<(titulo: string, texto: string) => void>(() => undefined);

/** Toasts del design system (rc-toast). Duran 5 s, como en el prototipo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sig = useRef(0);
  const cerrar = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((titulo: string, texto: string) => {
    const id = ++sig.current;
    setToasts((t) => [...t, { id, titulo, texto }]);
    setTimeout(() => cerrar(id), 5000);
  }, []);

  // Los botones de las páginas aún no conectadas llevan data-toast="Título|Texto", como en el prototipo.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-toast]');
      if (!b) return;
      e.preventDefault();
      const [titulo = '', texto = ''] = (b.dataset.toast ?? '').split('|');
      toast(titulo, texto);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [toast]);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="rc-toast rc-toast--success" role="status">
            <CircleCheck strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-toast__body">
              <span className="rc-toast__title">{t.titulo}</span>
              <span className="rc-toast__text">{t.texto}</span>
            </div>
            <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={() => cerrar(t.id)}>
              <X strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

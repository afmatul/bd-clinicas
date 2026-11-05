'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { InstitucionClave, LoginInput, Perfil } from '@red-clinica/shared';
import { api, ApiError } from '../api/cliente';
import { MODO_DEMO, perfilDemo } from '../datos/demo';

interface Sesion {
  perfil: Perfil | null;
  cargando: boolean;
  iniciarSesion(input: LoginInput): Promise<void>;
  cerrarSesion(): Promise<void>;
  /** Solo en modo demo: cambia de institución como el selector del prototipo. */
  cambiarInstitucionDemo?(clave: InstitucionClave): void;
}

const Ctx = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(!MODO_DEMO);

  useEffect(() => {
    if (MODO_DEMO) return;
    api<Perfil>('/auth/perfil')
      .then(setPerfil)
      .catch((e) => { if (!(e instanceof ApiError && e.status === 401)) console.error(e); })
      .finally(() => setCargando(false));
  }, []);

  const iniciarSesion = useCallback(async (input: LoginInput) => {
    if (MODO_DEMO) return setPerfil(perfilDemo(input.institucion));
    setPerfil(await api<Perfil>('/auth/login', { method: 'POST', body: input }));
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (!MODO_DEMO) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setPerfil(null);
  }, []);

  const cambiarInstitucionDemo = MODO_DEMO ? (clave: InstitucionClave) => setPerfil(perfilDemo(clave)) : undefined;

  return <Ctx.Provider value={{ perfil, cargando, iniciarSesion, cerrarSesion, cambiarInstitucionDemo }}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de SesionProvider');
  return s;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ActualizarPerfilInput, InstitucionClave, LoginInput, Perfil } from '@red-clinica/shared';
import { api, ApiError } from '../api/cliente';
import { MODO_DEMO, perfilDemo } from '../datos/demo';

interface Sesion {
  perfil: Perfil | null;
  cargando: boolean;
  iniciarSesion(input: LoginInput): Promise<void>;
  cerrarSesion(): Promise<void>;
  actualizarPerfil(input: ActualizarPerfilInput): Promise<void>;
  /** Solo ADMIN (o modo demo): pasa la sesión a otra institución. */
  cambiarInstitucion(clave: InstitucionClave): Promise<void>;
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
    if (MODO_DEMO) return setPerfil(perfilDemo());
    setPerfil(await api<Perfil>('/auth/login', { method: 'POST', body: input }));
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (!MODO_DEMO) await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setPerfil(null);
  }, []);

  const actualizarPerfil = useCallback(async (input: ActualizarPerfilInput) => {
    if (MODO_DEMO) return setPerfil((p) => (p && input.nombre ? { ...p, usuario: { ...p.usuario, nombre: input.nombre } } : p));
    setPerfil(await api<Perfil>('/auth/perfil', { method: 'PATCH', body: input }));
  }, []);

  const cambiarInstitucion = useCallback(async (clave: InstitucionClave) => {
    if (MODO_DEMO) return setPerfil(perfilDemo(clave));
    setPerfil(await api<Perfil>('/auth/institucion', { method: 'POST', body: { institucion: clave } }));
  }, []);

  return <Ctx.Provider value={{ perfil, cargando, iniciarSesion, cerrarSesion, actualizarPerfil, cambiarInstitucion }}>{children}</Ctx.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de SesionProvider');
  return s;
}

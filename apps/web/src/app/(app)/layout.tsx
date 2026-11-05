'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSesion } from '../../lib/sesion';
import { AppShell } from '../../layout/AppShell';

/** Rutas que requieren sesión: sin perfil se va a /login. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { perfil, cargando } = useSesion();
  const router = useRouter();
  useEffect(() => { if (!cargando && !perfil) router.replace('/login'); }, [cargando, perfil, router]);
  if (cargando || !perfil) return <div className="content"><span className="rc-spinner rc-spinner--lg" aria-label="Cargando" /></div>;
  return <AppShell>{children}</AppShell>;
}

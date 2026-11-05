'use client';

import type { ReactNode } from 'react';
import { SesionProvider } from '../lib/sesion';
import { ToastProvider } from '../layout/Toasts';

export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <SesionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SesionProvider>
  );
}

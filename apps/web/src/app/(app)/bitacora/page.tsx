import { Suspense } from 'react';
import Bitacora from '../../../vistas/Bitacora';

// Conectada a la API (módulo auditoria). Suspense: la vista lee los filtros de la URL.
export default function Page() {
  return <Suspense><Bitacora /></Suspense>;
}

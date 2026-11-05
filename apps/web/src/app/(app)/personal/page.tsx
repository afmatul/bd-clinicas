import { Suspense } from 'react';
import Personal from '../../../vistas/Personal';

// Conectada a la API (módulo personal). Suspense: la vista lee los filtros de la URL.
export default function Page() {
  return <Suspense><Personal /></Suspense>;
}

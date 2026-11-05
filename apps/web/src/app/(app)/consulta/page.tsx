import { Suspense } from 'react';
import Consulta from '../../../vistas/Consulta';

// Conectada a la API. Suspense: la vista lee la URL (useSearchParams).
export default function Page() {
  return <Suspense><Consulta /></Suspense>;
}

import { Suspense } from 'react';
import Pacientes from '../../../vistas/Pacientes';

// Conectada a la API. Suspense: la vista lee los filtros de la URL (useSearchParams).
export default function Page() {
  return <Suspense><Pacientes /></Suspense>;
}

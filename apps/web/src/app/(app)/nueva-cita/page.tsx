import { Suspense } from 'react';
import NuevaCita from '../../../vistas/NuevaCita';

// Conectada a la API. Suspense: la vista lee la URL (useSearchParams).
export default function Page() {
  return <Suspense><NuevaCita /></Suspense>;
}

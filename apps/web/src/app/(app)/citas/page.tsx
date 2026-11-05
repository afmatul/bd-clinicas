import { Suspense } from 'react';
import Citas from '../../../vistas/Citas';

// Conectada a la API. Suspense: la vista lee la URL (useSearchParams).
export default function Page() {
  return <Suspense><Citas /></Suspense>;
}

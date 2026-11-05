import { Suspense } from 'react';
import Laboratorio from '../../../vistas/Laboratorio';

// Conectada a la API (MongoDB). Suspense: la vista lee el filtro y el examen elegido de la URL.
export default function Page() {
  return <Suspense><Laboratorio /></Suspense>;
}

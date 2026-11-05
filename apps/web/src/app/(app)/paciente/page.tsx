import { redirect } from 'next/navigation';

// La ficha vive en /pacientes/[id]; esta ruta del prototipo lleva a la lista.
export default function Page() {
  redirect('/pacientes');
}

import Paciente from '../../../../vistas/Paciente';

// Conectada a la API: ficha, alergias, antecedentes y accesos del expediente.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Paciente id={id} />;
}

import Crecimiento from '../../../../vistas/Crecimiento';

// Conectada a la API (módulo pediatria, MySQL): curva de crecimiento, carné y responsables.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Crecimiento id={id} />;
}

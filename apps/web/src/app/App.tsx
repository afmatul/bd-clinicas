import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './sesion';
import { AppShell } from '../layout/AppShell';
import Login from '../pages/Login';
import Inicio from '../pages/Inicio';
import Pacientes from '../pages/Pacientes';
import Paciente from '../pages/Paciente';
import Citas from '../pages/Citas';
import NuevaCita from '../pages/NuevaCita';
import Consulta from '../pages/Consulta';
import Crecimiento from '../pages/Crecimiento';
import Laboratorio from '../pages/Laboratorio';
import Recepcion from '../pages/Recepcion';
import Registrar from '../pages/Registrar';

function RequiereSesion({ children }: { children: ReactNode }) {
  const { perfil, cargando } = useSesion();
  const location = useLocation();
  if (cargando) return <div className="content"><span className="rc-spinner rc-spinner--lg" aria-label="Cargando" /></div>;
  if (!perfil) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  return <>{children}</>;
}

/** Rutas = vistas del prototipo. Las marcadas "borrador" aún muestran los datos del mockup. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequiereSesion><AppShell /></RequiereSesion>}>
        <Route index element={<Inicio />} />                          {/* borrador */}
        <Route path="pacientes" element={<Pacientes />} />             {/* conectada a la API */}
        <Route path="pacientes/:id" element={<Paciente />} />          {/* borrador */}
        <Route path="paciente" element={<Paciente />} />               {/* borrador (enlaces del prototipo) */}
        <Route path="citas" element={<Citas />} />                     {/* borrador */}
        <Route path="nueva-cita" element={<NuevaCita />} />            {/* borrador */}
        <Route path="consulta" element={<Consulta />} />               {/* borrador */}
        <Route path="crecimiento" element={<Crecimiento />} />         {/* borrador */}
        <Route path="laboratorio" element={<Laboratorio />} />         {/* borrador */}
        <Route path="recepcion" element={<Recepcion />} />             {/* borrador */}
        <Route path="registrar" element={<Registrar />} />             {/* borrador */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

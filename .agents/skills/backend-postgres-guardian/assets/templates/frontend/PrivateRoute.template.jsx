// src/routes/PrivateRoute.jsx — Protege las rutas privadas del aplicativo.
// Espera el estado 'cargando' de AuthContext (verificación de cookie en /auth/yo tras F5)
// antes de redirigir, evitando parpadeos o redirecciones prematuras al login.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { autenticado, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  return autenticado ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ desde: ubicacion }} />
  );
}

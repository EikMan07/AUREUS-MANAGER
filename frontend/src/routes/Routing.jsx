import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import AdminDashboardPage from '../pages/Admin/AdminDashboardPage';
import LandingPage from '../pages/Landing/LandingPage';
import HttpErrorPage from '../pages/Errors/HttpErrorPage';
import { useAuth } from '../context/AuthContext';

/**
 * Ruta Raíz Inteligente ("/"):
 * - Primera visita de la pestaña de navegador: muestra la página informativa
 *   de bienvenida tanto a visitantes nuevos como a usuarios con sesión guardada,
 *   permitiendo leer la información o pulsar "Ir al panel" / "Iniciar sesión".
 * - Si el usuario ya ingresó al panel durante esta sesión de pestaña,
 *   permanece en su panel correspondiente (/admin para ADMINISTRADOR, /dashboard para COBRADOR).
 */
const RootEntryRoute = () => {
  const { autenticado, cargando, usuario } = useAuth();

  if (cargando) {
    return null;
  }

  let enteredAppThisTab = false;
  try {
    enteredAppThisTab = sessionStorage.getItem('aureus_entered_app') === 'true';
  } catch (_) {
    enteredAppThisTab = false;
  }

  if (autenticado && enteredAppThisTab) {
    if (usuario?.rol === 'ADMINISTRADOR') {
      return <Navigate to="/admin" replace />;
    }
    return <DashboardPage />;
  }

  return <LandingPage />;
};

/**
 * Ruta Protegida del Panel de Prestamista ("/dashboard"):
 * - Si el usuario es ADMINISTRADOR, redirige siempre a "/admin".
 * - Registra que el usuario ya entró activamente al panel en esta pestaña.
 */
const DashboardEntryRoute = () => {
  const { autenticado, cargando, usuario } = useAuth();
  const location = useLocation();

  if (cargando) {
    return null;
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (usuario?.rol === 'ADMINISTRADOR') {
    return <Navigate to="/admin" replace />;
  }

  try {
    sessionStorage.setItem('aureus_entered_app', 'true');
  } catch (_) {
    // Ignorar en modo privado estricto
  }

  return <DashboardPage />;
};

/**
 * Ruta Exclusiva del Administrador Único ("/admin"):
 * - Si no está autenticado, redirige a "/login".
 * - Si está autenticado pero su rol no es ADMINISTRADOR, presenta HttpErrorPage 403.
 */
const AdminEntryRoute = () => {
  const { autenticado, cargando, usuario } = useAuth();
  const location = useLocation();

  if (cargando) {
    return null;
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (usuario?.rol !== 'ADMINISTRADOR') {
    return <HttpErrorPage code={403} />;
  }

  try {
    sessionStorage.setItem('aureus_entered_app', 'true');
  } catch (_) {
    // Ignorar en modo privado estricto
  }

  return <AdminDashboardPage />;
};

function Routing() {
  return (
    <Router>
      <Routes>
        {/* Entrada Principal: Bienvenida informativa al abrir la app */}
        <Route path="/" element={<RootEntryRoute />} />

        {/* Página informativa pública accesible en cualquier momento */}
        <Route path="/bienvenida" element={<LandingPage />} />
        <Route path="/informacion" element={<LandingPage />} />

        {/* Acceso a la Cuenta */}
        <Route path="/login" element={<LoginPage />} />

        {/* Panel Exclusivo del Administrador Único */}
        <Route path="/admin" element={<AdminEntryRoute />} />

        {/* Panel Principal Protegido de Prestamistas */}
        <Route path="/dashboard" element={<DashboardEntryRoute />} />

        {/* Pantallas de Estado HTTP 401, 403, 404 y 500 */}
        <Route path="/error/401" element={<HttpErrorPage code={401} />} />
        <Route path="/error/403" element={<HttpErrorPage code={403} />} />
        <Route path="/error/404" element={<HttpErrorPage code={404} />} />
        <Route path="/error/500" element={<HttpErrorPage code={500} />} />

        {/* Cualquier ruta inexistente presenta la pantalla formal 404 */}
        <Route path="*" element={<HttpErrorPage code={404} />} />
      </Routes>
    </Router>
  );
}

export default Routing;

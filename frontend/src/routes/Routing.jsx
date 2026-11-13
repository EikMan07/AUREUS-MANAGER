import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoutes from './PrivateRoutes.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import LandingPage from '../pages/Landing/LandingPage.jsx';
import LoginPage from '../pages/Login/LoginPage.jsx';
import { HttpErrorPage } from '../pages/Errors/HttpErrorPage.jsx';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { AureusLogo } from '../components/Common/AureusLogo.jsx';

function RootEntryRoute() {
  const { autenticado, cargando } = useAuth();
  const { isDark } = useTheme();

  if (cargando) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          width: '100%',
          backgroundColor: isDark ? '#101C2C' : '#F5F3ED',
          color: isDark ? '#F5F3ED' : '#252A31',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
        }}
      >
        <AureusLogo size={42} />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: isDark ? '#CBD5E1' : '#4A5058' }}>
          Verificando sesión...
        </p>
      </div>
    );
  }

  let hasEnteredApp = false;
  try {
    hasEnteredApp = sessionStorage.getItem('aureus_entered_app') === 'true';
  } catch {
    hasEnteredApp = false;
  }

  return autenticado && hasEnteredApp ? <DashboardPage /> : <LandingPage />;
}

function DashboardEntryRoute() {
  useEffect(() => {
    try {
      sessionStorage.setItem('aureus_entered_app', 'true');
    } catch {
      // Ignorar errores de storage
    }
  }, []);

  return <DashboardPage />;
}

export function Routing() {
  return (
    <Router>
      <Routes>
        {/* Acceso principal público o retorno al panel si ya está autenticado */}
        <Route path="/" element={<RootEntryRoute />} />

        {/* Página Web Informativa Ejecutiva de Aureus Manager */}
        <Route path="/bienvenida" element={<LandingPage />} />
        <Route path="/informacion" element={<LandingPage />} />

        {/* Pantalla ejecutiva de inicio de sesión y creación de cuenta */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas privadas estrictamente protegidas */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard" element={<DashboardEntryRoute />} />
        </Route>

        {/* Pantallas ejecutivas dedicadas para errores HTTP 4xx */}
        <Route path="/400" element={<HttpErrorPage code={400} />} />
        <Route path="/error-400" element={<HttpErrorPage code={400} />} />
        <Route path="/401" element={<HttpErrorPage code={401} />} />
        <Route path="/error-401" element={<HttpErrorPage code={401} />} />
        <Route path="/403" element={<HttpErrorPage code={403} />} />
        <Route path="/error-403" element={<HttpErrorPage code={403} />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/error-404" element={<NotFoundPage />} />

        {/* Captura comodín para cualquier ruta inexistente */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default Routing;

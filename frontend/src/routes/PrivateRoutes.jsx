import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { AureusLogo } from '../components/Common/AureusLogo.jsx';

export function PrivateRoutes() {
  // Hooks al inicio antes de cualquier retorno condicional
  const { autenticado, cargando } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();

  if (cargando) {
    return (
      <div
        data-testid="auth-loading-screen"
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
          padding: '24px',
        }}
      >
        <AureusLogo size={42} />
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            color: isDark ? '#CBD5E1' : '#4A5058',
          }}
        >
          Verificando sesión...
        </p>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default PrivateRoutes;

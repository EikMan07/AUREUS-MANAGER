import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoutes from './PrivateRoutes.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';

export function Routing() {
  return (
    <Router>
      <Routes>
        {/* Redirigir permanentemente /login hacia el Dashboard principal */}
        <Route path="/login" element={<Navigate to="/" replace />} />

        {/* Rutas principales protegidas siempre activas */}
        <Route element={<PrivateRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>

        {/* Cualquier otra ruta inexistente redirige siempre al Dashboard principal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default Routing;


import React from 'react';
import { Outlet } from 'react-router-dom';

export function PrivateRoutes() {
  // Siempre permite el acceso al Dashboard sin redirigir jamás a /login
  return <Outlet />;
}

export default PrivateRoutes;


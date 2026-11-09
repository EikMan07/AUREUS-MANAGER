// src/routes/PrivateRoute.jsx — protege las rutas privadas.
// Sin sesión (o con la sesión expirada por inactividad) redirige al login.
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute() {
  const { autenticado } = useAuth();
  const ubicacion = useLocation();
  return autenticado ? <Outlet /> : <Navigate to="/login" replace state={{ desde: ubicacion }} />;
}

// Uso en App.jsx:
// <AuthProvider>
//   <Routes>
//     <Route path="/login" element={<Login />} />
//     <Route element={<PrivateRoute />}>
//       <Route path="/" element={<Inicio />} />
//     </Route>
//   </Routes>
// </AuthProvider>

// src/pages/Login.jsx — Formulario de login y registro adaptado a Cookies Seguras.
// - Espera a que AuthContext complete la verificación inicial (cargando).
// - Si el usuario ya cuenta con una sesión válida por cookie, redirige automáticamente al inicio.
// - NUNCA manipula tokens JWT; la cookie se gestiona automáticamente en el navegador.

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, registro, autenticado, cargando, mensajeSesion } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Mientras se comprueba si la cookie es válida con /auth/yo, espera para evitar parpadeos
  if (cargando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Verificando sesión...</p>
      </div>
    );
  }

  // Si ya tiene sesión activa por cookie, redirige al inicio
  if (autenticado) return <Navigate to="/" replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setAviso('');
    setEnviando(true);
    try {
      if (modo === 'registro') {
        await registro(form.nombre, form.email, form.password);
        setAviso('Cuenta creada exitosamente. Ya puedes iniciar sesión.');
        setModo('login');
        setForm({ ...form, password: '' });
      } else {
        await login(form.email, form.password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar}>
      <h1>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

      {mensajeSesion && <p role="alert" style={{ color: '#b91c1c' }}>{mensajeSesion}</p>}
      {aviso && <p role="status" style={{ color: '#047857' }}>{aviso}</p>}
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}

      {modo === 'registro' && (
        <input
          name="nombre"
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={cambiar}
          required
        />
      )}
      <input
        name="email"
        type="email"
        placeholder="Correo electrónico"
        value={form.email}
        onChange={cambiar}
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={cambiar}
        required
        minLength={8}
      />

      <button type="submit" disabled={enviando}>
        {modo === 'login' ? 'Entrar' : 'Registrarme'}
      </button>
      <button
        type="button"
        onClick={() => {
          setModo(modo === 'login' ? 'registro' : 'login');
          setError('');
        }}
      >
        {modo === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  );
}

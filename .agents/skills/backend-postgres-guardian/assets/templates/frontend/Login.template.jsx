// src/pages/Login.jsx — formulario de login y de registro.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, registro, autenticado, mensajeSesion } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cargando, setCargando] = useState(false);

  if (autenticado) return <Navigate to="/" replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError(''); setAviso(''); setCargando(true);
    try {
      if (modo === 'registro') {
        await registro(form.nombre, form.email, form.password);
        setAviso('Cuenta creada. Ya puedes iniciar sesión.');
        setModo('login');
        setForm({ ...form, password: '' });
      } else {
        await login(form.email, form.password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message); // mensaje claro que viene del backend
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={enviar}>
      <h1>{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

      {mensajeSesion && <p role="alert">{mensajeSesion}</p>}
      {aviso && <p role="status">{aviso}</p>}
      {error && <p role="alert">{error}</p>}

      {modo === 'registro' && (
        <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={cambiar} required />
      )}
      <input name="email" type="email" placeholder="Correo" value={form.email} onChange={cambiar} required />
      <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={cambiar} required minLength={8} />

      <button type="submit" disabled={cargando}>{modo === 'login' ? 'Entrar' : 'Registrarme'}</button>
      <button type="button" onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); setError(''); }}>
        {modo === 'login' ? '¿No tienes cuenta? Regístrate' : 'Ya tengo cuenta'}
      </button>
    </form>
  );
}

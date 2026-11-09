# Plantillas listas para copiar (React + JavaScript + Vite)

Orden de creación recomendado: component → page → Routing/PrivateRoutes → App → main.

## Índice
1. components/Button/Button.jsx
2. pages/Login/Login.jsx y pages/Dashboard/Dashboard.jsx
3. context/AuthContext.jsx y hooks/useAuth.js
4. routes/PrivateRoutes.jsx
5. routes/Routing.jsx
6. App.jsx
7. main.jsx
8. services/api.js (con manejo de errores)
9. Prueba Button.test.jsx y jest.config.js

---

## 1. Component (`src/components/Button/Button.jsx`)
```jsx
function Button({ label, onClick, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

export default Button
```

## 2. Pages
```jsx
// src/pages/Login/Login.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'
import { useAuth } from '../../hooks/useAuth'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      await login()
      navigate('/dashboard')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <main>
      <h1>Iniciar sesión</h1>
      {error && <p role="alert">{error}</p>}
      <Button label="Entrar" onClick={handleLogin} />
    </main>
  )
}

export default Login
```
```jsx
// src/pages/Dashboard/Dashboard.jsx
import { Link } from 'react-router-dom'

function Dashboard() {
  return (
    <main>
      <h1>Panel</h1>
      <Link to="/perfil">Mi perfil</Link>
    </main>
  )
}

export default Dashboard
```

## 3. Estado de autenticación
```jsx
// src/context/AuthContext.jsx
import { createContext, useState } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const login = async () => setIsAuthenticated(true) // aquí iría la llamada real a services/
  const logout = () => setIsAuthenticated(false)

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```
```js
// src/hooks/useAuth.js
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
```

## 4. El guardián (`src/routes/PrivateRoutes.jsx`)
```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function PrivateRoutes() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoutes
```

## 5. El mapa (`src/routes/Routing.jsx`)
```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PrivateRoutes from './PrivateRoutes'
import Login from '../pages/Login/Login'
import Dashboard from '../pages/Dashboard/Dashboard'
import NotFound from '../pages/NotFound/NotFound'

function Routing() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />

        {/* Rutas privadas: anidadas dentro del guardián */}
        <Route element={<PrivateRoutes />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Comodín: páginas inexistentes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default Routing
```
Carga diferida opcional: `const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'))` y envolver `<Routes>` en `<Suspense fallback={<p>Cargando…</p>}>`.

## 6. `src/App.jsx`
```jsx
import Routing from './routes/Routing'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routing />
    </AuthProvider>
  )
}

export default App
```

## 7. `src/main.jsx`
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

## 8. Servicio con manejo de errores (`src/services/api.js`)
```js
const API_BASE = '/api'

export async function getClientes() {
  const res = await fetch(`${API_BASE}/clientes`)
  if (!res.ok) {
    throw new Error('No se pudo obtener la lista de clientes.')
  }
  return res.json()
}
```
Uso en una page/hook:
```jsx
useEffect(() => {
  async function load() {
    try {
      setClientes(await getClientes())
    } catch (e) {
      console.error(e)            // detalle técnico: solo consola
      setError(e.message)         // mensaje general: al usuario
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
```

## 9. Pruebas
```jsx
// src/components/Button/Button.test.jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renderiza el texto recibido', () => {
    render(<Button label="Enviar" />)
    expect(screen.getByText('Enviar')).toBeInTheDocument()
  })

  it('llama a onClick al hacer clic', async () => {
    const onClick = jest.fn()
    const user = userEvent.setup()
    render(<Button label="Enviar" onClick={onClick} />)
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```
```js
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '\\.(css|scss)$': 'identity-obj-proxy' },
  coverageThreshold: { global: { branches: 70, functions: 75, lines: 80 } },
}
// jest.setup.js  →  import '@testing-library/jest-dom'
```
Con `"type": "module"` en package.json, nombra el archivo `jest.config.cjs` (o usa `export default`) y añade `babel.config.cjs` con `@babel/preset-env` y `@babel/preset-react` (runtime automatic).


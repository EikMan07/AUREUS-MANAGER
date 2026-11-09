#!/usr/bin/env node
/**
 * Crea el esqueleto del frontend (React + JavaScript + Vite) siguiendo la cadena
 * components -> pages -> routes -> App.jsx -> main.jsx.
 * Idempotente: nunca sobrescribe archivos existentes; solo crea lo que falta.
 *
 * Uso: node scaffold-frontend.js <ruta-a-la-carpeta-frontend>
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.argv[2] || 'frontend');
const src = path.join(root, 'src');

const DIRS = [
  'components',
  'pages',
  'routes',
  'hooks',
  'context',
  'services',
  'utils',
  'constants',
  'assets',
];

const FILES = {
  'main.jsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
`,
  'App.jsx': `import Routing from './routes/Routing'

function App() {
  return <Routing />
}

export default App
`,
  'index.css': `/* Estilos globales */\n`,
  'routes/Routing.jsx': `import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PrivateRoutes from './PrivateRoutes'
import Home from '../pages/Home/Home'
import NotFound from '../pages/NotFound/NotFound'

function Routing() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />

        {/* Rutas privadas: anidar aquí dentro */}
        <Route element={<PrivateRoutes />}>
          {/* <Route path="/dashboard" element={<Dashboard />} /> */}
        </Route>

        {/* Comodín */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default Routing
`,
  'routes/PrivateRoutes.jsx': `import { Navigate, Outlet } from 'react-router-dom'

function PrivateRoutes() {
  const isAuthenticated = false // TODO: reemplazar por useAuth() cuando exista el Context
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default PrivateRoutes
`,
  'pages/Home/Home.jsx': `function Home() {
  return (
    <main>
      <h1>Inicio</h1>
    </main>
  )
}

export default Home
`,
  'pages/NotFound/NotFound.jsx': `function NotFound() {
  return (
    <main>
      <h1>Página no encontrada</h1>
    </main>
  )
}

export default NotFound
`,
};

let created = 0;
let skipped = 0;

for (const dir of DIRS) {
  const p = path.join(src, dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    created++;
    console.log('+ carpeta  ', path.relative(root, p));
  }
}

for (const [rel, content] of Object.entries(FILES)) {
  const p = path.join(src, rel);
  if (fs.existsSync(p)) {
    skipped++;
    console.log('= existe   ', path.relative(root, p));
    continue;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  created++;
  console.log('+ archivo  ', path.relative(root, p));
}

console.log(`\nListo: ${created} creados, ${skipped} ya existían.`);
console.log('Recuerda instalar el enrutador: npm i react-router-dom');


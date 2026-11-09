---
name: frontend-react-structure
description: Guía obligatoria para crear, ampliar u ordenar la carpeta frontend (React + JavaScript con Vite) - estructura de carpetas y subcarpetas, archivos, nombres, funciones, hooks, servicios, manejo de errores, pruebas con Jest y el orden de dependencias components → pages → routes → App.jsx → main.jsx. Úsala SIEMPRE que se vaya a crear o modificar algo del frontend - un componente, una página, una ruta pública o privada, un servicio, un hook, un archivo de pruebas, o al iniciar/reorganizar el proyecto - aunque el usuario no mencione "estructura", "carpetas" ni "skill". Aplica modularidad, convenciones de nombres (PascalCase, camelCase), control de flujo en JSX y rutas protegidas con react-router-dom.
---

# Frontend React + JavaScript: estructura y orden

El frontend de este proyecto usa **React con JavaScript (JSX)**, empaquetado con **Vite**. No se usa TypeScript: los archivos son `.js` y `.jsx`. Esta skill fija **qué carpetas existen, qué va en cada una, cómo se llaman los archivos y en qué orden se conectan**, para que cualquier pieza nueva quede en el lugar correcto.

Fuentes: material del curso (*Modularidad en JS*, *Control de flujo en React*, *Rutas públicas y privadas con React Router*, *Pruebas unitarias con Jest*, *Buenas prácticas*) contrastado con la documentación oficial de React (react.dev), Vite y React Router.

## Regla central: la cadena de dependencias

Cada capa **importa solo lo que construyó la capa anterior**. Nunca al revés.

```
components  →  pages  →  routes  →  App.jsx  →  main.jsx
 (piezas)     (pantallas) (URL→page) (raíz)     (monta en el HTML)
```

| Capa | Responsabilidad | Importa de | NO debe |
|---|---|---|---|
| `components/` | Piezas reutilizables y pequeñas: botones, inputs, tarjetas, modales | otros components, `utils/`, `hooks/` | conocer rutas ni pages |
| `pages/` | Pantallas completas armadas con components (una por vista) | `components/`, `services/`, `hooks/` | definir URLs ni hacer `<Route>` |
| `routes/` | Decide qué page se muestra en cada URL; protege las privadas | `pages/` | contener UI ni lógica de negocio |
| `App.jsx` | Raíz de la app: solo renderiza el enrutador (y providers globales) | `routes/` | importar pages o components sueltos |
| `main.jsx` | Punto de entrada: monta `<App />` en `<div id="root">` | `App.jsx`, `index.css` | tener lógica |

Si al escribir un import notas que va "hacia atrás" (un component importando una page, una page importando `routes/`), la estructura está mal: reubica el código.

## Estructura de carpetas

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── public/                      # archivos estáticos servidos tal cual (íconos, manifest PWA)
└── src/
    ├── main.jsx                 # 5. entrada: createRoot(...).render(<App />)
    ├── App.jsx                  # 4. raíz: <Routing /> (+ providers)
    ├── index.css                # estilos globales
    ├── routes/                  # 3. enrutamiento
    │   ├── Routing.jsx          #    el mapa: qué page en cada URL
    │   └── PrivateRoutes.jsx    #    el guardián: Outlet o Navigate a /login
    ├── pages/                   # 2. una carpeta/archivo por pantalla
    │   ├── Login/
    │   │   ├── Login.jsx
    │   │   └── Login.test.jsx
    │   └── Dashboard/
    │       └── Dashboard.jsx
    ├── components/              # 1. piezas reutilizables
    │   ├── Button/
    │   │   ├── Button.jsx
    │   │   └── Button.test.jsx  #    prueba co-ubicada junto al componente
    │   └── Navigation/
    ├── hooks/                   # custom hooks: useAuth.js, useClientes.js
    ├── context/                 # estado global: AuthContext.jsx
    ├── services/                # acceso a la API: api.js, clientesService.js
    ├── utils/                   # funciones puras: formatters.js, validators.js
    ├── constants/               # constantes globales: UPPER_SNAKE_CASE
    └── assets/                  # imágenes, fuentes, íconos importados desde código
```

Reglas de la estructura:
- **Una responsabilidad por carpeta.** Si una carpeta mezcla UI, llamadas a la API y utilidades, divídela.
- **Agrupa por tipo en la raíz de `src/`, y por funcionalidad dentro** de `components/` y `pages/` cuando crezcan (`components/Clients/`, `components/Loans/`). Un componente que solo usa una página vive junto a ella; si lo usan dos o más, sube a `components/`.
- **Crea carpetas solo cuando haya un archivo que meter.** No dejes carpetas vacías "por si acaso".
- Las **pruebas se co-ubican** (`Button.jsx` + `Button.test.jsx`). Alternativa válida: `__tests__/` dentro de la carpeta.

## Nombres de archivos y símbolos

| Qué | Convención | Ejemplo |
|---|---|---|
| Componente / page (archivo y función) | `PascalCase.jsx`, un componente por archivo, nombre del archivo = nombre del componente | `UserCard.jsx` → `function UserCard()` |
| Variables y funciones | `camelCase` | `totalPrice`, `getUserData()` |
| Handlers de eventos | prefijo `handle` | `handleSubmit`, `handleClick` |
| Props que reciben callbacks | prefijo `on` | `onSave`, `onClose` |
| Custom hooks | prefijo `use`, `camelCase.js` | `useAuth.js` |
| Booleanos | afirmativos con `is/has` | `isActive`, `hasPermission` |
| Funciones | verbos | `calcTotal()`, `fetchClients()` |
| Constantes globales | `UPPER_SNAKE_CASE` | `API_URL`, `MAX_SIZE` |
| Utilidades (no componentes) | `camelCase.js` o `kebab-case.js`, uno solo por proyecto | `formatters.js` |
| Pruebas | `Nombre.test.jsx` (nunca `test1.js`) | `Button.test.jsx` |
| Carpetas | `PascalCase` si contienen un componente; `camelCase`/minúscula en el resto | `Button/`, `services/` |

Nombra para revelar la intención (`usuariosActivos`, no `l`). Sin números ni textos mágicos: extráelos a una constante (`const IVA = 0.13`).

## Cómo se escribe cada capa

Las plantillas completas están en `references/plantillas.md`. Resumen del orden y la forma:

**`main.jsx`** — solo monta. `createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)`.

**`App.jsx`** — solo conoce a `Routing`. Aquí también van los providers globales (`AuthProvider`) envolviendo a `<Routing />`.

**`routes/Routing.jsx`** — importa `BrowserRouter as Router, Routes, Route` de `react-router-dom`, importa cada page y declara `<Route path="/x" element={<Page />} />`. Las rutas **públicas** (`/`, `/login`, `/registro`) van sueltas; las **privadas** se anidan dentro de `<Route element={<PrivateRoutes />}>` (ruta sin `path` que actúa de envoltorio protector). Agrega siempre una ruta comodín `path="*"` para páginas inexistentes.

**`routes/PrivateRoutes.jsx`** — el guardián: si `isAuthenticated` devuelve `<Outlet />`, si no `<Navigate to="/login" replace />`. `isAuthenticated` sale de un Context o hook (`useAuth`), nunca de una constante en producción. La protección vive **en este único archivo**; no la repitas en cada page.

**`pages/`** — componen components y piden datos con hooks o servicios. Una page = una pantalla = una URL. Usa `<Link to="...">` para navegar, **nunca `<a href>`** (recarga toda la app y pierde el estado).

**`components/`** — pequeños, de responsabilidad única, reciben datos por props y avisan hacia arriba con funciones-prop (`onSave`). Si un `.map()` crece, extrae cada ítem a su propio componente.

**`services/`** — toda llamada a la API (fetch) va aquí, no dentro de los componentes. Cada función lanza `throw new Error('mensaje útil')` si `!res.ok`; quien la usa la atrapa con `try/catch`.

**`utils/`** — funciones puras (mismo input → mismo output), sin React ni efectos. Fáciles de probar.

## Módulos: export / import

- **Un archivo, una responsabilidad.**
- `export default` para lo **principal** del archivo (el componente); `export const/function` (named) para utilidades y funciones secundarias. Se pueden combinar: `import Boton, { colores } from './Boton'`.
- Named imports: el nombre **debe coincidir** con el del export. Default: nombre libre, pero usa el del archivo.
- Importa hooks de React con named imports: `import { useState, useEffect } from 'react'`.
- Rutas relativas dentro de `src/`; mantén los imports ordenados: librerías externas → capas del proyecto → estilos.

## Funciones y control de flujo en JSX

Dentro de `{ }` solo caben **expresiones**, no sentencias (`if`/`for` directos no funcionan).

| Necesidad | Herramienta |
|---|---|
| Lógica de varias líneas, carga/error/vacío | `if` con *early return* **antes** del `return` |
| Elegir entre dos opciones | ternario `cond ? <A/> : <B/>` (nunca anidados) |
| Mostrar o nada | `cond && <A/>` — cuidado: usa `lista.length > 0 &&`, no `lista.length &&` (imprime `0`) |
| Muchos casos | objeto de mapeo `vistas[estado] ?? <Inicio/>` o `switch` |
| Listas | `.map()` con `key` único y estable (id del backend, no el índice) |
| Filtrar y mostrar | `.filter(...).map(...)` |

Eventos: pasa la función, **no la llames** (`onClick={fn}` ✓, `onClick={fn()}` ✗). Para pasar argumentos usa flecha: `onClick={() => borrar(id)}`.

Estado: `useState` guarda datos que cambian; actualizar el estado dispara un re-render. **El estado es inmutable**: crea copias (`[...tareas, x]`, `{...obj, k: v}`), nunca `push` ni mutación directa.

## Manejo de errores

- Todo lo que puede fallar (`fetch`, `JSON.parse`, datos externos) va en `try/catch`; usa `finally` para limpiar (ocultar spinner).
- Los **servicios lanzan** (`throw new Error(...)`), los **componentes/hooks atrapan** y muestran un mensaje amigable al usuario, nunca una pantalla en blanco.
- Mensajes útiles: que digan qué pasó, no solo "error". Los detalles técnicos van a `console.error`; al usuario un mensaje general y sin tecnicismos.
- En `useEffect` con datos asíncronos: define una función `async` interna, llámala, y atrapa dentro.

## Optimización y modularidad en React

Correcto primero, optimiza después y **mide antes de optimizar**. Herramientas cuando haga falta: `useMemo`/`useCallback` (evitar cálculo/renders innecesarios), `React.lazy` + `Suspense` (cargar páginas bajo demanda en `Routing.jsx`), Context o composición para evitar *prop drilling*, y **custom hooks** para separar la lógica de la UI. DRY: a la tercera repetición, extrae una función o componente.

## Pruebas unitarias (Jest + React Testing Library)

- Dependencias de desarrollo: `jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event babel-jest @babel/preset-env @babel/preset-react`. Config en `jest.config.js` con `testEnvironment: 'jsdom'` y `setupFilesAfterEnv`.
- Archivos `Nombre.test.jsx` junto al componente. Un test = un comportamiento, con patrón **AAA** (Arrange, Act, Assert) dentro de `describe`/`it`.
- Prueba lo que **ve el usuario** (`screen.getByRole`, `getByText`), no detalles internos. `getBy*` (debe existir), `queryBy*` (comprobar ausencia), `findBy*` (asíncrono).
- Aísla: mockea `fetch`/servicios con `jest.fn()` / `jest.mock()`; `beforeEach(() => jest.clearAllMocks())`. Nunca llames APIs reales.
- Comandos: `npx jest`, `npx jest --watch`, `npx jest --coverage`, `npx jest Button`. Cobertura objetivo: 80% líneas, 75% funciones, 70% ramas.

## Protocolo al crear o cambiar algo del frontend

1. **Lee primero** `src/` para respetar lo que ya existe (nombres, carpetas, estilos). No mezcles convenciones.
2. **Ubica la pieza** con la tabla de la cadena: ¿es UI reutilizable (`components/`), una pantalla (`pages/`), una URL (`routes/`), acceso a datos (`services/`), lógica sin UI (`hooks/`, `utils/`)?
3. **Crea de abajo hacia arriba**: component → page → ruta en `Routing.jsx` (pública o anidada en `PrivateRoutes`) → verifica que `App.jsx` y `main.jsx` no necesitan cambios (normalmente no).
4. **Una ruta nueva privada** = solo anidarla dentro de `<Route element={<PrivateRoutes />}>`. **Una pública** = `<Route>` suelto. Actualiza el menú con `<Link>`.
5. **Añade la prueba** `*.test.jsx` si el componente tiene lógica o interacción.
6. **Verifica**: `npm run build` (o `vite build`) sin errores; si hay Jest, `npx jest`.
7. Para crear el esqueleto desde cero: `node <ruta-de-la-skill>/scripts/scaffold-frontend.js <ruta-frontend>` (idempotente: no sobrescribe archivos existentes).

## Errores comunes que debes evitar

- Un component importando una page o `routes/` (dependencia hacia atrás).
- Una ruta privada fuera de `<PrivateRoutes>` por descuido, o la protección copiada en cada page.
- `<a href>` en lugar de `<Link>`; olvidar la ruta comodín `*`.
- Llamar APIs dentro de los components en vez de `services/`.
- `onClick={fn()}`, `key={index}` en listas que cambian, `lista.length &&`, mutar el estado, ternarios anidados.
- Archivos gigantes con varias responsabilidades; nombres de una letra; mezclar camelCase y snake_case; números mágicos.
- Pruebas sin limpiar mocks, tests que verifican varias cosas a la vez, archivos `test1.js`.

## Checklist final

- [ ] La pieza está en la carpeta correcta y respeta `components → pages → routes → App → main`.
- [ ] Un componente por archivo; nombre del archivo = nombre del componente (PascalCase `.jsx`).
- [ ] Imports/exports claros (default para lo principal, named para lo secundario).
- [ ] Rutas: públicas sueltas, privadas dentro de `PrivateRoutes`, comodín `*` presente, navegación con `<Link>`.
- [ ] Llamadas a la API en `services/` con `try/catch` en quien las consume.
- [ ] Sin valores mágicos, sin código duplicado, estado inmutable, `key` estable.
- [ ] Build (y pruebas, si existen) pasan sin errores.

## Recursos incluidos

- `references/plantillas.md` — código listo para copiar: `main.jsx`, `App.jsx`, `Routing.jsx`, `PrivateRoutes.jsx`, page, component, servicio, hook, `AuthContext`, prueba `.test.jsx`, `jest.config.js`.
- `scripts/scaffold-frontend.js` — crea el árbol de carpetas y los archivos base si faltan (no sobrescribe).


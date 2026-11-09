# Autenticación y seguridad (JWT + bcrypt + AuthContext)

## Contenido
1. Requisitos del proyecto
2. Contraseñas con bcrypt
3. JWT y expiración por inactividad (25 min)
4. Middleware de autenticación
5. Front end: AuthContext (sin localStorage)
6. Relaciones y validaciones (400 / 404)
7. Listados con datos relacionados
8. Fuera de alcance
9. Checklist de seguridad

---

## 1. Requisitos del proyecto

- Contraseñas cifradas con bcrypt (o similar). Nunca en texto plano ni devueltas en las respuestas.
- Se emite un JWT al iniciar sesión. La clave secreta va en `.env`, no en el código.
- **La sesión expira a los 25 minutos sin interacción** y el usuario vuelve a la pantalla de login.
- Middleware de autenticación: revisa `Authorization: Bearer <token>`; si falta o no es válido, responde **401**.
- Front end: formulario de login (y de registro), almacenamiento del token, envío del token en cada petición y cierre de sesión.
- La información privada (token, usuario) vive en un **AuthContext de React (JavaScript)** y **no se guarda en localStorage**.

## 2. Contraseñas con bcrypt

- Paquete: `bcryptjs` (JavaScript puro, sin compilar nada; API idéntica a `bcrypt`). Si el usuario prefiere `bcrypt`, solo cambia el `require`.
- Se cifra con un **hook `beforeSave`** del modelo `Usuario` cuando `changed('password')`. Así ningún controlador puede olvidarse de cifrar.
- Costo (`SALT_ROUNDS`): 10 a 12.
- **Nunca** se devuelve el hash: `defaultScope` excluye `password`, `toJSON()` lo borra y solo el login usa `Usuario.scope('conPassword')`.
- Columna `password` como `STRING(255)` (el hash mide ~60 caracteres). Mínimo 8 caracteres para la clave en texto plano.
- Login: el mismo mensaje (`Credenciales inválidas`, 401) cuando el correo no existe y cuando la clave es incorrecta. No revela qué correos están registrados.
- Prohibido: `console.log` de contraseñas, comparar con `===`, guardar la clave en logs, devolver `usuario` con `password` en cualquier endpoint.

## 3. JWT y expiración por inactividad (25 min)

**Diseño: expiración deslizante (sliding expiration).**

1. Login → el backend firma un JWT con `expiresIn: JWT_EXPIRES_IN` (`25m`).
2. **Cada petición autenticada** válida recibe en la respuesta un token nuevo en el header `x-access-token` (otros 25 min).
3. El front lo guarda en memoria (lo hace `apiClient`). Mientras haya actividad, el token nunca llega a expirar.
4. Si pasan 25 min sin ninguna petición, el token **expira**: el backend responde 401 `TOKEN_EXPIRADO` y el front cierra sesión y redirige al login con el mensaje "Tu sesión expiró por inactividad".
5. Además, el front tiene un temporizador de 25 min que se reinicia con cualquier interacción (mouse, teclado, scroll, toque) y, mientras el usuario interactúa, llama a `GET /auth/renovar` como máximo cada 5 min para que el token del backend no caduque con el usuario activo.

Puntos de configuración:
- `.env`: `JWT_SECRET` (largo y aleatorio, ≥ 32 caracteres), `JWT_EXPIRES_IN=25m`.
- CORS: `exposedHeaders: ['x-access-token']`, si no, el navegador no deja leer el header.
- Nunca `jwt.sign` sin `expiresIn`; nunca el secreto escrito en el código.
- El payload lleva solo `id` y `email`; **nada sensible** (ni contraseña ni datos personales extra).

## 4. Middleware de autenticación

`src/middlewares/authMiddleware.js` (plantilla lista):
- Lee `Authorization`, exige el formato `Bearer <token>`.
- `jwt.verify` con `JWT_SECRET`. Falla → **401** con `codigo`: `TOKEN_AUSENTE`, `TOKEN_INVALIDO` o `TOKEN_EXPIRADO`.
- Éxito → `req.usuario = { id, email }` y renueva el token.
- Se aplica con `router.use(authMiddleware)` en cada router de entidad. Solo `/auth/registro` y `/auth/login` son públicas.

## 5. Front end: AuthContext (sin localStorage)

Plantillas en `assets/templates/frontend/`:

| Archivo | Rol |
|---|---|
| `AuthContext.template.jsx` | Estado `token`/`usuario` **en memoria**, `login`, `registro`, `logout`, temporizador de inactividad |
| `apiClient.template.js` | `apiFetch`: añade el Bearer, guarda el token renovado, cierra sesión ante 401 |
| `PrivateRoute.template.jsx` | Redirige a `/login` si no hay sesión |
| `Login.template.jsx` | Formulario de login y de registro con mensajes claros del backend |

Reglas:
- **Prohibido** `localStorage.setItem('token', …)`, `sessionStorage` o cookies legibles por JS para el token o los datos del usuario.
- El token no se pasa por props ni por la URL; los componentes usan `useAuth()`.
- Todas las llamadas al backend usan `apiFetch`, nunca `fetch` suelto (así el Bearer y el 401 se manejan en un solo lugar).
- Consecuencia que hay que decir al usuario una vez: **al recargar la página (F5) la sesión se cierra**, porque el estado en memoria se pierde. Es el costo de no guardar nada en el navegador. (La alternativa más robusta en producción sería una cookie `httpOnly` emitida por el backend; solo mencionarla si el usuario pregunta.)

## 6. Relaciones y validaciones (400 / 404)

- Al crear o actualizar un registro relacionado, el backend **verifica que el registro referenciado exista**. Si no existe: **400** (dato inválido en el cuerpo) o **404** (recurso de la URL inexistente). Usar `verificarRelacion(Modelo, 'campoId', 'La categoría')` o la función `relacionExiste` del controlador.
- Validar en el backend, con **mensajes claros**: campos obligatorios, tipos de datos y valores únicos (por ejemplo, correo de usuario). Capas: validaciones del modelo (`allowNull`, `validate`, `unique`) + `requerir`/`tipos` en las rutas.
- Códigos: 400 validación, 401 sin sesión, 404 no existe, 409 duplicado o bloqueado por relación, 500 inesperado (sin detalles internos).
- Sin `Model.create(req.body)`: siempre whitelist de campos.

## 7. Listados con datos relacionados

Sugerencia del enunciado: los listados incluyen datos del registro relacionado (ej.: nombre de la categoría dentro de cada producto). Se hace con `include` en una sola consulta (sin N+1) y limitando `attributes`:

```js
const productos = await Producto.findAll({
  include: [{ model: Categoria, attributes: ['id', 'nombre'] }],
});
```

Requiere la asociación declarada en ambos lados (`Producto.belongsTo(Categoria)` / `Categoria.hasMany(Producto)`).

## 8. Fuera de alcance

**Roles y permisos por usuario.** Basta con distinguir entre usuario autenticado y no autenticado. No agregar tabla `roles`, columna `rol` ni chequeos por rol salvo que el usuario lo pida expresamente.

## 9. Checklist de seguridad

- [ ] `.env` en `.gitignore`; existe `.env.example` sin secretos reales
- [ ] `JWT_SECRET` y `JWT_EXPIRES_IN=25m` en `.env`; `jwt.sign` siempre con `expiresIn`
- [ ] Contraseña con bcrypt vía hook; `defaultScope` excluye `password`; `toJSON` la borra
- [ ] Login con mensaje genérico (401) y sin revelar si el correo existe
- [ ] Todas las rutas de entidades pasan por `authMiddleware`; solo registro y login son públicas
- [ ] `cors` con `origin` explícito y `exposedHeaders: ['x-access-token']`
- [ ] Front: token y usuario solo en `AuthContext`; cero `localStorage`/`sessionStorage` con datos de sesión
- [ ] 401 en el front → `logout` + redirección al login con aviso
- [ ] Relaciones verificadas (400/404) y validaciones con mensajes claros
- [ ] Listados con `include` de datos relacionados

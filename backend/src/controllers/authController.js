import crypto from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';
import { firmarToken } from '../middlewares/authMiddleware.js';
import { setSessionCookie, clearSessionCookie } from '../utils/cookies.js';
import { generarTokenCsrf } from '../middlewares/csrf.js';

const LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_RATE_MAX_ATTEMPTS = 10;
const failedLoginTracker = new Map();

function getLoginAttemptKey(req, identificador) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'local';
  const idPart = String(identificador || '').trim().toLowerCase();
  return `${ip}::${idPart}`;
}

function isLoginRateLimited(key) {
  const now = Date.now();
  const cutoff = now - LOGIN_RATE_WINDOW_MS;
  const recent = (failedLoginTracker.get(key) || []).filter((ts) => ts > cutoff);
  if (recent.length === 0) {
    failedLoginTracker.delete(key);
    return false;
  }
  failedLoginTracker.set(key, recent);
  return recent.length >= LOGIN_RATE_MAX_ATTEMPTS;
}

function recordFailedLogin(key) {
  const now = Date.now();
  const cutoff = now - LOGIN_RATE_WINDOW_MS;
  const recent = (failedLoginTracker.get(key) || []).filter((ts) => ts > cutoff);
  recent.push(now);
  failedLoginTracker.set(key, recent);
}

function clearFailedLogin(key) {
  failedLoginTracker.delete(key);
}

function formatUsuarioPublico(u) {
  return {
    id: u.id,
    username: u.usuario,
    usuario: u.usuario,
    nombre_completo: u.nombre_completo,
    correo: u.correo,
    rol: u.rol,
    estado: u.estado_cuenta,
    estado_cuenta: u.estado_cuenta,
    codigo_vinculacion:
      u.codigo_vinculacion || `CF-${String(u.id).slice(0, 8).toUpperCase()}`,
    foto_url: u.foto_url || null,
    creado_en: u.creado_en,
  };
}

async function generateUniqueLinkingCode() {
  for (let i = 0; i < 6; i += 1) {
    const code = `CF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { rows } = await query(
      'SELECT 1 FROM usuarios WHERE codigo_vinculacion = $1 LIMIT 1;',
      [code]
    );
    if (rows.length === 0) return code;
  }
  return `CF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export const login = async (req, res) => {
  try {
    const {
      identificador,
      usuario,
      correo,
      password,
      cookiesAceptadas,
    } = req.body || {};

    if (cookiesAceptadas !== true) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Cookies de seguridad requeridas',
        userMessage: 'Debes aceptar las cookies de seguridad para iniciar sesión.',
      });
    }

    const rawId = String(identificador ?? usuario ?? correo ?? '').trim();
    const rawPassword = typeof password === 'string' ? password : '';

    if (!rawId || !rawPassword) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Credenciales incompletas',
        userMessage: 'Debes ingresar tu usuario o correo electrónico y tu contraseña.',
      });
    }

    const attemptKey = getLoginAttemptKey(req, rawId);
    if (isLoginRateLimited(attemptKey)) {
      return res.status(429).json({
        ok: false,
        success: false,
        status: 429,
        error: 'Demasiados intentos',
        userMessage:
          'Has superado el límite de intentos fallidos. Espera 10 minutos antes de volver a intentarlo.',
      });
    }

    const { rows } = await query(
      `SELECT id, usuario, nombre_completo, correo, password_hash, rol, estado_cuenta,
              codigo_vinculacion, foto_url, creado_en
       FROM usuarios
       WHERE LOWER(correo) = LOWER($1) OR LOWER(usuario) = LOWER($1)
       LIMIT 1;`,
      [rawId]
    );

    const foundUser = rows[0];
    if (!foundUser) {
      recordFailedLogin(attemptKey);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'Credenciales inválidas',
        userMessage: 'El usuario o la contraseña ingresados no son correctos.',
      });
    }

    if (foundUser.estado_cuenta === 'SUSPENDIDA') {
      return res.status(403).json({
        ok: false,
        success: false,
        status: 403,
        error: 'Cuenta suspendida',
        userMessage: 'Esta cuenta se encuentra suspendida temporalmente.',
      });
    }

    const isValidPassword = await bcryptjs.compare(
      rawPassword,
      String(foundUser.password_hash || '')
    );

    if (!isValidPassword) {
      recordFailedLogin(attemptKey);
      await query(
        'UPDATE usuarios SET intentos_fallidos = COALESCE(intentos_fallidos, 0) + 1 WHERE id = $1;',
        [foundUser.id]
      );
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'Credenciales inválidas',
        userMessage: 'El usuario o la contraseña ingresados no son correctos.',
      });
    }

    clearFailedLogin(attemptKey);

    let codigoVinculacion = foundUser.codigo_vinculacion;
    if (!codigoVinculacion) {
      codigoVinculacion = `CF-${String(foundUser.id).slice(0, 8).toUpperCase()}`;
    }

    const { rows: updatedRows } = await query(
      `UPDATE usuarios
       SET ultimo_acceso = now(),
           intentos_fallidos = 0,
           codigo_vinculacion = COALESCE(codigo_vinculacion, $2),
           estado_cuenta = CASE WHEN estado_cuenta = 'PENDIENTE_VERIFICACION' THEN 'ACTIVA' ELSE estado_cuenta END,
           correo_verificado = true,
           correo_verificado_en = COALESCE(correo_verificado_en, now()),
           actualizado_en = now()
       WHERE id = $1
       RETURNING id, usuario, nombre_completo, correo, rol, estado_cuenta,
                 codigo_vinculacion, foto_url, creado_en;`,
      [foundUser.id, codigoVinculacion]
    );

    const activeUser = updatedRows[0] || foundUser;
    const sessionJwt = firmarToken(activeUser);
    setSessionCookie(res, sessionJwt);
    const csrfToken = generarTokenCsrf(activeUser.id);
    res.setHeader('X-CSRF-Token', csrfToken);

    return res.status(200).json({
      ok: true,
      success: true,
      usuario: formatUsuarioPublico(activeUser),
      csrfToken,
    });
  } catch (error) {
    console.error('[Auth] Error en login:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al iniciar sesión',
      userMessage: 'Ocurrió un inconveniente al procesar el inicio de sesión.',
    });
  }
};

export const registro = async (req, res) => {
  try {
    const {
      nombre_completo,
      username,
      usuario,
      correo,
      password,
      cookiesAceptadas,
    } = req.body || {};

    if (cookiesAceptadas !== true) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Cookies de seguridad requeridas',
        userMessage: 'Debes aceptar las cookies de seguridad para crear tu cuenta.',
      });
    }

    const cleanNombre = String(nombre_completo || '').trim();
    const cleanUsername = String(username ?? usuario ?? '').trim();
    const cleanCorreo = String(correo || '').trim().toLowerCase();
    const cleanPassword = typeof password === 'string' ? password : '';

    if (cleanNombre.length < 3) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Nombre inválido',
        userMessage: 'El nombre completo debe tener al menos 3 caracteres.',
      });
    }

    if (cleanUsername.length < 3 || /\s/.test(cleanUsername)) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Usuario inválido',
        userMessage: 'El nombre de usuario debe tener al menos 3 caracteres y no contener espacios.',
      });
    }

    if (!/^[A-Za-z0-9._-]{3,50}$/.test(cleanUsername)) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Usuario inválido',
        userMessage:
          'El nombre de usuario solo puede usar letras, números, puntos, guiones y guion bajo.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanCorreo)) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Correo inválido',
        userMessage: 'Ingresa un correo electrónico válido.',
      });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Contraseña corta',
        userMessage: 'La contraseña debe tener mínimo 8 caracteres.',
      });
    }

    const { rows: existingUsername } = await query(
      'SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1;',
      [cleanUsername]
    );
    if (existingUsername.length > 0) {
      return res.status(409).json({
        ok: false,
        success: false,
        status: 409,
        error: 'Usuario duplicado',
        userMessage: 'Ese nombre de usuario ya está en uso.',
      });
    }

    const { rows: existingEmail } = await query(
      'SELECT id FROM usuarios WHERE LOWER(correo) = LOWER($1) LIMIT 1;',
      [cleanCorreo]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({
        ok: false,
        success: false,
        status: 409,
        error: 'Correo duplicado',
        userMessage: 'Ese correo electrónico ya se encuentra registrado.',
      });
    }

    const passwordHash = await bcryptjs.hash(cleanPassword, 10);
    const codigoVinculacion = await generateUniqueLinkingCode();

    const { rows: createdRows } = await query(
      `INSERT INTO usuarios (
         usuario,
         nombre_completo,
         correo,
         correo_verificado,
         correo_verificado_en,
         password_hash,
         rol,
         estado_cuenta,
         codigo_vinculacion,
         ultimo_acceso
       ) VALUES ($1, $2, $3, true, now(), $4, 'ADMINISTRADOR', 'ACTIVA', $5, now())
       RETURNING id, usuario, nombre_completo, correo, rol, estado_cuenta,
                 codigo_vinculacion, foto_url, creado_en;`,
      [cleanUsername, cleanNombre, cleanCorreo, passwordHash, codigoVinculacion]
    );

    const newUser = createdRows[0];
    const sessionJwt = firmarToken(newUser);
    setSessionCookie(res, sessionJwt);
    const csrfToken = generarTokenCsrf(newUser.id);
    res.setHeader('X-CSRF-Token', csrfToken);

    return res.status(201).json({
      ok: true,
      success: true,
      usuario: formatUsuarioPublico(newUser),
      csrfToken,
    });
  } catch (error) {
    console.error('[Auth] Error en registro:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al crear cuenta',
      userMessage: 'No fue posible crear la cuenta en este momento.',
    });
  }
};

export const yo = async (req, res) => {
  try {
    const authUserId = req.user?.id || req.usuario?.id;
    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autorizado',
        userMessage: 'Debes iniciar sesión para acceder a esta información.',
      });
    }

    const { rows } = await query(
      `SELECT id, usuario, nombre_completo, correo, rol, estado_cuenta,
              codigo_vinculacion, foto_url, creado_en
       FROM usuarios
       WHERE id = $1
       LIMIT 1;`,
      [authUserId]
    );

    const current = rows[0];
    if (!current || current.estado_cuenta === 'SUSPENDIDA') {
      clearSessionCookie(res);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'Sesión inválida',
        userMessage: 'Tu sesión no es válida. Inicia sesión nuevamente.',
      });
    }

    const csrfToken = generarTokenCsrf(current.id);
    res.setHeader('X-CSRF-Token', csrfToken);

    return res.status(200).json({
      ok: true,
      success: true,
      autenticado: true,
      usuario: formatUsuarioPublico(current),
      csrfToken,
    });
  } catch (error) {
    console.error('[Auth] Error en /yo:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al verificar sesión',
      userMessage: 'No se pudo cargar la información de tu sesión.',
    });
  }
};

export const logout = async (req, res) => {
  try {
    clearSessionCookie(res);
    return res.status(200).json({
      ok: true,
      success: true,
      userMessage: 'Sesión finalizada correctamente.',
    });
  } catch (error) {
    console.error('[Auth] Error en logout:', error);
    clearSessionCookie(res);
    return res.status(200).json({
      ok: true,
      success: true,
      userMessage: 'Sesión finalizada correctamente.',
    });
  }
};

export default { login, registro, yo, perfil: yo, logout };

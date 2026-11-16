import crypto from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';
import { firmarToken } from '../middlewares/authMiddleware.js';
import { setSessionCookie, clearSessionCookie } from '../utils/cookies.js';
import { generarTokenCsrf } from '../middlewares/csrf.js';
import { redactarPII } from '../utils/piiRedactor.js';

export const CONSENT_CURRENT_VERSION = 'v1.0-2026';

let consentColumnsReady = false;
async function ensureConsentColumns() {
  if (consentColumnsReady) return;
  await query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS consentimiento_aceptado boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS consentimiento_version varchar(24) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS consentimiento_aceptado_en timestamptz DEFAULT NULL;
  `);
  consentColumnsReady = true;
}

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
    ultimo_acceso: u.ultimo_acceso || null,
    consentimiento_aceptado: Boolean(u.consentimiento_aceptado),
    consentimiento_version: u.consentimiento_version || null,
    consentimiento_aceptado_en: u.consentimiento_aceptado_en || null,
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

    await ensureConsentColumns();

    const { rows } = await query(
      `SELECT id, usuario, nombre_completo, correo, password_hash, rol, estado_cuenta,
              codigo_vinculacion, foto_url, creado_en,
              consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en
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
        userMessage: 'Tu cuenta se encuentra suspendida temporalmente por la administración.',
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
                 codigo_vinculacion, foto_url, creado_en, ultimo_acceso,
                 consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en;`,
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
    await ensureConsentColumns();

    const {
      nombre_completo,
      username,
      usuario,
      correo,
      password,
      cookiesAceptadas,
      terminosAceptados,
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
    const aceptaConsentimiento = terminosAceptados === true || cookiesAceptadas === true;

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
         ultimo_acceso,
         consentimiento_aceptado,
         consentimiento_version,
         consentimiento_aceptado_en
       ) VALUES (
         $1, $2, $3, true, now(), $4, 'COBRADOR', 'ACTIVA', $5, now(),
         $6, CASE WHEN $6 THEN $7 ELSE NULL END, CASE WHEN $6 THEN now() ELSE NULL END
       )
       RETURNING id, usuario, nombre_completo, correo, rol, estado_cuenta,
                 codigo_vinculacion, foto_url, creado_en, ultimo_acceso,
                 consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en;`,
      [
        cleanUsername,
        cleanNombre,
        cleanCorreo,
        passwordHash,
        codigoVinculacion,
        aceptaConsentimiento,
        CONSENT_CURRENT_VERSION,
      ]
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

    await ensureConsentColumns();

    const { rows } = await query(
      `SELECT id, usuario, nombre_completo, correo, rol, estado_cuenta,
              codigo_vinculacion, foto_url, creado_en, ultimo_acceso,
              consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en
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

export const actualizarPerfil = async (req, res) => {
  try {
    const authUserId = req.user?.id || req.usuario?.id;
    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autorizado',
        userMessage: 'Debes iniciar sesión para actualizar tu perfil.',
      });
    }

    const body = req.body || {};
    const { rows: currentRows } = await query(
      `SELECT id, usuario, nombre_completo, correo, rol, estado_cuenta,
              codigo_vinculacion, foto_url, creado_en, ultimo_acceso
       FROM usuarios
       WHERE id = $1
       LIMIT 1;`,
      [authUserId]
    );

    const existingUser = currentRows[0];
    if (!existingUser) {
      return res.status(404).json({
        ok: false,
        success: false,
        status: 404,
        error: 'Usuario no encontrado',
        userMessage: 'No encontramos la cuenta solicitada.',
      });
    }

    const cleanNombre =
      body.nombre_completo !== undefined
        ? String(body.nombre_completo || '').trim()
        : existingUser.nombre_completo;

    const rawUsernameInput =
      body.username !== undefined
        ? body.username
        : body.usuario !== undefined
          ? body.usuario
          : existingUser.usuario;
    const cleanUsername = String(rawUsernameInput || '').trim();

    const cleanCorreo =
      body.correo !== undefined
        ? String(body.correo || '').trim().toLowerCase()
        : String(existingUser.correo || '').trim().toLowerCase();

    if (cleanNombre.length < 3 || cleanNombre.length > 150) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Nombre inválido',
        userMessage: 'Ingresa un nombre completo de al menos 3 caracteres.',
      });
    }

    if (!/^[A-Za-z0-9._-]{3,50}$/.test(cleanUsername)) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Nombre de usuario inválido',
        userMessage:
          'El nombre de usuario debe tener entre 3 y 50 caracteres válidos sin espacios.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanCorreo) || cleanCorreo.length > 180) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Correo inválido',
        userMessage: 'Ingresa un correo electrónico válido.',
      });
    }

    let nextFotoUrl = existingUser.foto_url || null;
    if (body.foto_url !== undefined) {
      if (body.foto_url === null || body.foto_url === '') {
        nextFotoUrl = null;
      } else {
        const candidateFoto = String(body.foto_url).trim();
        const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(
          candidateFoto
        );
        const isHttpImage = /^https?:\/\/.+$/i.test(candidateFoto);
        if (!isDataImage && !isHttpImage) {
          return res.status(400).json({
            ok: false,
            success: false,
            status: 400,
            error: 'Formato de fotografía inválido',
            userMessage: 'Selecciona una imagen válida para tu perfil.',
          });
        }
        if (candidateFoto.length > 2 * 1024 * 1024) {
          return res.status(400).json({
            ok: false,
            success: false,
            status: 400,
            error: 'Fotografía demasiado grande',
            userMessage: 'La fotografía excede el tamaño máximo permitido.',
          });
        }
        nextFotoUrl = candidateFoto;
      }
    }

    const { rows: duplicateUsers } = await query(
      `SELECT id, usuario, correo
       FROM usuarios
       WHERE id <> $1
         AND (LOWER(usuario) = LOWER($2) OR LOWER(correo) = LOWER($3))
       LIMIT 1;`,
      [authUserId, cleanUsername, cleanCorreo]
    );

    if (duplicateUsers.length > 0) {
      const dup = duplicateUsers[0];
      const sameUser =
        String(dup.usuario || '').toLowerCase() === cleanUsername.toLowerCase();
      return res.status(409).json({
        ok: false,
        success: false,
        status: 409,
        error: sameUser ? 'Usuario duplicado' : 'Correo duplicado',
        userMessage: sameUser
          ? 'Ese nombre de usuario ya está siendo utilizado por otra cuenta.'
          : 'Ese correo electrónico ya está registrado en otra cuenta.',
      });
    }

    const { rows: updatedRows } = await query(
      `UPDATE usuarios
       SET nombre_completo = $2,
           usuario = $3,
           correo = $4,
           foto_url = $5,
           actualizado_en = now()
       WHERE id = $1
       RETURNING id, usuario, nombre_completo, correo, rol, estado_cuenta,
                 codigo_vinculacion, foto_url, creado_en, ultimo_acceso,
                 consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en;`,
      [authUserId, cleanNombre, cleanUsername, cleanCorreo, nextFotoUrl]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      userMessage: 'Tu perfil se actualizó correctamente.',
      usuario: formatUsuarioPublico(updatedRows[0]),
    });
  } catch (error) {
    console.error('[Auth] Error actualizando perfil:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al actualizar perfil',
      userMessage: 'No fue posible guardar los cambios de tu perfil.',
    });
  }
};

export const cambiarPassword = async (req, res) => {
  try {
    const authUserId = req.user?.id || req.usuario?.id;
    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autorizado',
        userMessage: 'Debes iniciar sesión para cambiar tu contraseña.',
      });
    }

    const body = req.body || {};
    const passwordActual =
      typeof body.password_actual === 'string' ? body.password_actual : '';
    const passwordNueva =
      typeof body.password_nueva === 'string' ? body.password_nueva : '';

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Campos requeridos',
        userMessage: 'Ingresa tu contraseña actual y la nueva contraseña.',
      });
    }

    if (passwordNueva.length < 8) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Contraseña corta',
        userMessage: 'La nueva contraseña debe tener al menos 8 caracteres.',
      });
    }

    const { rows } = await query(
      `SELECT id, password_hash, estado_cuenta
       FROM usuarios
       WHERE id = $1
       LIMIT 1;`,
      [authUserId]
    );

    const current = rows[0];
    if (!current || current.estado_cuenta === 'SUSPENDIDA') {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'Sesión inválida',
        userMessage: 'Tu sesión ya no es válida.',
      });
    }

    const matches = await bcryptjs.compare(
      passwordActual,
      String(current.password_hash || '')
    );

    if (!matches) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Contraseña actual incorrecta',
        userMessage: 'La contraseña actual ingresada no coincide.',
      });
    }

    const newHash = await bcryptjs.hash(passwordNueva, 10);
    await query(
      `UPDATE usuarios
       SET password_hash = $2,
           actualizado_en = now()
       WHERE id = $1;`,
      [authUserId, newHash]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      userMessage: 'Tu contraseña se actualizó correctamente.',
    });
  } catch (error) {
    console.error(redactarPII(`[Auth] Error cambiando contraseña: ${error?.message || error}`));
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al cambiar contraseña',
      userMessage: 'No fue posible actualizar tu contraseña en este momento.',
    });
  }
};

export const aceptarConsentimientoLegal = async (req, res) => {
  try {
    const authUserId = req.user?.id || req.usuario?.id;
    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autorizado',
        userMessage: 'Debes iniciar sesión para registrar tu consentimiento.',
      });
    }

    await ensureConsentColumns();

    const rawVersion = String(req.body?.version || CONSENT_CURRENT_VERSION).trim();
    const version = rawVersion && rawVersion.length <= 24 ? rawVersion : CONSENT_CURRENT_VERSION;

    const { rows } = await query(
      `UPDATE usuarios
       SET consentimiento_aceptado = true,
           consentimiento_version = $2,
           consentimiento_aceptado_en = now(),
           actualizado_en = now()
       WHERE id = $1
       RETURNING id, usuario, nombre_completo, correo, rol, estado_cuenta,
                 codigo_vinculacion, foto_url, creado_en, ultimo_acceso,
                 consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en;`,
      [authUserId, version]
    );

    const updatedUser = rows[0];
    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        success: false,
        status: 404,
        error: 'Usuario no encontrado',
        userMessage: 'No encontramos la cuenta solicitada.',
      });
    }

    try {
      await query(
        `INSERT INTO bitacora_actividad (usuario_id, accion, entidad, entidad_id, detalle)
         VALUES ($1, 'CONSENTIMIENTO_LEGAL_ACEPTADO', 'usuarios', $1, $2);`,
        [authUserId, JSON.stringify({ version, marco: 'Ley 8968 CR' })]
      );
    } catch {
      // Continuar sin abortar si bitacora_actividad tiene esquema distinto
    }

    return res.status(200).json({
      ok: true,
      success: true,
      userMessage: 'Consentimiento legal registrado correctamente.',
      usuario: formatUsuarioPublico(updatedUser),
    });
  } catch (error) {
    console.error(redactarPII(`[Auth] Error registrando consentimiento: ${error?.message || error}`));
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al registrar consentimiento',
      userMessage: 'No fue posible registrar tu consentimiento en este momento.',
    });
  }
};

export const exportarMisDatosPersonales = async (req, res) => {
  try {
    const authUserId = req.user?.id || req.usuario?.id;
    if (!authUserId) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autorizado',
        userMessage: 'Debes iniciar sesión para exportar tus datos.',
      });
    }

    await ensureConsentColumns();

    const { rows: userRows } = await query(
      `SELECT id, usuario, nombre_completo, correo, rol, estado_cuenta,
              codigo_vinculacion, creado_en, ultimo_acceso,
              consentimiento_aceptado, consentimiento_version, consentimiento_aceptado_en
       FROM usuarios
       WHERE id = $1
       LIMIT 1;`,
      [authUserId]
    );

    const u = userRows[0];
    if (!u) {
      return res.status(404).json({
        ok: false,
        success: false,
        status: 404,
        error: 'Usuario no encontrado',
        userMessage: 'No encontramos la cuenta solicitada.',
      });
    }

    const { rows: countRows } = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM clientes WHERE cobrador_id = $1::uuid) AS clientes_activos,
         (SELECT COUNT(*)::int FROM prestamos WHERE cobrador_id = $1::uuid) AS prestamos_vigentes,
         (
           (SELECT COUNT(*)::int FROM clientes_baneados WHERE cobrador_id = $1::uuid AND fecha_borrado_definitivo > now()) +
           (SELECT COUNT(*)::int FROM prestamos_baneados WHERE cobrador_id = $1::uuid AND fecha_borrado_definitivo > now())
         ) AS registros_en_papelera;`,
      [authUserId]
    );

    const stats = countRows[0] || {
      clientes_activos: 0,
      prestamos_vigentes: 0,
      registros_en_papelera: 0,
    };

    const titular = {
      id: u.id,
      username: u.usuario,
      nombre_completo: u.nombre_completo,
      correo: u.correo,
      rol: u.rol,
      estado: u.estado_cuenta,
      codigo_vinculacion:
        u.codigo_vinculacion || `CF-${String(u.id).slice(0, 8).toUpperCase()}`,
      creado_en: u.creado_en,
      ultimo_acceso: u.ultimo_acceso || null,
      consentimiento_aceptado: Boolean(u.consentimiento_aceptado),
      consentimiento_version: u.consentimiento_version || null,
      consentimiento_aceptado_en: u.consentimiento_aceptado_en || null,
    };

    return res.status(200).json({
      ok: true,
      exportado_en: new Date().toISOString(),
      marco_legal: 'Ley 8968 de Costa Rica — Derechos ARCO de Acceso y Portabilidad',
      titular,
      resumen_operativo: {
        clientes_activos: Number(stats.clientes_activos || 0),
        prestamos_vigentes: Number(stats.prestamos_vigentes || 0),
        registros_en_papelera: Number(stats.registros_en_papelera || 0),
      },
    });
  } catch (error) {
    console.error(redactarPII(`[Auth] Error exportando datos ARCO: ${error?.message || error}`));
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error al exportar datos',
      userMessage: 'No fue posible preparar el archivo con tus datos en este momento.',
    });
  }
};

export default {
  login,
  registro,
  yo,
  perfil: yo,
  logout,
  actualizarPerfil,
  cambiarPassword,
  aceptarConsentimientoLegal,
  exportarMisDatosPersonales,
};

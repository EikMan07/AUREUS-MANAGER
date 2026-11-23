import crypto from 'node:crypto';
import { withTransaction } from '../config/db.js';
import { firmarToken } from '../middlewares/authMiddleware.js';
import {
  OAUTH_TX_MAX_AGE_MS,
  setOAuthTxCookie,
  clearOAuthTxCookie,
  readOAuthTxCookie,
  setSessionCookie,
} from '../utils/cookies.js';
import { aprovisionarEmpresaRag } from '../middlewares/ragLimites.js';
import { redactarPII } from '../utils/piiRedactor.js';
import {
  getFrontendUrl,
  generarPkcePair,
  generarAleatorioHex,
  compararTiempoConstante,
  esProveedorConfigurado,
  construirUrlAutorizacion,
  intercambiarYVerificarGoogle,
  intercambiarYVerificarGitHub,
} from '../services/oauth.service.js';

function redirectLoginError(res, errorCode) {
  return res.redirect(302, `${getFrontendUrl()}/login?oauth_error=${encodeURIComponent(errorCode)}`);
}

function normalizarBaseUsername(rawValue) {
  const ascii = String(rawValue || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  let base = ascii.slice(0, 22);
  if (base.length < 3) {
    base = `usr_${base || 'aureus'}`.slice(0, 22);
  }
  return base;
}

async function generarUsernameUnico(client, perfil) {
  const fuente =
    perfil.usernameSugerido ||
    (perfil.correo ? perfil.correo.split('@')[0] : '') ||
    perfil.nombreCompleto ||
    'usuario';
  const base = normalizarBaseUsername(fuente);

  const firstCheck = await client.query(
    'SELECT 1 FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1;',
    [base]
  );
  if (firstCheck.rows.length === 0) {
    return base;
  }

  for (let i = 0; i < 8; i += 1) {
    const suffix = crypto.randomBytes(3).toString('hex');
    const candidate = `${base.slice(0, 23)}_${suffix}`.slice(0, 30);
    const check = await client.query(
      'SELECT 1 FROM usuarios WHERE LOWER(usuario) = LOWER($1) LIMIT 1;',
      [candidate]
    );
    if (check.rows.length === 0) {
      return candidate;
    }
  }

  return `usr_${crypto.randomBytes(4).toString('hex')}`;
}

async function generarCodigoVinculacionUnico(client) {
  for (let i = 0; i < 8; i += 1) {
    const code = `CF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const check = await client.query(
      'SELECT 1 FROM usuarios WHERE codigo_vinculacion = $1 LIMIT 1;',
      [code]
    );
    if (check.rows.length === 0) {
      return code;
    }
  }
  return `CF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function iniciarOAuth(provider) {
  return (req, res) => {
    try {
      if (!esProveedorConfigurado(provider)) {
        return redirectLoginError(res, 'proveedor_no_disponible');
      }

      const { codeVerifier, codeChallenge } = generarPkcePair();
      const state = generarAleatorioHex(32);
      const nonce = provider === 'google' ? generarAleatorioHex(32) : '';

      setOAuthTxCookie(res, {
        provider,
        state,
        nonce,
        codeVerifier,
        exp: Date.now() + OAUTH_TX_MAX_AGE_MS,
      });

      const authUrl = construirUrlAutorizacion(provider, { state, nonce, codeChallenge });
      return res.redirect(302, authUrl);
    } catch (err) {
      console.error(redactarPII(`[OAuth] Error iniciando flujo ${provider}: ${err?.message || err}`));
      return redirectLoginError(res, 'error_externo');
    }
  };
}

function callbackOAuth(provider) {
  return async (req, res) => {
    // Una transacción OAuth es estrictamente de un solo uso
    clearOAuthTxCookie(res);

    try {
      if (req.query?.error) {
        return redirectLoginError(res, 'acceso_cancelado');
      }

      const code = typeof req.query?.code === 'string' ? req.query.code.trim() : '';
      const state = typeof req.query?.state === 'string' ? req.query.state.trim() : '';
      const tx = readOAuthTxCookie(req);

      if (
        !code ||
        !state ||
        !tx ||
        tx.provider !== provider ||
        !compararTiempoConstante(state, String(tx.state || ''))
      ) {
        return redirectLoginError(res, 'estado_invalido');
      }

      if (!esProveedorConfigurado(provider)) {
        return redirectLoginError(res, 'proveedor_no_disponible');
      }

      let perfil;
      try {
        if (provider === 'google') {
          perfil = await intercambiarYVerificarGoogle({
            code,
            codeVerifier: String(tx.codeVerifier || ''),
            expectedNonce: String(tx.nonce || ''),
          });
        } else {
          perfil = await intercambiarYVerificarGitHub({
            code,
            codeVerifier: String(tx.codeVerifier || ''),
          });
        }
      } catch (verifyErr) {
        if (verifyErr?.code === 'CORREO_NO_VERIFICADO') {
          return redirectLoginError(res, 'correo_no_verificado');
        }
        if (verifyErr?.code === 'ESTADO_INVALIDO') {
          return redirectLoginError(res, 'estado_invalido');
        }
        console.error(
          redactarPII(
            `[OAuth] Fallo verificando proveedor ${provider}: ${verifyErr?.message || verifyErr}`
          )
        );
        return redirectLoginError(res, 'error_externo');
      }

      const resolution = await withTransaction(async (client) => {
        const linkedRes = await client.query(
          `SELECT u.id, u.usuario, u.nombre_completo, u.correo,
                  u.rol::text AS rol, u.estado_cuenta::text AS estado_cuenta,
                  COALESCE(u.token_version, 1) AS token_version,
                  u.foto_url
           FROM cuentas_oauth co
           INNER JOIN usuarios u ON u.id = co.usuario_id
           WHERE co.proveedor = $1 AND co.proveedor_usuario_id = $2
           LIMIT 1;`,
          [provider, perfil.proveedorUsuarioId]
        );

        let usuario = linkedRes.rows[0] || null;
        if (!usuario) {
          const emailRes = await client.query(
            `SELECT id, usuario, nombre_completo, correo,
                    rol::text AS rol, estado_cuenta::text AS estado_cuenta,
                    COALESCE(token_version, 1) AS token_version,
                    foto_url
             FROM usuarios
             WHERE LOWER(correo) = LOWER($1)
             LIMIT 1;`,
            [perfil.correo]
          );
          usuario = emailRes.rows[0] || null;
        }

        let activeUser = null;
        let isNewUser = false;

        if (usuario) {
          if (String(usuario.rol || '').toUpperCase() === 'ADMINISTRADOR') {
            return { abortError: 'acceso_restringido' };
          }
          if (String(usuario.estado_cuenta || '').toUpperCase() !== 'ACTIVA') {
            return { abortError: 'cuenta_suspendida' };
          }

          await client.query(
            `INSERT INTO cuentas_oauth (usuario_id, proveedor, proveedor_usuario_id, correo_proveedor)
             VALUES ($1::uuid, $2, $3, $4)
             ON CONFLICT (proveedor, proveedor_usuario_id) DO NOTHING;`,
            [usuario.id, provider, perfil.proveedorUsuarioId, perfil.correo]
          );

          const updatedRes = await client.query(
            `UPDATE usuarios
             SET ultimo_acceso = now(),
                 correo_verificado = true,
                 correo_verificado_en = COALESCE(correo_verificado_en, now()),
                 intentos_fallidos = 0,
                 bloqueado_hasta = NULL,
                 foto_url = COALESCE(NULLIF(BTRIM(foto_url), ''), $2),
                 actualizado_en = now()
             WHERE id = $1::uuid
             RETURNING id, usuario, nombre_completo, correo,
                       rol::text AS rol, estado_cuenta::text AS estado_cuenta,
                       COALESCE(token_version, 1) AS token_version;`,
            [usuario.id, perfil.fotoUrl || null]
          );
          activeUser = updatedRes.rows[0] || usuario;
        } else {
          isNewUser = true;
          const username = await generarUsernameUnico(client, perfil);
          const codigoVinculacion = await generarCodigoVinculacionUnico(client);
          const cleanNombre = (perfil.nombreCompleto || username).slice(0, 120);

          const insertedRes = await client.query(
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
               foto_url,
               ultimo_acceso,
               consentimiento_aceptado,
               token_version
             ) VALUES (
               $1, $2, $3, true, now(), NULL, 'COBRADOR', 'ACTIVA', $4, $5, now(), false, 1
             )
             RETURNING id, usuario, nombre_completo, correo,
                       rol::text AS rol, estado_cuenta::text AS estado_cuenta,
                       COALESCE(token_version, 1) AS token_version;`,
            [username, cleanNombre, perfil.correo, codigoVinculacion, perfil.fotoUrl || null]
          );
          activeUser = insertedRes.rows[0];

          await client.query(
            `INSERT INTO cuentas_oauth (usuario_id, proveedor, proveedor_usuario_id, correo_proveedor)
             VALUES ($1::uuid, $2, $3, $4);`,
            [activeUser.id, provider, perfil.proveedorUsuarioId, perfil.correo]
          );
        }

        await client.query(
          `INSERT INTO bitacora_actividad (usuario_id, cobrador_id, accion, entidad, entidad_id, detalle)
           VALUES ($1::uuid, $1::uuid, 'INICIO_SESION'::public.accion_bitacora, 'sesiones', $1::uuid, $2::jsonb);`,
          [
            activeUser.id,
            JSON.stringify({
              rol: String(activeUser.rol || '').toUpperCase() || null,
              metodo: provider,
            }),
          ]
        );

        return { activeUser, isNewUser };
      });

      if (resolution?.abortError) {
        return redirectLoginError(res, resolution.abortError);
      }

      if (resolution.isNewUser) {
        await aprovisionarEmpresaRag(
          resolution.activeUser.id,
          resolution.activeUser.nombre_completo || resolution.activeUser.usuario,
          { seedBaseDocs: false }
        ).catch(() => {});
      }

      const sessionJwt = firmarToken(resolution.activeUser, { sessionStartedAt: Date.now() });
      setSessionCookie(res, sessionJwt);
      return res.redirect(302, `${getFrontendUrl()}/dashboard`);
    } catch (err) {
      console.error(redactarPII(`[OAuth] Error en callback ${provider}: ${err?.message || err}`));
      return redirectLoginError(res, 'error_externo');
    }
  };
}

export const iniciarOAuthGoogle = iniciarOAuth('google');
export const iniciarOAuthGitHub = iniciarOAuth('github');
export const callbackOAuthGoogle = callbackOAuth('google');
export const callbackOAuthGitHub = callbackOAuth('github');

export const getEstadoOAuthPublico = (_req, res) =>
  res.status(200).json({
    ok: true,
    google: esProveedorConfigurado('google'),
    github: esProveedorConfigurado('github'),
  });

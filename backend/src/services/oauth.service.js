import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const OAUTH_BACKEND_URL = (
  process.env.OAUTH_BACKEND_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(
  /\/+$/,
  ''
);

export const REDIRECT_URIS = {
  google: `${OAUTH_BACKEND_URL}/api/auth/oauth/google/callback`,
  github: `${OAUTH_BACKEND_URL}/api/auth/oauth/github/callback`,
};

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

export function getRedirectUri(provider) {
  const backendUrl = (process.env.OAUTH_BACKEND_URL || 'http://localhost:5000').replace(
    /\/+$/,
    ''
  );
  if (provider === 'google') {
    return `${backendUrl}/api/auth/oauth/google/callback`;
  }
  if (provider === 'github') {
    return `${backendUrl}/api/auth/oauth/github/callback`;
  }
  throw new Error(`Proveedor externo no soportado: ${provider}`);
}

export function generarPkcePair() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export function generarAleatorioHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function compararTiempoConstante(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function esProveedorConfigurado(provider) {
  if (provider === 'google') {
    return Boolean(
      String(process.env.GOOGLE_CLIENT_ID || '').trim() &&
        String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
    );
  }
  if (provider === 'github') {
    return Boolean(
      String(process.env.GITHUB_CLIENT_ID || '').trim() &&
        String(process.env.GITHUB_CLIENT_SECRET || '').trim()
    );
  }
  return false;
}

export function construirUrlAutorizacion(provider, { state, nonce, codeChallenge }) {
  const redirectUri = getRedirectUri(provider);

  if (provider === 'google') {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  if (provider === 'github') {
    const clientId = String(process.env.GITHUB_CLIENT_ID || '').trim();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  throw new Error(`Proveedor externo no soportado: ${provider}`);
}

export async function intercambiarYVerificarGoogle({ code, codeVerifier, expectedNonce }) {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = getRedirectUri('google');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.id_token) {
    const err = new Error('No se pudo validar la credencial externa de Google.');
    err.code = 'ERROR_EXTERNO';
    throw err;
  }

  const { payload } = await jwtVerify(tokenData.id_token, GOOGLE_JWKS, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  if (!compararTiempoConstante(String(payload.nonce || ''), String(expectedNonce || ''))) {
    const err = new Error('Nonce inválido en la respuesta de Google.');
    err.code = 'ESTADO_INVALIDO';
    throw err;
  }

  if (payload.email_verified !== true) {
    const err = new Error('El correo de Google no se encuentra verificado.');
    err.code = 'CORREO_NO_VERIFICADO';
    throw err;
  }

  if (!payload.sub || !payload.email) {
    const err = new Error('Faltan atributos esenciales de identidad en Google.');
    err.code = 'ERROR_EXTERNO';
    throw err;
  }

  const picture =
    typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null;

  return {
    proveedor: 'google',
    proveedorUsuarioId: String(payload.sub),
    correo: String(payload.email).trim().toLowerCase(),
    nombreCompleto: String(payload.name || '').trim(),
    fotoUrl: picture,
  };
}

export async function intercambiarYVerificarGitHub({ code, codeVerifier }) {
  const clientId = String(process.env.GITHUB_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.GITHUB_CLIENT_SECRET || '').trim();
  const redirectUri = getRedirectUri('github');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.access_token) {
    const err = new Error('No se pudo obtener el acceso de GitHub.');
    err.code = 'ERROR_EXTERNO';
    throw err;
  }

  const githubHeaders = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Aureus-Manager',
  };

  const [userRes, emailsRes] = await Promise.all([
    fetch('https://api.github.com/user', { headers: githubHeaders }),
    fetch('https://api.github.com/user/emails', { headers: githubHeaders }),
  ]);

  if (!userRes.ok || !emailsRes.ok) {
    const err = new Error('No se pudo consultar la identidad en GitHub.');
    err.code = 'ERROR_EXTERNO';
    throw err;
  }

  const [userProfile, emailsList] = await Promise.all([
    userRes.json().catch(() => null),
    emailsRes.json().catch(() => []),
  ]);

  if (!userProfile?.id || !Array.isArray(emailsList)) {
    const err = new Error('Perfil o correos inválidos en GitHub.');
    err.code = 'ERROR_EXTERNO';
    throw err;
  }

  const verifiedEmail =
    emailsList.find((item) => item?.primary === true && item?.verified === true && item?.email) ||
    emailsList.find((item) => item?.verified === true && item?.email);

  if (!verifiedEmail) {
    const err = new Error('La cuenta de GitHub no posee un correo verificado.');
    err.code = 'CORREO_NO_VERIFICADO';
    throw err;
  }

  const avatarUrl =
    typeof userProfile.avatar_url === 'string' && userProfile.avatar_url.startsWith('https://')
      ? userProfile.avatar_url
      : null;

  return {
    proveedor: 'github',
    proveedorUsuarioId: String(userProfile.id),
    correo: String(verifiedEmail.email).trim().toLowerCase(),
    nombreCompleto: String(userProfile.name || userProfile.login || '').trim(),
    usernameSugerido: String(userProfile.login || '').trim(),
    fotoUrl: avatarUrl,
  };
}

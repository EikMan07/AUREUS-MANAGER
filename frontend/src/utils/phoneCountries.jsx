import React from 'react';

/**
 * Catálogo oficial de países soportados para teléfonos en Aureus Manager
 * Clasificados por cantidad exacta de dígitos requeridos y esquemas de grupos con guiones.
 */
export const PHONE_COUNTRIES = [
  // ── Grupo 8 dígitos ──────────────────────────────────────────────────────────
  {
    id: 'CR',
    name: 'Costa Rica',
    code: '+506',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'NI',
    name: 'Nicaragua',
    code: '+505',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'PA',
    name: 'Panamá',
    code: '+507',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'SV',
    name: 'El Salvador',
    code: '+503',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'HN',
    name: 'Honduras',
    code: '+504',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'GT',
    name: 'Guatemala',
    code: '+502',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },
  {
    id: 'CU',
    name: 'Cuba',
    code: '+53',
    digits: 8,
    groups: [4, 4],
    placeholder: 'XXXX-XXXX'
  },

  // ── Grupo 9 dígitos ──────────────────────────────────────────────────────────
  {
    id: 'ES',
    name: 'España',
    code: '+34',
    digits: 9,
    groups: [3, 3, 3],
    placeholder: 'XXX-XXX-XXX'
  },
  {
    id: 'PE',
    name: 'Perú',
    code: '+51',
    digits: 9,
    groups: [3, 3, 3],
    placeholder: 'XXX-XXX-XXX'
  },
  {
    id: 'CL',
    name: 'Chile',
    code: '+56',
    digits: 9,
    groups: [1, 4, 4],
    placeholder: 'X-XXXX-XXXX'
  },
  {
    id: 'EC',
    name: 'Ecuador',
    code: '+593',
    digits: 9,
    groups: [2, 3, 4],
    placeholder: 'XX-XXX-XXXX'
  },

  // ── Grupo 10 dígitos ─────────────────────────────────────────────────────────
  {
    id: 'US',
    name: 'Estados Unidos',
    code: '+1',
    digits: 10,
    groups: [3, 3, 4],
    placeholder: 'XXX-XXX-XXXX'
  },
  {
    id: 'CA',
    name: 'Canadá',
    code: '+1',
    digits: 10,
    groups: [3, 3, 4],
    placeholder: 'XXX-XXX-XXXX'
  },
  {
    id: 'DO',
    name: 'República Dominicana',
    code: '+1',
    digits: 10,
    groups: [3, 3, 4],
    placeholder: 'XXX-XXX-XXXX'
  },
  {
    id: 'CO',
    name: 'Colombia',
    code: '+57',
    digits: 10,
    groups: [3, 3, 4],
    placeholder: 'XXX-XXX-XXXX'
  },
  {
    id: 'VE',
    name: 'Venezuela',
    code: '+58',
    digits: 10,
    groups: [3, 3, 4],
    placeholder: 'XXX-XXX-XXXX'
  },
  {
    id: 'MX',
    name: 'México',
    code: '+52',
    digits: 10,
    groups: [2, 4, 4],
    placeholder: 'XX-XXXX-XXXX'
  },
  {
    id: 'AR',
    name: 'Argentina',
    code: '+54',
    digits: 10,
    groups: [2, 4, 4],
    placeholder: 'XX-XXXX-XXXX'
  }
];

export const DEFAULT_COUNTRY = PHONE_COUNTRIES[0]; // Costa Rica (CR)

/**
 * Componente Vectorial SVG puro de Banderas Oficiales
 * Cero emojis Unicode. Renderizado nítido en cualquier resolución.
 */
export function CountryFlagSvg({ countryId, size = 22, className = '' }) {
  const width = size;
  const height = Math.round(size * 0.72);
  const clipId = `flag-clip-${countryId}-${size}`;

  const renderFlagGraphics = () => {
    switch (countryId) {
      case 'CR': // Costa Rica: Azul, Blanco, Rojo (doble), Blanco, Azul
        return (
          <g>
            <rect width="28" height="20" fill="#002B7F" />
            <rect y="3.33" width="28" height="13.34" fill="#FFFFFF" />
            <rect y="6.67" width="28" height="6.66" fill="#CE1126" />
          </g>
        );

      case 'NI': // Nicaragua: Azul, Blanco, Azul con triángulo
        return (
          <g>
            <rect width="28" height="20" fill="#0067C6" />
            <rect y="6.67" width="28" height="6.66" fill="#FFFFFF" />
            <polygon points="14,8 11.5,12 16.5,12" fill="#DAA520" />
            <polygon points="14,8.8 12.3,11.5 15.7,11.5" fill="#0067C6" />
          </g>
        );

      case 'PA': // Panamá: 4 cuadrantes y dos estrellas
        return (
          <g>
            <rect width="28" height="20" fill="#FFFFFF" />
            <rect x="14" width="14" height="10" fill="#D21034" />
            <rect y="10" width="14" height="10" fill="#005293" />
            <polygon points="7,2.5 8,5.5 10.5,5.5 8.5,7 9.2,9.5 7,8 4.8,9.5 5.5,7 3.5,5.5 6,5.5" fill="#005293" />
            <polygon points="21,12.5 22,15.5 24.5,15.5 22.5,17 23.2,19.5 21,18 18.8,19.5 19.5,17 17.5,15.5 20,15.5" fill="#D21034" />
          </g>
        );

      case 'SV': // El Salvador: Azul, Blanco, Azul con escudo central
        return (
          <g>
            <rect width="28" height="20" fill="#0047AB" />
            <rect y="6.67" width="28" height="6.66" fill="#FFFFFF" />
            <circle cx="14" cy="10" r="2.4" fill="#DAA520" />
            <polygon points="14,8.5 12,11 16,11" fill="#0047AB" />
          </g>
        );

      case 'HN': // Honduras: Turquesa, Blanco, Turquesa con 5 estrellas
        return (
          <g>
            <rect width="28" height="20" fill="#00BCE4" />
            <rect y="6.67" width="28" height="6.66" fill="#FFFFFF" />
            <circle cx="11" cy="8.5" r="0.8" fill="#00BCE4" />
            <circle cx="17" cy="8.5" r="0.8" fill="#00BCE4" />
            <circle cx="14" cy="10" r="0.9" fill="#00BCE4" />
            <circle cx="11" cy="11.5" r="0.8" fill="#00BCE4" />
            <circle cx="17" cy="11.5" r="0.8" fill="#00BCE4" />
          </g>
        );

      case 'GT': // Guatemala: 3 franjas verticales (Celeste, Blanco, Celeste)
        return (
          <g>
            <rect width="28" height="20" fill="#FFFFFF" />
            <rect width="9.33" height="20" fill="#4997D0" />
            <rect x="18.67" width="9.33" height="20" fill="#4997D0" />
            <circle cx="14" cy="10" r="2" fill="#DAA520" />
            <circle cx="14" cy="10" r="1.3" fill="#2E7D32" />
          </g>
        );

      case 'CU': // Cuba: 5 franjas (azul/blanco) y triángulo rojo con estrella
        return (
          <g>
            <rect width="28" height="20" fill="#002A8F" />
            <rect y="4" width="28" height="4" fill="#FFFFFF" />
            <rect y="12" width="28" height="4" fill="#FFFFFF" />
            <polygon points="0,0 12,10 0,20" fill="#CF142B" />
            <polygon points="4,7.5 4.8,9.5 6.8,9.5 5.2,10.6 5.8,12.5 4,11.3 2.2,12.5 2.8,10.6 1.2,9.5 3.2,9.5" fill="#FFFFFF" />
          </g>
        );

      case 'ES': // España: Rojo, Amarillo (doble), Rojo
        return (
          <g>
            <rect width="28" height="20" fill="#AA151B" />
            <rect y="5" width="28" height="10" fill="#F1BF00" />
            <rect x="6" y="8" width="3" height="4" rx="0.5" fill="#AA151B" />
          </g>
        );

      case 'PE': // Perú: 3 franjas verticales (Rojo, Blanco, Rojo)
        return (
          <g>
            <rect width="28" height="20" fill="#FFFFFF" />
            <rect width="9.33" height="20" fill="#D91023" />
            <rect x="18.67" width="9.33" height="20" fill="#D91023" />
          </g>
        );

      case 'CL': // Chile: Blanco/Rojo con cuadro azul y estrella blanca
        return (
          <g>
            <rect width="28" height="20" fill="#D52B1E" />
            <rect width="28" height="10" fill="#FFFFFF" />
            <rect width="10" height="10" fill="#0039A6" />
            <polygon points="5,2.5 5.8,4.5 8,4.5 6.2,5.8 6.9,8 5,6.7 3.1,8 3.8,5.8 2,4.5 4.2,4.5" fill="#FFFFFF" />
          </g>
        );

      case 'EC': // Ecuador: Amarillo (mitad), Azul, Rojo con escudo
        return (
          <g>
            <rect width="28" height="20" fill="#EF3340" />
            <rect width="28" height="15" fill="#0072CE" />
            <rect width="28" height="10" fill="#FFD100" />
            <ellipse cx="14" cy="12.5" rx="2.5" ry="2" fill="#DAA520" />
            <ellipse cx="14" cy="12.5" rx="1.6" ry="1.3" fill="#0072CE" />
          </g>
        );

      case 'US': // Estados Unidos: Franjas rojas/blancas y cantón azul
        return (
          <g>
            <rect width="28" height="20" fill="#B22234" />
            <rect y="2.8" width="28" height="2.8" fill="#FFFFFF" />
            <rect y="8.4" width="28" height="2.8" fill="#FFFFFF" />
            <rect y="14" width="28" height="2.8" fill="#FFFFFF" />
            <rect width="13" height="11" fill="#3C3B6E" />
            <circle cx="3.5" cy="3.5" r="0.7" fill="#FFFFFF" />
            <circle cx="6.5" cy="3.5" r="0.7" fill="#FFFFFF" />
            <circle cx="9.5" cy="3.5" r="0.7" fill="#FFFFFF" />
            <circle cx="5" cy="5.5" r="0.7" fill="#FFFFFF" />
            <circle cx="8" cy="5.5" r="0.7" fill="#FFFFFF" />
            <circle cx="3.5" cy="7.5" r="0.7" fill="#FFFFFF" />
            <circle cx="6.5" cy="7.5" r="0.7" fill="#FFFFFF" />
            <circle cx="9.5" cy="7.5" r="0.7" fill="#FFFFFF" />
          </g>
        );

      case 'CA': // Canadá: Rojo, Blanco (doble), Rojo con hoja de arce
        return (
          <g>
            <rect width="28" height="20" fill="#FF0000" />
            <rect x="7" width="14" height="20" fill="#FFFFFF" />
            <polygon points="14,4 15.5,8 18,7 16.5,10 19,11.5 15,13.5 15.3,16 14,14.5 12.7,16 13,13.5 9,11.5 11.5,10 10,7 12.5,8" fill="#FF0000" />
          </g>
        );

      case 'DO': // República Dominicana: Cruz blanca y 4 cuadrantes
        return (
          <g>
            <rect width="28" height="20" fill="#FFFFFF" />
            <rect width="12" height="8" fill="#002D62" />
            <rect x="16" width="12" height="8" fill="#CE1126" />
            <rect y="12" width="12" height="8" fill="#CE1126" />
            <rect x="16" y="12" width="12" height="8" fill="#002D62" />
            <rect x="12.5" y="8.5" width="3" height="3" fill="#007A3D" />
          </g>
        );

      case 'CO': // Colombia: Amarillo (mitad), Azul, Rojo
        return (
          <g>
            <rect width="28" height="20" fill="#CE1126" />
            <rect width="28" height="15" fill="#003893" />
            <rect width="28" height="10" fill="#FCD116" />
          </g>
        );

      case 'VE': // Venezuela: Amarillo, Azul, Rojo con arco de estrellas
        return (
          <g>
            <rect width="28" height="20" fill="#CF142B" />
            <rect width="28" height="13.33" fill="#00247D" />
            <rect width="28" height="6.67" fill="#FCE300" />
            <circle cx="10" cy="10" r="0.6" fill="#FFFFFF" />
            <circle cx="12" cy="9" r="0.6" fill="#FFFFFF" />
            <circle cx="14" cy="8.7" r="0.6" fill="#FFFFFF" />
            <circle cx="16" cy="9" r="0.6" fill="#FFFFFF" />
            <circle cx="18" cy="10" r="0.6" fill="#FFFFFF" />
          </g>
        );

      case 'MX': // México: Verde, Blanco, Rojo con escudo
        return (
          <g>
            <rect width="28" height="20" fill="#FFFFFF" />
            <rect width="9.33" height="20" fill="#006847" />
            <rect x="18.67" width="9.33" height="20" fill="#CE1126" />
            <ellipse cx="14" cy="10" rx="2.4" ry="2" fill="#8B5A2B" />
            <circle cx="14" cy="9" r="1.1" fill="#DAA520" />
          </g>
        );

      case 'AR': // Argentina: Celeste, Blanco, Celeste con Sol de Mayo
        return (
          <g>
            <rect width="28" height="20" fill="#75AADB" />
            <rect y="6.67" width="28" height="6.66" fill="#FFFFFF" />
            <circle cx="14" cy="10" r="1.8" fill="#F6B40E" />
            <circle cx="14" cy="10" r="1" fill="#85530B" />
          </g>
        );

      default:
        return <rect width="28" height="20" fill="#94A3B8" />;
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 20"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        borderRadius: '3px',
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="28" height="20" rx="3" ry="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {renderFlagGraphics()}
      </g>
      <rect
        width="28"
        height="20"
        rx="3"
        ry="3"
        fill="none"
        stroke="rgba(0, 0, 0, 0.12)"
        strokeWidth="1"
      />
    </svg>
  );
}

/**
 * Divide una cadena numérica pura según los grupos especificados (ej. [4, 4] -> "XXXX-XXXX")
 */
export function formatDigitsByGroups(rawDigits = '', groups = [4, 4], maxDigits = 8) {
  const digits = String(rawDigits || '').replace(/\D/g, '').slice(0, maxDigits);
  if (!digits) return '';

  const chunks = [];
  let currentIndex = 0;

  for (const groupSize of groups) {
    if (currentIndex >= digits.length) break;
    const chunk = digits.slice(currentIndex, currentIndex + groupSize);
    if (chunk) {
      chunks.push(chunk);
      currentIndex += groupSize;
    }
  }

  if (currentIndex < digits.length) {
    chunks.push(digits.slice(currentIndex));
  }

  return chunks.join('-');
}

/**
 * Analiza un teléfono guardado en la base de datos (ej. "+506 8888-8888", "+505 8888-1234", "8888-8888")
 * y detecta el país correspondiente y los dígitos locales formateados.
 */
export function parseStoredPhone(storedValue = '') {
  const cleanStr = String(storedValue || '').trim();
  if (!cleanStr) {
    return {
      country: DEFAULT_COUNTRY,
      digits: '',
      formatted: ''
    };
  }

  if (cleanStr.startsWith('+')) {
    const sortedCountries = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const country of sortedCountries) {
      if (cleanStr.startsWith(country.code)) {
        const remainder = cleanStr.slice(country.code.length).trim();
        const rawDigits = remainder.replace(/\D/g, '').slice(0, country.digits);
        return {
          country,
          digits: rawDigits,
          formatted: formatDigitsByGroups(rawDigits, country.groups, country.digits)
        };
      }
    }
  }

  const rawDigits = cleanStr.replace(/\D/g, '').slice(0, DEFAULT_COUNTRY.digits);
  return {
    country: DEFAULT_COUNTRY,
    digits: rawDigits,
    formatted: formatDigitsByGroups(rawDigits, DEFAULT_COUNTRY.groups, DEFAULT_COUNTRY.digits)
  };
}

/**
 * Construye la cadena completa con código de país para guardar en PostgreSQL (ej. "+506 8888-8888")
 */
export function buildStoredPhone(country = DEFAULT_COUNTRY, rawDigits = '') {
  const digits = String(rawDigits || '').replace(/\D/g, '').slice(0, country.digits);
  if (!digits) return '';
  const formatted = formatDigitsByGroups(digits, country.groups, country.digits);
  return `${country.code} ${formatted}`.trim();
}

/**
 * Normaliza cualquier formato de teléfono a una llave única para verificación de duplicados:
 * - "+506 8888-8888" -> "+50688888888"
 * - "8888-8888"       -> "+50688888888" (asume CR si no trae prefijo internacional)
 * - "+505 8888-8888" -> "+50588888888"
 */
export function normalizePhoneKey(phoneStr = '') {
  const str = String(phoneStr || '').trim();
  if (!str) return '';

  if (str.startsWith('+')) {
    const sortedCountries = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sortedCountries) {
      if (str.startsWith(c.code)) {
        const digits = str.slice(c.code.length).replace(/\D/g, '');
        return `${c.code}${digits}`;
      }
    }
    const codeMatch = str.match(/^\+\d{1,4}/);
    if (codeMatch) {
      const code = codeMatch[0];
      const rest = str.slice(code.length).replace(/\D/g, '');
      return `${code}${rest}`;
    }
  }

  const localDigits = str.replace(/\D/g, '');
  return `${DEFAULT_COUNTRY.code}${localDigits}`;
}

export function findCountryById(id) {
  return PHONE_COUNTRIES.find((c) => c.id === id) || DEFAULT_COUNTRY;
}

export function findCountryByCode(code) {
  return PHONE_COUNTRIES.find((c) => c.code === code) || DEFAULT_COUNTRY;
}


import React, { useId } from 'react';

/**
 * Logotipo vectorial oficial de Aureus Manager:
 * Escudo hexagonal abierto dorado y letra "A" geométrica facetada 3D sobre fondo oscuro.
 *
 * @param {number} [size=40] - Tamaño cuadrado en píxeles
 */
export function AureusLogo({ size = 40 }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `aureusBg-${uid}`;
  const shieldId = `aureusShield-${uid}`;
  const brightId = `aureusBright-${uid}`;
  const midId = `aureusMid-${uid}`;
  const darkId = `aureusDark-${uid}`;
  const deepId = `aureusDeep-${uid}`;
  const radius = size >= 52 ? '16px' : '12px';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: radius,
        background: 'linear-gradient(135deg, #1E2936 0%, #101823 100%)',
        border: '1px solid rgba(198, 164, 86, 0.52)',
        boxShadow: '0 4px 12px rgba(16, 24, 35, 0.24)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.86)}
        height={Math.round(size * 0.86)}
        viewBox="64 42 384 416"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E2936" />
            <stop offset="100%" stopColor="#101823" />
          </linearGradient>
          <linearGradient id={shieldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E4C678" />
            <stop offset="50%" stopColor="#C8A555" />
            <stop offset="100%" stopColor="#9A7934" />
          </linearGradient>
          <linearGradient id={brightId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FAECB8" />
            <stop offset="55%" stopColor="#E2BF6B" />
            <stop offset="100%" stopColor="#C59F49" />
          </linearGradient>
          <linearGradient id={midId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E6C574" />
            <stop offset="100%" stopColor="#AF8939" />
          </linearGradient>
          <linearGradient id={darkId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A88234" />
            <stop offset="100%" stopColor="#76571B" />
          </linearGradient>
          <linearGradient id={deepId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8A6824" />
            <stop offset="100%" stopColor="#5E4414" />
          </linearGradient>
        </defs>

        <g fill="none" stroke={`url(#${shieldId})`} strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter">
          <polyline points="200,104 110,136 110,296" />
          <polyline points="312,104 402,136 402,296" />
          <polyline points="184,394 256,442 328,394" />
        </g>

        <g strokeLinejoin="round">
          <polygon points="256,60 256,160 206,282 184,306" fill={`url(#${darkId})`} />
          <polygon points="256,60 184,306 108,376 218,128" fill={`url(#${brightId})`} />
          <polygon points="256,60 108,376 178,376 206,282" fill={`url(#${midId})`} />

          <polygon points="256,60 256,160 322,336 368,342" fill={`url(#${deepId})`} />
          <polygon points="256,60 368,342 404,376 300,128" fill={`url(#${brightId})`} />
          <polygon points="322,336 368,342 404,376 332,376" fill={`url(#${darkId})`} />

          <polygon points="184,306 334,234 306,266 154,344" fill={`url(#${brightId})`} />
          <polygon points="154,344 306,266 312,286 178,376 108,376" fill={`url(#${darkId})`} />
        </g>
      </svg>
    </div>
  );
}

export default AureusLogo;

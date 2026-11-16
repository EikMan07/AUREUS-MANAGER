import React from 'react';

/**
 * Arquitectura Neoclásica-Futurista Compartida (Aureus Capital).
 *
 * Incluye:
 * 1. `<ClassicalArchitecturalBackdrop scene={...} isDark={isDark} />`:
 *    Escenas arquitectónicas grecorromanas en filigrana dorada ( Panteón de Agripa,
 *    Partenón de Atenas, Templo de Saturno, Ágora de Atenas, Arco de Tito y
 *    Coliseo / Rostra Imperial ) con resplandor radial elíptico difuso y partículas
 *    doradas flotantes (CERO conos triangulares estáticos de luz de escenario).
 * 2. `<FlutedPilasters isDark={isDark} />`:
 *    Pilastras acanaladas corintias laterales con greca imperial.
 * 3. `<ClassicalLaurelDivider isDark={isDark} compact={false} />`:
 *    Divisor ornamental de Greca Griega + Corona de Laurel Romana.
 * 4. `<ImperialCornerAccents isDark={isDark} />`:
 *    Esquinas arquitectónicas en filigrana dorada (`15px x 15px`) para tarjetas.
 * 5. `handleSpotlightMouseMove(e)`:
 *    Helper React Bits Pro para seguimiento de cursor en `.rb-spotlight-card`.
 */

const GOLDEN_PARTICLES = [
  { left: '8%', top: '16%', size: 2.5, duration: '9s', delay: '0s' },
  { left: '19%', top: '68%', size: 2, duration: '11s', delay: '1.4s' },
  { left: '31%', top: '28%', size: 3, duration: '10s', delay: '2.2s' },
  { left: '46%', top: '76%', size: 2, duration: '12s', delay: '0.8s' },
  { left: '58%', top: '22%', size: 2.5, duration: '9.5s', delay: '3.1s' },
  { left: '72%', top: '62%', size: 3, duration: '11.5s', delay: '1.9s' },
  { left: '84%', top: '32%', size: 2, duration: '10.5s', delay: '2.7s' },
  { left: '91%', top: '74%', size: 2.5, duration: '12.5s', delay: '0.4s' },
];

export const handleSpotlightMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
};

export const ImperialCornerAccents = ({ isDark = true }) => {
  const strokeColor = isDark ? 'rgba(212, 180, 106, 0.44)' : 'rgba(139, 105, 20, 0.36)';
  return (
    <div
      className="aureus-corner-accents-wrapper"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      {/* Top-Left */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        style={{ position: 'absolute', top: '6px', left: '6px' }}
      >
        <path d="M1 15 V1 H15" stroke={strokeColor} strokeWidth="1.25" />
        <path d="M4 11 V4 H11" stroke={strokeColor} strokeWidth="0.85" opacity="0.75" />
        <rect x="2.2" y="2.2" width="2.2" height="2.2" fill={strokeColor} />
      </svg>
      {/* Top-Right */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        style={{ position: 'absolute', top: '6px', right: '6px' }}
      >
        <path d="M15 15 V1 H1" stroke={strokeColor} strokeWidth="1.25" />
        <path d="M12 11 V4 H5" stroke={strokeColor} strokeWidth="0.85" opacity="0.75" />
        <rect x="11.6" y="2.2" width="2.2" height="2.2" fill={strokeColor} />
      </svg>
      {/* Bottom-Left */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        style={{ position: 'absolute', bottom: '6px', left: '6px' }}
      >
        <path d="M1 1 V15 H15" stroke={strokeColor} strokeWidth="1.25" />
        <path d="M4 5 V12 H11" stroke={strokeColor} strokeWidth="0.85" opacity="0.75" />
        <rect x="2.2" y="11.6" width="2.2" height="2.2" fill={strokeColor} />
      </svg>
      {/* Bottom-Right */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        style={{ position: 'absolute', bottom: '6px', right: '6px' }}
      >
        <path d="M15 1 V15 H1" stroke={strokeColor} strokeWidth="1.25" />
        <path d="M12 5 V12 H5" stroke={strokeColor} strokeWidth="0.85" opacity="0.75" />
        <rect x="11.6" y="11.6" width="2.2" height="2.2" fill={strokeColor} />
      </svg>
    </div>
  );
};

export const ClassicalLaurelDivider = ({ isDark = true, compact = false, style = {} }) => {
  const strokeMain = isDark ? 'rgba(212, 180, 106, 0.42)' : 'rgba(139, 105, 20, 0.36)';
  const strokeSoft = isDark ? 'rgba(212, 180, 106, 0.20)' : 'rgba(139, 105, 20, 0.18)';
  const fillAccent = isDark ? '#E5C97B' : '#9A7B38';

  return (
    <div
      className="classical-laurel-divider"
      aria-hidden="true"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: compact ? '10px auto 16px' : '18px auto 26px',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      <svg
        width={compact ? '280' : '380'}
        height={compact ? '22' : '28'}
        viewBox="0 0 380 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ maxWidth: '100%', overflow: 'visible' }}
      >
        {/* Línea y Greca Izquierda */}
        <line x1="8" y1="14" x2="132" y2="14" stroke={strokeSoft} strokeWidth="1" />
        <path
          d="M68 14 V9 H78 V19 H72 V14 M88 14 V9 H98 V19 H92 V14 M108 14 V9 H118 V19 H112 V14"
          stroke={strokeMain}
          strokeWidth="1.05"
          fill="none"
        />
        {/* Corona de Laurel Central */}
        <path
          d="M184 22 C170 20 160 15 154 7"
          stroke={strokeMain}
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M174 19 C170 16 169 13 172 11 C175 13 175 16 174 19 Z" fill={strokeMain} />
        <path d="M164 15 C160 12 160 9 163 7 C166 9 166 12 164 15 Z" fill={strokeMain} />

        <path
          d="M196 22 C210 20 220 15 226 7"
          stroke={strokeMain}
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M206 19 C210 16 211 13 208 11 C205 13 205 16 206 19 Z" fill={strokeMain} />
        <path d="M216 15 C220 12 220 9 217 7 C214 9 214 12 216 15 Z" fill={strokeMain} />

        {/* Diamante Imperial Central */}
        <polygon points="190,7 195,14 190,21 185,14" fill={fillAccent} />
        <circle cx="144" cy="14" r="2" fill={fillAccent} opacity="0.75" />
        <circle cx="236" cy="14" r="2" fill={fillAccent} opacity="0.75" />

        {/* Línea y Greca Derecha */}
        <line x1="248" y1="14" x2="372" y2="14" stroke={strokeSoft} strokeWidth="1" />
        <path
          d="M262 14 V9 H272 V19 H266 V14 M282 14 V9 H292 V19 H286 V14 M302 14 V9 H312 V19 H306 V14"
          stroke={strokeMain}
          strokeWidth="1.05"
          fill="none"
        />
      </svg>
    </div>
  );
};

export const FlutedPilasters = ({ isDark = true }) => {
  const strokeColor = isDark ? '#D4B46A' : '#8B6914';
  const pilasterOpacity = isDark ? 0.1 : 0.14;

  return (
    <div
      className="classical-fluted-pilasters"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Pilastra Izquierda */}
      <svg
        width="38"
        height="100%"
        viewBox="0 0 38 900"
        preserveAspectRatio="none"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '38px',
          height: '100vh',
          opacity: pilasterOpacity,
          pointerEvents: 'none',
        }}
      >
        <rect x="2" y="0" width="32" height="22" stroke={strokeColor} strokeWidth="1.2" fill="none" />
        <path d="M4 22 C10 34 26 34 32 22" stroke={strokeColor} strokeWidth="1.1" fill="none" />
        <line x1="8" y1="36" x2="8" y2="864" stroke={strokeColor} strokeWidth="1" />
        <line x1="14" y1="36" x2="14" y2="864" stroke={strokeColor} strokeWidth="0.85" />
        <line x1="20" y1="36" x2="20" y2="864" stroke={strokeColor} strokeWidth="0.85" />
        <line x1="26" y1="36" x2="26" y2="864" stroke={strokeColor} strokeWidth="1" />
        <rect x="2" y="864" width="32" height="36" stroke={strokeColor} strokeWidth="1.2" fill="none" />
      </svg>

      {/* Pilastra Derecha */}
      <svg
        width="38"
        height="100%"
        viewBox="0 0 38 900"
        preserveAspectRatio="none"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '38px',
          height: '100vh',
          opacity: pilasterOpacity,
          pointerEvents: 'none',
        }}
      >
        <rect x="4" y="0" width="32" height="22" stroke={strokeColor} strokeWidth="1.2" fill="none" />
        <path d="M6 22 C12 34 28 34 34 22" stroke={strokeColor} strokeWidth="1.1" fill="none" />
        <line x1="12" y1="36" x2="12" y2="864" stroke={strokeColor} strokeWidth="1" />
        <line x1="18" y1="36" x2="18" y2="864" stroke={strokeColor} strokeWidth="0.85" />
        <line x1="24" y1="36" x2="24" y2="864" stroke={strokeColor} strokeWidth="0.85" />
        <line x1="30" y1="36" x2="30" y2="864" stroke={strokeColor} strokeWidth="1" />
        <rect x="4" y="864" width="32" height="36" stroke={strokeColor} strokeWidth="1.2" fill="none" />
      </svg>
    </div>
  );
};

export const ClassicalArchitecturalBackdrop = ({ scene, activeScreen, isDark = true }) => {
  const strokeGold = isDark ? 'rgba(212, 180, 106, 0.14)' : 'rgba(139, 105, 20, 0.13)';
  const strokeFine = isDark ? 'rgba(212, 180, 106, 0.08)' : 'rgba(139, 105, 20, 0.08)';
  const normalizedScene = String(scene || activeScreen || 'inicio').toLowerCase();

  return (
    <div
      className="classical-architectural-backdrop aureus-classical-backdrop"
      data-testid={`classical-backdrop-${normalizedScene}`}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        background: isDark
          ? 'radial-gradient(ellipse 65% 45% at 50% 18%, rgba(212, 180, 106, 0.10) 0%, transparent 75%)'
          : 'radial-gradient(ellipse 65% 45% at 50% 18%, rgba(182, 154, 85, 0.11) 0%, transparent 75%)',
      }}
    >
      {/* Partículas flotantes de polvo de oro */}
      {GOLDEN_PARTICLES.map((p, idx) => (
        <span
          key={idx}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: isDark ? 'rgba(229, 201, 123, 0.35)' : 'rgba(166, 128, 42, 0.30)',
            boxShadow: isDark
              ? '0 0 8px rgba(229, 201, 123, 0.45)'
              : '0 0 6px rgba(166, 128, 42, 0.35)',
            animation: `aureusFloatParticle ${p.duration} ease-in-out ${p.delay} infinite alternate`,
          }}
        />
      ))}

      {/* Escena I: Inicio / Cobros — Cúpula con Casetones del Panteón de Agripa + Óculo Imperial */}
      {(normalizedScene === 'inicio' || normalizedScene === 'cobros') && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Óculo Imperial y anillos de casetones del Panteón (sin haces triangulares de luz) */}
          <circle cx="720" cy="170" r="56" stroke={strokeGold} strokeWidth="1.6" />
          <circle cx="720" cy="170" r="95" stroke={strokeFine} strokeWidth="1.1" />
          <circle cx="720" cy="170" r="150" stroke={strokeGold} strokeWidth="1.2" />
          <circle cx="720" cy="170" r="220" stroke={strokeFine} strokeWidth="1.1" />
          <circle cx="720" cy="170" r="310" stroke={strokeGold} strokeWidth="1.2" />
          <circle cx="720" cy="170" r="420" stroke={strokeFine} strokeWidth="1" />

          {/* Nervaduras radiales de casetones de la cúpula */}
          <path
            d="M720 226 V590 M664 170 H300 M776 170 H1140 M680 210 L420 470 M760 210 L1020 470 M672 192 L350 340 M768 192 L1090 340"
            stroke={strokeFine}
            strokeWidth="1"
          />

          {/* Frontón Clásico y Columnata Corintia del Panteón */}
          <polygon points="360,520 720,395 1080,520" stroke={strokeGold} strokeWidth="1.5" />
          <polygon points="395,512 720,408 1045,512" stroke={strokeFine} strokeWidth="1" />
          <rect x="350" y="520" width="740" height="22" stroke={strokeGold} strokeWidth="1.3" />
          {[400, 480, 560, 640, 720, 800, 880, 960, 1040].map((cx) => (
            <g key={cx}>
              <rect x={cx - 12} y="542" width="24" height="280" stroke={strokeFine} strokeWidth="1.1" />
              <line x1={cx - 5} y1="546" x2={cx - 5} y2="820" stroke={strokeFine} strokeWidth="0.7" />
              <line x1={cx + 5} y1="546" x2={cx + 5} y2="820" stroke={strokeFine} strokeWidth="0.7" />
            </g>
          ))}
          <rect x="320" y="822" width="800" height="18" stroke={strokeGold} strokeWidth="1.4" />
        </svg>
      )}

      {/* Escena II: Módulos / Clientes — Fachada Octástila del Partenón de Atenas */}
      {(normalizedScene === 'modulos' || normalizedScene === 'clientes') && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          <polygon points="260,250 720,105 1180,250" stroke={strokeGold} strokeWidth="1.6" />
          <polygon points="300,242 720,120 1140,242" stroke={strokeFine} strokeWidth="1.1" />
          <rect x="250" y="250" width="940" height="28" stroke={strokeGold} strokeWidth="1.4" />
          {/* Triglifos y metopas */}
          {[310, 410, 510, 610, 710, 810, 910, 1010, 1110].map((tx) => (
            <rect key={tx} x={tx} y="254" width="18" height="20" stroke={strokeFine} strokeWidth="1" />
          ))}
          {/* 8 Columnas Dóricas del Partenón */}
          {[305, 423, 541, 659, 777, 895, 1013, 1131].map((colX) => (
            <g key={colX}>
              <rect x={colX - 18} y="278" width="36" height="12" stroke={strokeGold} strokeWidth="1.2" />
              <rect x={colX - 14} y="290" width="28" height="490" stroke={strokeGold} strokeWidth="1.2" />
              <line x1={colX - 6} y1="292" x2={colX - 6} y2="778" stroke={strokeFine} strokeWidth="0.8" />
              <line x1={colX + 6} y1="292" x2={colX + 6} y2="778" stroke={strokeFine} strokeWidth="0.8" />
            </g>
          ))}
          {/* Estilóbato de 3 gradas */}
          <rect x="230" y="780" width="980" height="16" stroke={strokeGold} strokeWidth="1.4" />
          <rect x="210" y="796" width="1020" height="16" stroke={strokeFine} strokeWidth="1.2" />
          <rect x="190" y="812" width="1060" height="18" stroke={strokeGold} strokeWidth="1.4" />
        </svg>
      )}

      {/* Escena III: Préstamos — Templo de Saturno (Aerarium Populi Romani, Tesoro de Roma) */}
      {normalizedScene === 'prestamos' && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          <polygon points="330,230 720,95 1110,230" stroke={strokeGold} strokeWidth="1.6" />
          <circle cx="720" cy="175" r="28" stroke={strokeGold} strokeWidth="1.3" />
          <rect x="320" y="230" width="800" height="32" stroke={strokeGold} strokeWidth="1.4" />
          {[370, 486, 602, 718, 834, 950, 1066].map((cx) => (
            <g key={cx}>
              <circle cx={cx - 16} cy="272" r="7" stroke={strokeGold} strokeWidth="1.1" />
              <circle cx={cx + 16} cy="272" r="7" stroke={strokeGold} strokeWidth="1.1" />
              <rect x={cx - 14} y="280" width="28" height="480" stroke={strokeGold} strokeWidth="1.2" />
              <line x1={cx} y1="282" x2={cx} y2="758" stroke={strokeFine} strokeWidth="0.9" />
            </g>
          ))}
          <rect x="290" y="760" width="860" height="55" stroke={strokeGold} strokeWidth="1.5" />
        </svg>
      )}

      {/* Escena IV: Resumen / Séneca — Stoa Imperial y Ágora de Atenas con Sol Invictus */}
      {(normalizedScene === 'resumen' || normalizedScene === 'seneca') && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          <circle cx="720" cy="240" r="88" stroke={strokeGold} strokeWidth="1.5" />
          <circle cx="720" cy="240" r="145" stroke={strokeFine} strokeWidth="1.1" />
          <circle cx="720" cy="240" r="210" stroke={strokeGold} strokeWidth="1.1" />
          {/* Arcos de triunfo laterales y Stoa */}
          <path d="M220 790 V420 A130 130 0 0 1 480 420 V790" stroke={strokeGold} strokeWidth="1.4" />
          <path d="M960 790 V420 A130 130 0 0 1 1220 420 V790" stroke={strokeGold} strokeWidth="1.4" />
          <path d="M520 790 V370 A200 200 0 0 1 920 370 V790" stroke={strokeGold} strokeWidth="1.6" />
          <line x1="160" y1="790" x2="1280" y2="790" stroke={strokeGold} strokeWidth="1.5" />
        </svg>
      )}

      {/* Escena V: Lista Negra — Arco de Tito y Pórtico de Guardia Pretoriana */}
      {normalizedScene === 'lista-negra' && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          <rect x="380" y="130" width="680" height="90" stroke={strokeGold} strokeWidth="1.5" />
          <rect x="410" y="150" width="620" height="50" stroke={strokeFine} strokeWidth="1.1" />
          <rect x="360" y="220" width="720" height="24" stroke={strokeGold} strokeWidth="1.4" />
          <rect x="380" y="244" width="680" height="556" stroke={strokeGold} strokeWidth="1.5" />
          <path d="M540 800 V450 A180 180 0 0 1 900 450 V800" stroke={strokeGold} strokeWidth="1.8" />
          <path d="M565 800 V455 A155 155 0 0 1 875 455 V800" stroke={strokeFine} strokeWidth="1.1" />
        </svg>
      )}

      {/* Escena VI: Beneficios / Papelera — Arcadas del Coliseo Romano y Rostra Imperial */}
      {(normalizedScene === 'beneficios' || normalizedScene === 'papelera') && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Tres niveles de arcadas clásicas del Anfiteatro Flavio */}
          {[220, 440, 640].map((rowY, rowIdx) => (
            <g key={rowY}>
              <line x1="200" y1={rowY} x2="1240" y2={rowY} stroke={strokeGold} strokeWidth="1.4" />
              {[250, 420, 590, 760, 930, 1100].map((archX) => (
                <path
                  key={`${rowIdx}-${archX}`}
                  d={`M${archX} ${rowY + 185} V${rowY + 75} A55 55 0 0 1 ${archX + 110} ${rowY + 75} V${rowY + 185}`}
                  stroke={rowIdx === 1 ? strokeGold : strokeFine}
                  strokeWidth="1.3"
                />
              ))}
            </g>
          ))}
          <line x1="180" y1="825" x2="1260" y2="825" stroke={strokeGold} strokeWidth="1.6" />
        </svg>
      )}
    </div>
  );
};

import React from 'react';
import { Landmark, Calendar, Wallet } from 'lucide-react';
import { formatColones } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext.jsx';
import { ImperialCornerAccents, handleSpotlightMouseMove } from './Common/ClassicalAppArchitecture.jsx';

export function FinancialSummaryCards({ totalPrestado, estaSemana, porCobrarHoy }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { isDark } = useTheme();

  const goldStroke = isDark ? '#D4B46A' : '#B69A55';
  const greenStroke = isDark ? '#52B796' : '#397D67';
  const waveFillOpacity = isDark ? '0.22' : '0.14';

  const cardSurfaceStyle = {
    position: 'relative',
    overflow: 'hidden',
    background: isDark
      ? 'linear-gradient(145deg, #162436 0%, #101C2C 100%)'
      : '#FFFFFF',
    border: isDark ? '1px solid rgba(212, 180, 106, 0.26)' : '1px solid #E5E0D5',
    paddingBottom: '20px'
  };

  return (
    <section className="white-summary-cards-section" aria-label="Resumen financiero">
      <div className="white-summary-cards-grid">
        {/* Tarjeta 1: TOTAL PRESTADO */}
        <div
          className="white-summary-card rb-spotlight-card"
          style={cardSurfaceStyle}
          onMouseMove={handleSpotlightMouseMove}
        >
          <ImperialCornerAccents isDark={isDark} />
          <div className="card-top-row" style={{ position: 'relative', zIndex: 1 }}>
            <span className="card-title-gray">TOTAL PRESTADO</span>
            <div className="card-icon-box indigo" aria-hidden="true">
              <Landmark size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row" style={{ position: 'relative', zIndex: 1 }}>
            <strong className="card-amount-black">{formatColones(totalPrestado)}</strong>
          </div>
          <svg
            viewBox="0 0 200 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '24px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <defs>
              <linearGradient id="splineTotalPrestado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={goldStroke} stopOpacity={waveFillOpacity} />
                <stop offset="100%" stopColor={goldStroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,26 C35,24 62,10 100,14 C138,18 165,6 200,8 L200,32 L0,32 Z"
              fill="url(#splineTotalPrestado)"
            />
            <path
              d="M0,26 C35,24 62,10 100,14 C138,18 165,6 200,8"
              fill="none"
              stroke={goldStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Tarjeta 2: ESTA SEMANA */}
        <div
          className="white-summary-card rb-spotlight-card"
          style={cardSurfaceStyle}
          onMouseMove={handleSpotlightMouseMove}
        >
          <ImperialCornerAccents isDark={isDark} />
          <div className="card-top-row" style={{ position: 'relative', zIndex: 1 }}>
            <span className="card-title-gray">ESTA SEMANA</span>
            <div className="card-icon-box amber" aria-hidden="true">
              <Calendar size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row" style={{ position: 'relative', zIndex: 1 }}>
            <strong className="card-amount-black">{formatColones(estaSemana)}</strong>
          </div>
          <svg
            viewBox="0 0 200 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '24px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <defs>
              <linearGradient id="splineEstaSemana" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={goldStroke} stopOpacity={waveFillOpacity} />
                <stop offset="100%" stopColor={goldStroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,24 C40,12 78,20 118,11 C152,5 176,12 200,6 L200,32 L0,32 Z"
              fill="url(#splineEstaSemana)"
            />
            <path
              d="M0,24 C40,12 78,20 118,11 C152,5 176,12 200,6"
              fill="none"
              stroke={goldStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Tarjeta 3: HOY */}
        <div
          className="white-summary-card rb-spotlight-card"
          style={cardSurfaceStyle}
          onMouseMove={handleSpotlightMouseMove}
        >
          <ImperialCornerAccents isDark={isDark} />
          <div className="card-top-row" style={{ position: 'relative', zIndex: 1 }}>
            <span className="card-title-gray">HOY</span>
            <div className="card-icon-box emerald" aria-hidden="true">
              <Wallet size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row" style={{ position: 'relative', zIndex: 1 }}>
            <strong className="card-amount-black highlight-today">{formatColones(porCobrarHoy)}</strong>
          </div>
          <svg
            viewBox="0 0 200 32"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '24px',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <defs>
              <linearGradient id="splineCobrarHoy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={greenStroke} stopOpacity={waveFillOpacity} />
                <stop offset="100%" stopColor={greenStroke} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,27 C32,22 68,14 106,16 C144,18 170,7 200,4 L200,32 L0,32 Z"
              fill="url(#splineCobrarHoy)"
            />
            <path
              d="M0,27 C32,22 68,14 106,16 C144,18 170,7 200,4"
              fill="none"
              stroke={greenStroke}
              strokeWidth="1.85"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

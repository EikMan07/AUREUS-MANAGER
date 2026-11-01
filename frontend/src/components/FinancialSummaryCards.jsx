import React from 'react';
import { Landmark, Calendar, Wallet } from 'lucide-react';
import { formatColones } from '../utils/formatters';

export function FinancialSummaryCards({ totalPrestado, estaSemana, porCobrarHoy }) {
  return (
    <section className="white-summary-cards-section" aria-label="Resumen financiero">
      <div className="white-summary-cards-grid">
        {/* Tarjeta 1: TOTAL PRESTADO */}
        <div className="white-summary-card">
          <div className="card-top-row">
            <span className="card-title-gray">TOTAL PRESTADO</span>
            <div className="card-icon-box indigo" aria-hidden="true">
              <Landmark size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row">
            <strong className="card-amount-black">{formatColones(totalPrestado)}</strong>
          </div>
        </div>

        {/* Tarjeta 2: ESTA SEMANA */}
        <div className="white-summary-card">
          <div className="card-top-row">
            <span className="card-title-gray">ESTA SEMANA</span>
            <div className="card-icon-box amber" aria-hidden="true">
              <Calendar size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row">
            <strong className="card-amount-black">{formatColones(estaSemana)}</strong>
          </div>
        </div>

        {/* Tarjeta 3: HOY */}
        <div className="white-summary-card">
          <div className="card-top-row">
            <span className="card-title-gray">HOY</span>
            <div className="card-icon-box emerald" aria-hidden="true">
              <Wallet size={18} strokeWidth={1.75} />
            </div>
          </div>
          <div className="card-bottom-row">
            <strong className="card-amount-black highlight-today">{formatColones(porCobrarHoy)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

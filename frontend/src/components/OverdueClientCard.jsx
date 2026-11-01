import React from 'react';
import { Check, AlertCircle, AlertTriangle } from 'lucide-react';
import { formatColones, getInitials, getDayNameFromKey, formatCedulaCR } from '../utils/formatters';

export function OverdueClientCard({ client, onPayClick }) {
  const initials = getInitials(client?.nombre, client?.apellidos);
  const fullName = [client?.nombre, client?.apellidos].filter(Boolean).join(' ').trim();
  const esQuincenal = client.frecuencia === 'quincenal';
  const labelPeriodo = esQuincenal ? 'quincenas' : 'semanas';
  const periodos = client.periodosAtrasados || (esQuincenal ? 2 : 4);
  const totalCuotasAtrasadas = (client.cuotaDiaria || 0) * periodos;
  const cedulaLimpia = formatCedulaCR(client?.cedula);

  return (
    <article className="client-card overdue-critical-card" aria-label={`Cliente atrasado ${fullName}`}>
      {/* Encabezado de la Tarjeta */}
      <div className="card-header">
        <div className="client-identity">
          <div className="avatar-circle overdue-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="client-meta">
            <h3 className="client-name">{fullName}</h3>
            <p className="client-cedula-location">
              {cedulaLimpia ? `Cédula ${cedulaLimpia} · ` : ''}{client.ubicacion}
            </p>
          </div>
        </div>

        {/* Total acumulado en badge rojo */}
        <div className="cuota-badge-wrapper">
          <span className="cuota-badge-red">
            {formatColones(totalCuotasAtrasadas)}
          </span>
        </div>
      </div>

      {/* Alerta de tiempo acumulado sin pagar */}
      <div className="overdue-critical-banner">
        <AlertTriangle size={16} strokeWidth={1.75} className="critical-icon" />
        <span className="critical-text">
          Atraso acumulado: <strong>{periodos} {labelPeriodo} sin pagar</strong>
        </span>
      </div>

      {/* Métricas del atraso */}
      <div className="overdue-metrics-grid">
        <div className="overdue-metric-card">
          <span className="metric-card-label">Cuota regular</span>
          <strong className="metric-card-val">{formatColones(client.cuotaDiaria)}</strong>
          <span className="metric-card-sub">Cada {getDayNameFromKey(client.diaFijoOriginal)}</span>
        </div>

        <div className="overdue-metric-card">
          <span className="metric-card-label">Saldo del préstamo</span>
          <strong className="metric-card-val">{formatColones(client.saldoRestante)}</strong>
          <span className="metric-card-sub">Total financiado</span>
        </div>
      </div>

      {/* Botón único de Pago (Sin botones de Lista Negra según regla) */}
      <div className="card-action-single-row">
        <button
          type="button"
          onClick={() => onPayClick(client)}
          className="action-btn-full btn-pago-liquidar"
          aria-label={`Registrar pago de ${fullName}`}
        >
          <Check size={20} strokeWidth={2} className="action-icon-inline" />
          <span>Registrar Pago</span>
        </button>
      </div>
    </article>
  );
}

import React from 'react';
import { Check, CalendarClock, AlertCircle, Clock } from 'lucide-react';
import { formatColones, getInitials, getDayNameFromKey, formatCedulaCR, formatShortSpanishDate } from '../utils/formatters';

export function PendingClientCard({ client, onPayClick, onPassClick, onNoPayClick }) {
  const initials = getInitials(client?.nombre, client?.apellidos);
  const fullName = [client?.nombre, client?.apellidos].filter(Boolean).join(' ').trim();
  const isOverdue = (client.periodosAtrasados || 0) > 0;
  const cedulaLimpia = formatCedulaCR(client?.cedula);
  const esRezagado = Boolean(client.esRezagado);
  const fechaRezagadaLegible = client.fechaCobroActual
    ? formatShortSpanishDate(client.fechaCobroActual, false)
    : '';

  // Lógica de reprogramación múltiple y etiqueta exacta
  const vecesPasado = client.vecesPasado || (client.diaCobroActual !== client.diaFijoOriginal ? 1 : 0);
  const isRescheduled = vecesPasado > 0 || client.diaCobroActual !== client.diaFijoOriginal;
  const textoPasado = vecesPasado === 1
    ? `Día fijo: ${getDayNameFromKey(client.diaFijoOriginal)} · Pasado 1 vez`
    : `Día fijo: ${getDayNameFromKey(client.diaFijoOriginal)} · Pasado ${vecesPasado} veces`;

  const esQuincenal = client.frecuencia === 'quincenal';
  const labelPeriodo = esQuincenal ? 'quincena' : 'semana';
  const labelPeriodos = esQuincenal ? 'quincenas' : 'semanas';
  const atrasoTexto = client.periodosAtrasados === 1
    ? `Atraso acumulado: 1 ${labelPeriodo} sin pagar`
    : `Atraso acumulado: ${client.periodosAtrasados} ${labelPeriodos} sin pagar`;

  return (
    <article
      className={`client-card pending-card ${esRezagado ? 'pending-card-rezagado' : ''}`}
      aria-label={`Cobro para ${fullName}`}
    >
      {/* Badge ámbar prominente arriba del nombre si es un cobro rezagado de días anteriores */}
      {esRezagado && (
        <div className="rezagado-badge-row">
          <span className="badge-rezagado-amber inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold mb-2">
            <Clock size={13} strokeWidth={2.2} className="shrink-0" />
            <span>Pendiente de registrar del {fechaRezagadaLegible}</span>
          </span>
        </div>
      )}

      {/* Encabezado de la Tarjeta */}
      <div className="card-header">
        <div className="client-identity">
          <div className="avatar-circle" aria-hidden="true">
            {initials}
          </div>
          <div className="client-meta">
            <h3 className="client-name">{fullName}</h3>
            <p className="client-cedula-location">
              {cedulaLimpia ? `Cédula ${cedulaLimpia} · ` : ''}{client.ubicacion}
            </p>
          </div>
        </div>

        {/* Monto a cobrar hoy en Badge Verde Esmeralda */}
        <div className="cuota-badge-wrapper">
          <span className="cuota-badge-emerald">
            {formatColones(client.cuotaDiaria)}
          </span>
        </div>
      </div>

      {/* Indicadores contextuales */}
      {(isRescheduled || isOverdue) && (
        <div className="card-contextual-tags">
          {/* Indicador de cliente reprogramado con contador dinámico: "Día fijo: X · Pasado N veces" */}
          {isRescheduled && (
            <div className="tag-rescheduled" title={`Cobro temporal reprogramado`}>
              <CalendarClock size={14} strokeWidth={1.75} className="tag-icon" />
              <span>{textoPasado}</span>
            </div>
          )}

          {/* Indicador de atraso acumulado por semanas o quincenas */}
          {isOverdue && (
            <div className="tag-overdue-alert" role="alert">
              <AlertCircle size={14} strokeWidth={1.75} className="tag-icon-red" />
              <span>{atrasoTexto}</span>
            </div>
          )}
        </div>
      )}

      {/* Fila Inferior de 3 Botones Grandes (Icono Superior y Texto Inferior) */}
      <div className="card-action-buttons-row">
        {/* 1. Botón Pagó */}
        <button
          type="button"
          onClick={() => onPayClick(client)}
          className="action-btn btn-pago"
          aria-label={`Registrar pago de ${fullName}`}
        >
          <Check size={22} strokeWidth={1.75} className="action-icon" />
          <span className="action-label">Pagó</span>
        </button>

        {/* 2. Botón Pasar */}
        <button
          type="button"
          onClick={() => onPassClick(client)}
          className="action-btn btn-pasar"
          aria-label={`Pasar a ${fullName} de día`}
        >
          <CalendarClock size={22} strokeWidth={1.75} className="action-icon" />
          <span className="action-label">Pasar</span>
        </button>

        {/* 3. Botón No Pagó */}
        <button
          type="button"
          onClick={() => onNoPayClick(client)}
          className="action-btn btn-no-pago"
          aria-label={`Registrar no pago de ${fullName}`}
        >
          <AlertCircle size={22} strokeWidth={1.75} className="action-icon" />
          <span className="action-label">No Pagó</span>
        </button>
      </div>
    </article>
  );
}

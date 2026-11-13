import React from 'react';
import { Check, CalendarClock, AlertCircle, AlertTriangle, Clock, Share2 } from 'lucide-react';
import { formatColones, getInitials, formatFullName, getDayNameFromKey, formatCedulaCR, formatShortSpanishDate } from '../utils/formatters';

export function PendingClientCard({ client, onPayClick, onPassClick, onNoPayClick }) {
  const cobro = {
    ...client,
    periodos_atrasados_acumulados: client?.periodos_atrasados_acumulados ?? client?.periodosAtrasados ?? 0,
    modalidad: client?.modalidad ?? (client?.frecuencia === 'quincenal' ? 'QUINCENAL' : 'SEMANAL'),
    numero_cobro: client?.numero_cobro ?? client?.numeroCobro
  };

  const initials = getInitials(client?.nombre, client?.apellidos);
  const fullName = formatFullName(client?.nombre, client?.apellidos);
  const cedulaLimpia = formatCedulaCR(client?.cedula);
  const esRezagado = Boolean(client?.esRezagado);
  const fechaRezagadaLegible = client?.fechaCobroActual
    ? formatShortSpanishDate(client.fechaCobroActual, false)
    : '';

  // Lógica de reprogramación múltiple y etiqueta exacta
  const vecesPasado = client?.vecesPasado || (client?.diaCobroActual !== client?.diaFijoOriginal ? 1 : 0);
  const isRescheduled = vecesPasado > 0 || client?.diaCobroActual !== client?.diaFijoOriginal;
  const textoPasado = vecesPasado === 1
    ? `Día fijo: ${getDayNameFromKey(client?.diaFijoOriginal)} · Pasado 1 vez`
    : `Día fijo: ${getDayNameFromKey(client?.diaFijoOriginal)} · Pasado ${vecesPasado} veces`;

  return (
    <article
      className={`client-card pending-card ${esRezagado ? 'pending-card-rezagado' : ''}`}
      style={{
        animation: 'cfCardFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease'
      }}
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
              {cedulaLimpia ? `Cédula ${cedulaLimpia} · ` : ''}{client?.ubicacion}
            </p>
          </div>
        </div>

        {/* Monto a cobrar hoy en Badge Verde Esmeralda */}
        <div className="cuota-badge-wrapper">
          <span className="cuota-badge-emerald">
            {formatColones(client?.cuotaDiaria)}
          </span>
        </div>
      </div>

      {/* Indicador de cliente reprogramado con contador dinámico: "Día fijo: X · Pasado N veces" */}
      {isRescheduled && (
        <div className="card-contextual-tags" style={{ marginTop: '6px' }}>
          <div className="tag-rescheduled" title="Cobro temporal reprogramado">
            <CalendarClock size={14} strokeWidth={1.75} className="tag-icon" />
            <span>{textoPasado}</span>
          </div>
        </div>
      )}

      {/* Insignia de cobro compartido */}
      {client?.es_compartido ? (
        <div style={{ marginTop: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--aureus-gold-light)',
              color: 'var(--aureus-gold-text)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid var(--aureus-border-gold)'
            }}
          >
            <Share2 size={12} strokeWidth={2.2} />
            <span>Compartido por {client.compartido_por_nombre || 'otro cobrador'}</span>
          </span>
        </div>
      ) : client?.compartido_con_nombre ? (
        <div style={{ marginTop: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--aureus-green-light)',
              color: 'var(--aureus-green-text)',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid var(--aureus-green-border)'
            }}
          >
            <Share2 size={12} strokeWidth={2.2} />
            <span>Compartido con {client.compartido_con_nombre}</span>
          </span>
        </div>
      ) : null}

      {/* Franja de alerta roja de atraso acumulado */}
      {Number(cobro.periodos_atrasados_acumulados) > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: 'var(--aureus-red-light)',
            border: '1px solid var(--aureus-red-border)',
            borderRadius: '12px',
            padding: '8px 12px',
            marginTop: '10px',
            marginBottom: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} strokeWidth={2.2} color="var(--aureus-red-text)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-red-text)' }}>
              Atraso acumulado:{' '}
              <strong style={{ fontWeight: 800 }}>
                {cobro.periodos_atrasados_acumulados}{' '}
                {cobro.modalidad === 'QUINCENAL'
                  ? Number(cobro.periodos_atrasados_acumulados) === 1
                    ? 'quincena sin pagar'
                    : 'quincenas sin pagar'
                  : Number(cobro.periodos_atrasados_acumulados) === 1
                  ? 'semana sin pagar'
                  : 'semanas sin pagar'}
              </strong>
            </span>
          </div>
          {cobro.numero_cobro && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aureus-red-text)',
                backgroundColor: 'var(--aureus-red-light)',
                border: '1px solid var(--aureus-red-border)',
                padding: '2px 8px',
                borderRadius: '9999px',
                whiteSpace: 'nowrap',
              }}
            >
              Cobro {cobro.numero_cobro}
            </span>
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

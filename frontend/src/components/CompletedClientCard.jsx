import React from 'react';
import { Check, Share2 } from 'lucide-react';
import { formatColones, getInitials, formatFullName } from '../utils/formatters';

export function CompletedClientCard({ client }) {
  const initials = getInitials(client?.nombre, client?.apellidos);
  const fullName = formatFullName(client?.nombre, client?.apellidos);
  const totalCobrado = Number(client?.montoTotalCobrado) > 0
    ? Number(client.montoTotalCobrado)
    : (Number(client?.cuotaDiaria || 0) + Number(client?.moratoriaCobrada || 0));

  return (
    <article className="client-card completed-card" aria-label={`Cobro registrado de ${fullName}`}>
      <div className="card-header">
        <div className="client-identity">
          <div className="avatar-circle completed-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="client-meta">
            <h3 className="client-name">{fullName}</h3>
            <p className="completed-timestamp-info">
              {client.horaCobroRegistrado ? `Registrado a las ${client.horaCobroRegistrado}` : 'Cobro registrado'}
              {client.proximaFechaCobro && (
                <span className="next-payment-date">
                  {' '}· Próximo: {client.proximaFechaCobro}
                </span>
              )}
            </p>
            {client?.es_compartido ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  backgroundColor: 'var(--aureus-gold-light)',
                  color: 'var(--aureus-gold-text)',
                  padding: '1px 6px',
                  borderRadius: '5px',
                  marginTop: '3px'
                }}
              >
                <Share2 size={11} strokeWidth={2.2} />
                <span>Compartido por {client.compartido_por_nombre || 'otro cobrador'}</span>
              </span>
            ) : client?.compartido_con_nombre ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  backgroundColor: 'var(--aureus-green-light)',
                  color: 'var(--aureus-green-text)',
                  padding: '1px 6px',
                  borderRadius: '5px',
                  marginTop: '3px'
                }}
              >
                <Share2 size={11} strokeWidth={2.2} />
                <span>Cobrado por {client.compartido_con_nombre}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Monto cobrado a la derecha: Badge con fondo verde esmeralda idéntico a Pendientes */}
        <div className="cuota-badge-wrapper">
          <span className="cuota-badge-emerald">
            {formatColones(totalCobrado)}
          </span>
        </div>
      </div>

      {/* Pie de tarjeta: Indicador verde de cobro registrado */}
      <div className="completed-card-footer">
        <div className="badge-status-registered">
          <div className="check-circle-icon">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <span className="status-registered-text">Cobro registrado</span>
        </div>

        {client.moratoriaCobrada > 0 && (
          <span className="moratoria-sub-text">
            Incluye {formatColones(client.moratoriaCobrada)} moratoria
          </span>
        )}
      </div>
    </article>
  );
}

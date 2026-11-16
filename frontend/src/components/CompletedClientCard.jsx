import React, { useState, useEffect, useMemo } from 'react';
import { Check, Share2 } from 'lucide-react';
import { formatColones, getInitials, formatFullName } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { ImperialCornerAccents, handleSpotlightMouseMove } from './Common/ClassicalAppArchitecture';

const getCompletedKey = (item) =>
  String(item?.id || item?.agenda_id || item?.prestamo_id || '');

const calcTotalCobradoItem = (item) =>
  Number(item?.montoTotalCobrado) > 0
    ? Number(item.montoTotalCobrado)
    : Number(item?.cuotaDiaria || item?.monto_cuota || 0) + Number(item?.moratoriaCobrada || item?.monto_moratoria || 0);

export function CompletedClientCard({ client, clientCobros = [] }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { isDark } = useTheme();

  const cobrosList = useMemo(
    () => (Array.isArray(clientCobros) && clientCobros.length > 0 ? clientCobros : client ? [client] : []),
    [clientCobros, client]
  );

  const [activeCobroId, setActiveCobroId] = useState(() => getCompletedKey(cobrosList[0]));

  useEffect(() => {
    const exists = cobrosList.some((c) => getCompletedKey(c) === String(activeCobroId));
    if (!exists && cobrosList.length > 0) {
      setActiveCobroId(getCompletedKey(cobrosList[0]));
    }
  }, [cobrosList, activeCobroId]);

  const activeIndex = useMemo(() => {
    const idx = cobrosList.findIndex((c) => getCompletedKey(c) === String(activeCobroId));
    return idx >= 0 ? idx : 0;
  }, [cobrosList, activeCobroId]);

  const currentCobro = useMemo(
    () => cobrosList[activeIndex] || cobrosList[0] || client || null,
    [cobrosList, activeIndex, client]
  );

  const sumaTotalCobrado = useMemo(
    () => cobrosList.reduce((acc, item) => acc + calcTotalCobradoItem(item), 0),
    [cobrosList]
  );

  if (!currentCobro) return null;

  const initials = getInitials(currentCobro?.nombre, currentCobro?.apellidos);
  const fullName = formatFullName(currentCobro?.nombre, currentCobro?.apellidos);
  const totalCobrado = calcTotalCobradoItem(currentCobro);

  return (
    <article
      className="client-card completed-card rb-spotlight-card"
      aria-label={`Cobro registrado de ${fullName}`}
      onMouseMove={handleSpotlightMouseMove}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <ImperialCornerAccents isDark={isDark} />
      <div className="card-header">
        <div className="client-identity">
          <div className="avatar-circle completed-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="client-meta">
            <h3 className="client-name">{fullName}</h3>
            <p className="completed-timestamp-info">
              {currentCobro.horaCobroRegistrado ? `Registrado a las ${currentCobro.horaCobroRegistrado}` : 'Cobro registrado'}
              {currentCobro.proximaFechaCobro && (
                <span className="next-payment-date">
                  {' '}· Próximo: {currentCobro.proximaFechaCobro}
                </span>
              )}
            </p>
            {currentCobro?.es_cobro_recibido || currentCobro?.es_compartido ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--aureus-gold-light)',
                  color: 'var(--aureus-gold-text)',
                  border: '1px solid var(--aureus-border-gold)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}
              >
                <Share2 size={11} strokeWidth={2.2} />
                <span>
                  Gestionado por ti · Compartido por{' '}
                  {currentCobro.compartido_por_nombre || currentCobro.compartido_por_username || 'otro cobrador'}
                </span>
              </span>
            ) : currentCobro?.es_gestionado_por_otro || (currentCobro?.gestionado_por_usuario_id && currentCobro?.gestionado_por_nombre) ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--aureus-green-light)',
                  color: 'var(--aureus-green-text)',
                  border: '1px solid var(--aureus-green-border)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}
              >
                <Share2 size={11} strokeWidth={2.2} />
                <span>
                  {currentCobro.gestionado_accion === 'PAGO'
                    ? `Cobrado por ${currentCobro.gestionado_por_nombre}`
                    : `Gestionado por ${currentCobro.gestionado_por_nombre}`}
                </span>
              </span>
            ) : currentCobro?.compartido_con_nombre ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--aureus-green-light)',
                  color: 'var(--aureus-green-text)',
                  border: '1px solid var(--aureus-green-border)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}
              >
                <Share2 size={11} strokeWidth={2.2} />
                <span>Compartido con {currentCobro.compartido_con_nombre}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Insignia múltiples registrados + Monto cobrado */}
        <div
          className="cuota-badge-wrapper"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          {cobrosList.length > 1 && (
            <span
              data-testid="badge-multiple-registrados"
              style={{
                backgroundColor: isDark ? 'rgba(212, 180, 106, 0.16)' : '#F7F2E4',
                border: `1px solid ${isDark ? 'rgba(212, 180, 106, 0.4)' : '#D5C295'}`,
                color: isDark ? '#F5E1A4' : '#8C6D23',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '9999px',
                whiteSpace: 'nowrap'
              }}
            >
              {cobrosList.length} registrados
            </span>
          )}
          <span className="cuota-badge-emerald">
            {formatColones(totalCobrado)}
          </span>
        </div>
      </div>

      {/* Agrupación de Múltiples Cobros Registrados del Mismo Cliente */}
      {cobrosList.length > 1 && (
        <>
          <div
            style={{
              backgroundColor: isDark ? 'rgba(16, 28, 44, 0.72)' : '#F8F6F0',
              border: isDark ? '1px solid rgba(212, 180, 106, 0.24)' : '1px solid #E5E0D5',
              borderRadius: '10px',
              padding: '7px 12px',
              marginTop: '10px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
              fontSize: '12px'
            }}
          >
            <span style={{ color: isDark ? '#CBD5E1' : '#4A5058', fontWeight: 700 }}>
              Total cobrado hoy:{' '}
              <strong style={{ color: isDark ? '#F5E1A4' : '#101C2C', fontWeight: 900 }}>
                {formatColones(sumaTotalCobrado)}
              </strong>
            </span>
            <span style={{ color: isDark ? '#D4B46A' : '#8C6D23', fontWeight: 800 }}>
              Préstamo {activeIndex + 1} de {cobrosList.length}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Préstamos registrados de este cliente"
            style={{
              display: 'grid',
              gridTemplateColumns:
                cobrosList.length === 2
                  ? 'repeat(2, minmax(0, 1fr))'
                  : 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: '6px',
              padding: '5px',
              borderRadius: '12px',
              marginBottom: '10px',
              backgroundColor: isDark ? '#101C2C' : '#EFECE4',
              border: isDark ? '1px solid rgba(212, 180, 106, 0.22)' : '1px solid #DDD6C7'
            }}
          >
            {cobrosList.map((item, idx) => {
              const itemKey = getCompletedKey(item);
              const isSelected = itemKey === getCompletedKey(currentCobro);
              const montoItem = calcTotalCobradoItem(item);

              return (
                <button
                  key={itemKey || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveCobroId(itemKey)}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                      : isDark
                        ? 'rgba(22, 36, 54, 0.85)'
                        : '#FFFFFF',
                    color: isSelected ? '#101C2C' : isDark ? '#FFFFFF' : '#475569',
                    fontWeight: isSelected ? 900 : 700,
                    fontSize: '12px',
                    padding: '8px 10px',
                    borderRadius: '9px',
                    border: isSelected
                      ? '1px solid #B69A55'
                      : isDark
                        ? '1px solid rgba(255, 255, 255, 0.08)'
                        : '1px solid #E2DDD0',
                    boxShadow: isSelected ? '0 2px 6px rgba(182, 154, 85, 0.28)' : 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Préstamo {idx + 1} · {formatColones(montoItem)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Pie de tarjeta: Indicador verde de cobro registrado */}
      <div className="completed-card-footer">
        <div className="badge-status-registered">
          <div className="check-circle-icon">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <span className="status-registered-text">Cobro registrado</span>
        </div>

        {currentCobro.moratoriaCobrada > 0 && (
          <span className="moratoria-sub-text">
            Incluye {formatColones(currentCobro.moratoriaCobrada)} moratoria
          </span>
        )}
      </div>
    </article>
  );
}

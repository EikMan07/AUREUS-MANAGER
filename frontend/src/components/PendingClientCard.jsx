import React, { useState, useEffect, useMemo } from 'react';
import { Check, CalendarClock, AlertCircle, AlertTriangle, Clock, Share2, RotateCcw } from 'lucide-react';
import { formatColones, getInitials, formatFullName, getDayNameFromKey, formatCedulaCR, formatShortSpanishDate } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { ImperialCornerAccents, handleSpotlightMouseMove } from './Common/ClassicalAppArchitecture';

const getCobroKey = (item) =>
  String(item?.id || item?.agenda_id || item?.prestamo_id || '');

export function PendingClientCard({
  client,
  clientCobros = [],
  onPayClick,
  onPassClick,
  onNoPayClick,
  onRevertirCobroCompartido
}) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { isDark } = useTheme();

  const cobrosList = useMemo(
    () => (Array.isArray(clientCobros) && clientCobros.length > 0 ? clientCobros : client ? [client] : []),
    [clientCobros, client]
  );

  const [activeCobroId, setActiveCobroId] = useState(() => getCobroKey(cobrosList[0]));

  useEffect(() => {
    const exists = cobrosList.some((c) => getCobroKey(c) === String(activeCobroId));
    if (!exists && cobrosList.length > 0) {
      setActiveCobroId(getCobroKey(cobrosList[0]));
    }
  }, [cobrosList, activeCobroId]);

  const activeIndex = useMemo(() => {
    const idx = cobrosList.findIndex((c) => getCobroKey(c) === String(activeCobroId));
    return idx >= 0 ? idx : 0;
  }, [cobrosList, activeCobroId]);

  const currentCobro = useMemo(
    () => cobrosList[activeIndex] || cobrosList[0] || client || null,
    [cobrosList, activeIndex, client]
  );

  const sumaTotalDia = useMemo(
    () => cobrosList.reduce((acc, item) => acc + Number(item?.cuotaDiaria ?? item?.monto_cuota ?? 0), 0),
    [cobrosList]
  );

  if (!currentCobro) return null;

  const cobro = {
    ...currentCobro,
    periodos_atrasados_acumulados: currentCobro?.periodos_atrasados_acumulados ?? currentCobro?.periodosAtrasados ?? 0,
    modalidad: currentCobro?.modalidad ?? (currentCobro?.frecuencia === 'quincenal' ? 'QUINCENAL' : 'SEMANAL'),
    numero_cobro: currentCobro?.numero_cobro ?? currentCobro?.numeroCobro
  };

  const initials = getInitials(currentCobro?.nombre, currentCobro?.apellidos);
  const fullName = formatFullName(currentCobro?.nombre, currentCobro?.apellidos);
  const cedulaLimpia = formatCedulaCR(currentCobro?.cedula);
  const esRezagado = Boolean(currentCobro?.esRezagado);
  const fechaRezagadaLegible = currentCobro?.fechaCobroActual
    ? formatShortSpanishDate(currentCobro.fechaCobroActual, false)
    : '';

  const vecesPasado = currentCobro?.vecesPasado || (currentCobro?.diaCobroActual !== currentCobro?.diaFijoOriginal ? 1 : 0);
  const isRescheduled = vecesPasado > 0 || currentCobro?.diaCobroActual !== currentCobro?.diaFijoOriginal;
  const textoPasado = vecesPasado === 1
    ? `Día fijo: ${getDayNameFromKey(currentCobro?.diaFijoOriginal)} · Pasado 1 vez`
    : `Día fijo: ${getDayNameFromKey(currentCobro?.diaFijoOriginal)} · Pasado ${vecesPasado} veces`;

  const telefonoPrincipal = currentCobro?.cliente_telefono || currentCobro?.telefono || '';
  const telefonoSecundario = currentCobro?.cliente_telefono_secundario || currentCobro?.telefono_secundario || '';
  const detallesCliente = currentCobro?.cliente_detalles || currentCobro?.detalles || '';
  const esRecibido = Boolean(currentCobro?.es_cobro_recibido || currentCobro?.es_compartido);
  const esEnviado = Boolean(!esRecibido && (currentCobro?.es_cobro_enviado || currentCobro?.compartido_con_nombre));

  return (
    <article
      className={`client-card pending-card rb-spotlight-card ${esRezagado ? 'pending-card-rezagado' : ''}`}
      onMouseMove={handleSpotlightMouseMove}
      style={{
        position: 'relative',
        overflow: 'hidden',
        animation: 'cfCardFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease'
      }}
      aria-label={`Cobro para ${fullName}`}
    >
      <ImperialCornerAccents isDark={isDark} />

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
              {cedulaLimpia ? `Cédula ${cedulaLimpia} · ` : ''}{currentCobro?.ubicacion}
            </p>
            {(telefonoPrincipal || telefonoSecundario || detallesCliente) && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--aureus-text-muted)',
                  marginTop: '2px',
                  lineHeight: 1.35,
                  wordBreak: 'break-word'
                }}
              >
                {[
                  telefonoPrincipal ? `Tel: ${telefonoPrincipal}` : '',
                  telefonoSecundario ? `Alt: ${telefonoSecundario}` : '',
                  detallesCliente
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Insignia de cobros múltiples + Monto a cobrar hoy en Badge Verde Esmeralda */}
        <div
          className="cuota-badge-wrapper"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          {cobrosList.length > 1 && (
            <span
              data-testid="badge-multiple-cobros-hoy"
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
              {cobrosList.length} cobros hoy
            </span>
          )}
          <span className="cuota-badge-emerald">
            {formatColones(currentCobro?.cuotaDiaria)}
          </span>
        </div>
      </div>

      {/* Agrupación de Múltiples Cobros del Mismo Día */}
      {cobrosList.length > 1 && (
        <>
          {/* Franja de Resumen Consolidado del Día */}
          <div
            data-testid="consolidated-cobros-strip"
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
              Total a cobrar hoy:{' '}
              <strong style={{ color: isDark ? '#F5E1A4' : '#101C2C', fontWeight: 900 }}>
                {formatColones(sumaTotalDia)}
              </strong>
            </span>
            <span style={{ color: isDark ? '#D4B46A' : '#8C6D23', fontWeight: 800 }}>
              Préstamo {activeIndex + 1} de {cobrosList.length}
            </span>
          </div>

          {/* Selector de Pestañas Tipo Píldora por Préstamo */}
          <div
            role="tablist"
            aria-label="Préstamos programados hoy para este cliente"
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
              const itemKey = getCobroKey(item);
              const isSelected = itemKey === getCobroKey(currentCobro);
              const montoItem = Number(item?.cuotaDiaria ?? item?.monto_cuota ?? 0);
              const hasOverdue = Number(item?.periodos_atrasados_acumulados) > 0;

              return (
                <button
                  key={itemKey || idx}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`cobro-loan-pill-${idx + 1}`}
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
                  {hasOverdue && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '9999px',
                        backgroundColor: '#e11d48',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Préstamo {idx + 1} · {formatColones(montoItem)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Indicador de cliente reprogramado con contador dinámico */}
      {isRescheduled && (
        <div className="card-contextual-tags" style={{ marginTop: '6px' }}>
          <div className="tag-rescheduled" title="Cobro temporal reprogramado">
            <CalendarClock size={14} strokeWidth={1.75} className="tag-icon" />
            <span>{textoPasado}</span>
          </div>
        </div>
      )}

      {/* Insignia de cobro compartido */}
      {esRecibido ? (
        <div style={{ marginTop: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isDark ? 'rgba(212, 180, 106, 0.16)' : '#F7F2E4',
              border: `1px solid ${isDark ? '#D4B46A' : '#B69A55'}`,
              color: isDark ? '#F5E1A4' : '#876B2D',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 800
            }}
          >
            <Share2 size={13} strokeWidth={2.2} />
            <span>
              Compartido por {currentCobro.compartido_por_nombre || currentCobro.compartido_por_username || 'otro cobrador'}
            </span>
          </span>
        </div>
      ) : esEnviado ? (
        <div
          style={{
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 800,
              backgroundColor: 'var(--aureus-green-light)',
              color: 'var(--aureus-green-text)',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid var(--aureus-green-border)'
            }}
          >
            <Share2 size={13} strokeWidth={2.2} />
            <span>
              Compartido con {currentCobro.compartido_con_nombre || currentCobro.compartido_con_username}
            </span>
          </span>
          {onRevertirCobroCompartido && (
            <button
              type="button"
              data-testid="btn-revertir-cobro"
              onClick={() => onRevertirCobroCompartido(currentCobro.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid var(--aureus-border-subtle)',
                backgroundColor: 'var(--aureus-bg-elevated)',
                color: 'var(--aureus-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} strokeWidth={2.2} />
              <span>Retirar envio</span>
            </button>
          )}
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

      {/* Fila Inferior de 3 Botones Grandes */}
      <div className="card-action-buttons-row">
        {/* 1. Botón Pagó */}
        <button
          type="button"
          onClick={() => onPayClick(currentCobro)}
          className="action-btn btn-pago"
          aria-label={`Registrar pago de ${fullName}`}
        >
          <Check size={22} strokeWidth={1.75} className="action-icon" />
          <span className="action-label">Pagó</span>
        </button>

        {/* 2. Botón Pasar */}
        <button
          type="button"
          onClick={() => onPassClick(currentCobro)}
          className="action-btn btn-pasar"
          aria-label={`Pasar a ${fullName} de día`}
        >
          <CalendarClock size={22} strokeWidth={1.75} className="action-icon" />
          <span className="action-label">Pasar</span>
        </button>

        {/* 3. Botón No Pagó */}
        <button
          type="button"
          onClick={() => onNoPayClick(currentCobro)}
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

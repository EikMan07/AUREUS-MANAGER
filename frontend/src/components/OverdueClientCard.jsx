import React, { useState, useEffect, useMemo } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { formatColones, getInitials, formatFullName, getDayNameFromKey, formatCedulaCR } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { ImperialCornerAccents, handleSpotlightMouseMove } from './Common/ClassicalAppArchitecture';

const getOverdueKey = (item) =>
  String(item?.id || item?.prestamo_id || item?.agenda_id || '');

const calcOverdueTotalItem = (item) => {
  const esQ = item?.frecuencia === 'quincenal' || item?.modalidad === 'QUINCENAL';
  const per = Number(item?.periodos_atrasados_acumulados || item?.periodosAtrasados || (esQ ? 2 : 4));
  return Number(item?.cuotaDiaria ?? item?.cuota ?? 0) * per;
};

export function OverdueClientCard({ client, clientCobros = [], onPayClick }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { isDark } = useTheme();

  const cobrosList = useMemo(
    () => (Array.isArray(clientCobros) && clientCobros.length > 0 ? clientCobros : client ? [client] : []),
    [clientCobros, client]
  );

  const [activeCobroId, setActiveCobroId] = useState(() => getOverdueKey(cobrosList[0]));

  useEffect(() => {
    const exists = cobrosList.some((c) => getOverdueKey(c) === String(activeCobroId));
    if (!exists && cobrosList.length > 0) {
      setActiveCobroId(getOverdueKey(cobrosList[0]));
    }
  }, [cobrosList, activeCobroId]);

  const activeIndex = useMemo(() => {
    const idx = cobrosList.findIndex((c) => getOverdueKey(c) === String(activeCobroId));
    return idx >= 0 ? idx : 0;
  }, [cobrosList, activeCobroId]);

  const currentCobro = useMemo(
    () => cobrosList[activeIndex] || cobrosList[0] || client || null,
    [cobrosList, activeIndex, client]
  );

  const sumaTotalAtrasado = useMemo(
    () => cobrosList.reduce((acc, item) => acc + calcOverdueTotalItem(item), 0),
    [cobrosList]
  );

  if (!currentCobro) return null;

  const initials = getInitials(currentCobro?.nombre, currentCobro?.apellidos);
  const fullName = formatFullName(currentCobro?.nombre, currentCobro?.apellidos);
  const esQuincenal = currentCobro?.frecuencia === 'quincenal' || currentCobro?.modalidad === 'QUINCENAL';
  const periodos = Number(currentCobro?.periodos_atrasados_acumulados || currentCobro?.periodosAtrasados || (esQuincenal ? 2 : 4));
  const labelPeriodo = esQuincenal
    ? (periodos === 1 ? 'quincena sin pagar' : 'quincenas sin pagar')
    : (periodos === 1 ? 'semana sin pagar' : 'semanas sin pagar');
  const totalCuotasAtrasadas = calcOverdueTotalItem(currentCobro);
  const cedulaLimpia = formatCedulaCR(currentCobro?.cedula);

  return (
    <article
      className="client-card overdue-critical-card rb-spotlight-card"
      aria-label={`Cliente atrasado ${fullName}`}
      onMouseMove={handleSpotlightMouseMove}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <ImperialCornerAccents isDark={isDark} />
      {/* Encabezado de la Tarjeta */}
      <div className="card-header">
        <div className="client-identity">
          <div className="avatar-circle overdue-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="client-meta">
            <h3 className="client-name">{fullName}</h3>
            <p className="client-cedula-location">
              {cedulaLimpia ? `Cédula ${cedulaLimpia} · ` : ''}{currentCobro.ubicacion}
            </p>
          </div>
        </div>

        {/* Insignia múltiples atrasados + Total acumulado en badge rojo */}
        <div
          className="cuota-badge-wrapper"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          {cobrosList.length > 1 && (
            <span
              data-testid="badge-multiple-atrasados"
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
              {cobrosList.length} atrasados
            </span>
          )}
          <span className="cuota-badge-red">
            {formatColones(totalCuotasAtrasadas)}
          </span>
        </div>
      </div>

      {/* Agrupación de Múltiples Préstamos Atrasados del Mismo Cliente */}
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
              Total atrasado:{' '}
              <strong style={{ color: isDark ? '#F5E1A4' : '#101C2C', fontWeight: 900 }}>
                {formatColones(sumaTotalAtrasado)}
              </strong>
            </span>
            <span style={{ color: isDark ? '#D4B46A' : '#8C6D23', fontWeight: 800 }}>
              Préstamo {activeIndex + 1} de {cobrosList.length}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Préstamos atrasados de este cliente"
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
              const itemKey = getOverdueKey(item);
              const isSelected = itemKey === getOverdueKey(currentCobro);
              const itemCuota = Number(item?.cuotaDiaria ?? item?.cuota ?? 0);

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
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Préstamo {idx + 1} · {formatColones(itemCuota)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Alerta de tiempo acumulado sin pagar */}
      <div className="overdue-critical-banner">
        <AlertTriangle size={16} strokeWidth={1.75} className="critical-icon" />
        <span className="critical-text">
          Atraso acumulado: <strong>{periodos} {labelPeriodo}</strong>
        </span>
      </div>

      {/* Métricas del atraso */}
      <div className="overdue-metrics-grid">
        <div className="overdue-metric-card">
          <span className="metric-card-label">Cuota regular</span>
          <strong className="metric-card-val">{formatColones(currentCobro.cuotaDiaria)}</strong>
          <span className="metric-card-sub">Cada {getDayNameFromKey(currentCobro.diaFijoOriginal)}</span>
        </div>

        <div className="overdue-metric-card">
          <span className="metric-card-label">Saldo del préstamo</span>
          <strong className="metric-card-val">{formatColones(currentCobro.saldoRestante)}</strong>
          <span className="metric-card-sub">Total financiado</span>
        </div>
      </div>

      {/* Botón único de Pago */}
      <div className="card-action-single-row">
        <button
          type="button"
          onClick={() => onPayClick(currentCobro)}
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Handshake,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  Trash2,
  Check
} from 'lucide-react';
import { formatColones, getInitials, formatShortSpanishDate } from '../../utils/formatters';

export function LoanCard({
  loan,
  clientLoans = [],
  onRenew,
  onAgreement,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  selectedLoanIds = [],
  onToggleSelect
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Arreglo unificado de préstamos para este cliente
  const loansList = useMemo(() => {
    if (Array.isArray(clientLoans) && clientLoans.length > 0) {
      return clientLoans;
    }
    return loan ? [loan] : [];
  }, [clientLoans, loan]);

  // 2. ID del préstamo activo dentro de la tarjeta
  const [activeLoanId, setActiveLoanId] = useState(() => loansList[0]?.id || loan?.id);

  // Sincronizar activeLoanId si la lista de préstamos cambia o si activeLoanId fue eliminado
  useEffect(() => {
    if (!loansList.some((l) => String(l.id) === String(activeLoanId))) {
      setActiveLoanId(loansList[0]?.id || loan?.id);
    }
  }, [loansList, activeLoanId, loan?.id]);

  // 3. Préstamo activo sobre el cual operan todos los datos y acciones
  const currentLoan = useMemo(() => {
    return loansList.find((l) => String(l.id) === String(activeLoanId)) || loansList[0] || loan || {};
  }, [loansList, activeLoanId, loan]);

  // 4. Totales consolidados cuando el cliente tiene 2 o más préstamos
  const totalPrestadoCliente = useMemo(() => {
    return loansList.reduce((acc, l) => acc + (Number(l.monto_prestado) || 0), 0);
  }, [loansList]);

  const totalFaltaPagarCliente = useMemo(() => {
    return loansList.reduce((acc, l) => {
      const isReg =
        String(l.estado || l.status || '').toUpperCase() === 'CANCELADO' ||
        String(l.estado || '').toUpperCase() === 'LIQUIDADO' ||
        String(l.estado || '').toUpperCase() === 'PAGADO' ||
        String(l.estado || '').toUpperCase() === 'REGISTRADO' ||
        (Number(l.monto_prestado ?? l.amount ?? 0) > 0 && Number(l.saldo_por_pagar ?? l.remainingBalance ?? 1) <= 0) ||
        (Number(l.total_periodos || 0) > 0 && Number(l.periodos_pagados || 0) >= Number(l.total_periodos || 0));

      if (isReg) return acc;
      return acc + (Number(l.saldo_por_pagar != null ? l.saldo_por_pagar : l.monto_total_financiar) || 0);
    }, 0);
  }, [loansList]);

  // 5. Estado de selección
  const isCurrentSelected = useMemo(() => {
    if (!currentLoan?.id) return false;
    return Array.isArray(selectedLoanIds) && selectedLoanIds.includes(currentLoan.id);
  }, [selectedLoanIds, currentLoan?.id]);

  const isCardHighlighted = isSelectionMode && (isCurrentSelected || isSelected);

  // Formato del día fijo (soporta Semanal y las dos formas de Quincenal)
  const formatDayDisplay = () => {
    const dayMap = {
      'LUNES': 'Lunes',
      'MARTES': 'Martes',
      'MIERCOLES': 'Miércoles',
      'JUEVES': 'Jueves',
      'VIERNES': 'Viernes',
      'SABADO': 'Sábado',
      'DOMINGO': 'Domingo'
    };
    if (currentLoan.modalidad === 'SEMANAL') {
      return `Cada ${dayMap[currentLoan.dia_fijo_original] || currentLoan.dia_fijo_original || 'Sábado'}`;
    }
    if (currentLoan.dia_fijo_original) {
      return `Cada 2 sem · ${dayMap[currentLoan.dia_fijo_original] || currentLoan.dia_fijo_original}`;
    }
    return 'Día 15 y fin de mes';
  };

  // Clasificación individual del préstamo actual
  const isRegistrado = useMemo(() => {
    const estado = String(currentLoan.estado || currentLoan.status || '').toUpperCase();
    const saldo = Number(currentLoan.saldo_por_pagar ?? currentLoan.remainingBalance ?? 1);
    const monto = Number(currentLoan.monto_prestado ?? currentLoan.amount ?? 0);
    const totalP = Number(currentLoan.total_periodos || 0);
    const pagadosP = Number(currentLoan.periodos_pagados || 0);

    return (
      estado === 'CANCELADO' ||
      estado === 'LIQUIDADO' ||
      estado === 'PAGADO' ||
      estado === 'REGISTRADO' ||
      (monto > 0 && saldo <= 0) ||
      (totalP > 0 && pagadosP >= totalP)
    );
  }, [currentLoan]);

  const isAtrasado = useMemo(() => {
    if (isRegistrado) return false;
    const estado = String(currentLoan.estado || currentLoan.status || '').toUpperCase();
    const atrasos = Number(currentLoan.periodos_atrasados_acumulados || 0);
    return (
      estado === 'ATRASADO' ||
      (currentLoan.modalidad === 'QUINCENAL' ? atrasos >= 2 : atrasos >= 4)
    );
  }, [isRegistrado, currentLoan]);

  // Badge de estado del préstamo (Insignia superior derecha)
  const renderStateBadge = () => {
    if (isRegistrado) {
      return (
        <span
          className="loan-status-badge success"
          style={{
            backgroundColor: 'var(--aureus-green-light)',
            border: '1px solid var(--aureus-green-border)',
            color: 'var(--aureus-green-text)',
            fontWeight: 800
          }}
        >
          Registrado
        </span>
      );
    }
    if (isAtrasado) {
      return (
        <span
          className="loan-status-badge danger"
          style={{
            backgroundColor: 'var(--aureus-red-light)',
            border: '1px solid var(--aureus-red-border)',
            color: 'var(--aureus-red-text)',
            fontWeight: 800
          }}
        >
          Atrasado
        </span>
      );
    }
    if (currentLoan.estado === 'ARREGLO_PAGO') {
      return <span className="loan-status-badge warning">Arreglo de pago</span>;
    }
    if (currentLoan.estado === 'RENOVADO') {
      return <span className="loan-status-badge info">Renovado</span>;
    }
    return (
      <span
        className="loan-status-badge success"
        style={{
          backgroundColor: 'var(--aureus-green-light)',
          border: '1px solid var(--aureus-green-border)',
          color: 'var(--aureus-green-text)',
          fontWeight: 800
        }}
      >
        Pendiente
      </span>
    );
  };

  // Badge de cuota individual en el calendario
  const renderCuotaBadge = (estado) => {
    switch (estado) {
      case 'REGISTRADO':
        return (
          <span className="cuota-pill success">
            <CheckCircle2 size={12} strokeWidth={2} style={{ marginRight: '4px', display: 'block' }} />
            Registrado
          </span>
        );
      case 'PASADO_DE_DIA':
        return (
          <span className="cuota-pill warning">
            <Clock size={12} strokeWidth={2} style={{ marginRight: '4px', display: 'block' }} />
            Pasado
          </span>
        );
      case 'NO_PAGO':
        return (
          <span className="cuota-pill danger">
            <AlertCircle size={12} strokeWidth={2} style={{ marginRight: '4px', display: 'block' }} />
            No pagó
          </span>
        );
      default:
        return (
          <span className="cuota-pill default">
            <Clock size={12} strokeWidth={2} style={{ marginRight: '4px', display: 'block' }} />
            Pendiente
          </span>
        );
    }
  };

  const cuotas = Array.isArray(currentLoan.cuotas) ? currentLoan.cuotas : [];

  return (
    <article
      className="loan-card-container"
      onClick={() => {
        if (isSelectionMode && onToggleSelect && currentLoan?.id) {
          onToggleSelect(currentLoan.id);
        }
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 'var(--card-padding, 16px)',
        cursor: isSelectionMode ? 'pointer' : 'default',
        border: isCardHighlighted ? '2px solid #C65D58' : undefined,
        backgroundColor: isCardHighlighted ? 'var(--aureus-red-light)' : undefined,
        transition: 'all 0.15s ease'
      }}
    >
      {/* 3.1. VISTA CONTRAÍDA (Encabezado y Resumen Principal) */}
      <div className="loan-card-header">
        <div className="loan-client-info">
          <div className="loan-avatar" aria-hidden="true">
            {getInitials(currentLoan.cliente_nombre, currentLoan.cliente_apellidos)}
          </div>
          <div className="loan-name-group">
            <h3 className="loan-client-name">
              {[currentLoan.cliente_nombre, currentLoan.cliente_apellidos].filter(Boolean).join(' ')}
            </h3>
            {currentLoan.cliente_cedula && (
              <span className="loan-client-cedula">
                {currentLoan.cliente_cedula}
              </span>
            )}
          </div>
        </div>

        <div className="loan-status-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {loansList.length > 1 && (
            <span
              style={{
                backgroundColor: 'var(--aureus-gold-soft)',
                color: 'var(--aureus-gold-text)',
                border: '1px solid var(--aureus-border-gold)',
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '9999px',
                whiteSpace: 'nowrap'
              }}
            >
              {loansList.length} préstamos
            </span>
          )}

          {renderStateBadge()}

          {onDelete && !isSelectionMode && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(currentLoan);
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid var(--aureus-red-border)',
                backgroundColor: 'var(--aureus-red-light)',
                color: 'var(--aureus-red-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Eliminar préstamo"
              aria-label="Eliminar préstamo"
            >
              <Trash2 size={15} strokeWidth={2.2} />
            </button>
          )}

          {isSelectionMode && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSelect && currentLoan?.id) {
                  onToggleSelect(currentLoan.id);
                }
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: isCurrentSelected ? '1.5px solid #C65D58' : '2px solid var(--aureus-border-subtle)',
                backgroundColor: isCurrentSelected ? '#C65D58' : 'var(--aureus-bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {isCurrentSelected && <Check size={14} strokeWidth={3} color="#ffffff" />}
            </div>
          )}
        </div>
      </div>

      {/* Franja de Resumen Total del Cliente (cuando el cliente tiene 2 o más préstamos) */}
      {loansList.length > 1 && (
        <div
          style={{
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            borderRadius: '10px',
            padding: '6px 10px',
            marginTop: '8px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px'
          }}
        >
          <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 600 }}>
            Total prestado: <strong style={{ color: 'var(--aureus-text-primary)' }}>{formatColones(totalPrestadoCliente)}</strong>
          </span>
          <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 600 }}>
            Falta pagar: <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800 }}>{formatColones(totalFaltaPagarCliente)}</strong>
          </span>
        </div>
      )}

      {/* Selector de Pestañas por Préstamo (cuando el cliente tiene 2 o más préstamos) */}
      {loansList.length > 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              loansList.length === 2
                ? 'repeat(2, minmax(0, 1fr))'
                : 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '6px',
            backgroundColor: 'var(--aureus-bg-muted)',
            padding: '5px',
            borderRadius: '12px',
            marginBottom: '12px'
          }}
          role="tablist"
          aria-label="Pestañas de préstamos de este cliente"
        >
          {loansList.map((item, idx) => {
            const isTabActive = String(item.id) === String(currentLoan?.id);
            const isItemOverdue = item.estado === 'ATRASADO' || Number(item.periodos_atrasados_acumulados) > 0;
            const isItemMarkedForDelete = Array.isArray(selectedLoanIds) && selectedLoanIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveLoanId(item.id);
                }}
                style={{
                  backgroundColor: isTabActive ? '#B69A55' : 'var(--aureus-bg-surface)',
                  color: isTabActive ? '#FFFFFF' : 'var(--aureus-text-secondary)',
                  fontWeight: isTabActive ? 800 : 700,
                  boxShadow: isTabActive ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                  borderRadius: '9px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  border: isTabActive ? '1px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
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
                {isItemOverdue && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: '#e11d48',
                      flexShrink: 0
                    }}
                    title="Préstamo con atraso"
                  />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {`Préstamo ${idx + 1} · ${formatColones(item.monto_prestado)}`}
                </span>
                {isSelectionMode && isItemMarkedForDelete && (
                  <Check size={12} strokeWidth={3} color={isTabActive ? '#ffffff' : '#e11d48'} style={{ flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dos recuadros principales lado a lado (Cero desbordes) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '10px',
          margin: '12px 0',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          <span className="loan-metric-label">MONTO PRESTADO</span>
          <span className="loan-metric-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatColones(currentLoan.monto_prestado)}
          </span>
        </div>
        <div
          style={{
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          <span className="loan-metric-label">CUOTA</span>
          <span className="loan-metric-value green" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatColones(currentLoan.cuota)}
          </span>
        </div>
      </div>

      {/* 3.2. VISTA DESPLEGADA (Detalles Completos) */}
      {isExpanded && (
        <div className="loan-expanded-content">
          {/* 3 Recuadros de Condiciones (Grid estricto 3 columnas - Cero desbordes) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--loan-meta-cols, repeat(3, minmax(0, 1fr)))',
              gap: '8px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Caja 1: INTERÉS */}
            <div
              style={{
                backgroundColor: 'var(--aureus-bg-elevated)',
                border: '1px solid var(--aureus-border-subtle)',
                borderRadius: '12px',
                padding: '10px 8px',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--aureus-text-muted)', letterSpacing: '0.03em' }}>
                INTERÉS
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aureus-text-primary)', marginTop: '2px' }}>
                {currentLoan.porcentaje_interes}%
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--aureus-text-muted)',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Total: {formatColones(currentLoan.monto_total_financiar)}
              </div>
            </div>

            {/* Caja 2: MODALIDAD */}
            <div
              style={{
                backgroundColor: 'var(--aureus-bg-elevated)',
                border: '1px solid var(--aureus-border-subtle)',
                borderRadius: '12px',
                padding: '10px 8px',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--aureus-text-muted)', letterSpacing: '0.03em' }}>
                MODALIDAD
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--aureus-text-primary)', marginTop: '4px' }}>
                {currentLoan.modalidad === 'QUINCENAL' ? 'Quincenal' : 'Semanal'}
              </div>
            </div>

            {/* Caja 3: COBRO */}
            <div
              style={{
                backgroundColor: 'var(--aureus-bg-elevated)',
                border: '1px solid var(--aureus-border-subtle)',
                borderRadius: '12px',
                padding: '10px 8px',
                minWidth: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--aureus-text-muted)', letterSpacing: '0.03em' }}>
                COBRO
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--aureus-text-primary)',
                  marginTop: '4px',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}
              >
                {formatDayDisplay()}
              </div>
            </div>
          </div>

          {/* Resumen de Progreso (Grid 3 columnas equilibrado - Cero encimados de texto) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--loan-progress-cols, repeat(3, minmax(0, 1fr)))',
              gap: '6px',
              backgroundColor: 'var(--aureus-bg-elevated)',
              border: '1px solid var(--aureus-border-subtle)',
              borderRadius: '12px',
              padding: '10px 8px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {/* Pagado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, boxSizing: 'border-box' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--aureus-text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Pagado
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aureus-green-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatColones(isRegistrado ? (Number(currentLoan.monto_total_financiar) || Number(currentLoan.monto_pagado_acumulado)) : currentLoan.monto_pagado_acumulado)}
              </span>
            </div>

            {/* Falta por pagar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, boxSizing: 'border-box', borderLeft: '1px solid var(--aureus-border-subtle)', paddingLeft: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--aureus-text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Falta pagar
              </span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aureus-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {formatColones(isRegistrado ? 0 : (currentLoan.saldo_por_pagar != null ? currentLoan.saldo_por_pagar : currentLoan.monto_total_financiar))}
              </span>
            </div>

            {/* Cuotas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, boxSizing: 'border-box', borderLeft: '1px solid var(--aureus-border-subtle)', paddingLeft: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--aureus-text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Cuotas
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isRegistrado ? (currentLoan.total_periodos || currentLoan.periodos_pagados || 0) : (currentLoan.periodos_pagados || 0)} de {currentLoan.total_periodos || 0}
              </span>
            </div>
          </div>

          {/* CALENDARIO DE PAGOS */}
          <div className="loan-calendar-section" style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className="calendar-section-header">
              <CalendarDays size={16} strokeWidth={2} style={{ marginRight: '8px', color: 'var(--aureus-text-secondary)', display: 'block' }} />
              <h4 className="calendar-section-title">CALENDARIO DE PAGOS</h4>
            </div>

            {/* Bloque Superior de Vigencia (Inicio y Fecha Final en 2 columnas) */}
            <div className="loan-validity-grid grid grid-cols-2 gap-2.5 mb-3" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="loan-validity-box bg-slate-50 border border-slate-200/80 rounded-xl p-2.5" style={{ minWidth: 0, boxSizing: 'border-box' }}>
                <span className="validity-box-label text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  INICIO
                </span>
                <span className="validity-box-date text-xs sm:text-sm font-bold text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatShortSpanishDate(currentLoan.fecha_inicio)}
                </span>
              </div>

              <div className="loan-validity-box bg-slate-50 border border-slate-200/80 rounded-xl p-2.5" style={{ minWidth: 0, boxSizing: 'border-box' }}>
                <span className="validity-box-label text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  FECHA FINAL
                </span>
                <span className="validity-box-date text-xs sm:text-sm font-bold text-slate-800" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatShortSpanishDate(currentLoan.fecha_final)}
                </span>
              </div>
            </div>

            {/* Lista Cronológica de Cuotas */}
            <div className="calendar-timeline" style={{ width: '100%', boxSizing: 'border-box' }}>
              {cuotas.map((c) => (
                <div
                  key={c.id || c.numero_cobro}
                  style={{
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: '1 1 auto' }}>
                    <span style={{ fontWeight: 800, color: 'var(--aureus-text-primary)', fontSize: '13px', lineHeight: 1.2 }}>
                      Cobro {c.numero_cobro}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--aureus-text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3
                      }}
                    >
                      {formatShortSpanishDate(c.fecha_cobro_actual)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontWeight: 800,
                        color: 'var(--aureus-text-primary)',
                        fontSize: '13px',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatColones(c.monto_cuota)}
                    </span>
                    {renderCuotaBadge(isRegistrado ? 'REGISTRADO' : c.estado)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div
            style={{
              display: isRegistrado ? 'block' : 'grid',
              gridTemplateColumns: isRegistrado ? undefined : 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
              width: '100%',
              boxSizing: 'border-box',
              margin: '6px 0 2px 0'
            }}
          >
            <button
              type="button"
              onClick={() => onRenew(currentLoan)}
              className="loan-btn-action renew"
              style={{
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title="Renovar este préstamo"
            >
              <RefreshCw size={15} strokeWidth={2} style={{ marginRight: '6px', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Renovar</span>
            </button>
            {!isRegistrado && (
              <button
                type="button"
                onClick={() => onAgreement(currentLoan)}
                className="loan-btn-action agreement"
                style={{
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title="Realizar acuerdo de pago"
              >
                <Handshake size={15} strokeWidth={2} style={{ marginRight: '6px', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Arreglo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botón inferior único para alternar vista */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="loan-toggle-expand-btn"
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
        {isExpanded ? (
          <ChevronUp size={16} strokeWidth={2} style={{ marginLeft: '6px', display: 'block' }} />
        ) : (
          <ChevronDown size={16} strokeWidth={2} style={{ marginLeft: '6px', display: 'block' }} />
        )}
      </button>
    </article>
  );
}

export default LoanCard;

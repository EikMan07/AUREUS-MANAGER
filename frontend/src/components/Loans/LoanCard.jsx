import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Handshake,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { formatColones, getInitials, formatShortSpanishDate } from '../../utils/formatters';

export function LoanCard({
  loan,
  onRenew,
  onAgreement
}) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    if (loan.modalidad === 'SEMANAL') {
      return `Cada ${dayMap[loan.dia_fijo_original] || loan.dia_fijo_original || 'Sábado'}`;
    }
    if (loan.dia_fijo_original) {
      return `Cada 2 sem · ${dayMap[loan.dia_fijo_original] || loan.dia_fijo_original}`;
    }
    return 'Día 15 y fin de mes';
  };

  // Badge de estado del préstamo
  const renderStateBadge = () => {
    switch (loan.estado) {
      case 'ATRASADO':
        return <span className="loan-status-badge danger">Atrasado</span>;
      case 'ARREGLO_PAGO':
        return <span className="loan-status-badge warning">Arreglo de pago</span>;
      case 'RENOVADO':
        return <span className="loan-status-badge info">Renovado</span>;
      default:
        return <span className="loan-status-badge success">Activo</span>;
    }
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

  const cuotas = Array.isArray(loan.cuotas) ? loan.cuotas : [];

  return (
    <article className="loan-card-container">
      {/* 3.1. VISTA CONTRAÍDA (Encabezado y Resumen Principal) */}
      <div className="loan-card-header">
        <div className="loan-client-info">
          <div className="loan-avatar" aria-hidden="true">
            {getInitials(loan.cliente_nombre, loan.cliente_apellidos)}
          </div>
          <div className="loan-name-group">
            <h3 className="loan-client-name">
              {[loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ')}
            </h3>
            {loan.cliente_cedula && (
              <span className="loan-client-cedula">
                {loan.cliente_cedula}
              </span>
            )}
          </div>
        </div>
        <div className="loan-status-wrapper">
          {renderStateBadge()}
        </div>
      </div>

      {/* Dos recuadros principales lado a lado */}
      <div className="loan-metrics-grid">
        <div className="loan-metric-box">
          <span className="loan-metric-label">MONTO PRESTADO</span>
          <span className="loan-metric-value whitespace-nowrap">
            {formatColones(loan.monto_prestado)}
          </span>
        </div>
        <div className="loan-metric-box">
          <span className="loan-metric-label">CUOTA</span>
          <span className="loan-metric-value green whitespace-nowrap">
            {formatColones(loan.cuota)}
          </span>
        </div>
      </div>

      {/* 3.2. VISTA DESPLEGADA (Detalles Completos) */}
      {isExpanded && (
        <div className="loan-expanded-content">
          {/* 3 Recuadros de Condiciones */}
          <div className="loan-conditions-grid">
            <div className="condition-card">
              <span className="condition-title">INTERÉS</span>
              <span className="condition-highlight">{Math.round(Number(loan.porcentaje_interes || 0))}%</span>
              <span className="condition-sub">Total: {formatColones(loan.monto_total_financiar)}</span>
            </div>
            <div className="condition-card">
              <span className="condition-title">MODALIDAD</span>
              <span className="condition-highlight">
                {loan.modalidad === 'SEMANAL' ? 'Semanal' : 'Quincenal'}
              </span>
            </div>
            <div className="condition-card">
              <span className="condition-title">COBRO</span>
              <span className="condition-highlight small">
                {formatDayDisplay()}
              </span>
            </div>
          </div>

          {/* Resumen de Progreso */}
          <div className="loan-progress-card">
            <div className="progress-item">
              <span className="progress-label">Pagado</span>
              <span className="progress-val green">{formatColones(loan.monto_pagado_acumulado)}</span>
            </div>
            <div className="progress-divider" />
            <div className="progress-item">
              <span className="progress-label">Falta por pagar</span>
              <span className="progress-val">{formatColones(loan.saldo_por_pagar)}</span>
            </div>
            <div className="progress-divider" />
            <div className="progress-item">
              <span className="progress-label">Cuotas</span>
              <span className="progress-val">
                {loan.periodos_pagados} de {loan.total_periodos} pagadas
              </span>
            </div>
          </div>

          {/* CALENDARIO DE PAGOS */}
          <div className="loan-calendar-section">
            <div className="calendar-section-header">
              <CalendarDays size={16} strokeWidth={2} style={{ marginRight: '8px', color: '#475569', display: 'block' }} />
              <h4 className="calendar-section-title">CALENDARIO DE PAGOS</h4>
            </div>

            {/* Bloque Superior de Vigencia (Inicio y Fecha Final en 2 columnas) */}
            <div className="loan-validity-grid grid grid-cols-2 gap-2.5 mb-3">
              <div className="loan-validity-box bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                <span className="validity-box-label text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  INICIO
                </span>
                <span className="validity-box-date text-xs sm:text-sm font-bold text-slate-800">
                  {formatShortSpanishDate(loan.fecha_inicio)}
                </span>
              </div>

              <div className="loan-validity-box bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                <span className="validity-box-label text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  FECHA FINAL
                </span>
                <span className="validity-box-date text-xs sm:text-sm font-bold text-slate-800">
                  {formatShortSpanishDate(loan.fecha_final)}
                </span>
              </div>
            </div>

            {/* Lista Cronológica de Cuotas */}
            <div className="calendar-timeline">
              {cuotas.map((c) => (
                <div
                  key={c.id || c.numero_cobro}
                  className="cuota-card-item bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="cuota-info-left">
                    <span className="cuota-number">Cobro {c.numero_cobro}</span>
                    <span className="cuota-date">{formatShortSpanishDate(c.fecha_cobro_actual)}</span>
                  </div>
                  <div className="cuota-info-right">
                    <span className="cuota-amount">{formatColones(c.monto_cuota)}</span>
                    {renderCuotaBadge(c.estado)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2 Botones de Acción */}
          <div className="loan-actions-grid">
            <button
              type="button"
              onClick={() => onRenew(loan)}
              className="loan-btn-action renew"
              title="Renovar este préstamo"
            >
              <RefreshCw size={16} strokeWidth={2} style={{ marginRight: '8px', display: 'block' }} />
              <span>Renovar Préstamo</span>
            </button>
            <button
              type="button"
              onClick={() => onAgreement(loan)}
              className="loan-btn-action agreement"
              title="Realizar acuerdo de pago"
            >
              <Handshake size={16} strokeWidth={2} style={{ marginRight: '8px', display: 'block' }} />
              <span>Arreglo de Pago</span>
            </button>
          </div>
        </div>
      )}

      {/* Botón inferior único para alternar vista */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
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

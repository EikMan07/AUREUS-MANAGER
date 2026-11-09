import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, X, Check, Calendar, Landmark } from 'lucide-react';
import { ConfirmActionStage } from '../Modals/ConfirmActionStage';
import { formatColones, formatFullName } from '../../utils/formatters';

/**
 * Modal de Doble Verificación para eliminación de préstamos en el Módulo 3.
 * Soporta eliminación de un préstamo individual con detección inteligente de otros préstamos
 * del mismo cliente, así como eliminación múltiple en lote.
 */
export function ConfirmEliminarPrestamosModal({
  isOpen,
  onClose,
  targetLoan = null,
  allLoans = [],
  batchLoans = [],
  category = 'PENDIENTES',
  onConfirmDelete
}) {
  // Todos los Hooks al inicio del componente antes de cualquier return condicional
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState('idle');

  // Préstamos del mismo cliente cuando se abre desde una tarjeta individual
  const clientLoans = useMemo(() => {
    if (!targetLoan) return [];
    const targetId = targetLoan.cliente_id;
    const targetNombre = (targetLoan.cliente_nombre || '').trim().toLowerCase();
    const targetApellidos = (targetLoan.cliente_apellidos || '').trim().toLowerCase();

    return allLoans.filter((l) => {
      if (targetId && l.cliente_id) {
        return l.cliente_id === targetId;
      }
      const nombre = (l.cliente_nombre || '').trim().toLowerCase();
      const apellidos = (l.cliente_apellidos || '').trim().toLowerCase();
      return nombre === targetNombre && apellidos === targetApellidos;
    });
  }, [targetLoan, allLoans]);

  // Inicializar IDs seleccionados al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setIsDeleting(false);
      setConfirmPhase('idle');
      return;
    }

    setConfirmPhase('idle');
    if (batchLoans && batchLoans.length > 0) {
      // Modo lote: todos los seleccionados en la cabecera
      setSelectedIds(batchLoans.map((l) => l.id));
    } else if (targetLoan) {
      // Modo individual: viene marcado el préstamo tocado
      setSelectedIds([targetLoan.id]);
    }
  }, [isOpen, targetLoan, batchLoans]);

  // Cierre con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting && confirmPhase === 'idle') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, confirmPhase, onClose]);

  if (!isOpen) return null;

  // Toggle de selección de un préstamo dentro del modal
  const handleToggleLoan = (loanId) => {
    setSelectedIds((prev) => {
      if (prev.includes(loanId)) {
        return prev.filter((id) => id !== loanId);
      }
      return [...prev, loanId];
    });
  };

  // Botón rápido para seleccionar todos o solo el principal
  const handleSelectAllClientLoans = () => {
    if (clientLoans.length === 0) return;
    const allIds = clientLoans.map((l) => l.id);
    const areAllSelected = allIds.every((id) => selectedIds.includes(id));
    if (areAllSelected && targetLoan) {
      // Dejar solo el préstamo inicial
      setSelectedIds([targetLoan.id]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const isBatchMode = batchLoans && batchLoans.length > 0;
  const isMultiLoanClient = !isBatchMode && clientLoans.length > 1;
  const countToDelete = selectedIds.length;

  // Determinar categoría real del préstamo a eliminar (PENDIENTES | REGISTRADOS | ATRASADOS)
  const sampleLoan = targetLoan || (isBatchMode ? batchLoans[0] : null);
  const sampleEstado = String(sampleLoan?.estado || sampleLoan?.status || '').toUpperCase();
  const sampleSaldo = Number(sampleLoan?.saldo_por_pagar ?? sampleLoan?.remainingBalance ?? 1);
  const sampleMonto = Number(sampleLoan?.monto_prestado ?? sampleLoan?.amount ?? 0);
  const sampleTotalP = Number(sampleLoan?.total_periodos || 0);
  const samplePagadosP = Number(sampleLoan?.periodos_pagados || 0);
  const sampleAtrasos = Number(sampleLoan?.periodos_atrasados_acumulados || 0);

  const isLoanRegistrado =
    category === 'REGISTRADOS' ||
    sampleEstado === 'CANCELADO' ||
    sampleEstado === 'LIQUIDADO' ||
    sampleEstado === 'PAGADO' ||
    sampleEstado === 'REGISTRADO' ||
    (sampleMonto > 0 && sampleSaldo <= 0) ||
    (sampleTotalP > 0 && samplePagadosP >= sampleTotalP);

  const isLoanAtrasado =
    !isLoanRegistrado &&
    (category === 'ATRASADOS' ||
      sampleEstado === 'ATRASADO' ||
      (sampleLoan?.modalidad === 'QUINCENAL' ? sampleAtrasos >= 2 : sampleAtrasos >= 4));

  const variant = isLoanRegistrado
    ? 'eliminar_prestamo_registrado'
    : isLoanAtrasado
    ? 'eliminar_prestamo_atrasado'
    : 'eliminar_prestamo_pendiente';

  // Nombre limpio del cliente para mostrar en el modal y en la cápsula escénica
  const clientDisplayName = targetLoan
    ? formatFullName(targetLoan.cliente_nombre, targetLoan.cliente_apellidos)
    : isBatchMode && batchLoans.length > 0
    ? formatFullName(batchLoans[0].cliente_nombre, batchLoans[0].cliente_apellidos)
    : 'Cliente';

  const nombreClienteLimpio =
    isBatchMode && countToDelete > 1
      ? `${countToDelete} préstamos seleccionados`
      : clientDisplayName;

  const handleConfirm = () => {
    if (selectedIds.length === 0 || isDeleting || confirmPhase !== 'idle') return;
    setIsDeleting(true);
    setConfirmPhase('animating');

    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    setTimeout(async () => {
      try {
        await onConfirmDelete(selectedIds);
        onClose();
      } finally {
        setConfirmPhase('idle');
        setIsDeleting(false);
      }
    }, 1480);
  };

  // Renderizado exclusivo de la cápsula escénica (desmonta por completo la caja blanca del modal)
  if (confirmPhase !== 'idle') {
    return (
      <div
        className="modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
      >
        <ConfirmActionStage
          variant={variant}
          phase={confirmPhase}
          subtitle={nombreClienteLimpio}
          clientName={nombreClienteLimpio}
          isPlural={countToDelete > 1}
        />
      </div>
    );
  }

  const areAllClientLoansSelected =
    clientLoans.length > 0 && clientLoans.every((l) => selectedIds.includes(l.id));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(10, 15, 30, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'inherit'
      }}
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO SUPERIOR */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className={isDeleting ? 'cf-anim-trash-drop' : ''}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ffe4e6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48'
              }}
            >
              <Trash2 size={20} strokeWidth={2.2} className={isDeleting ? 'cf-anim-trash-drop' : ''} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.2px'
                }}
              >
                Confirmar eliminación
              </h3>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: 500
                }}
              >
                {countToDelete === 1 ? '1 préstamo seleccionado' : `${countToDelete} préstamos seleccionados`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* Mensaje descriptivo en lenguaje natural */}
          <div
            style={{
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <AlertTriangle size={18} color="#e11d48" style={{ shrink: 0, marginTop: '2px' }} />
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: '#9f1239',
                lineHeight: 1.5,
                fontWeight: 600
              }}
            >
              {countToDelete === 1
                ? `¿Estás seguro de que deseas eliminar este préstamo de ${clientDisplayName}? Esta acción borrará sus cobros programados y no eliminará al cliente de tu lista de clientes.`
                : `¿Estás seguro de que deseas eliminar los ${countToDelete} préstamos seleccionados? Esta acción borrará sus cobros programados y no eliminará al cliente de tu lista de clientes.`}
            </p>
          </div>

          {/* CASO 1: Cliente con 1 solo préstamo */}
          {!isBatchMode && !isMultiLoanClient && targetLoan && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Cliente
                </span>
                <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                  {clientDisplayName}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Monto prestado
                </span>
                <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>
                  {formatColones(targetLoan.monto_prestado)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Cuota
                </span>
                <strong style={{ fontSize: '13px', color: '#059669', fontWeight: 800 }}>
                  {formatColones(targetLoan.cuota)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Saldo pendiente
                </span>
                <strong style={{ fontSize: '13px', color: '#e11d48', fontWeight: 800 }}>
                  {formatColones(targetLoan.saldo_por_pagar || targetLoan.monto_total_financiar)}
                </strong>
              </div>
            </div>
          )}

          {/* CASO 2: Cliente con 2 o más préstamos (Detección Inteligente) */}
          {isMultiLoanClient && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Préstamos de este cliente
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllClientLoans}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e11d48',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '2px 4px'
                  }}
                >
                  {areAllClientLoansSelected ? 'Deseleccionar otros' : 'Seleccionar todos'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {clientLoans.map((loanItem) => {
                  const isChecked = selectedIds.includes(loanItem.id);
                  return (
                    <div
                      key={loanItem.id}
                      onClick={() => handleToggleLoan(loanItem.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: isChecked ? '#fff1f2' : '#ffffff',
                        border: isChecked ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                            {formatColones(loanItem.monto_prestado)}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              backgroundColor: loanItem.estado === 'ATRASADO' ? '#fee2e2' : '#D6E7D6',
                              color: loanItem.estado === 'ATRASADO' ? '#e11d48' : '#0A3323'
                            }}
                          >
                            {loanItem.estado === 'ATRASADO'
                              ? 'Atrasado'
                              : loanItem.estado === 'CANCELADO' || loanItem.estado === 'LIQUIDADO' || Number(loanItem.saldo_por_pagar) <= 0
                              ? 'Registrado'
                              : 'Pendiente'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Cuota: <strong style={{ color: '#059669' }}>{formatColones(loanItem.cuota)}</strong> · Saldo: <strong style={{ color: '#0f172a' }}>{formatColones(loanItem.saldo_por_pagar || loanItem.monto_total_financiar)}</strong>
                        </div>
                      </div>

                      {/* Círculo indicador de selección */}
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isChecked ? '1.5px solid #e11d48' : '2px solid #cbd5e1',
                          backgroundColor: isChecked ? '#e11d48' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} color="#ffffff" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASO 3: Modo Lote desde la barra de Selección */}
          {isBatchMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Préstamos a eliminar
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {batchLoans.map((bLoan) => {
                  const isChecked = selectedIds.includes(bLoan.id);
                  const clientName = [bLoan.cliente_nombre, bLoan.cliente_apellidos].filter(Boolean).join(' ') || 'Cliente';
                  return (
                    <div
                      key={bLoan.id}
                      onClick={() => handleToggleLoan(bLoan.id)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '10px',
                        backgroundColor: isChecked ? '#fff1f2' : '#ffffff',
                        border: isChecked ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                          {clientName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Monto: <strong style={{ color: '#0f172a' }}>{formatColones(bLoan.monto_prestado)}</strong> · Cuota: <strong style={{ color: '#059669' }}>{formatColones(bLoan.cuota)}</strong>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isChecked ? '1.5px solid #e11d48' : '2px solid #cbd5e1',
                          backgroundColor: isChecked ? '#e11d48' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shrink: 0
                        }}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} color="#ffffff" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PIE CON BOTONES DE ACCIÓN */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || isDeleting}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: selectedIds.length === 0 || isDeleting ? '#fda4af' : '#e11d48',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: selectedIds.length === 0 || isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: selectedIds.length === 0 || isDeleting ? 'none' : '0 4px 12px rgba(225, 29, 72, 0.28)',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={15} strokeWidth={2.4} />
            <span>
              {isDeleting
                ? 'Eliminando...'
                : countToDelete <= 1
                ? 'Eliminar préstamo'
                : 'Eliminar préstamos'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmEliminarPrestamosModal;


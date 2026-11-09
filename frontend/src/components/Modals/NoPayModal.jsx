import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Calendar, XCircle } from 'lucide-react';
import { ConfirmActionStage } from './ConfirmActionStage';
import { formatColones, calculateNextCobroDate } from '../../utils/formatters';

export function NoPayModal({ client, isOpen, onClose, onConfirmNoPay, currentDateISO }) {
  // Todos los Hooks al inicio del componente antes de cualquier return condicional
  const [confirmPhase, setConfirmPhase] = useState('idle');

  useEffect(() => {
    if (isOpen) {
      setConfirmPhase('idle');
    }
  }, [isOpen]);

  if (!isOpen || !client) return null;

  // Limpieza estricta del nombre del cliente para jamás mostrar "null" o "undefined"
  const cleanPart = (val) => {
    if (!val || val === 'null' || val === 'undefined') return '';
    return String(val).replace(/\bnull\b/gi, '').replace(/\bundefined\b/gi, '').trim();
  };
  const nombreCliente = [
    cleanPart(client?.nombre || client?.cliente_nombre || client?.name),
    cleanPart(client?.apellidos || client?.cliente_apellidos)
  ].filter(Boolean).join(' ') || 'Cliente';

  const esQuincenal = String(client?.frecuencia || client?.modalidad || '').toLowerCase() === 'quincenal';
  const labelPeriodo = esQuincenal ? 'QUINCENAS SIN PAGAR' : 'SEMANAS SIN PAGAR';
  const cantidadAcumulada = Number(client?.periodosAtrasados ?? client?.periodos_atrasados_acumulados ?? 0) + 1;
  const textoValorPeriodo = esQuincenal
    ? `${cantidadAcumulada} ${cantidadAcumulada === 1 ? 'quincena' : 'quincenas'}`
    : `${cantidadAcumulada} ${cantidadAcumulada === 1 ? 'semana' : 'semanas'}`;

  const proximoCobroTexto = calculateNextCobroDate(client, currentDateISO || client.fechaCobroActual);

  const handleClose = () => {
    setConfirmPhase('idle');
    onClose();
  };

  const handleConfirm = () => {
    if (confirmPhase !== 'idle') return;
    setConfirmPhase('animating');

    // Mantener visible 1200ms para apreciar el trazado de la cruz y leer el estado con claridad
    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    // Ejecutar la acción de no pago y cerrar tras completar el desvanecimiento (1480ms)
    setTimeout(async () => {
      try {
        await onConfirmNoPay(client.id);
      } finally {
        handleClose();
      }
    }, 1480);
  };

  // Renderizado exclusivo de la cápsula de confirmación (desmonta por completo la caja blanca del modal)
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
          variant="nopago"
          phase={confirmPhase}
          clientName={nombreCliente}
        />
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nopay-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div className="modal-container">
        {/* Encabezado: Un solo título claro */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="nopay-modal-title" className="modal-title">
              Confirmar No Pago
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Contenido: Pregunta directa y sencilla */}
        <div className="modal-body">
          <div className="confirmation-prompt-box">
            <div
              className="prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center bg-red-50 text-red-600 border border-red-200/80"
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderColor: 'rgba(254, 202, 202, 0.8)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <XCircle size={28} strokeWidth={2} />
            </div>
            <p className="prompt-text">
              ¿Confirmas que <strong className="client-highlight">{nombreCliente}</strong> no realizó el pago de hoy por <strong className="amount-highlight">{formatColones(client.cuotaDiaria)}</strong>?
            </p>
          </div>

          {/* Resumen apilado a ancho completo */}
          <div className="overdue-stacked-summary">
            <div className="overdue-stacked-card">
              <span className="overdue-clean-label">{labelPeriodo}</span>
              <strong className="overdue-clean-value red">{textoValorPeriodo}</strong>
            </div>

            <div className="overdue-stacked-card">
              <span className="overdue-clean-label">PRÓXIMO COBRO</span>
              <div className="proximo-cobro-single-line">
                <div className="calendar-icon-soft-box" aria-hidden="true">
                  <Calendar size={15} strokeWidth={1.75} />
                </div>
                <span className="proximo-cobro-text-clean">{proximoCobroTexto}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones inferiores */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={handleClose}
            className="modal-btn-cancel"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={confirmPhase !== 'idle'}
            onClick={handleConfirm}
            className="modal-btn-danger"
          >
            <AlertCircle size={18} strokeWidth={1.75} className="inline-btn-icon" />
            <span>{confirmPhase !== 'idle' ? 'No pago confirmado' : 'Confirmar No Pago'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

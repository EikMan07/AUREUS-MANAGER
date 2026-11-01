import React from 'react';
import { X, AlertCircle, Calendar } from 'lucide-react';
import { formatColones, calculateNextCobroDate } from '../../utils/formatters';

export function NoPayModal({ client, isOpen, onClose, onConfirmNoPay, currentDateISO }) {
  if (!isOpen || !client) return null;

  const fullName = `${client.nombre} ${client.apellidos}`;
  const esQuincenal = client.frecuencia === 'quincenal';
  const labelPeriodo = esQuincenal ? 'QUINCENAS SIN PAGAR' : 'SEMANAS SIN PAGAR';
  const cantidadAcumulada = (client.periodosAtrasados || 0) + 1;
  const textoValorPeriodo = esQuincenal
    ? `${cantidadAcumulada} ${cantidadAcumulada === 1 ? 'quincena' : 'quincenas'}`
    : `${cantidadAcumulada} ${cantidadAcumulada === 1 ? 'semana' : 'semanas'}`;

  const proximoCobroTexto = calculateNextCobroDate(client, currentDateISO || client.fechaCobroActual);

  const handleConfirm = () => {
    onConfirmNoPay(client.id);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="nopay-modal-title">
      <div className="modal-container">
        {/* Encabezado: Un solo título claro, sin subtítulos técnicos ni slash */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="nopay-modal-title" className="modal-title">
              Confirmar No Pago
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close-btn" 
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Contenido: Pregunta directa y sencilla sin tecnicismos */}
        <div className="modal-body">
          <div className="confirmation-prompt-box">
            <div className="prompt-icon-wrapper red">
              <AlertCircle size={28} strokeWidth={1.75} className="prompt-icon red" />
            </div>
            <p className="prompt-text">
              ¿Confirmas que <strong className="client-highlight">{fullName}</strong> no realizó el pago de hoy por <strong className="amount-highlight">{formatColones(client.cuotaDiaria)}</strong>?
            </p>
          </div>

          {/* Resumen apilado a ancho completo (w-full): Semanas/Quincenas arriba, Próximo cobro abajo */}
          <div className="overdue-stacked-summary">
            {/* 1. Recuadro superior: SEMANAS SIN PAGAR */}
            <div className="overdue-stacked-card">
              <span className="overdue-clean-label">{labelPeriodo}</span>
              <strong className="overdue-clean-value red">{textoValorPeriodo}</strong>
            </div>

            {/* 2. Recuadro inferior: PRÓXIMO COBRO en una sola línea horizontal con icono en contenedor suave */}
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

        {/* Botones inferiores: Cancelar y Confirmar No Pago */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={onClose}
            className="modal-btn-cancel"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="modal-btn-danger"
          >
            <AlertCircle size={18} strokeWidth={1.75} className="inline-btn-icon" />
            <span>Confirmar No Pago</span>
          </button>
        </div>
      </div>
    </div>
  );
}

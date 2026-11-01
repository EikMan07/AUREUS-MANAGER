import React, { useState } from 'react';
import { X, Check, AlertCircle, HelpCircle } from 'lucide-react';
import {
  formatColones,
  formatAmountWithCommas,
  parseFormattedAmount,
  getDayNameFromKey,
  formatCedulaCR
} from '../../utils/formatters';

export function PaymentModal({ client, isOpen, onClose, onConfirmPayment }) {
  // Estado para el caso con moratoria acumulada
  const [moratoriaInput, setMoratoriaInput] = useState('');
  // Doble confirmación paso 2 para caso de moratoria
  const [confirmStep, setConfirmStep] = useState(1);

  if (!isOpen || !client) return null;

  const fullName = `${client.nombre} ${client.apellidos}`;
  const isOverdue = (client.periodosAtrasados || 0) > 0;
  const esQuincenal = client.frecuencia === 'quincenal';
  const labelPeriodos = esQuincenal ? 'Quincenas sin pagar' : 'Semanas sin pagar';
  const valorPeriodos = `${client.periodosAtrasados} ${
    esQuincenal
      ? client.periodosAtrasados === 1 ? 'quincena' : 'quincenas'
      : client.periodosAtrasados === 1 ? 'semana' : 'semanas'
  }`;

  const parsedMoratoria = parseFormattedAmount(moratoriaInput);
  const totalACobrar = client.cuotaDiaria + parsedMoratoria;
  const nuevoSaldoRestante = Math.max(0, (client.saldoRestante || 0) - (client.cuotaDiaria || 0));

  const handleMoratoriaChange = (e) => {
    setMoratoriaInput(formatAmountWithCommas(e.target.value));
  };

  const handleFinalConfirm = () => {
    onConfirmPayment(client.id, parsedMoratoria);
    handleClose();
  };

  const handleClose = () => {
    setConfirmStep(1);
    setMoratoriaInput('');
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="modal-container">
        {/* Encabezado del Modal: Un solo título claro sin nombres dobles ni barras */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="payment-modal-title" className="modal-title">
              {isOverdue && confirmStep === 1 ? 'Registrar Pago con Atraso' : 'Confirmar Pago'}
            </h3>
            <p className="modal-subtitle">
              {fullName} · Cédula {formatCedulaCR(client.cedula)}
            </p>
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

        {/* CONTENIDO DEL MODAL */}
        <div className="modal-body">
          {/* CASO 1: Cliente al día (Doble Verificación Directa) */}
          {!isOverdue && (
            <div className="confirmation-prompt-box">
              <div className="prompt-icon-wrapper mint">
                <HelpCircle size={28} strokeWidth={1.75} className="prompt-icon mint" />
              </div>
              <p className="prompt-text">
                ¿Confirmas que <strong className="client-highlight">{fullName}</strong> realizó el pago de <strong className="amount-highlight">{formatColones(client.cuotaDiaria)}</strong>?
              </p>
              
              {/* Información de actualización de saldo restante */}
              <div className="return-day-notice">
                <span>Saldo actual: <strong>{formatColones(client.saldoRestante)}</strong> · Nuevo saldo: <strong>{formatColones(nuevoSaldoRestante)}</strong></span>
              </div>

              {client.pasadoDeDia && (
                <div className="return-day-notice">
                  El cliente fue atendido hoy temporalmente y regresará automáticamente a su día fijo habitual (<strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong>) para su siguiente cobro.
                </div>
              )}
            </div>
          )}

          {/* CASO 2: Cliente que trae atrasos/moratoria acumulada */}
          {isOverdue && confirmStep === 1 && (
            <div className="overdue-calculation-box">
              <div className="overdue-summary-banner">
                <div className="overdue-banner-icon">
                  <AlertCircle size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <h4 className="overdue-banner-title">Cálculo de Atraso Acumulado</h4>
                  <p className="overdue-banner-text">
                    El cliente presenta cuotas pendientes de fechas anteriores.
                  </p>
                </div>
              </div>

              {/* Métricas limpias sin conteo por días sueltos */}
              <div className="metrics-auto-grid">
                <div className="metric-item">
                  <span className="metric-label">{labelPeriodos}</span>
                  <strong className="metric-value red">{valorPeriodos}</strong>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Cuota regular de hoy</span>
                  <strong className="metric-value">{formatColones(client.cuotaDiaria)}</strong>
                </div>
              </div>

              {/* Campo editable de Moratoria */}
              <div className="form-field-group">
                <label htmlFor="moratoria-input" className="form-field-label">
                  Monto de moratoria (Colones ₡)
                </label>
                <div className="input-currency-wrapper">
                  <span className="currency-symbol">₡</span>
                  <input
                    id="moratoria-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={moratoriaInput}
                    onChange={handleMoratoriaChange}
                    className="form-input-currency no-spinners"
                  />
                </div>
                <span className="field-hint">
                  Digita el monto adicional que deseas cobrar por concepto de atraso o déjalo en ₡0.
                </span>
              </div>

              {/* Total a cobrar calculado */}
              <div className="total-calculation-preview">
                <span className="total-preview-label">Total a Registrar:</span>
                <span className="total-preview-amount">{formatColones(totalACobrar)}</span>
              </div>
            </div>
          )}

          {/* CASO 2 - Paso 2: Doble verificación con moratoria */}
          {isOverdue && confirmStep === 2 && (
            <div className="confirmation-prompt-box">
              <div className="prompt-icon-wrapper mint">
                <Check size={28} strokeWidth={1.75} className="prompt-icon mint" />
              </div>
              <p className="prompt-text">
                ¿Confirmas que <strong className="client-highlight">{fullName}</strong> pagó la cuota de <strong className="amount-highlight">{formatColones(client.cuotaDiaria)}</strong>
                {parsedMoratoria > 0 && (
                  <> más <strong className="amount-highlight">{formatColones(parsedMoratoria)}</strong> de moratoria (Total: <strong className="amount-highlight">{formatColones(totalACobrar)}</strong>)</>
                )}?
              </p>
              <div className="return-day-notice">
                <span>Saldo actual: <strong>{formatColones(client.saldoRestante)}</strong> · Nuevo saldo: <strong>{formatColones(nuevoSaldoRestante)}</strong></span>
              </div>
              <div className="return-day-notice">
                Se limpiará el atraso acumulado de este período y el cliente pasará a Cobros ya registrados.
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES DEL MODAL */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={confirmStep === 2 && isOverdue ? () => setConfirmStep(1) : handleClose}
            className="modal-btn-cancel"
          >
            {confirmStep === 2 && isOverdue ? 'Atrás' : 'Cancelar'}
          </button>

          {(!isOverdue || confirmStep === 2) ? (
            <button
              type="button"
              onClick={handleFinalConfirm}
              className="modal-btn-confirm"
            >
              <Check size={18} strokeWidth={2} className="inline-btn-icon" />
              <span>Confirmar pago</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmStep(2)}
              className="modal-btn-confirm"
            >
              <span>Continuar a confirmación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

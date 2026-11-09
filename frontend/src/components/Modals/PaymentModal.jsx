import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ConfirmActionStage } from './ConfirmActionStage';
import {
  formatColones,
  formatAmountWithCommas,
  parseFormattedAmount,
  getDayNameFromKey,
  formatCedulaCR
} from '../../utils/formatters';

export function PaymentModal({ client, isOpen, onClose, onConfirmPayment }) {
  // Todos los Hooks al inicio del componente antes de cualquier return condicional
  const [moratoriaInput, setMoratoriaInput] = useState('');
  const [confirmStep, setConfirmStep] = useState(1);
  const [confirmPhase, setConfirmPhase] = useState('idle');

  useEffect(() => {
    if (isOpen) {
      setConfirmPhase('idle');
      setConfirmStep(1);
      setMoratoriaInput('');
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

  // 1. Cuota regular del préstamo (semanal o quincenal)
  const cuotaRegular = Number(client?.cuotaDiaria || client?.cuota || client?.monto_cuota || client?.amount || 0);

  // 2. Cantidad de semanas o quincenas atrasadas acumuladas
  const atrasos = Math.max(
    0,
    Number(client?.periodos_atrasados_acumulados ?? client?.periodosAtrasados ?? client?.atrasos ?? 0)
  );
  const isOverdue = atrasos > 0;
  const esQuincenal = String(client?.frecuencia || client?.modalidad || '').toLowerCase() === 'quincenal';

  // 3. Monto acumulado de las semanas/quincenas sin pagar anteriores
  const montoAtrasoAcumulado = atrasos * cuotaRegular;

  // 4. Cuota regular correspondiente al día de hoy
  const cuotaDeHoy = cuotaRegular;

  // 5. Total que debe dar hoy (Deuda Base Acumulada = Atrasos + Cuota de Hoy)
  const deudaBaseTotal = montoAtrasoAcumulado + cuotaDeHoy;

  // 6. Monto digitado manualmente por el usuario
  const montoDigitado = Number(String(moratoriaInput || '0').replace(/,/g, '')) || 0;

  // 7. Regla inquebrantable de Semáforo Visual (Rojo de Deuda vs. Verde Dólar Positivo):
  // SOLO es verde y positivo si el monto digitado SUPERA estrictamente la deudaBaseTotal (aunque sea por 1 colón)
  const esPositivoVerde = montoDigitado > deudaBaseTotal;

  // Monto que se visualiza en el recuadro inferior:
  // Si supera la deudaBaseTotal, muestra el montoDigitado en positivo (+₡...).
  // Si es menor o igual a la deudaBaseTotal, mantiene visible la deudaBaseTotal en negativo (-₡...).
  const totalMostrar = esPositivoVerde ? montoDigitado : deudaBaseTotal;
  const excedenteAdicional = esPositivoVerde ? (montoDigitado - deudaBaseTotal) : 0;

  const totalFinal = totalMostrar;
  const montoMoratoriaReal = excedenteAdicional;

  const labelPeriodos = esQuincenal ? 'QUINCENAS SIN PAGAR' : 'SEMANAS SIN PAGAR';
  const valorPeriodos = `${atrasos} ${
    esQuincenal
      ? atrasos === 1 ? 'quincena' : 'quincenas'
      : atrasos === 1 ? 'semana' : 'semanas'
  }`;

  const montoBaseDescontar = isOverdue ? deudaBaseTotal : cuotaRegular;
  const nuevoSaldoRestante = Math.max(0, (Number(client?.saldoRestante) || 0) - montoBaseDescontar);

  const handleMoratoriaChange = (e) => {
    setMoratoriaInput(formatAmountWithCommas(e.target.value));
  };

  const handleClose = () => {
    setConfirmPhase('idle');
    setConfirmStep(1);
    setMoratoriaInput('');
    onClose();
  };

  const handleFinalConfirm = () => {
    if (confirmPhase !== 'idle') return;
    setConfirmPhase('animating');

    // Mantener visible 1200ms para apreciar el trazado y leer los datos con claridad
    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    // Ejecutar la acción de guardado y cerrar tras completar el desvanecimiento (1480ms)
    setTimeout(async () => {
      try {
        await onConfirmPayment(
          client.id,
          isOverdue ? montoMoratoriaReal : 0,
          montoBaseDescontar
        );
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
          variant="pago"
          phase={confirmPhase}
          clientName={nombreCliente}
          amount={isOverdue ? totalFinal : cuotaRegular}
        />
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
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
        {/* Encabezado del Modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="payment-modal-title" className="modal-title">
              {isOverdue && confirmStep === 1 ? 'Registrar Pago con Atraso' : 'Confirmar Pago'}
            </h3>
            <p className="modal-subtitle">
              {nombreCliente} · Cédula {formatCedulaCR(client.cedula)}
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
          {/* CASO 1: Cliente al día */}
          {!isOverdue && (
            <div className="confirmation-prompt-box">
              <div
                className="prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#D6E7D6',
                  color: '#1B4D37',
                  borderColor: '#8FB89A',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <CheckCircle2 size={28} strokeWidth={2.2} />
              </div>
              <p className="prompt-text">
                ¿Confirmas que <strong className="client-highlight">{nombreCliente}</strong> realizó el pago de <strong className="amount-highlight">{formatColones(cuotaRegular)}</strong>?
              </p>

              <div className="return-day-notice">
                <span>Saldo actual: <strong>{formatColones(client.saldoRestante)}</strong> · Nuevo saldo: <strong>{formatColones(nuevoSaldoRestante)}</strong></span>
              </div>

              {client.pasadoDeDia && (
                <div className="return-day-notice">
                  El cliente fue atendido hoy temporalmente y regresará automáticamente a su día fijo habitual <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong> para su siguiente cobro.
                </div>
              )}
            </div>
          )}

          {/* CASO 2: Cliente con atrasos acumulados - Paso 1 */}
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

              {/* Recuadros superiores con desglose de atraso acumulado + cuota de hoy */}
              <div className="metrics-auto-grid">
                <div className="metric-item">
                  <span className="metric-label">{labelPeriodos}</span>
                  <strong className="metric-value red" style={{ color: '#dc2626' }}>{valorPeriodos}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', marginTop: '2px' }}>
                    Acumulado: {formatColones(montoAtrasoAcumulado)}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">CUOTA DE HOY</span>
                  <strong className="metric-value" style={{ color: '#0f172a' }}>{formatColones(cuotaDeHoy)}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
                    Correspondiente al día de hoy
                  </span>
                </div>
              </div>

              {/* Campo editable de Moratoria (sin paréntesis en etiqueta) */}
              <div className="form-field-group">
                <label htmlFor="moratoria-input" className="form-field-label">
                  MONTO DE MORATORIA
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
                  Digita el monto adicional por atraso o déjalo en ₡0.
                </span>
              </div>

              {/* Recuadro de Total que debe dar hoy (Semáforo Rojo vs. Verde Dólar) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  borderRadius: '14px',
                  backgroundColor: esPositivoVerde ? '#D6E7D6' : '#FEF2F2',
                  border: `1.5px solid ${esPositivoVerde ? '#8FB89A' : '#FECACA'}`,
                  transition: 'all 0.25s ease',
                  marginTop: '14px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: esPositivoVerde ? '#0A3323' : '#991B1B'
                    }}
                  >
                    Total que debe dar hoy:
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: esPositivoVerde ? '#1B4D37' : '#B91C1C'
                    }}
                  >
                    {esPositivoVerde
                      ? `Cubre los ₡${deudaBaseTotal.toLocaleString('en-US')} acumulados más ₡${excedenteAdicional.toLocaleString('en-US')} adicionales`
                      : montoDigitado > 0
                      ? `El monto digitado de ₡${montoDigitado.toLocaleString('en-US')} no cubre ni supera los ₡${deudaBaseTotal.toLocaleString('en-US')} acumulados`
                      : `Suma de ${atrasos} ${atrasos === 1 ? (esQuincenal ? 'quincena sin pagar' : 'semana sin pagar') : (esQuincenal ? 'quincenas sin pagar' : 'semanas sin pagar')} más la cuota de hoy`}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: esPositivoVerde ? '#1B4D37' : '#DC2626',
                    flexShrink: 0,
                    marginLeft: '10px'
                  }}
                >
                  {esPositivoVerde
                    ? `+₡${Number(totalMostrar).toLocaleString('en-US')}`
                    : `-₡${Number(totalMostrar).toLocaleString('en-US')}`}
                </span>
              </div>
            </div>
          )}

          {/* CASO 2 - Paso 2: Doble verificación con atraso y moratoria */}
          {isOverdue && confirmStep === 2 && (
            <div className="confirmation-prompt-box">
              <div
                className="prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: '#D6E7D6',
                  color: '#1B4D37',
                  borderColor: '#8FB89A',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <CheckCircle2 size={28} strokeWidth={2.2} />
              </div>
              <p className="prompt-text">
                ¿Confirmas que <strong className="client-highlight">{nombreCliente}</strong> pagó el total acumulado de <strong className="amount-highlight">{formatColones(deudaBaseTotal)}</strong>
                {montoMoratoriaReal > 0 && (
                  <> más <strong className="amount-highlight">{formatColones(montoMoratoriaReal)}</strong> de moratoria para un total de <strong className="amount-highlight">{formatColones(totalFinal)}</strong></>
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
              disabled={confirmPhase !== 'idle'}
              onClick={handleFinalConfirm}
              className="modal-btn-confirm"
            >
              <Check size={18} strokeWidth={2} className="inline-btn-icon" />
              <span>{confirmPhase !== 'idle' ? 'Pago confirmado' : 'Confirmar pago'}</span>
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

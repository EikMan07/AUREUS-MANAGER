import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, CheckCircle2, Minus, Plus } from 'lucide-react';
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
  const [periodosAPagarHoy, setPeriodosAPagarHoy] = useState(1);

  useEffect(() => {
    if (isOpen) {
      const initialAtrasos = Math.max(
        0,
        Number(client?.periodos_atrasados_acumulados ?? client?.periodosAtrasados ?? client?.atrasos ?? 0)
      );
      setConfirmPhase('idle');
      setConfirmStep(1);
      setMoratoriaInput('');
      setPeriodosAPagarHoy(initialAtrasos + 1);
    }
  }, [isOpen, client]);

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

  // 5. Selector de períodos a pagar hoy (por defecto atrasos + 1, o solo semana anterior)
  const totalPeriodos = atrasos + 1;
  const periodosSeleccionados = isOverdue
    ? Math.max(1, Math.min(totalPeriodos, Number(periodosAPagarHoy) || totalPeriodos))
    : 1;
  const montoBaseHoy = periodosSeleccionados * cuotaRegular;
  const semanasQueQuedanPendientes = isOverdue
    ? Math.max(0, totalPeriodos - periodosSeleccionados)
    : 0;

  const unidadSingularPlural = esQuincenal
    ? periodosSeleccionados === 1 ? 'quincena' : 'quincenas'
    : periodosSeleccionados === 1 ? 'semana' : 'semanas';

  const unidadRestante = esQuincenal
    ? semanasQueQuedanPendientes === 1 ? 'quincena' : 'quincenas'
    : semanasQueQuedanPendientes === 1 ? 'semana' : 'semanas';

  // Total base seleccionado para cobrar hoy
  const deudaBaseTotal = isOverdue ? montoBaseHoy : cuotaRegular;

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

  const montoBaseDescontar = isOverdue ? montoBaseHoy : cuotaRegular;
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
          montoBaseDescontar,
          isOverdue ? periodosSeleccionados : 1
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
                  backgroundColor: 'var(--aureus-green-light)',
                  color: 'var(--aureus-green-text)',
                  borderColor: 'var(--aureus-green-border)',
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

              {/* Selector rápido de qué está pagando el cliente hoy */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  border: '1px solid var(--aureus-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '12px'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: 'var(--aureus-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  QUÉ PAGA EL CLIENTE HOY
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPeriodosAPagarHoy(totalPeriodos)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border:
                        periodosSeleccionados === totalPeriodos
                          ? '1.5px solid #B69A55'
                          : '1px solid var(--aureus-border-subtle)',
                      backgroundColor:
                        periodosSeleccionados === totalPeriodos ? '#B69A55' : 'var(--aureus-bg-surface)',
                      color: periodosSeleccionados === totalPeriodos ? '#FFFFFF' : 'var(--aureus-text-primary)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Pagar todo al día
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodosAPagarHoy(1)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '10px',
                      border:
                        periodosSeleccionados < totalPeriodos
                          ? '1.5px solid #B69A55'
                          : '1px solid var(--aureus-border-subtle)',
                      backgroundColor:
                        periodosSeleccionados < totalPeriodos ? '#B69A55' : 'var(--aureus-bg-surface)',
                      color: periodosSeleccionados < totalPeriodos ? '#FFFFFF' : 'var(--aureus-text-primary)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {esQuincenal ? 'Solo quincena anterior' : 'Solo semana anterior'}
                  </button>
                </div>

                {totalPeriodos > 2 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: '1px solid var(--aureus-border-subtle)'
                    }}
                  >
                    <button
                      type="button"
                      disabled={periodosSeleccionados <= 1}
                      onClick={() => setPeriodosAPagarHoy((prev) => Math.max(1, Number(prev) - 1))}
                      aria-label="Restar una cuota"
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        border: '1px solid var(--aureus-border-subtle)',
                        backgroundColor: periodosSeleccionados <= 1 ? 'var(--aureus-bg-muted)' : 'var(--aureus-bg-surface)',
                        color: periodosSeleccionados <= 1 ? 'var(--aureus-text-muted)' : 'var(--aureus-text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: periodosSeleccionados <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Minus size={14} strokeWidth={2.4} />
                    </button>

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--aureus-text-primary)'
                      }}
                    >
                      Paga hoy: {periodosSeleccionados} de {totalPeriodos} {esQuincenal ? 'quincenas' : 'semanas'}
                    </span>

                    <button
                      type="button"
                      disabled={periodosSeleccionados >= totalPeriodos}
                      onClick={() => setPeriodosAPagarHoy((prev) => Math.min(totalPeriodos, Number(prev) + 1))}
                      aria-label="Sumar una cuota"
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        border: '1px solid var(--aureus-border-subtle)',
                        backgroundColor: periodosSeleccionados >= totalPeriodos ? 'var(--aureus-bg-muted)' : 'var(--aureus-bg-surface)',
                        color: periodosSeleccionados >= totalPeriodos ? 'var(--aureus-text-muted)' : 'var(--aureus-text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: periodosSeleccionados >= totalPeriodos ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Plus size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                )}

                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: semanasQueQuedanPendientes > 0 ? 'var(--aureus-gold-light)' : 'var(--aureus-green-light)',
                    border: `1px solid ${semanasQueQuedanPendientes > 0 ? 'var(--aureus-border-gold)' : 'var(--aureus-green-border)'}`,
                    color: semanasQueQuedanPendientes > 0 ? 'var(--aureus-gold-text)' : 'var(--aureus-green-text)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    lineHeight: 1.4
                  }}
                >
                  {semanasQueQuedanPendientes > 0
                    ? `Paga hoy ${periodosSeleccionados} ${unidadSingularPlural} por ₡${montoBaseHoy.toLocaleString('en-US')}. Quedará pendiente ${semanasQueQuedanPendientes} ${unidadRestante} acumulada para la próxima ${esQuincenal ? 'quincena' : 'semana'}.`
                    : `Cubre todas las cuotas pendientes más la de esta ${esQuincenal ? 'quincena' : 'semana'}. Quedará totalmente al día.`}
                </div>
              </div>

              {/* Recuadros superiores con desglose de atraso acumulado + cuota de hoy */}
              <div className="metrics-auto-grid">
                <div className="metric-item">
                  <span className="metric-label">{labelPeriodos}</span>
                  <strong className="metric-value red" style={{ color: 'var(--aureus-red-text)' }}>{valorPeriodos}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--aureus-red-text)', marginTop: '2px' }}>
                    Acumulado: {formatColones(montoAtrasoAcumulado)}
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">CUOTA DE HOY</span>
                  <strong className="metric-value" style={{ color: 'var(--aureus-text-primary)' }}>{formatColones(cuotaDeHoy)}</strong>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--aureus-text-muted)', marginTop: '2px' }}>
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
                  backgroundColor: esPositivoVerde ? 'var(--aureus-green-light)' : 'var(--aureus-red-light)',
                  border: `1.5px solid ${esPositivoVerde ? 'var(--aureus-green-border)' : 'var(--aureus-red-border)'}`,
                  transition: 'all 0.25s ease',
                  marginTop: '14px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: esPositivoVerde ? 'var(--aureus-green-text)' : 'var(--aureus-red-text)'
                    }}
                  >
                    Total que debe dar hoy:
                  </span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: esPositivoVerde ? 'var(--aureus-green-text)' : 'var(--aureus-red-text)'
                    }}
                  >
                    {esPositivoVerde
                      ? `Cubre los ₡${deudaBaseTotal.toLocaleString('en-US')} seleccionados más ₡${excedenteAdicional.toLocaleString('en-US')} adicionales`
                      : montoDigitado > 0
                      ? `El monto digitado de ₡${montoDigitado.toLocaleString('en-US')} no cubre ni supera los ₡${deudaBaseTotal.toLocaleString('en-US')} seleccionados`
                      : semanasQueQuedanPendientes > 0
                      ? `Abono de ${periodosSeleccionados} ${unidadSingularPlural} dejando ${semanasQueQuedanPendientes} ${unidadRestante} pendiente para la próxima ${esQuincenal ? 'quincena' : 'semana'}`
                      : `Suma de ${atrasos} ${atrasos === 1 ? (esQuincenal ? 'quincena sin pagar' : 'semana sin pagar') : (esQuincenal ? 'quincenas sin pagar' : 'semanas sin pagar')} más la cuota de hoy`}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    color: esPositivoVerde ? 'var(--aureus-green-text)' : 'var(--aureus-red-text)',
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
                  backgroundColor: 'var(--aureus-green-light)',
                  color: 'var(--aureus-green-text)',
                  borderColor: 'var(--aureus-green-border)',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <CheckCircle2 size={28} strokeWidth={2.2} />
              </div>
              <p className="prompt-text">
                ¿Confirmas que <strong className="client-highlight">{nombreCliente}</strong> pagó{' '}
                {semanasQueQuedanPendientes > 0
                  ? `el abono de ${periodosSeleccionados} ${unidadSingularPlural} por `
                  : 'el total acumulado de '}
                <strong className="amount-highlight">{formatColones(deudaBaseTotal)}</strong>
                {montoMoratoriaReal > 0 && (
                  <> más <strong className="amount-highlight">{formatColones(montoMoratoriaReal)}</strong> de moratoria para un total de <strong className="amount-highlight">{formatColones(totalFinal)}</strong></>
                )}?
              </p>
              <div className="return-day-notice">
                <span>Saldo actual: <strong>{formatColones(client.saldoRestante)}</strong> · Nuevo saldo: <strong>{formatColones(nuevoSaldoRestante)}</strong></span>
              </div>
              <div className="return-day-notice">
                {semanasQueQuedanPendientes > 0
                  ? `El cliente pasará a Cobros ya registrados hoy y conservará ${semanasQueQuedanPendientes} ${unidadRestante} pendiente para su próximo día fijo de cobro.`
                  : 'Se limpiará el atraso acumulado de este período y el cliente pasará a Cobros ya registrados.'}
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

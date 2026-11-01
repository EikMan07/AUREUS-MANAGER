import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  formatColones,
  formatAmountWithCommas,
  parseFormattedAmount
} from '../../utils/formatters';

const INITIAL_RENEW_ERRORS = {
  monto: false,
  interes: false,
  cuotas: false
};

export function RenewLoanModal({
  isOpen,
  loan,
  onClose,
  onConfirmRenew,
  onShowAlert
}) {
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [porcentajeInteres, setPorcentajeInteres] = useState('');
  const [totalPeriodos, setTotalPeriodos] = useState('');
  const [fieldErrors, setFieldErrors] = useState(INITIAL_RENEW_ERRORS);

  // Inicializar todos los campos editables en cero ('') al abrir o cambiar de préstamo
  useEffect(() => {
    setNuevoMonto('');
    setPorcentajeInteres('');
    setTotalPeriodos('');
    setFieldErrors(INITIAL_RENEW_ERRORS);
  }, [isOpen, loan]);

  const montoNum = parseFormattedAmount(nuevoMonto);
  const interesNum = parseFloat(porcentajeInteres) || 0;
  const periodosNum = parseInt(totalPeriodos, 10) || 0;

  const totalFinanciar = useMemo(() => {
    if (montoNum <= 0) return 0;
    return Math.round(montoNum * (1 + interesNum / 100));
  }, [montoNum, interesNum]);

  const cuotaCalculada = useMemo(() => {
    if (totalFinanciar <= 0 || periodosNum <= 0) return 0;
    return Math.round(totalFinanciar / periodosNum);
  }, [totalFinanciar, periodosNum]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const missingMonto = montoNum <= 0 || cuotaCalculada <= 0;
    const missingInteres = porcentajeInteres.trim() === '' || interesNum < 0;
    const missingCuotas = periodosNum <= 0;

    if (missingMonto || missingInteres || missingCuotas) {
      setFieldErrors({
        monto: montoNum <= 0,
        interes: missingInteres,
        cuotas: missingCuotas
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: 'No has completado los datos necesarios para renovar el préstamo.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
      return;
    }

    onConfirmRenew({
      prestamo_id: loan.id,
      cliente_nombre: [loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ').trim(),
      nuevo_monto_prestado: montoNum,
      porcentaje_interes: interesNum,
      total_periodos: periodosNum,
      nueva_cuota: cuotaCalculada
    });
  };

  if (!isOpen || !loan) return null;

  const clientFullName = [loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ').trim();
  const normalInputClasses = 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400';
  const redInputClasses = 'border border-red-500 bg-red-50/50 focus:border-red-600 ring-2 ring-red-500/15 form-input-error';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="renew-loan-title">
      <div className="modal-container renew-loan-modal-container">
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="renew-loan-title" className="modal-title">
              Renovar Préstamo
            </h3>
            <p className="modal-subtitle">
              {clientFullName}{loan.cliente_cedula ? ` · ${loan.cliente_cedula}` : ''}
            </p>
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

        {/* Formulario (sin banners rojos de texto; solo resaltado en los recuadros) */}
        <form onSubmit={handleSubmit} noValidate className="modal-body renew-loan-body">
          {/* Préstamo Anterior */}
          <div className="renew-previous-box">
            <span className="renew-previous-label">CONDICIONES ACTUALES</span>
            <div className="renew-previous-grid">
              <span>Monto: <strong>{formatColones(loan.monto_prestado)}</strong></span>
              <span>Cuota: <strong>{formatColones(loan.cuota)}</strong></span>
              <span>Saldo: <strong>{formatColones(loan.saldo_por_pagar)}</strong></span>
            </div>
          </div>

          {/* 1. Nuevo Monto Prestado */}
          <div className="form-field-group">
            <label className="form-field-label">
              NUEVO MONTO PRESTADO <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="currency-input-wrapper relative flex items-center w-full">
              <span className="currency-symbol-inside absolute left-4 text-slate-500 font-bold text-base pointer-events-none select-none">₡</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={nuevoMonto}
                onChange={(e) => {
                  setNuevoMonto(formatAmountWithCommas(e.target.value));
                  if (fieldErrors.monto) {
                    setFieldErrors((prev) => ({ ...prev, monto: false }));
                  }
                }}
                className={`currency-input-field no-spinners pl-9 pr-4 h-12 w-full rounded-xl text-slate-900 font-bold text-base focus:outline-none transition-colors ${
                  fieldErrors.monto ? redInputClasses : normalInputClasses
                }`}
              />
            </div>
          </div>

          {/* 2. Porcentaje de Interés y Cuotas */}
          <div className="form-grid-two-cols grid grid-cols-2 gap-3">
            <div className="form-field-group">
              <label className="form-field-label">
                PORCENTAJE DE INTERÉS <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={porcentajeInteres}
                onChange={(e) => {
                  setPorcentajeInteres(e.target.value.replace(/\D/g, '').slice(0, 3));
                  if (fieldErrors.interes) {
                    setFieldErrors((prev) => ({ ...prev, interes: false }));
                  }
                }}
                className={`form-input no-spinners w-full h-12 px-4 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors ${
                  fieldErrors.interes ? redInputClasses : normalInputClasses
                }`}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                CANTIDAD DE CUOTAS NUEVAS <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={totalPeriodos}
                onChange={(e) => {
                  setTotalPeriodos(e.target.value.replace(/\D/g, '').slice(0, 3));
                  if (fieldErrors.cuotas) {
                    setFieldErrors((prev) => ({ ...prev, cuotas: false }));
                  }
                }}
                className={`form-input no-spinners w-full h-12 px-4 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors ${
                  fieldErrors.cuotas ? redInputClasses : normalInputClasses
                }`}
              />
            </div>
          </div>

          {/* Bloque de Resumen Financiero (Total a Pagar y Cuota Automática de Solo Lectura) */}
          <div className="loan-calculation-summary-card bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="calc-summary-row">
              <span className="calc-label">TOTAL A PAGAR</span>
              <span className="calc-val-highlight text-lg font-extrabold text-slate-900">
                {formatColones(totalFinanciar)}
              </span>
            </div>
            <div className="calc-summary-divider border-t border-slate-200/80" />
            <div className="calc-summary-row">
              <span className="calc-label">
                {loan.modalidad === 'QUINCENAL' ? 'CUOTA QUINCENAL' : 'CUOTA SEMANAL'}
              </span>
              <span className="calc-cuota-readonly-pill bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl text-emerald-700 font-extrabold text-base">
                {formatColones(cuotaCalculada)}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="modal-actions-grid grid grid-cols-2 gap-3 pt-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-modal-cancel-full w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-modal-primary-full w-full h-12 rounded-xl bg-[#131629] hover:bg-slate-800 text-white font-semibold text-sm shadow-xs flex items-center justify-center transition-colors whitespace-nowrap cursor-pointer"
            >
              Renovar Préstamo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

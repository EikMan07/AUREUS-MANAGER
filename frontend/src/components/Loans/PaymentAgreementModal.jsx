import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, Calendar } from 'lucide-react';
import {
  formatColones,
  formatAmountWithCommas,
  parseFormattedAmount
} from '../../utils/formatters';

const DIA_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' }
];

const INITIAL_AGREEMENT_ERRORS = {
  cuota: false,
  diaCobro: false
};

export function PaymentAgreementModal({
  isOpen,
  loan,
  onClose,
  onConfirmAgreement,
  onShowAlert
}) {
  const [cuotaEspecial, setCuotaEspecial] = useState('');
  const [nuevoDiaSemanal, setNuevoDiaSemanal] = useState('');
  const [quincenalTipo, setQuincenalTipo] = useState('DIAS_MES'); // 'DIAS_MES' | 'CADA_2_SEMANAS'
  const [fieldErrors, setFieldErrors] = useState(INITIAL_AGREEMENT_ERRORS);

  // Inicializar en 0 ('') la cuota especial y en 'Ninguno' ('') el selector de día de cobro
  useEffect(() => {
    setCuotaEspecial('');
    setNuevoDiaSemanal('');
    setQuincenalTipo(loan && loan.modalidad === 'QUINCENAL' && loan.dia_fijo_original ? 'CADA_2_SEMANAS' : 'DIAS_MES');
    setFieldErrors(INITIAL_AGREEMENT_ERRORS);
  }, [isOpen, loan]);

  const montoFijoNum = useMemo(() => {
    if (!loan) return 0;
    return Math.round(Number(loan.saldo_por_pagar || loan.monto_total_financiar || 0));
  }, [loan]);

  const cuotaNum = parseFormattedAmount(cuotaEspecial);

  const cuotasEstimadas = useMemo(() => {
    if (montoFijoNum <= 0 || cuotaNum <= 0) return 0;
    return Math.ceil(montoFijoNum / cuotaNum);
  }, [montoFijoNum, cuotaNum]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const usaDiaSemana = loan.modalidad === 'SEMANAL' || (loan.modalidad === 'QUINCENAL' && quincenalTipo === 'CADA_2_SEMANAS');
    const missingCuota = cuotaNum <= 0 || montoFijoNum <= 0;
    const missingDia = usaDiaSemana && !nuevoDiaSemanal;

    if (missingCuota || missingDia) {
      setFieldErrors({
        cuota: cuotaNum <= 0,
        diaCobro: missingDia
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: 'No has completado los datos necesarios para registrar el arreglo de pago.',
          buttonText: 'Entendido',
          iconType: 'incomplete'
        });
      }
      return;
    }

    onConfirmAgreement({
      prestamo_id: loan.id,
      cliente_nombre: [loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ').trim(),
      monto_fijo_acordado: montoFijoNum,
      cuota_especial: cuotaNum,
      nuevo_dia_cobro: usaDiaSemana ? nuevoDiaSemanal : null,
      nuevo_dia_mes_1: !usaDiaSemana ? 15 : null,
      nuevo_dia_mes_2: !usaDiaSemana ? 31 : null
    });
  };

  if (!isOpen || !loan) return null;

  const clientFullName = [loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ').trim();
  const normalInputClasses = 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400';
  const redInputClasses = 'border border-red-500 bg-red-50/50 focus:border-red-600 ring-2 ring-red-500/15 form-input-error';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="agreement-title">
      <div className="modal-container agreement-modal-container">
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="agreement-title" className="modal-title">
              Arreglo de Pago
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

        {/* Formulario (sin banners rojos de texto; solo resaltado visual en los recuadros) */}
        <form onSubmit={handleSubmit} noValidate className="modal-body agreement-body">
          {/* 1. Tarjeta fija de solo lectura: MONTO FIJO ACORDADO */}
          <div className="agreement-fixed-amount-card bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between">
            <span className="agreement-fixed-label text-xs font-bold uppercase tracking-wider text-slate-500">
              MONTO FIJO ACORDADO
            </span>
            <span className="agreement-fixed-value text-lg font-extrabold text-slate-900">
              {formatColones(montoFijoNum)}
            </span>
          </div>

          {/* 2. Cuota Especial Acordada */}
          <div className="form-field-group">
            <label className="form-field-label">
              CUOTA ESPECIAL ACORDADA <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="currency-input-wrapper relative flex items-center w-full">
              <span className="currency-symbol-inside absolute left-4 text-slate-500 font-bold text-base pointer-events-none select-none">₡</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={cuotaEspecial}
                onChange={(e) => {
                  setCuotaEspecial(formatAmountWithCommas(e.target.value));
                  if (fieldErrors.cuota) {
                    setFieldErrors((prev) => ({ ...prev, cuota: false }));
                  }
                }}
                className={`currency-input-field no-spinners pl-9 pr-4 h-12 w-full rounded-xl text-slate-900 font-bold text-base focus:outline-none transition-colors ${
                  fieldErrors.cuota ? redInputClasses : normalInputClasses
                }`}
              />
            </div>
            {cuotaNum > 0 && cuotasEstimadas > 0 && (
              <span className="field-hint">
                Se programarán {cuotasEstimadas} {cuotasEstimadas === 1 ? 'cuota' : 'cuotas'} para cubrir el monto fijo acordado.
              </span>
            )}
          </div>

          {/* 3. Selector de Día de Cobro */}
          {loan.modalidad === 'SEMANAL' ? (
            <div className="form-field-group">
              <label className="form-field-label">
                NUEVO DÍA DE COBRO SEMANAL <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="select-field-wrapper relative w-full">
                <select
                  value={nuevoDiaSemanal}
                  onChange={(e) => {
                    setNuevoDiaSemanal(e.target.value);
                    if (fieldErrors.diaCobro) {
                      setFieldErrors((prev) => ({ ...prev, diaCobro: false }));
                    }
                  }}
                  className={`form-select-custom appearance-none w-full h-12 pl-4 pr-10 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors cursor-pointer ${
                    fieldErrors.diaCobro ? redInputClasses : normalInputClasses
                  }`}
                >
                  <option value="">Ninguno</option>
                  {DIA_SEMANA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2.2}
                  className="select-chevron-icon w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>
          ) : (
            <div className="quincenal-options-wrapper space-y-3">
              <div className="form-field-group">
                <label className="form-field-label">ESQUEMA QUINCENAL</label>
                <div className="segmented-control-two">
                  <button
                    type="button"
                    onClick={() => {
                      setQuincenalTipo('DIAS_MES');
                      setNuevoDiaSemanal('');
                      setFieldErrors((prev) => ({ ...prev, diaCobro: false }));
                    }}
                    className={`segment-btn ${quincenalTipo === 'DIAS_MES' ? 'active' : ''}`}
                  >
                    Día 15 y fin de mes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuincenalTipo('CADA_2_SEMANAS');
                      setNuevoDiaSemanal('');
                      setFieldErrors((prev) => ({ ...prev, diaCobro: false }));
                    }}
                    className={`segment-btn ${quincenalTipo === 'CADA_2_SEMANAS' ? 'active' : ''}`}
                  >
                    Cada 2 semanas
                  </button>
                </div>
              </div>

              {quincenalTipo === 'DIAS_MES' ? (
                <div className="quincenal-info-block bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                  <Calendar size={20} strokeWidth={2} className="quincenal-info-icon w-5 h-5 text-slate-700 shrink-0" />
                  <div className="quincenal-info-text">
                    <span className="quincenal-info-title">FECHAS DE COBRO QUINCENAL</span>
                    <p className="quincenal-info-desc text-xs text-slate-600">
                      Se cobrará automáticamente el día 15 y el último día de cada mes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="form-field-group">
                  <label className="form-field-label">
                    NUEVO DÍA CADA 2 SEMANAS <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="select-field-wrapper relative w-full">
                    <select
                      value={nuevoDiaSemanal}
                      onChange={(e) => {
                        setNuevoDiaSemanal(e.target.value);
                        if (fieldErrors.diaCobro) {
                          setFieldErrors((prev) => ({ ...prev, diaCobro: false }));
                        }
                      }}
                      className={`form-select-custom appearance-none w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:bg-white focus:border-slate-400 focus:outline-none transition-colors cursor-pointer ${
                        fieldErrors.diaCobro ? redInputClasses : ''
                      }`}
                    >
                      <option value="">Ninguno</option>
                      {DIA_SEMANA_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.2}
                      className="select-chevron-icon w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              className="btn-modal-primary-full"
            >
              Guardar Arreglo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

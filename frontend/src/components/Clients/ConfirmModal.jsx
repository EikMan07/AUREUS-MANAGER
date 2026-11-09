import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  ShieldAlert,
  Trash2,
  Banknote,
  RefreshCw,
  Handshake,
  CalendarCheck,
  CheckCircle2,
  CalendarClock,
  XCircle,
  ClipboardList,
  UserX
} from 'lucide-react';
import { ConfirmActionStage } from '../Modals/ConfirmActionStage';

export function ConfirmModal({
  isOpen,
  title,
  question,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  iconType = 'alert', // 'banknote' | 'renew' | 'agreement' | 'shield' | 'trash' | 'check' | 'calendar-clock' | 'x-circle' | 'user-x' | 'clipboard' | 'alert'
  clientName = '',
  subtitle = '',
  detailPill = '',
  stageVariant = null, // 'lista_negra' | 'eliminar_cliente' | 'eliminar_definitivo' | 'editar_cliente' | 'nuevo_prestamo' | null
  onCancel,
  onConfirm
}) {
  // Todos los Hooks al inicio del componente antes de cualquier return condicional
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState('idle');

  useEffect(() => {
    if (!isOpen) {
      setIsConfirming(false);
      setConfirmPhase('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedStageVariant =
    stageVariant ||
    (iconType === 'shield' || iconType === 'blacklist'
      ? 'lista_negra'
      : iconType === 'trash' || iconType === 'delete'
      ? 'eliminar_cliente'
      : null);

  const handleConfirmAction = () => {
    if (isConfirming || confirmPhase !== 'idle') return;

    if (resolvedStageVariant) {
      setConfirmPhase('animating');

      // Mantener visible 1200ms en fase activa
      setTimeout(() => {
        setConfirmPhase('exiting');
      }, 1200);

      // Ejecutar la acción y cerrar a los 1480ms tras completar la salida
      setTimeout(async () => {
        try {
          await onConfirm();
        } finally {
          setConfirmPhase('idle');
        }
      }, 1480);
      return;
    }

    setIsConfirming(true);
    setTimeout(async () => {
      try {
        await onConfirm();
      } finally {
        setIsConfirming(false);
      }
    }, 420);
  };

  // Renderizado exclusivo de la cápsula escénica (desmonta por completo el recuadro blanco del modal)
  if (confirmPhase !== 'idle' && resolvedStageVariant) {
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
          variant={resolvedStageVariant}
          phase={confirmPhase}
          clientName={clientName || subtitle}
          subtitle={subtitle || clientName}
          detailPill={detailPill}
        />
      </div>
    );
  }

  const getAnimationClass = () => {
    if (!isConfirming) return '';
    switch (iconType) {
      case 'shield':
      case 'blacklist':
        return 'cf-anim-shield-seal';
      case 'trash':
      case 'delete':
        return 'cf-anim-trash-drop';
      case 'check':
      case 'payment':
      case 'banknote':
      case 'loan':
        return 'cf-anim-check-pop';
      case 'calendar-clock':
      case 'calendar-check':
        return 'cf-anim-clock-turn';
      default:
        return 'cf-anim-alert-shake';
    }
  };

  const animClass = getAnimationClass();

  // Configuración semántica contextual de icono y colores del círculo
  const getIconConfig = () => {
    switch (iconType) {
      case 'banknote':
      case 'loan':
        return {
          icon: <Banknote size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
          containerStyle: {
            backgroundColor: '#ecfdf5',
            color: '#059669',
            borderColor: 'rgba(167, 243, 208, 0.8)'
          }
        };

      case 'renew':
      case 'refresh':
        return {
          icon: <RefreshCw size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-blue-50 text-blue-600 border border-blue-200/80',
          containerStyle: {
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            borderColor: 'rgba(191, 219, 254, 0.8)'
          }
        };

      case 'agreement':
      case 'handshake':
        return {
          icon: <Handshake size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
          containerStyle: {
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            borderColor: 'rgba(199, 210, 254, 0.8)'
          }
        };

      case 'calendar-check':
        return {
          icon: <CalendarCheck size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
          containerStyle: {
            backgroundColor: '#eef2ff',
            color: '#4f46e5',
            borderColor: 'rgba(199, 210, 254, 0.8)'
          }
        };

      case 'shield':
      case 'blacklist':
        return {
          icon: <ShieldAlert size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
          containerStyle: {
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderColor: 'rgba(254, 202, 202, 0.8)'
          }
        };

      case 'trash':
      case 'delete':
        return {
          icon: <Trash2 size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
          containerStyle: {
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderColor: 'rgba(254, 202, 202, 0.8)'
          }
        };

      case 'check':
      case 'payment':
        return {
          icon: <CheckCircle2 size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
          containerStyle: {
            backgroundColor: '#ecfdf5',
            color: '#059669',
            borderColor: 'rgba(167, 243, 208, 0.8)'
          }
        };

      case 'calendar-clock':
      case 'pass':
        return {
          icon: <CalendarClock size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
          containerStyle: {
            backgroundColor: '#fffbeb',
            color: '#d97706',
            borderColor: 'rgba(253, 230, 138, 0.8)'
          }
        };

      case 'x-circle':
      case 'no-pay':
        return {
          icon: <XCircle size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
          containerStyle: {
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderColor: 'rgba(254, 202, 202, 0.8)'
          }
        };

      case 'user-x':
      case 'duplicate':
        return {
          icon: <UserX size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
          containerStyle: {
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderColor: 'rgba(254, 202, 202, 0.8)'
          }
        };

      case 'clipboard':
      case 'incomplete':
        return {
          icon: <ClipboardList size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
          containerStyle: {
            backgroundColor: '#fffbeb',
            color: '#d97706',
            borderColor: 'rgba(253, 230, 138, 0.8)'
          }
        };

      default:
        return {
          icon: <AlertCircle size={28} strokeWidth={2} className="shrink-0" />,
          containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
          containerStyle: {
            backgroundColor: '#fffbeb',
            color: '#d97706',
            borderColor: 'rgba(253, 230, 138, 0.8)'
          }
        };
    }
  };

  const { icon, containerClass, containerStyle } = getIconConfig();

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-container confirm-modal-compact">
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="confirm-modal-title" className="modal-title">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Cuerpo con icono semántico y pregunta */}
        <div className="modal-body">
          <div className="confirmation-prompt-box">
            <div
              className={`prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center ${containerClass} ${animClass}`}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: '1px',
                borderStyle: 'solid',
                ...containerStyle
              }}
            >
              <span className={animClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
              </span>
            </div>
            <p className="prompt-text">
              {question}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="modal-actions">
          <button
            type="button"
            disabled={isConfirming || confirmPhase !== 'idle'}
            onClick={onCancel}
            className="modal-btn-cancel"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isConfirming || confirmPhase !== 'idle'}
            onClick={handleConfirmAction}
            className={
              confirmVariant === 'danger'
                ? 'modal-btn-danger'
                : confirmVariant === 'primary'
                ? 'modal-btn-dark-primary'
                : 'modal-btn-confirm'
            }
          >
            {isConfirming || confirmPhase !== 'idle' ? 'Confirmando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

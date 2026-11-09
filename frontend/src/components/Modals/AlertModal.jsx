import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ShieldAlert,
  ClipboardList,
  UserX,
  Banknote,
  RefreshCw,
  Handshake,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';

/**
 * Modal de Alerta / Aviso Ejecutivo de Cobro-Firme
 * Reemplazo 100% formal para window.alert() del navegador.
 *
 * Cada acción cuenta con su propio icono semántico contextual y círculo de color:
 * - 'clipboard' / 'incomplete': ClipboardList en ámbar (bg-amber-50 text-amber-600 border border-amber-200/80)
 * - 'user-x' / 'duplicate': UserX en rojo (bg-red-50 text-red-600 border border-red-200/80)
 * - 'shield' / 'blacklist': ShieldAlert en rojo (bg-red-50 text-red-600 border border-red-200/80)
 * - 'trash': Trash2 en rojo (bg-red-50 text-red-600 border border-red-200/80)
 * - 'banknote' / 'loan': Banknote en verde esmeralda (bg-emerald-50 text-emerald-600 border border-emerald-200/80)
 * - 'renew' / 'refresh': RefreshCw en azul (bg-blue-50 text-blue-600 border border-blue-200/80)
 * - 'agreement' / 'handshake': Handshake en índigo (bg-indigo-50 text-indigo-600 border border-indigo-200/80)
 * - 'success' / 'check': CheckCircle2 en verde esmeralda (bg-emerald-50 text-emerald-600 border border-emerald-200/80)
 * - 'alert' / default: Alerta ejecutiva ámbar o roja según gravedad
 */
export function AlertModal({
  isOpen,
  title = 'Aviso',
  message = '',
  buttonText = 'Entendido',
  iconType = 'alert',
  onClose
}) {
  const buttonRef = useRef(null);

  // Foco automático en el botón de confirmación y atajo de tecla Escape
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        buttonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Detección inteligente de tipo de icono y estilo según iconType o título
  const getIconConfig = () => {
    const lowerTitle = (title || '').toLowerCase();

    // 1. Prioridad por iconType explícito
    if (iconType === 'clipboard' || iconType === 'incomplete') {
      return {
        icon: <ClipboardList size={28} strokeWidth={2} />,
        containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
        containerStyle: { backgroundColor: '#fffbeb', color: '#d97706', borderColor: 'rgba(253, 230, 138, 0.8)' }
      };
    }

    if (iconType === 'user-x' || iconType === 'duplicate') {
      return {
        icon: <UserX size={28} strokeWidth={2} />,
        containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
        containerStyle: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: 'rgba(254, 202, 202, 0.8)' }
      };
    }

    if (iconType === 'shield' || iconType === 'blacklist') {
      return {
        icon: <ShieldAlert size={28} strokeWidth={2} />,
        containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
        containerStyle: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: 'rgba(254, 202, 202, 0.8)' }
      };
    }

    if (iconType === 'trash' || iconType === 'delete') {
      return {
        icon: <Trash2 size={28} strokeWidth={2} />,
        containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
        containerStyle: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: 'rgba(254, 202, 202, 0.8)' }
      };
    }

    if (iconType === 'banknote' || iconType === 'loan') {
      return {
        icon: <Banknote size={28} strokeWidth={2} />,
        containerClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
        containerStyle: { backgroundColor: '#ecfdf5', color: '#059669', borderColor: 'rgba(167, 243, 208, 0.8)' }
      };
    }

    if (iconType === 'renew' || iconType === 'refresh') {
      return {
        icon: <RefreshCw size={28} strokeWidth={2} />,
        containerClass: 'bg-blue-50 text-blue-600 border border-blue-200/80',
        containerStyle: { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: 'rgba(191, 219, 254, 0.8)' }
      };
    }

    if (iconType === 'agreement' || iconType === 'handshake') {
      return {
        icon: <Handshake size={28} strokeWidth={2} />,
        containerClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
        containerStyle: { backgroundColor: '#eef2ff', color: '#4f46e5', borderColor: 'rgba(199, 210, 254, 0.8)' }
      };
    }

    if (iconType === 'check' || iconType === 'success') {
      return {
        icon: <CheckCircle2 size={28} strokeWidth={2} />,
        containerClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
        containerStyle: { backgroundColor: '#ecfdf5', color: '#059669', borderColor: 'rgba(167, 243, 208, 0.8)' }
      };
    }

    // 2. Detección automática por semántica de título en caso de fallback 'alert'
    if (lowerTitle.includes('duplicad') || lowerTitle.includes('cédula ya') || lowerTitle.includes('teléfono ya')) {
      return {
        icon: <UserX size={28} strokeWidth={2} />,
        containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
        containerStyle: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: 'rgba(254, 202, 202, 0.8)' }
      };
    }

    if (lowerTitle.includes('incomplet') || lowerTitle.includes('obligator') || lowerTitle.includes('faltan') || lowerTitle.includes('datos')) {
      return {
        icon: <ClipboardList size={28} strokeWidth={2} />,
        containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
        containerStyle: { backgroundColor: '#fffbeb', color: '#d97706', borderColor: 'rgba(253, 230, 138, 0.8)' }
      };
    }

    if (lowerTitle.includes('error') || lowerTitle.includes('falló') || lowerTitle.includes('no se pudo')) {
      return {
        icon: <AlertCircle size={28} strokeWidth={2} />,
        containerClass: 'bg-red-50 text-red-600 border border-red-200/80',
        containerStyle: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: 'rgba(254, 202, 202, 0.8)' }
      };
    }

    if (lowerTitle.includes('guardado') || lowerTitle.includes('éxito') || lowerTitle.includes('correcto')) {
      return {
        icon: <CheckCircle2 size={28} strokeWidth={2} />,
        containerClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
        containerStyle: { backgroundColor: '#ecfdf5', color: '#059669', borderColor: 'rgba(167, 243, 208, 0.8)' }
      };
    }

    // Fallback general formal
    return {
      icon: <AlertCircle size={28} strokeWidth={2} />,
      containerClass: 'bg-amber-50 text-amber-600 border border-amber-200/80',
      containerStyle: { backgroundColor: '#fffbeb', color: '#d97706', borderColor: 'rgba(253, 230, 138, 0.8)' }
    };
  };

  const { icon, containerClass, containerStyle } = getIconConfig();

  return (
    <div
      className="modal-overlay alert-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      aria-describedby="alert-modal-desc"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(11, 15, 25, 0.72)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="alert-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '384px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px 20px 20px 20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          overflow: 'hidden',
          zIndex: 100000,
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón discreto de cerrar en esquina superior */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="alert-modal-close-x"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 100001,
            padding: 0,
          }}
          aria-label="Cerrar aviso"
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Icono vectorial semántico en contenedor circular estilizado */}
        <div
          className={`alert-icon-circle w-12 h-12 rounded-full flex items-center justify-center ${containerClass}`}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: '1px',
            borderStyle: 'solid',
            margin: '0 auto 16px auto',
            ...containerStyle,
          }}
        >
          {icon}
        </div>

        {/* Título claro en negrita */}
        <h3 id="alert-modal-title" className="alert-modal-title">
          {title}
        </h3>

        {/* Mensaje limpio */}
        {message && (
          <p id="alert-modal-desc" className="alert-modal-message">
            {message}
          </p>
        )}

        {/* Botón de acción sólido Verde Dólar Ejecutivo */}
        <button
          ref={buttonRef}
          type="button"
          onClick={onClose}
          className="alert-modal-btn"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

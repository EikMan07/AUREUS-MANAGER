import React, { useEffect, useRef } from 'react';
import { sanitizeUserFacingMessage } from '../../services/apiClient';
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
 * Modal de Alerta / Aviso Ejecutivo de Aureus Manager
 * Reemplazo 100% formal para window.alert() del navegador.
 *
 * Cada acción cuenta con su propio icono semántico contextual y círculo de color:
 * - 'clipboard' / 'incomplete': ClipboardList en dorado Aureus (#F7F2E4 / #9E8342)
 * - 'user-x' / 'duplicate': UserX en rojo alerta (#FCEEE9 / #C65D58)
 * - 'shield' / 'blacklist': ShieldAlert en rojo alerta (#FCEEE9 / #C65D58)
 * - 'trash': Trash2 en rojo alerta (#FCEEE9 / #C65D58)
 * - 'banknote' / 'loan': Banknote en verde financiero (#E6F2EE / #397D67)
 * - 'renew' / 'refresh': RefreshCw en dorado Aureus (#F7F2E4 / #B69A55)
 * - 'agreement' / 'handshake': Handshake en dorado Aureus (#F7F2E4 / #B69A55)
 * - 'success' / 'check': CheckCircle2 en verde financiero (#E6F2EE / #397D67)
 * - 'alert' / default: Alerta ejecutiva en dorado Aureus o rojo alerta según gravedad
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
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-gold-light)', color: 'var(--aureus-gold-text)', borderColor: 'var(--aureus-border-gold)' }
      };
    }

    if (iconType === 'user-x' || iconType === 'duplicate') {
      return {
        icon: <UserX size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-red-light)', color: 'var(--aureus-red-text)', borderColor: 'var(--aureus-red-border)' }
      };
    }

    if (iconType === 'shield' || iconType === 'blacklist') {
      return {
        icon: <ShieldAlert size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-red-light)', color: 'var(--aureus-red-text)', borderColor: 'var(--aureus-red-border)' }
      };
    }

    if (iconType === 'trash' || iconType === 'delete') {
      return {
        icon: <Trash2 size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-red-light)', color: 'var(--aureus-red-text)', borderColor: 'var(--aureus-red-border)' }
      };
    }

    if (iconType === 'banknote' || iconType === 'loan') {
      return {
        icon: <Banknote size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-green-light)', color: 'var(--aureus-green-text)', borderColor: 'var(--aureus-green-border)' }
      };
    }

    if (iconType === 'renew' || iconType === 'refresh') {
      return {
        icon: <RefreshCw size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-gold-light)', color: 'var(--aureus-gold-text)', borderColor: 'var(--aureus-border-gold)' }
      };
    }

    if (iconType === 'agreement' || iconType === 'handshake') {
      return {
        icon: <Handshake size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-gold-light)', color: 'var(--aureus-gold-text)', borderColor: 'var(--aureus-border-gold)' }
      };
    }

    if (iconType === 'check' || iconType === 'success') {
      return {
        icon: <CheckCircle2 size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-green-light)', color: 'var(--aureus-green-text)', borderColor: 'var(--aureus-green-border)' }
      };
    }

    // 2. Detección automática por semántica de título en caso de fallback 'alert'
    if (lowerTitle.includes('duplicad') || lowerTitle.includes('cédula ya') || lowerTitle.includes('teléfono ya')) {
      return {
        icon: <UserX size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-red-light)', color: 'var(--aureus-red-text)', borderColor: 'var(--aureus-red-border)' }
      };
    }

    if (lowerTitle.includes('incomplet') || lowerTitle.includes('obligator') || lowerTitle.includes('faltan') || lowerTitle.includes('datos')) {
      return {
        icon: <ClipboardList size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-gold-light)', color: 'var(--aureus-gold-text)', borderColor: 'var(--aureus-border-gold)' }
      };
    }

    if (lowerTitle.includes('error') || lowerTitle.includes('falló') || lowerTitle.includes('no se pudo')) {
      return {
        icon: <AlertCircle size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-red-light)', color: 'var(--aureus-red-text)', borderColor: 'var(--aureus-red-border)' }
      };
    }

    if (lowerTitle.includes('guardado') || lowerTitle.includes('éxito') || lowerTitle.includes('correcto')) {
      return {
        icon: <CheckCircle2 size={28} strokeWidth={2} />,
        containerClass: '',
        containerStyle: { backgroundColor: 'var(--aureus-green-light)', color: 'var(--aureus-green-text)', borderColor: 'var(--aureus-green-border)' }
      };
    }

    // Fallback general formal
    return {
      icon: <AlertCircle size={28} strokeWidth={2} />,
      containerClass: '',
      containerStyle: { backgroundColor: 'var(--aureus-gold-light)', color: 'var(--aureus-gold-text)', borderColor: 'var(--aureus-border-gold)' }
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
          backgroundColor: 'var(--aureus-bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--aureus-border-subtle)',
          padding: '24px 20px 20px 20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.12)',
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
            color: 'var(--aureus-text-muted)',
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
          {sanitizeUserFacingMessage(title, 'Aviso')}
        </h3>

        {/* Mensaje limpio */}
        {message && (
          <p id="alert-modal-desc" className="alert-modal-message">
            {sanitizeUserFacingMessage(message)}
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

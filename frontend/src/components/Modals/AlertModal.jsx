import React, { useEffect, useRef } from 'react';
import { AlertCircle, ShieldAlert, X } from 'lucide-react';

/**
 * Modal de Alerta / Aviso Ejecutivo de Cobro-Firme
 * Reemplazo 100% formal para window.alert() del navegador.
 *
 * Diseño:
 * - Tarjeta blanca con bordes redondeados y sombra ejecutiva
 * - Icono vectorial AlertCircle o ShieldAlert en contenedor circular rojo suave (bg-red-50 text-red-600)
 * - Título claro en negrita
 * - Mensaje explicativo limpio (text-sm text-slate-600)
 * - Botón de confirmación sólido oscuro (#131629)
 */
export function AlertModal({
  isOpen,
  title = 'Aviso',
  message = '',
  buttonText = 'Entendido',
  iconType = 'alert', // 'alert' | 'shield'
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

  return (
    <div
      className="modal-overlay alert-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
      aria-describedby="alert-modal-desc"
      onClick={onClose}
    >
      <div
        className="alert-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón discreto de cerrar en esquina superior */}
        <button
          type="button"
          onClick={onClose}
          className="alert-modal-close-x"
          aria-label="Cerrar aviso"
        >
          <X size={18} strokeWidth={2} />
        </button>

        {/* Icono vectorial en contenedor circular rojo suave */}
        <div className="alert-icon-circle danger">
          {iconType === 'shield' ? (
            <ShieldAlert size={28} strokeWidth={2.2} />
          ) : (
            <AlertCircle size={28} strokeWidth={2.2} />
          )}
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

        {/* Botón de acción sólido oscuro (#131629) */}
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

import React from 'react';
import { X, AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';

export function ConfirmModal({
  isOpen,
  title,
  question,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  iconType = 'alert', // 'alert' | 'shield' | 'trash'
  onCancel,
  onConfirm
}) {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'shield':
        return <ShieldAlert size={28} strokeWidth={1.75} className="prompt-icon red" />;
      case 'trash':
        return <Trash2 size={28} strokeWidth={1.75} className="prompt-icon red" />;
      default:
        return <AlertTriangle size={28} strokeWidth={1.75} className="prompt-icon red" />;
    }
  };

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

        {/* Cuerpo con icono y pregunta */}
        <div className="modal-body">
          <div className="confirmation-prompt-box">
            <div className="prompt-icon-wrapper red">
              {renderIcon()}
            </div>
            <p className="prompt-text">
              {question}
            </p>
          </div>
        </div>

        {/* Acciones: Dos botones con nombres únicos directos */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={onCancel}
            className="modal-btn-cancel"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={
              confirmVariant === 'danger'
                ? 'modal-btn-danger'
                : confirmVariant === 'primary'
                ? 'modal-btn-dark-primary'
                : 'modal-btn-confirm'
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

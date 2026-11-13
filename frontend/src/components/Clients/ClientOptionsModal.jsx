import React from 'react';
import { X, Pencil, ShieldAlert, Trash2 } from 'lucide-react';
import { formatCedulaCR, formatFullName } from '../../utils/formatters';

export function ClientOptionsModal({
  isOpen,
  client,
  onClose,
  onEditClick,
  onBlacklistClick,
  onDeleteClick
}) {
  if (!isOpen || !client) return null;

  const fullName = formatFullName(client?.nombre, client?.apellidos);
  const rawCedula = (client?.cedula || '').toString().trim();
  const formattedCedula = rawCedula ? (formatCedulaCR(rawCedula) || rawCedula) : 'Sin cédula';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="client-options-title">
      <div className="modal-container client-options-modal">
        {/* Encabezado: Nombre del cliente en negrita y cédula debajo */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="client-options-title" className="modal-title font-bold text-slate-900">
              {fullName}
            </h3>
            <p className="modal-subtitle text-slate-500">
              {formattedCedula}
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

        {/* Botones de Acción */}
        <div className="modal-body client-options-body">
          {/* 1. Botón "Editar cliente" */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditClick(client);
            }}
            className="client-option-btn btn-option-edit"
          >
            <Pencil size={18} strokeWidth={1.75} className="option-icon" style={{ color: '#B69A55' }} />
            <span style={{ color: 'var(--aureus-text-primary)', fontWeight: 700 }}>Editar cliente</span>
          </button>

          {/* 2. Botón "Enviar a Lista Negra" */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onBlacklistClick(client);
            }}
            className="client-option-btn btn-option-blacklist"
          >
            <ShieldAlert size={18} strokeWidth={1.75} className="option-icon" style={{ color: 'var(--aureus-text-secondary)' }} />
            <span style={{ color: 'var(--aureus-text-primary)', fontWeight: 700 }}>Enviar a Lista Negra</span>
          </button>

          {/* 3. Botón "Eliminar cliente" */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onDeleteClick(client);
            }}
            className="client-option-btn btn-option-delete"
          >
            <Trash2 size={18} strokeWidth={1.75} className="option-icon" style={{ color: 'var(--aureus-red-text)' }} />
            <span style={{ color: 'var(--aureus-red-text)', fontWeight: 700 }}>Eliminar cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
}

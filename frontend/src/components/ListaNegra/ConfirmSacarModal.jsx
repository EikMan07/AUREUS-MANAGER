import React from 'react';
import { UserCheck, X } from 'lucide-react';
import { formatCedulaCR } from '../../utils/formatters.js';

export function ConfirmSacarModal({ isOpen, onClose, onConfirm, persona, isLoading = false }) {
  const [isConfirming, setIsConfirming] = React.useState(false);

  if (!isOpen || !persona) return null;

  const nombreCompleto = `${persona.nombre || ''} ${persona.apellidos || ''}`.trim() || 'esta persona';
  const cedulaTexto = persona.cedula ? formatCedulaCR(persona.cedula) : 'Sin cédula';

  const handleConfirmAction = () => {
    if (isConfirming || isLoading) return;
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      onConfirm(persona);
    }, 420);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: 'var(--modal-max-width, 400px)',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            border: 'none',
            outline: 'none',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Cerrar modal"
        >
          <X size={16} strokeWidth={2.4} />
        </button>

        {/* Icono temático */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <div
            className={isConfirming ? 'cf-anim-check-pop' : ''}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              backgroundColor: '#D6E7D6',
              border: '1.5px solid #8FB89A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0A3323',
            }}
          >
            <UserCheck size={28} strokeWidth={2.2} className={isConfirming ? 'cf-anim-check-pop' : ''} />
          </div>
        </div>

        {/* Textos */}
        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              lineHeight: 1.25,
            }}
          >
            Retirar de Lista Negra
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#475569',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            ¿Deseas retirar a <strong style={{ color: '#0f172a' }}>{nombreCompleto}</strong> de la Lista Negra?
          </p>
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            Identificación: <strong style={{ color: '#0f172a' }}>{cedulaTexto}</strong>
            <div style={{ marginTop: '4px', color: '#047857', fontWeight: 600 }}>
              Será restaurado automáticamente al directorio de Clientes registrados.
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isLoading ? 'default' : 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={isLoading || isConfirming}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #1B4D37',
              outline: 'none',
              backgroundColor: '#0A3323',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: (isLoading || isConfirming) ? 'default' : 'pointer',
              boxShadow: '0 2px 6px rgba(10, 51, 35, 0.18)',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            {isConfirming ? 'Retirado' : isLoading ? 'Retirando...' : 'Sí, Retirar'}
          </button>
        </div>
      </div>
    </div>
  );
}


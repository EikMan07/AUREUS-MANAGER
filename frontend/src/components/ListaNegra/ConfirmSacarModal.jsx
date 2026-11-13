import React, { useState, useEffect } from 'react';
import { UserCheck, X } from 'lucide-react';
import { formatCedulaCR, formatFullName } from '../../utils/formatters.js';
import { ConfirmActionStage } from '../Modals/ConfirmActionStage.jsx';

export function ConfirmSacarModal({ isOpen, onClose, onConfirm, persona, isLoading = false }) {
  // Todos los Hooks al inicio antes de cualquier return condicional
  const [confirmPhase, setConfirmPhase] = useState('idle'); // 'idle' | 'animating' | 'exiting'

  useEffect(() => {
    if (!isOpen) {
      setConfirmPhase('idle');
    }
  }, [isOpen]);

  if (!isOpen || !persona) return null;

  const nombreCompletoLimpio = formatFullName(persona.nombre, persona.apellidos) || 'Cliente';
  const cedulaTexto = persona.cedula ? formatCedulaCR(persona.cedula) : 'Sin cédula';

  const handleConfirmAction = () => {
    if (confirmPhase !== 'idle' || isLoading) return;
    setConfirmPhase('animating');

    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    setTimeout(async () => {
      try {
        await onConfirm(persona);
      } finally {
        setConfirmPhase('idle');
      }
    }, 1480);
  };

  // Renderizado exclusivo de la cápsula escénica (desmonta al 100 % el modal blanco)
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
          variant="retirar_lista_negra"
          phase={confirmPhase}
          clientName={nombreCompletoLimpio}
          subtitle={nombreCompletoLimpio}
        />
      </div>
    );
  }

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
          backgroundColor: 'var(--aureus-bg-surface)',
          border: '1px solid var(--aureus-border-subtle)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: 'var(--modal-max-width, 400px)',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
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
            border: '1px solid var(--aureus-border-subtle)',
            outline: 'none',
            backgroundColor: 'var(--aureus-bg-elevated)',
            color: 'var(--aureus-text-muted)',
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
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              backgroundColor: 'var(--aureus-green-light)',
              border: '1.5px solid var(--aureus-green-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aureus-green-text)',
            }}
          >
            <UserCheck size={28} strokeWidth={2.2} />
          </div>
        </div>

        {/* Textos */}
        <div style={{ textAlign: 'center' }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--aureus-text-primary)',
              margin: '0 0 6px 0',
              lineHeight: 1.25,
            }}
          >
            Retirar de Lista Negra
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--aureus-text-secondary)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            ¿Deseas retirar a <strong style={{ color: 'var(--aureus-text-primary)' }}>{nombreCompletoLimpio}</strong> de la Lista Negra?
          </p>
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              backgroundColor: 'var(--aureus-bg-elevated)',
              borderRadius: '10px',
              border: '1px solid var(--aureus-border-subtle)',
              fontSize: '12px',
              color: 'var(--aureus-text-muted)',
            }}
          >
            Identificación: <strong style={{ color: 'var(--aureus-text-primary)' }}>{cedulaTexto}</strong>
            <div style={{ marginTop: '4px', color: 'var(--aureus-green-text)', fontWeight: 600 }}>
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
            disabled={isLoading || confirmPhase !== 'idle'}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--aureus-border-subtle)',
              outline: 'none',
              backgroundColor: 'var(--aureus-bg-elevated)',
              color: 'var(--aureus-text-primary)',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: (isLoading || confirmPhase !== 'idle') ? 'default' : 'pointer',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmAction}
            disabled={isLoading || confirmPhase !== 'idle'}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #2D6654',
              outline: 'none',
              backgroundColor: '#397D67',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: (isLoading || confirmPhase !== 'idle') ? 'default' : 'pointer',
              boxShadow: '0 2px 6px rgba(10, 51, 35, 0.18)',
              textAlign: 'center',
              fontFamily: 'inherit',
            }}
          >
            {isLoading ? 'Retirando...' : 'Sí, Retirar'}
          </button>
        </div>
      </div>
    </div>
  );
}


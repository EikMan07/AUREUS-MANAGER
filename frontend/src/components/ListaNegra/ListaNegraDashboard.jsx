import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCw,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { dbService } from '../../services/db.js';
import { ConsultaCedulaCard } from './ConsultaCedulaCard.jsx';
import { ListaNegraCards } from './ListaNegraCards.jsx';
import { NuevoRegistroModal } from './NuevoRegistroModal.jsx';
import { ConfirmSacarModal } from './ConfirmSacarModal.jsx';

export function ListaNegraDashboard({ onShowAlert, onClientRestored }) {
  const [personas, setPersonas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSacando, setIsSacando] = useState(false);

  // Estados para modales
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false);
  const [prefillData, setPrefillData] = useState({ cedula: '', nombre: '', apellidos: '' });
  const [personaParaSacar, setPersonaParaSacar] = useState(null);

  // Cargar personas activas en Lista Negra desde el backend
  const loadPersonas = useCallback(async () => {
    try {
      const data = await dbService.getListaNegra();
      setPersonas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar lista negra:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error de carga',
          message: 'No se pudo obtener la información de la Lista Negra.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [onShowAlert]);

  useEffect(() => {
    setIsLoading(true);
    loadPersonas();
  }, [loadPersonas]);

  // Manejar refresco manual
  const handleRefresh = async () => {
    setIsLoading(true);
    await loadPersonas();
  };

  // Abrir modal de nuevo registro con datos opcionales
  const handleOpenNuevoRegistro = (datos = {}) => {
    setPrefillData({
      cedula: datos.cedula || '',
      nombre: datos.nombre || '',
      apellidos: datos.apellidos || ''
    });
    setIsNuevoModalOpen(true);
  };

  // Guardar nuevo registro en Lista Negra
  const handleSaveNuevo = async (formData) => {
    const res = await dbService.agregarListaNegra(formData);
    await loadPersonas();

    if (onClientRestored) {
      onClientRestored();
    }

    return res;
  };

  // Abrir confirmación para sacar a una persona
  const handleOpenSacar = (persona) => {
    setPersonaParaSacar(persona);
  };

  // Confirmar y retirar de Lista Negra
  const handleConfirmSacar = async (persona) => {
    setIsSacando(true);
    try {
      await dbService.sacarListaNegra(persona.id);
      setPersonaParaSacar(null);
      await loadPersonas();

      // Notificar al App para recargar clientes y cobros
      if (onClientRestored) {
        onClientRestored();
      }

      if (onShowAlert) {
        onShowAlert({
          title: 'Retiro exitoso',
          message: `${persona.nombre} fue retirado de la Lista Negra y restaurado al directorio de Clientes.`,
          buttonText: 'Aceptar',
          iconType: 'success'
        });
      }
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al retirar de Lista Negra:', err.debugError || err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al retirar',
          message: err.userMessage || 'No se pudo retirar a la persona de la Lista Negra en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsSacando(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        padding: '16px',
        paddingBottom: '96px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {/* 1. Cabecera Principal del Módulo 5 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Lista Negra
          </h2>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#64748b',
              marginTop: '4px',
            }}
          >
            Control de morosidad y restricciones
          </span>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#64748b',
              fontWeight: 500,
              maxWidth: '680px',
            }}
          >
            Espacio para registrar y consultar a personas que no son buenas pagadoras o han incumplido con sus pagos, evitando otorgarles nuevos préstamos.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Botón Refrescar */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: isLoading ? 'default' : 'pointer',
              flexShrink: 0,
              padding: 0,
              outline: 'none',
            }}
            title="Actualizar datos"
            aria-label="Actualizar Lista Negra"
          >
            <RotateCw
              size={18}
              strokeWidth={2}
              style={{
                color: isLoading ? '#dc2626' : '#475569',
                transition: 'transform 0.3s ease',
              }}
              className={isLoading ? 'animate-spin' : ''}
            />
          </button>

          {/* Botón Registrar Nuevo en Lista Negra */}
          <button
            type="button"
            onClick={() => handleOpenNuevoRegistro()}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '12px',
              backgroundColor: '#dc2626',
              border: 'none',
              outline: 'none',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'inherit',
            }}
            title="Registrar persona en Lista Negra"
          >
            <Plus size={16} strokeWidth={2.4} />
            <span style={{ fontFamily: 'inherit' }}>Registrar</span>
          </button>
        </div>
      </div>

      {/* 2 y 3. Tarjeta de Consulta y Directorio (Responsivo: 1 col en móvil, 2 cols en tablet/escritorio) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'var(--modules-grid-cols, minmax(0, 1fr))',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <ConsultaCedulaCard
          onSacarPersona={handleOpenSacar}
          onOpenNuevoRegistro={handleOpenNuevoRegistro}
          onShowAlert={onShowAlert}
        />

        <ListaNegraCards
          personas={personas}
          isLoading={isLoading}
          onSacarPersona={handleOpenSacar}
          onRefresh={loadPersonas}
        />
      </div>

      {/* 4. Modal para Registrar Directamente en Lista Negra */}
      <NuevoRegistroModal
        isOpen={isNuevoModalOpen}
        onClose={() => setIsNuevoModalOpen(false)}
        onSave={handleSaveNuevo}
        initialCedula={prefillData.cedula}
        initialNombre={prefillData.nombre}
        initialApellidos={prefillData.apellidos}
        onShowAlert={onShowAlert}
      />

      {/* 5. Modal de Doble Verificación para Sacar de Lista Negra */}
      <ConfirmSacarModal
        isOpen={Boolean(personaParaSacar)}
        onClose={() => setPersonaParaSacar(null)}
        onConfirm={handleConfirmSacar}
        persona={personaParaSacar}
        isLoading={isSacando}
      />
    </div>
  );
}


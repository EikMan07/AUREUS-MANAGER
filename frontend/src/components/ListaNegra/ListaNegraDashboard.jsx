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
      className="lista-negra-dashboard-container"
      style={{
        backgroundColor: 'var(--aureus-bg-app)',
        minHeight: '100%',
        padding: '2px 0 28px 0',
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
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px 12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: '1 1 180px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--aureus-text-primary)',
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
              color: 'var(--aureus-text-muted)',
              marginTop: '4px',
            }}
          >
            Control de morosidad y restricciones
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Botón Refrescar */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'var(--aureus-bg-surface)',
              border: '1px solid var(--aureus-border-subtle)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aureus-text-secondary)',
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
                color: isLoading ? '#B69A55' : 'var(--aureus-text-secondary)',
                transition: 'transform 0.3s ease',
              }}
              className={isLoading ? 'animate-spin' : ''}
            />
          </button>

          {/* Botón Registrar Nuevo en Lista Negra (Gris Pizarra / Carbón Ejecutivo) */}
          <button
            type="button"
            onClick={() => handleOpenNuevoRegistro()}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '12px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              outline: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'inherit',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
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


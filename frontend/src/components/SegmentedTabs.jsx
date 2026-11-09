import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export function SegmentedTabs({
  activeTab,
  onTabChange,
  pendingCount = 0,
  atrasadosCount = 0,
  isSearchOpen = false,
  onOpenSearch,
  onCloseSearch,
  searchQuery = '',
  onSearchChange
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // ESTADO BUSCADOR ACTIVO: Reemplaza la fila en una sola cápsula idéntica
  if (isSearchOpen) {
    return (
      <div
        className="segmented-tabs-search-active"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#ffffff',
          padding: '0 14px',
          borderRadius: '9999px',
          border: '1px solid #cbd5e1',
          width: '100%',
          height: '44px',
          boxSizing: 'border-box',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Search size={18} strokeWidth={2.2} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar por nombre, cédula, teléfono o ubicación"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          autoFocus
          className="segmented-tabs-search-input"
          style={{
            flex: '1 1 0px',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: '13.5px',
            fontWeight: '600',
            color: '#0f172a',
          }}
          autoComplete="off"
          aria-label="Buscar cobros del día"
        />
        <button
          type="button"
          onClick={onCloseSearch}
          className="tab-search-close-btn"
          style={{
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f1f5f9',
            color: '#475569',
            flexShrink: 0,
            padding: 0,
          }}
          aria-label="Cerrar búsqueda"
          title="Cerrar búsqueda"
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>
    );
  }

  // ESTADO NORMAL: 1 Sola fila horizontal (Pestañas + Botón Lupa integrado a la derecha)
  return (
    <div className="segmented-tabs-wrapper" style={{ width: '100%', marginBottom: '16px' }}>
      <div
        className="segmented-tabs-control-three"
        role="tablist"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '4px',
          backgroundColor: '#f1f5f9',
          padding: '4px',
          borderRadius: '9999px',
          border: '1px solid #e2e8f0',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Pestaña 1: Pendientes */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pendientes'}
          onClick={() => onTabChange('pendientes')}
          className={`tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
          style={{
            flex: '1 1 0px',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderRadius: '9999px',
            padding: '7px 8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'pendientes' ? '#ffffff' : 'transparent',
            color: activeTab === 'pendientes' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'pendientes' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
          }}
        >
          <span>Pendientes</span>
          <span
            className="tab-counter-badge green"
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {pendingCount}
          </span>
        </button>

        {/* Pestaña 2: Registrados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'registrados'}
          onClick={() => onTabChange('registrados')}
          className={`tab-btn ${activeTab === 'registrados' ? 'active' : ''}`}
          style={{
            flex: '1 1 0px',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderRadius: '9999px',
            padding: '7px 8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'registrados' ? '#ffffff' : 'transparent',
            color: activeTab === 'registrados' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'registrados' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
          }}
        >
          <span>Registrados</span>
        </button>

        {/* Pestaña 3: Atrasados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'atrasados'}
          onClick={() => onTabChange('atrasados')}
          className={`tab-btn ${activeTab === 'atrasados' ? 'active' : ''}`}
          style={{
            flex: '1 1 0px',
            minWidth: 0,
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            borderRadius: '9999px',
            padding: '7px 8px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'atrasados' ? '#ffffff' : 'transparent',
            color: activeTab === 'atrasados' ? '#0f172a' : '#64748b',
            boxShadow: activeTab === 'atrasados' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
          }}
        >
          <span>Atrasados</span>
          {atrasadosCount > 0 && (
            <span
              className="tab-counter-badge red"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '9999px',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                fontSize: '10px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {atrasadosCount}
            </span>
          )}
        </button>

        {/* Botón de Búsqueda integrado al extremo derecho de la misma cápsula */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="tab-search-btn"
          style={{
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            minWidth: '32px',
            maxWidth: '32px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            color: '#475569',
            flexShrink: 0,
            padding: 0,
            margin: 0,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
          }}
          aria-label="Buscar cobro"
          title="Buscar cobro"
        >
          <Search size={16} strokeWidth={2.2} style={{ color: '#475569' }} />
        </button>
      </div>
    </div>
  );
}

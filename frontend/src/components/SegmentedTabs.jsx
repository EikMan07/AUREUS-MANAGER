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
        className="segmented-tabs-search-active cf-search-pill"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--aureus-bg-surface)',
          padding: '0 14px',
          borderRadius: '9999px',
          border: '1px solid var(--aureus-border-gold)',
          width: '100%',
          height: '44px',
          boxSizing: 'border-box',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
        }}
      >
        <Search size={18} strokeWidth={2.2} style={{ color: 'var(--aureus-text-muted)', flexShrink: 0 }} />
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
            color: 'var(--aureus-text-primary)',
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
            backgroundColor: 'var(--aureus-bg-elevated)',
            color: 'var(--aureus-text-secondary)',
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

  // ESTADO NORMAL: 1 Sola fila horizontal adaptable (Pestañas + Botón Lupa integrado)
  return (
    <div className="segmented-tabs-wrapper" style={{ width: '100%', marginBottom: '16px' }}>
      <div
        className="segmented-tabs-control-three"
        role="tablist"
        style={{
          backgroundColor: 'var(--aureus-bg-surface)',
          borderColor: 'var(--aureus-border-subtle)',
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
            backgroundColor: activeTab === 'pendientes' ? '#B69A55' : 'transparent',
            color: activeTab === 'pendientes' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
            fontWeight: activeTab === 'pendientes' ? 800 : 700,
            boxShadow: activeTab === 'pendientes' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
          }}
        >
          <span className="tab-btn-label">Pendientes</span>
          <span
            className="tab-counter-badge green"
            style={{
              backgroundColor: activeTab === 'pendientes' ? 'rgba(255, 255, 255, 0.24)' : '#397D67',
              color: '#FFFFFF',
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
            backgroundColor: activeTab === 'registrados' ? '#B69A55' : 'transparent',
            color: activeTab === 'registrados' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
            fontWeight: activeTab === 'registrados' ? 800 : 700,
            boxShadow: activeTab === 'registrados' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
          }}
        >
          <span className="tab-btn-label">Registrados</span>
        </button>

        {/* Pestaña 3: Atrasados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'atrasados'}
          onClick={() => onTabChange('atrasados')}
          className={`tab-btn ${activeTab === 'atrasados' ? 'active' : ''}`}
          style={{
            backgroundColor: activeTab === 'atrasados' ? '#B69A55' : 'transparent',
            color: activeTab === 'atrasados' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
            fontWeight: activeTab === 'atrasados' ? 800 : 700,
            boxShadow: activeTab === 'atrasados' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
          }}
        >
          <span className="tab-btn-label">Atrasados</span>
          {atrasadosCount > 0 && (
            <span
              className="tab-counter-badge red"
              style={{
                backgroundColor: '#C65D58',
                color: '#FFFFFF',
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
            backgroundColor: 'var(--aureus-bg-elevated)',
            color: 'var(--aureus-text-secondary)',
          }}
          aria-label="Buscar cobro"
          title="Buscar cobro"
        >
          <Search size={15} strokeWidth={2.2} style={{ color: 'var(--aureus-text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}

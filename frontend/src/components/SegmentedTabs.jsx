import React from 'react';

export function SegmentedTabs({ activeTab, onTabChange, pendingCount = 0, atrasadosCount = 0 }) {
  return (
    <div className="segmented-tabs-wrapper">
      <div className="segmented-tabs-control-three" role="tablist">
        {/* Pestaña 1: Pendientes de Hoy */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pendientes'}
          onClick={() => onTabChange('pendientes')}
          className={`tab-btn ${activeTab === 'pendientes' ? 'active' : ''}`}
        >
          <span>Pendientes</span>
          <span className="tab-counter-badge">{pendingCount}</span>
        </button>

        {/* Pestaña 2: Cobros ya registrados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'registrados'}
          onClick={() => onTabChange('registrados')}
          className={`tab-btn ${activeTab === 'registrados' ? 'active' : ''}`}
        >
          <span>Registrados</span>
        </button>

        {/* Pestaña 3: Atrasados (4+ semanas o 2+ quincenas) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'atrasados'}
          onClick={() => onTabChange('atrasados')}
          className={`tab-btn ${activeTab === 'atrasados' ? 'active' : ''}`}
        >
          <span>Atrasados</span>
          {atrasadosCount > 0 && (
            <span className="tab-counter-badge red">{atrasadosCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

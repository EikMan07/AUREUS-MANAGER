import React from 'react';
import { Coins, Users, Landmark, BarChart3, ShieldAlert, Trash2 } from 'lucide-react';

export function BottomNav({ activeModule = 'cobros', onSelectModule }) {
  // Restricción: En esta fase únicamente están activas las vistas de Cobros, Clientes y Préstamos.
  const modules = [
    { id: 'cobros', label: 'Cobros', icon: Coins, enabled: true },
    { id: 'clientes', label: 'Clientes', icon: Users, enabled: true },
    { id: 'prestamos', label: 'Préstamos', icon: Landmark, enabled: true },
    { id: 'resumen', label: 'Resumen', icon: BarChart3, enabled: true },
    { id: 'lista-negra', label: 'Lista Negra', icon: ShieldAlert, enabled: true },
    { id: 'papelera', label: 'Papelera', icon: Trash2, enabled: true },
  ];

  return (
    <nav className="bottom-nav-bar" aria-label="Navegación principal">
      <div className="bottom-nav-inner">
        {modules.map((m) => {
          const Icon = m.icon;
          const isActive = activeModule === m.id;
          const isEnabled = m.enabled;

          return (
            <button
              key={m.id}
              type="button"
              disabled={!isEnabled}
              onClick={() => {
                if (isEnabled && onSelectModule) {
                  onSelectModule(m.id);
                }
              }}
              className={`nav-tab-btn ${isActive ? 'active' : ''} ${!isEnabled ? 'nav-tab-disabled' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              title={!isEnabled ? `${m.label} (Próximamente)` : m.label}
              style={!isEnabled ? { opacity: 0.38, cursor: 'not-allowed' } : undefined}
            >
              <div className="nav-icon-container">
                <Icon size={20} strokeWidth={1.75} className="nav-icon" />
              </div>
              <span className="nav-tab-label">{m.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

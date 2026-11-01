import React from 'react';
import { Coins, Bell } from 'lucide-react';

export function Header({
  title = 'Cobros',
  subtitle = 'COBRO-FIRME',
  icon: Icon = Coins,
  hasNotifications = true
}) {
  return (
    <header className="header-dark-compact">
      <div className="header-top-bar">
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <Icon className="brand-icon" size={22} strokeWidth={1.75} />
          </div>
          <div className="brand-titles">
            <h1 className="main-title">{title}</h1>
            <span className="brand-sub">{subtitle}</span>
          </div>
        </div>

        <button 
          type="button" 
          className="notification-btn" 
          aria-label="Notificaciones"
          title="Notificaciones activas"
        >
          <Bell size={20} strokeWidth={1.75} />
          {hasNotifications && <span className="notification-dot" />}
        </button>
      </div>
    </header>
  );
}

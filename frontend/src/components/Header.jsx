import React from 'react';
import { Coins, Bell } from 'lucide-react';

export function Header({
  title = 'Cobros',
  subtitle = 'COBRO-FIRME',
  icon: Icon = Coins,
  hasNotifications = false,
  notificationCount = 0,
  onOpenNotifications
}) {
  const showBadge = notificationCount > 0 || hasNotifications;

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
          title={notificationCount > 0 ? `${notificationCount} notificaciones activas` : 'Notificaciones'}
          onClick={onOpenNotifications}
          style={{ position: 'relative' }}
        >
          <Bell size={20} strokeWidth={1.75} />
          {showBadge && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: notificationCount > 0 ? '18px' : '9px',
                height: notificationCount > 0 ? '18px' : '9px',
                padding: notificationCount > 0 ? '0 4px' : '0',
                borderRadius: '9999px',
                backgroundColor: '#10b981',
                color: '#064e3b',
                fontSize: '10px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
                pointerEvents: 'none',
                lineHeight: 1
              }}
            >
              {notificationCount > 9 ? '9+' : notificationCount > 0 ? notificationCount : ''}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

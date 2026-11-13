import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Coins,
  Users,
  Landmark,
  BarChart3,
  ShieldAlert,
  Trash2,
  Menu,
  PanelLeft,
  PanelRight,
  PanelBottom
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

const STORAGE_DOCK_KEY = 'cf_nav_dock_position';
const STORAGE_MINIMIZED_KEY = 'cf_nav_minimized';

function readInitialDockPosition() {
  try {
    const saved = localStorage.getItem(STORAGE_DOCK_KEY);
    return saved === 'left' || saved === 'right' || saved === 'bottom' ? saved : 'bottom';
  } catch {
    return 'bottom';
  }
}

function readInitialMinimized() {
  try {
    return localStorage.getItem(STORAGE_MINIMIZED_KEY) === 'true';
  } catch {
    return false;
  }
}

function computeDropZone(clientX, clientY) {
  if (typeof window === 'undefined') return null;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const sideThreshold = Math.min(160, winW * 0.25);

  if (clientX <= sideThreshold && clientY < winH - 104) {
    return 'left';
  }
  if (clientX >= winW - sideThreshold && clientY < winH - 104) {
    return 'right';
  }
  if (clientY >= winH - 104) {
    return 'bottom';
  }
  return null;
}

export function BottomNav({ activeModule = 'cobros', onSelectModule, onLayoutChange }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { isDark } = useTheme();
  const [dockPosition, setDockPosition] = useState(readInitialDockPosition);
  const [isMinimized, setIsMinimized] = useState(readInitialMinimized);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCoords, setDragCoords] = useState({ x: 0, y: 0 });
  const [hoveredZone, setHoveredZone] = useState(null);
  const [pulseSeq, setPulseSeq] = useState(0);

  const dragCleanupRef = useRef(null);

  // Persistir preferencias y notificar al layout padre (DashboardPage)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DOCK_KEY, dockPosition);
      localStorage.setItem(STORAGE_MINIMIZED_KEY, String(isMinimized));
    } catch {
      // Ignorar restricciones de almacenamiento
    }
    if (onLayoutChange) {
      onLayoutChange({ dockPosition, isMinimized });
    }
  }, [dockPosition, isMinimized, onLayoutChange]);

  // Limpiar listeners globales si el componente se desmonta durante un arrastre
  useEffect(() => {
    return () => {
      if (dragCleanupRef.current) {
        dragCleanupRef.current();
        dragCleanupRef.current = null;
      }
    };
  }, []);

  const modules = [
    { id: 'cobros', label: 'Cobros', icon: Coins, enabled: true },
    { id: 'clientes', label: 'Clientes', icon: Users, enabled: true },
    { id: 'prestamos', label: 'Préstamos', icon: Landmark, enabled: true },
    { id: 'resumen', label: 'Resumen', icon: BarChart3, enabled: true },
    { id: 'lista-negra', label: 'Lista Negra', icon: ShieldAlert, enabled: true },
    { id: 'papelera', label: 'Papelera', icon: Trash2, enabled: true },
  ];

  const handleHamburgerPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') {
      return;
    }

    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    let latestZone = null;
    const prevBodyUserSelect = document.body.style.userSelect;

    const handlePointerMove = (moveEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (dist > 6) {
        if (!hasMoved) {
          hasMoved = true;
          document.body.style.userSelect = 'none';
          setIsDragging(true);
        }
        setDragCoords({ x: moveEvent.clientX, y: moveEvent.clientY });
        latestZone = computeDropZone(moveEvent.clientX, moveEvent.clientY);
        setHoveredZone(latestZone);
      }
    };

    const cleanupListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      document.body.style.userSelect = prevBodyUserSelect;
      dragCleanupRef.current = null;
    };

    const handlePointerUp = (upEvent) => {
      cleanupListeners();

      if (!hasMoved) {
        // Clic simple: minimizar o desplegar el menú en la posición actual con pulso sutil
        setIsMinimized((prev) => !prev);
        setPulseSeq((prev) => prev + 1);
      } else {
        // Arrastre: verificar zona destino y acoplar desplegado automáticamente
        const finalZone = latestZone ?? computeDropZone(upEvent.clientX, upEvent.clientY);
        if (finalZone === 'left' || finalZone === 'right' || finalZone === 'bottom') {
          setDockPosition(finalZone);
          setIsMinimized(false);
        }
        setIsDragging(false);
        setHoveredZone(null);
      }
    };

    const handlePointerCancel = () => {
      cleanupListeners();
      setIsDragging(false);
      setHoveredZone(null);
    };

    dragCleanupRef.current = cleanupListeners;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  const renderHamburgerButton = () => {
    return (
      <button
        type="button"
        className="no-hover-lift cf-hamburger-fixed-btn"
        onPointerDown={handleHamburgerPointerDown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsMinimized((prev) => !prev);
            setPulseSeq((prev) => prev + 1);
          }
        }}
        aria-label={isMinimized ? 'Desplegar menú de módulos' : 'Minimizar o mover menú de módulos'}
        aria-expanded={!isMinimized}
        title={
          isMinimized
            ? 'Clic para desplegar menú · Arrastra para mover'
            : 'Clic para minimizar menú · Arrastra para mover'
        }
        style={{
          position: 'relative',
          zIndex: 3,
          width: '44px',
          height: '44px',
          minWidth: '44px',
          minHeight: '44px',
          maxWidth: '44px',
          maxHeight: '44px',
          borderRadius: '14px',
          backgroundColor: '#B69A55',
          border: isDark ? '1.5px solid #D4B46A' : '1.5px solid #9E8342',
          color: '#FFFFFF',
          boxShadow: isDark
            ? '0 6px 20px rgba(0, 0, 0, 0.42)'
            : '0 6px 18px rgba(182, 154, 85, 0.32)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'box-shadow 0.16s ease, background-color 0.16s ease',
        }}
      >
        {pulseSeq > 0 && (
          <span
            key={pulseSeq}
            aria-hidden="true"
            className="cf-hamburger-pulse-ring"
            style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: '14px',
              pointerEvents: 'none',
              animation: 'aureusAbsorbPulse 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />
        )}
        <Menu size={20} strokeWidth={2.3} />
      </button>
    );
  };

  const firstHalfItems = modules.slice(0, 3);
  const secondHalfItems = modules.slice(3, 6);
  const dividerColor = isDark ? 'rgba(212, 180, 106, 0.22)' : 'rgba(182, 154, 85, 0.28)';

  const renderDivider = (isVertical) => (
    <span
      aria-hidden="true"
      style={{
        width: isVertical ? '48px' : '1px',
        height: isVertical ? '1px' : '28px',
        backgroundColor: dividerColor,
        opacity: isMinimized ? 0 : 1,
        transition: 'opacity 0.25s ease',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    />
  );

  const getModuleItemTransitionStyle = (globalIndex, isVertical) => {
    const isFirstHalf = globalIndex < 3;
    const stepsFromCenter = isFirstHalf ? 3 - globalIndex : globalIndex - 2;
    const minimizeDelay = (3 - stepsFromCenter) * 25;
    const expandDelay = 20 + (stepsFromCenter - 1) * 25;

    let minimizedTransform;
    if (isVertical) {
      minimizedTransform = isFirstHalf
        ? `translate3d(0px, calc(${stepsFromCenter} * 11dvh), 0px) scale(0.18)`
        : `translate3d(0px, calc(-${stepsFromCenter} * 11dvh), 0px) scale(0.18)`;
    } else {
      minimizedTransform = isFirstHalf
        ? `translate3d(calc(${stepsFromCenter} * 14vw), 0px, 0px) scale(0.18)`
        : `translate3d(calc(-${stepsFromCenter} * 14vw), 0px, 0px) scale(0.18)`;
    }

    return {
      transform: isMinimized ? minimizedTransform : 'translate3d(0px, 0px, 0px) scale(1)',
      opacity: isMinimized ? 0 : 1,
      filter: isMinimized ? 'blur(3px)' : 'blur(0px)',
      pointerEvents: isMinimized ? 'none' : 'auto',
      zIndex: 2,
      transition: isMinimized
        ? `transform ${340 + stepsFromCenter * 22}ms cubic-bezier(0.32, 0.72, 0, 1) ${minimizeDelay}ms, opacity ${220 + stepsFromCenter * 18}ms ease ${minimizeDelay}ms, filter 250ms ease ${minimizeDelay}ms, background-color 0.16s ease, border-color 0.16s ease`
        : `transform ${380 + stepsFromCenter * 26}ms cubic-bezier(0.16, 1, 0.3, 1) ${expandDelay}ms, opacity ${260 + stepsFromCenter * 20}ms ease ${expandDelay}ms, filter 220ms ease ${expandDelay}ms, background-color 0.16s ease, border-color 0.16s ease`,
    };
  };

  const renderSingleModuleButton = (m, globalIndex, isVertical) => {
    const Icon = m.icon;
    const isActive = activeModule === m.id;
    const isEnabled = m.enabled;
    const motionStyle = getModuleItemTransitionStyle(globalIndex, isVertical);

    if (isVertical) {
      return (
        <button
          key={m.id}
          type="button"
          disabled={!isEnabled}
          tabIndex={isMinimized ? -1 : 0}
          aria-hidden={isMinimized}
          onClick={() => {
            if (!isMinimized && isEnabled && onSelectModule) {
              onSelectModule(m.id);
            }
          }}
          className={`cf-side-tab-btn ${isActive ? 'active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
          title={m.label}
          style={{
            position: 'relative',
            width: '100%',
            minWidth: 0,
            border: isActive
              ? isDark
                ? '1px solid #B69A55'
                : '1px solid #D5C295'
              : '1px solid transparent',
            backgroundColor: isActive
              ? isDark
                ? 'rgba(182, 154, 85, 0.18)'
                : '#F7F2E4'
              : 'transparent',
            borderRadius: '14px',
            padding: '8px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: isMinimized ? 'default' : isEnabled ? 'pointer' : 'not-allowed',
            color: isActive ? (isDark ? '#FFFFFF' : '#252A31') : (isDark ? '#94A3B8' : '#6E757F'),
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            willChange: 'transform, opacity',
            ...motionStyle,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '28px',
              borderRadius: '10px',
              backgroundColor: isActive ? (isDark ? 'rgba(182, 154, 85, 0.22)' : '#F7F2E4') : 'transparent',
              color: isActive ? (isDark ? '#E5C97B' : '#B69A55') : (isDark ? '#94A3B8' : '#6E757F'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.16s ease, color 0.16s ease',
            }}
          >
            <Icon size={19} strokeWidth={isActive ? 2.1 : 1.75} />
          </div>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: isActive ? 800 : 600,
              color: isActive ? (isDark ? '#FFFFFF' : '#252A31') : (isDark ? '#94A3B8' : '#6E757F'),
              lineHeight: 1.15,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {m.label}
          </span>
        </button>
      );
    }

    return (
      <button
        key={m.id}
        type="button"
        disabled={!isEnabled}
        tabIndex={isMinimized ? -1 : 0}
        aria-hidden={isMinimized}
        onClick={() => {
          if (!isMinimized && isEnabled && onSelectModule) {
            onSelectModule(m.id);
          }
        }}
        className={`nav-tab-btn ${isActive ? 'active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        title={m.label}
        style={{
          position: 'relative',
          width: '100%',
          minWidth: 0,
          padding: '4px 2px',
          color: isActive ? (isDark ? '#FFFFFF' : '#252A31') : (isDark ? '#94A3B8' : '#6E757F'),
          willChange: 'transform, opacity',
          ...motionStyle,
        }}
      >
        <div
          className="nav-icon-container"
          style={
            isActive
              ? {
                  backgroundColor: isDark ? 'rgba(182, 154, 85, 0.18)' : '#F7F2E4',
                  border: isDark ? '1px solid #B69A55' : 'none',
                  color: isDark ? '#E5C97B' : '#B69A55',
                }
              : {
                  color: isDark ? '#94A3B8' : '#6E757F',
                }
          }
        >
          <Icon size={20} strokeWidth={isActive ? 2.1 : 1.75} className="nav-icon" />
        </div>
        <span
          className="nav-tab-label"
          style={{
            color: isActive ? (isDark ? '#FFFFFF' : '#252A31') : (isDark ? '#94A3B8' : '#6E757F'),
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {m.label}
        </span>
      </button>
    );
  };

  const navElements = (
    <>
      {/* 1. BARRA EN PARTE INFERIOR (3 módulos | Botón Central 44x44 | 3 módulos) */}
      {!isDragging && dockPosition === 'bottom' && (
        <nav
          className="cf-dock-bottom"
          aria-label="Navegación principal inferior"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '68px',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
            zIndex: 100,
            boxSizing: 'border-box',
            pointerEvents: isMinimized ? 'none' : 'auto',
            overflow: 'visible',
          }}
        >
          {/* Superficie animada con clip-path simétrico hacia el botón central 44x44px */}
          <div
            className="cf-nav-backdrop"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundColor: isDark ? '#162436' : '#FFFFFF',
              borderTop: isDark ? '1px solid rgba(182, 154, 85, 0.28)' : '1px solid #E5E0D5',
              boxShadow: isDark ? '0 -4px 24px rgba(0, 0, 0, 0.45)' : '0 4px 20px rgba(37, 42, 49, 0.07)',
              clipPath: isMinimized
                ? 'inset(12px calc(50% - 22px) 12px calc(50% - 22px) round 14px)'
                : 'inset(0px 0px 0px 0px round 0px)',
              opacity: isMinimized ? 0 : 1,
              transition: 'clip-path 0.42s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.32s ease',
            }}
          />
          <div
            className="bottom-nav-inner"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              padding: '0 8px',
              boxSizing: 'border-box',
              pointerEvents: isMinimized ? 'none' : 'auto',
            }}
          >
            {/* Columna Izquierda: Cobros, Clientes, Préstamos */}
            <div
              className="bottom-nav-group bottom-nav-group-left"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                alignItems: 'center',
                justifyItems: 'center',
                width: '100%',
                minWidth: 0,
                pointerEvents: isMinimized ? 'none' : 'auto',
              }}
            >
              {firstHalfItems.map((m, idx) => renderSingleModuleButton(m, idx, false))}
            </div>

            {/* Columna Central: Divisores + Botón Hamburguesa 44x44 */}
            <div
              className="bottom-nav-center-slot"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 6px',
                position: 'relative',
                zIndex: 3,
                pointerEvents: 'none',
              }}
            >
              {renderDivider(false)}
              {renderHamburgerButton()}
              {renderDivider(false)}
            </div>

            {/* Columna Derecha: Resumen, Lista Negra, Papelera */}
            <div
              className="bottom-nav-group bottom-nav-group-right"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                alignItems: 'center',
                justifyItems: 'center',
                width: '100%',
                minWidth: 0,
                pointerEvents: isMinimized ? 'none' : 'auto',
              }}
            >
              {secondHalfItems.map((m, idx) => renderSingleModuleButton(m, idx + 3, false))}
            </div>
          </div>
        </nav>
      )}

      {/* 2. BARRA EN LATERAL IZQUIERDO O DERECHO (3 arriba | Botón Central 44x44 | 3 abajo) */}
      {!isDragging && (dockPosition === 'left' || dockPosition === 'right') && (
        <nav
          className={`cf-side-nav-bar ${dockPosition === 'right' ? 'cf-dock-right' : 'cf-dock-left'}`}
          aria-label={dockPosition === 'right' ? 'Navegación principal derecha' : 'Navegación principal izquierda'}
          style={{
            position: 'fixed',
            top: '68px',
            bottom: 0,
            ...(dockPosition === 'right' ? { right: 0 } : { left: 0 }),
            width: '92px',
            height: 'calc(100dvh - 68px)',
            backgroundColor: 'transparent',
            display: 'grid',
            gridTemplateRows: '1fr auto 1fr',
            alignItems: 'center',
            justifyItems: 'center',
            padding: '10px 0',
            overflow: 'visible',
            zIndex: 99,
            boxSizing: 'border-box',
            pointerEvents: isMinimized ? 'none' : 'auto',
          }}
        >
          {/* Superficie animada con clip-path simétrico hacia el botón central 44x44px */}
          <div
            className="cf-nav-backdrop"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundColor: isDark ? '#162436' : '#FFFFFF',
              ...(dockPosition === 'left'
                ? {
                    borderRight: isDark ? '1px solid rgba(182, 154, 85, 0.28)' : '1px solid #E5E0D5',
                    boxShadow: isDark ? '4px 0 24px rgba(0, 0, 0, 0.42)' : '0 4px 20px rgba(37, 42, 49, 0.07)',
                  }
                : {
                    borderLeft: isDark ? '1px solid rgba(182, 154, 85, 0.28)' : '1px solid #E5E0D5',
                    boxShadow: isDark ? '-4px 0 24px rgba(0, 0, 0, 0.42)' : '0 4px 20px rgba(37, 42, 49, 0.07)',
                  }),
              clipPath: isMinimized
                ? 'inset(calc(50% - 22px) 24px calc(50% - 22px) 24px round 14px)'
                : 'inset(0px 0px 0px 0px round 0px)',
              opacity: isMinimized ? 0 : 1,
              transition: 'clip-path 0.42s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.32s ease',
            }}
          />

          {/* Bloque Superior: Cobros, Clientes, Préstamos */}
          <div
            className="side-nav-group side-nav-group-top"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              minHeight: 0,
              padding: '0 6px',
              boxSizing: 'border-box',
              pointerEvents: isMinimized ? 'none' : 'auto',
            }}
          >
            {firstHalfItems.map((m, idx) => renderSingleModuleButton(m, idx, true))}
          </div>

          {/* Bloque Central Vertical: Divisores Horizontales + Botón Hamburguesa 44x44 */}
          <div
            className="side-nav-center-slot"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '6px 0',
              position: 'relative',
              zIndex: 3,
              width: '100%',
              pointerEvents: 'none',
            }}
          >
            {renderDivider(true)}
            {renderHamburgerButton()}
            {renderDivider(true)}
          </div>

          {/* Bloque Inferior: Resumen, Lista Negra, Papelera */}
          <div
            className="side-nav-group side-nav-group-bottom"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              minHeight: 0,
              padding: '0 6px',
              boxSizing: 'border-box',
              pointerEvents: isMinimized ? 'none' : 'auto',
            }}
          >
            {secondHalfItems.map((m, idx) => renderSingleModuleButton(m, idx + 3, true))}
          </div>
        </nav>
      )}

      {/* 5. RECUADROS GUÍA DE FONDO SÓLIDO OPACO Y CURSOR SEGUIDOR DURANTE EL ARRASTRE */}
      {isDragging && (
        <>
          {/* Recuadro Guía Izquierdo */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: '82px',
              bottom: '104px',
              left: '14px',
              width: '92px',
              borderRadius: '20px',
              backgroundColor: hoveredZone === 'left' ? '#B69A55' : (isDark ? '#162436' : '#252A31'),
              backgroundImage: 'none',
              opacity: 1,
              border: hoveredZone === 'left' ? '2px solid #FFFFFF' : (isDark ? '2px dashed #B69A55' : '2px dashed #D5C295'),
              boxShadow: hoveredZone === 'left' ? '0 10px 26px rgba(182, 154, 85, 0.35)' : (isDark ? '0 8px 24px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(37, 42, 49, 0.25)'),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              isolation: 'isolate',
              zIndex: 9998,
              pointerEvents: 'none',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.3,
              transition: 'background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
            }}
          >
            <PanelLeft size={24} strokeWidth={2} color="#FFFFFF" />
            <span>Soltar a la izquierda</span>
          </div>

          {/* Recuadro Guía Derecho */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: '82px',
              bottom: '104px',
              right: '14px',
              width: '92px',
              borderRadius: '20px',
              backgroundColor: hoveredZone === 'right' ? '#B69A55' : (isDark ? '#162436' : '#252A31'),
              backgroundImage: 'none',
              opacity: 1,
              border: hoveredZone === 'right' ? '2px solid #FFFFFF' : (isDark ? '2px dashed #B69A55' : '2px dashed #D5C295'),
              boxShadow: hoveredZone === 'right' ? '0 10px 26px rgba(182, 154, 85, 0.35)' : (isDark ? '0 8px 24px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(37, 42, 49, 0.25)'),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              isolation: 'isolate',
              zIndex: 9998,
              pointerEvents: 'none',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.3,
              transition: 'background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
            }}
          >
            <PanelRight size={24} strokeWidth={2} color="#FFFFFF" />
            <span>Soltar a la derecha</span>
          </div>

          {/* Recuadro Guía Inferior */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: '14px',
              right: '14px',
              bottom: '14px',
              height: '74px',
              borderRadius: '20px',
              backgroundColor: hoveredZone === 'bottom' ? '#B69A55' : (isDark ? '#162436' : '#252A31'),
              backgroundImage: 'none',
              opacity: 1,
              border: hoveredZone === 'bottom' ? '2px solid #FFFFFF' : (isDark ? '2px dashed #B69A55' : '2px dashed #D5C295'),
              boxShadow: hoveredZone === 'bottom' ? '0 10px 26px rgba(182, 154, 85, 0.35)' : (isDark ? '0 8px 24px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(37, 42, 49, 0.25)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '0 16px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              isolation: 'isolate',
              zIndex: 9998,
              pointerEvents: 'none',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 800,
              transition: 'background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
            }}
          >
            <PanelBottom size={22} strokeWidth={2} color="#FFFFFF" />
            <span>Soltar abajo</span>
          </div>

          {/* Botón Flotante Seguidor del Cursor (mismo tamaño 44x44px y borde 14px) */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: `${dragCoords.x - 22}px`,
              top: `${dragCoords.y - 22}px`,
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              backgroundColor: '#B69A55',
              color: '#FFFFFF',
              border: '2px solid #FFFFFF',
              boxShadow: '0 12px 28px rgba(182, 154, 85, 0.42)',
              zIndex: 9999,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <Menu size={20} strokeWidth={2.3} />
          </div>
        </>
      )}
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(navElements, document.body);
  }
  return navElements;
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Scale,
  Lock,
  Bot,
  X,
  CheckCircle2,
  FileText,
  UserCheck
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import {
  ClassicalLaurelDivider,
  ImperialCornerAccents
} from '../Common/ClassicalAppArchitecture.jsx';

const TABS = [
  { id: 'terminos', label: 'Términos y Uso Privado', Icon: Scale },
  { id: 'privacidad', label: 'Privacidad y Ley 8968', Icon: Lock },
  { id: 'gobernanza', label: 'Gobernanza de Séneca IA', Icon: Bot }
];

export function LegalGovernanceModal({
  isOpen,
  onClose,
  initialTab = 'terminos',
  onAccept = null
}) {
  // Todos los Hooks declarados al inicio antes de cualquier retorno condicional
  const { isDark } = useTheme();
  const { language } = useAccessibility();
  const [activeTab, setActiveTab] = useState(initialTab || 'terminos');
  const [windowPos, setWindowPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);

  const modalWindowRef = useRef(null);
  const dragOffsetRef = useRef({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (isOpen) {
      const valid = TABS.some((t) => t.id === initialTab) ? initialTab : 'terminos';
      setActiveTab(valid);
      setWindowPos({ x: null, y: null });
      setIsDragging(false);
    }
  }, [isOpen, initialTab]);

  const clampPosition = useCallback((x, y) => {
    if (typeof window === 'undefined') return { x, y };
    const rect = modalWindowRef.current
      ? modalWindowRef.current.getBoundingClientRect()
      : { width: Math.min(680, window.innerWidth - 28), height: Math.min(640, window.innerHeight - 108) };
    const minX = 8;
    const maxX = Math.max(8, window.innerWidth - rect.width - 8);
    const minY = 8;
    const maxY = Math.max(8, window.innerHeight - rect.height - 8);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }, []);

  const handleHeaderPointerDown = useCallback((e) => {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button')) {
      return;
    }
    if (!modalWindowRef.current) return;
    const rect = modalWindowRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
    setWindowPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handlePointerMove = (e) => {
      const nextX = e.clientX - dragOffsetRef.current.offsetX;
      const nextY = e.clientY - dragOffsetRef.current.offsetY;
      setWindowPos(clampPosition(nextX, nextY));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, clampPosition]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const goldAccent = isDark ? '#D4B46A' : '#B69A55';
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F8F6F0';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.26)' : '#E5E0D5';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#CBD5E1' : '#4A5058';
  const textMuted = isDark ? '#94A3B8' : '#6B7280';

  const cardStyle = {
    backgroundColor: elevatedBg,
    border: `1px solid ${borderSubtle}`,
    borderRadius: '16px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0
  };

  return createPortal(
    <div
      data-testid="legal-governance-overlay"
      data-lang={language}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100040,
        backgroundColor: 'rgba(9, 16, 26, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: '88px',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={modalWindowRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-governance-title"
        data-testid="legal-governance-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: 'calc(100dvh - 108px)',
          backgroundColor: surfaceBg,
          color: textPrimary,
          borderRadius: '22px',
          border: `1.5px solid ${goldAccent}`,
          boxShadow: isDark
            ? '0 26px 64px rgba(0, 0, 0, 0.68)'
            : '0 22px 54px rgba(16, 28, 44, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: windowPos.x !== null && windowPos.y !== null ? 'fixed' : 'relative',
          left: windowPos.x !== null ? `${windowPos.x}px` : undefined,
          top: windowPos.y !== null ? `${windowPos.y}px` : undefined,
          margin: windowPos.x !== null ? 0 : 'auto',
          boxSizing: 'border-box'
        }}
      >
        <ImperialCornerAccents isDark={isDark} />

        {/* Cabecera Arrastrable */}
        <div
          onPointerDown={handleHeaderPointerDown}
          style={{
            padding: '12px 22px 14px 22px',
            borderBottom: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: '38px',
              height: '4px',
              borderRadius: '9999px',
              backgroundColor: isDark ? 'rgba(212, 180, 106, 0.38)' : 'rgba(182, 154, 85, 0.45)',
              margin: '0 auto 8px auto'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  backgroundColor: isDark ? 'rgba(212, 180, 106, 0.14)' : '#F7F2E4',
                  border: `1px solid ${goldAccent}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={20} color={goldAccent} strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  id="legal-governance-title"
                  className="aureus-imperial-title"
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 900,
                    letterSpacing: '0.03em',
                    color: textPrimary
                  }}
                >
                  Centro Legal y Gobernanza
                </h2>
                <span style={{ fontSize: '12px', fontWeight: 700, color: goldAccent }}>
                  Versión vigente v1.0-2026 · Ley 8968 de Costa Rica
                </span>
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-close-legal-modal"
              onClick={onClose}
              aria-label="Cerrar centro legal"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9999px',
                border: `1px solid ${borderSubtle}`,
                backgroundColor: elevatedBg,
                color: textSecondary,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Barra Segmentada de 3 Apartados */}
          <div
            role="tablist"
            aria-label="Apartados legales y de gobernanza"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
              marginTop: '14px',
              padding: '5px',
              borderRadius: '14px',
              backgroundColor: elevatedBg,
              border: `1px solid ${borderSubtle}`
            }}
          >
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`tab-legal-${id}`}
                  onClick={() => setActiveTab(id)}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: active ? `1px solid ${goldAccent}` : '1px solid transparent',
                    background: active
                      ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                      : 'transparent',
                    color: active ? '#101C2C' : textSecondary,
                    fontSize: '12.5px',
                    fontWeight: active ? 900 : 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}
                >
                  <Icon size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido Desplazable */}
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <ClassicalLaurelDivider compact isDark={isDark} style={{ flexShrink: 0, margin: '0 auto 2px auto' }} />

          {activeTab === 'terminos' && (
            <>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Herramienta Privada de Control Administrativo y Contable
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  Aureus Manager es una bitácora digital privada diseñada para organizar agendas de cobro, directorio de clientes, préstamos y resúmenes financieros. No opera como entidad bancaria, captadora de ahorro ni buró público de crédito.
                </p>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Deslinde de Responsabilidad y Autonomía del Titular
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  Cada usuario administra su cuenta de forma independiente y es el único responsable de la veracidad, respaldo documental y legalidad de los préstamos, tasas, plazos y apuntes que registra, eximiendo a la plataforma de disputas contractuales entre particulares.
                </p>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Carácter Estrictamente Interno de la Lista Negra
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  El módulo de Lista Negra funciona exclusivamente como recordatorio preventivo interno dentro de la cuenta del propio usuario para evitar otorgar nuevos créditos por error a personas con incumplimientos previos comprobados.
                </p>
              </div>
            </>
          )}

          {activeTab === 'privacidad' && (
            <>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Aislamiento Total y Visibilidad Privada por Cuenta
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  En cumplimiento de la Ley 8968 de Costa Rica, todos tus clientes, préstamos y registros preventivos están aislados bajo tu cuenta personal y jamás se publican ni comparten con terceros sin tu acción expresa.
                </p>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Derechos ARCO y Retención de Seguridad de 30 Días
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  Puedes ejercer en cualquier momento tus derechos de Acceso, Rectificación, Cancelación y Oposición: exportar tus datos personales desde Mi Perfil, actualizar registros al instante y contar con 30 días de resguardo en Papelera antes del borrado definitivo.
                </p>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={17} color={goldAccent} strokeWidth={2.2} />
                  <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                    Protección Cifrada y Enmascaramiento de Datos
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: textSecondary }}>
                  Tu sesión está protegida con cookies esenciales de seguridad con cierre automático a los 25 minutos de inactividad, contraseñas bajo cifrado irreversible y ocultamiento automático de datos personales en los registros de diagnóstico.
                </p>
              </div>
            </>
          )}

          {activeTab === 'gobernanza' && (
            <>
              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: goldAccent }}>
                  1. ¿Quién decide?
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: textSecondary }}>
                  La persona usuaria toma el 100 % de las decisiones financieras. Séneca IA y la consulta tributaria solo extraen y resumen datos objetivos; jamás puntúan, clasifican ni rechazan personas automáticamente.
                </p>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: goldAccent }}>
                  2. ¿Con qué datos?
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: textSecondary }}>
                  Únicamente con los registros que el propio usuario ha guardado en su cuenta, mediante consultas de solo lectura sin entrenar modelos externos con información privada.
                </p>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: goldAccent }}>
                  3. ¿Quién responde?
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: textSecondary }}>
                  El titular de la cuenta que registra y confirma cada operación mediante las etapas de doble verificación en la plataforma.
                </p>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: goldAccent }}>
                  4. ¿Cómo se corrige?
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.55, color: textSecondary }}>
                  Todo registro cuenta con edición directa en Clientes y Préstamos, reversión de cobros compartidos, retiro inmediato de Lista Negra y restauración desde Papelera.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 600, color: textMuted }}>
            Custodia privada conforme a la Ley 8968 y estándares de gobernanza de IA
          </span>

          <button
            type="button"
            data-testid="btn-confirm-legal-modal"
            onClick={() => {
              if (typeof onAccept === 'function') {
                onAccept();
              }
              onClose?.();
            }}
            style={{
              height: '42px',
              padding: '0 22px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
              border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
              color: '#101C2C',
              fontSize: '13.5px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(182, 154, 85, 0.28)'
            }}
          >
            {typeof onAccept === 'function' ? 'Aceptar Términos y Política de Datos' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LegalGovernanceModal;

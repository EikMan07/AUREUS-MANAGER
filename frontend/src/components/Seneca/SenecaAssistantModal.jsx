import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  RotateCcw,
  Send,
  Loader2,
  FolderSync,
  Upload,
  Trash2,
  FileText,
  Sparkles,
  Gauge,
  Square
} from 'lucide-react';
import SenecaBalanceIcon from '../Common/SenecaBalanceIcon.jsx';
import { ImperialCornerAccents } from '../Common/ClassicalAppArchitecture.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { obtenerResumenSeneca } from '../../services/db.js';
import { useChatRag } from '../../hooks/useChatRag.js';

const PRESTAMISTA_QUICK_CHIPS = [
  {
    label: 'Resumen operativo de hoy',
    prompt: 'Resumen operativo de hoy'
  },
  {
    label: 'Si presto ₡200,000 al 20% en 4 cuotas, ¿cuánto queda cada cuota?',
    prompt: 'Si presto ₡200,000 al 20% en 4 cuotas, ¿cuánto queda cada cuota?'
  },
  {
    label: 'Reglas de atrasos y renovaciones',
    prompt: 'Reglas de atrasos y renovaciones'
  },
  {
    label: 'Políticas de privacidad y uso',
    prompt: 'Políticas de privacidad y uso'
  }
];

const ADMIN_QUICK_CHIPS = [
  {
    label: 'Arquitectura técnica de la plataforma',
    prompt: 'Arquitectura técnica de la plataforma'
  },
  {
    label: 'Políticas de gobernanza y auditoría',
    prompt: 'Políticas de gobernanza y auditoría'
  },
  {
    label: 'Matriz de roles y permisos',
    prompt: 'Matriz de roles y permisos'
  }
];

function sanitizeUiText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/([A-Za-zÁÉÍÓÚÑáéíóúñ0-9])\*\*([^*\n]+)\*\*/g, '$1 $2')
    .replace(/\*\*([^*\n]+)\*\*([A-Za-zÁÉÍÓÚÑáéíóúñ0-9])/g, '$1 $2')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/([A-Za-zÁÉÍÓÚÑáéíóúñ0-9])__([^_\n]+)__/g, '$1 $2')
    .replace(/__([^_\n]+)__([A-Za-zÁÉÍÓÚÑáéíóúñ0-9])/g, '$1 $2')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*\|\s*/gm, '')
    .replace(/\s*\|\s*$/gm, '')
    .replace(/\s*\|\s*/g, ' — ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatColones(amount) {
  const num = Number(amount || 0);
  return `₡${Math.round(num).toLocaleString('es-CR')}`;
}

function formatFechaLegible(isoString) {
  if (!isoString) return 'Sin sincronizaciones previas';
  const fecha = new Date(isoString);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  return fecha
    .toLocaleString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    .replaceAll('/', '-');
}

function clampPosition(x, y, width, height) {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const margin = 12;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY)
  };
}

function normalizePromptKey(text) {
  return String(text || '').trim().toLowerCase();
}

export function SenecaAssistantModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { usuario, user } = useAuth();
  const currentUser = usuario || user;
  const isAdmin =
    String(currentUser?.rol || '').trim().toUpperCase() === 'ADMINISTRADOR';

  const [activeTab, setActiveTab] = useState('consultas');
  const effectiveTab = isAdmin ? activeTab : 'consultas';
  const [inputValue, setInputValue] = useState('');
  const [quickSummary, setQuickSummary] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  );

  const windowRef = useRef(null);
  const chatScrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragStateRef = useRef(null);

  const {
    mensajes,
    cargandoStream,
    errorStream,
    estadoRag,
    cargandoEstado,
    accionEnCurso,
    avisoAccion,
    cargarEstadoRag,
    enviarPregunta,
    cancelarStream,
    limpiarChat,
    subirDocumento,
    eliminarDocumento,
    sincronizarDriveAhora,
    cambiarPlan
  } = useChatRag();

  useEffect(() => {
    if (!isAdmin && activeTab !== 'consultas') {
      setActiveTab('consultas');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth <= 640;
      setIsMobileViewport(mobile);
      if (!mobile && windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect();
        setPosition((prev) =>
          prev ? clampPosition(prev.x, prev.y, rect.width, rect.height) : prev
        );
      }
    };
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    if (!isAdmin) {
      setIsSummaryLoading(true);
      obtenerResumenSeneca()
        .then((res) => {
          if (!cancelled && res?.resumen) {
            setQuickSummary(res.resumen);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setIsSummaryLoading(false);
        });
    } else {
      cargarEstadoRag();
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, isAdmin, cargarEstadoRag]);

  useEffect(() => {
    if (!isOpen) return;
    if (chatScrollRef.current && effectiveTab === 'consultas') {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [mensajes, cargandoStream, isOpen, effectiveTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        cancelarStream();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, cancelarStream]);

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setPosition(
        clampPosition(drag.origX + dx, drag.origY + dy, drag.width, drag.height)
      );
    };
    const handlePointerUp = () => {
      dragStateRef.current = null;
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
  }, [isDragging]);

  const askedSet = useMemo(() => {
    const set = new Set();
    for (const msg of mensajes) {
      if (msg.rol === 'usuario') {
        set.add(normalizePromptKey(msg.texto));
      }
    }
    return set;
  }, [mensajes]);

  const quickChips = isAdmin ? ADMIN_QUICK_CHIPS : PRESTAMISTA_QUICK_CHIPS;
  const availableChips = useMemo(
    () => quickChips.filter((chip) => !askedSet.has(normalizePromptKey(chip.prompt))),
    [quickChips, askedSet]
  );

  const handleCloseModal = useCallback(() => {
    cancelarStream();
    onClose();
  }, [cancelarStream, onClose]);

  const handleHeaderPointerDown = useCallback(
    (e) => {
      if (isMobileViewport) return;
      if (e.target.closest('button')) return;
      const el = windowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: rect.left,
        origY: rect.top,
        width: rect.width,
        height: rect.height
      };
      setPosition({ x: rect.left, y: rect.top });
      setIsDragging(true);
    },
    [isMobileViewport]
  );

  const handleSendQuestion = useCallback(
    async (rawText) => {
      const texto = String(rawText || '').trim();
      if (!texto || cargandoStream) return;
      setInputValue('');
      setActiveTab('consultas');
      await enviarPregunta(texto);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    },
    [cargandoStream, enviarPregunta]
  );

  const handleResetConversation = useCallback(() => {
    cancelarStream();
    limpiarChat();
    setInputValue('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  }, [cancelarStream, limpiarChat]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      await subirDocumento(file);
    },
    [subirDocumento]
  );

  if (!isOpen) return null;

  const bgPanel = isDark ? 'rgba(13, 21, 34, 0.97)' : 'rgba(255, 253, 248, 0.98)';
  const surfaceBg = isDark ? 'rgba(23, 35, 54, 0.92)' : '#F8F5EC';
  const surfaceCardBg = isDark ? 'rgba(18, 28, 44, 0.92)' : '#FFFFFF';
  const borderSubtle = isDark ? 'rgba(212, 175, 55, 0.24)' : 'rgba(197, 160, 89, 0.28)';
  const textPrimary = isDark ? '#F6F3EB' : '#162032';
  const textSecondary = isDark ? '#CBD5E1' : '#475569';
  const textMuted = isDark ? '#94A3B8' : '#64748B';
  const goldAccent = isDark ? '#E5C97B' : '#8C6B23';
  const goldBgSoft = isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(197, 160, 89, 0.14)';

  const modalPositionStyle = isMobileViewport
    ? {
        left: '10px',
        right: '10px',
        bottom: '10px'
      }
    : position
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`
        }
      : {
          right: '24px',
          bottom: '24px'
        };

  const documents = Array.isArray(estadoRag?.documentos) ? estadoRag.documentos : [];
  const planInfo = estadoRag?.plan || {
    id: 'gratis',
    nombre: 'Plan Estándar',
    maxDocumentos: 10,
    maxPreguntasMes: 200,
    usadasMes: 0,
    documentosActuales: documents.length,
    tokensMes: 0
  };
  const driveInfo = estadoRag?.drive || {
    carpetaNombre: 'Aureus Manager',
    vinculada: true,
    ultimaSincronizacion: null
  };

  const preguntasMax = Math.max(1, Number(planInfo.maxPreguntasMes || 0));
  const preguntasPct =
    Number(planInfo.maxPreguntasMes) === 0
      ? 100
      : Math.min(100, Math.round((Number(planInfo.usadasMes || 0) / preguntasMax) * 100));

  const docsMax = Math.max(1, Number(planInfo.maxDocumentos || 10));
  const docsPct = Math.min(
    100,
    Math.round((Number(planInfo.documentosActuales || 0) / docsMax) * 100)
  );

  const modalContent = (
    <div
      ref={windowRef}
      data-testid="seneca-floating-window"
      role="dialog"
      aria-label={isAdmin ? 'Asistente Séneca Administrativo' : 'Asistente Séneca'}
      style={{
        position: 'fixed',
        zIndex: 9500,
        ...modalPositionStyle,
        width: isMobileViewport ? 'calc(100vw - 20px)' : '470px',
        height: isMobileViewport ? 'calc(100dvh - 80px)' : 'min(640px, calc(100dvh - 96px))',
        maxHeight: isMobileViewport ? 'calc(100dvh - 80px)' : 'calc(100dvh - 96px)',
        backgroundColor: bgPanel,
        border: `1.5px solid ${borderSubtle}`,
        borderRadius: isMobileViewport ? '20px' : '24px',
        boxShadow: isDark
          ? '0 26px 64px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 175, 55, 0.16)'
          : '0 24px 60px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(197, 160, 89, 0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(18px)'
      }}
    >
      <ImperialCornerAccents />

      {/* Encabezado arrastrable */}
      <div
        data-testid="seneca-drag-header"
        onPointerDown={handleHeaderPointerDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '13px 16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 28, 44, 0.98) 0%, rgba(25, 42, 66, 0.96) 100%)'
            : 'linear-gradient(135deg, #162032 0%, #24344D 100%)',
          borderBottom: `1px solid ${borderSubtle}`,
          cursor: isMobileViewport ? 'default' : isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B48B22 100%)',
              color: '#101C2C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(212, 175, 55, 0.35)'
            }}
          >
            <SenecaBalanceIcon size={20} color="#101C2C" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {isAdmin ? 'Séneca Administrativo' : 'Séneca'}
            </div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#E5C97B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {isAdmin
                ? 'Consultor documental y de plataforma'
                : 'Asesor financiero y operativo'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            title="Reiniciar conversación"
            aria-label="Reiniciar conversación"
            onClick={handleResetConversation}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            title="Cerrar ventana"
            aria-label="Cerrar ventana"
            onClick={handleCloseModal}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Pestañas segmentadas exclusivas para rol administrativo */}
      {isAdmin && (
        <div
          role="tablist"
          aria-label="Secciones de Séneca Administrativo"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: isDark ? '#101C2C' : '#F5F3ED',
            borderBottom: `1px solid ${borderSubtle}`
          }}
        >
          {[
            { id: 'consultas', label: 'Consultas', icon: Sparkles },
            { id: 'documentos', label: 'Documentos Drive', icon: FolderSync },
            { id: 'consumo', label: 'Consumo', icon: Gauge }
          ].map((tab) => {
            const isActive = effectiveTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '8px 6px',
                  borderRadius: '10px',
                  border: isActive
                    ? '1px solid rgba(255, 232, 163, 0.7)'
                    : isDark
                      ? '1px solid rgba(255, 255, 255, 0.12)'
                      : '1px solid #E5E0D5',
                  background: isActive
                    ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#FFFFFF',
                  color: isActive ? '#101C2C' : isDark ? '#FFFFFF' : '#252A31',
                  fontSize: '11.5px',
                  fontWeight: isActive ? 900 : 700,
                  cursor: 'pointer',
                  transition: 'all 140ms ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <IconComponent size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Cuerpo scrollable */}
      <div
        ref={chatScrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {effectiveTab === 'consultas' && (
          <>
            {/* Resumen operativo rapido para prestamista e introduccion contextual */}
            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {!isAdmin && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '8px'
                  }}
                >
                  <div
                    style={{
                      backgroundColor: surfaceCardBg,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: textMuted
                      }}
                    >
                      Cobros hoy
                    </div>
                    <div
                      style={{
                        marginTop: '3px',
                        fontSize: '14px',
                        fontWeight: 900,
                        color: textPrimary,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {isSummaryLoading && !quickSummary
                        ? '...'
                        : quickSummary?.cobrosHoyCount ?? 0}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: surfaceCardBg,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: textMuted
                      }}
                    >
                      Zonas activas
                    </div>
                    <div
                      style={{
                        marginTop: '3px',
                        fontSize: '14px',
                        fontWeight: 900,
                        color: goldAccent,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {isSummaryLoading && !quickSummary
                        ? '...'
                        : quickSummary?.zonasActivasCount ?? 0}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: surfaceCardBg,
                      border: `1px solid ${borderSubtle}`,
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: textMuted
                      }}
                    >
                      Total por cobrar
                    </div>
                    <div
                      style={{
                        marginTop: '3px',
                        fontSize: '13px',
                        fontWeight: 900,
                        color: isDark ? '#52B796' : '#397D67',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {isSummaryLoading && !quickSummary
                        ? '...'
                        : formatColones(quickSummary?.totalPorCobrar ?? 0)}
                    </div>
                  </div>
                </div>
              )}

              <p
                style={{
                  margin: 0,
                  fontSize: '12.8px',
                  lineHeight: 1.5,
                  fontWeight: 600,
                  color: textSecondary
                }}
              >
                {isAdmin
                  ? 'Consulta la arquitectura técnica, políticas de gobernanza, auditoría y matriz de roles de Aureus Manager.'
                  : 'Consulta tus cobros del día, realiza cálculos con tus cifras o revisa las políticas y guías de uso de Aureus Manager.'}
              </p>
            </div>

            {/* Chips iniciales de consulta */}
            {availableChips.length > 0 && (
              <div
                data-testid="seneca-initial-recommendations"
                style={{
                  backgroundColor: surfaceBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '16px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: textMuted
                  }}
                >
                  Consultas sugeridas
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      isMobileViewport || isAdmin ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: '7px'
                  }}
                >
                  {availableChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      disabled={cargandoStream}
                      onClick={() => handleSendQuestion(chip.prompt)}
                      style={{
                        padding: '9px 10px',
                        borderRadius: '11px',
                        border: `1px solid ${borderSubtle}`,
                        backgroundColor: goldBgSoft,
                        color: goldAccent,
                        fontSize: '12px',
                        fontWeight: 800,
                        lineHeight: 1.3,
                        textAlign: 'left',
                        cursor: cargandoStream ? 'not-allowed' : 'pointer',
                        opacity: cargandoStream ? 0.6 : 1
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mensajes del chat */}
            {mensajes.map((msg) => {
              const isUser = msg.rol === 'usuario';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '6px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '92%',
                      padding: '11px 13px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      backgroundColor: isUser
                        ? isDark
                          ? '#D4AF37'
                          : '#162032'
                        : surfaceCardBg,
                      color: isUser ? (isDark ? '#101C2C' : '#FFFFFF') : textPrimary,
                      border: isUser ? 'none' : `1px solid ${borderSubtle}`,
                      fontSize: '13px',
                      fontWeight: isUser ? 700 : 500,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.texto
                      ? sanitizeUiText(msg.texto)
                      : !isUser && cargandoStream
                        ? isAdmin
                          ? 'Consultando documentos autorizados...'
                          : 'Consultando información de tu cartera...'
                        : ''}
                  </div>

                  {!isUser && Array.isArray(msg.fuentes) && msg.fuentes.length > 0 && (
                    <div
                      data-testid="seneca-followup-suggestions"
                      style={{
                        maxWidth: '94%',
                        backgroundColor: surfaceBg,
                        border: `1px solid ${borderSubtle}`,
                        borderRadius: '12px',
                        padding: '9px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: textMuted
                        }}
                      >
                        Fuentes de respaldo
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {msg.fuentes.map((f) => (
                          <span
                            key={`${msg.id}-src-${f.id}-${f.documentoId}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '8px',
                              backgroundColor: goldBgSoft,
                              border: `1px solid ${borderSubtle}`,
                              color: goldAccent,
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            <span>[{f.id}]</span>
                            <span>{sanitizeUiText(f.nombre)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {errorStream && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: isDark
                    ? 'rgba(220, 38, 38, 0.16)'
                    : 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.36)',
                  color: isDark ? '#FCA5A5' : '#991B1B',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                {sanitizeUiText(errorStream)}
              </div>
            )}
          </>
        )}

        {isAdmin && effectiveTab === 'documentos' && (
          <>
            {avisoAccion && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor:
                    avisoAccion.tipo === 'ok'
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(16, 185, 129, 0.12)'
                      : isDark
                        ? 'rgba(220, 38, 38, 0.16)'
                        : 'rgba(220, 38, 38, 0.08)',
                  border:
                    avisoAccion.tipo === 'ok'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid rgba(220, 38, 38, 0.35)',
                  color:
                    avisoAccion.tipo === 'ok'
                      ? isDark
                        ? '#6EE7B7'
                        : '#065F46'
                      : isDark
                        ? '#FCA5A5'
                        : '#991B1B',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                {sanitizeUiText(avisoAccion.texto)}
              </div>
            )}

            {/* Franja ejecutiva limpia de carpeta vinculada en Google Drive */}
            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  minWidth: 0
                }}
              >
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: textPrimary
                  }}
                >
                  Carpeta vinculada: {driveInfo.carpetaNombre || 'Aureus Manager'}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: textMuted
                  }}
                >
                  Última sincronización: {formatFechaLegible(driveInfo.ultimaSincronizacion)}
                </div>
              </div>

              <button
                type="button"
                disabled={accionEnCurso}
                onClick={sincronizarDriveAhora}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 13px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #D4B46A 0%, #B69A55 100%)',
                  color: '#101C2C',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: accionEnCurso ? 'not-allowed' : 'pointer',
                  opacity: accionEnCurso ? 0.65 : 1,
                  flexShrink: 0
                }}
              >
                <FolderSync size={14} />
                <span>Sincronizar ahora</span>
              </button>
            </div>

            {/* Carga directa */}
            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px dashed ${borderSubtle}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: textPrimary }}>
                  Subir documento desde tu equipo
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: textMuted }}>
                  Formatos admitidos: TXT, Markdown, CSV, JSON, PDF o Word
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.md,.csv,.json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                disabled={accionEnCurso}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#D4AF37',
                  color: '#101C2C',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: accionEnCurso ? 'not-allowed' : 'pointer',
                  flexShrink: 0
                }}
              >
                <Upload size={14} />
                <span>Subir archivo</span>
              </button>
            </div>

            {/* Lista de documentos indexados */}
            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: textMuted
                  }}
                >
                  Documentos indexados
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: goldAccent }}>
                  {documents.length} archivos
                </span>
              </div>

              {cargandoEstado && documents.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: textMuted, padding: '8px 0' }}>
                  Cargando inventario documental...
                </div>
              ) : documents.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: textMuted, padding: '8px 0' }}>
                  Todavía no has indexado reglamentos. Sincroniza tus archivos o sube un documento.
                </div>
              ) : (
                documents.map((doc) => {
                  const isDrive = doc.origen === 'drive' || doc.origen === 'google_drive';
                  const isDocAdmin =
                    String(doc.nivel_acceso || '').toUpperCase() === 'ADMIN' ||
                    String(doc.ruta_carpeta || '').toLowerCase().includes('admin');
                  const estadoLabel =
                    doc.estado === 'indexado' || doc.estado === 'listo'
                      ? 'Indexado'
                      : doc.estado === 'error'
                        ? 'Error'
                        : 'Pendiente';
                  return (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '9px 10px',
                        borderRadius: '12px',
                        backgroundColor: surfaceCardBg,
                        border: `1px solid ${borderSubtle}`
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: 0
                        }}
                      >
                        <FileText size={16} color={goldAccent} style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 800,
                                color: textPrimary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '210px'
                              }}
                            >
                              {doc.nombre}
                            </span>
                            <span
                              style={{
                                padding: '2px 7px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor: isDocAdmin
                                  ? isDark
                                    ? 'rgba(212, 180, 106, 0.18)'
                                    : 'rgba(182, 154, 85, 0.16)'
                                  : isDark
                                    ? 'rgba(57, 125, 103, 0.22)'
                                    : 'rgba(57, 125, 103, 0.14)',
                                border: isDocAdmin
                                  ? '1px solid rgba(182, 154, 85, 0.42)'
                                  : '1px solid rgba(57, 125, 103, 0.38)',
                                color: isDocAdmin
                                  ? isDark
                                    ? '#E5C97B'
                                    : '#7D601E'
                                  : isDark
                                    ? '#6EE7B7'
                                    : '#265E4C',
                                flexShrink: 0
                              }}
                            >
                              {isDocAdmin ? 'Administración' : 'Prestamistas'}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '3px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: textMuted
                            }}
                          >
                            <span>{isDrive ? 'Google Drive' : 'Carga directa'}</span>
                            <span>·</span>
                            <span>{doc.num_fragmentos || 0} fragmentos</span>
                            <span>·</span>
                            <span style={{ color: goldAccent }}>{estadoLabel}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Eliminar documento"
                        aria-label={`Eliminar ${doc.nombre}`}
                        disabled={accionEnCurso}
                        onClick={() => eliminarDocumento(doc.id)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: '1px solid rgba(220, 38, 38, 0.28)',
                          backgroundColor: 'rgba(220, 38, 38, 0.08)',
                          color: isDark ? '#FCA5A5' : '#B91C1C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: accionEnCurso ? 'not-allowed' : 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {isAdmin && effectiveTab === 'consumo' && (
          <>
            {avisoAccion && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor:
                    avisoAccion.tipo === 'ok'
                      ? isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : 'rgba(16, 185, 129, 0.12)'
                      : isDark
                        ? 'rgba(220, 38, 38, 0.16)'
                        : 'rgba(220, 38, 38, 0.08)',
                  border:
                    avisoAccion.tipo === 'ok'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid rgba(220, 38, 38, 0.35)',
                  color:
                    avisoAccion.tipo === 'ok'
                      ? isDark
                        ? '#6EE7B7'
                        : '#065F46'
                      : isDark
                        ? '#FCA5A5'
                        : '#991B1B',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                {sanitizeUiText(avisoAccion.texto)}
              </div>
            )}

            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: textMuted
                    }}
                  >
                    Plan activo de la cuenta
                  </div>
                  <div
                    style={{
                      marginTop: '2px',
                      fontSize: '17px',
                      fontWeight: 900,
                      color: textPrimary
                    }}
                  >
                    {planInfo.nombre}
                  </div>
                </div>
                <span
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    backgroundColor: goldBgSoft,
                    border: `1px solid ${borderSubtle}`,
                    color: goldAccent,
                    fontSize: '11px',
                    fontWeight: 900
                  }}
                >
                  {planInfo.tokensMes || 0} tokens este mes
                </span>
              </div>

              {/* Barra consultas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: textSecondary
                  }}
                >
                  <span>Consultas mensuales</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: textPrimary }}>
                    {planInfo.usadasMes} de {planInfo.maxPreguntasMes}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '9px',
                    borderRadius: '999px',
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(15, 23, 42, 0.1)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${preguntasPct}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background:
                        preguntasPct >= 95
                          ? 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)'
                          : 'linear-gradient(90deg, #D4AF37 0%, #E5C97B 100%)',
                      transition: 'width 200ms ease'
                    }}
                  />
                </div>
              </div>

              {/* Barra documentos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: textSecondary
                  }}
                >
                  <span>Documentos almacenados</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: textPrimary }}>
                    {planInfo.documentosActuales} de {planInfo.maxDocumentos}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '9px',
                    borderRadius: '999px',
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(15, 23, 42, 0.1)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${docsPct}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #397D67 0%, #52B796 100%)',
                      transition: 'width 200ms ease'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Selector de plan */}
            <div
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '9px'
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: textPrimary
                }}
              >
                Cambiar nivel de capacidad
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={accionEnCurso}
                  onClick={() => cambiarPlan({ planId: 'gratis' })}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border:
                      planInfo.id === 'gratis'
                        ? '1px solid rgba(255, 232, 163, 0.7)'
                        : `1px solid ${borderSubtle}`,
                    background:
                      planInfo.id === 'gratis'
                        ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                        : isDark
                          ? '#101C2C'
                          : '#FFFFFF',
                    color:
                      planInfo.id === 'gratis'
                        ? '#101C2C'
                        : isDark
                          ? '#FFFFFF'
                          : '#252A31',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: accionEnCurso ? 'not-allowed' : 'pointer'
                  }}
                >
                  Plan Estándar
                </button>
                <button
                  type="button"
                  disabled={accionEnCurso}
                  onClick={() => cambiarPlan({ planId: 'pro' })}
                  style={{
                    flex: 1,
                    minWidth: '130px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border:
                      planInfo.id === 'pro'
                        ? '1px solid rgba(255, 232, 163, 0.7)'
                        : `1px solid ${borderSubtle}`,
                    background:
                      planInfo.id === 'pro'
                        ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                        : isDark
                          ? '#101C2C'
                          : '#FFFFFF',
                    color:
                      planInfo.id === 'pro'
                        ? '#101C2C'
                        : isDark
                          ? '#FFFFFF'
                          : '#252A31',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: accionEnCurso ? 'not-allowed' : 'pointer'
                  }}
                >
                  Plan Ejecutivo Pro
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Barra inferior de escritura (activa en Consultas) */}
      {effectiveTab === 'consultas' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion(inputValue);
          }}
          style={{
            padding: '10px 14px 12px',
            borderTop: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            display: 'flex',
            flexDirection: 'column',
            gap: '7px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isAdmin
                  ? 'Escribe tu consulta administrativa o técnica...'
                  : 'Escribe tu consulta o cálculo...'
              }
              disabled={cargandoStream}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${borderSubtle}`,
                backgroundColor: surfaceCardBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            {cargandoStream ? (
              <button
                type="button"
                title="Detener respuesta"
                aria-label="Detener respuesta"
                onClick={cancelarStream}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid rgba(220, 38, 38, 0.45)',
                  backgroundColor: 'rgba(220, 38, 38, 0.14)',
                  color: isDark ? '#FCA5A5' : '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <Square size={15} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                aria-label="Enviar consulta"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: inputValue.trim()
                    ? 'linear-gradient(135deg, #E5C97B 0%, #D4AF37 100%)'
                    : isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(15, 23, 42, 0.08)',
                  color: inputValue.trim() ? '#101C2C' : textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                  flexShrink: 0
                }}
              >
                {cargandoStream ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            )}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: textMuted,
              textAlign: 'center'
            }}
          >
            Séneca IA es un asesor de solo lectura; no toma decisiones automatizadas ni sustituye la verificación en tus módulos.
          </div>
        </form>
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default SenecaAssistantModal;

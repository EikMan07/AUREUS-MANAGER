import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, RotateCcw, Send, Loader2, MapPin } from 'lucide-react';
import SenecaBalanceIcon from '../Common/SenecaBalanceIcon.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { consultarSeneca, obtenerResumenSeneca } from '../../services/db.js';
import { sanitizeUserFacingMessage } from '../../services/apiClient.js';

const INITIAL_RECOMMENDATIONS = [
  '¿Cuántos cobros y cuánto dinero hay por ubicación?',
  '¿Cuánto dinero me debe actualmente cada cliente?',
  '¿Cuáles clientes tienen cobros hoy o atrasos acumulados?',
];

function formatColones(amount) {
  const numeric = Number(amount || 0);
  const rounded = Math.round(Number.isFinite(numeric) ? numeric : 0);
  return `₡${rounded.toLocaleString('en-US')}`;
}

function sanitizeUiText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\bPostgreSQL\b/gi, 'registro financiero')
    .replace(/\bbases de datos\b/gi, 'registros financieros')
    .replace(/\bbase de datos\b/gi, 'registro financiero')
    .replace(/\b(backend|frontend|servidor|aplicativo)\b/gi, 'Aureus Manager')
    .replace(/\b(endpoint|API)\b/gi, 'conexión')
    .replace(/\bSQL\b/gi, 'consulta')
    .replace(/\bJSON\b/gi, 'resumen')
    .replace(/\bsistemas?\b/gi, 'control de cobros')
    .replace(/\bcarteras?\b/gi, 'registros activos')
    .replace(/\s*\(([^()]*)\)/g, (_, inner) => {
      const cleaned = inner.trim();
      return cleaned ? `, ${cleaned}` : '';
    })
    .replace(/[()]/g, ' ')
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 de $2')
    .replace(/\s*\/\s*/g, ' y ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function normalizeQuestionKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function SenecaAssistantModal({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [quickSummary, setQuickSummary] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const askedSet = useMemo(() => new Set(askedQuestions), [askedQuestions]);

  const availableInitialRecommendations = useMemo(
    () => INITIAL_RECOMMENDATIONS.filter((q) => !askedSet.has(normalizeQuestionKey(q))),
    [askedSet]
  );

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return i;
    }
    return -1;
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsSummaryLoading(true);
    obtenerResumenSeneca()
      .then((res) => {
        if (active && res?.resumen) {
          setQuickSummary(res.resumen);
        }
      })
      .catch(() => {
        // Silencioso si no hay conectividad en la carga inicial de métricas rápidas
      })
      .finally(() => {
        if (active) setIsSummaryLoading(false);
      });

    const focusTimer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 120);

    return () => {
      active = false;
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sendQuestion = useCallback(
    async (rawQuestion) => {
      const pregunta = String(rawQuestion || '').trim();
      if (!pregunta || isSending) return;

      const historyPayload = messages.slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const userMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: pregunta,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsSending(true);

      try {
        const result = await consultarSeneca(pregunta, historyPayload);
        const normalizedKey = normalizeQuestionKey(pregunta);
        if (normalizedKey) {
          setAskedQuestions((prev) => (prev.includes(normalizedKey) ? prev : [...prev, normalizedKey]));
        }
        const assistantMessage = {
          id: `sen-${Date.now()}`,
          role: 'assistant',
          content: sanitizeUiText(result?.respuesta || 'Sin resultados disponibles.'),
          tarjetas: Array.isArray(result?.tarjetas) ? result.tarjetas : [],
          sugerencias: Array.isArray(result?.sugerencias) ? result.sugerencias : [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const fallbackConsultaMsg =
          'En este momento no pude completar tu consulta. Inténtalo nuevamente en unos segundos.';
        const rawErr =
          !err?.status || err.status >= 500
            ? fallbackConsultaMsg
            : err?.userMessage || err?.message || '';
        const errorText = sanitizeUiText(
          sanitizeUserFacingMessage(rawErr, fallbackConsultaMsg)
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errorText,
            tarjetas: [],
            sugerencias: [],
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages]
  );

  const handleResetConversation = useCallback(() => {
    setMessages([]);
    setAskedQuestions([]);
    setInputValue('');
    if (inputRef.current) inputRef.current.focus();
  }, []);

  if (!isOpen) return null;

  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const appBg = isDark ? '#101C2C' : '#F5F3ED';
  const elevatedBg = isDark ? '#1D2E44' : '#FAF8F3';
  const borderSubtle = isDark ? '#283B54' : '#E5E0D5';
  const goldAccent = isDark ? '#D4B46A' : '#B69A55';
  const goldSoftBg = isDark ? '#232F41' : '#F7F2E4';
  const goldBorder = isDark ? 'rgba(212, 180, 106, 0.42)' : '#D5C295';
  const primaryText = isDark ? '#F5F3ED' : '#252A31';
  const secondaryText = isDark ? '#CBD5E1' : '#4A5058';
  const mutedText = isDark ? '#94A3B8' : '#6E757F';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Séneca asesor informativo"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: isDark ? 'rgba(6, 11, 19, 0.72)' : 'rgba(16, 28, 44, 0.48)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          height: 'min(760px, calc(100dvh - 24px))',
          maxHeight: 'calc(100dvh - 24px)',
          backgroundColor: appBg,
          borderRadius: '20px',
          border: `1px solid ${goldBorder}`,
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.55)'
            : '0 20px 50px rgba(37, 42, 49, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Cabecera Fija */}
        <div
          style={{
            flexShrink: 0,
            padding: '14px 16px',
            backgroundColor: surfaceBg,
            borderBottom: `1px solid ${borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(182, 154, 85, 0.35)',
              }}
            >
              <SenecaBalanceIcon size={25} color="#101C2C" />
            </div>

            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: '18px',
                  lineHeight: 1.15,
                  color: primaryText,
                }}
              >
                Séneca
              </h2>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: mutedText,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Asesor informativo de cobros, zonas y deudas
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleResetConversation}
              aria-label="Limpiar conversación"
              title="Limpiar conversación"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: `1px solid ${borderSubtle}`,
                backgroundColor: elevatedBg,
                color: secondaryText,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <RotateCcw size={16} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de Séneca"
              title="Cerrar"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: `1px solid ${borderSubtle}`,
                backgroundColor: elevatedBg,
                color: primaryText,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Área de Conversación */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Tarjeta Ejecutiva de Bienvenida con 3 Mini-Métricas en Vivo */}
          <div
            style={{
              backgroundColor: surfaceBg,
              border: `1px solid ${goldBorder}`,
              borderRadius: '16px',
              padding: '14px',
              boxShadow: isDark
                ? '0 6px 18px rgba(0, 0, 0, 0.28)'
                : '0 4px 14px rgba(37, 42, 49, 0.05)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  backgroundColor: elevatedBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '12px',
                  padding: '9px 8px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: mutedText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Cobros hoy
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    fontSize: '15px',
                    fontWeight: 900,
                    color: primaryText,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isSummaryLoading && !quickSummary
                    ? '...'
                    : quickSummary?.cobrosHoyCount ?? 0}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: elevatedBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '12px',
                  padding: '9px 8px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: mutedText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Zonas activas
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    fontSize: '15px',
                    fontWeight: 900,
                    color: goldAccent,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isSummaryLoading && !quickSummary
                    ? '...'
                    : quickSummary?.zonasActivasCount ?? 0}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: elevatedBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '12px',
                  padding: '9px 8px',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: mutedText,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Total por cobrar
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    fontSize: '13.5px',
                    fontWeight: 900,
                    color: isDark ? '#52B796' : '#397D67',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isSummaryLoading && !quickSummary
                    ? '...'
                    : formatColones(quickSummary?.totalPorCobrar ?? 0)}
                </div>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '13.5px',
                lineHeight: 1.5,
                fontWeight: 600,
                color: secondaryText,
              }}
            >
              Pregúntame cuántos cobros hay en cualquier ubicación, cuánto debe una persona específica o quiénes tienen pagos pendientes hoy.
            </p>
          </div>

          {/* 3 Recomendaciones Iniciales adentro del propio chat (sin repetir una vez usadas) */}
          {availableInitialRecommendations.length > 0 && (
            <div
              data-testid="seneca-initial-recommendations"
              style={{
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: mutedText,
                }}
              >
                PREGUNTAS RECOMENDADAS
              </div>
              {availableInitialRecommendations.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendQuestion(question)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${goldBorder}`,
                    backgroundColor: goldSoftBg,
                    color: isDark ? '#E5C97B' : '#7D652E',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    textAlign: 'left',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.6 : 1,
                  }}
                >
                  {sanitizeUiText(question)}
                </button>
              ))}
            </div>
          )}

          {/* Historial de Mensajes */}
          {messages.map((msg, msgIndex) => {
            if (msg.role === 'user') {
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '86%',
                    backgroundColor: goldAccent,
                    color: '#101C2C',
                    borderRadius: '16px 16px 4px 16px',
                    padding: '10px 14px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    boxShadow: '0 4px 12px rgba(182, 154, 85, 0.25)',
                  }}
                >
                  {msg.content}
                </div>
              );
            }

            const isLatestAssistant = msgIndex === lastAssistantIndex;
            const visibleSuggestions = isLatestAssistant
              ? (Array.isArray(msg.sugerencias) ? msg.sugerencias : [])
                  .filter((sug) => !askedSet.has(normalizeQuestionKey(sug)))
                  .slice(0, 3)
              : [];

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: 'flex-start',
                  width: '100%',
                  backgroundColor: surfaceBg,
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: '16px 16px 16px 4px',
                  padding: '13px 14px',
                  boxSizing: 'border-box',
                  boxShadow: isDark
                    ? '0 6px 18px rgba(0, 0, 0, 0.28)'
                    : '0 4px 12px rgba(37, 42, 49, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: goldAccent,
                  }}
                >
                  <SenecaBalanceIcon size={16} color={goldAccent} />
                  <span>Séneca</span>
                </div>

                <div
                  style={{
                    fontSize: '13.5px',
                    lineHeight: 1.55,
                    fontWeight: 600,
                    color: primaryText,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.content}
                </div>

                {/* Tarjetas de Datos Verificados */}
                {Array.isArray(msg.tarjetas) && msg.tarjetas.length > 0 && (
                  <div
                    style={{
                      marginTop: '11px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr)',
                      gap: '8px',
                    }}
                  >
                    {msg.tarjetas.map((card, idx) => (
                      <div
                        key={`${msg.id}-card-${idx}`}
                        style={{
                          backgroundColor: elevatedBg,
                          border: `1px solid ${borderSubtle}`,
                          borderRadius: '12px',
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '13.5px',
                                fontWeight: 800,
                                color: primaryText,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <MapPin size={13} color={goldAccent} style={{ flexShrink: 0 }} />
                              <span>{sanitizeUiText(card.titulo)}</span>
                            </div>
                            {card.subtitulo && (
                              <div
                                style={{
                                  marginTop: '2px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  color: mutedText,
                                }}
                              >
                                {sanitizeUiText(card.subtitulo)}
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {card.monto && (
                              <div
                                style={{
                                  fontSize: '13.5px',
                                  fontWeight: 900,
                                  color: goldAccent,
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {sanitizeUiText(card.monto)}
                              </div>
                            )}
                            {card.estado && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '2px',
                                  padding: '2px 7px',
                                  borderRadius: '9999px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  backgroundColor: goldSoftBg,
                                  color: isDark ? '#E5C97B' : '#7D652E',
                                  border: `1px solid ${goldBorder}`,
                                }}
                              >
                                {sanitizeUiText(card.estado)}
                              </span>
                            )}
                          </div>
                        </div>

                        {card.detalle && (
                          <div
                            style={{
                              marginTop: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              lineHeight: 1.4,
                              color: secondaryText,
                            }}
                          >
                            {sanitizeUiText(card.detalle)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sugerencias de Seguimiento (únicamente en el último mensaje y filtradas sin repetir) */}
                {visibleSuggestions.length > 0 && (
                  <div
                    data-testid="seneca-followup-suggestions"
                    style={{
                      marginTop: '11px',
                      paddingTop: '10px',
                      borderTop: `1px solid ${borderSubtle}`,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    {visibleSuggestions.map((sug, sIdx) => (
                      <button
                        key={`${msg.id}-sug-${sIdx}`}
                        type="button"
                        disabled={isSending}
                        onClick={() => sendQuestion(sug)}
                        style={{
                          padding: '7px 11px',
                          borderRadius: '10px',
                          border: `1px solid ${goldBorder}`,
                          backgroundColor: goldSoftBg,
                          color: isDark ? '#E5C97B' : '#7D652E',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          textAlign: 'left',
                          cursor: isSending ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {sanitizeUiText(sug)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div
              style={{
                alignSelf: 'flex-start',
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '14px',
                padding: '10px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                color: mutedText,
              }}
            >
              <Loader2 size={16} className="animate-spin" color={goldAccent} />
              <span>Consultando tus registros en tiempo real...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Barra Inferior de Pregunta */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion(inputValue);
          }}
          style={{
            flexShrink: 0,
            padding: '12px 14px',
            backgroundColor: surfaceBg,
            borderTop: `1px solid ${borderSubtle}`,
          }}
        >
          <div
            className="cf-search-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: elevatedBg,
              border: `1px solid ${goldBorder}`,
              borderRadius: '16px',
              padding: '6px 6px 6px 14px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              maxLength={600}
              disabled={isSending}
              placeholder="Pregunta por una zona, el nombre de un cliente o cobros de hoy..."
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: 'transparent',
                color: primaryText,
                fontSize: '13.5px',
                fontWeight: 600,
                outline: 'none',
                border: 'none',
              }}
            />

            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              aria-label="Enviar consulta"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor:
                  isSending || !inputValue.trim()
                    ? isDark
                      ? '#2A394D'
                      : '#E5E0D5'
                    : goldAccent,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: isSending || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.18s ease',
              }}
            >
              <Send size={17} strokeWidth={2.2} color="#101C2C" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SenecaAssistantModal;

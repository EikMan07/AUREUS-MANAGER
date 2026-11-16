import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Scale, Lock, Bot, Check, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import {
  ClassicalLaurelDivider,
  ImperialCornerAccents
} from '../Common/ClassicalAppArchitecture.jsx';
import { LegalGovernanceModal } from './LegalGovernanceModal.jsx';

const CONSENT_VERSION = 'v1.0-2026';

function hasLocalConsent(userId) {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(`aureus_legal_consent_${userId}`) === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function MandatoryConsentModal() {
  // Todos los Hooks declarados al inicio antes de cualquier retorno condicional
  const { autenticado, usuario, aceptarConsentimientoLegal } = useAuth();
  const { isDark } = useTheme();
  const { language } = useAccessibility();

  const [acceptedCheckbox, setAcceptedCheckbox] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (usuario?.id && hasLocalConsent(usuario.id)) {
      setLocalUnlocked(true);
    } else {
      setLocalUnlocked(false);
    }
  }, [usuario?.id]);

  const alreadyConsented =
    Boolean(usuario?.consentimiento_aceptado) ||
    localUnlocked ||
    hasLocalConsent(usuario?.id);

  if (!autenticado || !usuario?.id || alreadyConsented) {
    return null;
  }
  if (typeof document === 'undefined') return null;

  const goldAccent = isDark ? '#D4B46A' : '#B69A55';
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F8F6F0';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.28)' : '#E5E0D5';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#CBD5E1' : '#4A5058';

  const handleConfirmConsent = async () => {
    if (!acceptedCheckbox || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await aceptarConsentimientoLegal(CONSENT_VERSION);
      try {
        window.localStorage.setItem(`aureus_legal_consent_${usuario.id}`, CONSENT_VERSION);
      } catch {
        // Ignorar errores de storage
      }
      setLocalUnlocked(true);
    } catch (err) {
      setErrorMsg(
        err?.userMessage || 'No fue posible registrar tu consentimiento. Inténtalo de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <>
      <div
        data-testid="mandatory-consent-overlay"
        data-lang={language}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100035,
          backgroundColor: 'rgba(9, 16, 26, 0.84)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          paddingBottom: '88px',
          boxSizing: 'border-box'
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mandatory-consent-title"
          data-testid="mandatory-consent-modal"
          style={{
            width: '100%',
            maxWidth: '580px',
            maxHeight: 'calc(100dvh - 108px)',
            backgroundColor: surfaceBg,
            color: textPrimary,
            borderRadius: '22px',
            border: `1.5px solid ${goldAccent}`,
            boxShadow: '0 28px 68px rgba(0, 0, 0, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          <ImperialCornerAccents isDark={isDark} />

          <div
            style={{
              padding: '20px 22px 14px 22px',
              borderBottom: `1px solid ${borderSubtle}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '13px',
                backgroundColor: isDark ? 'rgba(212, 180, 106, 0.14)' : '#F7F2E4',
                border: `1px solid ${goldAccent}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShieldCheck size={24} color={goldAccent} strokeWidth={2.2} />
            </div>
            <div>
              <h2
                id="mandatory-consent-title"
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: textPrimary }}
              >
                Consentimiento Informado y Protección de Datos
              </h2>
              <span style={{ fontSize: '12px', fontWeight: 700, color: goldAccent }}>
                Requisito obligatorio conforme a la Ley 8968 de Costa Rica · Versión v1.0-2026
              </span>
            </div>
          </div>

          <div
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <ClassicalLaurelDivider compact isDark={isDark} style={{ flexShrink: 0, margin: '0 auto 2px auto' }} />

            <div
              style={{
                backgroundColor: elevatedBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flexShrink: 0
              }}
            >
              <Scale size={18} color={goldAccent} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: textPrimary }}>
                  Uso Contable Privado
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', lineHeight: 1.5, color: textSecondary }}>
                  Aureus Manager es una herramienta administrativa privada; eres el único responsable de los préstamos, cobros y registros que administras en tu cuenta.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: elevatedBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flexShrink: 0
              }}
            >
              <Lock size={18} color={goldAccent} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: textPrimary }}>
                  Protección de Datos Ley 8968
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', lineHeight: 1.5, color: textSecondary }}>
                  Tus clientes, préstamos y apuntes son estrictamente privados, cuentas con exportación de tus propios datos desde Mi Perfil y resguardo de 30 días en Papelera.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: elevatedBg,
                border: `1px solid ${borderSubtle}`,
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flexShrink: 0
              }}
            >
              <Bot size={18} color={goldAccent} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: textPrimary }}>
                  Gobernanza de IA sin Decisiones Automatizadas
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', lineHeight: 1.5, color: textSecondary }}>
                  Séneca IA y la consulta de cédula operan únicamente en modo de lectura informativa; nunca puntúan, clasifican ni rechazan personas automáticamente.
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="btn-open-full-legal-from-consent"
              onClick={() => setLegalOpen(true)}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                padding: '2px 0',
                color: goldAccent,
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <FileText size={15} />
              <span>Leer documento completo</span>
            </button>

            <label
              data-testid="label-mandatory-consent-check"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: isDark ? 'rgba(212, 180, 106, 0.08)' : '#FBF8F1',
                border: `1px solid ${acceptedCheckbox ? goldAccent : borderSubtle}`,
                cursor: 'pointer',
                userSelect: 'none',
                flexShrink: 0
              }}
            >
              <input
                type="checkbox"
                data-testid="checkbox-mandatory-consent"
                checked={acceptedCheckbox}
                onChange={(e) => setAcceptedCheckbox(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '6px',
                  border: `1.5px solid ${goldAccent}`,
                  backgroundColor: acceptedCheckbox ? goldAccent : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px'
                }}
              >
                {acceptedCheckbox && <Check size={14} strokeWidth={3} color="#101C2C" />}
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, lineHeight: 1.45, color: textPrimary }}>
                He leído y acepto los Términos de Uso, la Política de Privacidad conforme a la Ley 8968 y las reglas de Gobernanza de Aureus Manager.
              </span>
            </label>

            {errorMsg && (
              <div
                role="alert"
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(220, 38, 38, 0.14)',
                  color: '#EF4444',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                {errorMsg}
              </div>
            )}
          </div>

          <div
            style={{
              padding: '14px 22px',
              borderTop: `1px solid ${borderSubtle}`,
              backgroundColor: surfaceBg,
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              data-testid="btn-confirm-mandatory-consent"
              disabled={!acceptedCheckbox || submitting}
              onClick={handleConfirmConsent}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '13px',
                background: acceptedCheckbox
                  ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                  : isDark
                    ? '#283B54'
                    : '#E5E0D5',
                border: acceptedCheckbox
                  ? isDark
                    ? '1px solid #F5E1A4'
                    : '1px solid #9E8342'
                  : '1px solid transparent',
                color: acceptedCheckbox ? '#101C2C' : textSecondary,
                fontSize: '14px',
                fontWeight: 900,
                cursor: !acceptedCheckbox || submitting ? 'not-allowed' : 'pointer',
                boxShadow: acceptedCheckbox ? '0 6px 18px rgba(182, 154, 85, 0.3)' : 'none'
              }}
            >
              {submitting ? 'Registrando consentimiento...' : 'Confirmar y Continuar al Panel'}
            </button>
          </div>
        </div>
      </div>

      <LegalGovernanceModal
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
        onAccept={() => setAcceptedCheckbox(true)}
      />
    </>,
    document.body
  );
}

export default MandatoryConsentModal;

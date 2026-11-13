import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Moon,
  Sun,
  XCircle,
  CheckCircle2,
  Coins,
  Users,
  Landmark,
  BarChart3,
  ShieldAlert,
  Trash2,
  Clock,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { AureusLogo } from '../../components/Common/AureusLogo.jsx';
import { SenecaRomanIcon } from '../../components/Common/SenecaRomanIcon.jsx';
import { CookieConsentBanner } from '../../components/Common/CookieConsentBanner.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './LandingPage.css';

const PROBLEMA_PAPEL_ITEMS = [
  'Pérdida de mucho tiempo buscando clientes hoja por hoja y sumando saldos a mano cada día.',
  'Descontrol cuando un cliente pide pasar su cobro para otro día o para la semana siguiente.',
  'Riesgo constante de que un cuaderno se moje, se pierda o se deteriore con toda la información.',
  'Imposibilidad de saber al instante cuánto dinero falta por cobrar en una zona específica.'
];

const SOLUCION_AUREUS_ITEMS = [
  'Agenda semanal de Lunes a Domingo con tus cobros ordenados y listos en un solo toque.',
  'Cálculo automático de cuotas, saldos pendientes, atrasos acumulados y pagos parciales.',
  'Reprogramación inteligente de fechas, hojas de ruta en PDF y cobros compartidos por día.',
  'Respaldo permanente de clientes, verificación por foto de cédula y consultas con inteligencia artificial.'
];

const MODULOS_LIST = [
  {
    title: 'Cobros',
    Icon: Coins,
    description:
      'Agenda interactiva de 7 días con acciones rápidas de Pago, Pasar de día y No Pago, delegación de cobros a otros cobradores y descarga de hoja de ruta en PDF.'
  },
  {
    title: 'Clientes',
    Icon: Users,
    description:
      'Directorio de clientes nacionales y extranjeros con lectura automática de cédula por foto, consulta de morosidad tributaria y detector de antecedentes históricos.'
  },
  {
    title: 'Préstamos',
    Icon: Landmark,
    description:
      'Creación de préstamos semanales o quincenales, agrupamiento inteligente por cliente con pestañas de cambio rápido, renovaciones y arreglos de pago.'
  },
  {
    title: 'Resumen',
    Icon: BarChart3,
    description:
      'Panel de métricas financieras en vivo, efectividad de cobro, gráfico de tendencias por período y distribución del estado de tus clientes.'
  },
  {
    title: 'Lista Negra',
    Icon: ShieldAlert,
    description:
      'Control preventivo para registrar y consultar personas que han incumplido con sus pagos, protegiendo tu dinero antes de otorgar un nuevo préstamo.'
  },
  {
    title: 'Papelera',
    Icon: Trash2,
    description:
      'Respaldo de seguridad por 30 días con clientes y préstamos agrupados ordenadamente por persona para restaurar en segundos cualquier borrado accidental.'
  }
];

const SENECA_EXAMPLES = [
  {
    title: 'Cobros por zona o ubicación',
    description:
      'Te informa cuántos cobros tienes en cada lugar, como Chacarita, Puntarenas o Esparza, y cuánto dinero suman en total.'
  },
  {
    title: 'Estado exacto de cada deudor',
    description:
      'Te dice al instante cuánto debe una persona, cuál es su cuota, cuántas cuotas ha pagado y su teléfono de contacto.'
  },
  {
    title: 'Control de hoy, mañana y atrasos',
    description:
      'Te resume quiénes faltan por pagar hoy, qué cobros vienen para mañana y cuáles clientes acumulan cuotas atrasadas.'
  }
];

export function LandingPage() {
  // Todos los Hooks declarados al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { autenticado } = useAuth();
  const [activeNavSection, setActiveNavSection] = useState('seccion-problema');

  const goldBg = isDark ? '#D4B46A' : '#B69A55';
  const goldBorder = isDark ? '#F5E1A4' : '#9E8342';
  const goldText = isDark ? '#D4B46A' : '#B69A55';
  const greenText = isDark ? '#52B796' : '#397D67';
  const redText = isDark ? '#F0807A' : '#C65D58';
  const primaryActionLabel = autenticado ? 'Ir al panel' : 'Iniciar sesión';

  const handleEnterApp = () => {
    if (autenticado) {
      try {
        sessionStorage.setItem('aureus_entered_app', 'true');
      } catch (_) {
        // Ignorar errores de storage
      }
      navigate('/dashboard');
      return;
    }
    navigate('/login');
  };

  const scrollToSection = (sectionId) => {
    setActiveNavSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="aureus-landing-root">
      {/* Barra Superior Fija del Portal Informativo */}
      <header className="aureus-landing-header">
        <div className="aureus-landing-header-inner">
          <div className="aureus-landing-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <AureusLogo size={36} />
            <div className="aureus-landing-brand-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05, minWidth: 0 }}>
              <span
                className="aureus-landing-brand-title"
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  color: goldText,
                  whiteSpace: 'nowrap'
                }}
              >
                AUREUS
              </span>
              <span
                className="aureus-landing-brand-sub"
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: 'var(--aureus-text-secondary)',
                  whiteSpace: 'nowrap'
                }}
              >
                MANAGER
              </span>
            </div>
          </div>

          <nav className="aureus-landing-nav" aria-label="Navegación informativa">
            <button
              type="button"
              className="aureus-landing-nav-btn"
              onClick={() => scrollToSection('seccion-problema')}
              style={{
                color: activeNavSection === 'seccion-problema' ? 'var(--aureus-gold-text)' : undefined
              }}
            >
              El Problema
            </button>
            <button
              type="button"
              className="aureus-landing-nav-btn"
              onClick={() => scrollToSection('seccion-modulos')}
              style={{
                color: activeNavSection === 'seccion-modulos' ? 'var(--aureus-gold-text)' : undefined
              }}
            >
              Módulos
            </button>
            <button
              type="button"
              className="aureus-landing-nav-btn"
              onClick={() => scrollToSection('seccion-seneca')}
              style={{
                color: activeNavSection === 'seccion-seneca' ? 'var(--aureus-gold-text)' : undefined
              }}
            >
              Séneca IA
            </button>
            <button
              type="button"
              className="aureus-landing-nav-btn"
              onClick={() => scrollToSection('seccion-beneficios')}
              style={{
                color: activeNavSection === 'seccion-beneficios' ? 'var(--aureus-gold-text)' : undefined
              }}
            >
              Beneficios
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              data-testid="landing-theme-toggle"
              className="aureus-landing-theme-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(182, 154, 85, 0.45)' : '1px solid #D5C295',
                backgroundColor: isDark ? '#1B2B40' : '#F7F2E4',
                color: isDark ? '#E5C97B' : '#252A31',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0
              }}
            >
              {isDark ? <Sun size={18} strokeWidth={2.3} color="#E5C97B" /> : <Moon size={18} strokeWidth={2.3} color="#252A31" />}
            </button>

            <button
              type="button"
              data-testid="btn-entrar-header"
              onClick={handleEnterApp}
              className="aureus-landing-enter-btn aureus-landing-header-cta"
              style={{
                backgroundColor: goldBg,
                border: `1px solid ${goldBorder}`,
                color: '#101C2C',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                cursor: 'pointer'
              }}
            >
              <span>{primaryActionLabel}</span>
              <ArrowRight size={17} strokeWidth={2.4} color="#101C2C" style={{ flexShrink: 0 }} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Seccion 1: Hero Ejecutivo Principal */}
        <section className="aureus-landing-container">
          <div className="aureus-landing-hero-grid">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', minWidth: 0 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--aureus-gold-light)',
                  border: '1px solid var(--aureus-border-gold)',
                  color: 'var(--aureus-gold-text)',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  letterSpacing: '0.07em'
                }}
              >
                <Sparkles size={14} strokeWidth={2.2} />
                <span>PLATAFORMA DE GESTIÓN DE PRÉSTAMOS Y COBROS</span>
              </span>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(28px, 4.2vw, 46px)',
                  fontWeight: 900,
                  lineHeight: 1.12,
                  letterSpacing: '-0.02em',
                  color: 'var(--aureus-text-primary)'
                }}
              >
                Tu dinero, tus préstamos y tus operaciones bajo control
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: '16px',
                  lineHeight: 1.65,
                  color: 'var(--aureus-text-secondary)'
                }}
              >
                Aureus Manager transforma la administración tradicional de préstamos personales. Deja atrás las libretas de papel, las cuentas manuales y la pérdida de tiempo calculando saldos: organiza tus cobros diarios, clientes, préstamos semanales o quincenales y estadísticas desde cualquier lugar.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px', width: '100%' }}>
                <button
                  type="button"
                  data-testid="btn-entrar-hero"
                  onClick={handleEnterApp}
                  className="aureus-landing-enter-btn"
                  style={{
                    height: '50px',
                    padding: '0 24px',
                    borderRadius: '14px',
                    backgroundColor: goldBg,
                    border: `1px solid ${goldBorder}`,
                    color: '#101C2C',
                    fontWeight: 900,
                    fontSize: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    cursor: 'pointer',
                    boxShadow: '0 6px 18px rgba(182, 154, 85, 0.25)'
                  }}
                >
                  <span>{primaryActionLabel}</span>
                  <ArrowRight size={18} strokeWidth={2.5} color="#101C2C" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('seccion-problema')}
                  style={{
                    height: '50px',
                    padding: '0 20px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    border: '1px solid var(--aureus-border-subtle)',
                    color: 'var(--aureus-text-primary)',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  Conocer más
                </button>
              </div>
            </div>

            {/* Columna Derecha: Vista Previa Ejecutiva */}
            <div
              style={{
                borderRadius: '22px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid var(--aureus-border-subtle)',
                boxShadow: isDark
                  ? '0 20px 44px rgba(0, 0, 0, 0.42)'
                  : '0 18px 40px rgba(37, 42, 49, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minWidth: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <AureusLogo size={30} />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                    Resumen Operativo del Día
                  </span>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--aureus-green-light)',
                    border: '1px solid var(--aureus-green-border)',
                    color: greenText,
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  En tiempo real
                </span>
              </div>

              <div className="aureus-landing-preview-metrics">
                <div
                  style={{
                    padding: '11px 12px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--aureus-text-muted)' }}>
                    TOTAL PRESTADO
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 900, color: 'var(--aureus-text-primary)' }}>
                    ₡4,850,000
                  </div>
                </div>

                <div
                  style={{
                    padding: '11px 12px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--aureus-text-muted)' }}>
                    ESTA SEMANA
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 900, color: goldText }}>
                    ₡620,000
                  </div>
                </div>

                <div
                  style={{
                    padding: '11px 12px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--aureus-text-muted)' }}>
                    COBRADO HOY
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: 900, color: greenText }}>
                    ₡185,000
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  border: '1px solid var(--aureus-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                      Mateo Jiménez Navarro
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--aureus-text-muted)' }}>
                      Esparza · Cuota semanal ₡35,000
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--aureus-green-light)',
                      border: '1px solid var(--aureus-green-border)',
                      color: greenText,
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    Al día
                  </span>
                </div>

                <div className="aureus-landing-preview-actions" aria-hidden="true">
                  <div
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aureus-green-light)',
                      border: '1px solid var(--aureus-green-border)',
                      color: greenText,
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    Pago
                  </div>
                  <div
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aureus-gold-light)',
                      border: '1px solid var(--aureus-border-gold)',
                      color: 'var(--aureus-gold-text)',
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    Pasar
                  </div>
                  <div
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--aureus-red-light)',
                      border: '1px solid var(--aureus-red-border)',
                      color: redText,
                      fontSize: '12px',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    No Pago
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'var(--aureus-gold-light)',
                  border: `1px solid ${goldBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: goldBg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <SenecaRomanIcon size={20} color="#101C2C" />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: 'var(--aureus-text-primary)'
                  }}
                >
                  En la zona de Esparza tienes 4 cobros programados para hoy por un total de ₡145,000.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seccion 2: La Problematica */}
        <section id="seccion-problema" className="aureus-landing-container">
          <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 30px auto' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                borderRadius: '9999px',
                backgroundColor: 'var(--aureus-gold-light)',
                border: '1px solid var(--aureus-border-gold)',
                color: 'var(--aureus-gold-text)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.07em'
              }}
            >
              POR QUÉ NACE AUREUS MANAGER
            </span>
            <h2
              style={{
                margin: '12px 0 10px 0',
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                lineHeight: 1.2,
                color: 'var(--aureus-text-primary)'
              }}
            >
              El fin de las libretas de papel y los cálculos lentos
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: '15.5px',
                lineHeight: 1.6,
                color: 'var(--aureus-text-secondary)'
              }}
            >
              Durante años, los prestamistas llevaron el control de sus cobros en cuadernos físicos o apuntes sueltos que consumían horas de trabajo y exponían su dinero a errores.
            </p>
          </div>

          <div className="aureus-landing-compare-grid">
            <div
              style={{
                padding: '24px',
                borderRadius: '20px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: `1.5px solid ${isDark ? 'rgba(240, 128, 122, 0.35)' : 'var(--aureus-red-border)'}`,
                boxShadow: 'var(--aureus-card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--aureus-red-light)',
                    color: redText,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Clock size={19} strokeWidth={2.2} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18.5px', fontWeight: 800, color: redText }}>
                  Con anotaciones en papel
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {PROBLEMA_PAPEL_ITEMS.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <XCircle size={18} color={redText} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--aureus-text-secondary)', fontWeight: 500 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                borderRadius: '20px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: `1.5px solid ${isDark ? 'rgba(82, 183, 150, 0.42)' : 'var(--aureus-green-border)'}`,
                boxShadow: 'var(--aureus-card-shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '11px',
                    backgroundColor: 'var(--aureus-green-light)',
                    color: greenText,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <ShieldCheck size={19} strokeWidth={2.2} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18.5px', fontWeight: 800, color: greenText }}>
                  Con Aureus Manager
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SOLUCION_AUREUS_ITEMS.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <CheckCircle2 size={18} color={greenText} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--aureus-text-primary)', fontWeight: 600 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Seccion 3: Los 6 Modulos de Aureus Manager */}
        <section id="seccion-modulos" className="aureus-landing-container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 30px auto' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                borderRadius: '9999px',
                backgroundColor: 'var(--aureus-gold-light)',
                border: '1px solid var(--aureus-border-gold)',
                color: 'var(--aureus-gold-text)',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.07em'
              }}
            >
              ESTRUCTURA COMPLETA
            </span>
            <h2
              style={{
                margin: '12px 0 0 0',
                fontSize: 'clamp(24px, 3vw, 34px)',
                fontWeight: 900,
                lineHeight: 1.2,
                color: 'var(--aureus-text-primary)'
              }}
            >
              Seis módulos diseñados para el trabajo diario del prestamista
            </h2>
          </div>

          <div className="aureus-landing-modules-grid">
            {MODULOS_LIST.map(({ title, Icon, description }) => (
              <article
                key={title}
                style={{
                  padding: '22px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)',
                  boxShadow: 'var(--aureus-card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--aureus-gold-light)',
                      border: '1px solid var(--aureus-border-gold)',
                      color: goldText,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                    {title}
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)' }}>
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Seccion 4: Séneca Asesor Informativo */}
        <section id="seccion-seneca" className="aureus-landing-container">
          <div
            style={{
              padding: '28px 24px',
              borderRadius: '24px',
              backgroundColor: 'var(--aureus-bg-elevated)',
              border: `1.5px solid ${goldText}`,
              boxShadow: 'var(--aureus-card-shadow)',
              display: 'flex',
              flexDirection: 'column',
              gap: '22px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '9999px',
                  backgroundColor: goldBg,
                  border: `2px solid ${goldBorder}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(182, 154, 85, 0.28)'
                }}
              >
                <SenecaRomanIcon size={36} color="#101C2C" />
              </div>

              <div style={{ flex: 1, minWidth: 'min(260px, 100%)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 'clamp(22px, 2.8vw, 30px)',
                    fontWeight: 900,
                    lineHeight: 1.2,
                    color: 'var(--aureus-text-primary)'
                  }}
                >
                  Conoce a Séneca, tu asesor financiero informativo
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  Séneca analiza en tiempo real tus registros para responderte al instante cualquier duda operativa sin que tengas que buscar cliente por cliente.
                </p>
              </div>
            </div>

            <div className="aureus-landing-seneca-examples">
              {SENECA_EXAMPLES.map((example) => (
                <div
                  key={example.title}
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    border: '1px solid var(--aureus-border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: goldText }}>
                    {example.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: 'var(--aureus-text-secondary)' }}>
                    {example.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Seccion 5: Cierre Ejecutivo */}
        <section id="seccion-beneficios" className="aureus-landing-container">
          <div
            style={{
              padding: '36px 24px',
              borderRadius: '24px',
              backgroundColor: 'var(--aureus-bg-surface)',
              border: '1px solid var(--aureus-border-subtle)',
              boxShadow: 'var(--aureus-card-shadow)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <AureusLogo size={48} />

            <h2
              style={{
                margin: 0,
                maxWidth: '640px',
                fontSize: 'clamp(22px, 3vw, 32px)',
                fontWeight: 900,
                lineHeight: 1.2,
                color: 'var(--aureus-text-primary)'
              }}
            >
              Empieza a gestionar tus préstamos con orden y seguridad
            </h2>

            <p
              style={{
                margin: 0,
                maxWidth: '520px',
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'var(--aureus-text-secondary)'
              }}
            >
              Administra tus cobros del día, clientes y préstamos desde un solo lugar.
            </p>

            <button
              type="button"
              data-testid="btn-entrar-footer"
              onClick={handleEnterApp}
              className="aureus-landing-enter-btn"
              style={{
                height: '52px',
                padding: '0 26px',
                borderRadius: '14px',
                backgroundColor: goldBg,
                border: `1px solid ${goldBorder}`,
                color: '#101C2C',
                fontWeight: 900,
                fontSize: '15px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(182, 154, 85, 0.25)'
              }}
            >
              <span>{primaryActionLabel}</span>
              <ArrowRight size={18} strokeWidth={2.5} color="#101C2C" />
            </button>
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--aureus-border-subtle)',
          padding: '20px 16px',
          textAlign: 'center',
          color: 'var(--aureus-text-muted)',
          fontSize: '13px',
          fontWeight: 700
        }}
      >
        Aureus Manager · Gestión Ejecutiva de Préstamos y Cobros
      </footer>

      <CookieConsentBanner />
    </div>
  );
}

export default LandingPage;

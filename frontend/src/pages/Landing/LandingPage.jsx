import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Users,
  Landmark,
  BarChart3,
  ShieldAlert,
  Trash2,
  Clock,
  ShieldCheck,
  Check,
  CalendarClock,
  AlertCircle,
  FileText,
  Camera,
  Lock,
  History,
  Eye
} from 'lucide-react';
import { AureusLogo } from '../../components/Common/AureusLogo.jsx';
import { SenecaRomanIcon } from '../../components/Common/SenecaRomanIcon.jsx';
import {
  ClassicalArchitecturalBackdrop,
  FlutedPilasters,
  ClassicalLaurelDivider,
  ImperialCornerAccents
} from '../../components/Common/ClassicalAppArchitecture.jsx';
import { CookieConsentBanner } from '../../components/Common/CookieConsentBanner.jsx';
import { UserProfileModal } from '../../components/Profile/UserProfileModal.jsx';
import { LegalGovernanceModal } from '../../components/Legal/LegalGovernanceModal.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import './LandingPage.css';

const NAV_SCREENS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'seneca', label: 'Séneca IA' },
  { id: 'beneficios', label: 'Beneficios' }
];

const GOLD_PARTICLES = [
  { cx: '8%', cy: '18%', r: 1.8, delay: '0s' },
  { cx: '16%', cy: '44%', r: 1.4, delay: '1.1s' },
  { cx: '24%', cy: '76%', r: 2.1, delay: '2.3s' },
  { cx: '31%', cy: '22%', r: 1.5, delay: '0.7s' },
  { cx: '39%', cy: '62%', r: 1.9, delay: '1.8s' },
  { cx: '46%', cy: '14%', r: 2.2, delay: '2.9s' },
  { cx: '53%', cy: '82%', r: 1.6, delay: '0.4s' },
  { cx: '61%', cy: '28%', r: 2.0, delay: '1.5s' },
  { cx: '68%', cy: '56%', r: 1.4, delay: '2.6s' },
  { cx: '74%', cy: '19%', r: 1.9, delay: '0.9s' },
  { cx: '81%', cy: '69%', r: 2.1, delay: '2.0s' },
  { cx: '88%', cy: '34%', r: 1.6, delay: '3.1s' },
  { cx: '92%', cy: '78%', r: 1.8, delay: '1.3s' },
  { cx: '12%', cy: '88%', r: 1.5, delay: '2.4s' },
  { cx: '28%', cy: '48%', r: 1.7, delay: '3.4s' },
  { cx: '57%', cy: '42%', r: 1.5, delay: '0.6s' },
  { cx: '77%', cy: '86%', r: 1.9, delay: '1.7s' },
  { cx: '94%', cy: '15%', r: 1.5, delay: '2.8s' }
];

const PROBLEMA_PUNTOS = [
  'Pérdida de horas buscando clientes hoja por hoja y sumando saldos manualmente.',
  'Anotaciones tachadas y confusión sobre cuántas cuotas reales lleva pagadas cada persona.',
  'Falta de claridad sobre cuánto efectivo debe recogerse exactamente en el día.'
];

const PLANTEAMIENTO_PUNTOS = [
  'Descontrol al aplazar cuotas cuando un cliente pide pasar su cobro para otro día de la semana.',
  'Riesgo crítico de extravío, humedad o deterioro físico de la libreta con todas las deudas.',
  'Dificultad para delegar cobros en ruta sin perder el rastro de quién cobró cada cuota.'
];

const SOLUCION_PUNTOS = [
  'Agenda semanal inteligente de Lunes a Domingo con cálculo automático de saldos y atrasos.',
  'Reprogramación limpia de fechas, delegación de cobros por día y hojas de ruta en PDF.',
  'Asesor financiero con inteligencia artificial y respaldo seguro de clientes y préstamos.'
];

const MODULOS_LIST = [
  {
    id: 'cobros',
    roman: 'I',
    title: 'Cobros',
    badge: 'Operación diaria',
    Icon: Coins,
    description:
      'Agenda interactiva de 7 días con acciones rápidas de Pagó, Pasar de día y No Pagó, delegación de cobros a otros cobradores y descarga de hoja de ruta en PDF.',
    tools: [
      'Tarjetas con botones Pagó en verde, Pasar en anaranjado ámbar y No Pagó en rojo alerta',
      'Delegación sincronizada de cobros del día entre cobradores vinculados',
      'Selector semanal de Lunes a Domingo con avisos de cobros pendientes sin cerrar'
    ],
    metricLabel: 'Efectividad en ruta',
    metricValue: 'Control diario de cuotas y rezagados'
  },
  {
    id: 'clientes',
    roman: 'II',
    title: 'Clientes',
    badge: 'Directorio verificado',
    Icon: Users,
    description:
      'Directorio de clientes nacionales y extranjeros con lectura automática de cédula por foto, consulta de morosidad tributaria y detector de antecedentes históricos.',
    tools: [
      'Captura fotográfica de cédula con autocompletado automático de nombre y apellidos',
      'Consulta en vivo de situación tributaria y morosidad ante Hacienda',
      'Detector automático de historial previo si la persona estuvo antes en el registro'
    ],
    metricLabel: 'Verificación de identidad',
    metricValue: 'Lectura óptica y validación en segundos'
  },
  {
    id: 'prestamos',
    roman: 'III',
    title: 'Préstamos',
    badge: 'Financiamiento flexible',
    Icon: Landmark,
    description:
      'Creación de préstamos semanales o quincenales, agrupamiento inteligente por cliente con pestañas de cambio rápido, renovaciones y arreglos de pago.',
    tools: [
      'Cálculo inmediato de interés, monto total a financiar y cuota por período',
      'Agrupación ordenada por cliente cuando una persona mantiene varios préstamos',
      'Renovaciones con liquidación de saldo anterior y arreglos de pago formales'
    ],
    metricLabel: 'Modalidades activas',
    metricValue: 'Semanal y quincenal con agenda automática'
  },
  {
    id: 'resumen',
    roman: 'IV',
    title: 'Resumen',
    badge: 'Métricas en tiempo real',
    Icon: BarChart3,
    description:
      'Panel de métricas financieras en vivo, efectividad de cobro, gráfico de tendencias por período y distribución del estado de tus clientes.',
    tools: [
      'Tarjetas ejecutivas de Cobrado Hoy, Cobrado Este Mes, Total Prestado y Ganancia Proyectada',
      'Gráfico de tendencia interactivo por día, semana, mes y año',
      'Distribución visual de clientes al día, reprogramados y con atraso'
    ],
    metricLabel: 'Visibilidad financiera',
    metricValue: 'Sincronización exacta entre módulos'
  },
  {
    id: 'lista-negra',
    roman: 'V',
    title: 'Lista Negra',
    badge: 'Blindaje preventivo',
    Icon: ShieldAlert,
    description:
      'Control preventivo para registrar y consultar personas que han incumplido con sus pagos, protegiendo tu dinero antes de otorgar un nuevo préstamo.',
    tools: [
      'Suspensión inmediata de préstamos activos al bloquear un cliente moroso',
      'Bloqueo preventivo automático si se intenta crear un préstamo a una cédula restringida',
      'Restauración controlada al directorio activo cuando el cliente regulariza su deuda'
    ],
    metricLabel: 'Protección de capital',
    metricValue: 'Prevención de reincidencia morosa'
  },
  {
    id: 'papelera',
    roman: 'VI',
    title: 'Papelera',
    badge: 'Respaldo de 30 días',
    Icon: Trash2,
    description:
      'Respaldo de seguridad por 30 días con clientes y préstamos agrupados ordenadamente por persona para restaurar en segundos cualquier borrado accidental.',
    tools: [
      'Retención segura por 30 días antes del borrado definitivo',
      'Restauración íntegra de clientes junto con sus préstamos y cuotas asociadas',
      'Conservación de resumen histórico para detectar reincidencias futuras'
    ],
    metricLabel: 'Recuperación inmediata',
    metricValue: 'Cero pérdida por eliminaciones accidentales'
  }
];

const SENECA_EXAMPLES = [
  {
    id: 'zonas',
    roman: 'I',
    question: '¿Cuántos cobros tengo hoy en Chacarita, Puntarenas, Esparza y El Roble?',
    title: 'Cobros por zona o ubicación',
    zoneBadge: 'Chacarita · Puntarenas · Esparza · El Roble',
    description:
      'Te informa cuántos cobros tienes en cada lugar, como Chacarita, Puntarenas, Esparza o El Roble, y cuánto dinero suman en total.',
    answer:
      'Hoy registras 4 cobros en Esparza por ₡145,000, 3 en Chacarita por ₡95,000, 2 en El Roble por ₡70,000 y 2 en Puntarenas centro por ₡65,000.'
  },
  {
    id: 'deudor',
    roman: 'II',
    question: '¿Cuál es el estado exacto de Mateo Jiménez Navarro y cuánto le falta por pagar?',
    title: 'Estado exacto de cada deudor',
    zoneBadge: 'Saldo · Cuotas · Teléfono · Historial',
    description:
      'Te dice al instante cuánto debe una persona, cuál es su cuota, cuántas cuotas ha pagado y su teléfono de contacto.',
    answer:
      'Mateo Jiménez Navarro está al día en Esparza. Tiene un préstamo semanal activo de ₡280,000, lleva 5 de 8 cuotas pagadas, su cuota es de ₡35,000 y su saldo pendiente es de ₡105,000.'
  },
  {
    id: 'agenda',
    roman: 'III',
    question: '¿Quiénes faltan por pagar hoy, qué cobros vienen mañana y quiénes tienen atraso?',
    title: 'Control de hoy, mañana y atrasos',
    zoneBadge: 'Hoy · Mañana · Atrasos acumulados',
    description:
      'Te resume quiénes faltan por pagar hoy, qué cobros vienen para mañana y cuáles clientes acumulan cuotas atrasadas.',
    answer:
      'Para hoy quedan 3 cuotas pendientes por ₡110,000. Para mañana tienes 6 cobros programados por ₡215,000 y actualmente 1 cliente presenta atraso acumulado de 2 semanas.'
  }
];

const BENEFICIOS_CARDS = [
  {
    roman: 'I',
    title: 'Seguridad de sesiones y acceso blindado',
    Icon: Lock,
    accent: 'gold',
    description:
      'Protección mediante credenciales cifradas, sesiones seguras con cierre confirmado y código único de vinculación para cada cobrador.'
  },
  {
    roman: 'II',
    title: 'Verificación fotográfica de cédula y consulta tributaria',
    Icon: Camera,
    accent: 'green',
    description:
      'Escaneo óptico de cédula desde la cámara o galería y verificación en línea ante el Ministerio de Hacienda antes de aprobar un crédito.'
  },
  {
    roman: 'III',
    title: 'Respaldo de 30 días contra borrados accidentales',
    Icon: Trash2,
    accent: 'amber',
    description:
      'Cualquier cliente o préstamo eliminado permanece resguardado durante 30 días en la Papelera para restaurarlo con un solo clic.'
  },
  {
    roman: 'IV',
    title: 'Detector de historial permanente',
    Icon: History,
    accent: 'gold',
    description:
      'Al registrar una cédula que ya tuvo préstamos en el pasado, se muestra un aviso ejecutivo con su comportamiento histórico de pago.'
  },
  {
    roman: 'V',
    title: 'Exportación PDF horizontal de hoja de ruta',
    Icon: FileText,
    accent: 'green',
    description:
      'Descarga en un toque la tabla ejecutiva de cobros del día en formato horizontal lista para imprimir o compartir en ruta.'
  },
  {
    roman: 'VI',
    title: 'Delegación sincronizada de cobros por día',
    Icon: ShieldCheck,
    accent: 'amber',
    description:
      'Comparte cobros específicos con otro cobrador vinculado y visualiza en tiempo real quién registró cada pago, reprogramación o incumplimiento.'
  }
];

/**
 * Medallón Escultórico Monumental de Séneca (230px x 230px) en 3 Capas Concéntricas
 */
function MonumentalSenecaMedallion({ isDark }) {
  const ringStroke = isDark ? '#D4B46A' : '#B69A55';
  const numeralColor = isDark ? '#F5E1A4' : '#8C6D23';

  return (
    <div
      className="aureus-monumental-medallion"
      data-testid="monumental-seneca-medallion"
      style={{
        position: 'relative',
        width: '230px',
        height: '230px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {/* CAPA 1 EXTERIOR: Anillo Astrolabio Giratorio con los Números Romanos (I - XII) */}
      <svg
        className="aureus-roman-astrolabe-ring"
        viewBox="0 0 230 230"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '230px',
          height: '230px',
          pointerEvents: 'none'
        }}
      >
        <defs>
          <path
            id="aureusRomanCirclePath"
            d="M 115, 115 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0"
          />
        </defs>
        <circle
          cx="115"
          cy="115"
          r="112"
          stroke={ringStroke}
          strokeOpacity={isDark ? '0.45' : '0.55'}
          strokeWidth="1.3"
        />
        <circle
          cx="115"
          cy="115"
          r="106"
          stroke={ringStroke}
          strokeOpacity={isDark ? '0.32' : '0.42'}
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text
          fill={numeralColor}
          fontSize="9.5"
          fontWeight="800"
          letterSpacing="5.1px"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          <textPath href="#aureusRomanCirclePath" startOffset="2%">
            I · II · III · IV · V · VI · VII · VIII · IX · X · XI · XII ·
          </textPath>
        </text>
      </svg>

      {/* CAPA 2 MEDIA: Halo de Luz Dorada (188x188) + Corona de Laurel Romana */}
      <div
        className="rb-halo-ring"
        style={{
          position: 'relative',
          width: '188px',
          height: '188px',
          borderRadius: '9999px',
          border: isDark ? '3px solid #D4B46A' : '3px solid #B69A55',
          background: isDark
            ? 'radial-gradient(circle, rgba(212, 180, 106, 0.22) 0%, rgba(16, 28, 44, 0.94) 74%)'
            : 'radial-gradient(circle, rgba(182, 154, 85, 0.24) 0%, #FFFFFF 76%)',
          boxShadow: isDark
            ? '0 0 42px rgba(212, 180, 106, 0.42), inset 0 0 24px rgba(212, 180, 106, 0.28)'
            : '0 12px 32px rgba(182, 154, 85, 0.28), inset 0 0 18px rgba(182, 154, 85, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        {/* Corona de Laurel Imperial en el arco inferior del medallón */}
        <svg
          viewBox="0 0 188 188"
          fill="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          <path
            d="M94 176 C56 172 24 142 18 102"
            stroke={ringStroke}
            strokeWidth="2"
            strokeOpacity="0.72"
            strokeLinecap="round"
          />
          <path
            d="M94 176 C132 172 164 142 170 102"
            stroke={ringStroke}
            strokeWidth="2"
            strokeOpacity="0.72"
            strokeLinecap="round"
          />
          {/* Hojas de laurel simétricas */}
          <path
            d="M32 136 C24 130 22 120 28 114 C34 120 35 128 32 136 Z M48 154 C39 149 36 139 42 133 C48 139 50 147 48 154 Z M68 168 C58 164 55 155 60 148 C66 153 69 161 68 168 Z"
            fill={ringStroke}
            fillOpacity="0.55"
          />
          <path
            d="M156 136 C164 130 166 120 160 114 C154 120 153 128 156 136 Z M140 154 C149 149 152 139 146 133 C140 139 138 147 140 154 Z M120 168 C130 164 133 155 128 148 C122 153 119 161 120 168 Z"
            fill={ringStroke}
            fillOpacity="0.55"
          />
        </svg>

        {/* CAPA 3 CENTRAL: Busto Escultórico Monumental de Séneca (size={138}) */}
        <div style={{ position: 'relative', zIndex: 2, transform: 'translateY(3px)' }}>
          <SenecaRomanIcon
            size={138}
            variant="monumental"
            color={isDark ? '#E5C97B' : '#B69A55'}
          />
        </div>
      </div>
    </div>
  );
}

function RepeatableScrollReveal({ children, delay = 0, direction = 'up', className = '', style = {} }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -36px 0px'
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const dirClass =
    direction === 'left'
      ? 'from-left'
      : direction === 'right'
        ? 'from-right'
        : '';

  return (
    <div
      ref={ref}
      className={`aureus-scroll-reveal ${dirClass} ${isVisible ? 'is-visible' : ''} ${className}`.trim()}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : '0ms',
        ...style
      }}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  // Todos los Hooks declarados al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { autenticado, usuario } = useAuth();
  const { t } = useAccessibility();
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);
  const [legalModalState, setLegalModalState] = useState({ isOpen: false, tab: 'terminos' });
  const [activeScreen, setActiveScreen] = useState('inicio');
  const [selectedModulePreview, setSelectedModulePreview] = useState('cobros');
  const [selectedSenecaIdx, setSelectedSenecaIdx] = useState(0);
  const [heroTilt, setHeroTilt] = useState({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeScreen]);

  const handleSpotlightMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  const handleHeroShowcaseMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);

    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;
    setHeroTilt({
      rotateX: Number((-normY * 3.5).toFixed(2)),
      rotateY: Number((normX * 3.5).toFixed(2))
    });
  }, []);

  const handleHeroShowcaseMouseLeave = useCallback(() => {
    setHeroTilt({ rotateX: 0, rotateY: 0 });
  }, []);

  const goldText = isDark ? '#D4B46A' : '#B69A55';
  const greenText = isDark ? '#52B796' : '#397D67';
  const redText = isDark ? '#F0807A' : '#C65D58';
  const amberText = isDark ? '#FDBA74' : '#D97706';
  const primaryActionLabel = autenticado ? 'Ir al panel' : 'Iniciar sesión';

  const handleGoToLogin = () => {
    if (autenticado) {
      try {
        sessionStorage.setItem('aureus_entered_app', 'true');
      } catch (_) {
        // Ignorar errores de storage
      }
      navigate(usuario?.rol === 'ADMINISTRADOR' ? '/admin' : '/dashboard');
      return;
    }
    navigate('/login');
  };

  const activeModuleObj =
    MODULOS_LIST.find((m) => m.id === selectedModulePreview) || MODULOS_LIST[0];
  const ActiveModuleIcon = activeModuleObj.Icon;
  const activeSenecaObj = SENECA_EXAMPLES[selectedSenecaIdx] || SENECA_EXAMPLES[0];

  const romanBadgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    height: '24px',
    padding: '0 8px',
    borderRadius: '8px',
    backgroundColor: isDark ? 'rgba(212, 180, 106, 0.14)' : '#F7F2E4',
    border: isDark ? '1px solid rgba(212, 180, 106, 0.38)' : '1px solid #D5C295',
    color: goldText,
    fontSize: '11.5px',
    fontWeight: 800,
    letterSpacing: '0.06em'
  };

  return (
    <div className="aureus-landing-root">
      {/* Fondos Arquitectónicos Grecorromanos por Pantalla y Pilastras Laterales Estriadas */}
      <ClassicalArchitecturalBackdrop activeScreen={activeScreen} isDark={isDark} />
      <FlutedPilasters isDark={isDark} />

      {/* Barra Superior Flotante Tipo Cápsula (Floating Pill Topbar estilo React Bits Pro) */}
      <header
        className="aureus-landing-floating-header"
        style={{
          position: 'sticky',
          top: '14px',
          zIndex: 100,
          padding: '0 20px',
          marginTop: '14px'
        }}
      >
        <div
          className="aureus-landing-pill-topbar"
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            minHeight: '68px',
            borderRadius: '20px',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: isDark ? 'rgba(22, 36, 54, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isDark
              ? '1px solid rgba(212, 180, 106, 0.28)'
              : '1px solid rgba(182, 154, 85, 0.32)',
            boxShadow: '0 12px 32px rgba(16, 28, 44, 0.14)',
            boxSizing: 'border-box'
          }}
        >
          {/* Izquierda: Logo + AUREUS MANAGER */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveScreen('inicio')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveScreen('inicio');
              }
            }}
            className="aureus-landing-brand"
            title="Volver a Inicio"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              cursor: 'pointer'
            }}
          >
            <AureusLogo size={38} />
            <div
              className="aureus-landing-brand-text"
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.05,
                minWidth: 0
              }}
            >
              <span
                className="aureus-landing-brand-title aureus-imperial-title"
                style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: goldText,
                  whiteSpace: 'nowrap'
                }}
              >
                AUREUS
              </span>
              <span
                className="aureus-landing-brand-sub"
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  color: 'var(--aureus-text-secondary)',
                  whiteSpace: 'nowrap'
                }}
              >
                MANAGER
              </span>
            </div>
          </div>

          {/* Centro: Cápsula de Navegación de 4 Pantallas Independientes ("Inicio", "Módulos", "Séneca IA", "Beneficios") */}
          <nav
            className="aureus-landing-screen-pills"
            aria-label="Apartados del portal informativo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px',
              borderRadius: '9999px',
              backgroundColor: isDark ? '#101C2C' : '#F5F3ED',
              border: '1px solid var(--aureus-border-subtle)'
            }}
          >
            {NAV_SCREENS.map((scr) => {
              const isActive = activeScreen === scr.id;
              return (
                <button
                  key={scr.id}
                  type="button"
                  data-testid={`nav-screen-${scr.id}`}
                  onClick={() => setActiveScreen(scr.id)}
                  className={`aureus-landing-screen-pill-btn ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isActive
                      ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                      : 'transparent',
                    color: isActive ? '#101C2C' : 'var(--aureus-text-secondary)',
                    fontSize: '13px',
                    fontWeight: isActive ? 800 : 700,
                    boxShadow: isActive ? '0 4px 14px rgba(182, 154, 85, 0.32)' : 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {scr.label}
                </button>
              );
            })}
          </nav>

          {/* Derecha: Botón Accesibilidad + Botón Iniciar sesión */}
          <div className="aureus-landing-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              data-testid="btn-accessibility-landing"
              className="aureus-landing-a11y-btn"
              onClick={() => setIsAccessibilityModalOpen(true)}
              aria-label={t('profile.menu.accessibility')}
              title={t('profile.menu.accessibility')}
              style={{
                height: '42px',
                padding: '0 15px',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(212, 180, 106, 0.34)' : '1px solid #D5C295',
                backgroundColor: isDark ? 'rgba(16, 28, 44, 0.78)' : '#F8F6F0',
                color: isDark ? '#F5F3ED' : '#252A31',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isDark ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(16, 28, 44, 0.06)',
              }}
            >
              <Eye size={17} color={isDark ? '#D4B46A' : '#B69A55'} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span>{t('profile.menu.accessibility')}</span>
            </button>

            <button
              type="button"
              data-testid="btn-entrar-header"
              onClick={handleGoToLogin}
              className="aureus-landing-enter-btn aureus-landing-header-cta"
              style={{
                background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
                color: '#101C2C',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(182, 154, 85, 0.28)'
              }}
            >
              <span>{primaryActionLabel}</span>
              <ArrowUpRight size={17} strokeWidth={2.5} color="#101C2C" style={{ flexShrink: 0 }} />
            </button>
          </div>
        </div>
      </header>

      <main className="aureus-landing-main">
        {/* =====================================================================
            PANTALLA 1: INICIO (Hero + Problema, Planteamiento y Solución)
            ===================================================================== */}
        {activeScreen === 'inicio' && (
          <div className="aureus-screen-stage" data-testid="screen-inicio">
            {/* Bloque A — Hero Ejecutivo en 2 Columnas */}
            <section className="aureus-landing-container" style={{ paddingBottom: '12px' }}>
              <div className="aureus-landing-hero-grid">
                {/* Columna Izquierda */}
                <RepeatableScrollReveal direction="left" delay={0}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '18px',
                      minWidth: 0
                    }}
                  >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
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
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '9999px',
                        backgroundColor: goldText,
                        boxShadow: '0 0 8px rgba(212, 180, 106, 0.8)'
                      }}
                    />
                    <span>PLATAFORMA DE GESTIÓN DE PRÉSTAMOS Y COBROS</span>
                  </span>

                  <h1
                    className="aureus-imperial-title"
                    style={{
                      margin: 0,
                      fontSize: 'clamp(29px, 4.1vw, 48px)',
                      fontWeight: 900,
                      lineHeight: 1.12,
                      letterSpacing: '-0.01em',
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Tu dinero, tus préstamos y tus operaciones{' '}
                    <span className="aureus-shiny-gold-text">bajo control</span>
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      lineHeight: 1.65,
                      color: 'var(--aureus-text-secondary)'
                    }}
                  >
                    <strong className="aureus-shiny-gold-text">Aureus Manager</strong> evoluciona la administración tradicional de préstamos desde las libretas de papel hacia el control digital en tiempo real. Organiza tus cobros diarios, clientes, préstamos semanales o quincenales y estadísticas financieras desde cualquier lugar con precisión ejecutiva.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                      width: '100%'
                    }}
                  >
                    <button
                      type="button"
                      data-testid="btn-entrar-hero"
                      onClick={handleGoToLogin}
                      className="aureus-landing-enter-btn"
                      style={{
                        height: '52px',
                        padding: '0 24px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                        border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
                        color: '#101C2C',
                        fontWeight: 900,
                        fontSize: '15px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '9px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 22px rgba(182, 154, 85, 0.30)'
                      }}
                    >
                      <span>Entrar a Aureus Manager</span>
                      <ArrowUpRight size={18} strokeWidth={2.5} color="#101C2C" />
                    </button>

                    <button
                      type="button"
                      data-testid="btn-explorar-modulos"
                      onClick={() => setActiveScreen('modulos')}
                      style={{
                        height: '52px',
                        padding: '0 22px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        border: isDark
                          ? '1px solid rgba(212, 180, 106, 0.35)'
                          : '1px solid #D5C295',
                        color: 'var(--aureus-text-primary)',
                        fontWeight: 800,
                        fontSize: '14.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>Explorar los 6 Módulos</span>
                      <ArrowRight size={17} strokeWidth={2.2} color={goldText} />
                    </button>
                  </div>
                  </div>
                </RepeatableScrollReveal>

                {/* Columna Derecha: Bento Showcase Dual con Tilt 3D y Medallón Escultórico de Séneca (230x230) */}
                <RepeatableScrollReveal direction="right" delay={120}>
                  <div
                    className="aureus-hero-bento-showcase rb-spotlight-card"
                  onMouseMove={handleHeroShowcaseMouseMove}
                  onMouseLeave={handleHeroShowcaseMouseLeave}
                  style={{
                    position: 'relative',
                    background: isDark
                      ? 'radial-gradient(circle at 50% 32%, #1A2C42 0%, #101C2C 75%)'
                      : 'radial-gradient(circle at 50% 32%, #FFFDF9 0%, #F3EFE4 100%)',
                    backgroundColor: isDark ? '#101C2C' : '#F8F6F0',
                    borderRadius: '28px',
                    padding: '24px',
                    border: isDark
                      ? '1.5px solid rgba(212, 180, 106, 0.38)'
                      : '1.5px solid #D5C295',
                    boxShadow: isDark
                      ? '0 24px 60px rgba(16, 28, 44, 0.38)'
                      : '0 20px 48px rgba(182, 154, 85, 0.16)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    overflow: 'hidden',
                    minWidth: 0,
                    transform: `perspective(1100px) rotateX(${heroTilt.rotateX}deg) rotateY(${heroTilt.rotateY}deg)`,
                    transition:
                      heroTilt.rotateX === 0 && heroTilt.rotateY === 0
                        ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'transform 0.08s linear'
                  }}
                >
                  <ImperialCornerAccents isDark={isDark} />

                  {/* Emblema 3D flotante esquina superior derecha */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      zIndex: 2,
                      filter: isDark
                        ? 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45))'
                        : 'drop-shadow(0 6px 14px rgba(182, 154, 85, 0.20))'
                    }}
                  >
                    <AureusLogo size={54} />
                  </div>

                  {/* Medallón Escultórico Monumental de Séneca (230px x 230px) */}
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingTop: '2px',
                      gap: '10px'
                    }}
                  >
                    <MonumentalSenecaMedallion isDark={isDark} />

                    <span
                      style={{
                        padding: '5px 14px',
                        borderRadius: '9999px',
                        backgroundColor: isDark ? 'rgba(22, 36, 54, 0.92)' : '#FFFFFF',
                        border: isDark ? '1px solid rgba(212, 180, 106, 0.4)' : '1px solid #D5C295',
                        color: isDark ? '#D4B46A' : '#8C6D23',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.08em'
                      }}
                    >
                      SÉNECA IA — CONTROL FINANCIERO EN VIVO
                    </span>
                  </div>

                  {/* Base del Showcase: 2 Tarjetas Flotantes Superpuestas */}
                  <div className="aureus-showcase-cards-grid" style={{ position: 'relative', zIndex: 1 }}>
                    {/* Tarjeta Flotante Izquierda: Cobro Demostrativo con Pagó, Pasar (Anaranjado Ámbar) y No Pagó */}
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '18px',
                        backgroundColor: isDark ? 'rgba(22, 36, 54, 0.94)' : '#FFFFFF',
                        border: isDark ? '1px solid rgba(212, 180, 106, 0.24)' : '1px solid #E5E0D5',
                        boxShadow: isDark
                          ? '0 10px 24px rgba(0, 0, 0, 0.28)'
                          : '0 8px 20px rgba(16, 28, 44, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        minWidth: 0
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color: isDark ? '#F5F3ED' : '#252A31',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            Mateo Jiménez Navarro
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: isDark ? '#94A3B8' : '#5A626E',
                              marginTop: '2px'
                            }}
                          >
                            Esparza · Cuota ₡30,000
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: isDark ? 'rgba(57, 125, 103, 0.24)' : '#E6F2EE',
                            border: isDark ? '1px solid #52B796' : '1px solid #94C2B2',
                            color: isDark ? '#6EE7B7' : '#1F5C47',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            flexShrink: 0,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Al día
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: '6px',
                          marginTop: '10px'
                        }}
                      >
                        {/* 1. Pagó */}
                        <div
                          data-testid="demo-btn-pago"
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '9px',
                            backgroundColor: isDark ? 'rgba(57, 125, 103, 0.22)' : '#E6F2EE',
                            border: isDark ? '1px solid #52B796' : '1px solid #94C2B2',
                            color: isDark ? '#6EE7B7' : '#1F5C47',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            lineHeight: 1
                          }}
                        >
                          <Check size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          <span>Pagó</span>
                        </div>

                        {/* 2. Pasar (Anaranjado Ámbar Ejecutivo) */}
                        <div
                          data-testid="demo-btn-pasar"
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '9px',
                            backgroundColor: isDark ? 'rgba(234, 88, 12, 0.24)' : '#FFF7ED',
                            border: isDark ? '1px solid #FB923C' : '1px solid #FDBA74',
                            color: isDark ? '#FDBA74' : '#C2410C',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            lineHeight: 1
                          }}
                        >
                          <CalendarClock size={12} strokeWidth={2.3} style={{ flexShrink: 0 }} />
                          <span>Pasar</span>
                        </div>

                        {/* 3. No Pagó */}
                        <div
                          data-testid="demo-btn-no-pago"
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '9px',
                            backgroundColor: isDark ? 'rgba(198, 93, 88, 0.22)' : '#FCEEE9',
                            border: isDark ? '1px solid #F0807A' : '1px solid #E6ABA8',
                            color: isDark ? '#FCA5A5' : '#991B1B',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            lineHeight: 1
                          }}
                        >
                          <AlertCircle size={12} strokeWidth={2.3} style={{ flexShrink: 0 }} />
                          <span>No Pagó</span>
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta Flotante Derecha: Resumen Operativo del Día con curva SVG spline */}
                    <div
                      style={{
                        position: 'relative',
                        padding: '14px',
                        borderRadius: '18px',
                        backgroundColor: isDark ? 'rgba(22, 36, 54, 0.94)' : '#FFFFFF',
                        border: isDark ? '1px solid rgba(212, 180, 106, 0.24)' : '1px solid #E5E0D5',
                        boxShadow: isDark
                          ? '0 10px 24px rgba(0, 0, 0, 0.28)'
                          : '0 8px 20px rgba(16, 28, 44, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        overflow: 'hidden',
                        minWidth: 0
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 800,
                          color: isDark ? '#E5C97B' : '#8C6D23',
                          letterSpacing: '0.04em',
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        Resumen Operativo del Día
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: '8px',
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              color: isDark ? '#94A3B8' : '#5A626E'
                            }}
                          >
                            TOTAL PRESTADO
                          </div>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 900,
                              color: isDark ? '#F5F3ED' : '#252A31',
                              marginTop: '2px'
                            }}
                          >
                            ₡4,850,000
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              color: isDark ? '#94A3B8' : '#5A626E'
                            }}
                          >
                            ESTA SEMANA
                          </div>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 900,
                              color: isDark ? '#52B796' : '#1F5C47',
                              marginTop: '2px'
                            }}
                          >
                            ₡620,000
                          </div>
                        </div>
                      </div>

                      {/* Curva luminosa SVG spline */}
                      <svg
                        viewBox="0 0 240 44"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        style={{
                          width: '100%',
                          height: '32px',
                          display: 'block',
                          position: 'relative',
                          zIndex: 1
                        }}
                      >
                        <defs>
                          <linearGradient id="heroSplineFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#52B796" stopOpacity={isDark ? '0.38' : '0.24'} />
                            <stop offset="100%" stopColor="#52B796" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,36 C38,32 58,14 96,18 C134,22 162,6 202,10 C220,12 232,6 240,4 L240,44 L0,44 Z"
                          fill="url(#heroSplineFill)"
                        />
                        <path
                          d="M0,36 C38,32 58,14 96,18 C134,22 162,6 202,10 C220,12 232,6 240,4"
                          fill="none"
                          stroke={isDark ? '#52B796' : '#397D67'}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  </div>
                </RepeatableScrollReveal>
              </div>
            </section>

            {/* Divisor Horizontal Imperial con Greca Griega y Corona de Laurel */}
            <div className="aureus-landing-container" style={{ paddingTop: 0, paddingBottom: 0 }}>
              <RepeatableScrollReveal direction="up" delay={0}>
                <ClassicalLaurelDivider isDark={isDark} />
              </RepeatableScrollReveal>
            </div>

            {/* Bloque B — Sección Integral: "Planteamiento del Problema y Solución Digital" (3 Tarjetas Spotlight Bento) */}
            <section className="aureus-landing-container" style={{ paddingTop: '10px' }}>
              <RepeatableScrollReveal direction="up" delay={0}>
                <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 30px auto' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--aureus-gold-light)',
                    border: '1px solid var(--aureus-border-gold)',
                    color: 'var(--aureus-gold-text)',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.08em'
                  }}
                >
                  DIAGNÓSTICO Y TRANSFORMACIÓN OPERATIVA
                </span>
                <h2
                  className="aureus-imperial-title"
                  style={{
                    margin: '12px 0 10px 0',
                    fontSize: 'clamp(24px, 3.2vw, 36px)',
                    fontWeight: 900,
                    lineHeight: 1.2,
                    color: 'var(--aureus-text-primary)'
                  }}
                >
                  Planteamiento del Problema y Solución Digital
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: '15.5px',
                    lineHeight: 1.6,
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  Comprende por qué las anotaciones físicas frenan el crecimiento del prestamista y cómo Aureus Manager resuelve de raíz cada punto crítico.
                </p>
                </div>
              </RepeatableScrollReveal>

              <div className="aureus-landing-pillars-grid">
                {/* Tarjeta I — El Problema: Libretas de Papel y Descontrol */}
                <RepeatableScrollReveal direction="up" delay={0} style={{ display: 'flex', height: '100%' }}>
                  <article
                    className="rb-spotlight-card"
                    onMouseMove={handleSpotlightMouseMove}
                    style={{
                      width: '100%',
                      padding: '24px',
                      borderRadius: '22px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: `1.5px solid ${isDark ? 'rgba(240, 128, 122, 0.38)' : 'var(--aureus-red-border)'}`,
                      boxShadow: 'var(--aureus-card-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                >
                  <ImperialCornerAccents isDark={isDark} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--aureus-red-light)',
                          border: '1px solid var(--aureus-red-border)',
                          color: redText,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Clock size={20} strokeWidth={2.2} />
                      </div>
                      <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: redText, lineHeight: 1.25 }}>
                        El Problema: Libretas de Papel y Descontrol
                      </h3>
                    </div>
                    <span className="aureus-imperial-title" style={romanBadgeStyle}>
                      I
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
                    {PROBLEMA_PUNTOS.map((item) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <XCircle size={18} color={redText} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--aureus-text-secondary)', fontWeight: 500 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  </article>
                </RepeatableScrollReveal>

                {/* Tarjeta II — El Planteamiento: Riesgo Operativo */}
                <RepeatableScrollReveal direction="up" delay={110} style={{ display: 'flex', height: '100%' }}>
                  <article
                    className="rb-spotlight-card"
                    onMouseMove={handleSpotlightMouseMove}
                    style={{
                      width: '100%',
                      padding: '24px',
                      borderRadius: '22px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: `1.5px solid ${isDark ? 'rgba(212, 180, 106, 0.42)' : '#FDBA74'}`,
                      boxShadow: 'var(--aureus-card-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                  <ImperialCornerAccents isDark={isDark} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: isDark ? 'rgba(217, 119, 6, 0.18)' : '#FFF7ED',
                          border: `1px solid ${isDark ? '#D4B46A' : '#FDBA74'}`,
                          color: amberText,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <AlertTriangle size={20} strokeWidth={2.2} />
                      </div>
                      <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: amberText, lineHeight: 1.25 }}>
                        El Planteamiento: Riesgo Operativo
                      </h3>
                    </div>
                    <span className="aureus-imperial-title" style={romanBadgeStyle}>
                      II
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
                    {PLANTEAMIENTO_PUNTOS.map((item) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <AlertTriangle size={18} color={amberText} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--aureus-text-secondary)', fontWeight: 500 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  </article>
                </RepeatableScrollReveal>

                {/* Tarjeta III — La Solución: Aureus Manager en Tiempo Real */}
                <RepeatableScrollReveal direction="up" delay={220} style={{ display: 'flex', height: '100%' }}>
                  <article
                    className="rb-spotlight-card"
                    onMouseMove={handleSpotlightMouseMove}
                    style={{
                      width: '100%',
                      padding: '24px',
                      borderRadius: '22px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: `1.5px solid ${isDark ? 'rgba(82, 183, 150, 0.45)' : 'var(--aureus-green-border)'}`,
                      boxShadow: 'var(--aureus-card-shadow)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                  <ImperialCornerAccents isDark={isDark} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--aureus-green-light)',
                          border: '1px solid var(--aureus-green-border)',
                          color: greenText,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <ShieldCheck size={20} strokeWidth={2.2} />
                      </div>
                      <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: greenText, lineHeight: 1.25 }}>
                        La Solución: Aureus Manager en Tiempo Real
                      </h3>
                    </div>
                    <span className="aureus-imperial-title" style={romanBadgeStyle}>
                      III
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>
                    {SOLUCION_PUNTOS.map((item) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <CheckCircle2 size={18} color={greenText} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '14.5px', lineHeight: 1.55, color: 'var(--aureus-text-primary)', fontWeight: 600 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  </article>
                </RepeatableScrollReveal>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            PANTALLA 2: MÓDULOS (Vista Exclusiva e Interactiva de los 6 Módulos)
            ===================================================================== */}
        {activeScreen === 'modulos' && (
          <div className="aureus-screen-stage" data-testid="screen-modulos">
            <section className="aureus-landing-container">
              <RepeatableScrollReveal direction="up" delay={0}>
                <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 10px auto' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 14px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--aureus-gold-light)',
                      border: '1px solid var(--aureus-border-gold)',
                      color: 'var(--aureus-gold-text)',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.08em'
                    }}
                  >
                    ARQUITECTURA DE 6 MÓDULOS
                  </span>
                  <h1
                    className="aureus-imperial-title"
                    style={{
                      margin: '12px 0 10px 0',
                      fontSize: 'clamp(26px, 3.6vw, 40px)',
                      fontWeight: 900,
                      lineHeight: 1.15,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Seis módulos diseñados para el trabajo diario del prestamista
                  </h1>
                  <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)' }}>
                    Selecciona cualquier módulo para inspeccionar sus herramientas operativas o explora la cuadrícula ejecutiva completa.
                  </p>
                </div>
              </RepeatableScrollReveal>

              <ClassicalLaurelDivider isDark={isDark} />

              {/* Selector Interactivo de Módulo */}
              <RepeatableScrollReveal direction="up" delay={80}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '24px'
                  }}
                >
                  {MODULOS_LIST.map((mod) => {
                    const ModIcon = mod.Icon;
                    const isSelected = selectedModulePreview === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedModulePreview(mod.id)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '14px',
                          border: isSelected
                            ? isDark
                              ? '1.5px solid #F5E1A4'
                              : '1.5px solid #9E8342'
                            : '1px solid var(--aureus-border-subtle)',
                          background: isSelected
                            ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                            : 'var(--aureus-bg-surface)',
                          color: isSelected ? '#101C2C' : 'var(--aureus-text-primary)',
                          fontWeight: 800,
                          fontSize: '13.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 6px 16px rgba(182, 154, 85, 0.30)' : 'none'
                        }}
                      >
                        <ModIcon size={17} strokeWidth={2.2} />
                        <span>{mod.title}</span>
                      </button>
                    );
                  })}
                </div>
              </RepeatableScrollReveal>

              {/* Panel Destacado del Módulo Seleccionado */}
              <RepeatableScrollReveal key={selectedModulePreview} direction="up" delay={100}>
                <div
                  className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  padding: '24px',
                  borderRadius: '22px',
                  backgroundColor: isDark ? '#162436' : '#FAF8F3',
                  border: isDark ? '1.5px solid rgba(212, 180, 106, 0.38)' : '1.5px solid #D5C295',
                  boxShadow: 'var(--aureus-card-shadow)',
                  marginBottom: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                        color: '#101C2C',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <ActiveModuleIcon size={24} strokeWidth={2.3} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: goldText,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase'
                        }}
                      >
                        MÓDULO {activeModuleObj.roman} · {activeModuleObj.badge}
                      </span>
                      <h2 className="aureus-imperial-title" style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: 900, color: 'var(--aureus-text-primary)' }}>
                        Módulo de {activeModuleObj.title}
                      </h2>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--aureus-green-light)',
                      border: '1px solid var(--aureus-green-border)',
                      color: greenText,
                      fontSize: '12px',
                      fontWeight: 800
                    }}
                  >
                    {activeModuleObj.metricLabel}: {activeModuleObj.metricValue}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)', position: 'relative', zIndex: 1 }}>
                  {activeModuleObj.description}
                </p>

                <div className="aureus-landing-pillars-grid" style={{ position: 'relative', zIndex: 1 }}>
                  {activeModuleObj.tools.map((tool) => (
                    <div
                      key={tool}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        border: '1px solid var(--aureus-border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <CheckCircle2 size={18} color={greenText} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--aureus-text-primary)', lineHeight: 1.5 }}>
                        {tool}
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
              </RepeatableScrollReveal>

              {/* Cuadrícula Spotlight Bento de los 6 Módulos */}
              <div className="aureus-landing-modules-grid">
                {MODULOS_LIST.map(({ id, roman, title, badge, Icon, description }, idx) => (
                  <RepeatableScrollReveal
                    key={id}
                    direction="up"
                    delay={(idx % 3) * 90}
                    style={{ display: 'flex', height: '100%' }}
                  >
                    <article
                      onClick={() => setSelectedModulePreview(id)}
                      onMouseMove={handleSpotlightMouseMove}
                      className="rb-spotlight-card"
                      style={{
                        width: '100%',
                        padding: '22px',
                        borderRadius: '20px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        border:
                          selectedModulePreview === id
                            ? `1.5px solid ${goldText}`
                            : '1px solid var(--aureus-border-subtle)',
                        boxShadow: 'var(--aureus-card-shadow)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <ImperialCornerAccents isDark={isDark} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', position: 'relative', zIndex: 1 }}>
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
                          <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                            {title}
                          </h3>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: goldText,
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--aureus-gold-light)'
                            }}
                          >
                            {badge}
                          </span>
                          <span className="aureus-imperial-title" style={romanBadgeStyle}>
                            {roman}
                          </span>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)', position: 'relative', zIndex: 1 }}>
                        {description}
                      </p>
                    </article>
                  </RepeatableScrollReveal>
                ))}
              </div>

              {/* Botones inferiores de navegación entre pantallas */}
              <div
                style={{
                  marginTop: '32px',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveScreen('seneca')}
                  style={{
                    height: '48px',
                    padding: '0 22px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    border: `1px solid ${goldText}`,
                    color: 'var(--aureus-text-primary)',
                    fontWeight: 800,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span>Conocer a Séneca IA</span>
                  <ArrowRight size={17} strokeWidth={2.2} color={goldText} />
                </button>
                <button
                  type="button"
                  onClick={handleGoToLogin}
                  className="aureus-landing-enter-btn"
                  style={{
                    height: '48px',
                    padding: '0 24px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
                    color: '#101C2C',
                    fontWeight: 900,
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{primaryActionLabel}</span>
                  <ArrowUpRight size={17} strokeWidth={2.4} color="#101C2C" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            PANTALLA 3: SÉNECA IA (Vista Exclusiva del Asesor Financiero Séneca IA)
            ===================================================================== */}
        {activeScreen === 'seneca' && (
          <div className="aureus-screen-stage" data-testid="screen-seneca">
            <section className="aureus-landing-container">
              <RepeatableScrollReveal direction="up" delay={0}>
                <div
                  className="rb-spotlight-card"
                  onMouseMove={handleSpotlightMouseMove}
                  style={{
                    padding: '32px 26px',
                    borderRadius: '26px',
                    backgroundColor: isDark ? '#162436' : 'var(--aureus-bg-surface)',
                    border: `1.5px solid ${goldText}`,
                    boxShadow: 'var(--aureus-card-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '22px'
                  }}
                >
                  <ImperialCornerAccents isDark={isDark} />

                  {/* Cabecera de Séneca con Busto Romano Escultórico en Halo Dorado */}
                  <RepeatableScrollReveal direction="up" delay={60}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                  <div
                    className="rb-halo-ring"
                    style={{
                      width: '104px',
                      height: '104px',
                      borderRadius: '9999px',
                      background: isDark
                        ? 'radial-gradient(circle, rgba(212, 180, 106, 0.28) 0%, #101C2C 80%)'
                        : '#F7F2E4',
                      backgroundColor: isDark ? '#101C2C' : '#F7F2E4',
                      border: isDark ? '2.5px solid #D4B46A' : '1.5px solid #D5C295',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isDark
                        ? '0 0 32px rgba(212, 180, 106, 0.42)'
                        : '0 8px 22px rgba(182, 154, 85, 0.20)'
                    }}
                  >
                    <SenecaRomanIcon size={76} variant="monumental" color={isDark ? '#E5C97B' : '#B69A55'} />
                  </div>

                  <div style={{ flex: 1, minWidth: 'min(260px, 100%)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span
                      style={{
                        alignSelf: 'flex-start',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--aureus-gold-light)',
                        border: '1px solid var(--aureus-border-gold)',
                        color: goldText,
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.07em'
                      }}
                    >
                      ASESOR FINANCIERO CON INTELIGENCIA ARTIFICIAL
                    </span>
                    <h1
                      className="aureus-imperial-title"
                      style={{
                        margin: 0,
                        fontSize: 'clamp(24px, 3.2vw, 36px)',
                        fontWeight: 900,
                        lineHeight: 1.18,
                        color: 'var(--aureus-text-primary)'
                      }}
                    >
                      Conoce a <span className="aureus-shiny-gold-text">Séneca IA</span>, tu consultor operativo en tiempo real
                    </h1>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        lineHeight: 1.6,
                        color: 'var(--aureus-text-secondary)'
                      }}
                    >
                      Séneca analiza al instante tus cobros por zona como Chacarita, Puntarenas, Esparza y El Roble, el estado exacto de cada deudor y el resumen de cobros de hoy, mañana y atrasos sin tener que buscar cliente por cliente.
                    </p>
                  </div>
                    </div>
                  </RepeatableScrollReveal>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <ClassicalLaurelDivider isDark={isDark} />
                </div>

                {/* Demostración Interactiva de Consultas a Séneca */}
                <div className="aureus-landing-seneca-examples" style={{ position: 'relative', zIndex: 1 }}>
                  {SENECA_EXAMPLES.map((example, idx) => {
                    const isSelected = selectedSenecaIdx === idx;
                    return (
                      <RepeatableScrollReveal
                        key={example.id}
                        direction="up"
                        delay={idx * 90}
                        style={{ display: 'flex', height: '100%' }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSenecaIdx(idx)}
                          onMouseMove={handleSpotlightMouseMove}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedSenecaIdx(idx);
                            }
                          }}
                          className="rb-spotlight-card"
                          style={{
                            width: '100%',
                            padding: '20px',
                            borderRadius: '18px',
                            backgroundColor: isSelected
                              ? isDark
                                ? '#101C2C'
                                : '#F7F2E4'
                              : 'var(--aureus-bg-elevated)',
                            border: isSelected
                              ? `1.5px solid ${goldText}`
                              : '1px solid var(--aureus-border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          <ImperialCornerAccents isDark={isDark} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', position: 'relative', zIndex: 1 }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                color: goldText,
                                padding: '3px 9px',
                                borderRadius: '9999px',
                                backgroundColor: 'var(--aureus-gold-light)'
                              }}
                            >
                              {example.zoneBadge}
                            </span>
                            <span className="aureus-imperial-title" style={romanBadgeStyle}>
                              {example.roman}
                            </span>
                          </div>
                          <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: 'var(--aureus-text-primary)', position: 'relative', zIndex: 1 }}>
                            {example.title}
                          </h3>
                          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.58, color: 'var(--aureus-text-secondary)', position: 'relative', zIndex: 1 }}>
                            {example.description}
                          </p>
                        </div>
                      </RepeatableScrollReveal>
                    );
                  })}
                </div>

                {/* Simulación de Respuesta Ejecutiva de Séneca IA */}
                <RepeatableScrollReveal direction="up" delay={140}>
                  <div
                    data-testid="seneca-qa-box"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '20px',
                    borderRadius: '18px',
                    backgroundColor: isDark ? '#101C2C' : '#F8F6F0',
                    border: isDark
                      ? '1px solid rgba(212, 180, 106, 0.28)'
                      : '1px solid #D5C295',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isDark ? '#94A3B8' : '#5A626E'
                    }}
                  >
                    PREGUNTA DEL COBRADOR:
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: isDark ? '#F5F3ED' : '#252A31'
                    }}
                  >
                    “{activeSenecaObj.question}”
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      backgroundColor: isDark ? '#162436' : '#FFFFFF',
                      border: isDark
                        ? '1px solid rgba(82, 183, 150, 0.35)'
                        : '1px solid #94C2B2'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(212, 180, 106, 0.14)' : '#F7F2E4',
                        border: isDark ? '1px solid rgba(212, 180, 106, 0.35)' : '1px solid #D5C295',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <SenecaRomanIcon size={22} color={isDark ? '#E5C97B' : '#B69A55'} />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14.5px',
                        lineHeight: 1.6,
                        color: isDark ? '#E2E8F0' : '#1E293B',
                        fontWeight: 600
                      }}
                    >
                      {activeSenecaObj.answer}
                    </p>
                  </div>
                  </div>
                </RepeatableScrollReveal>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('beneficios')}
                    style={{
                      height: '48px',
                      padding: '0 22px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: `1px solid ${goldText}`,
                      color: 'var(--aureus-text-primary)',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Ver Beneficios y Seguridad</span>
                    <ArrowRight size={17} strokeWidth={2.2} color={goldText} />
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToLogin}
                    className="aureus-landing-enter-btn"
                    style={{
                      height: '48px',
                      padding: '0 24px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                      border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
                      color: '#101C2C',
                      fontWeight: 900,
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{primaryActionLabel}</span>
                    <ArrowUpRight size={17} strokeWidth={2.4} color="#101C2C" />
                  </button>
                </div>
                </div>
              </RepeatableScrollReveal>
            </section>
          </div>
        )}

        {/* =====================================================================
            PANTALLA 4: BENEFICIOS (Vista Exclusiva de Beneficios, Seguridad y Acceso)
            ===================================================================== */}
        {activeScreen === 'beneficios' && (
          <div className="aureus-screen-stage" data-testid="screen-beneficios">
            <section className="aureus-landing-container">
              <RepeatableScrollReveal direction="up" delay={0}>
                <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 10px auto' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '5px 14px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--aureus-gold-light)',
                      border: '1px solid var(--aureus-border-gold)',
                      color: 'var(--aureus-gold-text)',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.08em'
                    }}
                  >
                    VENTAJAS EJECUTIVAS Y SEGURIDAD
                  </span>
                  <h1
                    className="aureus-imperial-title"
                    style={{
                      margin: '12px 0 10px 0',
                      fontSize: 'clamp(26px, 3.6vw, 40px)',
                      fontWeight: 900,
                      lineHeight: 1.15,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Blindaje operativo y respaldo total para tu actividad diaria
                  </h1>
                  <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)' }}>
                    Cada detalle de Aureus Manager protege tu capital, acelera el registro en ruta y mantiene tus cuentas claras.
                  </p>
                </div>
              </RepeatableScrollReveal>

              <ClassicalLaurelDivider isDark={isDark} />

              <div className="aureus-landing-modules-grid" style={{ marginBottom: '32px' }}>
                {BENEFICIOS_CARDS.map(({ roman, title, Icon, accent, description }, idx) => {
                  const accentColor =
                    accent === 'green' ? greenText : accent === 'amber' ? amberText : goldText;
                  return (
                    <RepeatableScrollReveal
                      key={title}
                      direction="up"
                      delay={(idx % 3) * 90}
                      style={{ display: 'flex', height: '100%' }}
                    >
                      <article
                        onMouseMove={handleSpotlightMouseMove}
                        className="rb-spotlight-card"
                        style={{
                          width: '100%',
                          padding: '22px',
                          borderRadius: '20px',
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          boxShadow: 'var(--aureus-card-shadow)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <ImperialCornerAccents isDark={isDark} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', position: 'relative', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: 'var(--aureus-gold-light)',
                                border: '1px solid var(--aureus-border-gold)',
                                color: accentColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <Icon size={20} strokeWidth={2.2} />
                            </div>
                            <h3 className="aureus-imperial-title" style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: 'var(--aureus-text-primary)', lineHeight: 1.25 }}>
                              {title}
                            </h3>
                          </div>
                          <span className="aureus-imperial-title" style={romanBadgeStyle}>
                            {roman}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--aureus-text-secondary)', position: 'relative', zIndex: 1 }}>
                          {description}
                        </p>
                      </article>
                    </RepeatableScrollReveal>
                  );
                })}
              </div>

              {/* Bloque Final de Acceso */}
              <RepeatableScrollReveal direction="up" delay={120}>
                <div
                  className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  padding: '36px 24px',
                  borderRadius: '24px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: `1.5px solid ${goldText}`,
                  boxShadow: 'var(--aureus-card-shadow)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <AureusLogo size={52} />
                </div>

                <h2
                  className="aureus-imperial-title"
                  style={{
                    position: 'relative',
                    zIndex: 1,
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
                    position: 'relative',
                    zIndex: 1,
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
                  onClick={handleGoToLogin}
                  className="aureus-landing-enter-btn"
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    height: '52px',
                    padding: '0 28px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
                    color: '#101C2C',
                    fontWeight: 900,
                    fontSize: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 22px rgba(182, 154, 85, 0.30)'
                  }}
                >
                  <span>{primaryActionLabel}</span>
                  <ArrowUpRight size={18} strokeWidth={2.5} color="#101C2C" />
                </button>
                </div>
              </RepeatableScrollReveal>
            </section>
          </div>
        )}
      </main>

      <footer
        style={{
          position: 'relative',
          zIndex: 2,
          borderTop: '1px solid var(--aureus-border-subtle)',
          padding: '22px 16px',
          textAlign: 'center',
          color: 'var(--aureus-text-muted)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div>Aureus Manager · Gestión Ejecutiva de Préstamos y Cobros</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            data-testid="footer-btn-terminos"
            onClick={() => setLegalModalState({ isOpen: true, tab: 'terminos' })}
            style={{
              background: 'none',
              border: `1px solid ${isDark ? 'rgba(212, 180, 106, 0.32)' : '#D5C295'}`,
              borderRadius: '9999px',
              padding: '5px 13px',
              fontSize: '12px',
              fontWeight: 800,
              color: goldText,
              cursor: 'pointer'
            }}
          >
            Términos de Uso
          </button>
          <button
            type="button"
            data-testid="footer-btn-privacidad"
            onClick={() => setLegalModalState({ isOpen: true, tab: 'privacidad' })}
            style={{
              background: 'none',
              border: `1px solid ${isDark ? 'rgba(212, 180, 106, 0.32)' : '#D5C295'}`,
              borderRadius: '9999px',
              padding: '5px 13px',
              fontSize: '12px',
              fontWeight: 800,
              color: goldText,
              cursor: 'pointer'
            }}
          >
            Privacidad y Ley 8968
          </button>
          <button
            type="button"
            data-testid="footer-btn-gobernanza"
            onClick={() => setLegalModalState({ isOpen: true, tab: 'gobernanza' })}
            style={{
              background: 'none',
              border: `1px solid ${isDark ? 'rgba(212, 180, 106, 0.32)' : '#D5C295'}`,
              borderRadius: '9999px',
              padding: '5px 13px',
              fontSize: '12px',
              fontWeight: 800,
              color: goldText,
              cursor: 'pointer'
            }}
          >
            Gobernanza de IA
          </button>
        </div>
      </footer>

      <CookieConsentBanner />

      <UserProfileModal
        isOpen={isAccessibilityModalOpen}
        onClose={() => setIsAccessibilityModalOpen(false)}
        section="accesibilidad"
      />

      <LegalGovernanceModal
        isOpen={legalModalState.isOpen}
        initialTab={legalModalState.tab}
        onClose={() => setLegalModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default LandingPage;

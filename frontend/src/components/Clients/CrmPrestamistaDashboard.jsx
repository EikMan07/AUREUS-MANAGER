import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  SlidersHorizontal,
  BarChart3,
  Kanban,
  Clock,
  Sparkles,
  ArrowRight,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Pencil,
  UserCheck,
  Check,
  TrendingUp,
  BellRing,
  CalendarClock,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  ClassicalLaurelDivider,
  ImperialCornerAccents,
  handleSpotlightMouseMove,
} from '../Common/ClassicalAppArchitecture';
import {
  obtenerProspectosCrm,
  obtenerEmbudoCrm,
  obtenerAtencionCrm,
  moverEtapaProspectoCrm,
  eliminarProspectoCrm,
  convertirProspectoAClienteCrm,
  redactarMensajeCrm,
  actualizarEstadoMensajeCrm,
} from '../../services/apiClient';
import { CrmProspectoModal } from './CrmProspectoModal';
import { CrmCerebroModal } from './CrmCerebroModal';

const ETAPAS_EMBUDO = [
  { key: 'PROSPECTO', label: 'Prospecto' },
  { key: 'EVALUACION_RIESGO', label: 'Evaluación de riesgo' },
  { key: 'PROPUESTA_APROBADA', label: 'Propuesta aprobada' },
  { key: 'PRESTAMO_ACTIVO', label: 'Préstamo activo' },
  { key: 'ALERTA_ATRASO', label: 'Alerta de atraso' },
  { key: 'ARREGLO_PAGO', label: 'Arreglo de pago' },
  { key: 'FINIQUITADO_RENOVABLE', label: 'Finiquitado renovable' },
];

const ETAPA_LABEL_MAP = Object.fromEntries(ETAPAS_EMBUDO.map((e) => [e.key, e.label]));

const CANAL_LABEL_MAP = {
  REFERIDO: 'Referido',
  WHATSAPP: 'WhatsApp',
  REDES_SOCIALES: 'Redes sociales',
  DIRECTO: 'Directo',
};

const UMBRALES_DIAS = [1, 3, 5, 7];

function safeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatColones(value) {
  const num = safeNumber(value, 0);
  return `₡${Math.round(num).toLocaleString('en-US')}`;
}

function formatNombreCompleto(prospecto) {
  if (!prospecto) return '';
  return [prospecto.nombre, prospecto.apellidos].filter(Boolean).join(' ').trim();
}

function formatCanalLabel(canal) {
  if (!canal) return 'Referido';
  const key = String(canal).toUpperCase();
  return CANAL_LABEL_MAP[key] || String(canal).replaceAll('_', ' ');
}

function getNextStageKey(currentStage) {
  const idx = ETAPAS_EMBUDO.findIndex((item) => item.key === currentStage);
  if (idx === -1) return 'EVALUACION_RIESGO';
  if (idx < ETAPAS_EMBUDO.length - 1) return ETAPAS_EMBUDO[idx + 1].key;
  return ETAPAS_EMBUDO[0].key;
}

export function CrmPrestamistaDashboard({ onShowAlert, onClientConverted }) {
  const { isDark } = useTheme();
  const moveBackdropDownRef = useRef(false);
  const deleteBackdropDownRef = useRef(false);

  // Sub-vistas del CRM
  const [activeSubTab, setActiveSubTab] = useState('embudo');
  const [diasUmbral, setDiasUmbral] = useState(3);

  // Datos principales
  const [prospectos, setProspectos] = useState([]);
  const [resumenProspectos, setResumenProspectos] = useState({
    total: 0,
    total_general: 0,
    ingresos_ultimos_7_dias: 0,
    sin_revisar: 0,
  });
  const [embudo, setEmbudo] = useState([]);
  const [distribucionCanales, setDistribucionCanales] = useState([]);
  const [atencionHoy, setAtencionHoy] = useState([]);

  // Estados de carga y mensajes de interfaz
  const [isLoading, setIsLoading] = useState(true);
  const [isAtencionLoading, setIsAtencionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  // Modales principales (crear / editar / cerebro)
  const [isProspectoModalOpen, setIsProspectoModalOpen] = useState(false);
  const [editingProspecto, setEditingProspecto] = useState(null);
  const [isCerebroModalOpen, setIsCerebroModalOpen] = useState(false);

  // Confirmación preventiva antes de mover etapa
  const [moveTarget, setMoveTarget] = useState(null);
  const [selectedNextStage, setSelectedNextStage] = useState('');
  const [moveNota, setMoveNota] = useState('');
  const [isMovingStage, setIsMovingStage] = useState(false);

  // Confirmación preventiva antes de eliminar prospecto
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Conversión a cliente
  const [convertingId, setConvertingId] = useState(null);

  // Borrador de mensaje IA
  const [generatingId, setGeneratingId] = useState(null);
  const [draftModalData, setDraftModalData] = useState(null);
  const [draftEditableText, setDraftEditableText] = useState('');
  const [isUpdatingDraft, setIsUpdatingDraft] = useState(false);
  const [isCopiedSuccess, setIsCopiedSuccess] = useState(false);

  const showFeedback = useCallback(
    (type, text) => {
      setStatusBanner({ type, text });
      if (typeof onShowAlert === 'function' && type === 'error') {
        onShowAlert({ title: 'Aviso', message: text, type: 'error' });
      }
      setTimeout(() => {
        setStatusBanner((prev) => (prev?.text === text ? null : prev));
      }, 4000);
    },
    [onShowAlert]
  );

  const cargarDatosCrm = useCallback(
    async (diasConsulta = diasUmbral, { silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const [resProspectos, resEmbudo, resAtencion] = await Promise.all([
          obtenerProspectosCrm(),
          obtenerEmbudoCrm(),
          obtenerAtencionCrm(diasConsulta),
        ]);

        setProspectos(Array.isArray(resProspectos?.prospectos) ? resProspectos.prospectos : []);
        setResumenProspectos({
          total: safeNumber(resProspectos?.resumen?.total, 0),
          total_general: safeNumber(resProspectos?.resumen?.total_general, 0),
          ingresos_ultimos_7_dias: safeNumber(resProspectos?.resumen?.ingresos_ultimos_7_dias, 0),
          sin_revisar: safeNumber(resProspectos?.resumen?.sin_revisar, 0),
        });
        setEmbudo(Array.isArray(resEmbudo?.embudo) ? resEmbudo.embudo : []);
        setDistribucionCanales(
          Array.isArray(resEmbudo?.distribucion_canales) ? resEmbudo.distribucion_canales : []
        );
        setAtencionHoy(
          Array.isArray(resAtencion?.prospectos_atencion) ? resAtencion.prospectos_atencion : []
        );
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible cargar los datos de seguimiento comercial en este momento.'
        );
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [diasUmbral, showFeedback]
  );

  useEffect(() => {
    cargarDatosCrm(diasUmbral);
  }, [cargarDatosCrm, diasUmbral]);

  const handleChangeDiasUmbral = useCallback(
    async (nuevoUmbral) => {
      setDiasUmbral(nuevoUmbral);
      setIsAtencionLoading(true);
      try {
        const resAtencion = await obtenerAtencionCrm(nuevoUmbral);
        setAtencionHoy(
          Array.isArray(resAtencion?.prospectos_atencion) ? resAtencion.prospectos_atencion : []
        );
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible actualizar la bandeja de atención.'
        );
      } finally {
        setIsAtencionLoading(false);
      }
    },
    [showFeedback]
  );

  const embudoNormalizado = useMemo(() => {
    const mapa = new Map(embudo.map((item) => [item.etapa, item]));
    return ETAPAS_EMBUDO.map((etapaDef) => {
      const registro = mapa.get(etapaDef.key);
      const total = safeNumber(registro?.total, 0);
      const sinDatos = registro?.sin_datos === true || total === 0;
      return {
        etapa: etapaDef.key,
        etiqueta: etapaDef.label,
        total,
        conversion_real: sinDatos ? 0 : safeNumber(registro?.conversion_real, 0),
        meta_conversion: safeNumber(registro?.meta_conversion, 75),
        dias_promedio: sinDatos ? 0 : safeNumber(registro?.dias_promedio, 0),
        fuga: sinDatos ? 0 : safeNumber(registro?.fuga, 0),
        sin_datos: sinDatos,
      };
    });
  }, [embudo]);

  const prospectosPorEtapa = useMemo(() => {
    const grupos = {};
    ETAPAS_EMBUDO.forEach((e) => {
      grupos[e.key] = [];
    });
    prospectos.forEach((p) => {
      if (grupos[p.etapa]) {
        grupos[p.etapa].push(p);
      }
    });
    return grupos;
  }, [prospectos]);

  const handleOpenMoveModal = useCallback((prospecto) => {
    setMoveTarget(prospecto);
    setSelectedNextStage(getNextStageKey(prospecto.etapa));
    setMoveNota('');
  }, []);

  const handleConfirmMoveStage = useCallback(async () => {
    if (!moveTarget || !selectedNextStage) return;
    const movedId = moveTarget.id;
    const nextStage = selectedNextStage;
    setIsMovingStage(true);
    try {
      const res = await moverEtapaProspectoCrm(movedId, {
        etapa_nueva: nextStage,
        nota_cambio: moveNota.trim() !== '' ? moveNota.trim() : null,
      });
      setProspectos((prev) =>
        prev.map((p) =>
          p.id === movedId
            ? {
                ...p,
                ...(res?.prospecto || {}),
                etapa: nextStage,
                revisado: true,
                dias_en_etapa_actual: 0,
              }
            : p
        )
      );
      const etiquetaDestino = ETAPA_LABEL_MAP[nextStage] || nextStage;
      setMoveTarget(null);
      setMoveNota('');
      showFeedback('success', `Avance registrado hacia ${etiquetaDestino}.`);
      cargarDatosCrm(diasUmbral, { silent: true });
    } catch (err) {
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible mover la etapa del prospecto en este momento.'
      );
    } finally {
      setIsMovingStage(false);
    }
  }, [moveTarget, selectedNextStage, moveNota, cargarDatosCrm, diasUmbral, showFeedback]);

  const handleConfirmDeleteProspecto = useCallback(async () => {
    if (!deleteTarget?.id) return;
    const deletedId = deleteTarget.id;
    setIsDeleting(true);
    try {
      await eliminarProspectoCrm(deletedId);
      setProspectos((prev) => prev.filter((p) => p.id !== deletedId));
      setDeleteTarget(null);
      showFeedback('info', 'Prospecto eliminado del seguimiento.');
      cargarDatosCrm(diasUmbral, { silent: true });
    } catch (err) {
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible eliminar el prospecto en este momento.'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, cargarDatosCrm, diasUmbral, showFeedback]);

  const handleConvertToClient = useCallback(
    async (prospecto) => {
      if (!prospecto?.id) return;
      setConvertingId(prospecto.id);
      try {
        const res = await convertirProspectoAClienteCrm(prospecto.id);
        if (res?.cliente?.id) {
          setProspectos((prev) =>
            prev.map((p) =>
              p.id === prospecto.id ? { ...p, cliente_id: res.cliente.id, revisado: true } : p
            )
          );
        }
        if (typeof onClientConverted === 'function') {
          await onClientConverted(res?.cliente || null);
        }
        showFeedback(
          'success',
          res?.ya_existia
            ? 'Contacto vinculado con su ficha existente en el directorio.'
            : 'Prospecto incorporado al directorio de clientes.'
        );
        cargarDatosCrm(diasUmbral, { silent: true });
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible trasladar el prospecto al directorio en este momento.'
        );
      } finally {
        setConvertingId(null);
      }
    },
    [cargarDatosCrm, diasUmbral, onClientConverted, showFeedback]
  );

  const handleGenerateMessage = useCallback(
    async (prospecto) => {
      if (!prospecto?.id) return;
      setGeneratingId(prospecto.id);
      try {
        const res = await redactarMensajeCrm(prospecto.id);
        const mensaje = res?.mensaje;
        if (!mensaje) {
          throw new Error('Respuesta incompleta');
        }
        setIsCopiedSuccess(false);
        setDraftModalData({
          prospecto,
          mensaje,
        });
        setDraftEditableText(mensaje.mensaje_propuesto || '');
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage ||
            'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.'
        );
      } finally {
        setGeneratingId(null);
      }
    },
    [showFeedback]
  );

  const handleApproveAndCopy = useCallback(async () => {
    if (!draftModalData?.mensaje?.id || isCopiedSuccess) return;
    setIsUpdatingDraft(true);
    try {
      await actualizarEstadoMensajeCrm(draftModalData.mensaje.id, 'APROBADO');
      const textToCopy = draftEditableText.trim();
      if (textToCopy && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy).catch(() => {});
      }
      setIsUpdatingDraft(false);
      setIsCopiedSuccess(true);
      setTimeout(() => {
        setDraftModalData(null);
        setDraftEditableText('');
        setIsCopiedSuccess(false);
        showFeedback('success', 'Mensaje aprobado y copiado al portapapeles.');
      }, 900);
    } catch (err) {
      setIsUpdatingDraft(false);
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible aprobar el mensaje en este momento.'
      );
    }
  }, [draftModalData, draftEditableText, isCopiedSuccess, showFeedback]);

  const handleDiscardDraft = useCallback(async () => {
    if (!draftModalData?.mensaje?.id) return;
    setIsUpdatingDraft(true);
    try {
      await actualizarEstadoMensajeCrm(draftModalData.mensaje.id, 'DESCARTADO');
      setDraftModalData(null);
      setDraftEditableText('');
      setIsCopiedSuccess(false);
      showFeedback('info', 'Borrador descartado correctamente.');
    } catch (err) {
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible descartar el borrador en este momento.'
      );
    } finally {
      setIsUpdatingDraft(false);
    }
  }, [draftModalData, showFeedback]);

  // Paleta Neoclásico-Futurista de Aureus Manager
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F5F3ED';
  const cardBg = isDark ? '#142234' : '#FFFFFF';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#A9B4C2' : '#5A626E';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.24)' : 'rgba(182, 154, 85, 0.28)';
  const goldGradient = 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)';

  const kpiIngresos7 = safeNumber(resumenProspectos.ingresos_ultimos_7_dias, 0);
  const kpiSinRevisar = safeNumber(resumenProspectos.sin_revisar, 0);
  const kpiPendientesHoy = safeNumber(atencionHoy.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
      {/* Encabezado Ejecutivo */}
      <section
        aria-label="Cabecera de seguimiento comercial"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
          <h2
            className="directory-main-heading aureus-imperial-title"
            style={{ margin: 0, color: textPrimary }}
          >
            Seguimiento Comercial
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: textSecondary }}>
            Control de prospectos, embudo de conversión y asistencia con Séneca
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsCerebroModalOpen(true)}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              border: `1px solid ${borderSubtle}`,
              backgroundColor: surfaceBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={15} style={{ color: '#B69A55' }} />
            <span>Configurar tono</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProspecto(null);
              setIsProspectoModalOpen(true);
            }}
            style={{
              padding: '9px 15px',
              borderRadius: '12px',
              border: 'none',
              background: goldGradient,
              color: '#101C2C',
              fontSize: '13px',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(182, 154, 85, 0.28)',
            }}
          >
            <Plus size={16} strokeWidth={2.6} />
            <span>Nuevo prospecto</span>
          </button>
        </div>
      </section>

      <ClassicalLaurelDivider compact isDark={isDark} />

      {/* Aviso transitorio */}
      {statusBanner && (
        <div
          role="status"
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor:
              statusBanner.type === 'error'
                ? isDark
                  ? 'rgba(198, 93, 88, 0.18)'
                  : 'rgba(198, 93, 88, 0.11)'
                : statusBanner.type === 'success'
                  ? isDark
                    ? 'rgba(57, 125, 103, 0.22)'
                    : 'rgba(57, 125, 103, 0.12)'
                  : isDark
                    ? 'rgba(182, 154, 85, 0.18)'
                    : 'rgba(182, 154, 85, 0.14)',
            border:
              statusBanner.type === 'error'
                ? '1px solid rgba(198, 93, 88, 0.45)'
                : statusBanner.type === 'success'
                  ? '1px solid rgba(57, 125, 103, 0.45)'
                  : `1px solid ${borderSubtle}`,
            color:
              statusBanner.type === 'error'
                ? isDark
                  ? '#F7B9B6'
                  : '#9B2F2B'
                : statusBanner.type === 'success'
                  ? isDark
                    ? '#8CE0C3'
                    : '#1E5B47'
                  : textPrimary,
          }}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Cerrar aviso"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3 Tarjetas KPI Ejecutivas con Iconos Circulares */}
      <section
        aria-label="Indicadores clave de seguimiento"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '10px',
        }}
      >
        {[
          {
            label: 'Ingresos últimos 7 días',
            value: kpiIngresos7,
            accent: '#B69A55',
            iconBg: isDark ? 'rgba(182, 154, 85, 0.18)' : 'rgba(182, 154, 85, 0.14)',
            Icon: TrendingUp,
          },
          {
            label: 'Sin revisar',
            value: kpiSinRevisar,
            accent: '#3B82F6',
            iconBg: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)',
            Icon: BellRing,
          },
          {
            label: 'Pendientes hoy',
            value: kpiPendientesHoy,
            accent: kpiPendientesHoy > 0 ? '#C65D58' : '#397D67',
            iconBg:
              kpiPendientesHoy > 0
                ? isDark
                  ? 'rgba(198, 93, 88, 0.18)'
                  : 'rgba(198, 93, 88, 0.12)'
                : isDark
                  ? 'rgba(57, 125, 103, 0.22)'
                  : 'rgba(57, 125, 103, 0.13)',
            Icon: CalendarClock,
          },
        ].map(({ label, value, accent, iconBg, Icon }) => (
          <div
            key={label}
            className="rb-spotlight-card"
            onMouseMove={handleSpotlightMouseMove}
            style={{
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: surfaceBg,
              border: `1px solid ${borderSubtle}`,
              borderRadius: '16px',
              padding: '14px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxShadow: isDark
                ? '0 4px 14px rgba(0, 0, 0, 0.22)'
                : '0 4px 12px rgba(16, 28, 44, 0.05)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  lineHeight: 1.25,
                }}
              >
                {label}
              </span>
              <strong
                style={{
                  fontSize: '23px',
                  fontWeight: 900,
                  color: accent,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {value}
              </strong>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9999px',
                backgroundColor: iconBg,
                color: accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={18} strokeWidth={2.2} />
            </div>
          </div>
        ))}
      </section>

      {/* Sub-pestañas segmentadas: Embudo, Tablero, Qué atender hoy */}
      <div
        className="segmented-tabs-control-three"
        role="tablist"
        aria-label="Vistas de seguimiento comercial"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderSubtle,
        }}
      >
        {[
          { id: 'embudo', label: 'Embudo', Icon: BarChart3 },
          { id: 'tablero', label: 'Tablero', Icon: Kanban },
          { id: 'atencion', label: 'Qué atender hoy', Icon: Clock },
        ].map(({ id, label, Icon }) => {
          const isActive = activeSubTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSubTab(id)}
              className={`tab-btn segmented-tab-btn ${isActive ? 'active' : ''}`}
              style={{
                background: isActive ? goldGradient : 'transparent',
                color: isActive ? '#101C2C' : isDark ? '#FFFFFF' : '#252A31',
                fontWeight: isActive ? 900 : 700,
              }}
            >
              <Icon size={14} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span className="tab-btn-label">{label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div
          style={{
            padding: '44px 16px',
            borderRadius: '16px',
            backgroundColor: surfaceBg,
            border: `1px solid ${borderSubtle}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            color: textSecondary,
          }}
        >
          <Loader2 size={26} className="animate-spin" style={{ color: '#B69A55' }} />
          <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
            Cargando seguimiento comercial...
          </span>
        </div>
      ) : null}

      {/* SUB-VISTA 1: EMBUDO */}
      {!isLoading && activeSubTab === 'embudo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
            }}
          >
            {embudoNormalizado.map((item) => {
              const conversionPct = Math.min(100, Math.max(0, item.conversion_real));
              const metaPct = Math.min(100, Math.max(0, item.meta_conversion));
              const sinRegistros = item.sin_datos || item.total === 0;
              const tieneFuga = !sinRegistros && item.fuga > 0;

              return (
                <div
                  key={item.etapa}
                  className="rb-spotlight-card"
                  onMouseMove={handleSpotlightMouseMove}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: cardBg,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: textPrimary }}>
                      {item.etiqueta}
                    </h4>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        backgroundColor: elevatedBg,
                        border: `1px solid ${borderSubtle}`,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: sinRegistros ? textSecondary : '#B69A55',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      Total {item.total}
                    </span>
                  </div>

                  {/* Barra de progreso Conversión real vs Meta */}
                  <div
                    style={{
                      position: 'relative',
                      height: '9px',
                      borderRadius: '9999px',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,28,44,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${conversionPct}%`,
                        height: '100%',
                        borderRadius: '9999px',
                        background: sinRegistros
                          ? 'transparent'
                          : tieneFuga
                            ? 'linear-gradient(90deg, #B69A55 0%, #E5C97B 100%)'
                            : 'linear-gradient(90deg, #397D67 0%, #52A88B 100%)',
                        transition: 'width 0.35s ease',
                      }}
                    />
                    <div
                      title={`Meta ${metaPct}%`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${metaPct}%`,
                        width: '2px',
                        backgroundColor: isDark ? '#F5F3ED' : '#101C2C',
                        opacity: 0.65,
                      }}
                    />
                  </div>

                  {/* Métricas detalladas */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', color: textSecondary, fontSize: '11px' }}>
                        Conversión real
                      </span>
                      <strong
                        style={{
                          color: textPrimary,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.conversion_real}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: textSecondary, fontSize: '11px' }}>
                        Meta
                      </span>
                      <strong
                        style={{
                          color: textPrimary,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.meta_conversion}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: textSecondary, fontSize: '11px' }}>
                        Días promedio
                      </span>
                      <strong
                        style={{
                          color: textPrimary,
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.dias_promedio} días
                      </strong>
                    </div>
                  </div>

                  {/* Badge neutro si está vacía, o Fuga / Meta cumplida cuando hay base */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {sinRegistros ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          backgroundColor: isDark
                            ? 'rgba(169, 180, 194, 0.14)'
                            : 'rgba(90, 98, 110, 0.10)',
                          color: textSecondary,
                          border: `1px solid ${borderSubtle}`,
                        }}
                      >
                        <span>Sin registros</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          backgroundColor: tieneFuga
                            ? isDark
                              ? 'rgba(198, 93, 88, 0.20)'
                              : 'rgba(198, 93, 88, 0.12)'
                            : isDark
                              ? 'rgba(57, 125, 103, 0.22)'
                              : 'rgba(57, 125, 103, 0.12)',
                          color: tieneFuga ? '#C65D58' : '#397D67',
                          border: tieneFuga
                            ? '1px solid rgba(198, 93, 88, 0.4)'
                            : '1px solid rgba(57, 125, 103, 0.4)',
                        }}
                      >
                        {tieneFuga ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                        <span>{tieneFuga ? `Fuga ${item.fuga}%` : 'Meta cumplida'}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Distribución por canal de origen */}
          <section
            aria-label="Distribución por canal de origen"
            style={{
              backgroundColor: surfaceBg,
              border: `1px solid ${borderSubtle}`,
              borderRadius: '16px',
              padding: '16px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <ImperialCornerAccents isDark={isDark} />
            <h3
              className="aureus-imperial-title"
              style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: textPrimary }}
            >
              Distribución por canal de origen
            </h3>

            {distribucionCanales.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: textSecondary }}>
                Aún no hay prospectos registrados para mostrar la distribución de canales.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {distribucionCanales.map((canal) => {
                  const pct = safeNumber(canal.porcentaje, 0);
                  const totalCanal = safeNumber(canal.total, 0);
                  return (
                    <div key={canal.canal_origen} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: textPrimary,
                        }}
                      >
                        <span>{formatCanalLabel(canal.canal_origen)}</span>
                        <span style={{ color: '#B69A55', fontVariantNumeric: 'tabular-nums' }}>
                          {totalCanal} · {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '7px',
                          borderRadius: '9999px',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,28,44,0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            height: '100%',
                            background: goldGradient,
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SUB-VISTA 2: TABLERO KANBAN */}
      {!isLoading && activeSubTab === 'tablero' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: surfaceBg,
              border: `1px solid ${borderSubtle}`,
              fontSize: '12.5px',
              color: textSecondary,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <span>
                Ingresos últimos 7 días:{' '}
                <strong style={{ color: textPrimary }}>{kpiIngresos7}</strong>
              </span>
              <span>
                Sin revisar:{' '}
                <strong style={{ color: '#3B82F6' }}>{kpiSinRevisar}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => cargarDatosCrm(diasUmbral)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#B69A55',
                fontSize: '12px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
              <span>Actualizar</span>
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '12px',
              scrollSnapType: 'x proximity',
            }}
          >
            {ETAPAS_EMBUDO.map((etapaDef) => {
              const items = prospectosPorEtapa[etapaDef.key] || [];
              return (
                <div
                  key={etapaDef.key}
                  style={{
                    flex: '0 0 284px',
                    minWidth: '284px',
                    scrollSnapAlign: 'start',
                    backgroundColor: elevatedBg,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: `1px solid ${borderSubtle}`,
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 800, color: textPrimary }}>
                      {etapaDef.label}
                    </span>
                    <span
                      style={{
                        minWidth: '24px',
                        height: '24px',
                        padding: '0 7px',
                        borderRadius: '9999px',
                        backgroundColor: surfaceBg,
                        border: `1px solid ${borderSubtle}`,
                        color: '#B69A55',
                        fontSize: '12px',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {items.length}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div
                      style={{
                        padding: '20px 10px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: textSecondary,
                        borderRadius: '12px',
                        border: `1px dashed ${borderSubtle}`,
                      }}
                    >
                      Sin prospectos en esta etapa
                    </div>
                  ) : (
                    items.map((prospecto) => {
                      const esNuevo = prospecto.revisado === false;
                      const estaGenerando = generatingId === prospecto.id;
                      const puedePasarClientes =
                        prospecto.etapa === 'PROPUESTA_APROBADA' ||
                        prospecto.etapa === 'PRESTAMO_ACTIVO';
                      const yaEnClientes = Boolean(prospecto.cliente_id);
                      const estaConvirtiendo = convertingId === prospecto.id;

                      return (
                        <article
                          key={prospecto.id}
                          style={{
                            backgroundColor: surfaceBg,
                            borderRadius: '14px',
                            padding: '12px',
                            border: esNuevo ? '1.5px solid #3B82F6' : `1px solid ${borderSubtle}`,
                            boxShadow: esNuevo
                              ? '0 4px 14px rgba(59, 130, 246, 0.15)'
                              : '0 2px 6px rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {/* Nombre + acciones compactas editar y eliminar */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: '6px',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong
                                style={{
                                  display: 'block',
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  color: textPrimary,
                                  lineHeight: 1.25,
                                }}
                              >
                                {formatNombreCompleto(prospecto)}
                              </strong>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                                {esNuevo && (
                                  <span
                                    style={{
                                      padding: '2px 7px',
                                      borderRadius: '9999px',
                                      backgroundColor: isDark
                                        ? 'rgba(59, 130, 246, 0.22)'
                                        : 'rgba(59, 130, 246, 0.14)',
                                      color: isDark ? '#93C5FD' : '#1D4ED8',
                                      fontSize: '10.5px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    Nuevo
                                  </span>
                                )}
                                {yaEnClientes && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 7px',
                                      borderRadius: '9999px',
                                      backgroundColor: isDark
                                        ? 'rgba(57, 125, 103, 0.24)'
                                        : 'rgba(57, 125, 103, 0.14)',
                                      color: '#397D67',
                                      fontSize: '10.5px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    <CheckCircle2 size={11} />
                                    <span>En directorio</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <button
                                type="button"
                                aria-label="Editar prospecto"
                                title="Editar prospecto"
                                onClick={() => {
                                  setEditingProspecto(prospecto);
                                  setIsProspectoModalOpen(true);
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  border: `1px solid ${borderSubtle}`,
                                  backgroundColor: elevatedBg,
                                  color: textPrimary,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <Pencil size={13} style={{ color: '#B69A55' }} />
                              </button>
                              <button
                                type="button"
                                aria-label="Eliminar prospecto"
                                title="Eliminar prospecto"
                                onClick={() => setDeleteTarget(prospecto)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(198, 93, 88, 0.35)',
                                  backgroundColor: isDark
                                    ? 'rgba(198, 93, 88, 0.14)'
                                    : 'rgba(198, 93, 88, 0.08)',
                                  color: '#C65D58',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              fontSize: '12px',
                              color: textSecondary,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={12} style={{ color: '#B69A55', flexShrink: 0 }} />
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {prospecto.telefono}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={12} style={{ color: '#B69A55', flexShrink: 0 }} />
                              <span>{prospecto.ubicacion}</span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                              paddingTop: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 900,
                                color: '#397D67',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatColones(prospecto.monto_estimado)}
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: elevatedBg,
                                color: textSecondary,
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {formatCanalLabel(prospecto.canal_origen)}
                            </span>
                          </div>

                          {/* Botón Pasar a Clientes en etapas avanzadas */}
                          {puedePasarClientes && !yaEnClientes && (
                            <button
                              type="button"
                              disabled={estaConvirtiendo}
                              onClick={() => handleConvertToClient(prospecto)}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                borderRadius: '10px',
                                border: '1px solid rgba(57, 125, 103, 0.45)',
                                backgroundColor: isDark
                                  ? 'rgba(57, 125, 103, 0.22)'
                                  : 'rgba(57, 125, 103, 0.12)',
                                color: isDark ? '#8CE0C3' : '#1E5B47',
                                fontSize: '12px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: estaConvirtiendo ? 'wait' : 'pointer',
                              }}
                            >
                              {estaConvirtiendo ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <UserCheck size={13} />
                              )}
                              <span>Pasar a Clientes</span>
                            </button>
                          )}

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px',
                              paddingTop: '6px',
                              borderTop: `1px solid ${borderSubtle}`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenMoveModal(prospecto)}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '10px',
                                border: `1px solid ${borderSubtle}`,
                                backgroundColor: elevatedBg,
                                color: textPrimary,
                                fontSize: '11.5px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <ArrowRight size={13} style={{ color: '#B69A55' }} />
                              <span>Mover etapa</span>
                            </button>

                            <button
                              type="button"
                              disabled={estaGenerando}
                              onClick={() => handleGenerateMessage(prospecto)}
                              style={{
                                padding: '7px 8px',
                                borderRadius: '10px',
                                border: 'none',
                                background: goldGradient,
                                color: '#101C2C',
                                fontSize: '11.5px',
                                fontWeight: 900,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: estaGenerando ? 'wait' : 'pointer',
                              }}
                            >
                              {estaGenerando ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Sparkles size={13} />
                              )}
                              <span>Mensaje IA</span>
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VISTA 3: QUÉ ATENDER HOY */}
      {!isLoading && activeSubTab === 'atencion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '14px',
              backgroundColor: surfaceBg,
              border: `1px solid ${borderSubtle}`,
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: textPrimary }}>
              Mostrar prospectos sin avance desde
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {UMBRALES_DIAS.map((diasOpt) => {
                const isSelected = diasUmbral === diasOpt;
                return (
                  <button
                    key={diasOpt}
                    type="button"
                    onClick={() => handleChangeDiasUmbral(diasOpt)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '9999px',
                      border: isSelected ? 'none' : `1px solid ${borderSubtle}`,
                      background: isSelected ? goldGradient : elevatedBg,
                      color: isSelected ? '#101C2C' : isDark ? '#FFFFFF' : '#252A31',
                      fontSize: '12px',
                      fontWeight: isSelected ? 900 : 700,
                      cursor: 'pointer',
                    }}
                  >
                    {diasOpt === 1 ? '1 día' : `${diasOpt} días`}
                  </button>
                );
              })}
            </div>
          </div>

          {isAtencionLoading ? (
            <div
              style={{
                padding: '32px 12px',
                borderRadius: '16px',
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Loader2 size={22} className="animate-spin" style={{ color: '#B69A55' }} />
            </div>
          ) : atencionHoy.length === 0 ? (
            <div
              style={{
                padding: '36px 18px',
                borderRadius: '16px',
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#397D67' }} />
              <h4
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '15px', color: textPrimary }}
              >
                Seguimiento al día
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: textSecondary }}>
                No hay prospectos estancados con este umbral de días.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {atencionHoy.map((item) => {
                const diasStalled = safeNumber(item.dias_sin_avance, 0);
                const etapaTexto = ETAPA_LABEL_MAP[item.etapa] || item.etapa;
                const estaGenerando = generatingId === item.id;

                return (
                  <article
                    key={item.id}
                    style={{
                      backgroundColor: surfaceBg,
                      border: `1px solid ${borderSubtle}`,
                      borderLeft: '4px solid #C65D58',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <strong style={{ fontSize: '14.5px', fontWeight: 800, color: textPrimary }}>
                          {formatNombreCompleto(item)}
                        </strong>
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: '9999px',
                            backgroundColor: isDark
                              ? 'rgba(198, 93, 88, 0.22)'
                              : 'rgba(198, 93, 88, 0.12)',
                            color: '#C65D58',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {diasStalled} días sin avance
                        </span>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: textSecondary }}>
                        Etapa actual: <strong style={{ color: textPrimary }}>{etapaTexto}</strong> ·{' '}
                        {item.ubicacion}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: textSecondary }}>
                        Requiere seguimiento prioritario para evitar fuga en esta etapa.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={estaGenerando}
                      onClick={() => handleGenerateMessage(item)}
                      style={{
                        padding: '9px 14px',
                        borderRadius: '12px',
                        border: 'none',
                        background: goldGradient,
                        color: '#101C2C',
                        fontSize: '12.5px',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: estaGenerando ? 'wait' : 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {estaGenerando ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      <span>Redactar mensaje</span>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL PREVENTIVO: CONFIRMAR MOVIMIENTO DE ETAPA */}
      {moveTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar movimiento de etapa"
            onPointerDown={(e) => {
              moveBackdropDownRef.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
              if (moveBackdropDownRef.current && e.target === e.currentTarget && !isMovingStage) {
                setMoveTarget(null);
              }
              moveBackdropDownRef.current = false;
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100020,
              backgroundColor: 'rgba(8, 14, 24, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="modal-container"
              style={{
                width: '100%',
                maxWidth: '460px',
                maxHeight: 'calc(100dvh - 32px)',
                backgroundColor: surfaceBg,
                color: textPrimary,
                borderRadius: '20px',
                border: `1px solid ${borderSubtle}`,
                boxShadow: '0 22px 60px rgba(0, 0, 0, 0.42)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${borderSubtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h3
                  className="aureus-imperial-title"
                  style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textPrimary }}
                >
                  Mover etapa
                </h3>
                <button
                  type="button"
                  onClick={() => setMoveTarget(null)}
                  disabled={isMovingStage}
                  aria-label="Cerrar ventana"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '13.5px', color: textSecondary }}>
                  Prospecto:{' '}
                  <strong style={{ color: textPrimary }}>{formatNombreCompleto(moveTarget)}</strong>
                </div>

                <div>
                  <label
                    htmlFor="crm-nueva-etapa-select"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: textSecondary,
                      marginBottom: '6px',
                    }}
                  >
                    Selecciona la nueva etapa
                  </label>
                  <select
                    id="crm-nueva-etapa-select"
                    value={selectedNextStage}
                    onChange={(e) => setSelectedNextStage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `1px solid ${borderSubtle}`,
                      backgroundColor: isDark ? '#0F1A2A' : '#FAF8F4',
                      color: textPrimary,
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    {ETAPAS_EMBUDO.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: isDark
                      ? 'rgba(182, 154, 85, 0.14)'
                      : 'rgba(182, 154, 85, 0.12)',
                    border: `1px solid ${borderSubtle}`,
                    fontSize: '13px',
                    lineHeight: 1.45,
                    color: textPrimary,
                    fontWeight: 600,
                  }}
                >
                  Al mover a {ETAPA_LABEL_MAP[selectedNextStage] || selectedNextStage} se registrará
                  el avance y se actualizarán los días promedio de seguimiento.
                </div>

                <div>
                  <label
                    htmlFor="crm-nota-cambio"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: textSecondary,
                      marginBottom: '6px',
                    }}
                  >
                    Nota del cambio
                  </label>
                  <input
                    id="crm-nota-cambio"
                    type="text"
                    value={moveNota}
                    onChange={(e) => setMoveNota(e.target.value)}
                    placeholder="Ej. Comprobantes recibidos y validados"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: `1px solid ${borderSubtle}`,
                      backgroundColor: isDark ? '#0F1A2A' : '#FAF8F4',
                      color: textPrimary,
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: '14px 20px',
                  borderTop: `1px solid ${borderSubtle}`,
                  backgroundColor: surfaceBg,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMoveTarget(null)}
                  disabled={isMovingStage}
                  style={{
                    padding: '10px 15px',
                    borderRadius: '12px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMoveStage}
                  disabled={isMovingStage}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: goldGradient,
                    color: '#101C2C',
                    fontSize: '13px',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isMovingStage ? 'wait' : 'pointer',
                  }}
                >
                  {isMovingStage ? <Loader2 size={15} className="animate-spin" /> : null}
                  <span>Confirmar movimiento</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL CONFIRMACIÓN: ELIMINAR PROSPECTO */}
      {deleteTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Eliminar prospecto"
            onPointerDown={(e) => {
              deleteBackdropDownRef.current = e.target === e.currentTarget;
            }}
            onClick={(e) => {
              if (deleteBackdropDownRef.current && e.target === e.currentTarget && !isDeleting) {
                setDeleteTarget(null);
              }
              deleteBackdropDownRef.current = false;
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100020,
              backgroundColor: 'rgba(8, 14, 24, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="modal-container"
              style={{
                width: '100%',
                maxWidth: '420px',
                maxHeight: 'calc(100dvh - 32px)',
                backgroundColor: surfaceBg,
                color: textPrimary,
                borderRadius: '20px',
                border: '1px solid rgba(198, 93, 88, 0.45)',
                boxShadow: '0 22px 60px rgba(0, 0, 0, 0.42)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${borderSubtle}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={18} style={{ color: '#C65D58' }} />
                  <h3
                    className="aureus-imperial-title"
                    style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textPrimary }}
                  >
                    Eliminar prospecto
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  aria-label="Cerrar ventana"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  color: textSecondary,
                }}
              >
                ¿Deseas eliminar a{' '}
                <strong style={{ color: textPrimary }}>{formatNombreCompleto(deleteTarget)}</strong>{' '}
                del tablero de seguimiento? Esta acción retirará su historial de etapas.
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: '14px 20px',
                  borderTop: `1px solid ${borderSubtle}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  style={{
                    padding: '10px 15px',
                    borderRadius: '12px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProspecto}
                  disabled={isDeleting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#C65D58',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isDeleting ? 'wait' : 'pointer',
                  }}
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Sí, eliminar</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL BORRADOR DE MENSAJE IA: NO SE CIERRA CON CLIC EN EL FONDO */}
      {draftModalData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Propuesta de mensaje de Séneca"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100020,
              backgroundColor: 'rgba(8, 14, 24, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="modal-container"
              style={{
                width: '100%',
                maxWidth: '520px',
                maxHeight: 'calc(100dvh - 32px)',
                backgroundColor: surfaceBg,
                color: textPrimary,
                borderRadius: '20px',
                border: `1px solid ${borderSubtle}`,
                boxShadow: '0 22px 60px rgba(0, 0, 0, 0.42)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 20px',
                  borderBottom: `1px solid ${borderSubtle}`,
                  background: isDark
                    ? 'linear-gradient(135deg, #101C2C 0%, #162436 100%)'
                    : 'linear-gradient(135deg, #F5F3ED 0%, #FFFFFF 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '11px',
                      background: goldGradient,
                      color: '#101C2C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={18} strokeWidth={2.4} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3
                      className="aureus-imperial-title"
                      style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textPrimary }}
                    >
                      Propuesta de Séneca
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '3px',
                        padding: '2px 9px',
                        borderRadius: '9999px',
                        backgroundColor: isDark
                          ? 'rgba(182, 154, 85, 0.22)'
                          : 'rgba(182, 154, 85, 0.18)',
                        color: isDark ? '#E5C97B' : '#7C6429',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      Pendiente de aprobación
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isUpdatingDraft && !isCopiedSuccess) setDraftModalData(null);
                  }}
                  disabled={isUpdatingDraft || isCopiedSuccess}
                  aria-label="Cerrar ventana"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9999px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '13px', color: textSecondary }}>
                  Destinatario:{' '}
                  <strong style={{ color: textPrimary }}>
                    {formatNombreCompleto(draftModalData.prospecto)}
                  </strong>{' '}
                  · Etapa:{' '}
                  <strong style={{ color: '#B69A55' }}>
                    {ETAPA_LABEL_MAP[draftModalData.prospecto?.etapa] ||
                      draftModalData.prospecto?.etapa}
                  </strong>
                </div>

                <div>
                  <label
                    htmlFor="crm-borrador-mensaje"
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: textSecondary,
                      marginBottom: '6px',
                    }}
                  >
                    Revisa o ajusta el borrador antes de aprobar y copiar
                  </label>
                  <textarea
                    id="crm-borrador-mensaje"
                    rows={5}
                    value={draftEditableText}
                    onChange={(e) => setDraftEditableText(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1px solid ${borderSubtle}`,
                      backgroundColor: isDark ? '#0F1A2A' : '#FAF8F4',
                      color: textPrimary,
                      fontSize: '14px',
                      lineHeight: 1.55,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: '14px 20px',
                  borderTop: `1px solid ${borderSubtle}`,
                  backgroundColor: surfaceBg,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  disabled={isUpdatingDraft || isCopiedSuccess}
                  style={{
                    padding: '10px 15px',
                    borderRadius: '12px',
                    border: '1px solid rgba(198, 93, 88, 0.45)',
                    backgroundColor: isDark
                      ? 'rgba(198, 93, 88, 0.14)'
                      : 'rgba(198, 93, 88, 0.08)',
                    color: '#C65D58',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isUpdatingDraft || isCopiedSuccess ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Descartar</span>
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndCopy}
                  disabled={isUpdatingDraft || isCopiedSuccess}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isCopiedSuccess ? '#397D67' : goldGradient,
                    color: isCopiedSuccess ? '#FFFFFF' : '#101C2C',
                    fontSize: '13px',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: isUpdatingDraft ? 'wait' : 'pointer',
                    boxShadow: isCopiedSuccess
                      ? '0 4px 14px rgba(57, 125, 103, 0.35)'
                      : '0 4px 12px rgba(182, 154, 85, 0.30)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCopiedSuccess ? (
                    <Check size={15} strokeWidth={2.8} />
                  ) : isUpdatingDraft ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Copy size={15} />
                  )}
                  <span>
                    {isCopiedSuccess ? 'Copiado al portapapeles' : 'Aprobar y copiar'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODALES SECUNDARIOS */}
      <CrmProspectoModal
        isOpen={isProspectoModalOpen}
        initialProspecto={editingProspecto}
        onClose={() => {
          setIsProspectoModalOpen(false);
          setEditingProspecto(null);
        }}
        onSaved={(saved, wasEdit) => {
          if (saved && saved.id) {
            setProspectos((prev) =>
              wasEdit
                ? prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p))
                : [saved, ...prev]
            );
          }
          showFeedback(
            'success',
            wasEdit
              ? 'Prospecto actualizado correctamente.'
              : 'Prospecto registrado correctamente en seguimiento.'
          );
          cargarDatosCrm(diasUmbral, { silent: true });
        }}
      />

      <CrmCerebroModal
        isOpen={isCerebroModalOpen}
        onClose={() => setIsCerebroModalOpen(false)}
        onSaved={() => {
          showFeedback('success', 'Configuración de tono actualizada con éxito.');
        }}
      />
    </div>
  );
}

export default CrmPrestamistaDashboard;

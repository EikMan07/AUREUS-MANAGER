import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Megaphone,
  BarChart3,
  Kanban,
  Clock,
  Sparkles,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
  X,
  Loader2,
  RefreshCw,
  Edit3,
  Pencil,
  ChevronDown,
  ChevronUp,
  Check,
  TrendingUp,
  BellRing,
  Wallet,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  ClassicalLaurelDivider,
  ImperialCornerAccents,
  handleSpotlightMouseMove,
} from '../Common/ClassicalAppArchitecture';
import {
  obtenerProspectosCrmAdmin,
  moverEtapaProspectoCrmAdmin,
  eliminarProspectoCrmAdmin,
  obtenerEmbudoCrmAdmin,
  obtenerAtencionCrmAdmin,
  redactarMensajeCrmAdmin,
  obtenerCampanasCrmAdmin,
  actualizarCampanaCrmAdmin,
  generarPiezasCampanaCrmAdmin,
  actualizarEstadoPiezaCrmAdmin,
} from '../../services/apiClient';
import { AdminCrmProspectoModal } from './AdminCrmProspectoModal';
import { AdminCrmCampanaModal } from './AdminCrmCampanaModal';

const ETAPAS_ADMIN = [
  { key: 'VISITANTE_LANDING', label: 'Visitante en portada' },
  { key: 'REGISTRO_INICIADO', label: 'Registro iniciado' },
  { key: 'CONSENTIMIENTO_LEY_8968', label: 'Consentimiento legal' },
  { key: 'CUENTA_ACTIVA', label: 'Cuenta activa' },
  { key: 'PRIMER_PRESTAMO', label: 'Primer préstamo' },
  { key: 'PRESTAMISTA_ACTIVO', label: 'Prestamista activo' },
  { key: 'EN_RIESGO_BAJA', label: 'En riesgo de baja' },
];

const ETAPA_ADMIN_LABEL_MAP = Object.fromEntries(ETAPAS_ADMIN.map((e) => [e.key, e.label]));

const ESTADOS_CAMPANA = [
  { key: 'OBJETIVO', label: 'Objetivo' },
  { key: 'FICHA_CAMPANA', label: 'Ficha de campaña' },
  { key: 'PLAN_PIEZAS', label: 'Plan de piezas' },
  { key: 'EN_GENERACION', label: 'En generación' },
  { key: 'PENDIENTE_APROBACION', label: 'Pendiente de aprobación' },
  { key: 'PROGRAMADA', label: 'Programada' },
  { key: 'PUBLICADA', label: 'Publicada' },
  { key: 'FINALIZADA', label: 'Finalizada' },
];

const ESTADO_CAMPANA_LABEL_MAP = Object.fromEntries(
  ESTADOS_CAMPANA.map((item) => [item.key, item.label])
);

const CANAL_ADMIN_LABELS = {
  LANDING_PAGE: 'Portada informativa',
  REDES_SOCIALES: 'Redes sociales',
  FACEBOOK_ADS: 'Redes sociales',
  REFERIDO: 'Referido',
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

function formatCanalAdmin(canal) {
  if (!canal) return 'Portada informativa';
  const key = String(canal).toUpperCase();
  return CANAL_ADMIN_LABELS[key] || String(canal).replaceAll('_', ' ');
}

function getNextAdminStageKey(currentStage) {
  const idx = ETAPAS_ADMIN.findIndex((item) => item.key === currentStage);
  if (idx === -1) return 'REGISTRO_INICIADO';
  if (idx < ETAPAS_ADMIN.length - 1) return ETAPAS_ADMIN[idx + 1].key;
  return ETAPAS_ADMIN[0].key;
}

function getPiezaEstadoLabel(estado) {
  if (estado === 'APROBADO') return 'Aprobada';
  if (estado === 'DESCARTADO') return 'Descartada';
  return 'Pendiente de aprobación';
}

export function AdminCrmDashboard() {
  const { isDark } = useTheme();
  const moveBackdropDownRef = useRef(false);
  const deleteBackdropDownRef = useRef(false);

  // Sub-vistas del Módulo V
  const [activeSubTab, setActiveSubTab] = useState('embudo');
  const [diasUmbral, setDiasUmbral] = useState(3);

  // Datos principales
  const [prospectos, setProspectos] = useState([]);
  const [embudo, setEmbudo] = useState([]);
  const [atencionHoy, setAtencionHoy] = useState([]);
  const [campanas, setCampanas] = useState([]);
  const [expandedCampanas, setExpandedCampanas] = useState({});

  // Estados de carga y avisos
  const [isLoading, setIsLoading] = useState(true);
  const [isAtencionLoading, setIsAtencionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  // Modales de creación y edición
  const [isProspectoModalOpen, setIsProspectoModalOpen] = useState(false);
  const [editingProspecto, setEditingProspecto] = useState(null);
  const [isCampanaModalOpen, setIsCampanaModalOpen] = useState(false);
  const [editingCampana, setEditingCampana] = useState(null);

  // Modal preventivo de movimiento de etapa
  const [moveTarget, setMoveTarget] = useState(null);
  const [selectedNextStage, setSelectedNextStage] = useState('');
  const [isMovingStage, setIsMovingStage] = useState(false);

  // Modal preventivo de eliminación de interesado
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal borrador IA para interesado
  const [generatingProspectoId, setGeneratingProspectoId] = useState(null);
  const [draftModalData, setDraftModalData] = useState(null);
  const [draftEditableText, setDraftEditableText] = useState('');
  const [isCopiedSuccess, setIsCopiedSuccess] = useState(false);

  // Estados de acciones en campañas y piezas
  const [generatingPiezasId, setGeneratingPiezasId] = useState(null);
  const [updatingCampanaId, setUpdatingCampanaId] = useState(null);
  const [updatingPiezaId, setUpdatingPiezaId] = useState(null);

  const showFeedback = useCallback((type, text) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4200);
  }, []);

  const cargarTodoCrmAdmin = useCallback(
    async (diasConsulta = diasUmbral, { silent = false } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const [resProspectos, resEmbudo, resAtencion, resCampanas] = await Promise.all([
          obtenerProspectosCrmAdmin(),
          obtenerEmbudoCrmAdmin(),
          obtenerAtencionCrmAdmin(diasConsulta),
          obtenerCampanasCrmAdmin(),
        ]);

        setProspectos(Array.isArray(resProspectos?.prospectos) ? resProspectos.prospectos : []);
        setEmbudo(Array.isArray(resEmbudo?.embudo) ? resEmbudo.embudo : []);
        setAtencionHoy(
          Array.isArray(resAtencion?.prospectos_atencion) ? resAtencion.prospectos_atencion : []
        );
        setCampanas(Array.isArray(resCampanas?.campanas) ? resCampanas.campanas : []);
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible cargar la información comercial en este momento.'
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
    cargarTodoCrmAdmin(diasUmbral);
  }, [cargarTodoCrmAdmin, diasUmbral]);

  const handleChangeDiasUmbral = useCallback(
    async (nuevoUmbral) => {
      setDiasUmbral(nuevoUmbral);
      setIsAtencionLoading(true);
      try {
        const res = await obtenerAtencionCrmAdmin(nuevoUmbral);
        setAtencionHoy(Array.isArray(res?.prospectos_atencion) ? res.prospectos_atencion : []);
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible actualizar la bandeja de seguimiento.'
        );
      } finally {
        setIsAtencionLoading(false);
      }
    },
    [showFeedback]
  );

  const kpiMetrics = useMemo(() => {
    const hace7DiasMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let interesados7Dias = 0;
    let sinRevisar = 0;

    prospectos.forEach((p) => {
      const fechaIngreso = new Date(p.fecha_ingreso || p.creado_en).getTime();
      if (Number.isFinite(fechaIngreso) && fechaIngreso >= hace7DiasMs) {
        interesados7Dias += 1;
      }
      if (p.revisado === false) {
        sinRevisar += 1;
      }
    });

    let campanasActivas = 0;
    let presupuestoTotal = 0;

    campanas.forEach((c) => {
      if (c.estado !== 'FINALIZADA') {
        campanasActivas += 1;
      }
      presupuestoTotal += safeNumber(c.presupuesto, 0);
    });

    return {
      interesados7Dias,
      sinRevisar,
      campanasActivas,
      presupuestoTotal,
    };
  }, [prospectos, campanas]);

  const embudoNormalizado = useMemo(() => {
    const mapa = new Map(embudo.map((item) => [item.etapa, item]));
    return ETAPAS_ADMIN.map((etapaDef) => {
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

  const distribucionCanales = useMemo(() => {
    const total = prospectos.length;
    if (total === 0) return [];
    const conteos = new Map();
    prospectos.forEach((p) => {
      const canal = p.canal_origen || 'LANDING_PAGE';
      conteos.set(canal, safeNumber(conteos.get(canal), 0) + 1);
    });
    return Array.from(conteos.entries())
      .map(([canal_origen, count]) => ({
        canal_origen,
        total: count,
        porcentaje: Number(((count / total) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [prospectos]);

  const prospectosPorEtapa = useMemo(() => {
    const grupos = {};
    ETAPAS_ADMIN.forEach((e) => {
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
    setSelectedNextStage(getNextAdminStageKey(prospecto.etapa));
  }, []);

  const handleConfirmMoveStage = useCallback(async () => {
    if (!moveTarget || !selectedNextStage) return;
    const movedId = moveTarget.id;
    const nextStage = selectedNextStage;
    setIsMovingStage(true);
    try {
      const res = await moverEtapaProspectoCrmAdmin(movedId, {
        etapa_nueva: nextStage,
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
      const etiquetaDestino = ETAPA_ADMIN_LABEL_MAP[nextStage] || nextStage;
      setMoveTarget(null);
      showFeedback('success', `Avance registrado hacia ${etiquetaDestino}.`);
      cargarTodoCrmAdmin(diasUmbral, { silent: true });
    } catch (err) {
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible actualizar la etapa en este momento.'
      );
    } finally {
      setIsMovingStage(false);
    }
  }, [moveTarget, selectedNextStage, cargarTodoCrmAdmin, diasUmbral, showFeedback]);

  const handleConfirmDeleteProspecto = useCallback(async () => {
    if (!deleteTarget?.id) return;
    const deletedId = deleteTarget.id;
    setIsDeleting(true);
    try {
      await eliminarProspectoCrmAdmin(deletedId);
      setProspectos((prev) => prev.filter((p) => p.id !== deletedId));
      setDeleteTarget(null);
      showFeedback('info', 'Interesado eliminado del seguimiento.');
      cargarTodoCrmAdmin(diasUmbral, { silent: true });
    } catch (err) {
      showFeedback(
        'error',
        err?.userMessage || 'No fue posible eliminar el interesado en este momento.'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, cargarTodoCrmAdmin, diasUmbral, showFeedback]);

  const handleGenerateMessageAdmin = useCallback(
    async (prospecto) => {
      if (!prospecto?.id) return;
      setGeneratingProspectoId(prospecto.id);
      try {
        const res = await redactarMensajeCrmAdmin(prospecto.id);
        const texto = typeof res?.mensaje === 'string' ? res.mensaje : '';
        if (!texto) {
          throw new Error('Mensaje vacío');
        }
        setIsCopiedSuccess(false);
        setDraftModalData({ prospecto, texto });
        setDraftEditableText(texto);
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage ||
            'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.'
        );
      } finally {
        setGeneratingProspectoId(null);
      }
    },
    [showFeedback]
  );

  const handleCopyAdminDraft = useCallback(async () => {
    if (isCopiedSuccess) return;
    const texto = draftEditableText.trim();
    if (texto && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto).catch(() => {});
    }
    setIsCopiedSuccess(true);
    setTimeout(() => {
      setDraftModalData(null);
      setDraftEditableText('');
      setIsCopiedSuccess(false);
      showFeedback('success', 'Mensaje aprobado y copiado al portapapeles.');
    }, 900);
  }, [draftEditableText, isCopiedSuccess, showFeedback]);

  const handleDiscardAdminDraft = useCallback(() => {
    setDraftModalData(null);
    setDraftEditableText('');
    setIsCopiedSuccess(false);
    showFeedback('info', 'Borrador descartado correctamente.');
  }, [showFeedback]);

  const handleAdvanceCampanaEstado = useCallback(
    async (campanaId, nuevoEstado) => {
      setUpdatingCampanaId(campanaId);
      try {
        await actualizarCampanaCrmAdmin(campanaId, { estado: nuevoEstado });
        const labelEstado = ESTADO_CAMPANA_LABEL_MAP[nuevoEstado] || nuevoEstado;
        showFeedback('success', `Estado de campaña actualizado a ${labelEstado}.`);
        cargarTodoCrmAdmin(diasUmbral, { silent: true });
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible actualizar el estado de la campaña.'
        );
      } finally {
        setUpdatingCampanaId(null);
      }
    },
    [cargarTodoCrmAdmin, diasUmbral, showFeedback]
  );

  const handleGeneratePiezas = useCallback(
    async (campanaId) => {
      setGeneratingPiezasId(campanaId);
      try {
        const res = await generarPiezasCampanaCrmAdmin(campanaId);
        const nuevasPiezas = Array.isArray(res?.piezas) ? res.piezas : [];
        setCampanas((prev) =>
          prev.map((c) => {
            if (c.id !== campanaId) return c;
            const prevPiezas = Array.isArray(c.piezas) ? c.piezas : [];
            const merged = [...prevPiezas, ...nuevasPiezas];
            const aprobadas = merged.filter((p) => p.estado === 'APROBADO').length;
            return {
              ...c,
              estado: 'PLAN_PIEZAS',
              piezas: merged,
              total_piezas: merged.length,
              piezas_aprobadas: aprobadas,
            };
          })
        );
        setExpandedCampanas((prev) => ({ ...prev, [campanaId]: true }));
        showFeedback('success', 'Se generaron 3 piezas en estado pendiente de aprobación.');
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible generar las piezas de la campaña en este momento.'
        );
      } finally {
        setGeneratingPiezasId(null);
      }
    },
    [showFeedback]
  );

  const handleUpdatePiezaEstado = useCallback(
    async (campanaId, piezaId, nuevoEstado) => {
      setUpdatingPiezaId(piezaId);
      try {
        await actualizarEstadoPiezaCrmAdmin(piezaId, nuevoEstado);
        setCampanas((prev) =>
          prev.map((c) => {
            if (c.id !== campanaId) return c;
            const nextPiezas = (Array.isArray(c.piezas) ? c.piezas : []).map((p) =>
              p.id === piezaId ? { ...p, estado: nuevoEstado } : p
            );
            const aprobadas = nextPiezas.filter((p) => p.estado === 'APROBADO').length;
            return {
              ...c,
              piezas: nextPiezas,
              piezas_aprobadas: aprobadas,
            };
          })
        );
        showFeedback(
          nuevoEstado === 'APROBADO' ? 'success' : 'info',
          nuevoEstado === 'APROBADO'
            ? 'Pieza aprobada correctamente.'
            : 'Pieza descartada correctamente.'
        );
      } catch (err) {
        showFeedback(
          'error',
          err?.userMessage || 'No fue posible actualizar el estado de la pieza.'
        );
      } finally {
        setUpdatingPiezaId(null);
      }
    },
    [showFeedback]
  );

  // Paleta Neoclásico-Futurista de Aureus Manager
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F5F3ED';
  const cardBg = isDark ? '#142234' : '#FFFFFF';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#A9B4C2' : '#5A626E';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.24)' : 'rgba(182, 154, 85, 0.28)';
  const goldGradient = 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '88px' }}>
      {/* Encabezado Ejecutivo */}
      <section
        aria-label="Cabecera de crecimiento y mercadeo"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2
            className="aureus-imperial-title"
            style={{
              margin: 0,
              fontSize: '21px',
              fontWeight: 900,
              color: textPrimary,
              lineHeight: 1.2,
            }}
          >
            Crecimiento y Mercadeo
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: textSecondary }}>
            Seguimiento de nuevos prestamistas y campañas comerciales
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setEditingProspecto(null);
              setIsProspectoModalOpen(true);
            }}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              border: `1px solid ${borderSubtle}`,
              backgroundColor: surfaceBg,
              color: textPrimary,
              fontSize: '13px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} strokeWidth={2.5} style={{ color: '#B69A55' }} />
            <span>Nuevo interesado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCampana(null);
              setIsCampanaModalOpen(true);
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
            <Plus size={15} strokeWidth={2.6} />
            <span>Nueva campaña</span>
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
              display: 'flex',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 Tarjetas KPI Ejecutivas con Iconos Circulares */}
      <section
        aria-label="Indicadores de crecimiento y mercadeo"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
        }}
      >
        {[
          {
            label: 'Interesados últimos 7 días',
            value: kpiMetrics.interesados7Dias,
            accent: '#B69A55',
            iconBg: isDark ? 'rgba(182, 154, 85, 0.18)' : 'rgba(182, 154, 85, 0.14)',
            Icon: TrendingUp,
          },
          {
            label: 'Sin revisar',
            value: kpiMetrics.sinRevisar,
            accent: '#3B82F6',
            iconBg: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)',
            Icon: BellRing,
          },
          {
            label: 'Campañas activas',
            value: kpiMetrics.campanasActivas,
            accent: '#397D67',
            iconBg: isDark ? 'rgba(57, 125, 103, 0.22)' : 'rgba(57, 125, 103, 0.13)',
            Icon: Megaphone,
          },
          {
            label: 'Presupuesto en campañas',
            value: formatColones(kpiMetrics.presupuestoTotal),
            accent: isDark ? '#E5C97B' : '#7C6429',
            iconBg: isDark ? 'rgba(212, 180, 106, 0.18)' : 'rgba(182, 154, 85, 0.15)',
            Icon: Wallet,
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
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: textSecondary }}>
                {label}
              </span>
              <strong
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: accent,
                  lineHeight: 1.15,
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

      {/* Barra Segmentada de 4 Pestañas */}
      <div
        className="segmented-tabs-control-three"
        role="tablist"
        aria-label="Secciones de crecimiento y mercadeo"
        style={{
          backgroundColor: surfaceBg,
          borderColor: borderSubtle,
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'embudo', label: 'Embudo', Icon: BarChart3 },
          { id: 'tablero', label: 'Tablero', Icon: Kanban },
          { id: 'atencion', label: 'Qué atender hoy', Icon: Clock },
          { id: 'campanas', label: 'Campañas', Icon: Megaphone },
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
            Cargando información comercial...
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
                Aún no hay interesados registrados para mostrar la distribución de canales.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {distribucionCanales.map((canal) => (
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
                      <span>{formatCanalAdmin(canal.canal_origen)}</span>
                      <span style={{ color: '#B69A55', fontVariantNumeric: 'tabular-nums' }}>
                        {canal.total} · {canal.porcentaje}%
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
                          width: `${Math.min(100, Math.max(0, canal.porcentaje))}%`,
                          height: '100%',
                          background: goldGradient,
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                  </div>
                ))}
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
                Interesados últimos 7 días:{' '}
                <strong style={{ color: textPrimary }}>{kpiMetrics.interesados7Dias}</strong>
              </span>
              <span>
                Sin revisar:{' '}
                <strong style={{ color: '#3B82F6' }}>{kpiMetrics.sinRevisar}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => cargarTodoCrmAdmin(diasUmbral)}
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
            {ETAPAS_ADMIN.map((etapaDef) => {
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
                      Sin interesados en esta etapa
                    </div>
                  ) : (
                    items.map((prospecto) => {
                      const esNuevo = prospecto.revisado === false;
                      const estaGenerando = generatingProspectoId === prospecto.id;

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
                                {prospecto.nombre}
                              </strong>
                              {esNuevo && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    marginTop: '4px',
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
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <button
                                type="button"
                                aria-label="Editar interesado"
                                title="Editar interesado"
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
                                aria-label="Eliminar interesado"
                                title="Eliminar interesado"
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
                              <MapPin size={12} style={{ color: '#B69A55', flexShrink: 0 }} />
                              <span>{prospecto.zona || 'Sin zona'}</span>
                            </div>
                            {prospecto.correo && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={12} style={{ color: '#B69A55', flexShrink: 0 }} />
                                <span style={{ wordBreak: 'break-all' }}>{prospecto.correo}</span>
                              </div>
                            )}
                            {prospecto.telefono && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Phone size={12} style={{ color: '#B69A55', flexShrink: 0 }} />
                                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {prospecto.telefono}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: elevatedBg,
                                color: textSecondary,
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {formatCanalAdmin(prospecto.canal_origen)}
                            </span>
                          </div>

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
                              onClick={() => handleGenerateMessageAdmin(prospecto)}
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
              Mostrar interesados sin avance desde
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
                No hay interesados sin avance para este umbral de días.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {atencionHoy.map((item) => {
                const diasStalled = safeNumber(item.dias_sin_avance, 0);
                const etapaTexto = ETAPA_ADMIN_LABEL_MAP[item.etapa] || item.etapa;
                const estaGenerando = generatingProspectoId === item.id;

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
                          {item.nombre}
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
                        {item.zona || 'Sin zona'}
                      </p>
                      <p style={{ margin: 0, fontSize: '12px', color: textSecondary }}>
                        Seguimiento prioritario recomendado para avanzar hacia cuenta activa.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={estaGenerando}
                      onClick={() => handleGenerateMessageAdmin(item)}
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

      {/* SUB-VISTA 4: CAMPAÑAS DE MERCADEO */}
      {!isLoading && activeSubTab === 'campanas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {campanas.length === 0 ? (
            <div
              style={{
                padding: '38px 18px',
                borderRadius: '16px',
                backgroundColor: surfaceBg,
                border: `1px solid ${borderSubtle}`,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Megaphone size={32} style={{ color: '#B69A55' }} />
              <h4
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '15.5px', color: textPrimary }}
              >
                No hay campañas registradas
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: textSecondary }}>
                Crea tu primera campaña comercial y genera 3 piezas listas para revisión.
              </p>
            </div>
          ) : (
            campanas.map((campana) => {
              const presupuestoNum = safeNumber(campana.presupuesto, 0);
              const inscritosNum = safeNumber(campana.inscritos_logrados, 0);
              const costoPorInscrito =
                inscritosNum > 0 ? Number((presupuestoNum / inscritosNum).toFixed(2)) : 0;

              const piezasLista = Array.isArray(campana.piezas) ? campana.piezas : [];
              const totalPiezas =
                piezasLista.length > 0 ? piezasLista.length : safeNumber(campana.total_piezas, 0);
              const piezasAprobadas =
                piezasLista.length > 0
                  ? piezasLista.filter((p) => p.estado === 'APROBADO').length
                  : safeNumber(campana.piezas_aprobadas, 0);

              const pasoActualIdx = Math.max(
                0,
                ESTADOS_CAMPANA.findIndex((s) => s.key === campana.estado)
              );
              const isExpanded = Boolean(expandedCampanas[campana.id]);
              const isGenerating = generatingPiezasId === campana.id;
              const isUpdating = updatingCampanaId === campana.id;

              return (
                <article
                  key={campana.id}
                  style={{
                    backgroundColor: surfaceBg,
                    border: `1px solid ${borderSubtle}`,
                    borderRadius: '18px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                        <h4
                          className="aureus-imperial-title"
                          style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textPrimary }}
                        >
                          {campana.nombre}
                        </h4>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: isDark
                              ? 'rgba(182, 154, 85, 0.20)'
                              : 'rgba(182, 154, 85, 0.16)',
                            color: isDark ? '#E5C97B' : '#7C6429',
                            fontSize: '11.5px',
                            fontWeight: 800,
                          }}
                        >
                          {ESTADO_CAMPANA_LABEL_MAP[campana.estado] || campana.estado}
                        </span>
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: '13px', color: textSecondary }}>
                        {campana.objetivo}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: textSecondary }}>
                        Canales: <strong style={{ color: textPrimary }}>{campana.canales}</strong>
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCampana(campana);
                          setIsCampanaModalOpen(true);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${borderSubtle}`,
                          backgroundColor: elevatedBg,
                          color: textPrimary,
                          fontSize: '12px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={13} style={{ color: '#B69A55' }} />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => handleGeneratePiezas(campana.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: 'none',
                          background: goldGradient,
                          color: '#101C2C',
                          fontSize: '12px',
                          fontWeight: 900,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: isGenerating ? 'wait' : 'pointer',
                        }}
                      >
                        {isGenerating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        <span>Generar 3 piezas con IA</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso de 8 pasos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                        gap: '4px',
                      }}
                    >
                      {ESTADOS_CAMPANA.map((stepObj, idx) => {
                        const completed = idx <= pasoActualIdx;
                        return (
                          <div
                            key={stepObj.key}
                            title={stepObj.label}
                            style={{
                              height: '6px',
                              borderRadius: '9999px',
                              background: completed
                                ? goldGradient
                                : isDark
                                  ? 'rgba(255,255,255,0.10)'
                                  : 'rgba(16,28,44,0.10)',
                            }}
                          />
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '11.5px', color: textSecondary, fontWeight: 600 }}>
                        Paso {pasoActualIdx + 1} de 8 · {ESTADO_CAMPANA_LABEL_MAP[campana.estado]}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label
                          htmlFor={`estado-campana-${campana.id}`}
                          style={{ fontSize: '11.5px', color: textSecondary, fontWeight: 700 }}
                        >
                          Avanzar estado:
                        </label>
                        <select
                          id={`estado-campana-${campana.id}`}
                          value={campana.estado}
                          disabled={isUpdating}
                          onChange={(e) => handleAdvanceCampanaEstado(campana.id, e.target.value)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '10px',
                            border: `1px solid ${borderSubtle}`,
                            backgroundColor: isDark ? '#0F1A2A' : '#FAF8F4',
                            color: textPrimary,
                            fontSize: '12px',
                            fontWeight: 700,
                            outline: 'none',
                          }}
                        >
                          {ESTADOS_CAMPANA.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Métricas financieras */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: elevatedBg,
                      border: `1px solid ${borderSubtle}`,
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: textSecondary }}>
                        Presupuesto
                      </span>
                      <strong
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 900,
                          color: textPrimary,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatColones(presupuestoNum)}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: textSecondary }}>
                        Inscritos logrados
                      </span>
                      <strong
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 900,
                          color: '#397D67',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {inscritosNum}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: textSecondary }}>
                        Costo por inscrito
                      </span>
                      <strong
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 900,
                          color: '#B69A55',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatColones(costoPorInscrito)}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: textSecondary }}>
                        Piezas aprobadas
                      </span>
                      <strong
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: textPrimary,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {piezasAprobadas} aprobadas de {totalPiezas} generadas
                      </strong>
                    </div>
                  </div>

                  {/* Panel desplegable de piezas */}
                  {totalPiezas > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCampanas((prev) => ({
                            ...prev,
                            [campana.id]: !prev[campana.id],
                          }))
                        }
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: `1px solid ${borderSubtle}`,
                          backgroundColor: elevatedBg,
                          color: textPrimary,
                          fontSize: '12.5px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                      >
                        <span>Revisar piezas generadas · {totalPiezas}</span>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '10px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {piezasLista.map((pieza) => {
                            const isApproved = pieza.estado === 'APROBADO';
                            const isDiscarded = pieza.estado === 'DESCARTADO';
                            const isUpdatingThis = updatingPiezaId === pieza.id;

                            return (
                              <div
                                key={pieza.id}
                                style={{
                                  backgroundColor: cardBg,
                                  border: `1px solid ${borderSubtle}`,
                                  borderRadius: '14px',
                                  padding: '12px 14px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      justifyContent: 'space-between',
                                      gap: '6px',
                                    }}
                                  >
                                    <strong style={{ fontSize: '13.5px', fontWeight: 800, color: textPrimary }}>
                                      {pieza.titulo}
                                    </strong>
                                    <span
                                      style={{
                                        flexShrink: 0,
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        backgroundColor: elevatedBg,
                                        color: '#B69A55',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                      }}
                                    >
                                      {pieza.formato || '1:1'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
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
                                      {pieza.canal || 'Facebook'}
                                    </span>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        backgroundColor: isApproved
                                          ? 'rgba(57, 125, 103, 0.16)'
                                          : isDiscarded
                                            ? 'rgba(198, 93, 88, 0.16)'
                                            : 'rgba(182, 154, 85, 0.18)',
                                        color: isApproved
                                          ? '#397D67'
                                          : isDiscarded
                                            ? '#C65D58'
                                            : isDark
                                              ? '#E5C97B'
                                              : '#7C6429',
                                      }}
                                    >
                                      {getPiezaEstadoLabel(pieza.estado)}
                                    </span>
                                  </div>

                                  <p
                                    style={{
                                      margin: '4px 0 0',
                                      fontSize: '12.5px',
                                      lineHeight: 1.5,
                                      color: textSecondary,
                                    }}
                                  >
                                    {pieza.copy_propuesto}
                                  </p>
                                </div>

                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '6px',
                                    paddingTop: '8px',
                                    borderTop: `1px solid ${borderSubtle}`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    disabled={isUpdatingThis}
                                    onClick={() =>
                                      handleUpdatePiezaEstado(campana.id, pieza.id, 'APROBADO')
                                    }
                                    style={{
                                      padding: '7px 8px',
                                      borderRadius: '10px',
                                      border: 'none',
                                      background: isApproved ? '#397D67' : goldGradient,
                                      color: isApproved ? '#FFFFFF' : '#101C2C',
                                      fontSize: '12px',
                                      fontWeight: 900,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      cursor: isUpdatingThis ? 'wait' : 'pointer',
                                    }}
                                  >
                                    <Check size={13} strokeWidth={2.6} />
                                    <span>Aprobar</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isUpdatingThis}
                                    onClick={() =>
                                      handleUpdatePiezaEstado(campana.id, pieza.id, 'DESCARTADO')
                                    }
                                    style={{
                                      padding: '7px 8px',
                                      borderRadius: '10px',
                                      border: '1px solid rgba(198, 93, 88, 0.45)',
                                      backgroundColor: isDiscarded
                                        ? 'rgba(198, 93, 88, 0.22)'
                                        : 'rgba(198, 93, 88, 0.08)',
                                      color: '#C65D58',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '5px',
                                      cursor: isUpdatingThis ? 'wait' : 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>Descartar</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {/* MODAL PREVENTIVO: MOVER ETAPA DE INTERESADO */}
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
                  Interesado: <strong style={{ color: textPrimary }}>{moveTarget.nombre}</strong>
                </div>

                <div>
                  <label
                    htmlFor="admin-crm-select-etapa"
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
                    id="admin-crm-select-etapa"
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
                    {ETAPAS_ADMIN.map((opt) => (
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
                  Al mover a {ETAPA_ADMIN_LABEL_MAP[selectedNextStage] || selectedNextStage} se
                  registrará el avance y se actualizarán los días promedio del embudo comercial.
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

      {/* MODAL CONFIRMACIÓN: ELIMINAR INTERESADO */}
      {deleteTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Eliminar interesado"
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
                    Eliminar interesado
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
                ¿Deseas eliminar a <strong style={{ color: textPrimary }}>{deleteTarget.nombre}</strong>{' '}
                del embudo comercial? Esta acción retirará su historial de etapas.
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

      {/* MODAL BORRADOR IA PARA INTERESADO: NO SE CIERRA CON CLIC EN EL FONDO */}
      {draftModalData &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Propuesta de mensaje comercial"
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    }}
                  >
                    <Sparkles size={18} strokeWidth={2.4} />
                  </div>
                  <div>
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
                    if (!isCopiedSuccess) setDraftModalData(null);
                  }}
                  disabled={isCopiedSuccess}
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
                  <strong style={{ color: textPrimary }}>{draftModalData.prospecto?.nombre}</strong>{' '}
                  · Etapa:{' '}
                  <strong style={{ color: '#B69A55' }}>
                    {ETAPA_ADMIN_LABEL_MAP[draftModalData.prospecto?.etapa] ||
                      draftModalData.prospecto?.etapa}
                  </strong>
                </div>

                <textarea
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
                  onClick={handleDiscardAdminDraft}
                  disabled={isCopiedSuccess}
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
                    cursor: isCopiedSuccess ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Descartar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAdminDraft}
                  disabled={isCopiedSuccess}
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
                    cursor: 'pointer',
                    boxShadow: isCopiedSuccess
                      ? '0 4px 14px rgba(57, 125, 103, 0.35)'
                      : '0 4px 12px rgba(182, 154, 85, 0.30)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isCopiedSuccess ? <Check size={15} strokeWidth={2.8} /> : <Copy size={15} />}
                  <span>
                    {isCopiedSuccess ? 'Copiado al portapapeles' : 'Aprobar y copiar'}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODALES DE CREACIÓN Y EDICIÓN */}
      <AdminCrmProspectoModal
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
              ? 'Interesado actualizado correctamente.'
              : 'Interesado registrado correctamente en el embudo.'
          );
          cargarTodoCrmAdmin(diasUmbral, { silent: true });
        }}
      />

      <AdminCrmCampanaModal
        isOpen={isCampanaModalOpen}
        campana={editingCampana}
        onClose={() => {
          setIsCampanaModalOpen(false);
          setEditingCampana(null);
        }}
        onSaved={() => {
          showFeedback(
            'success',
            editingCampana
              ? 'Campaña actualizada correctamente.'
              : 'Campaña creada correctamente.'
          );
          cargarTodoCrmAdmin(diasUmbral, { silent: true });
        }}
      />
    </div>
  );
}

export default AdminCrmDashboard;

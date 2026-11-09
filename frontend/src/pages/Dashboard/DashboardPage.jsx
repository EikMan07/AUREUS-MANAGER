import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from '../../components/Header';
import { FinancialSummaryCards } from '../../components/FinancialSummaryCards';
import { WeekDaysSelector } from '../../components/WeekDaysSelector';
import { SegmentedTabs } from '../../components/SegmentedTabs';
import { PendingClientCard } from '../../components/PendingClientCard';
import { CompletedClientCard } from '../../components/CompletedClientCard';
import { OverdueClientCard } from '../../components/OverdueClientCard';
import { PaymentModal } from '../../components/Modals/PaymentModal';
import { PassDayModal } from '../../components/Modals/PassDayModal';
import { NoPayModal } from '../../components/Modals/NoPayModal';
import { CalendarModal } from '../../components/Modals/CalendarModal';
import { AlertModal } from '../../components/Modals/AlertModal';
import { NotificacionesModal } from '../../components/NotificacionesModal';
import { CompartirCobrosModal } from '../../components/Modals/CompartirCobrosModal';
import { BottomNav } from '../../components/Navigation/BottomNav';
import { ClientsDirectory } from '../../components/Clients/ClientsDirectory';
import { LoansDirectory } from '../../components/Loans/LoansDirectory';
import { ResumenDashboard } from '../../components/Resumen/ResumenDashboard';
import { ListaNegraDashboard } from '../../components/ListaNegra/ListaNegraDashboard';
import { PapeleraDashboard } from '../../components/Papelera/PapeleraDashboard';
import { dbService, purgeLegacyDemoData } from '../../services/db';
import {
  getDayNameFromKey,
  getCostaRicaNow,
  getWeekDaysForDate,
  getDayKeyFromDate,
  isSameDay,
  formatShortSpanishDate,
  matchesClientSearch
} from '../../utils/formatters';
import {
  Coins,
  Users,
  Landmark,
  BarChart3,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle,
  Search,
  Share2
} from 'lucide-react';

export function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [cobrosData, setCobrosData] = useState({
    metricas: { totalPrestado: 0, estaSemana: 0, hoy: 0 },
    pendientes: [],
    registrados: [],
    atrasados: [],
    diasConPendientesSinCerrar: []
  });
  const [activeTab, setActiveTab] = useState('pendientes');
  const [activeModule, setActiveModule] = useState('cobros'); // Cobros, Clientes, Préstamos, Resumen, Lista Negra, Papelera
  const [isLoading, setIsLoading] = useState(true);

  // Estados de fecha sincronizados con Costa Rica (America/Costa_Rica, UTC-6)
  const [selectedDate, setSelectedDate] = useState(() => getCostaRicaNow());
  const [selectedDayKey, setSelectedDayKey] = useState(() => getDayKeyFromDate(getCostaRicaNow()));

  // Estados de modales para Módulo 1 (Cobros)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState({ isOpen: false, client: null });
  const [passModalState, setPassModalState] = useState({ isOpen: false, client: null });
  const [noPayModalState, setNoPayModalState] = useState({ isOpen: false, client: null });
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isCompartirModalOpen, setIsCompartirModalOpen] = useState(false);
  const [vistaUsuarioId, setVistaUsuarioId] = useState(null);
  const [compartidosActivosDia, setCompartidosActivosDia] = useState([]);
  const [esVistaDelegada, setEsVistaDelegada] = useState(false);
  const [destinatarioInfo, setDestinatarioInfo] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [isNotificacionesLoading, setIsNotificacionesLoading] = useState(false);
  // Almacén en memoria persistente de IDs revisados durante la sesión + localStorage
  const revisadasIdsSetRef = useRef(new Set());

  // Carga inicial de IDs revisados desde localStorage
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cf_notificaciones_revisadas_ids');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (id && typeof id === 'string') {
              revisadasIdsSetRef.current.add(id.trim());
            }
          });
        }
      }
    } catch (e) {
      // Ignorar restricciones de almacenamiento
    }
  }, []);

  // Estado del buscador integrado en la fila de pestañas de Cobros
  const [cobroSearchTerm, setCobroSearchTerm] = useState('');
  const [isCobroSearchOpen, setIsCobroSearchOpen] = useState(false);

  // Estado del Modal de Alerta y Aviso Ejecutivo (reemplazo total de window.alert)
  const [alertModalState, setAlertModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    buttonText: 'Entendido',
    iconType: 'alert'
  });

  const showAlert = useCallback(({ title, message, buttonText = 'Entendido', iconType = 'alert' }) => {
    setAlertModalState({
      isOpen: true,
      title: title || 'Aviso',
      message: message || '',
      buttonText,
      iconType
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 1. Limpieza de datos demo previos y carga inicial
  useEffect(() => {
    purgeLegacyDemoData();
  }, []);

  // 2. Días de la semana calculados dinámicamente para la fecha seleccionada
  const weekDays = useMemo(() => {
    return getWeekDaysForDate(selectedDate);
  }, [selectedDate]);

  // 3. Información del día actualmente activo en la barra semanal
  const currentDayInfo = useMemo(() => {
    return weekDays.find(d => d.key === selectedDayKey) || weekDays[5] || weekDays[0];
  }, [weekDays, selectedDayKey]);

  // Limpiar búsqueda al cambiar de día en la barra o en el selector de fecha
  useEffect(() => {
    setCobroSearchTerm('');
  }, [currentDayInfo.dateISO]);

  // Función para recargar clientes reales desde PostgreSQL
  const loadClients = useCallback(async () => {
    try {
      const data = await dbService.getAllClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }, []);

  // Función para recargar cobros reales desde PostgreSQL para la fecha actual (con soporte de vista delegada)
  const loadCobros = useCallback(async (fechaISO, targetVistaUsuarioId = undefined) => {
    try {
      const targetDate = fechaISO || currentDayInfo.dateISO;
      const activeVistaId = targetVistaUsuarioId !== undefined ? targetVistaUsuarioId : vistaUsuarioId;
      const res = await dbService.getCobros(targetDate, activeVistaId);
      if (res && res.metricas) {
        setCobrosData(res);
        setCompartidosActivosDia(res.compartidos_activos_dia || []);
        setEsVistaDelegada(Boolean(res.es_vista_delegada));
        setDestinatarioInfo(res.destinatario || null);
      }
    } catch (err) {
      console.error('Error cargando cobros:', err);
    }
  }, [currentDayInfo.dateISO, vistaUsuarioId]);

  // Función para recargar préstamos reales desde PostgreSQL
  const loadLoans = useCallback(async () => {
    try {
      const data = await dbService.getAllLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
    }
  }, []);

  // Función para recargar notificaciones reales desde PostgreSQL fusionando IDs revisados
  const loadNotificaciones = useCallback(async () => {
    try {
      setIsNotificacionesLoading(true);
      const res = await dbService.getNotificaciones();
      if (res && Array.isArray(res.notificaciones)) {
        const merged = res.notificaciones.map((item) => {
          const isRevisada = Boolean(item.vista || revisadasIdsSetRef.current.has(item.id));
          if (isRevisada) {
            revisadasIdsSetRef.current.add(item.id);
          }
          return {
            ...item,
            vista: isRevisada
          };
        });
        setNotificaciones(merged);
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setIsNotificacionesLoading(false);
    }
  }, []);

  const handleCobrosCompartidos = useCallback(async (fechaISO, destinatarioId) => {
    await loadCobros(fechaISO || currentDayInfo.dateISO);
    await loadNotificaciones();
    if (destinatarioId) {
      setVistaUsuarioId(destinatarioId);
      await loadCobros(fechaISO || currentDayInfo.dateISO, destinatarioId);
    }
  }, [currentDayInfo.dateISO, loadCobros, loadNotificaciones]);

  // Manejador optimista y sincronización en backend para marcar notificación como revisada
  const handleMarcarNotificacionVista = useCallback(async (idOrIds) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    ids.forEach((id) => {
      if (id && typeof id === 'string') {
        revisadasIdsSetRef.current.add(id.trim());
      }
    });

    try {
      localStorage.setItem(
        'cf_notificaciones_revisadas_ids',
        JSON.stringify(Array.from(revisadasIdsSetRef.current))
      );
    } catch (e) {
      // Ignorar si storage está bloqueado
    }

    // 1. Actualización optimista inmediata en UI (0ms latencia)
    setNotificaciones((prev) =>
      (prev || []).map((n) =>
        revisadasIdsSetRef.current.has(n.id) ? { ...n, vista: true } : n
      )
    );

    // 2. Persistencia en backend (PostgreSQL tabla notificaciones_revisadas)
    try {
      await dbService.marcarNotificacionVista(idOrIds);
    } catch (err) {
      console.error('[Dashboard] Error al sincronizar notificación revisada en servidor:', err);
    }
  }, []);

  // Conteo exclusivo de notificaciones por revisar (no revisadas) para la campana de la barra superior
  const porRevisarCount = useMemo(() => {
    return (notificaciones || []).filter((n) => !n.vista).length;
  }, [notificaciones]);

  // Navegación contextual desde una tarjeta de notificación hacia el Módulo de Cobros
  const handleNavigateFromNotification = useCallback((notif) => {
    if (!notif) return;

    if (notif.fecha) {
      const [y, m, d] = notif.fecha.split('-').map(Number);
      const targetDateObj = new Date(y, m - 1, d, 12, 0, 0);
      setSelectedDate(targetDateObj);
      setSelectedDayKey(getDayKeyFromDate(targetDateObj));
    }

    setActiveModule('cobros');

    if (notif.tab) {
      setActiveTab(notif.tab);
    }

    setIsNotificationCenterOpen(false);
  }, []);

  // Sincronización del título de la pestaña y Badge de la aplicación en la barra de tareas de la computadora
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (porRevisarCount > 0) {
      document.title = `Cobro-Firme · ${porRevisarCount} ${porRevisarCount === 1 ? 'aviso por revisar' : 'avisos por revisar'}`;
      if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
        navigator.setAppBadge(porRevisarCount).catch(() => {});
      }
    } else {
      document.title = 'Cobro-Firme';
      if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    }
  }, [porRevisarCount]);

  // Escuchar clics en notificaciones nativas de Windows/Mac recibidos desde sw.js
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_NAVIGATE') {
        const notifData = event.data.data;
        if (notifData && notifData.notif) {
          handleNavigateFromNotification(notifData.notif);
        } else {
          setActiveModule('cobros');
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [handleNavigateFromNotification]);

  // Efecto inicial y recarga al cambiar fecha o vista de usuario
  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([
        loadClients(),
        loadCobros(currentDayInfo.dateISO, vistaUsuarioId),
        loadLoans(),
        loadNotificaciones()
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, [currentDayInfo.dateISO, vistaUsuarioId, loadClients, loadCobros, loadLoans, loadNotificaciones]);

  // Normalizar datos de cobros para las tarjetas del frontend
  const normalizedPendientes = useMemo(() => {
    return (cobrosData.pendientes || []).map(p => ({
      ...p,
      cuotaDiaria: Number(p.monto_cuota || 0),
      saldoRestante: Number(p.saldo_por_pagar || 0),
      montoPrestamo: Number(p.monto_prestado || 0),
      vecesPasado: Number(p.veces_pasado || 0),
      periodosAtrasados: Number(p.periodos_atrasados_acumulados || 0),
      periodos_atrasados_acumulados: Number(p.periodos_atrasados_acumulados || 0),
      numero_cobro: p.numero_cobro,
      numeroCobro: p.numero_cobro,
      modalidad: p.modalidad || (p.frecuencia === 'quincenal' ? 'QUINCENAL' : 'SEMANAL'),
      frecuencia: (p.modalidad || 'semanal').toLowerCase(),
      diaFijoOriginal: p.dia_fijo_original ? p.dia_fijo_original.slice(0, 3).toUpperCase() : 'SÁB',
      diaCobroActual: p.dia_semana_actual ? p.dia_semana_actual.slice(0, 3).toUpperCase() : selectedDayKey,
      fechaCobroActual: p.fecha_cobro_actual,
      esRezagado: Boolean(p.es_rezagado),
      estado_prestamo: p.estado_prestamo,
      estadoPrestamo: p.estado_prestamo
    }));
  }, [cobrosData.pendientes, selectedDayKey]);

  const rezagadosCount = useMemo(() => {
    return normalizedPendientes.filter(p => p.esRezagado).length;
  }, [normalizedPendientes]);

  const normalizedRegistrados = useMemo(() => {
    return (cobrosData.registrados || []).map(r => ({
      ...r,
      cuotaDiaria: Number(r.monto_cuota || 0),
      saldoRestante: Number(r.saldo_por_pagar || 0),
      moratoriaCobrada: Number(r.monto_moratoria || 0),
      montoTotalCobrado: Number(r.monto_total_cobrado || 0),
      frecuencia: (r.modalidad || 'semanal').toLowerCase(),
      diaFijoOriginal: r.dia_fijo_original ? r.dia_fijo_original.slice(0, 3).toUpperCase() : 'SÁB',
      horaCobroRegistrado: r.fecha_hora_registro_pago
        ? new Date(r.fecha_hora_registro_pago).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'Cobro registrado',
      proximaFechaCobro: r.fecha_proximo_cobro
        ? formatShortSpanishDate(r.fecha_proximo_cobro, false)
        : null
    }));
  }, [cobrosData.registrados]);

  const normalizedAtrasados = useMemo(() => {
    return (cobrosData.atrasados || []).map(a => ({
      ...a,
      id: a.prestamo_id,
      cuotaDiaria: Number(a.cuota || 0),
      saldoRestante: Number(a.saldo_por_pagar || 0),
      montoPrestamo: Number(a.monto_prestado || 0),
      montoTotalFinanciar: Number(a.monto_total_financiar || 0),
      montoPagadoAcumulado: Number(a.monto_pagado_acumulado || 0),
      periodosAtrasados: Number(a.periodos_atrasados_acumulados || 0),
      periodosPendientes: Number(a.periodos_pendientes || 0),
      frecuencia: (a.modalidad || 'semanal').toLowerCase(),
      diaFijoOriginal: a.dia_fijo_original ? a.dia_fijo_original.slice(0, 3).toUpperCase() : 'SÁB'
    }));
  }, [cobrosData.atrasados]);

  // Filtrado inteligente en tiempo real por nombre, apellidos, cédula, teléfono y ubicación
  const filteredPendientes = useMemo(() => {
    const term = cobroSearchTerm.trim();
    if (!term) return normalizedPendientes;
    return normalizedPendientes.filter(c => matchesClientSearch(c, term));
  }, [normalizedPendientes, cobroSearchTerm]);

  const filteredRegistrados = useMemo(() => {
    const term = cobroSearchTerm.trim();
    if (!term) return normalizedRegistrados;
    return normalizedRegistrados.filter(c => matchesClientSearch(c, term));
  }, [normalizedRegistrados, cobroSearchTerm]);

  const filteredAtrasados = useMemo(() => {
    const term = cobroSearchTerm.trim();
    if (!term) return normalizedAtrasados;
    return normalizedAtrasados.filter(c => matchesClientSearch(c, term));
  }, [normalizedAtrasados, cobroSearchTerm]);

  // Métricas financieras reales desde PostgreSQL
  const totalPrestado = cobrosData.metricas?.totalPrestado || 0;
  const estaSemana = cobrosData.metricas?.estaSemana || 0;
  const porCobrarHoy = cobrosData.metricas?.hoy || 0;

  // --- NAVEGACIÓN DE SEMANAS Y FECHAS ---
  const handlePrevWeek = () => {
    const prev = new Date(selectedDate.getTime() - 7 * 86400000);
    setSelectedDate(prev);
    setSelectedDayKey(getDayKeyFromDate(prev));
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate.getTime() + 7 * 86400000);
    setSelectedDate(next);
    setSelectedDayKey(getDayKeyFromDate(next));
  };

  const handleSelectDayFromBar = (dayKey, dayDateObj) => {
    setSelectedDayKey(dayKey);
    if (dayDateObj) {
      setSelectedDate(dayDateObj);
    }
  };

  const handleSelectDateFromCalendar = (chosenDate) => {
    setSelectedDate(chosenDate);
    setSelectedDayKey(getDayKeyFromDate(chosenDate));
  };

  const handleGoToToday = () => {
    const today = getCostaRicaNow();
    setSelectedDate(today);
    setSelectedDayKey(getDayKeyFromDate(today));
  };

  // Acciones para abrir modales de cobro
  const handleOpenPay = (client) => {
    setPaymentModalState({ isOpen: true, client });
  };

  const handleOpenPass = (client) => {
    setPassModalState({ isOpen: true, client });
  };

  const handleOpenNoPay = (client) => {
    setNoPayModalState({ isOpen: true, client });
  };

  // 1. Confirmar Pago contra PostgreSQL
  const handleConfirmPayment = async (clientId, moratoriaAmount = 0, montoBaseCobrado = null) => {
    try {
      const targetClient = paymentModalState.client;
      const cobroId = targetClient?.id || clientId;
      const montoACobrar = montoBaseCobrado != null && Number(montoBaseCobrado) > 0
        ? Number(montoBaseCobrado)
        : Number(targetClient?.cuotaDiaria || 0);
      await dbService.registrarPago(cobroId, {
        monto: montoACobrar,
        moratoria: moratoriaAmount
      });
      await Promise.all([loadCobros(currentDayInfo.dateISO), loadClients(), loadLoans(), loadNotificaciones()]);
      setPaymentModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error registrando pago en PostgreSQL:', err.debugError || err);
      showAlert({
        title: 'Error al registrar pago',
        message: err.userMessage || 'No se pudo registrar el pago en este momento. Por favor, inténtalo nuevamente.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
    }
  };

  // 2. Confirmar Pasar de Día contra PostgreSQL
  const handleConfirmPass = async (clientId, newDayKey, newDateISO, newDateFullText) => {
    try {
      const targetClient = passModalState.client;
      const cobroId = targetClient?.id || clientId;
      await dbService.pasarCobro(cobroId, {
        nuevaFecha: newDateISO
      });
      await Promise.all([loadCobros(currentDayInfo.dateISO), loadNotificaciones()]);
      setPassModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al pasar cobro en PostgreSQL:', err.debugError || err);
      showAlert({
        title: 'Error al reprogramar cobro',
        message: err.userMessage || 'No se pudo reprogramar el cobro en este momento. Por favor, inténtalo nuevamente.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
    }
  };

  // 3. Confirmar No Pagó contra PostgreSQL
  const handleConfirmNoPay = async (clientId) => {
    try {
      const targetClient = noPayModalState.client;
      const cobroId = targetClient?.id || clientId;
      await dbService.registrarNoPago(cobroId);
      await Promise.all([loadCobros(currentDayInfo.dateISO), loadNotificaciones()]);
      setNoPayModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al registrar no pago en PostgreSQL:', err.debugError || err);
      showAlert({
        title: 'Error al registrar no pago',
        message: err.userMessage || 'No se pudo registrar la ausencia de pago en este momento. Por favor, inténtalo nuevamente.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
    }
  };

  // --- OPERACIONES DE MÓDULO 2: CLIENTES CONTRA POSTGRESQL ---
  const handleAddClient = async (clientData) => {
    try {
      await dbService.createClient(clientData);
      await loadClients();
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al agregar cliente:', err.debugError || err);
      const isPhoneDuplicate =
        err.field === 'telefono' ||
        err.message?.toLowerCase().includes('teléfono') ||
        err.message?.toLowerCase().includes('telefono');
      const isCedulaDuplicate =
        err.field === 'cedula' ||
        err.message?.toLowerCase().includes('cédula') ||
        err.message?.toLowerCase().includes('cedula');

      const alertTitle = isPhoneDuplicate
        ? 'Teléfono duplicado'
        : isCedulaDuplicate
        ? 'Cédula duplicada'
        : 'Datos incompletos';

      const alertMessage = isPhoneDuplicate
        ? 'Este número de teléfono ya se encuentra registrado.'
        : isCedulaDuplicate
        ? 'Este número de cédula ya se encuentra registrado.'
        : (err.userMessage || 'No has completado los datos necesarios para registrar un nuevo cliente.');

      showAlert({
        title: alertTitle,
        message: alertMessage,
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return {
        success: false,
        error: alertMessage,
        field: isPhoneDuplicate ? 'telefono' : isCedulaDuplicate ? 'cedula' : (err.field || null)
      };
    }
  };

  const handleUpdateClient = async (clientData) => {
    try {
      await dbService.updateClient(clientData.id, clientData);
      await loadClients();
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al actualizar cliente:', err.debugError || err);
      const isPhoneDuplicate =
        err.field === 'telefono' ||
        err.message?.toLowerCase().includes('teléfono') ||
        err.message?.toLowerCase().includes('telefono');
      const isCedulaDuplicate =
        err.field === 'cedula' ||
        err.message?.toLowerCase().includes('cédula') ||
        err.message?.toLowerCase().includes('cedula');

      const alertTitle = isPhoneDuplicate
        ? 'Teléfono duplicado'
        : isCedulaDuplicate
        ? 'Cédula duplicada'
        : 'Datos incompletos';

      const alertMessage = isPhoneDuplicate
        ? 'Este número de teléfono ya se encuentra registrado.'
        : isCedulaDuplicate
        ? 'Este número de cédula ya se encuentra registrado.'
        : (err.userMessage || 'No has completado los datos necesarios para guardar los cambios del cliente.');

      showAlert({
        title: alertTitle,
        message: alertMessage,
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return {
        success: false,
        error: alertMessage,
        field: isPhoneDuplicate ? 'telefono' : isCedulaDuplicate ? 'cedula' : (err.field || null)
      };
    }
  };

  // Sincronización general al registrar o sacar personas de Lista Negra
  const handleSyncAfterListaNegra = useCallback(async () => {
    await Promise.all([
      loadClients(),
      loadCobros(currentDayInfo.dateISO),
      loadLoans()
    ]);
  }, [loadClients, loadCobros, loadLoans, currentDayInfo.dateISO]);

  const handleBlacklistClient = async (client) => {
    try {
      await dbService.sendClientToBlacklist(client.id);
      await Promise.all([loadClients(), loadCobros(currentDayInfo.dateISO)]);
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al enviar cliente a lista negra:', err.debugError || err);
      showAlert({
        title: 'Error al bloquear cliente',
        message: err.userMessage || 'No se pudo enviar el cliente a la lista negra en este momento.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  const handleDeleteClient = async (client) => {
    try {
      await dbService.sendClientToTrash(client.id);
      await Promise.all([loadClients(), loadCobros(currentDayInfo.dateISO)]);
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al enviar cliente a papelera:', err.debugError || err);
      showAlert({
        title: 'Error al mover a papelera',
        message: err.userMessage || 'No se pudo enviar el cliente a la papelera en este momento.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  // ==========================================
  // MANEJADORES MÓDULO 3: PRÉSTAMOS
  // ==========================================
  const handleAddLoan = async (loanPayload) => {
    try {
      await dbService.createLoan(loanPayload);
      await Promise.all([
        loadLoans(),
        loadCobros(currentDayInfo.dateISO)
      ]);
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al crear préstamo:', err.debugError || err);
      showAlert({
        title: 'No se pudo crear el préstamo',
        message: err.userMessage || 'Error al guardar el préstamo en el servidor.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  const handleRenewLoan = async (renewPayload) => {
    try {
      await dbService.renewLoan(renewPayload.prestamo_id, renewPayload);
      await Promise.all([
        loadLoans(),
        loadCobros(currentDayInfo.dateISO)
      ]);
      showAlert({
        title: 'Préstamo renovado',
        message: 'La renovación del préstamo se guardó correctamente y el calendario fue actualizado.',
        buttonText: 'Aceptar',
        iconType: 'renew'
      });
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al renovar préstamo:', err.debugError || err);
      showAlert({
        title: 'Error al renovar préstamo',
        message: err.userMessage || 'No se pudo renovar el préstamo en este momento.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  const handleAgreementLoan = async (agreementPayload) => {
    try {
      await dbService.paymentAgreement(agreementPayload.prestamo_id, agreementPayload);
      await Promise.all([
        loadLoans(),
        loadCobros(currentDayInfo.dateISO)
      ]);
      showAlert({
        title: 'Arreglo registrado',
        message: 'El acuerdo de pago y las cuotas reprogramadas se guardaron exitosamente.',
        buttonText: 'Aceptar',
        iconType: 'agreement'
      });
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al registrar arreglo de pago:', err.debugError || err);
      showAlert({
        title: 'Error en arreglo de pago',
        message: err.userMessage || 'No se pudo registrar el arreglo de pago en este momento.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  const handleDeleteLoans = async (ids) => {
    try {
      const idArray = Array.isArray(ids) ? ids : [ids];
      await dbService.deleteLoansBatch(idArray);
      await Promise.all([
        loadLoans(),
        loadCobros(currentDayInfo.dateISO),
        loadNotificaciones()
      ]);
      return { success: true };
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al eliminar préstamos:', err.debugError || err);
      showAlert({
        title: 'Error al eliminar',
        message: err.userMessage || 'No se pudieron eliminar los préstamos seleccionados.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.userMessage || err.message };
    }
  };

  return (
    <div className="mobile-app-shell">
      <main className="mobile-screen-frame">
        {/* Top Bar Superior Verde Dólar Ejecutivo Compacto */}
        <Header
          title={
            activeModule === 'clientes'
              ? 'Clientes'
              : activeModule === 'prestamos'
              ? 'Préstamos'
              : activeModule === 'resumen'
              ? 'Resumen'
              : activeModule === 'lista-negra'
              ? 'Lista Negra'
              : activeModule === 'papelera'
              ? 'Papelera'
              : 'Cobros'
          }
          subtitle="COBRO-FIRME"
          icon={
            activeModule === 'clientes'
              ? Users
              : activeModule === 'prestamos'
              ? Landmark
              : activeModule === 'resumen'
              ? BarChart3
              : activeModule === 'lista-negra'
              ? ShieldAlert
              : activeModule === 'papelera'
              ? Trash2
              : Coins
          }
          hasNotifications={porRevisarCount > 0}
          notificationCount={porRevisarCount}
          onOpenNotifications={() => {
            setIsNotificationCenterOpen(true);
            loadNotificaciones();
          }}
        />

        {/* Contenido desplazable */}
        <div className="main-scrollable-content">
          {activeModule === 'clientes' ? (
            /* ==========================================
               MÓDULO 2: CLIENTES (PostgreSQL)
               ========================================== */
            <ClientsDirectory
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onBlacklistClient={handleBlacklistClient}
              onDeleteClient={handleDeleteClient}
              onShowAlert={showAlert}
            />
          ) : activeModule === 'prestamos' ? (
            /* ==========================================
               MÓDULO 3: PRÉSTAMOS (PostgreSQL)
               ========================================== */
            <LoansDirectory
              loans={loans}
              clients={clients.filter(c => c.estado === 'ACTIVO')}
              onAddLoan={handleAddLoan}
              onRenewLoan={handleRenewLoan}
              onAgreementLoan={handleAgreementLoan}
              onDeleteLoans={handleDeleteLoans}
              onShowAlert={showAlert}
            />
          ) : activeModule === 'resumen' ? (
            /* ==========================================
               MÓDULO 4: RESUMEN Y ESTADÍSTICAS (PostgreSQL)
               ========================================== */
            <ResumenDashboard onShowAlert={showAlert} />
          ) : activeModule === 'lista-negra' ? (
            /* ==========================================
               MÓDULO 5: LISTA NEGRA (PostgreSQL)
               ========================================== */
            <ListaNegraDashboard
              onShowAlert={showAlert}
              onClientRestored={handleSyncAfterListaNegra}
            />
          ) : activeModule === 'papelera' ? (
            /* ==========================================
               MÓDULO 6: PAPELERA DE CLIENTES (PostgreSQL)
               ========================================== */
            <PapeleraDashboard
              onShowAlert={showAlert}
              onSync={handleSyncAfterListaNegra}
            />
          ) : (
            /* ==========================================
               MÓDULO 1: COBROS (PostgreSQL)
               ========================================== */
            <>
              {/* Fecha Interactiva como Botón de Calendario + Flechas Semanales Fijas */}
              <div className="current-date-display-row flex items-center justify-between gap-2 w-full">
                {/* Botón de Fecha Interactiva (Abre el Calendario) */}
                <button
                  type="button"
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="btn-date-trigger flex items-center justify-between gap-1.5 px-2.5 sm:px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white shadow-2xs min-w-0 flex-1 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer"
                  title="Abrir selector de calendario mensual"
                  aria-label={`Fecha actual: ${currentDayInfo.fullDate}. Toca para abrir el calendario.`}
                >
                  <div className="date-trigger-content flex items-center gap-2 min-w-0">
                    <CalendarIcon
                      className="w-4 h-4 text-slate-600 shrink-0 date-trigger-icon"
                      size={16}
                      strokeWidth={2}
                    />
                    <span className="date-trigger-text text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                      {currentDayInfo.fullDate}
                    </span>
                  </div>
                  <ChevronDown
                    className="w-4 h-4 text-slate-500 shrink-0 date-trigger-chevron"
                    size={16}
                    strokeWidth={2.2}
                  />
                </button>

                {/* Controles de navegación semanal y botón compartir cobros */}
                <div className="date-nav-controls-right flex items-center gap-1.5 shrink-0">
                  {/* Flecha Izquierda: Retroceder 1 semana */}
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="btn-date-nav-arrow flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    style={{ width: '44px', height: '44px', borderRadius: '14px' }}
                    title="Semana anterior"
                    aria-label="Semana anterior"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>

                  {/* Flecha Derecha: Avanzar 1 semana */}
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="btn-date-nav-arrow flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    style={{ width: '44px', height: '44px', borderRadius: '14px' }}
                    title="Semana siguiente"
                    aria-label="Semana siguiente"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>

                  {/* Botón: Compartir cobros del día */}
                  <button
                    type="button"
                    onClick={() => setIsCompartirModalOpen(true)}
                    title="Compartir cobros del día"
                    aria-label="Compartir cobros del día"
                    style={{
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      flexShrink: 0,
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <Share2 color="#0f172a" size={16} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                    <span>Compartir</span>
                  </button>
                </div>
              </div>

              {/* Barra de alternancia de vista: Mis cobros vs Vista de persona receptora */}
              {(compartidosActivosDia.length > 0 || esVistaDelegada) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #0A3323 0%, #1B4D37 100%)',
                    border: '1px solid rgba(143, 184, 154, 0.22)',
                    boxShadow: '0 4px 16px rgba(10, 51, 35, 0.14)',
                    color: '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '16px',
                    margin: '8px 0 4px 0',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflowX: 'auto' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>Viendo como:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setVistaUsuarioId(null);
                        loadCobros(currentDayInfo.dateISO, null);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        backgroundColor: vistaUsuarioId === null ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                        color: vistaUsuarioId === null ? '#064e3b' : '#f8fafc',
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Mis cobros
                    </button>
                    {compartidosActivosDia.map((c) => (
                      <button
                        key={c.usuario_id}
                        type="button"
                        onClick={() => {
                          setVistaUsuarioId(c.usuario_id);
                          loadCobros(currentDayInfo.dateISO, c.usuario_id);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          backgroundColor: vistaUsuarioId === c.usuario_id ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                          color: vistaUsuarioId === c.usuario_id ? '#064e3b' : '#f8fafc',
                          border: 'none',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Vista de {c.nombre_completo.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  {esVistaDelegada && (
                    <span
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      Modo receptor
                    </span>
                  )}
                </div>
              )}

              {/* Las 3 Tarjetas Financieras Blancas con Icono */}
              <FinancialSummaryCards
                totalPrestado={totalPrestado}
                estaSemana={estaSemana}
                porCobrarHoy={porCobrarHoy}
              />

              {/* Barra de los 7 Días (LUN a DOM dinámicos) */}
              <WeekDaysSelector
                weekDays={weekDays}
                selectedDayKey={selectedDayKey}
                onSelectDay={handleSelectDayFromBar}
                diasConPendientesSinCerrar={cobrosData.diasConPendientesSinCerrar || []}
              />

              {/* Selector de las 3 Sub-pestañas con buscador integrado en la misma fila */}
              <SegmentedTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                pendingCount={normalizedPendientes.length}
                atrasadosCount={normalizedAtrasados.length}
                isSearchOpen={isCobroSearchOpen}
                onOpenSearch={() => setIsCobroSearchOpen(true)}
                onCloseSearch={() => {
                  setCobroSearchTerm('');
                  setIsCobroSearchOpen(false);
                }}
                searchQuery={cobroSearchTerm}
                onSearchChange={setCobroSearchTerm}
              />

              {/* LISTA DE CLIENTES SEGÚN PESTAÑA ACTIVA */}
              <section className="client-cards-container" aria-live="polite">
                {isLoading ? (
                  <div className="state-empty-box">
                    <span className="loading-spinner" />
                    <p>Cargando información...</p>
                  </div>
                ) : activeTab === 'pendientes' ? (
                  filteredPendientes.length > 0 ? (
                    <>
                      {/* Banner Ejecutivo de Alerta Ámbar si existen cobros de días anteriores sin registrar */}
                      {rezagadosCount > 0 && !cobroSearchTerm.trim() && (
                        <div
                          className="forgotten-cobros-banner bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3"
                          role="alert"
                        >
                          <div className="forgotten-banner-icon-wrap">
                            <AlertTriangle size={20} strokeWidth={2.2} className="text-amber-600 shrink-0" />
                          </div>
                          <div className="forgotten-banner-content">
                            <h4 className="forgotten-banner-title">
                              {rezagadosCount === 1
                                ? 'Tienes 1 cobro de días anteriores sin registrar'
                                : `Tienes ${rezagadosCount} cobros de días anteriores sin registrar`}
                            </h4>
                            <p className="forgotten-banner-subtitle">
                              Indica si el cliente pagó, pasó de día o no pagó para actualizar su estado.
                            </p>
                          </div>
                        </div>
                      )}

                      {filteredPendientes.map(client => (
                        <PendingClientCard
                          key={client.id}
                          client={client}
                          onPayClick={handleOpenPay}
                          onPassClick={handleOpenPass}
                          onNoPayClick={handleOpenNoPay}
                        />
                      ))}
                    </>
                  ) : cobroSearchTerm.trim() ? (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle">
                        <Search size={28} strokeWidth={1.75} className="empty-icon text-slate-400" />
                      </div>
                      <h4 className="empty-title">Sin resultados</h4>
                      <p className="empty-description">
                        No se encontraron cobros que coincidan con la búsqueda.
                      </p>
                    </div>
                  ) : (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle mint">
                        <CheckCircle2 size={32} strokeWidth={1.75} className="empty-icon mint" />
                      </div>
                      <h4 className="empty-title">Sin cobros pendientes</h4>
                      <p className="empty-description">
                        No hay cobros pendientes programados para el {currentDayInfo.fullDate}.
                      </p>
                    </div>
                  )
                ) : activeTab === 'registrados' ? (
                  filteredRegistrados.length > 0 ? (
                    filteredRegistrados.map(client => (
                      <CompletedClientCard
                        key={client.id}
                        client={client}
                      />
                    ))
                  ) : cobroSearchTerm.trim() ? (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle">
                        <Search size={28} strokeWidth={1.75} className="empty-icon text-slate-400" />
                      </div>
                      <h4 className="empty-title">Sin resultados</h4>
                      <p className="empty-description">
                        No se encontraron cobros que coincidan con la búsqueda.
                      </p>
                    </div>
                  ) : (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle mint">
                        <CheckCircle2 size={32} strokeWidth={1.75} className="empty-icon mint" />
                      </div>
                      <h4 className="empty-title">Sin cobros registrados</h4>
                      <p className="empty-description">
                        No hay cobros registrados para el {currentDayInfo.fullDate}.
                      </p>
                    </div>
                  )
                ) : (
                  filteredAtrasados.length > 0 ? (
                    filteredAtrasados.map(client => (
                      <OverdueClientCard
                        key={client.id}
                        client={client}
                        onPayClick={handleOpenPay}
                      />
                    ))
                  ) : cobroSearchTerm.trim() ? (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle">
                        <Search size={28} strokeWidth={1.75} className="empty-icon text-slate-400" />
                      </div>
                      <h4 className="empty-title">Sin resultados</h4>
                      <p className="empty-description">
                        No se encontraron cobros que coincidan con la búsqueda.
                      </p>
                    </div>
                  ) : (
                    <div className="state-empty-box">
                      <div className="empty-icon-circle mint">
                        <ShieldCheck size={32} strokeWidth={1.75} className="empty-icon mint" />
                      </div>
                      <h4 className="empty-title">Sin atrasos críticos</h4>
                      <p className="empty-description">
                        No hay clientes con atrasos críticos acumulados.
                      </p>
                    </div>
                  )
                )}
              </section>
            </>
          )}
        </div>

        {/* Modal de Selector de Calendario Mensual */}
        <CalendarModal
          isOpen={isCalendarModalOpen}
          selectedDate={selectedDate}
          onClose={() => setIsCalendarModalOpen(false)}
          onSelectDate={handleSelectDateFromCalendar}
        />

        {/* Modales de Cobros */}
        <PaymentModal
          client={paymentModalState.client}
          isOpen={paymentModalState.isOpen}
          onClose={() => setPaymentModalState({ isOpen: false, client: null })}
          onConfirmPayment={handleConfirmPayment}
        />

        <PassDayModal
          client={passModalState.client}
          isOpen={passModalState.isOpen}
          onClose={() => setPassModalState({ isOpen: false, client: null })}
          onConfirmPass={handleConfirmPass}
        />

        <NoPayModal
          client={noPayModalState.client}
          isOpen={noPayModalState.isOpen}
          onClose={() => setNoPayModalState({ isOpen: false, client: null })}
          onConfirmNoPay={handleConfirmNoPay}
          currentDateISO={currentDayInfo.dateISO}
        />

        {/* Modal de Alerta / Aviso Ejecutivo (reemplazo total de window.alert) */}
        <AlertModal
          isOpen={alertModalState.isOpen}
          title={alertModalState.title}
          message={alertModalState.message}
          buttonText={alertModalState.buttonText}
          iconType={alertModalState.iconType}
          onClose={closeAlert}
        />

        {/* Centro Desplegable de Notificaciones */}
        <NotificacionesModal
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          notificaciones={notificaciones}
          isLoading={isNotificacionesLoading}
          onNavigateToCobros={handleNavigateFromNotification}
          onMarcarVista={handleMarcarNotificacionVista}
          onMarcarTodasVistas={handleMarcarNotificacionVista}
        />

        {/* Modal Compartir Cobros del Día y Gestión de Personas Vinculadas */}
        <CompartirCobrosModal
          isOpen={isCompartirModalOpen}
          onClose={() => setIsCompartirModalOpen(false)}
          initialDateISO={currentDayInfo.dateISO}
          onCobrosCompartidos={handleCobrosCompartidos}
          onShowAlert={showAlert}
        />

        {/* Barra de Navegación Inferior */}
        <BottomNav
          activeModule={activeModule}
          onSelectModule={setActiveModule}
        />
      </main>
    </div>
  );
}

export default DashboardPage;


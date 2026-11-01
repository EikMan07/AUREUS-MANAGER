import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { FinancialSummaryCards } from './components/FinancialSummaryCards';
import { WeekDaysSelector } from './components/WeekDaysSelector';
import { SegmentedTabs } from './components/SegmentedTabs';
import { PendingClientCard } from './components/PendingClientCard';
import { CompletedClientCard } from './components/CompletedClientCard';
import { OverdueClientCard } from './components/OverdueClientCard';
import { PaymentModal } from './components/Modals/PaymentModal';
import { PassDayModal } from './components/Modals/PassDayModal';
import { NoPayModal } from './components/Modals/NoPayModal';
import { CalendarModal } from './components/Modals/CalendarModal';
import { AlertModal } from './components/Modals/AlertModal';
import { BottomNav } from './components/Navigation/BottomNav';
import { ClientsDirectory } from './components/Clients/ClientsDirectory';
import { LoansDirectory } from './components/Loans/LoansDirectory';
import { dbService, purgeLegacyDemoData } from './services/db';
import {
  getDayNameFromKey,
  getCostaRicaNow,
  getWeekDaysForDate,
  getDayKeyFromDate,
  isSameDay,
  formatShortSpanishDate
} from './utils/formatters';
import {
  Coins,
  Users,
  Landmark,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertTriangle
} from 'lucide-react';

export function App() {
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
  const [activeModule, setActiveModule] = useState('cobros'); // Cobros, Clientes y Préstamos habilitados
  const [isLoading, setIsLoading] = useState(true);

  // Estados de fecha sincronizados con Costa Rica (America/Costa_Rica, UTC-6)
  const [selectedDate, setSelectedDate] = useState(() => getCostaRicaNow());
  const [selectedDayKey, setSelectedDayKey] = useState(() => getDayKeyFromDate(getCostaRicaNow()));

  // Estados de modales para Módulo 1 (Cobros)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState({ isOpen: false, client: null });
  const [passModalState, setPassModalState] = useState({ isOpen: false, client: null });
  const [noPayModalState, setNoPayModalState] = useState({ isOpen: false, client: null });

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

  // Función para recargar clientes reales desde PostgreSQL
  const loadClients = useCallback(async () => {
    try {
      const data = await dbService.getAllClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    }
  }, []);

  // Función para recargar cobros reales desde PostgreSQL para la fecha actual
  const loadCobros = useCallback(async (fechaISO) => {
    try {
      const targetDate = fechaISO || currentDayInfo.dateISO;
      const res = await dbService.getCobros(targetDate);
      if (res && res.metricas) {
        setCobrosData(res);
      }
    } catch (err) {
      console.error('Error cargando cobros:', err);
    }
  }, [currentDayInfo.dateISO]);

  // Función para recargar préstamos reales desde PostgreSQL
  const loadLoans = useCallback(async () => {
    try {
      const data = await dbService.getAllLoans();
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando préstamos:', err);
    }
  }, []);

  // Efecto inicial y recarga al cambiar fecha
  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([
        loadClients(),
        loadCobros(currentDayInfo.dateISO),
        loadLoans()
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, [currentDayInfo.dateISO, loadClients, loadCobros, loadLoans]);

  // Normalizar datos de cobros para las tarjetas del frontend
  const normalizedPendientes = useMemo(() => {
    return (cobrosData.pendientes || []).map(p => ({
      ...p,
      cuotaDiaria: Number(p.monto_cuota || 0),
      saldoRestante: Number(p.saldo_por_pagar || 0),
      montoPrestamo: Number(p.monto_prestado || 0),
      vecesPasado: Number(p.veces_pasado || 0),
      periodosAtrasados: Number(p.periodos_atrasados_acumulados || 0),
      frecuencia: (p.modalidad || 'semanal').toLowerCase(),
      diaFijoOriginal: p.dia_fijo_original ? p.dia_fijo_original.slice(0, 3).toUpperCase() : 'SÁB',
      diaCobroActual: p.dia_semana_actual ? p.dia_semana_actual.slice(0, 3).toUpperCase() : selectedDayKey,
      fechaCobroActual: p.fecha_cobro_actual,
      esRezagado: Boolean(p.es_rezagado)
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
  const handleConfirmPayment = async (clientId, moratoriaAmount = 0) => {
    try {
      const targetClient = paymentModalState.client;
      const cobroId = targetClient?.id || clientId;
      await dbService.registrarPago(cobroId, {
        monto: targetClient?.cuotaDiaria,
        moratoria: moratoriaAmount
      });
      await Promise.all([loadCobros(currentDayInfo.dateISO), loadClients()]);
      setPaymentModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('Error registrando pago en PostgreSQL:', err);
      showAlert({
        title: 'Error al registrar pago',
        message: 'No se pudo registrar el pago: ' + (err.message || 'Error de conexión.'),
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
      await loadCobros(currentDayInfo.dateISO);
      setPassModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('Error al pasar cobro en PostgreSQL:', err);
      showAlert({
        title: 'Error al reprogramar cobro',
        message: 'No se pudo reprogramar el cobro: ' + (err.message || 'Error de conexión.'),
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
      await loadCobros(currentDayInfo.dateISO);
      setNoPayModalState({ isOpen: false, client: null });
    } catch (err) {
      console.error('Error al registrar no pago en PostgreSQL:', err);
      showAlert({
        title: 'Error al registrar no pago',
        message: 'No se pudo registrar la ausencia de pago: ' + (err.message || 'Error de conexión.'),
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
      console.error('Error al agregar cliente:', err);
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
        : (err.message || 'No has completado los datos necesarios para registrar un nuevo cliente.');

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
      console.error('Error al actualizar cliente:', err);
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
        : (err.message || 'No has completado los datos necesarios para guardar los cambios del cliente.');

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

  const handleBlacklistClient = async (client) => {
    try {
      await dbService.sendClientToBlacklist(client.id);
      await Promise.all([loadClients(), loadCobros(currentDayInfo.dateISO)]);
      return { success: true };
    } catch (err) {
      console.error('Error al enviar cliente a lista negra:', err);
      showAlert({
        title: 'Error al bloquear cliente',
        message: err.message || 'No se pudo enviar el cliente a la lista negra.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.message };
    }
  };

  const handleDeleteClient = async (client) => {
    try {
      await dbService.sendClientToTrash(client.id);
      await Promise.all([loadClients(), loadCobros(currentDayInfo.dateISO)]);
      return { success: true };
    } catch (err) {
      console.error('Error al enviar cliente a papelera:', err);
      showAlert({
        title: 'Error al mover a papelera',
        message: err.message || 'No se pudo enviar el cliente a la papelera.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.message };
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
      showAlert({
        title: 'Préstamo guardado',
        message: 'El préstamo y su calendario de cuotas se guardaron exitosamente.',
        buttonText: 'Aceptar',
        iconType: 'alert'
      });
      return { success: true };
    } catch (err) {
      showAlert({
        title: 'No se pudo crear el préstamo',
        message: err.message || 'Error al guardar el préstamo en el servidor.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.message };
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
        iconType: 'alert'
      });
      return { success: true };
    } catch (err) {
      showAlert({
        title: 'Error al renovar préstamo',
        message: err.message || 'No se pudo renovar el préstamo.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.message };
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
        iconType: 'alert'
      });
      return { success: true };
    } catch (err) {
      showAlert({
        title: 'Error en arreglo de pago',
        message: err.message || 'No se pudo registrar el arreglo de pago.',
        buttonText: 'Entendido',
        iconType: 'alert'
      });
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="mobile-app-shell">
      <main className="mobile-screen-frame">
        {/* Top Bar Superior Oscuro Compacto (#131629) */}
        <Header
          title={
            activeModule === 'clientes'
              ? 'Clientes'
              : activeModule === 'prestamos'
              ? 'Préstamos'
              : 'Cobros'
          }
          subtitle="COBRO-FIRME"
          icon={
            activeModule === 'clientes'
              ? Users
              : activeModule === 'prestamos'
              ? Landmark
              : Coins
          }
          hasNotifications={true}
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
              onShowAlert={showAlert}
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

                {/* Controles de navegación semanal: únicamente flechas < y > fijas */}
                <div className="date-nav-controls-right flex items-center gap-1.5 shrink-0">
                  {/* Flecha Izquierda: Retroceder 1 semana */}
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="btn-date-nav-arrow w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="Semana anterior"
                    aria-label="Semana anterior"
                  >
                    <ChevronLeft size={18} strokeWidth={2.2} />
                  </button>

                  {/* Flecha Derecha: Avanzar 1 semana */}
                  <button
                    type="button"
                    onClick={handleNextWeek}
                    className="btn-date-nav-arrow w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    title="Semana siguiente"
                    aria-label="Semana siguiente"
                  >
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </button>
                </div>
              </div>

              {/* Las 3 Tarjetas Financieras Blancas con Icono (Valores reales: ₡0 en estado limpio) */}
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

              {/* Selector de las 3 Sub-pestañas: Pendientes, Registrados y Atrasados */}
              <SegmentedTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                pendingCount={normalizedPendientes.length}
                atrasadosCount={normalizedAtrasados.length}
              />

              {/* LISTA DE CLIENTES SEGÚN PESTAÑA ACTIVA */}
              <section className="client-cards-container" aria-live="polite">
                {isLoading ? (
                  <div className="state-empty-box">
                    <span className="loading-spinner" />
                    <p>Cargando información...</p>
                  </div>
                ) : activeTab === 'pendientes' ? (
                  normalizedPendientes.length > 0 ? (
                    <>
                      {/* Banner Ejecutivo de Alerta Ámbar si existen cobros de días anteriores sin registrar */}
                      {rezagadosCount > 0 && (
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

                      {normalizedPendientes.map(client => (
                        <PendingClientCard
                          key={client.id}
                          client={client}
                          onPayClick={handleOpenPay}
                          onPassClick={handleOpenPass}
                          onNoPayClick={handleOpenNoPay}
                        />
                      ))}
                    </>
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
                  normalizedRegistrados.length > 0 ? (
                    normalizedRegistrados.map(client => (
                      <CompletedClientCard
                        key={client.id}
                        client={client}
                      />
                    ))
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
                  normalizedAtrasados.length > 0 ? (
                    normalizedAtrasados.map(client => (
                      <OverdueClientCard
                        key={client.id}
                        client={client}
                        onPayClick={handleOpenPay}
                      />
                    ))
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

        {/* Barra de Navegación Inferior (Solo Cobros y Clientes habilitados) */}
        <BottomNav
          activeModule={activeModule}
          onSelectModule={setActiveModule}
        />
      </main>
    </div>
  );
}

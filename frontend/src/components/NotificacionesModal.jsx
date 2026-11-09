import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  X,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Check,
  CheckCheck
} from 'lucide-react';

export function NotificacionesModal({
  isOpen,
  onClose,
  notificaciones = [],
  isLoading = false,
  onNavigateToCobros,
  onMarcarVista,
  onMarcarTodasVistas
}) {
  const [tabActiva, setTabActiva] = useState('POR_REVISAR'); // 'POR_REVISAR' | 'REVISADAS'
  const [showWebToast, setShowWebToast] = useState(false);
  const [toastData, setToastData] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Solicitud silenciosa en segundo plano del permiso de notificaciones nativas al abrir el modal
  useEffect(() => {
    if (
      isOpen &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, [isOpen]);

  // Limpiar timer de Toast Web al desmontar
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Manejar Escape para cerrar modal
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

  // Listas filtradas: Por revisar (vista === false) y Revisadas (vista === true)
  const porRevisarList = useMemo(() => {
    return notificaciones.filter((n) => !n.vista);
  }, [notificaciones]);

  const revisadasList = useMemo(() => {
    return notificaciones.filter((n) => Boolean(n.vista));
  }, [notificaciones]);

  const displayedList = tabActiva === 'POR_REVISAR' ? porRevisarList : revisadasList;

  // Manejador individual para marcar como revisada
  const handleMarcarIndividual = (e, notifId) => {
    e.stopPropagation();
    if (onMarcarVista) {
      onMarcarVista(notifId);
    }
  };

  // Manejador masivo para marcar todas como revisadas
  const handleMarcarTodas = (e) => {
    e.stopPropagation();
    const ids = porRevisarList.map((n) => n.id);
    if (ids.length > 0) {
      if (onMarcarTodasVistas) {
        onMarcarTodasVistas(ids);
      } else if (onMarcarVista) {
        onMarcarVista(ids);
      }
    }
  };

  // Manejador de clic en la tarjeta: navega a cobros y marca automáticamente como revisada
  const handleCardClick = (notif) => {
    if (!notif) return;
    if (!notif.vista && onMarcarVista) {
      onMarcarVista(notif.id);
    }
    if (onNavigateToCobros) {
      onNavigateToCobros(notif);
    }
    onClose();
  };

  return (
    <>
      {/* TOAST WEB DE ESCRITORIO (FIJADO EN LA ESQUINA SUPERIOR DERECHA) */}
      {showWebToast && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 100000,
            maxWidth: '420px',
            width: 'calc(100% - 48px)',
            background: 'linear-gradient(135deg, #0A3323 0%, #1B4D37 100%)',
            border: '1px solid rgba(143, 184, 154, 0.28)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 20px 45px rgba(10, 51, 35, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontFamily: 'inherit',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (toastData?.notif) {
              handleCardClick(toastData.notif);
            }
            setShowWebToast(false);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.22)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={16} strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.03em' }}>
                Cobro-Firme · Notificación
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                Ahora
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowWebToast(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                aria-label="Cerrar notificación web"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
              {toastData?.titulo || 'Notificación del Sistema'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.4 }}>
              {toastData?.mensaje}
            </p>
          </div>

          {toastData?.monto !== undefined && toastData?.monto !== null && Number(toastData.monto) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2E6B4F',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '12.5px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(10, 51, 35, 0.3)',
                  whiteSpace: 'nowrap'
                }}
              >
                ₡{Number(toastData.monto).toLocaleString('en-US')}
              </span>
              <span style={{ fontSize: '11.5px', color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver en Cobros <ChevronRight size={14} />
              </span>
            </div>
          )}
        </div>
      )}

      {/* MODAL PRINCIPAL */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(10, 15, 30, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 'var(--modal-overlay-padding, 16px 12px)',
            overflowY: 'auto',
            fontFamily: 'inherit'
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 'var(--modal-max-width, 480px)',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              marginTop: 'env(safe-area-inset-top, 10px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO SUPERIOR VERDE DÓLAR EJECUTIVO LIMPIO */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0A3323 0%, #1B4D37 100%)',
                padding: '18px 20px',
                color: '#ffffff',
                position: 'relative',
                borderBottom: '1px solid rgba(143, 184, 154, 0.22)',
                boxShadow: '0 4px 16px rgba(10, 51, 35, 0.14)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(214, 231, 214, 0.12)',
                      border: '1px solid rgba(143, 184, 154, 0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D6E7D6'
                    }}
                  >
                    <Bell size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        margin: 0,
                        lineHeight: 1.2,
                        color: '#ffffff',
                        letterSpacing: '-0.3px'
                      }}
                    >
                      Notificaciones
                    </h2>
                    <p
                      style={{
                        fontSize: '12px',
                        margin: '3px 0 0 0',
                        color: '#94a3b8',
                        fontWeight: 500
                      }}
                    >
                      {porRevisarList.length === 0
                        ? 'Sin avisos por revisar'
                        : porRevisarList.length === 1
                        ? '1 aviso por revisar'
                        : `${porRevisarList.length} avisos por revisar`}
                    </p>
                  </div>
                </div>

                {/* BOTÓN X PARA CERRAR */}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  aria-label="Cerrar panel de notificaciones"
                >
                  <X size={18} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* PESTAÑAS: POR REVISAR Y REVISADAS + BOTÓN "MARCAR TODAS COMO REVISADAS" */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                gap: '8px'
              }}
            >
              {/* Pestañas Principales */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTabActiva('POR_REVISAR')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: tabActiva === 'POR_REVISAR' ? 800 : 600,
                    backgroundColor: tabActiva === 'POR_REVISAR' ? '#0A3323' : '#ffffff',
                    color: tabActiva === 'POR_REVISAR' ? '#ffffff' : '#64748b',
                    border: tabActiva === 'POR_REVISAR' ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                    boxShadow: tabActiva === 'POR_REVISAR' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Por revisar</span>
                  <span
                    style={{
                      backgroundColor: tabActiva === 'POR_REVISAR' ? 'rgba(214, 231, 214, 0.25)' : '#e2e8f0',
                      color: tabActiva === 'POR_REVISAR' ? '#ffffff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    {porRevisarList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('REVISADAS')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: tabActiva === 'REVISADAS' ? 800 : 600,
                    backgroundColor: tabActiva === 'REVISADAS' ? '#0A3323' : '#ffffff',
                    color: tabActiva === 'REVISADAS' ? '#ffffff' : '#64748b',
                    border: tabActiva === 'REVISADAS' ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                    boxShadow: tabActiva === 'REVISADAS' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Revisadas</span>
                  <span
                    style={{
                      backgroundColor: tabActiva === 'REVISADAS' ? 'rgba(214, 231, 214, 0.25)' : '#e2e8f0',
                      color: tabActiva === 'REVISADAS' ? '#ffffff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    {revisadasList.length}
                  </span>
                </button>
              </div>

              {/* Botón superior derecho: "Marcar todas como revisadas" si hay más de 1 en Por revisar */}
              {tabActiva === 'POR_REVISAR' && porRevisarList.length > 1 && (
                <button
                  type="button"
                  onClick={handleMarcarTodas}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckCheck size={14} strokeWidth={2.2} color="#059669" />
                  <span>Marcar todas como revisadas</span>
                </button>
              )}
            </div>

            {/* LISTA DE TARJETAS DE NOTIFICACIÓN */}
            <div
              style={{
                padding: '14px 16px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {isLoading ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px'
                  }}
                >
                  Cargando avisos...
                </div>
              ) : displayedList.length === 0 ? (
                /* ESTADO VACÍO SEGÚN LA PESTAÑA ACTIVA */
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#ecfdf5',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                    }}
                  >
                    <CheckCircle2 size={32} strokeWidth={2.2} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0f172a'
                    }}
                  >
                    {tabActiva === 'POR_REVISAR' ? 'Todo al día' : 'Sin notificaciones revisadas'}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#64748b',
                      lineHeight: 1.4,
                      maxWidth: '280px'
                    }}
                  >
                    {tabActiva === 'POR_REVISAR'
                      ? 'No tienes avisos pendientes por revisar en este momento.'
                      : 'Las notificaciones que confirmes aparecerán archivadas en esta sección.'}
                  </p>
                </div>
              ) : (
                displayedList.map((notif) => {
                  const isAnterior =
                    notif.categoria === 'COBROS_PENDIENTES_ANTERIORES' ||
                    notif.categoria === 'COBROS_OLVIDADOS';
                  const isHoy = notif.categoria === 'COBROS_HOY';
                  const isPasado = notif.categoria === 'PASADOS_PARA_HOY';
                  const isAtraso = notif.categoria === 'ATRASOS_ACUMULADOS';

                  const iconComponent = isAtraso ? (
                    <AlertTriangle size={16} strokeWidth={2.2} />
                  ) : isHoy ? (
                    <Calendar size={16} strokeWidth={2.2} />
                  ) : (
                    <Clock size={16} strokeWidth={2.2} />
                  );

                  const badgeCategoryText = isAnterior
                    ? 'Cobro pendiente'
                    : isHoy
                    ? 'Ruta de hoy'
                    : isPasado
                    ? 'Reprogramado'
                    : 'Atraso activo';

                  const badgeCategoryBg = isAnterior
                    ? '#fef3c7'
                    : isHoy
                    ? '#e0f2fe'
                    : isPasado
                    ? '#ede9fe'
                    : '#fee2e2';

                  const badgeCategoryColor = isAnterior
                    ? '#92400e'
                    : isHoy
                    ? '#0369a1'
                    : isPasado
                    ? '#6d28d9'
                    : '#991b1b';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleCardClick(notif)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: isAnterior
                          ? '1px solid #fde68a'
                          : isAtraso
                          ? '1px solid #fecaca'
                          : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '14px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      {/* FILA SUPERIOR: ETIQUETA DE CATEGORÍA + FECHA + FLECHA */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: badgeCategoryBg,
                              color: badgeCategoryColor
                            }}
                          >
                            {iconComponent}
                            {badgeCategoryText}
                          </span>

                          {notif.fecha_texto && (
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#64748b',
                                fontWeight: 600
                              }}
                            >
                              {notif.fecha_texto}
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            color: '#94a3b8',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <ChevronRight size={16} strokeWidth={2.2} />
                        </div>
                      </div>

                      {/* TÍTULO PRINCIPAL (SIN CARACTERES / NI PARÉNTESIS) */}
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: 1.3
                        }}
                      >
                        {notif.titulo}
                      </h4>

                      {/* MENSAJE LIMPIO */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#475569',
                          lineHeight: 1.4
                        }}
                      >
                        {notif.mensaje}
                      </p>

                      {/* FILA INFERIOR: MONTO EN BADGE VERDE ESMERALDA Y BOTÓN / INSIGNIA DE REVISADA */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          paddingTop: '8px',
                          borderTop: '1px dashed #f1f5f9',
                          gap: '8px'
                        }}
                      >
                        {/* MONTO A COBRAR EN VERDE ESMERALDA (#10b981) SIN PARÉNTESIS */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#64748b'
                            }}
                          >
                            Monto:
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              backgroundColor: '#2E6B4F',
                              color: '#ffffff',
                              fontWeight: 900,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              boxShadow: '0 1px 3px rgba(10, 51, 35, 0.25)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ₡{Number(notif.monto || 0).toLocaleString('en-US')}
                          </span>
                        </div>

                        {/* ACCIÓN SEGÚN PESTAÑA: BOTÓN "MARCAR COMO REVISADA" O INSIGNIA "REVISADA" */}
                        {tabActiva === 'POR_REVISAR' && !notif.vista ? (
                          <button
                            type="button"
                            onClick={(e) => handleMarcarIndividual(e, notif.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Marcar como revisada"
                          >
                            <Check size={14} strokeWidth={2.4} color="#059669" />
                            <span>Marcar como revisada</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            <Check size={13} strokeWidth={2.2} color="#059669" />
                            <span>Revisada</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificacionesModal;

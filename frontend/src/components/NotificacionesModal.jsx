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
            backgroundColor: 'var(--aureus-bg-surface)',
            border: '1px solid var(--aureus-border-gold)',
            color: 'var(--aureus-text-primary)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: 'var(--aureus-card-shadow)',
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
                  backgroundColor: 'var(--aureus-gold-light)',
                  border: '1px solid var(--aureus-border-gold)',
                  color: 'var(--aureus-gold-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={16} strokeWidth={2.4} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)', letterSpacing: '0.02em' }}>
                Aureus Manager · Notificación
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--aureus-text-muted)' }}>
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
                  color: '#6E757F',
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
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#252A31' }}>
              {toastData?.titulo || 'Aviso de Cobros'}
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#4A5058', lineHeight: 1.4 }}>
              {toastData?.mensaje}
            </p>
          </div>

          {toastData?.monto !== undefined && toastData?.monto !== null && Number(toastData.monto) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: '#E6F2EE',
                  border: '1px solid #94C2B2',
                  color: '#397D67',
                  fontWeight: 900,
                  fontSize: '12.5px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                ₡{Number(toastData.monto).toLocaleString('en-US')}
              </span>
              <span style={{ fontSize: '11.5px', color: '#B69A55', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
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
              backgroundColor: 'var(--aureus-bg-surface)',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--aureus-border-subtle)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              marginTop: 'env(safe-area-inset-top, 10px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ENCABEZADO SUPERIOR CLARO AUREUS MANAGER */}
            <div
              style={{
                backgroundColor: 'var(--aureus-bg-surface)',
                padding: '18px 20px',
                color: 'var(--aureus-text-primary)',
                position: 'relative',
                borderBottom: '1px solid var(--aureus-border-subtle)',
                boxShadow: 'var(--aureus-card-shadow)'
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
                      backgroundColor: 'var(--aureus-gold-light)',
                      border: '1px solid var(--aureus-border-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--aureus-gold-text)'
                    }}
                  >
                    <Bell size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: '18px',
                        fontWeight: 900,
                        margin: 0,
                        lineHeight: 1.2,
                        color: 'var(--aureus-text-primary)',
                        letterSpacing: '-0.3px'
                      }}
                    >
                      Notificaciones
                    </h2>
                    <p
                      style={{
                        fontSize: '12px',
                        margin: '3px 0 0 0',
                        color: 'var(--aureus-text-muted)',
                        fontWeight: 600
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
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    color: 'var(--aureus-text-secondary)',
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
                backgroundColor: 'var(--aureus-bg-muted)',
                borderBottom: '1px solid var(--aureus-border-subtle)',
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
                    backgroundColor: tabActiva === 'POR_REVISAR' ? '#B69A55' : 'var(--aureus-bg-surface)',
                    color: tabActiva === 'POR_REVISAR' ? '#FFFFFF' : 'var(--aureus-text-muted)',
                    border: tabActiva === 'POR_REVISAR' ? '1px solid #9E8342' : '1px solid var(--aureus-border-subtle)',
                    boxShadow: tabActiva === 'POR_REVISAR' ? '0 3px 8px rgba(182, 154, 85, 0.24)' : 'none',
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
                      backgroundColor: tabActiva === 'POR_REVISAR' ? 'rgba(255, 255, 255, 0.25)' : 'var(--aureus-bg-elevated)',
                      color: tabActiva === 'POR_REVISAR' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
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
                    backgroundColor: tabActiva === 'REVISADAS' ? '#B69A55' : 'var(--aureus-bg-surface)',
                    color: tabActiva === 'REVISADAS' ? '#FFFFFF' : 'var(--aureus-text-muted)',
                    border: tabActiva === 'REVISADAS' ? '1px solid #9E8342' : '1px solid var(--aureus-border-subtle)',
                    boxShadow: tabActiva === 'REVISADAS' ? '0 3px 8px rgba(182, 154, 85, 0.24)' : 'none',
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
                      backgroundColor: tabActiva === 'REVISADAS' ? 'rgba(255, 255, 255, 0.25)' : 'var(--aureus-bg-elevated)',
                      color: tabActiva === 'REVISADAS' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
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
                    backgroundColor: 'var(--aureus-bg-surface)',
                    border: '1px solid var(--aureus-border-subtle)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--aureus-text-primary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <CheckCheck size={14} strokeWidth={2.2} color="#397D67" />
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
                      backgroundColor: 'var(--aureus-green-light)',
                      border: '1px solid var(--aureus-green-border)',
                      color: 'var(--aureus-green-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(57, 125, 103, 0.14)'
                    }}
                  >
                    <CheckCircle2 size={32} strokeWidth={2.2} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    {tabActiva === 'POR_REVISAR' ? 'Todo al día' : 'Sin notificaciones revisadas'}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--aureus-text-muted)',
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
                    ? 'var(--aureus-gold-light)'
                    : isHoy
                    ? 'var(--aureus-green-light)'
                    : isPasado
                    ? 'var(--aureus-gold-light)'
                    : 'var(--aureus-red-light)';

                  const badgeCategoryColor = isAnterior
                    ? 'var(--aureus-gold-text)'
                    : isHoy
                    ? 'var(--aureus-green-text)'
                    : isPasado
                    ? 'var(--aureus-gold-text)'
                    : 'var(--aureus-red-text)';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleCardClick(notif)}
                      style={{
                        backgroundColor: 'var(--aureus-bg-elevated)',
                        border: isAnterior
                          ? '1px solid var(--aureus-border-gold)'
                          : isAtraso
                          ? '1px solid var(--aureus-red-border)'
                          : '1px solid var(--aureus-border-subtle)',
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
                          color: 'var(--aureus-text-primary)',
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
                          color: 'var(--aureus-text-secondary)',
                          lineHeight: 1.4
                        }}
                      >
                        {notif.mensaje}
                      </p>

                      {/* FILA INFERIOR: MONTO EN BADGE VERDE Y BOTÓN / INSIGNIA DE REVISADA */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '4px',
                          paddingTop: '8px',
                          borderTop: '1px dashed var(--aureus-border-subtle)',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--aureus-text-muted)'
                            }}
                          >
                            Monto:
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              backgroundColor: 'var(--aureus-green-light)',
                              border: '1px solid var(--aureus-green-border)',
                              color: 'var(--aureus-green-text)',
                              fontWeight: 900,
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '6px',
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
                              backgroundColor: 'var(--aureus-bg-surface)',
                              border: '1px solid var(--aureus-border-subtle)',
                              borderRadius: '8px',
                              padding: '4px 9px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--aureus-text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Marcar como revisada"
                          >
                            <Check size={14} strokeWidth={2.4} color="var(--aureus-green-text)" />
                            <span>Marcar como revisada</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--aureus-bg-muted)',
                              color: 'var(--aureus-text-muted)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            <Check size={13} strokeWidth={2.2} color="#397D67" />
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

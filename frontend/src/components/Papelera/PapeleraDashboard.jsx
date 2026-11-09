import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  Clock,
  Landmark,
  User,
  Phone,
  MapPin,
  RefreshCw,
  Info
} from 'lucide-react';
import { dbService } from '../../services/db.js';
import { formatColones, matchesClientSearch, formatFullName } from '../../utils/formatters.js';
import { ConfirmModal } from '../Clients/ConfirmModal.jsx';

function getInitials(nombre = '', apellidos = '') {
  const n = (nombre || '').trim().charAt(0).toUpperCase();
  const a = (apellidos || '').trim().charAt(0).toUpperCase();
  return `${n}${a}` || 'CF';
}

export function PapeleraDashboard({ onShowAlert, onSync }) {
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modales de doble verificación
  const [clienteParaRestaurar, setClienteParaRestaurar] = useState(null);
  const [clienteParaEliminar, setClienteParaEliminar] = useState(null);
  const [isVaciarModalOpen, setIsVaciarModalOpen] = useState(false);

  // Cargar clientes en papelera desde PostgreSQL
  const loadPapelera = useCallback(async () => {
    try {
      const data = await dbService.getPapelera();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Papelera] Error al cargar clientes en papelera:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error de carga',
          message: 'No se pudo obtener la lista de clientes en la papelera.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [onShowAlert]);

  useEffect(() => {
    setIsLoading(true);
    loadPapelera();
  }, [loadPapelera]);

  // Clientes filtrados por buscador
  const filteredClientes = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return clientes;
    return clientes.filter((c) => matchesClientSearch(c, term));
  }, [clientes, searchTerm]);

  // 1. Restaurar cliente (Confirmación)
  const handleConfirmRestaurar = async () => {
    if (!clienteParaRestaurar || isProcessing) return;
    setIsProcessing(true);
    try {
      await dbService.restaurarClientePapelera(clienteParaRestaurar.id);
      const nombreCompleto = `${clienteParaRestaurar.nombre || ''} ${clienteParaRestaurar.apellidos || ''}`.trim();
      setClienteParaRestaurar(null);
      await loadPapelera();

      if (onSync) {
        await onSync();
      }

      if (onShowAlert) {
        onShowAlert({
          title: 'Cliente restaurado',
          message: `${nombreCompleto} ha sido restaurado exitosamente a Clientes registrados y sus préstamos han sido reactivados.`,
          buttonText: 'Entendido',
          iconType: 'check'
        });
      }
    } catch (err) {
      console.error('[Papelera] Error al restaurar cliente:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al restaurar',
          message: err.userMessage || 'No se pudo restaurar el cliente en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Eliminar definitivamente a un cliente específico (Confirmación)
  const handleConfirmEliminarDefinitivo = async () => {
    if (!clienteParaEliminar || isProcessing) return;
    setIsProcessing(true);
    try {
      await dbService.eliminarClienteDefinitivo(clienteParaEliminar.id);
      setClienteParaEliminar(null);
      await loadPapelera();

      if (onSync) {
        await onSync();
      }
    } catch (err) {
      console.error('[Papelera] Error al eliminar cliente:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al eliminar',
          message: err.userMessage || 'No se pudo eliminar definitivamente al cliente.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Vaciar toda la papelera (Confirmación)
  const handleConfirmVaciarPapelera = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await dbService.vaciarPapelera();
      setIsVaciarModalOpen(false);
      await loadPapelera();

      if (onSync) {
        await onSync();
      }
    } catch (err) {
      console.error('[Papelera] Error al vaciar papelera:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al vaciar papelera',
          message: err.userMessage || 'No se pudo vaciar la papelera en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 14px 40px',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'inherit'
      }}
    >
      {/* 1. BARRA SUPERIOR: RESUMEN Y BOTÓN VACIAR PAPELERA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '12px 14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={18} strokeWidth={2.2} />
          </div>
          <div>
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block'
              }}
            >
              Papelera de Clientes
            </span>
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: 900,
                color: '#0f172a'
              }}
            >
              {clientes.length === 1 ? '1 cliente' : `${clientes.length} clientes`}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={clientes.length === 0 || isProcessing}
          onClick={() => setIsVaciarModalOpen(true)}
          style={{
            height: '38px',
            padding: '0 12px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: clientes.length === 0 ? '#e2e8f0' : '#fecaca',
            backgroundColor: clientes.length === 0 ? '#f8fafc' : '#fef2f2',
            color: clientes.length === 0 ? '#94a3b8' : '#b91c1c',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 800,
            cursor: clientes.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <Trash2 size={15} strokeWidth={2.2} />
          <span>Vaciar Papelera</span>
        </button>
      </div>

      {/* 2. BANNER INFORMATIVO: POLÍTICA DE 30 DÍAS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '12px 14px'
        }}
      >
        <Info size={18} strokeWidth={2.2} style={{ color: '#475569', shrink: 0, marginTop: '2px' }} />
        <p
          style={{
            margin: 0,
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            lineHeight: 1.45
          }}
        >
          Los clientes enviados a la papelera se conservan por <strong>30 días</strong> antes de su eliminación definitiva automática. Sus préstamos permanecen suspendidos hasta ser restaurados.
        </p>
      </div>

      {/* 3. BUSCADOR EN TIEMPO REAL */}
      <div
        style={{
          position: 'relative',
          width: '100%'
        }}
      >
        <Search
          size={18}
          strokeWidth={2.2}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, cédula, teléfono o ubicación"
          style={{
            width: '100%',
            height: '46px',
            paddingLeft: '42px',
            paddingRight: searchTerm ? '42px' : '14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              border: 'none',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* 4. LISTADO DE CLIENTES EN PAPELERA */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            color: '#64748b',
            gap: '8px'
          }}
        >
          <RefreshCw size={18} className="animate-spin" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Cargando papelera...</span>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            padding: '48px 20px',
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
              backgroundColor: '#f1f5f9',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={26} strokeWidth={1.8} />
          </div>
          <div>
            <h3
              style={{
                margin: '0 0 4px',
                fontFamily: 'inherit',
                fontSize: '16px',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              {searchTerm ? 'No se encontraron clientes' : 'La papelera está vacía'}
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                maxWidth: '320px'
              }}
            >
              {searchTerm
                ? 'No hay registros en la papelera que coincidan con la búsqueda.'
                : 'No hay clientes pendientes de eliminación definitiva en este momento.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--modules-grid-cols, 1fr)', gap: '10px' }}>
          {filteredClientes.map((c) => {
            const nombreCompleto = [c.nombre, c.apellidos].filter(Boolean).join(' ').trim();
            const initials = getInitials(c.nombre, c.apellidos);
            const dias = Number(c.dias_restantes ?? 30);
            const prestamosCount = Number(c.prestamos_suspendidos_count || 0);
            const saldoPendiente = Number(c.saldo_total_pendiente || 0);

            // Badge de días restantes
            const isCritical = dias <= 3;
            const isMedium = dias <= 10 && dias > 3;

            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: isCritical ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Cabecera del cliente con Avatar y Datos */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#0A3323',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontFamily: 'inherit',
                          fontSize: '14px',
                          fontWeight: 800,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {nombreCompleto}
                      </h4>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                          marginTop: '2px'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'inherit',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#64748b'
                          }}
                        >
                          {c.cedula ? `Cédula ${c.cedula}` : 'Sin cédula'}
                        </span>
                        {c.telefono && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span
                              style={{
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#475569'
                              }}
                            >
                              {c.telefono}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badge de Días Restantes */}
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: '8px',
                      backgroundColor: isCritical ? '#fef2f2' : isMedium ? '#fffbeb' : '#f1f5f9',
                      border: `1px solid ${isCritical ? '#fecaca' : isMedium ? '#fde68a' : '#e2e8f0'}`,
                      color: isCritical ? '#b91c1c' : isMedium ? '#b45309' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0
                    }}
                  >
                    <Clock size={12} strokeWidth={2.5} />
                    <span
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '11px',
                        fontWeight: 800,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {dias <= 0 ? 'Vence hoy' : dias === 1 ? 'Falta 1 día' : `Faltan ${dias} días`}
                    </span>
                  </div>
                </div>

                {/* Ubicación si está presente */}
                {c.ubicacion && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  >
                    <MapPin size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.ubicacion}
                    </span>
                  </div>
                )}

                {/* Alerta de préstamos suspendidos si los tiene */}
                {prestamosCount > 0 && (
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Landmark size={14} strokeWidth={2.2} style={{ color: '#2563eb' }} />
                      <span
                        style={{
                          fontFamily: 'inherit',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#1e40af'
                        }}
                      >
                        {prestamosCount === 1 ? '1 préstamo suspendido' : `${prestamosCount} préstamos suspendidos`}
                      </span>
                    </div>

                    <span
                      style={{
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 900,
                        color: '#1d4ed8'
                      }}
                    >
                      {formatColones(saldoPendiente)}
                    </span>
                  </div>
                )}

                {/* Botones de acción: Restaurar y Eliminar definitivamente */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    paddingTop: '4px'
                  }}
                >
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setClienteParaRestaurar(c)}
                    style={{
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#0A3323',
                      border: '1px solid #1B4D37',
                      color: '#ffffff',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <RotateCcw size={14} strokeWidth={2.5} />
                    <span>Restaurar</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setClienteParaEliminar(c)}
                    style={{
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Trash2 size={14} strokeWidth={2.2} />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: DOBLE VERIFICACIÓN PARA RESTAURAR CLIENTE */}
      <ConfirmModal
        isOpen={!!clienteParaRestaurar}
        title="Restaurar Cliente"
        question={
          clienteParaRestaurar
            ? `¿Deseas restaurar a ${formatFullName(clienteParaRestaurar.nombre, clienteParaRestaurar.apellidos)}? El cliente volverá a estar activo en Clientes registrados y sus préstamos suspendidos se reactivarán automáticamente.`
            : ''
        }
        confirmText="Restaurar Cliente"
        cancelText="Cancelar"
        confirmVariant="primary"
        iconType="renew"
        onCancel={() => setClienteParaRestaurar(null)}
        onConfirm={handleConfirmRestaurar}
      />

      {/* MODAL 2: DOBLE VERIFICACIÓN PARA ELIMINAR DEFINITIVAMENTE */}
      <ConfirmModal
        isOpen={!!clienteParaEliminar}
        title="Eliminar Definitivamente"
        question={
          clienteParaEliminar
            ? `¿Estás seguro de que deseas eliminar definitivamente a ${formatFullName(clienteParaEliminar.nombre, clienteParaEliminar.apellidos)}? Se archivará su historial financiero y se borrará por completo de la base de datos sin esperar los 30 días.`
            : ''
        }
        confirmText="Eliminar Definitivamente"
        cancelText="Cancelar"
        confirmVariant="danger"
        iconType="trash"
        stageVariant="eliminar_definitivo"
        clientName={formatFullName(clienteParaEliminar?.nombre, clienteParaEliminar?.apellidos)}
        subtitle={formatFullName(clienteParaEliminar?.nombre, clienteParaEliminar?.apellidos)}
        onCancel={() => setClienteParaEliminar(null)}
        onConfirm={handleConfirmEliminarDefinitivo}
      />

      {/* MODAL 3: DOBLE VERIFICACIÓN PARA VACIAR TODA LA PAPELERA */}
      <ConfirmModal
        isOpen={isVaciarModalOpen}
        title="Vaciar Papelera"
        question={`¿Estás seguro de que deseas vaciar toda la papelera? Se eliminarán definitivamente todos los clientes acumulados y se archivará su historial financiero. Esta acción no se puede deshacer.`}
        confirmText="Vaciar Papelera"
        cancelText="Cancelar"
        confirmVariant="danger"
        iconType="trash"
        stageVariant="eliminar_definitivo"
        clientName={clientes.length === 1 ? '1 cliente eliminado' : `${clientes.length} clientes eliminados`}
        subtitle={clientes.length === 1 ? '1 cliente eliminado' : `${clientes.length} clientes eliminados`}
        onCancel={() => setIsVaciarModalOpen(false)}
        onConfirm={handleConfirmVaciarPapelera}
      />
    </div>
  );
}


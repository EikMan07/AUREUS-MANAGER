import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  X,
  Clock,
  MapPin,
  Landmark,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';
import { dbService } from '../../services/db';
import { ConfirmModal } from '../Clients/ConfirmModal';
import { formatColones, formatFullName, formatPhone } from '../../utils/formatters';

function getInitials(nombre, apellidos) {
  const n = (nombre || '').trim().charAt(0).toUpperCase();
  const a = (apellidos || '').trim().charAt(0).toUpperCase();
  return `${n}${a}` || 'CF';
}

function getLoanSaldoDisplay(loan) {
  const rawSaldo =
    loan?.saldo_por_pagar !== undefined && loan?.saldo_por_pagar !== null
      ? Number(loan.saldo_por_pagar)
      : loan?.saldo_pendiente !== undefined && loan?.saldo_pendiente !== null
        ? Number(loan.saldo_pendiente)
        : 0;
  const cat = String(loan?.categoria_previa || '').toUpperCase();
  const isPaidLoan = rawSaldo <= 0 || cat === 'REGISTRADO';
  return {
    isPaidLoan,
    saldo: isPaidLoan ? 0 : rawSaldo
  };
}

function formatCategoriaLabel(categoria) {
  switch (String(categoria || '').toUpperCase()) {
    case 'REGISTRADO':
      return 'Registrado';
    case 'ATRASADO':
      return 'Atrasado';
    default:
      return 'Pendiente';
  }
}

function formatModalidadLabel(modalidad) {
  return String(modalidad || '').toUpperCase() === 'QUINCENAL' ? 'Quincenal' : 'Semanal';
}

function getDiasLabel(dias) {
  const num = Number(dias ?? 30);
  if (num <= 0) return 'Vence hoy';
  if (num === 1) return 'Falta 1 día';
  return `Faltan ${num} días`;
}

export function PapeleraDashboard({ onShowAlert, onSync }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('todos'); // 'todos' | 'clientes' | 'prestamos'
  const [selectedLoanByClient, setSelectedLoanByClient] = useState({});

  const [clienteParaRestaurar, setClienteParaRestaurar] = useState(null);
  const [incluirPrestamosIndividuales, setIncluirPrestamosIndividuales] = useState(true);
  const [clienteParaEliminar, setClienteParaEliminar] = useState(null);
  const [prestamoParaRestaurar, setPrestamoParaRestaurar] = useState(null); // { client, loan }
  const [prestamoParaEliminar, setPrestamoParaEliminar] = useState(null); // { client, loan }
  const [confirmTodosAction, setConfirmTodosAction] = useState(null); // { type: 'restaurar' | 'eliminar', client }
  const [isVaciarModalOpen, setIsVaciarModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPapelera = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getPapelera();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error cargando papelera:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPapelera();
  }, [loadPapelera]);

  const tabCounts = useMemo(() => {
    const todos = clientes.length;
    const soloClientes = clientes.filter((c) => c.cliente_en_papelera).length;
    const conPrestamos = clientes.filter(
      (c) => Array.isArray(c.prestamos_papelera) && c.prestamos_papelera.length > 0
    ).length;
    return {
      todos,
      clientes: soloClientes,
      prestamos: conPrestamos
    };
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    const baseByTab = clientes.filter((c) => {
      if (filterTab === 'clientes') return Boolean(c.cliente_en_papelera);
      if (filterTab === 'prestamos') {
        return Array.isArray(c.prestamos_papelera) && c.prestamos_papelera.length > 0;
      }
      return true;
    });

    const term = searchTerm.trim().toLowerCase();
    if (!term) return baseByTab;

    return baseByTab.filter((c) => {
      const fullName = `${c.nombre || ''} ${c.apellidos || ''}`.toLowerCase();
      const cedula = String(c.cedula || '').toLowerCase();
      const phone = String(c.telefono || '').toLowerCase();
      const phone2 = String(c.telefono_secundario || '').toLowerCase();
      const ubicacion = String(c.ubicacion || '').toLowerCase();
      const loansMatch = (c.prestamos_papelera || []).some((p) => {
        const mod = String(p.modalidad || '').toLowerCase();
        const cat = String(p.categoria_previa || '').toLowerCase();
        const monto = String(p.monto_prestado || '');
        return mod.includes(term) || cat.includes(term) || monto.includes(term);
      });
      return (
        fullName.includes(term) ||
        cedula.includes(term) ||
        phone.includes(term) ||
        phone2.includes(term) ||
        ubicacion.includes(term) ||
        loansMatch
      );
    });
  }, [clientes, filterTab, searchTerm]);

  const syncAll = async () => {
    await loadPapelera();
    if (onSync) await onSync();
  };

  const handleConfirmRestaurarCliente = async () => {
    if (!clienteParaRestaurar) return;
    setIsProcessing(true);
    try {
      await dbService.restaurarClientePapelera(clienteParaRestaurar.id, {
        restaurarPrestamosIndividuales: incluirPrestamosIndividuales
      });
      setClienteParaRestaurar(null);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al restaurar cliente:', err);
      setClienteParaRestaurar(null);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al restaurar',
          message: err.userMessage || err.message || 'No se pudo restaurar el cliente de la papelera.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEliminarDefinitivoCliente = async () => {
    if (!clienteParaEliminar) return;
    setIsProcessing(true);
    try {
      await dbService.eliminarClienteDefinitivo(clienteParaEliminar.id);
      setClienteParaEliminar(null);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error en eliminación definitiva:', err);
      setClienteParaEliminar(null);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al eliminar',
          message: err.userMessage || err.message || 'No se pudo completar la eliminación definitiva.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRestaurarPrestamo = async () => {
    if (!prestamoParaRestaurar?.loan?.id) return;
    setIsProcessing(true);
    try {
      await dbService.restaurarPrestamoPapelera(prestamoParaRestaurar.loan.id);
      setPrestamoParaRestaurar(null);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al restaurar préstamo:', err);
      setPrestamoParaRestaurar(null);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al restaurar préstamo',
          message: err.userMessage || err.message || 'No se pudo restaurar el préstamo en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEliminarPrestamo = async () => {
    if (!prestamoParaEliminar?.loan?.id) return;
    setIsProcessing(true);
    try {
      await dbService.eliminarPrestamoDefinitivoPapelera(prestamoParaEliminar.loan.id);
      setPrestamoParaEliminar(null);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error eliminando préstamo definitivo:', err);
      setPrestamoParaEliminar(null);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al eliminar préstamo',
          message: err.userMessage || err.message || 'No se pudo eliminar definitivamente el préstamo.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTodosAction = async () => {
    if (!confirmTodosAction?.client) return;
    const { type, client } = confirmTodosAction;
    setIsProcessing(true);
    try {
      if (type === 'restaurar') {
        await dbService.restaurarClientePapelera(client.id, {
          restaurarPrestamosIndividuales: true
        });
      } else {
        await dbService.eliminarClienteDefinitivo(client.id);
      }
      setConfirmTodosAction(null);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error procesando préstamos en lote:', err);
      setConfirmTodosAction(null);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al procesar',
          message: err.userMessage || err.message || 'No se pudo completar la operación.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmVaciarPapelera = async () => {
    setIsProcessing(true);
    try {
      await dbService.vaciarPapelera();
      setIsVaciarModalOpen(false);
      await syncAll();
    } catch (err) {
      console.error('[Diagnóstico técnico para desarrollador]: Error al vaciar papelera:', err);
      setIsVaciarModalOpen(false);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error al vaciar papelera',
          message: err.userMessage || err.message || 'No se pudo vaciar la papelera en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const openRestaurarClienteModal = (c) => {
    setIncluirPrestamosIndividuales(true);
    setClienteParaRestaurar(c);
  };

  const clienteRestoreLoans = Array.isArray(clienteParaRestaurar?.prestamos_papelera)
    ? clienteParaRestaurar.prestamos_papelera
    : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '2px 0 28px 0',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'inherit'
      }}
    >
      {/* 1. BARRA SUPERIOR: RESUMEN Y BOTÓN VACIAR PAPELERA */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px 12px',
          backgroundColor: 'var(--aureus-bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--aureus-border-subtle)',
          padding: '12px 14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '1 1 160px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--aureus-red-light)',
              border: '1px solid var(--aureus-red-border)',
              color: 'var(--aureus-red-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Trash2 size={18} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aureus-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'block'
              }}
            >
              Papelera unificada
            </span>
            <span
              style={{
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: 900,
                color: 'var(--aureus-text-primary)'
              }}
            >
              {clientes.length === 1 ? '1 cliente con movimientos' : `${clientes.length} clientes con movimientos`}
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
            borderColor: clientes.length === 0 ? 'var(--aureus-border-subtle)' : 'var(--aureus-red-border)',
            backgroundColor: clientes.length === 0 ? 'var(--aureus-bg-elevated)' : 'var(--aureus-red-light)',
            color: clientes.length === 0 ? 'var(--aureus-text-muted)' : 'var(--aureus-red-text)',
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 800,
            cursor: clientes.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
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
          backgroundColor: 'var(--aureus-bg-elevated)',
          border: '1px solid var(--aureus-border-subtle)',
          borderRadius: '14px',
          padding: '12px 14px'
        }}
      >
        <Info size={18} strokeWidth={2.2} style={{ color: 'var(--aureus-text-secondary)', flexShrink: 0, marginTop: '2px' }} />
        <p
          style={{
            margin: 0,
            fontFamily: 'inherit',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--aureus-text-secondary)',
            lineHeight: 1.45
          }}
        >
          Los clientes y préstamos enviados a la papelera se conservan por <strong>30 días</strong> antes de su archivo definitivo automático. Aquí puedes restaurarlos de forma individual o conjunta.
        </p>
      </div>

      {/* 3. BUSCADOR EN TIEMPO REAL */}
      <div
        className="cf-search-pill"
        style={{
          position: 'relative',
          width: '100%',
          height: '46px',
          borderRadius: '12px',
          border: '1px solid var(--aureus-border-subtle)',
          backgroundColor: 'var(--aureus-bg-surface)',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          transition: 'border-color 0.16s ease, box-shadow 0.16s ease'
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
            color: 'var(--aureus-text-muted)',
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
            height: '100%',
            paddingLeft: '42px',
            paddingRight: searchTerm ? '42px' : '14px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--aureus-text-primary)',
            outline: 'none',
            boxShadow: 'none',
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
              backgroundColor: 'var(--aureus-bg-muted)',
              border: 'none',
              color: 'var(--aureus-text-secondary)',
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

      {/* 3.5 CONTROL SEGMENTADO DE FILTRO */}
      <div
        role="tablist"
        aria-label="Filtrar registros en papelera"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '5px',
          borderRadius: '14px',
          backgroundColor: 'var(--aureus-bg-surface)',
          border: '1px solid var(--aureus-border-subtle)',
          boxSizing: 'border-box'
        }}
      >
        {[
          { key: 'todos', label: 'Todos', count: tabCounts.todos },
          { key: 'clientes', label: 'Clientes eliminados', count: tabCounts.clientes },
          { key: 'prestamos', label: 'Préstamos eliminados', count: tabCounts.prestamos }
        ].map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilterTab(tab.key)}
              style={{
                flex: '1 1 110px',
                minWidth: 0,
                minHeight: '36px',
                padding: '6px 10px',
                borderRadius: '10px',
                border: isActive ? '1px solid #B69A55' : '1px solid transparent',
                backgroundColor: isActive ? '#D4B46A' : 'transparent',
                color: isActive ? '#101C2C' : 'var(--aureus-text-secondary)',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: isActive ? 800 : 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  minWidth: '20px',
                  height: '20px',
                  padding: '0 6px',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#101C2C' : 'var(--aureus-bg-elevated)',
                  color: isActive ? '#D4B46A' : 'var(--aureus-text-primary)',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. LISTADO AGRUPADO POR CLIENTE */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 0',
            color: 'var(--aureus-text-muted)',
            gap: '8px'
          }}
        >
          <RefreshCw size={18} className="animate-spin" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Cargando papelera...</span>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--aureus-bg-surface)',
            borderRadius: '18px',
            border: '1px solid var(--aureus-border-subtle)',
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
              backgroundColor: 'var(--aureus-bg-elevated)',
              color: 'var(--aureus-text-muted)',
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
                color: 'var(--aureus-text-primary)'
              }}
            >
              {searchTerm
                ? 'No se encontraron coincidencias'
                : filterTab === 'clientes'
                  ? 'Sin clientes eliminados'
                  : filterTab === 'prestamos'
                    ? 'Sin préstamos eliminados'
                    : 'La papelera está vacía'}
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--aureus-text-muted)',
                maxWidth: '320px'
              }}
            >
              {searchTerm
                ? 'Ningún registro en la papelera coincide con tu búsqueda.'
                : 'No hay clientes ni préstamos pendientes de eliminación definitiva en esta vista.'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--modules-grid-cols, 1fr)', gap: '12px' }}>
          {filteredClientes.map((c) => {
            const nombreCompleto = formatFullName(c.nombre, c.apellidos);
            const initials = getInitials(c.nombre, c.apellidos);
            const dias = Number(c.dias_restantes ?? 30);
            const prestamos = Array.isArray(c.prestamos_papelera) ? c.prestamos_papelera : [];
            const isCritical = dias <= 3;
            const isMedium = dias <= 10 && dias > 3;

            const savedLoanId = selectedLoanByClient[c.id];
            const selectedLoan =
              prestamos.find((p) => p.id === savedLoanId) || prestamos[0] || null;
            const saldoInfo = selectedLoan ? getLoanSaldoDisplay(selectedLoan) : null;

            return (
              <div
                key={c.id}
                style={{
                  backgroundColor: 'var(--aureus-bg-surface)',
                  borderRadius: '16px',
                  border: isCritical ? '1px solid var(--aureus-red-border)' : '1px solid var(--aureus-border-subtle)',
                  padding: '14px',
                  boxShadow: 'var(--aureus-card-shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minWidth: 0
                }}
              >
                {/* CABECERA ÚNICA DEL CLIENTE */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 180px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#B69A55',
                        color: '#FFFFFF',
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

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {nombreCompleto}
                        </h4>

                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            backgroundColor: c.cliente_en_papelera
                              ? 'var(--aureus-red-light)'
                              : 'var(--aureus-green-light)',
                            border: `1px solid ${c.cliente_en_papelera ? 'var(--aureus-red-border)' : 'var(--aureus-green-border)'}`,
                            color: c.cliente_en_papelera
                              ? 'var(--aureus-red-text)'
                              : 'var(--aureus-green-text)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {c.cliente_en_papelera ? 'Cliente en papelera' : 'Cliente activo'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                          marginTop: '3px'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'inherit',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--aureus-text-muted)'
                          }}
                        >
                          {c.cedula ? `Cédula ${c.cedula}` : 'Sin cédula'}
                        </span>
                        {c.telefono && (
                          <>
                            <span style={{ color: 'var(--aureus-text-muted)' }}>•</span>
                            <span
                              style={{
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--aureus-text-secondary)'
                              }}
                            >
                              {formatPhone(c.telefono)}
                            </span>
                          </>
                        )}
                        {c.telefono_secundario && (
                          <>
                            <span style={{ color: 'var(--aureus-text-muted)' }}>•</span>
                            <span
                              style={{
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--aureus-text-secondary)'
                              }}
                            >
                              {formatPhone(c.telefono_secundario)}
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
                      backgroundColor: isCritical ? 'var(--aureus-red-light)' : isMedium ? 'var(--aureus-gold-light)' : 'var(--aureus-bg-elevated)',
                      border: `1px solid ${isCritical ? 'var(--aureus-red-border)' : isMedium ? 'var(--aureus-border-gold)' : 'var(--aureus-border-subtle)'}`,
                      color: isCritical ? 'var(--aureus-red-text)' : isMedium ? 'var(--aureus-gold-text)' : 'var(--aureus-text-primary)',
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
                      {getDiasLabel(selectedLoan && !c.cliente_en_papelera ? selectedLoan.dias_restantes : dias)}
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
                      color: 'var(--aureus-text-muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: 0
                    }}
                  >
                    <MapPin size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.ubicacion}
                    </span>
                  </div>
                )}

                {/* SECCIÓN DE PRÉSTAMOS AGRUPADOS CON PESTAÑAS DE PÍLDORA */}
                {prestamos.length > 0 && selectedLoan && (
                  <div
                    style={{
                      backgroundColor: 'var(--aureus-bg-elevated)',
                      border: '1px solid var(--aureus-border-subtle)',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Landmark size={14} strokeWidth={2.2} style={{ color: 'var(--aureus-gold-text)' }} />
                        <span
                          style={{
                            fontFamily: 'inherit',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}
                        >
                          {prestamos.length === 1 ? 'Préstamo en papelera' : `${prestamos.length} préstamos en papelera`}
                        </span>
                      </div>

                      {selectedLoan.origen_papelera === 'PRESTAMO_ELIMINADO' && (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--aureus-gold-light)',
                            border: '1px solid var(--aureus-border-gold)',
                            color: 'var(--aureus-gold-text)',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Eliminado por separado
                        </span>
                      )}
                    </div>

                    {/* Píldoras para cambiar entre préstamos cuando existen varios */}
                    {prestamos.length > 1 && (
                      <div
                        role="tablist"
                        aria-label={`Préstamos de ${nombreCompleto}`}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}
                      >
                        {prestamos.map((loanItem, idx) => {
                          const isSelected = loanItem.id === selectedLoan.id;
                          return (
                            <button
                              key={loanItem.id}
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              onClick={() =>
                                setSelectedLoanByClient((prev) => ({
                                  ...prev,
                                  [c.id]: loanItem.id
                                }))
                              }
                              style={{
                                padding: '5px 10px',
                                borderRadius: '9999px',
                                border: isSelected
                                  ? '1px solid #B69A55'
                                  : '1px solid var(--aureus-border-subtle)',
                                backgroundColor: isSelected
                                  ? '#D4B46A'
                                  : 'var(--aureus-bg-surface)',
                                color: isSelected
                                  ? '#101C2C'
                                  : 'var(--aureus-text-secondary)',
                                fontFamily: 'inherit',
                                fontSize: '11.5px',
                                fontWeight: isSelected ? 800 : 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.14s ease'
                              }}
                            >
                              {`Préstamo ${idx + 1} · ${formatColones(loanItem.monto_prestado)}`}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Metadatos del préstamo seleccionado */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px'
                      }}
                    >
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor:
                            String(selectedLoan.categoria_previa || '').toUpperCase() === 'ATRASADO'
                              ? 'var(--aureus-red-light)'
                              : String(selectedLoan.categoria_previa || '').toUpperCase() === 'REGISTRADO'
                                ? 'var(--aureus-green-light)'
                                : 'var(--aureus-gold-light)',
                          border: `1px solid ${
                            String(selectedLoan.categoria_previa || '').toUpperCase() === 'ATRASADO'
                              ? 'var(--aureus-red-border)'
                              : String(selectedLoan.categoria_previa || '').toUpperCase() === 'REGISTRADO'
                                ? 'var(--aureus-green-border)'
                                : 'var(--aureus-border-gold)'
                          }`,
                          color:
                            String(selectedLoan.categoria_previa || '').toUpperCase() === 'ATRASADO'
                              ? 'var(--aureus-red-text)'
                              : String(selectedLoan.categoria_previa || '').toUpperCase() === 'REGISTRADO'
                                ? 'var(--aureus-green-text)'
                                : 'var(--aureus-gold-text)',
                          fontSize: '11px',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatCategoriaLabel(selectedLoan.categoria_previa)}
                      </span>

                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          color: 'var(--aureus-text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatModalidadLabel(selectedLoan.modalidad)}
                      </span>

                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          color: 'var(--aureus-text-secondary)',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {`Cuotas ${selectedLoan.periodos_pagados ?? 0} de ${selectedLoan.total_periodos ?? 0}`}
                      </span>

                      {c.cliente_en_papelera && (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--aureus-bg-surface)',
                            border: '1px solid var(--aureus-border-subtle)',
                            color: 'var(--aureus-text-muted)',
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getDiasLabel(selectedLoan.dias_restantes)}
                        </span>
                      )}
                    </div>

                    {/* 3 Columnas métricas: MONTO PRESTADO, CUOTA, SALDO PENDIENTE */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          borderRadius: '10px',
                          padding: '8px 10px'
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-muted)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          MONTO PRESTADO
                        </span>
                        <strong
                          style={{
                            display: 'block',
                            marginTop: '2px',
                            fontSize: '13px',
                            fontWeight: 900,
                            color: 'var(--aureus-text-primary)'
                          }}
                        >
                          {formatColones(selectedLoan.monto_prestado)}
                        </strong>
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          borderRadius: '10px',
                          padding: '8px 10px'
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-muted)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          CUOTA
                        </span>
                        <strong
                          style={{
                            display: 'block',
                            marginTop: '2px',
                            fontSize: '13px',
                            fontWeight: 900,
                            color: 'var(--aureus-gold-text)'
                          }}
                        >
                          {formatColones(selectedLoan.cuota)}
                        </strong>
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--aureus-bg-surface)',
                          border: '1px solid var(--aureus-border-subtle)',
                          borderRadius: '10px',
                          padding: '8px 10px'
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-muted)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          SALDO PENDIENTE
                        </span>
                        <strong
                          style={{
                            display: 'block',
                            marginTop: '2px',
                            fontSize: '13px',
                            fontWeight: 900,
                            color: saldoInfo?.isPaidLoan ? 'var(--aureus-green-text)' : 'var(--aureus-red-text)'
                          }}
                        >
                          {saldoInfo?.isPaidLoan ? '₡0' : formatColones(saldoInfo?.saldo || 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Acciones directas sobre el préstamo seleccionado */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
                        gap: '8px'
                      }}
                    >
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setPrestamoParaRestaurar({ client: c, loan: selectedLoan })}
                        style={{
                          height: '36px',
                          padding: '0 10px',
                          borderRadius: '10px',
                          backgroundColor: '#397D67',
                          border: '1px solid #2D6654',
                          color: '#FFFFFF',
                          fontFamily: 'inherit',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <RotateCcw size={13.5} strokeWidth={2.5} />
                        <span>Restaurar préstamo</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setPrestamoParaEliminar({ client: c, loan: selectedLoan })}
                        style={{
                          height: '36px',
                          padding: '0 10px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--aureus-red-light)',
                          border: '1px solid var(--aureus-red-border)',
                          color: 'var(--aureus-red-text)',
                          fontFamily: 'inherit',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <Trash2 size={13.5} strokeWidth={2.2} />
                        <span>Eliminar préstamo</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTONES DEL PIE DE TARJETA: CLIENTE EN PAPELERA O VARIOS PRÉSTAMOS CON CLIENTE ACTIVO */}
                {c.cliente_en_papelera ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
                      gap: '8px',
                      paddingTop: '2px'
                    }}
                  >
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => openRestaurarClienteModal(c)}
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        backgroundColor: '#D4B46A',
                        border: '1px solid #B69A55',
                        color: '#101C2C',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <RotateCcw size={14} strokeWidth={2.5} />
                      <span>Restaurar cliente</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setClienteParaEliminar(c)}
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--aureus-red-light)',
                        border: '1px solid var(--aureus-red-border)',
                        color: 'var(--aureus-red-text)',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                ) : prestamos.length >= 2 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
                      gap: '8px',
                      paddingTop: '2px'
                    }}
                  >
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setConfirmTodosAction({ type: 'restaurar', client: c })}
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        backgroundColor: '#D4B46A',
                        border: '1px solid #B69A55',
                        color: '#101C2C',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <RotateCcw size={14} strokeWidth={2.5} />
                      <span>Restaurar todos</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setConfirmTodosAction({ type: 'eliminar', client: c })}
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--aureus-red-light)',
                        border: '1px solid var(--aureus-red-border)',
                        color: 'var(--aureus-red-text)',
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2.2} />
                      <span>Eliminar todos</span>
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: RESTAURAR CLIENTE CON OPCIÓN DE PRÉSTAMOS */}
      <ConfirmModal
        isOpen={!!clienteParaRestaurar}
        title="Restaurar Cliente"
        question={
          clienteParaRestaurar
            ? `¿Deseas restaurar a ${formatFullName(clienteParaRestaurar.nombre, clienteParaRestaurar.apellidos)}? El cliente volverá a estar activo en tu directorio de clientes.`
            : ''
        }
        confirmText="Restaurar Cliente"
        cancelText="Cancelar"
        confirmVariant="primary"
        iconType="renew"
        stageVariant="restaurar_cliente"
        clientName={formatFullName(clienteParaRestaurar?.nombre, clienteParaRestaurar?.apellidos)}
        subtitle={formatFullName(clienteParaRestaurar?.nombre, clienteParaRestaurar?.apellidos)}
        onCancel={() => setClienteParaRestaurar(null)}
        onConfirm={handleConfirmRestaurarCliente}
      >
        {clienteRestoreLoans.length > 0 && (
          <div
            onClick={() => setIncluirPrestamosIndividuales((prev) => !prev)}
            role="checkbox"
            aria-checked={incluirPrestamosIndividuales}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIncluirPrestamosIndividuales((prev) => !prev);
              }
            }}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: 'var(--aureus-bg-elevated)',
              border: '1px solid var(--aureus-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              boxSizing: 'border-box'
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '6px',
                border: incluirPrestamosIndividuales
                  ? '1.5px solid #B69A55'
                  : '2px solid var(--aureus-border-subtle)',
                backgroundColor: incluirPrestamosIndividuales ? '#D4B46A' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {incluirPrestamosIndividuales && <Check size={12} strokeWidth={3} color="#101C2C" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: 'var(--aureus-text-primary)'
                }}
              >
                Incluir todos sus préstamos en papelera
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--aureus-text-muted)'
                }}
              >
                {clienteRestoreLoans.length === 1
                  ? 'También restaura 1 préstamo guardado en papelera.'
                  : `También restaura los ${clienteRestoreLoans.length} préstamos guardados en papelera.`}
              </span>
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* MODAL 2: ELIMINAR CLIENTE DEFINITIVAMENTE */}
      <ConfirmModal
        isOpen={!!clienteParaEliminar}
        title="Eliminar Definitivamente"
        question={
          clienteParaEliminar
            ? `¿Estás seguro de que deseas eliminar definitivamente a ${formatFullName(clienteParaEliminar.nombre, clienteParaEliminar.apellidos)}? Se archivará su historial financiero y no podrá recuperarse sin esperar los 30 días.`
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
        onConfirm={handleConfirmEliminarDefinitivoCliente}
      />

      {/* MODAL 3: RESTAURAR PRÉSTAMO INDIVIDUAL */}
      <ConfirmModal
        isOpen={!!prestamoParaRestaurar}
        title="Restaurar Préstamo"
        question={
          prestamoParaRestaurar
            ? prestamoParaRestaurar.client?.cliente_en_papelera
              ? `¿Deseas restaurar este préstamo de ${formatColones(prestamoParaRestaurar.loan?.monto_prestado)}? Como ${formatFullName(prestamoParaRestaurar.client?.nombre, prestamoParaRestaurar.client?.apellidos)} está en la papelera, también se restaurará automáticamente al cliente como activo.`
              : `¿Deseas restaurar el préstamo de ${formatColones(prestamoParaRestaurar.loan?.monto_prestado)} perteneciente a ${formatFullName(prestamoParaRestaurar.client?.nombre, prestamoParaRestaurar.client?.apellidos)}?`
            : ''
        }
        confirmText="Restaurar Préstamo"
        cancelText="Cancelar"
        confirmVariant="primary"
        iconType="renew"
        stageVariant="restaurar_prestamo"
        clientName={formatFullName(prestamoParaRestaurar?.client?.nombre, prestamoParaRestaurar?.client?.apellidos)}
        subtitle={formatFullName(prestamoParaRestaurar?.client?.nombre, prestamoParaRestaurar?.client?.apellidos)}
        detailPill={
          prestamoParaRestaurar?.client?.cliente_en_papelera
            ? 'Cliente y préstamo restaurados'
            : 'Activo nuevamente en Préstamos'
        }
        onCancel={() => setPrestamoParaRestaurar(null)}
        onConfirm={handleConfirmRestaurarPrestamo}
      />

      {/* MODAL 4: ELIMINAR PRÉSTAMO DEFINITIVAMENTE */}
      <ConfirmModal
        isOpen={!!prestamoParaEliminar}
        title="Eliminar Préstamo Definitivamente"
        question={
          prestamoParaEliminar
            ? `¿Deseas archivar y eliminar definitivamente este préstamo de ${formatColones(prestamoParaEliminar.loan?.monto_prestado)} de ${formatFullName(prestamoParaEliminar.client?.nombre, prestamoParaEliminar.client?.apellidos)}? Esta acción no se puede revertir.`
            : ''
        }
        confirmText="Eliminar Definitivamente"
        cancelText="Cancelar"
        confirmVariant="danger"
        iconType="trash"
        stageVariant="eliminar_definitivo"
        clientName={formatFullName(prestamoParaEliminar?.client?.nombre, prestamoParaEliminar?.client?.apellidos)}
        subtitle={formatFullName(prestamoParaEliminar?.client?.nombre, prestamoParaEliminar?.client?.apellidos)}
        onCancel={() => setPrestamoParaEliminar(null)}
        onConfirm={handleConfirmEliminarPrestamo}
      />

      {/* MODAL 5: RESTAURAR O ELIMINAR TODOS LOS PRÉSTAMOS DE UN CLIENTE ACTIVO */}
      <ConfirmModal
        isOpen={!!confirmTodosAction}
        title={
          confirmTodosAction?.type === 'restaurar'
            ? 'Restaurar Todos los Préstamos'
            : 'Eliminar Todos los Préstamos'
        }
        question={
          confirmTodosAction
            ? confirmTodosAction.type === 'restaurar'
              ? `¿Deseas restaurar los ${confirmTodosAction.client?.prestamos_papelera?.length || 0} préstamos de ${formatFullName(confirmTodosAction.client?.nombre, confirmTodosAction.client?.apellidos)}?`
              : `¿Deseas archivar y eliminar definitivamente los ${confirmTodosAction.client?.prestamos_papelera?.length || 0} préstamos en papelera de ${formatFullName(confirmTodosAction.client?.nombre, confirmTodosAction.client?.apellidos)}? El cliente permanecerá activo.`
            : ''
        }
        confirmText={
          confirmTodosAction?.type === 'restaurar' ? 'Restaurar Todos' : 'Eliminar Todos'
        }
        cancelText="Cancelar"
        confirmVariant={confirmTodosAction?.type === 'restaurar' ? 'primary' : 'danger'}
        iconType={confirmTodosAction?.type === 'restaurar' ? 'renew' : 'trash'}
        stageVariant={
          confirmTodosAction?.type === 'restaurar' ? 'restaurar_prestamo' : 'eliminar_definitivo'
        }
        isPlural={true}
        clientName={formatFullName(confirmTodosAction?.client?.nombre, confirmTodosAction?.client?.apellidos)}
        subtitle={formatFullName(confirmTodosAction?.client?.nombre, confirmTodosAction?.client?.apellidos)}
        onCancel={() => setConfirmTodosAction(null)}
        onConfirm={handleConfirmTodosAction}
      />

      {/* MODAL 6: VACIAR TODA LA PAPELERA */}
      <ConfirmModal
        isOpen={isVaciarModalOpen}
        title="Vaciar Papelera"
        question="¿Estás seguro de que deseas vaciar toda la papelera? Se archivarán y eliminarán definitivamente todos los clientes y préstamos acumulados. Esta acción no se puede deshacer."
        confirmText="Vaciar Papelera"
        cancelText="Cancelar"
        confirmVariant="danger"
        iconType="trash"
        stageVariant="eliminar_definitivo"
        clientName={clientes.length === 1 ? '1 cliente en papelera' : `${clientes.length} clientes en papelera`}
        subtitle={clientes.length === 1 ? '1 cliente en papelera' : `${clientes.length} clientes en papelera`}
        onCancel={() => setIsVaciarModalOpen(false)}
        onConfirm={handleConfirmVaciarPapelera}
      />
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Landmark, AlertCircle, CheckSquare, Trash2 } from 'lucide-react';
import { LoanCard } from './LoanCard';
import { NewLoanModal } from './NewLoanModal';
import { RenewLoanModal } from './RenewLoanModal';
import { PaymentAgreementModal } from './PaymentAgreementModal';
import { ConfirmModal } from '../Clients/ConfirmModal';
import { ConfirmEliminarPrestamosModal } from './ConfirmEliminarPrestamosModal';
import { formatColones, matchesClientSearch } from '../../utils/formatters';

/**
 * Clasifica cada préstamo individualmente en una de las 3 categorías:
 * - 'REGISTRADOS': Finiquitados o pagados al 100%
 * - 'ATRASADOS': Préstamos en mora
 * - 'PENDIENTES': Préstamos vigentes al día
 */
function getLoanCategory(loan) {
  if (!loan) return 'PENDIENTES';

  const estado = String(loan.estado || loan.status || '').toUpperCase();
  const saldo = Number(loan.saldo_por_pagar ?? loan.remainingBalance ?? 1);
  const monto = Number(loan.monto_prestado ?? loan.amount ?? 0);
  const totalP = Number(loan.total_periodos || 0);
  const pagadosP = Number(loan.periodos_pagados || 0);
  const atrasos = Number(loan.periodos_atrasados_acumulados || 0);

  // 1. REGISTRADOS (Préstamos ya realizados / finiquitados al 100%)
  if (
    estado === 'CANCELADO' ||
    estado === 'LIQUIDADO' ||
    estado === 'PAGADO' ||
    estado === 'REGISTRADO' ||
    (monto > 0 && saldo <= 0) ||
    (totalP > 0 && pagadosP >= totalP)
  ) {
    return 'REGISTRADOS';
  }

  // 2. ATRASADOS (Préstamos en mora)
  if (
    estado === 'ATRASADO' ||
    (loan.modalidad === 'QUINCENAL' ? atrasos >= 2 : atrasos >= 4)
  ) {
    return 'ATRASADOS';
  }

  // 3. PENDIENTES (Préstamos pendientes al día con saldo por cobrar)
  return 'PENDIENTES';
}

export function LoansDirectory({
  loans = [],
  clients = [],
  onAddLoan,
  onRenewLoan,
  onAgreementLoan,
  onDeleteLoans,
  onShowAlert
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Modales principales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [renewTargetLoan, setRenewTargetLoan] = useState(null);
  const [agreementTargetLoan, setAgreementTargetLoan] = useState(null);

  // Modo de selección múltiple (Opción B)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLoanIds, setSelectedLoanIds] = useState([]);

  // Estado del modal de doble verificación de eliminación
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    targetLoan: null,
    batchLoans: []
  });

  // Estados para modal de doble verificación de creación y edición
  const [pendingLoanPayload, setPendingLoanPayload] = useState(null);
  const [pendingRenewPayload, setPendingRenewPayload] = useState(null);
  const [pendingAgreementPayload, setPendingAgreementPayload] = useState(null);

  // Estado de la pestaña activa ('PENDIENTES', 'REGISTRADOS', 'ATRASADOS')
  const [activeCategory, setActiveCategory] = useState('PENDIENTES');

  // Clasificación de contadores para las 3 pestañas
  const categoryCounts = useMemo(() => {
    let pendientes = 0;
    let registrados = 0;
    let atrasados = 0;

    loans.forEach((l) => {
      const cat = getLoanCategory(l);
      if (cat === 'REGISTRADOS') registrados++;
      else if (cat === 'ATRASADOS') atrasados++;
      else pendientes++;
    });

    return { pendientes, registrados, atrasados };
  }, [loans]);

  // Préstamos que pertenecen a la pestaña activa
  const activeCategoryLoans = useMemo(() => {
    return loans.filter((l) => getLoanCategory(l) === activeCategory);
  }, [loans, activeCategory]);

  // Filtro inteligente por nombre, apellidos, teléfono, cédula, ubicación o detalles dentro de la pestaña activa
  const filteredLoans = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return activeCategoryLoans;

    return activeCategoryLoans.filter((l) =>
      matchesClientSearch(
        {
          nombre: l.cliente_nombre,
          apellidos: l.cliente_apellidos,
          cedula: l.cliente_cedula,
          telefono: l.cliente_telefono,
          ubicacion: l.cliente_ubicacion,
          detalles: l.cliente_detalles
        },
        searchTerm
      )
    );
  }, [activeCategoryLoans, searchTerm]);

  // 1. Agrupación reactiva de préstamos por cliente dentro del apartado activo
  const groupedClients = useMemo(() => {
    const map = new Map();

    filteredLoans.forEach((loan) => {
      // Clave única: cliente_id preferente, o combinación nombre + apellidos
      const key =
        loan.cliente_id ||
        loan.clienteId ||
        `${(loan.cliente_nombre || '').trim().toLowerCase()}_${(loan.cliente_apellidos || '').trim().toLowerCase()}` ||
        `loan_${loan.id}`;

      if (!map.has(key)) {
        map.set(key, {
          clientKey: key,
          clientName: [loan.cliente_nombre, loan.cliente_apellidos].filter(Boolean).join(' ') || 'Cliente',
          clientCedula: loan.cliente_cedula || '',
          loans: []
        });
      }
      map.get(key).loans.push(loan);
    });

    return Array.from(map.values());
  }, [filteredLoans]);

  // Título dinámico según la pestaña activa
  const mainHeading = useMemo(() => {
    switch (activeCategory) {
      case 'REGISTRADOS':
        return 'Préstamos registrados';
      case 'ATRASADOS':
        return 'Préstamos atrasados';
      case 'PENDIENTES':
      default:
        return 'Préstamos pendientes';
    }
  }, [activeCategory]);

  // Subtítulo informativo dinámico y limpio (sin barras ni paréntesis)
  const countSubtitle = useMemo(() => {
    const clientesFiltrados = groupedClients.length;
    const prestamosFiltrados = filteredLoans.length;

    const textoClientes = clientesFiltrados === 1 ? '1 cliente' : `${clientesFiltrados} clientes`;

    if (searchTerm.trim()) {
      const textoPrestamos = prestamosFiltrados === 1 ? '1 préstamo encontrado' : `${prestamosFiltrados} préstamos encontrados`;
      return `${textoClientes} · ${textoPrestamos}`;
    }

    let etiquetaPrestamo = 'pendientes';
    let etiquetaPrestamoSingular = 'pendiente';
    if (activeCategory === 'REGISTRADOS') {
      etiquetaPrestamo = 'registrados';
      etiquetaPrestamoSingular = 'registrado';
    } else if (activeCategory === 'ATRASADOS') {
      etiquetaPrestamo = 'atrasados';
      etiquetaPrestamoSingular = 'atrasado';
    }

    const textoPrestamos =
      prestamosFiltrados === 1
        ? `1 préstamo ${etiquetaPrestamoSingular}`
        : `${prestamosFiltrados} préstamos ${etiquetaPrestamo}`;

    return `${textoClientes} · ${textoPrestamos}`;
  }, [groupedClients.length, filteredLoans.length, searchTerm, activeCategory]);

  // Cambio de pestaña con reinicio de selección múltiple
  const handleTabChange = (category) => {
    setActiveCategory(category);
    setSelectedLoanIds([]);
  };

  // IDs visibles según el filtro de búsqueda
  const visibleLoanIds = useMemo(() => filteredLoans.map((l) => l.id), [filteredLoans]);

  const isAllVisibleSelected = useMemo(() => {
    if (visibleLoanIds.length === 0) return false;
    return visibleLoanIds.every((id) => selectedLoanIds.includes(id));
  }, [visibleLoanIds, selectedLoanIds]);

  // Manejadores de selección múltiple (Opción B)
  const handleToggleSelectLoan = (loanId) => {
    setSelectedLoanIds((prev) => {
      if (prev.includes(loanId)) {
        return prev.filter((id) => id !== loanId);
      }
      return [...prev, loanId];
    });
  };

  const handleToggleSelectAllVisible = () => {
    if (visibleLoanIds.length === 0) return;
    if (isAllVisibleSelected) {
      setSelectedLoanIds((prev) => prev.filter((id) => !visibleLoanIds.includes(id)));
    } else {
      setSelectedLoanIds((prev) => Array.from(new Set([...prev, ...visibleLoanIds])));
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedLoanIds([]);
  };

  // Apertura del modal de eliminación (Opción A individual u Opción B lote)
  const handleOpenDeleteSingle = (loan) => {
    setDeleteModalState({
      isOpen: true,
      targetLoan: loan,
      batchLoans: []
    });
  };

  const handleOpenDeleteBatch = () => {
    if (selectedLoanIds.length === 0) return;
    const batchList = loans.filter((l) => selectedLoanIds.includes(l.id));
    setDeleteModalState({
      isOpen: true,
      targetLoan: null,
      batchLoans: batchList
    });
  };

  const handleConfirmDelete = async (ids) => {
    if (!onDeleteLoans) return;
    const res = await onDeleteLoans(ids);
    if (res && res.success !== false) {
      setDeleteModalState({ isOpen: false, targetLoan: null, batchLoans: [] });
      setSelectedLoanIds([]);
      setIsSelectionMode(false);
    }
  };

  // Manejadores de envío con doble verificación
  const handleRequestSaveLoan = async (payload) => {
    if (!payload) return;
    await onAddLoan(payload);
    setIsNewModalOpen(false);
  };

  const handleConfirmSaveLoan = async () => {
    if (!pendingLoanPayload) return;
    const payload = pendingLoanPayload;
    setPendingLoanPayload(null);
    setIsNewModalOpen(false);
    await onAddLoan(payload);
  };

  const handleRequestRenew = (payload) => {
    setPendingRenewPayload(payload);
  };

  const handleConfirmRenew = async () => {
    if (!pendingRenewPayload) return;
    const payload = pendingRenewPayload;
    setPendingRenewPayload(null);
    setRenewTargetLoan(null);
    await onRenewLoan(payload);
  };

  const handleRequestAgreement = (payload) => {
    setPendingAgreementPayload(payload);
  };

  const handleConfirmAgreement = async () => {
    if (!pendingAgreementPayload) return;
    const payload = pendingAgreementPayload;
    setPendingAgreementPayload(null);
    setAgreementTargetLoan(null);
    await onAgreementLoan(payload);
  };

  return (
    <div className="loans-directory-container">
      {/* 2.2. Encabezado de Sección y Botones de Acción */}
      <section className="directory-header-row" aria-label="Cabecera de préstamos">
        <div className="directory-header-info">
          <h2 className="directory-main-heading">{mainHeading}</h2>
          <p className="directory-count-subtitle">{countSubtitle}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isSelectionMode && (
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(true);
                setSelectedLoanIds([]);
              }}
              style={{
                height: '40px',
                padding: '0 14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.15s ease'
              }}
              title="Seleccionar préstamos para eliminar en lote"
              aria-label="Seleccionar préstamos para eliminar en lote"
            >
              <CheckSquare size={16} strokeWidth={2.2} />
              <span>Seleccionar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="btn-new-client"
            title="Crear un nuevo préstamo"
            aria-label="Crear un nuevo préstamo"
          >
            <Plus size={16} strokeWidth={2.25} className="w-4 h-4 shrink-0" />
            <span>Nuevo</span>
          </button>
        </div>
      </section>

      {/* Barra de Acciones del Modo de Selección Múltiple */}
      {isSelectionMode && (
        <section
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
            marginBottom: '12px'
          }}
          aria-label="Barra de acciones de selección múltiple"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              {selectedLoanIds.length === 1
                ? '1 seleccionado'
                : `${selectedLoanIds.length} seleccionados`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* 1.º (Extremo izquierdo): Botón Cancelar */}
            <button
              type="button"
              onClick={handleCancelSelection}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            {/* 2.º (Al lado derecho de Cancelar): Botón Seleccionar todos / Deseleccionar todos */}
            <button
              type="button"
              onClick={handleToggleSelectAllVisible}
              style={{
                height: '38px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {isAllVisibleSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>

            {/* 3.º (A la derecha): Botón Eliminar seleccionados */}
            <button
              type="button"
              disabled={selectedLoanIds.length === 0}
              onClick={handleOpenDeleteBatch}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: selectedLoanIds.length === 0 ? '#fda4af' : '#e11d48',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: selectedLoanIds.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedLoanIds.length === 0 ? 'none' : '0 2px 8px rgba(225, 29, 72, 0.25)'
              }}
            >
              <Trash2 size={15} strokeWidth={2.4} />
              <span>
                {selectedLoanIds.length === 1
                  ? 'Eliminar 1 préstamo'
                  : selectedLoanIds.length > 1
                  ? `Eliminar ${selectedLoanIds.length} préstamos`
                  : 'Eliminar seleccionados'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Buscador Instantáneo Multi-Criterio */}
      <section className="directory-search-wrapper" aria-label="Búsqueda de préstamos">
        <div className="directory-search-bar">
          <Search size={19} strokeWidth={1.75} className="search-input-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula, teléfono o ubicación"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="directory-search-input"
            autoComplete="off"
            aria-label="Buscar préstamos"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="search-clear-btn"
              aria-label="Limpiar búsqueda"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </section>

      {/* Barra de 3 Pestañas de Clasificación: Pendientes, Registrados y Atrasados */}
      <section
        style={{
          backgroundColor: '#f1f5f9',
          padding: '5px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '6px',
          marginBottom: '16px'
        }}
        role="tablist"
        aria-label="Pestañas de clasificación de préstamos"
      >
        {/* Pestaña 1: Pendientes */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'PENDIENTES'}
          onClick={() => handleTabChange('PENDIENTES')}
          style={{
            backgroundColor: activeCategory === 'PENDIENTES' ? '#0A3323' : 'transparent',
            color: activeCategory === 'PENDIENTES' ? '#ffffff' : '#475569',
            fontWeight: activeCategory === 'PENDIENTES' ? 800 : 700,
            borderRadius: '10px',
            height: '38px',
            boxShadow: activeCategory === 'PENDIENTES' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
            border: activeCategory === 'PENDIENTES' ? '1px solid #1B4D37' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease',
            padding: '0 8px'
          }}
        >
          <span>Pendientes</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '1px 7px',
              borderRadius: '9999px',
              backgroundColor: activeCategory === 'PENDIENTES' ? 'rgba(255, 255, 255, 0.2)' : '#D6E7D6',
              color: activeCategory === 'PENDIENTES' ? '#ffffff' : '#0A3323'
            }}
          >
            {categoryCounts.pendientes}
          </span>
        </button>

        {/* Pestaña 2: Registrados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'REGISTRADOS'}
          onClick={() => handleTabChange('REGISTRADOS')}
          style={{
            backgroundColor: activeCategory === 'REGISTRADOS' ? '#0A3323' : 'transparent',
            color: activeCategory === 'REGISTRADOS' ? '#ffffff' : '#475569',
            fontWeight: activeCategory === 'REGISTRADOS' ? 800 : 700,
            borderRadius: '10px',
            height: '38px',
            boxShadow: activeCategory === 'REGISTRADOS' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
            border: activeCategory === 'REGISTRADOS' ? '1px solid #1B4D37' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease',
            padding: '0 8px'
          }}
        >
          <span>Registrados</span>
          {categoryCounts.registrados > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: '9999px',
                backgroundColor: activeCategory === 'REGISTRADOS' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeCategory === 'REGISTRADOS' ? '#ffffff' : '#475569'
              }}
            >
              {categoryCounts.registrados}
            </span>
          )}
        </button>

        {/* Pestaña 3: Atrasados */}
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'ATRASADOS'}
          onClick={() => handleTabChange('ATRASADOS')}
          style={{
            backgroundColor: activeCategory === 'ATRASADOS' ? '#0A3323' : 'transparent',
            color: activeCategory === 'ATRASADOS' ? '#ffffff' : '#475569',
            fontWeight: activeCategory === 'ATRASADOS' ? 800 : 700,
            borderRadius: '10px',
            height: '38px',
            boxShadow: activeCategory === 'ATRASADOS' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
            border: activeCategory === 'ATRASADOS' ? '1px solid #1B4D37' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'all 0.15s ease',
            padding: '0 8px'
          }}
        >
          <span>Atrasados</span>
          {categoryCounts.atrasados > 0 ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: '9999px',
                backgroundColor: activeCategory === 'ATRASADOS' ? '#e11d48' : '#fff1f2',
                color: activeCategory === 'ATRASADOS' ? '#ffffff' : '#e11d48',
                border: activeCategory === 'ATRASADOS' ? 'none' : '1px solid #fecdd3'
              }}
            >
              {categoryCounts.atrasados}
            </span>
          ) : (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '9999px',
                backgroundColor: activeCategory === 'ATRASADOS' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeCategory === 'ATRASADOS' ? '#ffffff' : '#94a3b8'
              }}
            >
              0
            </span>
          )}
        </button>
      </section>

      {/* 3. Listado de Préstamos Desplegables Agrupados por Cliente */}
      <section className="loans-list-section" aria-label="Lista de préstamos">
        {groupedClients.length > 0 ? (
          groupedClients.map((group) => {
            const groupLoanIds = group.loans.map((l) => l.id);
            const areAllSelected = groupLoanIds.length > 0 && groupLoanIds.every((id) => selectedLoanIds.includes(id));

            return (
              <LoanCard
                key={group.clientKey}
                loan={group.loans[0]}
                clientLoans={group.loans}
                onRenew={(l) => setRenewTargetLoan(l)}
                onAgreement={(l) => setAgreementTargetLoan(l)}
                onDelete={handleOpenDeleteSingle}
                isSelectionMode={isSelectionMode}
                isSelected={areAllSelected}
                selectedLoanIds={selectedLoanIds}
                onToggleSelect={handleToggleSelectLoan}
              />
            );
          })
        ) : (
          <div className="state-empty-box">
            <div className="empty-icon-circle">
              <Landmark size={32} strokeWidth={1.75} className="empty-icon" />
            </div>
            <h4 className="empty-title">
              {searchTerm.trim()
                ? 'Sin resultados para la búsqueda'
                : activeCategory === 'PENDIENTES'
                ? 'No hay préstamos pendientes'
                : activeCategory === 'REGISTRADOS'
                ? 'No hay préstamos registrados'
                : 'No hay préstamos atrasados'}
            </h4>
            <p className="empty-description">
              {searchTerm.trim()
                ? 'Intenta con otro nombre, teléfono, cédula o ubicación.'
                : activeCategory === 'PENDIENTES'
                ? 'No tienes préstamos pendientes de cobro en este momento.'
                : activeCategory === 'REGISTRADOS'
                ? 'Los préstamos finiquitados y pagados al 100 % se mostrarán aquí.'
                : 'Excelente, todos los préstamos se encuentran al día.'}
            </p>
          </div>
        )}
      </section>

      {/* Modal Nuevo Préstamo */}
      <NewLoanModal
        isOpen={isNewModalOpen}
        clients={clients}
        onClose={() => setIsNewModalOpen(false)}
        onSaveLoan={handleRequestSaveLoan}
        onShowAlert={onShowAlert}
      />

      {/* Modal Renovar Préstamo */}
      <RenewLoanModal
        isOpen={!!renewTargetLoan}
        loan={renewTargetLoan}
        onClose={() => setRenewTargetLoan(null)}
        onConfirmRenew={handleRequestRenew}
        onShowAlert={onShowAlert}
      />

      {/* Modal Arreglo de Pago */}
      <PaymentAgreementModal
        isOpen={!!agreementTargetLoan}
        loan={agreementTargetLoan}
        onClose={() => setAgreementTargetLoan(null)}
        onConfirmAgreement={handleRequestAgreement}
        onShowAlert={onShowAlert}
      />

      {/* Modal de Doble Verificación de Eliminación de Préstamos */}
      <ConfirmEliminarPrestamosModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, targetLoan: null, batchLoans: [] })}
        targetLoan={deleteModalState.targetLoan}
        allLoans={loans}
        batchLoans={deleteModalState.batchLoans}
        category={activeCategory}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Doble Verificación: Nuevo Préstamo */}
      <ConfirmModal
        isOpen={!!pendingLoanPayload}
        title="Confirmar Préstamo"
        question={
          pendingLoanPayload
            ? `¿Deseas registrar este préstamo de ${formatColones(pendingLoanPayload.monto_prestado)} en modalidad ${pendingLoanPayload.modalidad === 'SEMANAL' ? 'semanal' : 'quincenal'} con ${pendingLoanPayload.total_periodos} cuotas de ${formatColones(pendingLoanPayload.cuota)}${
                pendingLoanPayload.cuotas_pagadas > 0
                  ? `, iniciando con ${pendingLoanPayload.cuotas_pagadas} de ${pendingLoanPayload.total_periodos} cuotas pagadas previamente`
                  : ''
              } para ${pendingLoanPayload.cliente_nombre}?`
            : ''
        }
        confirmText="Guardar Préstamo"
        cancelText="Revisar"
        confirmVariant="primary"
        iconType="banknote"
        onCancel={() => setPendingLoanPayload(null)}
        onConfirm={handleConfirmSaveLoan}
      />

      {/* Doble Verificación: Renovar Préstamo */}
      <ConfirmModal
        isOpen={!!pendingRenewPayload}
        title="Confirmar Renovación"
        question={
          pendingRenewPayload
            ? `¿Deseas renovar el préstamo de ${pendingRenewPayload.cliente_nombre} por un nuevo monto de ${formatColones(pendingRenewPayload.nuevo_monto_prestado)} con ${pendingRenewPayload.total_periodos} cuotas de ${formatColones(pendingRenewPayload.nueva_cuota)}?`
            : ''
        }
        confirmText="Confirmar Renovación"
        cancelText="Cancelar"
        confirmVariant="primary"
        iconType="renew"
        onCancel={() => setPendingRenewPayload(null)}
        onConfirm={handleConfirmRenew}
      />

      {/* Doble Verificación: Arreglo de Pago */}
      <ConfirmModal
        isOpen={!!pendingAgreementPayload}
        title="Confirmar Arreglo de Pago"
        question={
          pendingAgreementPayload
            ? `¿Deseas fijar un acuerdo de pago por ${formatColones(pendingAgreementPayload.monto_fijo_acordado)} con cuotas de ${formatColones(pendingAgreementPayload.cuota_especial)} para ${pendingAgreementPayload.cliente_nombre}?`
            : ''
        }
        confirmText="Confirmar Arreglo"
        cancelText="Cancelar"
        confirmVariant="primary"
        iconType="agreement"
        onCancel={() => setPendingAgreementPayload(null)}
        onConfirm={handleConfirmAgreement}
      />
    </div>
  );
}

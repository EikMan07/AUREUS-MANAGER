import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Landmark, AlertCircle } from 'lucide-react';
import { LoanCard } from './LoanCard';
import { NewLoanModal } from './NewLoanModal';
import { RenewLoanModal } from './RenewLoanModal';
import { PaymentAgreementModal } from './PaymentAgreementModal';
import { ConfirmModal } from '../Clients/ConfirmModal';
import { formatColones, matchesClientSearch } from '../../utils/formatters';

export function LoansDirectory({
  loans = [],
  clients = [],
  onAddLoan,
  onRenewLoan,
  onAgreementLoan,
  onShowAlert
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Modales principales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [renewTargetLoan, setRenewTargetLoan] = useState(null);
  const [agreementTargetLoan, setAgreementTargetLoan] = useState(null);

  // Estados para modal de doble verificación
  const [pendingLoanPayload, setPendingLoanPayload] = useState(null);
  const [pendingRenewPayload, setPendingRenewPayload] = useState(null);
  const [pendingAgreementPayload, setPendingAgreementPayload] = useState(null);

  // Filtro inteligente por nombre, apellidos, teléfono, cédula, ubicación o detalles del cliente
  const filteredLoans = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return loans;

    return loans.filter((l) =>
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
  }, [loans, searchTerm]);

  // Subtítulo con conteo en tiempo real desde PostgreSQL
  const countSubtitle = useMemo(() => {
    const total = loans.length;
    if (searchTerm.trim()) {
      return `${filteredLoans.length} de ${total} préstamos encontrados`;
    }
    if (total === 1) return '1 préstamo registrado';
    return `${total} préstamos registrados`;
  }, [loans.length, filteredLoans.length, searchTerm]);

  // Manejadores de envío con doble verificación
  const handleRequestSaveLoan = (payload) => {
    setPendingLoanPayload(payload);
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
      {/* 2.2. Encabezado de Sección y Botón "+ Nuevo" */}
      <section className="directory-header-row" aria-label="Cabecera de préstamos">
        <div className="directory-header-info">
          <h2 className="directory-main-heading">Préstamos activos</h2>
          <p className="directory-count-subtitle">{countSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="btn-new-client inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#131629] hover:bg-slate-800 text-white font-semibold text-sm shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
          title="Crear un nuevo préstamo"
          aria-label="Crear un nuevo préstamo"
        >
          <Plus size={16} strokeWidth={2.25} className="w-4 h-4 shrink-0" />
          <span>Nuevo</span>
        </button>
      </section>

      {/* Buscador Instantáneo Multi-Criterio (sin placeholder, solo icono de lupa) */}
      <section className="directory-search-wrapper" aria-label="Búsqueda de préstamos">
        <div className="directory-search-bar">
          <Search size={19} strokeWidth={1.75} className="search-input-icon" />
          <input
            type="text"
            placeholder=""
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

      {/* 3. Listado de Préstamos Desplegables */}
      <section className="loans-list-section" aria-label="Lista de préstamos">
        {filteredLoans.length > 0 ? (
          filteredLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onRenew={(l) => setRenewTargetLoan(l)}
              onAgreement={(l) => setAgreementTargetLoan(l)}
            />
          ))
        ) : (
          <div className="state-empty-box">
            <div className="empty-icon-circle">
              <Landmark size={32} strokeWidth={1.75} className="empty-icon" />
            </div>
            <h4 className="empty-title">
              {searchTerm.trim() ? 'Sin resultados para la búsqueda' : 'Sin préstamos registrados'}
            </h4>
            <p className="empty-description">
              {searchTerm.trim()
                ? 'Intenta con otro nombre, teléfono, cédula o ubicación.'
                : 'Registra un nuevo préstamo para comenzar la gestión del calendario de cobros.'}
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

      {/* Doble Verificación: Nuevo Préstamo */}
      <ConfirmModal
        isOpen={!!pendingLoanPayload}
        title="Confirmar Préstamo"
        question={
          pendingLoanPayload
            ? `¿Deseas registrar este préstamo de ${formatColones(pendingLoanPayload.monto_prestado)} en modalidad ${pendingLoanPayload.modalidad === 'SEMANAL' ? 'semanal' : 'quincenal'} con ${pendingLoanPayload.total_periodos} cuotas de ${formatColones(pendingLoanPayload.cuota)} para ${pendingLoanPayload.cliente_nombre}?`
            : ''
        }
        confirmText="Guardar Préstamo"
        cancelText="Revisar"
        confirmVariant="primary"
        iconType="alert"
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
        iconType="alert"
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
        iconType="alert"
        onCancel={() => setPendingAgreementPayload(null)}
        onConfirm={handleConfirmAgreement}
      />
    </div>
  );
}

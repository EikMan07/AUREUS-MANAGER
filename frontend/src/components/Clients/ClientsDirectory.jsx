import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Users, AlertCircle } from 'lucide-react';
import { ClientCard } from './ClientCard';
import { ClientFormModal } from './ClientFormModal';
import { ClientOptionsModal } from './ClientOptionsModal';
import { ConfirmModal } from './ConfirmModal';
import { matchesClientSearch, formatFullName } from '../../utils/formatters';

export function ClientsDirectory({
  clients = [],
  onAddClient,
  onUpdateClient,
  onBlacklistClient,
  onDeleteClient,
  onShowAlert
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [optionsClient, setOptionsClient] = useState(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Modal de doble verificación para Lista Negra
  const [blacklistTarget, setBlacklistTarget] = useState(null);

  // Modal de doble verificación para Papelera
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Filtro inteligente multi-criterio (nombre, apellidos, cédula, teléfono, ubicación y detalles)
  const filteredClients = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) return clients;
    return clients.filter((cliente) => matchesClientSearch(cliente, searchTerm));
  }, [clients, searchTerm]);

  // Subtítulo dinámico con el conteo en tiempo real
  const countSubtitle = useMemo(() => {
    const total = clients.length;
    if (searchTerm.trim()) {
      return `${filteredClients.length} de ${total} clientes encontrados`;
    }
    if (total === 1) return '1 cliente registrado';
    return `${total} clientes registrados`;
  }, [clients.length, filteredClients.length, searchTerm]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  // Abrir modal de edición desde opciones
  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  // Guardar (crear o editar)
  const handleSaveClient = async (clientData) => {
    if (clientData.id) {
      return await onUpdateClient(clientData);
    } else {
      return await onAddClient(clientData);
    }
  };

  // Abrir opciones de tarjeta
  const handleOpenOptions = (client) => {
    setOptionsClient(client);
    setIsOptionsOpen(true);
  };

  // Iniciar flujo de Lista Negra
  const handleRequestBlacklist = (client) => {
    setBlacklistTarget(client);
  };

  const handleConfirmBlacklist = async () => {
    if (blacklistTarget) {
      await onBlacklistClient(blacklistTarget);
      setBlacklistTarget(null);
    }
  };

  // Iniciar flujo de Eliminación (Papelera)
  const handleRequestDelete = (client) => {
    setDeleteTarget(client);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await onDeleteClient(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="clients-directory-view">
      {/* 2.2. Encabezado de Sección y Botón "Nuevo" */}
      <section className="directory-header-row" aria-label="Cabecera del directorio">
        <div className="directory-header-info">
          <h2 className="directory-main-heading">Clientes registrados</h2>
          <p className="directory-count-subtitle">{countSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn-new-client"
          aria-label="Registrar nuevo cliente"
        >
          <Plus size={18} strokeWidth={2.25} />
          <span>Nuevo</span>
        </button>
      </section>

      {/* 2.3. Buscador Instantáneo Multi-Criterio (sin placeholder, solo icono de lupa) */}
      <section className="directory-search-wrapper" aria-label="Búsqueda de clientes">
        <div className="directory-search-bar">
          <Search size={19} strokeWidth={1.75} className="search-input-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o ubicación"
            className="directory-search-input"
            autoComplete="off"
            aria-label="Buscar clientes"
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

      {/* 2.4. Lista de Tarjetas de Clientes */}
      <section className="directory-cards-list" aria-label="Listado de clientes">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onOptionsClick={handleOpenOptions}
            />
          ))
        ) : (
          <div className="directory-empty-state">
            <div className="empty-state-icon-box">
              <Users size={32} strokeWidth={1.5} />
            </div>
            <h3 className="empty-state-title">
              {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </h3>
            <p className="empty-state-desc">
              {searchTerm
                ? 'Intenta con otro nombre, teléfono, cédula o ubicación.'
                : 'Presiona el botón "Nuevo" arriba para registrar el primer cliente.'}
            </p>
          </div>
        )}
      </section>

      {/* MODAL 1: Formulario de Registro / Edición */}
      <ClientFormModal
        isOpen={isFormOpen}
        client={editingClient}
        existingClients={clients}
        onClose={() => setIsFormOpen(false)}
        onSaveClient={handleSaveClient}
        onShowAlert={onShowAlert}
      />

      {/* MODAL 2: Menú de Opciones del Cliente (...) */}
      <ClientOptionsModal
        isOpen={isOptionsOpen}
        client={optionsClient}
        onClose={() => setIsOptionsOpen(false)}
        onEditClick={handleOpenEdit}
        onBlacklistClick={handleRequestBlacklist}
        onDeleteClick={handleRequestDelete}
      />

      {/* MODAL 3: Doble Verificación — Enviar a Lista Negra */}
      <ConfirmModal
        isOpen={Boolean(blacklistTarget)}
        title="Confirmar Lista Negra"
        question={`¿Estás seguro de que deseas enviar a ${formatFullName(blacklistTarget?.nombre, blacklistTarget?.apellidos)} a la Lista Negra?`}
        cancelText="Cancelar"
        confirmText="Confirmar"
        confirmVariant="danger"
        iconType="shield"
        stageVariant="lista_negra"
        clientName={formatFullName(blacklistTarget?.nombre, blacklistTarget?.apellidos)}
        onCancel={() => setBlacklistTarget(null)}
        onConfirm={handleConfirmBlacklist}
      />

      {/* MODAL 4: Doble Verificación — Eliminar a Papelera de Clientes */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Eliminar Cliente"
        question={`¿Estás seguro de que deseas eliminar a ${formatFullName(deleteTarget?.nombre, deleteTarget?.apellidos)}? Se guardará en la Papelera de Clientes durante 30 días.`}
        cancelText="Cancelar"
        confirmText="Eliminar"
        confirmVariant="danger"
        iconType="trash"
        stageVariant="eliminar_cliente"
        clientName={formatFullName(deleteTarget?.nombre, deleteTarget?.apellidos)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

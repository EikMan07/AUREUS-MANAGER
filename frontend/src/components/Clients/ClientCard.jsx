import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { getInitials, formatFullName, formatCedulaCR, formatPhone } from '../../utils/formatters';

export function ClientCard({ client, onOptionsClick }) {
  const initials = getInitials(client?.nombre, client?.apellidos);
  const fullName = formatFullName(client?.nombre, client?.apellidos);

  const rawCedula = (client?.cedula || '').toString().trim();
  const cedulaFormatted = rawCedula ? (formatCedulaCR(rawCedula) || rawCedula) : 'Sin cédula';
  const telefonoFormatted = formatPhone(client?.telefono || '') || (client?.telefono || '');
  const telefonoSecundarioFormatted = client?.telefono_secundario
    ? (formatPhone(client.telefono_secundario) || client.telefono_secundario)
    : '';
  const cleanUbicacion = (client?.ubicacion || '').trim();
  const cleanDetalles = (client?.detalles || '').trim();

  return (
    <article className="client-directory-card" aria-label={`Cliente ${fullName}`}>
      {/* Izquierda: Avatar Circular con iniciales */}
      <div className="client-avatar-container" aria-hidden="true">
        <span className="client-avatar-text">{initials}</span>
      </div>

      {/* Centro: Información del Cliente */}
      <div className="client-info-container">
        {/* 1. Nombre y Apellidos en negrita */}
        <h3 className="client-full-name">{fullName}</h3>

        {/* 2. Cédula (o "Sin cédula") y Teléfono en gris medio separados por punto medio */}
        <p className="client-meta-line">
          <span className="client-meta-token">{cedulaFormatted}</span>
          <span className="meta-separator" aria-hidden="true">·</span>
          <span className="client-meta-token">{telefonoFormatted}</span>
          {telefonoSecundarioFormatted && (
            <>
              <span className="meta-separator" aria-hidden="true">·</span>
              <span className="client-meta-token">{telefonoSecundarioFormatted}</span>
            </>
          )}
        </p>

        {/* 3. Ubicación escrita manualmente */}
        {cleanUbicacion && (
          <p className="client-location-text">
            {cleanUbicacion}
          </p>
        )}

        {/* 4. Detalles en texto gris suave */}
        {cleanDetalles && (
          <p className="client-details-text">
            {cleanDetalles}
          </p>
        )}
      </div>

      {/* Derecha: Botón de tres puntos para opciones del cliente */}
      <div className="client-actions-right">
        <button
          type="button"
          onClick={() => onOptionsClick(client)}
          className="client-more-options-btn"
          aria-label={`Opciones para ${fullName}`}
          title="Opciones del cliente"
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
        </button>
      </div>
    </article>
  );
}

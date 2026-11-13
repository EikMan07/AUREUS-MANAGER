import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  UserCheck,
  X
} from 'lucide-react';
import { formatCedulaCR, matchesClientSearch, getInitials } from '../../utils/formatters.js';

export function ListaNegraCards({
  personas = [],
  isLoading = false,
  onSacarPersona
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrado inteligente por nombre, apellidos, cédula, teléfono o ubicación
  const filteredPersonas = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return personas;

    return personas.filter((p) => matchesClientSearch(p, term));
  }, [personas, searchTerm]);

  return (
    <div
      style={{
        backgroundColor: 'var(--aureus-bg-surface)',
        border: '1px solid var(--aureus-border-subtle)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: 'var(--aureus-card-shadow)',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Cabecera del Listado con Contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--aureus-text-primary)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Personas en Lista Negra
            </h3>
            <span
              style={{
                backgroundColor: personas.length > 0 ? 'var(--aureus-bg-elevated)' : 'var(--aureus-green-light)',
                color: personas.length > 0 ? 'var(--aureus-text-primary)' : 'var(--aureus-green-text)',
                border: personas.length > 0 ? '1px solid var(--aureus-border-subtle)' : '1px solid var(--aureus-green-border)',
                borderRadius: '9999px',
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: 800,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {personas.length} {personas.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--aureus-text-muted)',
              margin: '3px 0 0 0',
            }}
          >
            Personas con restricción activa para nuevos créditos
          </p>
        </div>
      </div>

      {/* Buscador interno si hay personas */}
      {personas.length > 0 && (
        <div
          className="cf-search-pill"
          style={{
            position: 'relative',
            width: '100%',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid var(--aureus-border-subtle)',
            backgroundColor: 'var(--aureus-bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
            transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
          }}
        >
          <Search
            size={16}
            strokeWidth={2.2}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--aureus-text-muted)',
              pointerEvents: 'none',
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
              padding: '0 32px 0 34px',
              borderRadius: '10px',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--aureus-text-primary)',
              backgroundColor: 'transparent',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                borderRadius: '9999px',
                border: 'none',
                outline: 'none',
                backgroundColor: 'var(--aureus-bg-muted)',
                color: 'var(--aureus-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
              title="Borrar filtro"
            >
              <X size={12} strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}

      {/* Estado de Carga */}
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 0',
            color: 'var(--aureus-text-muted)',
          }}
        >
          <span
            className="loading-spinner"
            style={{
              width: '26px',
              height: '26px',
              border: '2.5px solid #B69A55',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              marginBottom: '10px',
            }}
          />
          <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>Cargando lista...</p>
        </div>
      ) : personas.length === 0 ? (
        /* Estado Vacío: Lista Negra Limpia */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            backgroundColor: 'var(--aureus-bg-elevated)',
            borderRadius: '14px',
            border: '1px dashed var(--aureus-border-subtle)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '9999px',
              backgroundColor: 'var(--aureus-green-light)',
              border: '1.5px solid var(--aureus-green-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--aureus-green-text)',
              marginBottom: '10px',
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--aureus-text-primary)', margin: '0 0 4px 0' }}>
            Lista Negra Limpia
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--aureus-text-muted)', margin: 0, maxWidth: '280px' }}>
            Actualmente no hay ninguna persona registrada con reporte en la Lista Negra.
          </p>
        </div>
      ) : filteredPersonas.length === 0 ? (
        /* Sin resultados de búsqueda */
        <div
          style={{
            padding: '24px 16px',
            backgroundColor: 'var(--aureus-bg-elevated)',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--aureus-text-muted)',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--aureus-text-primary)' }}>
            Sin coincidencias
          </p>
          <p style={{ fontSize: '12px', margin: 0 }}>
            No se encontraron personas que coincidan con "{searchTerm}".
          </p>
        </div>
      ) : (
        /* Tarjetas de Personas en Lista Negra */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredPersonas.map((persona) => {
            const nombreCompleto = `${persona.nombre} ${persona.apellidos || ''}`.trim();
            const iniciales = getInitials(persona.nombre, persona.apellidos);
            const cedulaTexto = persona.cedula ? formatCedulaCR(persona.cedula) : 'Sin cédula';

            return (
              <div
                key={persona.id}
                style={{
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  border: '1px solid var(--aureus-border-subtle)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Avatar + Datos de la persona */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--aureus-bg-muted)',
                      border: '1px solid var(--aureus-border-subtle)',
                      color: 'var(--aureus-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {iniciales || <ShieldAlert size={18} strokeWidth={2.4} />}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: 'var(--aureus-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nombreCompleto}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11.5px',
                        color: 'var(--aureus-text-muted)',
                        fontWeight: 600,
                        marginTop: '2px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Cédula: <strong style={{ color: 'var(--aureus-text-primary)' }}>{cedulaTexto}</strong></span>
                      {persona.fecha_registro && (
                        <span>Ingreso: <strong style={{ color: 'var(--aureus-text-secondary)' }}>{persona.fecha_registro}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Sacar */}
                <button
                  type="button"
                  onClick={() => onSacarPersona(persona)}
                  style={{
                    height: '34px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border-subtle)',
                    outline: 'none',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  title="Retirar a esta persona de la Lista Negra y enviarla a Clientes"
                >
                  <UserCheck size={14} strokeWidth={2.4} style={{ color: 'var(--aureus-green-text)' }} />
                  <span style={{ fontFamily: 'inherit' }}>Sacar</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


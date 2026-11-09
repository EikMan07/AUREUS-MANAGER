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
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Cabecera del Listado con Contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Personas en Lista Negra
            </h3>
            <span
              style={{
                backgroundColor: personas.length > 0 ? '#fee2e2' : '#ecfdf5',
                color: personas.length > 0 ? '#b91c1c' : '#047857',
                border: personas.length > 0 ? '1px solid #fecaca' : '1px solid #a7f3d0',
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {personas.length} {personas.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              margin: '3px 0 0 0',
            }}
          >
            Personas con restricción activa para nuevos créditos
          </p>
        </div>
      </div>

      {/* Buscador interno si hay personas */}
      {personas.length > 0 && (
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            strokeWidth={2.2}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
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
              height: '38px',
              padding: '0 32px 0 34px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              outline: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0f172a',
              backgroundColor: '#f8fafc',
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
                backgroundColor: '#e2e8f0',
                color: '#475569',
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
            color: '#64748b',
          }}
        >
          <span
            className="loading-spinner"
            style={{
              width: '26px',
              height: '26px',
              border: '2.5px solid #dc2626',
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
            backgroundColor: '#f8fafc',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              marginBottom: '10px',
            }}
          >
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Lista Negra Limpia
          </h4>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, maxWidth: '280px' }}>
            Actualmente no hay ninguna persona registrada con reporte en la Lista Negra.
          </p>
        </div>
      ) : filteredPersonas.length === 0 ? (
        /* Sin resultados de búsqueda */
        <div
          style={{
            padding: '24px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
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
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
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
                      backgroundColor: '#fee2e2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
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
                        color: '#0f172a',
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
                        color: '#64748b',
                        fontWeight: 600,
                        marginTop: '2px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Cédula: <strong style={{ color: '#0f172a' }}>{cedulaTexto}</strong></span>
                      {persona.fecha_registro && (
                        <span>Ingreso: <strong style={{ color: '#475569' }}>{persona.fecha_registro}</strong></span>
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
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  title="Retirar a esta persona de la Lista Negra y enviarla a Clientes"
                >
                  <UserCheck size={14} strokeWidth={2.4} style={{ color: '#059669' }} />
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


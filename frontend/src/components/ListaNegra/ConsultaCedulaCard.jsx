import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  UserCheck,
  X,
  Loader2
} from 'lucide-react';
import { cleanCedulaDigits, formatCedulaCR, formatPhone } from '../../utils/formatters.js';
import { dbService } from '../../services/db.js';

export function ConsultaCedulaCard({
  onSacarPersona,
  onOpenNuevoRegistro,
  onShowAlert
}) {
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resultado, setResultado] = useState(null);

  const debounceTimerRef = useRef(null);

  // Función principal de verificación en tiempo real (backend multi-campo + Hacienda fallback)
  const ejecutarVerificacion = useCallback(async (termino) => {
    const cleanTerm = (termino || '').trim();
    if (!cleanTerm || cleanTerm.length < 2) {
      setResultado(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await dbService.verificarPersona(cleanTerm);

      if (res && (res.encontrado || res.enListaNegra || res.tieneMorosidad || res.registro)) {
        setResultado({
          enListaNegra: Boolean(res.enListaNegra),
          tieneMorosidad: Boolean(res.tieneMorosidad),
          registro: res.registro || {},
          origen: res.origen || 'db'
        });
      } else {
        // No encontrado ni en BD ni en padrón
        const digits = cleanTerm.replace(/\D/g, '');
        setResultado({
          enListaNegra: false,
          tieneMorosidad: false,
          registro: {
            cedula: digits.length === 9 ? digits : '',
            nombre: '',
            apellidos: '',
            periodos_atrasados_acumulados: 0,
            monto_atrasado: 0
          },
          origen: 'not_found'
        });
      }
    } catch (err) {
      console.warn('Error en verificación de persona:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Manejador de entrada con debounce de 300ms
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 2) {
      setResultado(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      ejecutarVerificacion(trimmed);
    }, 300);
  };

  // Limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setResultado(null);
    setIsSearching(false);
  };

  const registro = resultado?.registro || {};
  const nombreDisplay = `${registro.nombre || ''} ${registro.apellidos || ''}`.trim();
  const cedulaDisplay = registro.cedula ? formatCedulaCR(registro.cedula) : '';

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
      {/* Cabecera de la Tarjeta */}
      <div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--aureus-text-primary)',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Consultar Persona
        </h3>
      </div>

      {/* Barra de Búsqueda a 100% de ancho sin botón Foto */}
      <div
        className="cf-search-pill"
        style={{
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          height: '44px',
          borderRadius: '12px',
          border: '1px solid var(--aureus-border-subtle)',
          backgroundColor: 'var(--aureus-bg-elevated)',
          transition: 'border-color 0.16s ease, box-shadow 0.16s ease'
        }}
      >
        {/* Icono dinámico a la izquierda: Search o Loader2 giratorio */}
        <div
          style={{
            position: 'absolute',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            color: isSearching ? '#B69A55' : 'var(--aureus-text-muted)',
          }}
        >
          {isSearching ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} strokeWidth={2.2} />
          )}
        </div>

        <input
          type="text"
          value={searchInput}
          onChange={handleInputChange}
          placeholder="Buscar por nombre, cédula, teléfono o ubicación"
          style={{
            width: '100%',
            height: '100%',
            padding: '0 36px 0 38px',
            borderRadius: '12px',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--aureus-text-primary)',
            backgroundColor: 'transparent',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />

        {/* Botón X para borrar */}
        {searchInput && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '10px',
              width: '24px',
              height: '24px',
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
            title="Borrar texto"
          >
            <X size={13} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* ESTADO 1: EN LISTA NEGRA (Banner Gris Pizarra Ejecutivo de Alto Contraste) */}
      {resultado && resultado.enListaNegra && (
        <div
          style={{
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '2px solid var(--aureus-border-gold)',
            borderRadius: '16px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 10px -1px rgba(0, 0, 0, 0.14)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#1E293B',
                border: '1.5px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={26} strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  color: 'var(--aureus-text-primary)',
                  lineHeight: 1.25,
                }}
              >
                Persona Registrada en Lista Negra
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aureus-text-secondary)',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                Cuenta con reporte activo y restricción total para nuevos préstamos.
              </div>
            </div>
          </div>

          {/* Tarjeta interna de datos */}
          <div
            style={{
              backgroundColor: 'var(--aureus-bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--aureus-border-subtle)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--aureus-text-primary)' }}>
              {nombreDisplay || 'Persona en Lista Negra'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {cedulaDisplay && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-muted)' }}>
                  Cédula: <strong style={{ color: 'var(--aureus-text-primary)' }}>{cedulaDisplay}</strong>
                </span>
              )}
              {registro.fecha_registro && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-muted)' }}>
                  Ingreso: <strong style={{ color: 'var(--aureus-text-primary)' }}>{String(registro.fecha_registro).slice(0, 10)}</strong>
                </span>
              )}
            </div>
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: 'var(--aureus-text-muted)', fontWeight: 600 }}>
                Teléfono: {formatPhone(registro.telefono)}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--aureus-border-subtle)',
                outline: 'none',
                backgroundColor: 'var(--aureus-bg-surface)',
                color: 'var(--aureus-text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => onSacarPersona(registro)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--aureus-border-subtle)',
                outline: 'none',
                backgroundColor: 'var(--aureus-bg-surface)',
                color: 'var(--aureus-text-primary)',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                fontFamily: 'inherit',
              }}
            >
              <UserCheck size={15} strokeWidth={2.4} style={{ color: 'var(--aureus-green-text)' }} />
              <span>Sacar de Lista Negra</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 2: MOROSIDAD ACTIVA EN EL SISTEMA (Alerta de Morosidad) */}
      {resultado && !resultado.enListaNegra && resultado.tieneMorosidad && (
        <div
          style={{
            backgroundColor: 'var(--aureus-red-light)',
            border: '1.5px solid var(--aureus-red-border)',
            borderRadius: '16px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.12)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--aureus-red-light)',
                border: '1.5px solid var(--aureus-red-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--aureus-red-text)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={26} strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  color: 'var(--aureus-red-text)',
                  lineHeight: 1.25,
                }}
              >
                Alerta de Morosidad Activa
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aureus-red-text)',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                Este cliente registra atrasos activos en sus cobros.
              </div>
            </div>
          </div>

          {/* Tarjeta interna con detalle del cliente y franja destacada de atrasos */}
          <div
            style={{
              backgroundColor: 'var(--aureus-bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--aureus-red-border)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--aureus-text-primary)' }}>
              {nombreDisplay || 'Cliente con Atrasos'}
            </div>
            {cedulaDisplay && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-muted)' }}>
                Cédula: <strong style={{ color: 'var(--aureus-text-primary)' }}>{cedulaDisplay}</strong>
              </div>
            )}
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: 'var(--aureus-text-muted)', fontWeight: 600 }}>
                Teléfono: {formatPhone(registro.telefono)}
              </div>
            )}

            {/* Franja roja destacada con semanas sin pagar y monto atrasado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--aureus-red-light)',
                border: '1px solid var(--aureus-red-border)',
                borderRadius: '8px',
                padding: '8px 10px',
                marginTop: '4px',
              }}
            >
              <AlertTriangle size={16} strokeWidth={2.4} style={{ color: 'var(--aureus-red-text)', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-red-text)', lineHeight: 1.3 }}>
                {registro.periodos_atrasados_acumulados}{' '}
                {registro.modalidad === 'QUINCENAL'
                  ? (Number(registro.periodos_atrasados_acumulados) === 1 ? 'quincena sin pagar' : 'quincenas sin pagar')
                  : (Number(registro.periodos_atrasados_acumulados) === 1 ? 'semana sin pagar' : 'semanas sin pagar')}
                {' · '}
                Monto atrasado: ₡{Number(registro.monto_atrasado || 0).toLocaleString('es-CR')}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--aureus-border-subtle)',
                outline: 'none',
                backgroundColor: 'var(--aureus-bg-surface)',
                color: 'var(--aureus-text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenNuevoRegistro({
                  cliente_id: registro.cliente_id || null,
                  cedula: registro.cedula || '',
                  nombre: registro.nombre || '',
                  apellidos: registro.apellidos || ''
                })
              }
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                outline: 'none',
                backgroundColor: '#1E293B',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
            >
              <UserX size={15} strokeWidth={2.4} />
              <span>Registrar en Lista Negra</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 3: SIN ALERTAS EN LISTA NEGRA NI MOROSIDAD (Banner Verde Esmeralda) */}
      {resultado && !resultado.enListaNegra && !resultado.tieneMorosidad && (
        <div
          style={{
            backgroundColor: 'var(--aureus-green-light)',
            border: '1.5px solid var(--aureus-green-border)',
            borderRadius: '16px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.08)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--aureus-green-light)',
                border: '1.5px solid var(--aureus-green-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--aureus-green-text)',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={26} strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  color: 'var(--aureus-green-text)',
                  lineHeight: 1.25,
                }}
              >
                Sin Alertas en Lista Negra
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--aureus-green-text)',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                No cuenta con impedimentos ni reportes de morosidad registrados.
              </div>
            </div>
          </div>

          {/* Datos del resultado */}
          <div
            style={{
              backgroundColor: 'var(--aureus-bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--aureus-green-border)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {nombreDisplay ? (
              <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--aureus-text-primary)' }}>
                {nombreDisplay}
              </div>
            ) : (
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--aureus-text-secondary)' }}>
                Persona no registrada previamente
              </div>
            )}
            {cedulaDisplay && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-muted)' }}>
                Cédula: <strong style={{ color: 'var(--aureus-text-primary)' }}>{cedulaDisplay}</strong>
              </div>
            )}
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: 'var(--aureus-text-muted)', fontWeight: 600 }}>
                Teléfono: {formatPhone(registro.telefono)}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--aureus-border-subtle)',
                outline: 'none',
                backgroundColor: 'var(--aureus-bg-surface)',
                color: 'var(--aureus-text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenNuevoRegistro({
                  cliente_id: registro.cliente_id || null,
                  cedula: registro.cedula || '',
                  nombre: registro.nombre || '',
                  apellidos: registro.apellidos || ''
                })
              }
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid #334155',
                outline: 'none',
                backgroundColor: '#1E293B',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                fontFamily: 'inherit',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
            >
              <UserX size={15} strokeWidth={2.4} />
              <span>Registrar en Lista Negra</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

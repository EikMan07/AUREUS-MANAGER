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
import { cleanCedulaDigits, formatCedulaCR } from '../../utils/formatters.js';
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
      {/* Cabecera de la Tarjeta */}
      <div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Consultar Persona
        </h3>
      </div>

      {/* Barra de Búsqueda a 100% de ancho sin botón Foto */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
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
            color: isSearching ? '#0284c7' : '#94a3b8',
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
            height: '44px',
            padding: '0 36px 0 38px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0f172a',
            backgroundColor: '#f8fafc',
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
              backgroundColor: '#e2e8f0',
              color: '#475569',
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

      {/* ESTADO 1: EN LISTA NEGRA (Banner Rojo Grande de Alerta) */}
      {resultado && resultado.enListaNegra && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #f87171',
            borderRadius: '16px',
            padding: '16px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#fee2e2',
                border: '1.5px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
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
                  color: '#991b1b',
                  lineHeight: 1.25,
                }}
              >
                Persona Registrada en Lista Negra
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#b91c1c',
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
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
              {nombreDisplay || 'Persona en Lista Negra'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {cedulaDisplay && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  Cédula: <strong style={{ color: '#0f172a' }}>{cedulaDisplay}</strong>
                </span>
              )}
              {registro.fecha_registro && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                  Ingreso: <strong style={{ color: '#0f172a' }}>{String(registro.fecha_registro).slice(0, 10)}</strong>
                </span>
              )}
            </div>
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                Teléfono: {registro.telefono}
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
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#475569',
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
                border: '1px solid #fca5a5',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#b91c1c',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                fontFamily: 'inherit',
              }}
            >
              <UserCheck size={15} strokeWidth={2.4} />
              <span>Sacar de Lista Negra</span>
            </button>
          </div>
        </div>
      )}

      {/* ESTADO 2: MOROSIDAD ACTIVA EN EL SISTEMA (Alerta de Morosidad) */}
      {resultado && !resultado.enListaNegra && resultado.tieneMorosidad && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1.5px solid #f87171',
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
                backgroundColor: '#fee2e2',
                border: '1.5px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
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
                  color: '#991b1b',
                  lineHeight: 1.25,
                }}
              >
                Alerta de Morosidad en el Sistema
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#b91c1c',
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
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
              {nombreDisplay || 'Cliente con Atrasos'}
            </div>
            {cedulaDisplay && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                Cédula: <strong style={{ color: '#0f172a' }}>{cedulaDisplay}</strong>
              </div>
            )}
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                Teléfono: {registro.telefono}
              </div>
            )}

            {/* Franja roja destacada con semanas sin pagar y monto atrasado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '8px 10px',
                marginTop: '4px',
              }}
            >
              <AlertTriangle size={16} strokeWidth={2.4} style={{ color: '#b91c1c', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b', lineHeight: 1.3 }}>
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
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#475569',
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
                border: 'none',
                outline: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)',
                fontFamily: 'inherit',
              }}
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
            backgroundColor: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
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
                backgroundColor: '#d1fae5',
                border: '1.5px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
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
                  color: '#065f46',
                  lineHeight: 1.25,
                }}
              >
                Sin Alertas en Lista Negra
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#047857',
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
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #a7f3d0',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {nombreDisplay ? (
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {nombreDisplay}
              </div>
            ) : (
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                Persona no registrada previamente
              </div>
            )}
            {cedulaDisplay && (
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                Cédula: <strong style={{ color: '#0f172a' }}>{cedulaDisplay}</strong>
              </div>
            )}
            {registro.telefono && (
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                Teléfono: {registro.telefono}
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
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#475569',
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
                border: 'none',
                outline: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.25)',
                fontFamily: 'inherit',
              }}
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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { formatColones } from '../../utils/formatters';

const TABS = [
  { id: 'DIA', label: 'Día' },
  { id: 'SEMANA', label: 'Semana' },
  { id: 'MES', label: 'Mes' },
  { id: 'ANIO', label: 'Año' },
  { id: 'INICIO', label: 'Desde el inicio' }
];

export function TendenciaCobrosChart({ data, tipo, cantidad, onChangeFilter, isLoading = false }) {
  const [activeTooltip, setActiveTooltip] = useState(null);
  const containerRef = useRef(null);

  // Estado local para respuesta inmediata a 60fps en toques y pulsación prolongada
  const [cantidadFiltro, setCantidadFiltro] = useState(() => Number(cantidad) || 1);

  // Referencias para control de temporizadores
  const holdTimeoutRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastRequestedRef = useRef({ tipo, cantidad: Number(cantidad) || 1 });

  // Sincronizar estado local si el prop cantidad cambia externamente (ej. botón de recarga)
  useEffect(() => {
    if (typeof cantidad === 'number' && cantidad !== cantidadFiltro) {
      setCantidadFiltro(cantidad);
      lastRequestedRef.current = { tipo, cantidad };
    }
  }, [cantidad, tipo]);

  // Límites mínimos y máximos según la pestaña activa
  const getMaxPermitido = useCallback((tipoFiltro) => {
    if (tipoFiltro === 'DIA') return 7;
    if (tipoFiltro === 'SEMANA') return 4;
    if (tipoFiltro === 'MES') return 12;
    return null; // ANIO sin límite máximo
  }, []);

  const maxPermitido = getMaxPermitido(tipo);

  // Detener repetición continua
  const stopHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  // Incremento / Decremento seguro de 1 en 1
  const stepValue = useCallback((direction) => {
    setCantidadFiltro((prev) => {
      const max = getMaxPermitido(tipo);
      let next = prev;
      if (direction === -1) {
        next = Math.max(1, prev - 1);
        if (next <= 1) {
          stopHold();
        }
      } else if (direction === 1) {
        next = max !== null ? Math.min(max, prev + 1) : prev + 1;
        if (max !== null && next >= max) {
          stopHold();
        }
      }
      return next;
    });
  }, [tipo, getMaxPermitido, stopHold]);

  // Iniciar pulsación corta o mantener presionado (Press & Hold)
  const startHold = useCallback((direction) => {
    stopHold();

    // 1. Paso inmediato en el instante de contacto
    stepValue(direction);

    // 2. Esperar 300ms de presión continua antes de acelerar
    holdTimeoutRef.current = setTimeout(() => {
      // 3. Repetición veloz cada 85ms
      holdIntervalRef.current = setInterval(() => {
        stepValue(direction);
      }, 85);
    }, 300);
  }, [stepValue, stopHold]);

  // Debounce suave de 150ms hacia el backend mientras el usuario mantiene presionado
  useEffect(() => {
    if (tipo === 'INICIO') return;

    if (
      lastRequestedRef.current.tipo === tipo &&
      lastRequestedRef.current.cantidad === cantidadFiltro
    ) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lastRequestedRef.current = { tipo, cantidad: cantidadFiltro };
      onChangeFilter(tipo, cantidadFiltro);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cantidadFiltro, tipo, onChangeFilter]);

  // Limpieza total al desmontar el componente o salir
  useEffect(() => {
    return () => {
      stopHold();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [stopHold]);

  // Formato del texto central en español
  const getTextoPeriodo = (tipoFiltro, cant) => {
    if (tipoFiltro === 'DIA') {
      return cant === 1 ? 'Hace 1 día' : `Hace ${cant} días`;
    }
    if (tipoFiltro === 'SEMANA') {
      return cant === 1 ? 'Hace 1 semana' : `Hace ${cant} semanas`;
    }
    if (tipoFiltro === 'MES') {
      return cant === 1 ? 'Hace 1 mes' : `Hace ${cant} meses`;
    }
    if (tipoFiltro === 'ANIO') {
      return cant === 1 ? 'Hace 1 año' : `Hace ${cant} años`;
    }
    return '';
  };

  const textoPeriodoActual = getTextoPeriodo(tipo, cantidadFiltro);

  // Cambio de pestaña: detiene timers y reinicia siempre a 1
  const handleTabClick = (nuevoTipo) => {
    stopHold();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setCantidadFiltro(1);
    lastRequestedRef.current = { tipo: nuevoTipo, cantidad: 1 };
    onChangeFilter(nuevoTipo, 1);
  };

  const isMinusDisabled = cantidadFiltro <= 1;
  const isPlusDisabled = maxPermitido !== null && cantidadFiltro >= maxPermitido;

  // Cerrar tooltip si se toca fuera
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setActiveTooltip(null);
      }
    };
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const puntos = data?.puntos || [];
  const puntoMasAlto = data?.puntoMasAlto || { etiqueta: '', fechaCompleta: '', monto: 0 };
  const puntoMasBajo = data?.puntoMasBajo || { etiqueta: '', fechaCompleta: '', monto: 0 };
  const promedioYVariacion = data?.promedioYVariacion || { promedio: 0, variacionPct: 0 };

  // Dimensiones del SVG
  const svgWidth = 520;
  const svgHeight = 210;
  const padLeft = 36;
  const padRight = 36;
  const padTop = 32;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Cálculo de coordenadas de los puntos
  const { coords, pathD, areaD } = useMemo(() => {
    if (!puntos.length) {
      return { coords: [], pathD: '', areaD: '', maxMonto: 0 };
    }

    const maxVal = Math.max(...puntos.map((p) => p.monto || 0), 1);
    const n = puntos.length;

    const computed = puntos.map((p, idx) => {
      const x = n === 1 ? padLeft + plotWidth / 2 : padLeft + (idx / (n - 1)) * plotWidth;
      const normalizedY = (p.monto || 0) / maxVal;
      const y = padTop + plotHeight - normalizedY * plotHeight;
      return { ...p, x, y, idx };
    });

    if (computed.length === 1) {
      const pt = computed[0];
      const pD = `M ${pt.x - 20} ${pt.y} L ${pt.x + 20} ${pt.y}`;
      const aD = `M ${pt.x - 20} ${pt.y} L ${pt.x + 20} ${pt.y} L ${pt.x + 20} ${padTop + plotHeight} L ${pt.x - 20} ${padTop + plotHeight} Z`;
      return { coords: computed, pathD: pD, areaD: aD, maxMonto: maxVal };
    }

    let pD = `M ${computed[0].x} ${computed[0].y}`;
    for (let i = 0; i < computed.length - 1; i++) {
      const p0 = computed[i];
      const p1 = computed[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const last = computed[computed.length - 1];
    const first = computed[0];
    const aD = `${pD} L ${last.x} ${padTop + plotHeight} L ${first.x} ${padTop + plotHeight} Z`;

    return { coords: computed, pathD: pD, areaD: aD, maxMonto: maxVal };
  }, [puntos, plotWidth, plotHeight, padLeft, padTop]);

  const esVariacionPositiva = (promedioYVariacion.variacionPct || 0) >= 0;

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
      }}
    >
      {/* 1. Cabecera del Gráfico */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
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
            Tendencia de Cobros
          </h3>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#64748b',
              margin: '3px 0 0 0',
            }}
          >
            Historial de subidas y caídas de recaudación
          </p>
        </div>

        {/* Pestañas de Unidad de Tiempo (Cápsula unificada) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            padding: '3px',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            gap: '2px',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {TABS.map((tab) => {
            const isActive = tipo === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '9999px',
                  outline: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive ? '#0A3323' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  border: isActive ? '1px solid #1B4D37' : '1px solid transparent',
                  boxShadow: isActive ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Control Interactivo Unificado [ - ]  Hace X ...  [ + ] con Press & Hold */}
      {tipo !== 'INICIO' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '5px',
            width: '100%',
            maxWidth: '260px',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {/* Botón Menos (-) */}
          <button
            type="button"
            disabled={isMinusDisabled}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!isMinusDisabled) {
                startHold(-1);
              }
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Disminuir período"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              outline: 'none',
              backgroundColor: isMinusDisabled ? '#f1f5f9' : '#ffffff',
              color: isMinusDisabled ? '#cbd5e1' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              cursor: isMinusDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isMinusDisabled ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.06)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              padding: 0,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            −
          </button>

          {/* Texto Central Dinámico */}
          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              padding: '0 12px',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            {textoPeriodoActual}
          </span>

          {/* Botón Más (+) */}
          <button
            type="button"
            disabled={isPlusDisabled}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!isPlusDisabled) {
                startHold(1);
              }
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Aumentar período"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              outline: 'none',
              backgroundColor: isPlusDisabled ? '#f1f5f9' : '#ffffff',
              color: isPlusDisabled ? '#cbd5e1' : '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              cursor: isPlusDisabled ? 'not-allowed' : 'pointer',
              boxShadow: isPlusDisabled ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.06)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              padding: 0,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            +
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: '#ecfdf5',
              color: '#047857',
              fontSize: '12px',
              fontWeight: 800,
              border: '1px solid #a7f3d0',
            }}
          >
            Todo el historial registrado
          </span>
        </div>
      )}

      {/* 3. Gráfico SVG Interactivo de Línea y Área */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          padding: '8px',
          border: '1px solid #f1f5f9',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
            }}
          >
            <span
              className="loading-spinner"
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid #059669',
                borderTopColor: 'transparent',
                borderRadius: '50%',
              }}
            />
          </div>
        )}

        {/* Tooltip interactivo flotante */}
        {activeTooltip && (
          <div
            style={{
              position: 'absolute',
              zIndex: 30,
              pointerEvents: 'none',
              transform: 'translate(-50%, -100%)',
              marginTop: '-8px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '6px 10px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
              border: '1px solid #1e293b',
              left: `${(activeTooltip.x / svgWidth) * 100}%`,
              top: `${(activeTooltip.y / svgHeight) * 100}%`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {activeTooltip.fechaCompleta || activeTooltip.etiqueta}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap', marginTop: '1px' }}>
              {formatColones(activeTooltip.monto || 0)}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '190px', display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Degradado esmeralda para el área sombreada */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas guía horizontales de referencia */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={svgWidth - padRight}
            y2={padTop}
            stroke="#E2E8F0"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={padTop + plotHeight / 2}
            x2={svgWidth - padRight}
            y2={padTop + plotHeight / 2}
            stroke="#E2E8F0"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={padTop + plotHeight}
            x2={svgWidth - padRight}
            y2={padTop + plotHeight}
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />

          {/* Área sombreada bajo la curva */}
          {areaD && <path d={areaD} fill="url(#areaGradient)" />}

          {/* Línea continua de la tendencia */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#059669"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Nodos interactivos en cada punto */}
          {coords.map((pt) => {
            const esPuntoAlto = puntoMasAlto.monto > 0 && pt.monto === puntoMasAlto.monto;
            const esPuntoBajo = puntoMasBajo.monto >= 0 && pt.monto === puntoMasBajo.monto && !esPuntoAlto;
            const isHovered = activeTooltip?.idx === pt.idx;

            return (
              <g
                key={pt.idx}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setActiveTooltip(pt)}
                onTouchStart={() => setActiveTooltip(pt)}
                onClick={() => setActiveTooltip(pt)}
              >
                {/* Zona ampliada para toque táctil */}
                <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />

                {/* Resaltado del punto más alto (esmeralda con anillo) */}
                {esPuntoAlto ? (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 8 : 6.5}
                      fill="#059669"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 12 : 9.5}
                      fill="none"
                      stroke="#059669"
                      strokeOpacity="0.4"
                      strokeWidth="2"
                    />
                  </>
                ) : esPuntoBajo ? (
                  /* Resaltado del punto más bajo (ámbar con anillo) */
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : 5.5}
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 10 : 8}
                      fill="none"
                      stroke="#D97706"
                      strokeOpacity="0.3"
                      strokeWidth="1.5"
                    />
                  </>
                ) : (
                  /* Punto regular */
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? '#059669' : '#0F172A'}
                    stroke="#FFFFFF"
                    strokeWidth="1.75"
                  />
                )}

                {/* Etiqueta del eje X */}
                <text
                  x={pt.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isHovered ? '#0F172A' : '#64748B'}
                >
                  {pt.etiqueta}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4. Tres Indicadores Analíticos Automáticos */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Recuadro 1: PUNTO MÁS ALTO */}
        <div
          style={{
            backgroundColor: '#D6E7D6',
            border: '1px solid #8FB89A',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#0A3323',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>PUNTO MÁS ALTO</span>
            <ArrowUpRight size={14} strokeWidth={2.4} style={{ color: '#1B4D37' }} />
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 900,
              color: '#1B4D37',
              lineHeight: 1.2,
            }}
          >
            {formatColones(puntoMasAlto.monto || 0)}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: '#2E6B4F',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {puntoMasAlto.etiqueta || puntoMasAlto.fechaCompleta || 'Sin datos'}
          </div>
        </div>

        {/* Recuadro 2: PUNTO MÁS BAJO */}
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#92400e',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>PUNTO MÁS BAJO</span>
            <ArrowDownRight size={14} strokeWidth={2.4} style={{ color: '#d97706' }} />
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 900,
              color: '#b45309',
              lineHeight: 1.2,
            }}
          >
            {formatColones(puntoMasBajo.monto || 0)}
          </div>
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              color: '#92400e',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {puntoMasBajo.etiqueta || puntoMasBajo.fechaCompleta || 'Sin datos'}
          </div>
        </div>

        {/* Recuadro 3: PROMEDIO Y VARIACIÓN */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#475569',
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <span>PROMEDIO</span>
            <Activity size={14} strokeWidth={2.2} style={{ color: '#64748b' }} />
          </div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(promedioYVariacion.promedio || 0)}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10.5px',
              fontWeight: 700,
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: esVariacionPositiva ? '#059669' : '#dc2626' }}>
              {esVariacionPositiva ? `+${promedioYVariacion.variacionPct}%` : `${promedioYVariacion.variacionPct}%`}
            </span>
            <span>variación</span>
          </div>
        </div>
      </div>
    </div>
  );
}

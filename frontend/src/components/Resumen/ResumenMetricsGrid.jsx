import React from 'react';
import {
  Wallet,
  Calendar,
  Landmark,
  TrendingUp,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import { formatColones } from '../../utils/formatters';

export function ResumenMetricsGrid({ metricas }) {
  if (!metricas) return null;

  const {
    cobradoHoy = {},
    cobradoEsteMes = {},
    totalPrestado = {},
    gananciaProyectada = {},
    moratoriasYAtrasos = {},
    efectividadPorModalidad = {},
    capitalEnArreglos = {}
  } = metricas;

  const variacionMes = cobradoEsteMes.variacionMesPct ?? 0;
  const esVariacionPositiva = variacionMes >= 0;

  const cardBaseStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--stats-grid-cols, repeat(2, minmax(0, 1fr)))',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Tarjeta Principal Destacada: CON LOS QUE SE COBRARON HOY (Ancho completo) */}
      <div
        style={{
          ...cardBaseStyle,
          gridColumn: '1 / -1',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              CON LOS QUE SE COBRARON HOY
            </span>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: '#059669',
                marginTop: '4px',
                lineHeight: 1.15,
              }}
            >
              {formatColones(cobradoHoy.monto || 0)}
            </div>
          </div>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <Wallet size={20} strokeWidth={2.2} />
          </div>
        </div>

        {/* Indicador de efectividad y progreso de hoy */}
        <div
          style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '8px',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              {cobradoHoy.clientesCobradosHoy || 0} de {cobradoHoy.clientesProgramadosHoy || 0} clientes cobrados
            </span>
            <span
              style={{
                color: '#047857',
                backgroundColor: '#ecfdf5',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
                fontSize: '11.5px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {cobradoHoy.efectividadHoyPct || 0}% de efectividad hoy
            </span>
          </div>
          <div
            style={{
              width: '100%',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              height: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                backgroundColor: '#10b981',
                height: '100%',
                borderRadius: '9999px',
                transition: 'width 0.5s ease',
                width: `${Math.min(100, Math.max(0, cobradoHoy.efectividadHoyPct || 0))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Tarjeta 2: COBRADO ESTE MES */}
      <div style={cardBaseStyle}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              COBRADO ESTE MES
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              <Calendar size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(cobradoEsteMes.monto || 0)}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '6px',
              backgroundColor: esVariacionPositiva ? '#ecfdf5' : '#fef2f2',
              color: esVariacionPositiva ? '#047857' : '#b91c1c',
              border: esVariacionPositiva ? '1px solid #a7f3d0' : '1px solid #fecaca',
            }}
          >
            {esVariacionPositiva ? `+${variacionMes}%` : `${variacionMes}%`}
          </span>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
            Respecto al mes anterior
          </span>
        </div>
      </div>

      {/* 3. Tarjeta 3: TOTAL PRESTADO */}
      <div style={cardBaseStyle}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              TOTAL PRESTADO
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4f46e5',
                flexShrink: 0,
              }}
            >
              <Landmark size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(totalPrestado.monto || 0)}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
            {totalPrestado.prestamosVigentesCount === 1
              ? '1 préstamo activo'
              : `${totalPrestado.prestamosVigentesCount || 0} préstamos activos`}
          </span>
        </div>
      </div>

      {/* 4. Tarjeta 4: GANANCIA PROYECTADA */}
      <div style={cardBaseStyle}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              GANANCIA PROYECTADA
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <TrendingUp size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(gananciaProyectada.monto || 0)}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
            Saldo por cobrar{' '}
            <strong style={{ color: '#0f172a', fontWeight: 800 }}>
              {formatColones(gananciaProyectada.saldoPorCobrar || 0)}
            </strong>
          </span>
        </div>
      </div>

      {/* 5. Tarjeta 5: TOTAL EN MORATORIAS */}
      <div style={cardBaseStyle}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              TOTAL EN MORATORIAS
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(moratoriasYAtrasos.totalMoratoriasCobradas || 0)}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309' }}>
            {moratoriasYAtrasos.prestamosConAtrasoCount === 1
              ? '1 préstamo con atraso'
              : `${moratoriasYAtrasos.prestamosConAtrasoCount || 0} préstamos con atraso`}
          </span>
        </div>
      </div>

      {/* 6. Tarjeta 6: CAPITAL EN ARREGLOS */}
      <div style={cardBaseStyle}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#64748b',
                textTransform: 'uppercase',
              }}
            >
              CAPITAL EN ARREGLOS
            </span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
                flexShrink: 0,
              }}
            >
              <CalendarCheck size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.2,
            }}
          >
            {formatColones(capitalEnArreglos.monto || 0)}
          </div>
        </div>
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6d28d9' }}>
            {capitalEnArreglos.arreglosActivosCount === 1
              ? '1 acuerdo activo'
              : `${capitalEnArreglos.arreglosActivosCount || 0} acuerdos activos`}
          </span>
        </div>
      </div>

      {/* 7. Tarjeta 7: EFECTIVIDAD DE COBRO SEMANAL Y QUINCENAL (Ancho completo) */}
      <div
        style={{
          ...cardBaseStyle,
          gridColumn: 'span 2',
          padding: '16px',
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            EFECTIVIDAD DE COBRO SEMANAL Y QUINCENAL
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Modalidad Semanal */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              <span>Modalidad Semanal</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>
                {efectividadPorModalidad.semanalPct ?? 0}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                backgroundColor: '#f1f5f9',
                borderRadius: '9999px',
                height: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.5s ease',
                  width: `${Math.min(100, Math.max(0, efectividadPorModalidad.semanalPct ?? 0))}%`,
                  backgroundColor: '#0A3323',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              {efectividadPorModalidad.semanalCobrados || 0} de {efectividadPorModalidad.semanalTotal || 0} cuotas cobradas
            </div>
          </div>

          {/* Modalidad Quincenal */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              <span>Modalidad Quincenal</span>
              <span style={{ color: '#059669', fontWeight: 800 }}>
                {efectividadPorModalidad.quincenalPct ?? 0}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                backgroundColor: '#f1f5f9',
                borderRadius: '9999px',
                height: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.5s ease',
                  width: `${Math.min(100, Math.max(0, efectividadPorModalidad.quincenalPct ?? 0))}%`,
                  backgroundColor: '#059669',
                }}
              />
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              {efectividadPorModalidad.quincenalCobrados || 0} de {efectividadPorModalidad.quincenalTotal || 0} cuotas cobradas
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

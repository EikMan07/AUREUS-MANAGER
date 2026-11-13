import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export function EstadoClientesDonut({ distribucion }) {
  const { isDark } = useTheme();
  const total = distribucion?.totalClientesActivos || 0;
  const alDia = distribucion?.clientesAlDia || { cantidad: 0, porcentaje: 0 };
  const pasados = distribucion?.pasadosEstaSemana || { cantidad: 0, porcentaje: 0 };
  const atrasados = distribucion?.atrasadosYArreglos || { cantidad: 0, porcentaje: 0 };

  // Dimensiones del Donut SVG
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius; // ~402.12

  // Longitudes de cada segmento
  const lenAlDia = total > 0 ? (alDia.cantidad / total) * circumference : 0;
  const lenPasados = total > 0 ? (pasados.cantidad / total) * circumference : 0;
  const lenAtrasados = total > 0 ? (atrasados.cantidad / total) * circumference : 0;

  // Desplazamientos acumulados (iniciando a las 12 en punto mediante rotación -90deg)
  const offsetAlDia = 0;
  const offsetPasados = -lenAlDia;
  const offsetAtrasados = -(lenAlDia + lenPasados);

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
        marginBottom: '16px',
      }}
    >
      {/* 1. Cabecera */}
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
          Estado de Clientes Activos
        </h3>
        <p
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--aureus-text-muted)',
            margin: '3px 0 0 0',
          }}
        >
          Proporción actual según cumplimiento de pago
        </p>
      </div>

      {/* 2. Gráfico Donut SVG Centrado */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '12px 0',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 160 160"
            style={{
              width: '100%',
              height: '100%',
              transform: 'rotate(-90deg)',
              display: 'block',
            }}
          >
            {/* Anillo base de fondo */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke={isDark ? '#1D2E44' : '#F1F5F9'}
              strokeWidth={strokeWidth}
            />

            {/* Segmento 1: Clientes al día (Esmeralda) */}
            {lenAlDia > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#397D67"
                strokeWidth={strokeWidth}
                strokeDasharray={`${lenAlDia} ${circumference}`}
                strokeDashoffset={offsetAlDia}
                strokeLinecap="round"
                style={{ transition: 'all 0.6s ease' }}
              />
            )}

            {/* Segmento 2: Pasados de día esta semana (Ámbar) */}
            {lenPasados > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#D97706"
                strokeWidth={strokeWidth}
                strokeDasharray={`${lenPasados} ${circumference}`}
                strokeDashoffset={offsetPasados}
                strokeLinecap="round"
                style={{ transition: 'all 0.6s ease' }}
              />
            )}

            {/* Segmento 3: Atrasados y arreglo de pago (Rojo carmesí) */}
            {lenAtrasados > 0 && (
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#C65D58"
                strokeWidth={strokeWidth}
                strokeDasharray={`${lenAtrasados} ${circumference}`}
                strokeDashoffset={offsetAtrasados}
                strokeLinecap="round"
                style={{ transition: 'all 0.6s ease' }}
              />
            )}
          </svg>

          {/* Texto central con total de clientes activos */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: 'var(--aureus-text-primary)',
                lineHeight: 1,
              }}
            >
              {total}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--aureus-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '4px',
              }}
            >
              Clientes
            </span>
          </div>
        </div>
      </div>

      {/* 3. Leyenda con cantidades y porcentajes */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--aureus-border-subtle)',
        }}
      >
        {/* Ítem 1: Clientes al día */}
        {/* Ítem 1: Clientes al día */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px 10px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: '#397D67',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-secondary)' }}>
              Clientes al día
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)', whiteSpace: 'nowrap' }}>
              {alDia.cantidad === 1 ? '1 cliente' : `${alDia.cantidad} clientes`}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aureus-green-text)',
                backgroundColor: 'var(--aureus-green-light)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--aureus-green-border)',
                whiteSpace: 'nowrap',
              }}
            >
              {alDia.porcentaje}%
            </span>
          </div>
        </div>

        {/* Ítem 2: Pasados de día esta semana */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px 10px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: '#B69A55',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-secondary)' }}>
              Pasados de día esta semana
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)', whiteSpace: 'nowrap' }}>
              {pasados.cantidad === 1 ? '1 cliente' : `${pasados.cantidad} clientes`}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aureus-gold-text)',
                backgroundColor: 'var(--aureus-gold-light)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--aureus-border-gold)',
                whiteSpace: 'nowrap',
              }}
            >
              {pasados.porcentaje}%
            </span>
          </div>
        </div>

        {/* Ítem 3: Atrasados y arreglo de pago */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px 10px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: 'var(--aureus-bg-elevated)',
            border: '1px solid var(--aureus-border-subtle)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: '#C65D58',
                flexShrink: 0,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-secondary)' }}>
              Atrasados y arreglo de pago
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)', whiteSpace: 'nowrap' }}>
              {atrasados.cantidad === 1 ? '1 cliente' : `${atrasados.cantidad} clientes`}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--aureus-red-text)',
                backgroundColor: 'var(--aureus-red-light)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--aureus-red-border)',
                whiteSpace: 'nowrap',
              }}
            >
              {atrasados.porcentaje}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

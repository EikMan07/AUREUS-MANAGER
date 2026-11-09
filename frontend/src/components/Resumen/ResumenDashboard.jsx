import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw } from 'lucide-react';
import { dbService } from '../../services/db.js';
import { ResumenMetricsGrid } from './ResumenMetricsGrid.jsx';
import { TendenciaCobrosChart } from './TendenciaCobrosChart.jsx';
import { EstadoClientesDonut } from './EstadoClientesDonut.jsx';

export function ResumenDashboard({ onShowAlert }) {
  const [metricas, setMetricas] = useState(null);
  const [tendenciaData, setTendenciaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTendenciaLoading, setIsTendenciaLoading] = useState(false);
  const [tendenciaTipo, setTendenciaTipo] = useState('DIA');
  const [tendenciaCantidad, setTendenciaCantidad] = useState(1);

  // Cargar métricas generales desde el backend
  const loadMetricas = useCallback(async () => {
    try {
      const data = await dbService.getResumen();
      if (data) {
        setMetricas(data);
      }
    } catch (err) {
      console.error('Error al cargar métricas de resumen:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Error de carga',
          message: 'No se pudieron obtener las estadísticas en este momento.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    }
  }, [onShowAlert]);

  // Cargar serie de tendencia con el filtro seleccionado
  const loadTendencia = useCallback(async (tipo = 'DIA', cantidad = 1) => {
    setIsTendenciaLoading(true);
    try {
      const data = await dbService.getTendencia(tipo, cantidad);
      if (data) {
        setTendenciaData(data);
      }
    } catch (err) {
      console.error('Error al cargar tendencia de cobros:', err);
    } finally {
      setIsTendenciaLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      setIsLoading(true);
      await Promise.all([loadMetricas(), loadTendencia(tendenciaTipo, tendenciaCantidad)]);
      if (isMounted) setIsLoading(false);
    };
    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [loadMetricas, loadTendencia, tendenciaTipo, tendenciaCantidad]);

  // Manejar cambio de filtro en el gráfico de tendencia
  const handleChangeFilter = useCallback((nuevoTipo, nuevaCantidad) => {
    setTendenciaTipo(nuevoTipo);
    setTendenciaCantidad(nuevaCantidad);
    loadTendencia(nuevoTipo, nuevaCantidad);
  }, [loadTendencia]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([loadMetricas(), loadTendencia(tendenciaTipo, tendenciaCantidad)]);
    setIsLoading(false);
  };

  // Fecha actual en español para el subtítulo
  const fechaTextoActual = metricas?.fechaActualTexto || 'Lunes, 2 de Noviembre de 2026';

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100%',
        padding: '16px',
        paddingBottom: '96px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      {/* Cabecera Principal del Módulo 4 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Resumen y Estadísticas
          </h2>
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#64748b',
              marginTop: '4px',
            }}
          >
            {fechaTextoActual}
          </span>
        </div>

        {/* Botón de Actualizar Datos */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            cursor: isLoading ? 'default' : 'pointer',
            flexShrink: 0,
            padding: 0,
            outline: 'none',
          }}
          title="Actualizar datos"
          aria-label="Actualizar datos en tiempo real"
        >
          <RotateCw
            size={18}
            strokeWidth={2}
            style={{
              color: isLoading ? '#059669' : '#475569',
              transition: 'transform 0.3s ease',
            }}
            className={isLoading ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {isLoading && !metricas ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 0',
            color: '#64748b',
          }}
        >
          <span
            className="loading-spinner"
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid #059669',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              marginBottom: '12px',
            }}
          />
          <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>
            Cargando estadísticas...
          </p>
        </div>
      ) : (
        <>
          {/* Bloque 1: Tarjetas de Métricas Clave del Negocio */}
          <ResumenMetricsGrid metricas={metricas} />

          {/* Bloque 2 y 3: Gráficos de Tendencia y Donut (Responsivos: apilados en móvil, lado a lado en escritorio) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--chart-grid-cols, minmax(0, 1fr))',
              gap: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <TendenciaCobrosChart
              data={tendenciaData}
              tipo={tendenciaTipo}
              cantidad={tendenciaCantidad}
              onChangeFilter={handleChangeFilter}
              isLoading={isTendenciaLoading}
            />

            <EstadoClientesDonut distribucion={metricas?.distribucionClientes} />
          </div>
        </>
      )}
    </div>
  );
}

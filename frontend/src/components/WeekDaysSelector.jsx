import React from 'react';
import { getWeekDaysForDate } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext.jsx';

export function WeekDaysSelector({ weekDays, selectedDayKey, onSelectDay, diasConPendientesSinCerrar = [] }) {
  const { isDark } = useTheme();
  // Si no se suministra weekDays, calcular los días de la semana actual por defecto
  const daysList = (weekDays && weekDays.length === 7) ? weekDays : getWeekDaysForDate();
  const unclosedSet = new Set(Array.isArray(diasConPendientesSinCerrar) ? diasConPendientesSinCerrar : []);

  return (
    <section className="week-selector-section" aria-label="Selector de día de cobro">
      {/* Barra de 7 Días (Lunes a Domingo al 100% sin cortarse) */}
      <div className="week-days-bar-container">
        <div className="week-days-grid grid-cols-7" role="tablist" aria-label="Días de la semana">
          {daysList.map((day, index) => {
            const isActive = day.key === selectedDayKey;
            const hasUnclosedPastCobros = Boolean(day.dateISO && unclosedSet.has(day.dateISO));
            return (
              <button
                key={day.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectDay(day.key, day.dateObj, day)}
                className={`day-col-btn ${isActive ? 'active' : ''} ${day.isToday ? 'is-today-marker' : ''} ${index > 0 ? 'border-left' : ''}`}
                style={
                  isActive
                    ? {
                        backgroundColor: isDark ? '#D4B46A' : '#B69A55',
                        border: isDark ? '1.5px solid #F5E1A4' : '1.5px solid #9E8342',
                      }
                    : undefined
                }
                title={`${day.name} ${day.dayNum}${day.isToday ? ' · Hoy' : ''}${hasUnclosedPastCobros ? ' · Con cobros pendientes sin registrar' : ''}`}
              >
                <span
                  className="day-abbr day-name"
                  style={
                    isActive
                      ? {
                          color: '#101C2C',
                          fontSize: '11px',
                          fontWeight: 800,
                          opacity: 0.9,
                        }
                      : {
                          color: isDark ? '#94A3B8' : '#6E757F',
                          fontWeight: 700,
                        }
                  }
                >
                  {day.key}
                </span>
                <span
                  className="day-number day-num"
                  style={
                    isActive
                      ? {
                          color: '#101C2C',
                          fontSize: '16px',
                          fontWeight: 900,
                          lineHeight: 1.1,
                        }
                      : {
                          color: isDark ? '#F5F3ED' : '#252A31',
                          fontSize: '15px',
                          fontWeight: 800,
                        }
                  }
                >
                  {day.dayNum}
                </span>
                {hasUnclosedPastCobros ? (
                  <span
                    className="unclosed-pending-dot w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isActive ? '#101C2C' : '#B69A55' }}
                    title="Día con cobros pendientes sin cerrar"
                  />
                ) : (
                  day.isToday && !isActive && (
                    <span className="today-subtle-indicator" title="Día actual" />
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

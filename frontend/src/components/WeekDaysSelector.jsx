import React from 'react';
import { getWeekDaysForDate } from '../utils/formatters';

export function WeekDaysSelector({ weekDays, selectedDayKey, onSelectDay, diasConPendientesSinCerrar = [] }) {
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
                title={`${day.name} ${day.dayNum}${day.isToday ? ' (Hoy)' : ''}${hasUnclosedPastCobros ? ' · Con cobros pendientes sin registrar' : ''}`}
              >
                <span className="day-abbr">{day.key}</span>
                <span className="day-number">{day.dayNum}</span>
                {hasUnclosedPastCobros ? (
                  <span
                    className="unclosed-pending-dot w-1.5 h-1.5 rounded-full bg-amber-500"
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

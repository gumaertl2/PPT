// 21.03.2026 12:00 - UX: Added visual highlighting (amber background) to specific event row when auto-corrected.
// src/features/cockpit/steps/DatesStep.tsx
/**
 * src/features/cockpit/steps/DatesStep.tsx
 * SCHRITT 4: FESTE TERMINE (i18n Update)
 * Ersetzt harte Texte durch t().
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Trash2, 
  AlertCircle,
  Plus
} from 'lucide-react';

export const DatesStep = () => {
  const { t } = useTranslation();
  
  // Store Access
  const { 
    project, 
    addCalendarEvent,
    removeCalendarEvent,
    updateCalendarEvent,
    addNotification
  } = useTripStore();

  const { userInputs } = project;
  const { dates } = userInputs;
  const { fixedEvents } = dates;

  const initialized = useRef(false);

  // Highlight State für visuelles Feedback
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const triggerHighlight = (id: string) => {
      setHighlightedEventId(id);
      setTimeout(() => setHighlightedEventId(null), 3000);
  };

  useEffect(() => {
    if (!initialized.current && fixedEvents.length === 0) {
      addCalendarEvent();
      initialized.current = true;
    }
  }, [addCalendarEvent, fixedEvents.length]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey && index === fixedEvents.length - 1) {
      addCalendarEvent();
    }
  };

  const isDateSelectable = !dates.flexible && dates.start && dates.end;

  const updateDateTime = (id: string, currentIso: string, type: 'date' | 'time', value: string) => {
    let [d, timeStr] = currentIso.split('T');
    if (!d) d = '';
    if (!timeStr) timeStr = '';

    if (type === 'date') {
      let clampedDate = value;
      let corrected = false;
      
      if (dates.start && clampedDate && clampedDate < dates.start) { 
          clampedDate = dates.start; 
          corrected = true; 
      }
      if (dates.end && clampedDate && clampedDate > dates.end) { 
          clampedDate = dates.end; 
          corrected = true; 
      }
      
      d = clampedDate;
      
      if (corrected) {
         triggerHighlight(id);
         addNotification({
             type: 'info',
             message: t('dates.auto_corrected', { defaultValue: 'Datum wurde automatisch auf den Reisezeitraum angepasst.' })
         });
      }
    } else {
      timeStr = value;
    }

    if (d) {
      updateCalendarEvent(id, { date: `${d}T${timeStr}` });
    } else {
      updateCalendarEvent(id, { date: '' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Hinweis bei flexiblem Datum */}
      {!isDateSelectable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 text-sm text-amber-800 mb-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>{t('dates.warning_flexible_title')}</strong>
            <p className="text-xs mt-1 text-amber-700">
              {t('dates.warning_flexible_text')}
            </p>
          </div>
        </div>
      )}

      {/* TABELLE / LISTE */}
      <div className="space-y-2">
        <div className="flex gap-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="flex-[4]">{t('dates.table_activity')}</div>
          <div className="flex-[2]">{t('dates.table_date')}</div>
          <div className="flex-[1]">{t('dates.table_time')}</div>
          <div className="flex-[1]">{t('dates.table_duration')}</div>
          <div className="w-8 text-center"></div>
        </div>

        {fixedEvents.map((event, index) => {
          const [datePart, timePart] = (event.date || '').split('T');
          const isHighlighted = highlightedEventId === event.id;

          return (
            <div 
              key={event.id} 
              className={`flex gap-2 items-start p-2 rounded-lg border shadow-sm transition-all duration-500 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 ${isHighlighted ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' : 'bg-white border-slate-200'}`}
            >
              {/* 1. AKTIVITÄT */}
              <div className="flex-[4]">
                <input
                  type="text"
                  placeholder={t('dates.placeholder_activity')}
                  className="w-full text-sm font-medium border-slate-300 rounded focus:border-blue-500 focus:ring-blue-500"
                  value={event.title}
                  onChange={(e) => updateCalendarEvent(event.id, { title: e.target.value })}
                  autoFocus={index === fixedEvents.length - 1 && fixedEvents.length > 1}
                />
              </div>

              {/* 2. DATUM */}
              <div className="flex-[2] relative">
                <input
                  type="date"
                  className={`w-full text-xs rounded focus:border-blue-500 focus:ring-blue-500 transition-colors duration-500 ${
                    !isDateSelectable ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300' : 
                    isHighlighted ? 'bg-amber-50 text-amber-900 border-amber-400 font-bold' : 'border-slate-300'
                  }`}
                  value={datePart || ''}
                  min={dates.start}
                  max={dates.end}
                  disabled={!isDateSelectable}
                  onChange={(e) => updateDateTime(event.id, event.date || '', 'date', e.target.value)}
                />
              </div>

              {/* 3. ZEIT */}
              <div className="flex-[1]">
                <input
                  type="time"
                  className={`w-full text-xs border-slate-300 rounded focus:border-blue-500 focus:ring-blue-500 ${
                    !isDateSelectable ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                  }`}
                  value={timePart || ''}
                  disabled={!isDateSelectable}
                  onChange={(e) => updateDateTime(event.id, event.date || '', 'time', e.target.value)}
                />
              </div>

              {/* 4. DAUER */}
              <div className="flex-[1]">
                <input
                  type="text"
                  placeholder="2h"
                  className="w-full text-sm border-slate-300 rounded focus:border-blue-500 focus:ring-blue-500 text-center"
                  value={(event as any).duration || ''}
                  onChange={(e) => updateCalendarEvent(event.id, { duration: e.target.value } as any)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              </div>

              {/* DELETE */}
              <div className="w-8 flex justify-center pt-1.5">
                <button 
                  onClick={() => removeCalendarEvent(event.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                  tabIndex={-1} 
                  title={t('actions.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD BUTTON */}
      <button
        onClick={() => addCalendarEvent()}
        className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
      >
        <Plus className="w-4 h-4" /> {t('dates.add_btn')}
      </button>

    </div>
  );
};
// --- END OF FILE 164 Zeilen ---
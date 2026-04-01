// 22.03.2026 09:00 - UX: Applied "Deep Input" UX logic (inner shadow, focus rings, strong labels) to cure lack of affordance.
// src/features/Cockpit/steps/DatesStep.tsx

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

  // UX-Klassen
  const HEADER_CLASS = "text-[10px] font-black text-blue-800 uppercase tracking-widest text-center";
  const INPUT_CLASS = "w-full text-sm font-medium bg-white border border-slate-300 shadow-inner rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-slate-300";

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
    <div className="space-y-6 animate-fade-in bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      
      {/* Hinweis bei flexiblem Datum */}
      {!isDateSelectable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 text-sm text-amber-800 shadow-sm mb-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong className="text-base block mb-1">{t('dates.warning_flexible_title')}</strong>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              {t('dates.warning_flexible_text')}
            </p>
          </div>
        </div>
      )}

      {/* TABELLE / LISTE */}
      <div className="space-y-3">
        <div className="flex gap-3 px-2 pb-2 border-b border-slate-100">
          <div className={`${HEADER_CLASS} flex-[4] text-left`}>{t('dates.table_activity')}</div>
          <div className={`${HEADER_CLASS} flex-[2]`}>{t('dates.table_date')}</div>
          <div className={`${HEADER_CLASS} flex-[1]`}>{t('dates.table_time')}</div>
          <div className={`${HEADER_CLASS} flex-[1]`}>{t('dates.table_duration')}</div>
          <div className="w-10 text-center"></div>
        </div>

        {fixedEvents.map((event, index) => {
          const [datePart, timePart] = (event.date || '').split('T');
          const isHighlighted = highlightedEventId === event.id;

          return (
            <div 
              key={event.id} 
              className={`flex gap-3 items-center p-3 rounded-xl border shadow-sm transition-all duration-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 ${isHighlighted ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}
            >
              {/* 1. AKTIVITÄT */}
              <div className="flex-[4]">
                <input
                  type="text"
                  placeholder={t('dates.placeholder_activity')}
                  className={INPUT_CLASS}
                  value={event.title}
                  onChange={(e) => updateCalendarEvent(event.id, { title: e.target.value })}
                  autoFocus={index === fixedEvents.length - 1 && fixedEvents.length > 1}
                />
              </div>

              {/* 2. DATUM */}
              <div className="flex-[2] relative">
                <input
                  type="date"
                  className={`${INPUT_CLASS} ${
                    !isDateSelectable ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 
                    isHighlighted ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold' : ''
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
                  className={`${INPUT_CLASS} text-center pl-4 ${
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
                  className={`${INPUT_CLASS} text-center`}
                  value={(event as any).duration || ''}
                  onChange={(e) => updateCalendarEvent(event.id, { duration: e.target.value } as any)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              </div>

              {/* DELETE */}
              <div className="w-10 flex justify-center">
                <button 
                  onClick={() => removeCalendarEvent(event.id)}
                  className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors shadow-sm"
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
      <div className="pt-4 mt-2 border-t border-slate-100">
          <button
            onClick={() => addCalendarEvent()}
            className="flex items-center justify-center gap-2 w-full text-sm text-blue-700 bg-blue-50 border-2 border-dashed border-blue-200 font-bold hover:text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-all p-3 rounded-xl"
          >
            <Plus className="w-4 h-4" /> {t('dates.add_btn')}
          </button>
      </div>

    </div>
  );
};
// --- END OF FILE 175 Zeilen ---
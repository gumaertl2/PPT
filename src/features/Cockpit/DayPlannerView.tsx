// 19.02.2026 17:00 - FEAT: Extracted DayPlannerView & added smart native date formatting (DE/EN).
// src/features/Cockpit/DayPlannerView.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import type { Place, DetailLevel, LanguageCode } from '../../core/types';

interface DayPlannerViewProps {
  places: Place[];
  showPlanningMode: boolean;
  overrideDetailLevel?: DetailLevel;
}

// --- SMART DATE FORMATTER ---
const formatTimelineDate = (dateStr: string, lang: LanguageCode): string => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;

    if (lang === 'de') {
        // Output: "Montag, 5. Mai"
        return new Intl.DateTimeFormat('de-DE', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).format(dateObj);
    } else {
        // Output: "Monday, May 5th"
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
        const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dateObj);
        const day = dateObj.getDate();
        
        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';

        return `${weekday}, ${month} ${day}${suffix}`;
    }
};

export const DayPlannerView: React.FC<DayPlannerViewProps> = ({ 
  places, 
  showPlanningMode, 
  overrideDetailLevel 
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  const { project } = useTripStore();
  
  const { userInputs } = project;
  const days = project.itinerary?.days || [];
  const assignedIds = new Set<string>();
  
  // Hotel & Ort für die Kopfzeile aus den Logistik-Daten ermitteln
  const isStationary = userInputs.logistics.mode === 'stationaer';
  const hotelName = isStationary ? (userInputs.logistics.stationary?.hotel || 'Hotel') : 'Unterkunft';
  const destinationStr = isStationary && userInputs.logistics.stationary?.destination ? ` in ${userInputs.logistics.stationary.destination}` : '';

  const renderedDays = days.map((day: any, i: number) => {
      const baseTitle = `${t('sights.day', {defaultValue: 'Tag'})} ${i + 1}`;
      const title = day.title ? `${baseTitle}: ${day.title}` : baseTitle;
      const activities = day.activities || day.aktivitaeten || [];

      // Validierung: Sind Orte dieses Tages in der aktuellen 'places'-Liste enthalten?
      const dayPlaces = places.filter((p: Place) => activities.some((a: any) => (a.id || a.original_sight_id) === p.id));
      dayPlaces.forEach((p: Place) => assignedIds.add(p.id));

      if (activities.length === 0 && dayPlaces.length === 0) return null;

      const formattedDate = day.date ? formatTimelineDate(day.date, currentLang) : null;

      return (
        <div key={`day-${i}`} className="mb-8 last:mb-0 print:break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
          
          {/* DAY HEADER (Title, Date & Overnight) */}
          <div className="bg-slate-50 border-b border-slate-100 flex flex-col print:bg-transparent print:border-b-2 print:border-slate-300">
              <div className="px-4 py-3 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-lg print:hidden">📅</span> {title}
                  </h3>
                  {formattedDate && (
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
                        {formattedDate}
                      </span>
                  )}
              </div>
              <div className="px-4 pb-3 pt-0 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <span className="text-sm">🏨</span> {t('sights.overnight', {defaultValue: 'Übernachtung'})}: {hotelName}{destinationStr}
              </div>
          </div>

          {/* TIMELINE ACTIVITIES (Sights & Transfers) */}
          <div className="p-4 space-y-3 print:p-0 print:pt-3">
              {activities.map((act: any, actIdx: number) => {
                  
                  // 1. TRANSFER BLOCK
                  if (act.type === 'transfer') {
                      // Auto-Korrektur des KI-Patzers ("Zentraler Startpunkt" -> Echter Hotelname)
                      let desc = act.description || '';
                      if (desc.includes('Zentraler Startpunkt') || desc.includes('Central Starting Point')) {
                          desc = desc.replace(/Zentraler Startpunkt|Central Starting Point/gi, hotelName);
                      }

                      return (
                          <div key={`transfer-${i}-${actIdx}`} className="flex items-center gap-3 px-3 py-2 ml-5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-slate-600 print:bg-transparent print:border-none print:px-0">
                              <span className="text-lg">{act.mode === 'walk' ? '🚶' : '🚗'}</span>
                              <span className="font-medium">{act.duration} Min. {act.mode === 'walk' ? (currentLang === 'de' ? 'Fußweg' : 'Walk') : (currentLang === 'de' ? 'Fahrt' : 'Drive')}</span>
                              {desc && <span className="text-slate-500 italic hidden sm:inline">({desc})</span>}
                          </div>
                      );
                  } 
                  
                  // 2. SIGHT BLOCK
                  else if (act.type === 'sight' || act.original_sight_id) {
                      const placeId = act.id || act.original_sight_id;
                      const place = places.find((p: Place) => p.id === placeId);
                      if (!place) return null; 
                      
                      return (
                          <div key={place.id} id={`card-${place.id}`} className="relative pl-7 border-l-2 border-blue-200 ml-7 py-2 print:border-l-2 print:border-slate-300">
                              <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white print:ring-transparent"></div>
                              
                              {act.time && (
                                  <div className="text-xs font-black text-blue-600 mb-2 -mt-1 uppercase tracking-wider">
                                      {act.time} {currentLang === 'de' ? 'Uhr' : ''}
                                  </div>
                              )}
                              
                              <SightCard 
                                 id={place.id} 
                                 data={place} 
                                 mode="selection" 
                                 showPriorityControls={showPlanningMode}
                                 detailLevel={overrideDetailLevel}
                              />
                          </div>
                      );
                  }
                  return null;
              })}
          </div>
        </div>
      );
  }).filter(Boolean);

  return <>{renderedDays}</>;
};
// --- END OF FILE 148 Zeilen ---
// 19.02.2026 22:30 - FIX: Removed unused lucide-react imports (TS6133).
// 19.02.2026 17:45 - FEAT: Added rendering for 'break', 'check-in', and 'distance_km'.
// src/features/Cockpit/DayPlannerView.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import type { Place, DetailLevel, LanguageCode } from '../../core/types';
import { Utensils, Luggage } from 'lucide-react'; // FIX: Removed Coffee and MapPin

interface DayPlannerViewProps {
  places: Place[];
  showPlanningMode: boolean;
  overrideDetailLevel?: DetailLevel;
}

const formatTimelineDate = (dateStr: string, lang: LanguageCode): string => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;

    if (lang === 'de') {
        return new Intl.DateTimeFormat('de-DE', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        }).format(dateObj);
    } else {
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
  
  const isStationary = userInputs.logistics.mode === 'stationaer';
  const hotelName = isStationary ? (userInputs.logistics.stationary?.hotel || 'Hotel') : 'Unterkunft';
  const destinationStr = isStationary && userInputs.logistics.stationary?.destination ? ` in ${userInputs.logistics.stationary.destination}` : '';

  const renderedDays = days.map((day: any, i: number) => {
      const baseTitle = `${t('sights.day', {defaultValue: 'Tag'})} ${i + 1}`;
      const title = day.title ? `${baseTitle}: ${day.title}` : baseTitle;
      const activities = day.activities || day.aktivitaeten || [];

      if (activities.length === 0) return null;

      const formattedDate = day.date ? formatTimelineDate(day.date, currentLang) : null;

      return (
        <div key={`day-${i}`} className="mb-8 last:mb-0 print:break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
          
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

          <div className="p-4 space-y-3 print:p-0 print:pt-3">
              {activities.map((act: any, actIdx: number) => {
                  
                  // 1. TRANSFER BLOCK
                  if (act.type === 'transfer') {
                      let desc = act.description || '';
                      if (desc.includes('Zentraler Startpunkt') || desc.includes('Central Starting Point')) {
                          desc = desc.replace(/Zentraler Startpunkt|Central Starting Point/gi, hotelName);
                      }

                      return (
                          <div key={`transfer-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              
                              <div className="flex flex-col gap-1 px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-slate-600 print:bg-transparent print:border-none print:px-0">
                                 <div className="flex items-center gap-2">
                                     <span className="text-base">{act.mode === 'walk' ? '🚶' : '🚗'}</span>
                                     <span className="font-bold">
                                         {act.time && `${act.time} Uhr: `}
                                         {act.duration} Min. {act.mode === 'walk' ? (currentLang === 'de' ? 'Fußweg' : 'Walk') : (currentLang === 'de' ? 'Fahrt' : 'Drive')}
                                         {act.distance_km && ` (${act.distance_km} km)`}
                                     </span>
                                 </div>
                                 {desc && <span className="text-xs text-slate-500 italic ml-6">({desc})</span>}
                              </div>
                          </div>
                      );
                  } 
                  
                  // 2. BREAK BLOCK
                  else if (act.type === 'break') {
                      return (
                          <div key={`break-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              <div className="flex items-center gap-3 px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg text-sm text-amber-800 print:bg-transparent print:border-none print:px-0">
                                  <Utensils className="w-4 h-4" />
                                  <span className="font-bold">
                                      {act.time && `${act.time} Uhr: `}
                                      {act.description || 'Pause'} ({act.duration} Min.)
                                  </span>
                              </div>
                          </div>
                      );
                  }

                  // 3. CHECK-IN BLOCK
                  else if (act.type === 'check-in') {
                      return (
                          <div key={`check-in-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm text-emerald-800 print:bg-transparent print:border-none print:px-0">
                                  <Luggage className="w-4 h-4" />
                                  <span className="font-bold">
                                      {act.time && `${act.time} Uhr: `}
                                      Check-in: {act.location || hotelName} ({act.duration} Min.)
                                  </span>
                              </div>
                          </div>
                      );
                  }
                  
                  // 4. SIGHT BLOCK
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
// --- END OF FILE 164 Zeilen ---
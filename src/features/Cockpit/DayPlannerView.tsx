// 19.03.2026 10:00 - FIX: Ignored active search terms and filters during print mode so the PDF itinerary isn't accidentally blank.
// 28.02.2026 13:05 - FEAT: Added search term filtering to DayPlannerView.
// src/features/Cockpit/DayPlannerView.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { ExpenseEntryButton } from './ExpenseEntryButton';
import type { Place, DetailLevel, LanguageCode } from '../../core/types';
import { Utensils, Luggage, AlertTriangle } from 'lucide-react'; 

interface DayPlannerViewProps {
  places: Place[];
  showPlanningMode: boolean;
  overrideDetailLevel?: DetailLevel;
}

const formatTimelineDate = (dateStr: string, lang: LanguageCode): string => { 
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    if (lang === 'de') return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateObj);
    const w = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj);
    const m = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(dateObj);
    const d = dateObj.getDate();
    let s = 'th'; if (d===1||d===21||d===31) s='st'; else if (d===2||d===22) s='nd'; else if (d===3||d===23) s='rd';
    return `${w}, ${m} ${d}${s}`;
};

export const DayPlannerView: React.FC<DayPlannerViewProps> = ({ places, showPlanningMode, overrideDetailLevel }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project, uiState } = useTripStore();
  const { userInputs, analysis } = project;
  const days = project.itinerary?.days || [];
  
  // FIX: Wenn gedruckt wird, ignorieren wir alle Such- und Filterkürzel, damit das PDF komplett ist!
  const isPrint = !!overrideDetailLevel;
  const activeFilters = isPrint ? [] : (uiState.categoryFilter || []); 
  const searchTerm = isPrint ? '' : (uiState.searchTerm || '').toLowerCase();
  
  const travelerNames = userInputs.travelers.travelerNames || '';
  
  const isStationary = userInputs.logistics.mode === 'stationaer';
  const hotelName = isStationary ? (userInputs.logistics.stationary?.hotel || 'Hotel') : 'Unterkunft';
  const destinationStr = isStationary && userInputs.logistics.stationary?.destination ? ` in ${userInputs.logistics.stationary.destination}` : '';

  const transferAnalysis = analysis?.transferPlanner?.transfers || [];

  const renderedDays = days.map((day: any, i: number) => {
      const baseTitle = `${t('sights.day', {defaultValue: 'Tag'})} ${i + 1}`;
      
      if (activeFilters.length > 0) {
          const labelDe = `Tag ${i + 1}`;
          const labelEn = `Day ${i + 1}`;
          if (!activeFilters.includes(baseTitle) && !activeFilters.includes(labelDe) && !activeFilters.includes(labelEn)) return null; 
      }

      const title = day.title ? `${baseTitle}: ${day.title}` : baseTitle;
      const activities = day.activities || day.aktivitaeten || [];

      if (activities.length === 0) return null;

      const filteredActivities = activities.filter((act: any) => {
          if (!searchTerm) return true;
          
          let searchableText = '';
          if (act.type === 'sight' || act.original_sight_id) {
              const placeId = act.id || act.original_sight_id;
              const place = places.find((p: Place) => p.id === placeId);
              if (place) {
                  searchableText = [place.name, place.official_name, place.category, place.description, place.detailContent, place.address].filter(Boolean).join(' ').toLowerCase();
              }
          } else {
              searchableText = [act.description, act.location, act.mode, act.type].filter(Boolean).join(' ').toLowerCase();
          }
          
          return searchableText.includes(searchTerm);
      });

      if (searchTerm && filteredActivities.length === 0) return null;

      const formattedDate = day.date ? formatTimelineDate(day.date, currentLang) : null;

      return (
        <div key={`day-${i}`} className="mb-8 last:mb-0 print:break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          
          <div className="bg-slate-50 border-b border-slate-100 flex flex-col">
              <div className="px-4 py-3 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-lg">📅</span> {title}</h3>
                  {formattedDate && <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">{formattedDate}</span>}
              </div>
              <div className="px-4 pb-3 pt-0 text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <span className="text-sm">🏨</span> {t('sights.overnight', {defaultValue: 'Übernachtung'})}: {hotelName}{destinationStr}
                  <ExpenseEntryButton defaultTitle="Übernachtung" placeId={`hotel-${i}`} travelers={travelerNames} mode="planner" />
              </div>
          </div>

          <div className="p-4 space-y-3">
              {filteredActivities.map((act: any, actIdx: number) => {
                  if (act.type === 'transfer') {
                      let desc = act.description || '';
                      if (desc.includes('Zentraler Startpunkt')) desc = desc.replace(/Zentraler Startpunkt/gi, hotelName);
                      return (
                          <div key={`transfer-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              <div className="flex items-center justify-between gap-1 px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-slate-600">
                                 <div>
                                     <div className="flex items-center gap-2">
                                         <span className="text-base">{act.mode === 'walk' ? '🚶' : '🚗'}</span>
                                         <span className="font-bold">{act.time && `${act.time} Uhr: `}{act.duration} Min. {act.mode === 'walk' ? 'Fußweg' : 'Fahrt'}{act.distance_km && ` (${act.distance_km} km)`}</span>
                                     </div>
                                     {desc && <span className="text-xs text-slate-500 italic ml-6">({desc})</span>}
                                 </div>
                                 <ExpenseEntryButton defaultTitle="Transfer / Ticket" travelers={travelerNames} mode="planner" />
                              </div>
                          </div>
                      );
                  } 
                  else if (act.type === 'break') {
                      return (
                          <div key={`break-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg text-sm text-amber-800">
                                  <div className="flex items-center gap-3">
                                      <Utensils className="w-4 h-4" />
                                      <span className="font-bold">{act.time && `${act.time} Uhr: `}{act.description || 'Pause'} ({act.duration} Min.)</span>
                                  </div>
                                  <ExpenseEntryButton defaultTitle={act.description || 'Essen/Pause'} travelers={travelerNames} mode="planner" />
                              </div>
                          </div>
                      );
                  }
                  else if (act.type === 'check-in') {
                      return (
                          <div key={`check-in-${i}-${actIdx}`} className="relative pl-7 ml-7 py-1">
                              <div className="absolute -left-[1px] top-0 bottom-0 w-0.5 bg-slate-100"></div>
                              <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                                  <Luggage className="w-4 h-4" />
                                  <span className="font-bold">{act.time && `${act.time} Uhr: `}Check-in: {act.location || hotelName} ({act.duration} Min.)</span>
                              </div>
                          </div>
                      );
                  }
                  else if (act.type === 'sight' || act.original_sight_id) {
                      const placeId = act.id || act.original_sight_id;
                      const place = places.find((p: Place) => p.id === placeId);
                      if (!place) return null; 
                      
                      const transferInfo = transferAnalysis.find((t: any) => t.to_id === placeId);
                      const warning = transferInfo?.reality_check_warning;

                      return (
                          <div key={place.id} className="relative pl-7 border-l-2 border-blue-200 ml-7 py-2">
                              <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white"></div>
                              
                              {act.time && <div className="text-xs font-black text-blue-600 mb-2 -mt-1 uppercase tracking-wider">{act.time} Uhr</div>}
                              
                              {warning && (
                                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
                                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                                      <div>
                                          <strong className="block font-bold mb-0.5 uppercase tracking-wide text-[10px]">Logistik-Warnung</strong>
                                          <span className="leading-snug">{warning}</span>
                                      </div>
                                  </div>
                              )}

                              <SightCard id={place.id} data={place} mode="selection" showPriorityControls={showPlanningMode} detailLevel={overrideDetailLevel} />
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
// --- END OF FILE 183 Zeilen ---
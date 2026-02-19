// 19.02.2026 15:45 - FEAT: Added V40 Timeline Renderer for 'day' sortMode (Titles, Transfers, Times).
// 19.02.2026 15:25 - FIX: V40/V30 JSON Compatibility for daily activities & Lifted showPlanningMode state.
// 09.02.2026 12:00 - FIX: Added 'overrideDetailLevel' prop to support Print Settings.
// 06.02.2026 17:20 - FEAT: Added 'overrideSortMode' prop for Print Report flexibility.
// 06.02.2026 17:15 - FIX: Print Optimization (Double-Instance-Fix & Clean Layout).
// 02.02.2026 13:15 - FIX: Enforced City Grouping for 'Specials' in Tour Mode.
// src/features/Cockpit/SightsView.tsx

import React, { useMemo, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { SightFilterModal } from './SightFilterModal'; 
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode, Place, DetailLevel } from '../../core/types';
import { SightsMapView } from './SightsMapView';

import { 
  FileText,
  Briefcase, 
  Layout,
  Filter
} from 'lucide-react';

const TRAVEL_PACE_CONFIG: Record<string, { startHour: number; endHour: number; breakMinutes: number; bufferMinutes: number }> = {
  'fast': { startHour: 8, endHour: 19, breakMinutes: 60, bufferMinutes: 0 }, 
  'balanced': { startHour: 9.5, endHour: 17, breakMinutes: 90, bufferMinutes: 45 }, 
  'relaxed': { startHour: 10, endHour: 16, breakMinutes: 90, bufferMinutes: 45 } 
};

interface SightsViewProps {
  overrideSortMode?: 'category' | 'tour' | 'day' | 'alphabetical';
  overrideDetailLevel?: DetailLevel; 
}

export const SightsView: React.FC<SightsViewProps> = ({ overrideSortMode, overrideDetailLevel }) => {
  const { t, i18n } = useTranslation(); 
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;

  const { 
    project, 
    uiState, 
    setUIState, 
    isSightFilterOpen, 
    toggleSightFilter 
  } = useTripStore();
  
  const { userInputs, data, analysis } = project; 
  const places = Object.values(data.places || {});

  const showPlanningMode = uiState.showPlanningMode || false;

  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';
  const isTourMode = activeSortMode === 'tour';

  // --- AUTO-SCROLL LOGIC ---
  useEffect(() => {
    if (overrideSortMode) return;
    if (uiState.viewMode === 'list' && uiState.selectedPlaceId) {
      setTimeout(() => {
        const element = document.getElementById(`card-${uiState.selectedPlaceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'duration-1000');
          setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 3000);
        }
      }, 150);
    }
  }, [uiState.selectedPlaceId, uiState.viewMode, overrideSortMode]);
  
  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "";
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };

  // --- 1. BUDGET LOGIC ---
  const budgetStats = useMemo(() => {
    let totalMinutes = 0;
    const pace = userInputs.pace || 'balanced';
    const config = TRAVEL_PACE_CONFIG[pace] || TRAVEL_PACE_CONFIG['balanced'];
    
    const start = new Date(`2000-01-01T${userInputs.dates?.dailyStartTime || '09:00'}`); 
    const end = new Date(`2000-01-01T${userInputs.dates?.dailyEndTime || '18:00'}`);
    let dailyMinutes = (end.getTime() - start.getTime()) / 60000;
    
    if (isNaN(dailyMinutes) || dailyMinutes <= 0) {
       dailyMinutes = (config.endHour - config.startHour) * 60 - config.breakMinutes;
    }

    const days = (new Date(userInputs.dates.end).getTime() - new Date(userInputs.dates.start).getTime()) / (1000 * 3600 * 24) + 1;
    const totalBudget = Math.floor(dailyMinutes * days);

    places.forEach((p: any) => {
      const prio = p.userPriority || 0;
      if (prio > 0) {
         const dur = p.duration || p.min_duration_minutes || 60;
         totalMinutes += dur;
      }
    });

    return { total: totalBudget, used: totalMinutes, remaining: totalBudget - totalMinutes };
  }, [userInputs, places]);

  // --- 2. DATA PREPARATION ---
  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const ignoreList = APPENDIX_ONLY_INTERESTS || [];
    places.forEach((p: any) => {
      const cat = p.category || 'Sonstiges';
      if (!ignoreList.includes(cat)) {
          counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return Object.keys(counts).sort().map(cat => ({
        id: cat,
        label: resolveCategoryLabel(cat),
        count: counts[cat]
    }));
  }, [places]);

  const tourOptions = useMemo(() => {
      const tourGuide = (analysis as any)?.tourGuide;
      const tours = (tourGuide?.guide?.tours || []) as any[];
      
      const mappedTours = tours.map((tour: any) => {
          const count = (tour.suggested_order_ids || []).filter((id: string) => 
              places.some((p: any) => p.id === id)
          ).length;
          return {
              id: tour.tour_title || "Tour", 
              label: tour.tour_title || "Tour",
              count: count,
              placeIds: tour.suggested_order_ids || []
          };
      }).filter((t: any) => t.count > 0);

      const specialPlaces = places.filter((p: any) => p.category === 'special');
      if (specialPlaces.length > 0) {
          mappedTours.push({
              id: 'tour_special', 
              label: 'Tour: Sondertage & Ideen',
              count: specialPlaces.length,
              placeIds: specialPlaces.map((p: any) => p.id)
          });
      }

      return mappedTours;
  }, [analysis, places]);

  const dayOptions = useMemo(() => {
      const itineraryDays = project.itinerary?.days || [];
      return itineraryDays.map((day: any, index: number) => {
          let count = 0;
          const activities = day.activities || day.aktivitaeten || [];
          if (activities.length > 0) {
              count = activities.filter((akt: any) => 
                    places.some((p: any) => p.id === (akt.id || akt.original_sight_id))
              ).length;
          }
          const label = `${t('sights.day', {defaultValue: 'Tag'})} ${index + 1}`;
          return {
              id: label,
              label: label,
              count: count,
              dayIndex: index
          };
      }).filter((d: any) => d.count > 0);
  }, [project.itinerary, places]);

  const handleViewModeChange = (mode: string) => {
      setUIState({ 
          sortMode: mode as any,
          categoryFilter: [] 
      });
  };

  // --- 3. FILTER & SORT LOGIC ---
  const filteredLists = useMemo(() => {
    const mainList: any[] = [];
    const reserveList: any[] = [];
    const specialList: any[] = []; 

    const isPrint = !!overrideSortMode || uiState.isPrintMode;
    const term = isPrint ? '' : (uiState.searchTerm || '').toLowerCase();
    const activeFilters = isPrint ? [] : (uiState.categoryFilter || []); 
    const sortMode = activeSortMode;
    const selectedCategory = isPrint ? 'all' : uiState.selectedCategory;

    const ignoreList = APPENDIX_ONLY_INTERESTS || [];
    const minRating = userInputs.searchSettings?.minRating || 0;
    const minDuration = userInputs.searchSettings?.minDuration || 0;

    places.forEach((p: any) => {
      const cat = p.category || 'Sonstiges';
      if (ignoreList.includes(cat)) return;

      if (term) {
          const searchableText = [
              p.name, p.official_name, p.category, p.userSelection?.customCategory,
              p.description, p.shortDesc, p.detailContent, p.reasoning, p.logistics, p.address
          ].filter(Boolean).join(' ').toLowerCase();
          if (!searchableText.includes(term)) return;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
          const pCat = p.userSelection?.customCategory || p.category;
          if (pCat !== selectedCategory) return;
      }

      if (activeFilters.length > 0) {
          if (sortMode === 'category') {
              if (!activeFilters.includes(cat)) return;
          }
          else if (sortMode === 'tour') {
              const inSelectedTour = tourOptions.some((tour: any) => 
                  activeFilters.includes(tour.id) && tour.placeIds.includes(p.id)
              );
              if (!inSelectedTour) return;
          }
          else if (sortMode === 'day') {
              const itineraryDays = project.itinerary?.days || [];
              const inSelectedDay = activeFilters.some(dayLabel => {
                  const dayIndexStr = dayLabel.replace(/[^0-9]/g, '');
                  const dayIndex = parseInt(dayIndexStr) - 1;
                  const day = itineraryDays[dayIndex];
                  const activities = day?.activities || day?.aktivitaeten || [];
                  return activities.some((a: any) => (a.id || a.original_sight_id) === p.id);
              });
              if (!inSelectedDay) return;
          }
      }

      const rating = p.rating || 0;
      const duration = p.duration || p.min_duration_minutes || 0;
      const isReserve = (p.userPriority === -1) || (duration < minDuration) || (rating > 0 && rating < minRating);
      
      if (cat === 'special') specialList.push(p);
      else if (isReserve) reserveList.push(p);
      else mainList.push(p);
    });

    const sortFn = (a: any, b: any) => {
      if (sortMode === 'alphabetical') return a.name.localeCompare(b.name);
      const pA = a.userSelection?.priority ?? 0;
      const pB = b.userSelection?.priority ?? 0;
      if (pA !== pB) return pB - pA;
      return (a.category || '').localeCompare(b.category || '');
    };

    return { 
        main: mainList.sort(sortFn), 
        reserve: reserveList.sort(sortFn),
        special: specialList.sort(sortFn)
    };
  }, [places, uiState.searchTerm, uiState.categoryFilter, activeSortMode, uiState.selectedCategory, uiState.isPrintMode, overrideSortMode, userInputs.searchSettings, tourOptions, project.itinerary]);

  // --- 4. RENDERER: GROUPED LIST ---
  const renderGroupedList = (list: any[], groupByOverride?: 'city') => {
    if (list.length === 0) return null; 
    const sortMode = activeSortMode;
    
    // =========================================================================
    // V40 TIMELINE RENDERER (DAY MODE) - Replaces standard grouping
    // =========================================================================
    if (sortMode === 'day' && !groupByOverride) {
         const days = project.itinerary?.days || [];
         const assignedIds = new Set<string>();

         const renderedDays = days.map((day: any, i: number) => {
             const baseTitle = `${t('sights.day', {defaultValue: 'Tag'})} ${i + 1}`;
             const title = day.title ? `${baseTitle}: ${day.title}` : baseTitle;
             const activities = day.activities || day.aktivitaeten || [];

             // Validierung: Sind Orte dieses Tages in der aktuellen 'list' enthalten?
             const dayPlaces = list.filter(p => activities.some((a: any) => (a.id || a.original_sight_id) === p.id));
             dayPlaces.forEach(p => assignedIds.add(p.id));

             if (activities.length === 0 && dayPlaces.length === 0) return null;

             return (
               <div key={`day-${i}`} className="mb-8 last:mb-0 print:break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm print:border-none print:shadow-none">
                 
                 {/* DAY HEADER (Title & Date) */}
                 <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center print:bg-transparent print:border-b-2 print:border-slate-300 print:px-0 print:py-1">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2">
                         <span className="text-lg print:hidden">📅</span> {title}
                     </h3>
                     {day.date && (
                         <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0">
                           {day.date}
                         </span>
                     )}
                 </div>

                 {/* TIMELINE ACTIVITIES (Sights & Transfers) */}
                 <div className="p-4 space-y-3 print:p-0 print:pt-3">
                     {activities.map((act: any, actIdx: number) => {
                         
                         // 1. TRANSFER BLOCK
                         if (act.type === 'transfer') {
                             return (
                                 <div key={`transfer-${i}-${actIdx}`} className="flex items-center gap-3 px-3 py-2 ml-5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-slate-600 print:bg-transparent print:border-none print:px-0">
                                     <span className="text-lg">{act.mode === 'walk' ? '🚶' : '🚗'}</span>
                                     <span className="font-medium">{act.duration} Min. {act.mode === 'walk' ? 'Fußweg' : 'Fahrt'}</span>
                                     {act.description && <span className="text-slate-500 italic hidden sm:inline">({act.description})</span>}
                                 </div>
                             );
                         } 
                         
                         // 2. SIGHT BLOCK
                         else if (act.type === 'sight' || act.original_sight_id) {
                             const placeId = act.id || act.original_sight_id;
                             const place = list.find(p => p.id === placeId);
                             if (!place) return null; // Fallback falls Ort gelöscht oder im Filter verborgen
                             
                             return (
                                 <div key={place.id} id={`card-${place.id}`} className="relative pl-7 border-l-2 border-blue-200 ml-7 py-2 print:border-l-2 print:border-slate-300">
                                     {/* Timeline Bullet */}
                                     <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white print:ring-transparent"></div>
                                     
                                     {/* Time Label */}
                                     {act.time && (
                                         <div className="text-xs font-black text-blue-600 mb-2 -mt-1 uppercase tracking-wider">
                                             {act.time} Uhr
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

         // --- LEFTOVERS (Places not assigned to any day in this list) ---
         const leftovers = list.filter(p => !assignedIds.has(p.id));
         let renderedLeftovers = null;
         
         if (leftovers.length > 0) {
             renderedLeftovers = (
                 <div key="leftovers" className="mb-6 print:break-inside-avoid mt-8 pt-6 border-t border-slate-200">
                     <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 pb-1 ml-1 flex justify-between">
                       <span>Nicht zugewiesen / Ohne Zeitplan</span>
                       <span className="text-xs text-gray-400">{leftovers.length}</span>
                     </h3>
                     <div className="space-y-3">
                       {leftovers.map(place => (
                         <div key={place.id} id={`card-${place.id}`}>
                             <SightCard 
                                id={place.id} 
                                data={place} 
                                mode="selection" 
                                showPriorityControls={showPlanningMode}
                                detailLevel={overrideDetailLevel}
                             />
                         </div>
                       ))}
                     </div>
                 </div>
             );
         }

         return (
             <>
                {renderedDays}
                {renderedLeftovers}
             </>
         );
    }

    // =========================================================================
    // STANDARD GROUPING (Priority 1: Override, Priority 2: Tours, Priority 4: Category/Alphabetical)
    // =========================================================================
    const groups: Record<string, any[]> = {};
    
    if (groupByOverride === 'city') {
        list.forEach(p => {
            const key = p.city || "Allgemein / Überregional";
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    }
    else if (sortMode === 'tour') {
        const tourGuide = (analysis as any)?.tourGuide;
        const tours = (tourGuide?.guide?.tours || []) as any[];
        const assignedIds = new Set<string>();

        tours.forEach((tour: any) => {
            const title = tour.tour_title || "Tour";
            const tourPlaces = list.filter(p => tour.suggested_order_ids?.includes(p.id));
            if (tourPlaces.length > 0) {
                groups[title] = tourPlaces.sort((a, b) => {
                    return tour.suggested_order_ids.indexOf(a.id) - tour.suggested_order_ids.indexOf(b.id);
                });
                tourPlaces.forEach(p => assignedIds.add(p.id));
            }
        });
        const leftovers = list.filter(p => !assignedIds.has(p.id));
        if (leftovers.length > 0) groups['Weitere Orte (Ohne Tour)'] = leftovers;
    } 
    else {
        list.forEach(p => {
            let key = 'Allgemein';
            if (sortMode === 'category') key = resolveCategoryLabel(p.category) || 'Sonstiges';
            else if (sortMode === 'alphabetical') key = p.name ? p.name[0].toUpperCase() : '?';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    }

    return Object.entries(groups).map(([groupKey, items]) => (
      <div key={groupKey} className="mb-6 last:mb-0 print:break-inside-avoid">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between print:text-black print:border-slate-300">
          <span className="flex items-center gap-2">
              {groupByOverride === 'city' && <span className="text-lg">📍</span>} 
              {groupKey}
          </span>
          <span className="text-xs text-gray-300 print:text-gray-500">{items.length}</span>
        </h3>
        <div className="space-y-3">
          {items.map(place => (
            <div key={place.id} id={`card-${place.id}`}>
                <SightCard 
                   id={place.id} 
                   data={place} 
                   mode="selection" 
                   showPriorityControls={showPlanningMode}
                   detailLevel={overrideDetailLevel}
                />
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="pb-24 sights-view-root print:pb-0">
      
      {/* 1. TOP BAR (Budget/Planning) - HIDDEN IN PRINT */}
      {showPlanningMode && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-10 animate-in fade-in slide-in-from-top-2 print:hidden">
           <div className="flex items-center gap-6 w-full justify-center md:justify-start">
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.budget', { defaultValue: 'Budget' })}</span>
                 <span className="text-xl font-black text-gray-800">{Math.round(budgetStats.total / 60)} h</span>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.planned', { defaultValue: 'Geplant' })}</span>
                 <span className={`text-xl font-black ${budgetStats.remaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                   {Math.round(budgetStats.used / 60)} h
                 </span>
              </div>
              {budgetStats.remaining < 0 && (
                 <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                   ! {t('sights.time_exceeded', { defaultValue: 'Zeit überschritten' })}
                 </span>
              )}
           </div>
           
           <div className="text-xs text-gray-400 font-medium italic hidden md:block">
             {t('sights.planning_active', { defaultValue: 'Planungsmodus aktiv' })}
           </div>
        </div>
      )}

      {/* MAP VIEW vs LIST VIEW */}
      {uiState.viewMode === 'map' && !overrideSortMode ? (
        <div className="mb-8 print:hidden">
            <SightsMapView places={[...filteredLists.main, ...filteredLists.reserve, ...filteredLists.special] as Place[]} />
        </div>
      ) : (
        <>
            {/* LIST 1: CANDIDATES (Main) */}
            <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative mx-4 print:border-none print:shadow-none print:p-0 print:mx-0 print:mb-4">
                <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                    {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {t('sights.candidates', { defaultValue: 'KANDIDATEN' })} ({filteredLists.main.length})
                </div>
                
                <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>

                {isTourMode && filteredLists.special.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 print:mt-4 print:border-none">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between print:text-black">
                            <span>Tour: Sondertage & Ideen</span>
                            <span className="text-xs text-gray-300">{filteredLists.special.length}</span>
                        </h3>
                        <div className="mt-2">
                             {renderGroupedList(filteredLists.special, 'city')}
                        </div>
                    </div>
                )}
            </div>

            {/* LIST 2: RESERVE */}
            {filteredLists.reserve.length > 0 && (
                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 md:p-6 relative opacity-90 hover:opacity-100 transition-opacity mx-4 mb-8 print:border print:border-gray-200 print:bg-transparent print:mx-0">
                    <div className="absolute -top-3 left-6 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                    <Filter className="w-3 h-3" />
                    {t('sights.reserve', { defaultValue: 'RESERVE / WENIGER PASSEND' })} ({filteredLists.reserve.length})
                    </div>
                    <div className="hidden print:block font-bold text-gray-500 border-b mb-2 pb-1 text-xs uppercase">Reserve / Weniger passend</div>
                    
                    <div className="mt-2">{renderGroupedList(filteredLists.reserve)}</div>
                </div>
            )}

            {/* LIST 3: SONDERTAGE */}
            {!isTourMode && filteredLists.special.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl border-2 border-amber-200 shadow-sm p-4 md:p-6 relative mx-4 mb-8 print:border-none print:bg-transparent print:p-0 print:mx-0">
                    <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                        <Layout className="w-3 h-3" />
                        SONDERTAGE & IDEEN ({filteredLists.special.length})
                    </div>
                    <div className="hidden print:block font-bold text-black border-b mb-2 pb-1 text-sm uppercase mt-4">Sondertage & Ideen</div>

                    <div className="mt-2">
                        {renderGroupedList(filteredLists.special, 'city')}
                    </div>
                </div>
            )}
        </>
      )}

      <SightFilterModal 
         isOpen={isSightFilterOpen}
         onClose={toggleSightFilter}
         categoryOptions={categoryOptions}
         tourOptions={tourOptions}
         dayOptions={dayOptions}
         activeSortMode={activeSortMode}
         onSortModeChange={handleViewModeChange}
         showPlanningMode={showPlanningMode}
         onTogglePlanningMode={() => setUIState({ showPlanningMode: !showPlanningMode })}
      />

    </div>
  );
};
// --- END OF FILE 423 Zeilen ---
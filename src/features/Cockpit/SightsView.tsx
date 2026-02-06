// 06.02.2026 17:20 - FEAT: Added 'overrideSortMode' prop for Print Report flexibility.
// 06.02.2026 17:15 - FIX: Print Optimization (Double-Instance-Fix & Clean Layout).
// 02.02.2026 13:15 - FIX: Enforced City Grouping for 'Specials' in Tour Mode.
// 06.02.2026 17:30 - FIX: Fulltext Search (Deep Search in all fields).
// 07.02.2026 15:00 - FIX: IGNORE FILTERS IN PRINT MODE.
// src/features/Cockpit/SightsView.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { SightFilterModal } from './SightFilterModal'; 
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode, Place } from '../../core/types'; 
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

// NEW: Interface for Props
interface SightsViewProps {
  overrideSortMode?: 'category' | 'tour' | 'day' | 'alphabetical';
}

export const SightsView: React.FC<SightsViewProps> = ({ overrideSortMode }) => {
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

  const [showPlanningMode, setShowPlanningMode] = useState(false);

  // LOGIC: Determine effective sort mode (Prop > State)
  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';
  const isTourMode = activeSortMode === 'tour';

  // FIX: AUTO-SCROLL LOGIC
  useEffect(() => {
    // Disable auto-scroll if we are in override mode (Print)
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
          if (day.aktivitaeten) {
              count = day.aktivitaeten.filter((akt: any) => 
                    places.some((p: any) => p.id === akt.original_sight_id)
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

    // FIX: Use prop override or store state (Print vs Screen)
    const isPrint = !!overrideSortMode || uiState.isPrintMode;
    
    const term = isPrint ? '' : (uiState.searchTerm || '').toLowerCase();
    const activeFilters = isPrint ? [] : (uiState.categoryFilter || []); 
    
    // FIX: Use derived activeSortMode instead of uiState.sortMode
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
              p.name,
              p.official_name,
              p.category,
              p.userSelection?.customCategory,
              p.description,
              p.shortDesc,
              p.detailContent,
              p.reasoning,
              p.logistics,
              p.address
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
                  return day?.aktivitaeten?.some((a: any) => a.original_sight_id === p.id);
              });
              if (!inSelectedDay) return;
          }
      }

      const rating = p.rating || 0;
      const duration = p.duration || p.min_duration_minutes || 0;
      
      const isReserve = (p.userPriority === -1) || 
                        (duration < minDuration) || 
                        (rating > 0 && rating < minRating);
      
      if (cat === 'special') {
          specialList.push(p);
      } else if (isReserve) {
          reserveList.push(p);
      } else {
          mainList.push(p);
      }
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

    // FIX: Use derived activeSortMode
    const sortMode = activeSortMode;
    const groups: Record<string, any[]> = {};
    
    // PRIORITY 1: OVERRIDE
    if (groupByOverride === 'city') {
        list.forEach(p => {
            const key = p.city || "Allgemein / Überregional";
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    }
    // PRIORITY 2: TOURS
    else if (sortMode === 'tour') {
        const tourGuide = (analysis as any)?.tourGuide;
        const tours = (tourGuide?.guide?.tours || []) as any[];
        const assignedIds = new Set<string>();

        // 1. Assign to defined tours
        tours.forEach((tour: any) => {
            const title = tour.tour_title || "Tour";
            const tourPlaces = list.filter(p => tour.suggested_order_ids?.includes(p.id));
            
            if (tourPlaces.length > 0) {
                groups[title] = tourPlaces.sort((a, b) => {
                    const idxA = tour.suggested_order_ids.indexOf(a.id);
                    const idxB = tour.suggested_order_ids.indexOf(b.id);
                    return idxA - idxB;
                });
                tourPlaces.forEach(p => assignedIds.add(p.id));
            }
        });

        // 2. Leftovers (Standard)
        const leftovers = list.filter(p => !assignedIds.has(p.id));
        if (leftovers.length > 0) {
            groups['Weitere Orte (Ohne Tour)'] = leftovers;
        }
    } 
    // PRIORITY 3: DAYS
    else if (sortMode === 'day') {
         const days = project.itinerary?.days || [];
         const assignedIds = new Set<string>();

         days.forEach((day: any, i: number) => {
             const title = `${t('sights.day', {defaultValue: 'Tag'})} ${i + 1}`;
             const dayPlaces = list.filter(p => 
                  day.aktivitaeten?.some((a: any) => a.original_sight_id === p.id)
             );

             if (dayPlaces.length > 0) {
                 groups[title] = dayPlaces;
                 dayPlaces.forEach(p => assignedIds.add(p.id));
             }
         });

         const leftovers = list.filter(p => !assignedIds.has(p.id));
         if (leftovers.length > 0) {
            groups['Nicht zugewiesen'] = leftovers;
         }
    }
    // PRIORITY 4: STANDARD
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
                />
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    // FIX: Added 'sights-view-root' for print control (hides background instance)
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

      {/* FIX: Conditional Rendering for Map View - Only if NOT printing */}
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
                
                {/* Standard Main List */}
                <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>

                {/* FIX: IN TOUR MODE, APPEND SPECIALS HERE AS A 'TOUR' */}
                {isTourMode && filteredLists.special.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 print:mt-4 print:border-none">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between print:text-black">
                            <span>Tour: Sondertage & Ideen</span>
                            <span className="text-xs text-gray-300">{filteredLists.special.length}</span>
                        </h3>
                        {/* FIX: Use 'renderGroupedList' with 'city' override to group Specials by City in Tour Mode */}
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
                    {/* Print Header replacement */}
                    <div className="hidden print:block font-bold text-gray-500 border-b mb-2 pb-1 text-xs uppercase">Reserve / Weniger passend</div>
                    
                    <div className="mt-2">{renderGroupedList(filteredLists.reserve)}</div>
                </div>
            )}

            {/* LIST 3: SONDERTAGE (STANDARD MODE ONLY) */}
            {!isTourMode && filteredLists.special.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl border-2 border-amber-200 shadow-sm p-4 md:p-6 relative mx-4 mb-8 print:border-none print:bg-transparent print:p-0 print:mx-0">
                    <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                        <Layout className="w-3 h-3" />
                        SONDERTAGE & IDEEN ({filteredLists.special.length})
                    </div>
                     {/* Print Header replacement */}
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
         onTogglePlanningMode={() => setShowPlanningMode(!showPlanningMode)}
      />

    </div>
  );
};
// --- END OF FILE 650 Zeilen ---
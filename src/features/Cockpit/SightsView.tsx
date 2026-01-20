// 21.01.2026 03:00 - FIX: Connected 'Planning Mode' Props to SightFilterModal (Switch was unresponsive).
// src/features/Cockpit/SightsView.tsx
// 21.01.2026 01:50 - REFACTOR: Integrated 'SightFilterModal' & Removed Legacy Code.
// 21.01.2026 01:10 - FEAT: Redesigned Filter Modal with View Switcher (Category/Tour/Day/Alpha) & Dynamic Filter Chips.
// 20.01.2026 23:50 - FIX: Filter out 'Appendix' categories & Localize Labels in SightsView.

import React, { useMemo, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { SightFilterModal } from './SightFilterModal'; // FIX: New Import
import { useTranslation } from 'react-i18next';
// FIX: Import Data & Constants for Label Lookup and Filtering
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode } from '../../core/types';

import { 
  FileText,
  Briefcase, 
  Sun,
  CloudRain,
  Layout,
  Filter
} from 'lucide-react';

const TRAVEL_PACE_CONFIG: Record<string, { startHour: number; endHour: number; breakMinutes: number; bufferMinutes: number }> = {
  'fast': { startHour: 8, endHour: 19, breakMinutes: 60, bufferMinutes: 0 }, 
  'balanced': { startHour: 9.5, endHour: 17, breakMinutes: 90, bufferMinutes: 45 }, 
  'relaxed': { startHour: 10, endHour: 16, breakMinutes: 90, bufferMinutes: 45 } 
};

export const SightsView: React.FC = () => {
  const { t, i18n } = useTranslation(); // FIX: i18n for language detection
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
  
  // FIX: Helper to resolve Label (city_info -> Stadt-Infos)
  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "";
    
    // Versuch 1: Lookup in INTEREST_DATA
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }

    // Fallback: Wenn es keine ID ist, sondern schon Text (Legacy)
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
         // V40: duration (or check old key fallback)
         const dur = p.duration || p.min_duration_minutes || 60;
         totalMinutes += dur;
      }
    });

    return { total: totalBudget, used: totalMinutes, remaining: totalBudget - totalMinutes };
  }, [userInputs, places]);

  // --- 2. DATA PREPARATION (Filters & Counts) ---
  
  // A. Categories
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

  // B. Tours
  const tourOptions = useMemo(() => {
      const tourGuide = (analysis as any)?.tourGuide;
      const tours = tourGuide?.guide?.tours || [];
      
      return tours.map((tour: any) => {
          // Count places in this tour that exist in our main 'places' list
          const count = (tour.suggested_order_ids || []).filter((id: string) => 
              places.some((p: any) => p.id === id)
          ).length;
          
          return {
              id: tour.tour_title || "Tour", // ID is the Title for filtering
              label: tour.tour_title || "Tour",
              count: count,
              placeIds: tour.suggested_order_ids || []
          };
      }).filter((t: any) => t.count > 0);
  }, [analysis, places]);

  // C. Days
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
              id: label, // Use Label as ID for simplicity in filter array
              label: label,
              count: count,
              // Store IDs to help filtering later if needed, though we filter by day assignment usually
              // For now, filtering by 'Tag 1' means checking the itinerary.
              dayIndex: index
          };
      }).filter((d: any) => d.count > 0);
  }, [project.itinerary, places]);

  const handleViewModeChange = (mode: string) => {
      // Clear filters when switching view mode to avoid confusion
      setUIState({ 
          sortMode: mode as any,
          categoryFilter: [] 
      });
  };

  // --- 3. FILTER & SORT LOGIC ---
  const filteredLists = useMemo(() => {
    const mainList: any[] = [];
    const reserveList: any[] = [];
    const term = uiState.searchTerm.toLowerCase();
    const activeFilters = uiState.categoryFilter || []; // Generic filters
    const sortMode = uiState.sortMode || 'category';

    // FIX: Ignore List for Guide View
    const ignoreList = APPENDIX_ONLY_INTERESTS || [];

    const minRating = userInputs.searchSettings?.minRating || 0;
    const minDuration = userInputs.searchSettings?.minDuration || 0;

    places.forEach((p: any) => {
      // V40: Name & Category
      const cat = p.category || 'Sonstiges';
      const name = p.name || '';

      // FIX: Hard Filter for Appendix Categories
      if (ignoreList.includes(cat)) {
          return; // Skip this item in Guide View
      }

      // 1. Search Filter
      if (term && !name.toLowerCase().includes(term) && !cat.toLowerCase().includes(term)) {
        return; 
      }
      
      // 2. Context Filter (Category / Tour / Day)
      if (activeFilters.length > 0) {
          if (sortMode === 'category') {
              if (!activeFilters.includes(cat)) return;
          }
          else if (sortMode === 'tour') {
              // Check if place is in any selected tour
              // We need to match the tour title (which is the filter ID)
              const inSelectedTour = tourOptions.some(tour => 
                  activeFilters.includes(tour.id) && tour.placeIds.includes(p.id)
              );
              if (!inSelectedTour) return;
          }
          else if (sortMode === 'day') {
              // Check if place is in any selected day
              const itineraryDays = project.itinerary?.days || [];
              // activeFilters contains "Tag 1", "Tag 2"
              const inSelectedDay = activeFilters.some(dayLabel => {
                  const dayIndexStr = dayLabel.replace(/[^0-9]/g, '');
                  const dayIndex = parseInt(dayIndexStr) - 1;
                  const day = itineraryDays[dayIndex];
                  return day?.aktivitaeten?.some((a: any) => a.original_sight_id === p.id);
              });
              if (!inSelectedDay) return;
          }
      }

      // V40: rating / duration
      const rating = p.rating || 0;
      const duration = p.duration || p.min_duration_minutes || 0;
      
      const isReserve = (p.userPriority === -1) || 
                        (duration < minDuration) || 
                        (rating > 0 && rating < minRating);
      
      if (isReserve) {
        reserveList.push(p);
      } else {
        mainList.push(p);
      }
    });

    const sortFn = (a: any, b: any) => {
      if (sortMode === 'alphabetical') return a.name.localeCompare(b.name);
      return (a.category || '').localeCompare(b.category || '');
    };

    return { main: mainList.sort(sortFn), reserve: reserveList.sort(sortFn) };
  }, [places, uiState.searchTerm, uiState.categoryFilter, uiState.sortMode, userInputs.searchSettings, tourOptions, project.itinerary]);


  // --- 4. RENDERER: SONDERTAGE (V40 Adapted) ---
  const renderSondertage = () => {
    const ideenScout = (analysis as any)?.ideenScout;
    
    if (!ideenScout || (!ideenScout.sunny_day_ideas && !ideenScout.rainy_day_ideas)) return null;

    return (
      <div className="mb-8 space-y-6 animate-in fade-in">
         {/* We assume one set of ideas for the main location */}
         <div className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-slate-400" />
              Flexible Ideen (Special Days)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* SUNNY */}
               <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3 text-amber-700 font-semibold border-b border-amber-200/50 pb-2">
                     <Sun className="w-4 h-4" /> Bei Sonnenschein
                  </div>
                  <div className="space-y-3">
                     {(ideenScout.sunny_day_ideas || []).map((idee: any, i: number) => (
                        <div key={i} className="bg-white p-2.5 rounded border border-amber-100 shadow-sm text-sm">
                           <div className="font-bold text-slate-800">{idee.name}</div>
                           <p className="text-xs text-slate-600 mt-1">{idee.description}</p>
                           {idee.planning_note && (
                              <div className="mt-2 text-[10px] bg-amber-50 text-amber-800 p-1.5 rounded">
                                 💡 {idee.planning_note}
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>

               {/* RAINY */}
               <div className="bg-slate-100/50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3 text-slate-600 font-semibold border-b border-slate-200 pb-2">
                     <CloudRain className="w-4 h-4" /> Bei Regen
                  </div>
                  <div className="space-y-3">
                     {(ideenScout.rainy_day_ideas || []).map((idee: any, i: number) => (
                        <div key={i} className="bg-white p-2.5 rounded border border-slate-200 shadow-sm text-sm">
                           <div className="font-bold text-slate-800">{idee.name}</div>
                           <p className="text-xs text-slate-600 mt-1">{idee.description}</p>
                           {idee.planning_note && (
                              <div className="mt-2 text-[10px] bg-slate-50 text-slate-600 p-1.5 rounded">
                                 ☂️ {idee.planning_note}
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };


  // --- 5. RENDER GROUPED LIST (V40 Tours) ---
  const renderGroupedList = (list: any[]) => {
    if (list.length === 0) return <p className="text-gray-400 italic p-4">{t('sights.no_places', { defaultValue: 'Keine Orte gefunden.' })}</p>;

    const sortMode = uiState.sortMode || 'category';
    const groups: Record<string, any[]> = {};
    
    // CASE: TOURS (V40)
    if (sortMode === 'tour') {
        const tourGuide = (analysis as any)?.tourGuide;
        const tours = tourGuide?.guide?.tours || []; // V40 Path
        const assignedIds = new Set<string>();

        // 1. Assign to defined tours
        tours.forEach((tour: any) => {
            const title = tour.tour_title || "Tour";
            // Filter places in this list that match the tour IDs
            const tourPlaces = list.filter(p => tour.suggested_order_ids?.includes(p.id));
            
            if (tourPlaces.length > 0) {
                // Sort by occurrence in tour definition
                groups[title] = tourPlaces.sort((a, b) => {
                    const idxA = tour.suggested_order_ids.indexOf(a.id);
                    const idxB = tour.suggested_order_ids.indexOf(b.id);
                    return idxA - idxB;
                });
                tourPlaces.forEach(p => assignedIds.add(p.id));
            }
        });

        // 2. Leftovers
        const leftovers = list.filter(p => !assignedIds.has(p.id));
        if (leftovers.length > 0) {
            groups['Weitere Orte (Ohne Tour)'] = leftovers;
        }

    } 
    // CASE: DAYS
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
    // CASE: STANDARD (Category / Alphabetical)
    else {
        list.forEach(p => {
            let key = 'Allgemein';
            // FIX: Use resolved label for grouping title (city_info -> Stadt-Infos)
            if (sortMode === 'category') key = resolveCategoryLabel(p.category) || 'Sonstiges';
            else if (sortMode === 'alphabetical') key = p.name ? p.name[0].toUpperCase() : '?';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    }

    return Object.entries(groups).map(([groupKey, items]) => (
      <div key={groupKey} className="mb-6 last:mb-0">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between">
          <span>{groupKey}</span>
          <span className="text-xs text-gray-300">{items.length}</span>
        </h3>
        <div className="space-y-3">
          {items.map(place => (
            <SightCard 
               key={place.id} 
               id={place.id} // SightCard expects 'id' separate prop in legacy
               data={place} 
               mode="selection" 
               showPriorityControls={showPlanningMode}
            />
          ))}
        </div>
      </div>
    ));
  };

  // --- MAIN RENDER ---
  const activeSortMode = uiState.sortMode || 'category';

  return (
    <div className="pb-24">
      
      {/* 1. TOP BAR */}
      {showPlanningMode && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-10 animate-in fade-in slide-in-from-top-2">
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

      {/* 2. SONDERTAGE */}
      {renderSondertage()}

      {/* 3. LISTS */}
      
      <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative">
        <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
           {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
           {t('sights.candidates', { defaultValue: 'KANDIDATEN' })} ({filteredLists.main.length})
        </div>
        <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>
      </div>

      {filteredLists.reserve.length > 0 && (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 md:p-6 relative opacity-90 hover:opacity-100 transition-opacity">
           <div className="absolute -top-3 left-6 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
             <Filter className="w-3 h-3" />
             {t('sights.reserve', { defaultValue: 'RESERVE / WENIGER PASSEND' })} ({filteredLists.reserve.length})
           </div>
           <div className="mt-2">{renderGroupedList(filteredLists.reserve)}</div>
        </div>
      )}

      {/* 4. NEW FILTER MODAL OVERLAY */}
      <SightFilterModal 
         isOpen={isSightFilterOpen}
         onClose={toggleSightFilter}
         categoryOptions={categoryOptions}
         tourOptions={tourOptions}
         dayOptions={dayOptions}
         activeSortMode={activeSortMode}
         onSortModeChange={handleViewModeChange}
         // FIX: Pass Props!
         showPlanningMode={showPlanningMode}
         onTogglePlanningMode={() => setShowPlanningMode(!showPlanningMode)}
      />

    </div>
  );
};
// --- END OF FILE 454 Zeilen ---
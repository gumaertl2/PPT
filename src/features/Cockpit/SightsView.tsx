// 22.02.2026 15:15 - FEAT: Added 'Radar' feature (Find Nearest Sight via GPS) with auto-scroll navigation.
// 20.02.2026 20:25 - FIX: Removed unused 'Filter' import from lucide-react (TS6133).
// 20.02.2026 19:40 - UX: Integrated Reserve items into their natural groups (Categories/Tours) and pushed them to the bottom.
// 19.02.2026 23:45 - FIX: Fixed empty Map in Day Mode & added Smart Map Filtering (Selected Day + Unassigned).
// src/features/Cockpit/SightsView.tsx

import React, { useMemo, useEffect, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { SightFilterModal } from './SightFilterModal'; 
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode, Place, DetailLevel } from '../../core/types';
import { SightsMapView } from './SightsMapView';
import { DayPlannerView } from './DayPlannerView'; 

import { 
  FileText,
  Briefcase, 
  Layout,
  Navigation
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

// Helper: Haversine distance in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

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
  
  const [isLocating, setIsLocating] = useState(false);

  const { userInputs, data, analysis } = project; 
  const places = Object.values(data.places || {}) as Place[];

  const showPlanningMode = uiState.showPlanningMode || false;

  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';
  const isTourMode = activeSortMode === 'tour';
  const isDayMode = activeSortMode === 'day';

  // --- AUTO-SCROLL LOGIC ---
  useEffect(() => {
    if (overrideSortMode) return;

    if (uiState.viewMode === 'list' && uiState.selectedPlaceId) {
      setTimeout(() => {
        const element = document.getElementById(`card-${uiState.selectedPlaceId}`);
        if (element) {
          // Add a small offset so the element isn't hidden under the sticky header
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
          
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'transition-all', 'duration-500');
          setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4'), 3000);
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

  // --- RADAR: LOCATE NEAREST SIGHT ---
  const handleLocateNearestSight = () => {
      setIsLocating(true);
      if (!navigator.geolocation) {
          alert(t('finance.error_no_gps', { defaultValue: 'Dein Browser unterstützt kein GPS.' }));
          setIsLocating(false);
          return;
      }

      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const myLat = pos.coords.latitude;
              const myLng = pos.coords.longitude;
              
              let nearestPlaceId: string | null = null;
              let shortestDist = Infinity;

              // Iterate over all available places in current view (we check all, regardless of filter)
              places.forEach(p => {
                  if (p.location && p.location.lat && p.location.lng) {
                      const dist = calculateDistance(myLat, myLng, p.location.lat, p.location.lng);
                      if (dist < shortestDist) {
                          shortestDist = dist;
                          nearestPlaceId = p.id;
                      }
                  }
              });

              if (nearestPlaceId) {
                  // Switch to list view if not already there, reset filter to show all, and select the place
                  setUIState({ 
                      viewMode: 'list', 
                      selectedPlaceId: nearestPlaceId 
                  });
              } else {
                  alert(t('sights.no_places', { defaultValue: 'Keine Orte gefunden.' }));
              }
              setIsLocating(false);
          },
          (err) => {
              console.error(err);
              alert(t('finance.error_gps_failed', { defaultValue: 'GPS konnte nicht abgerufen werden.' }));
              setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
      );
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

    const daysCount = (new Date(userInputs.dates.end).getTime() - new Date(userInputs.dates.start).getTime()) / (1000 * 3600 * 24) + 1;
    const totalBudget = Math.floor(dailyMinutes * daysCount);

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
  }, [project.itinerary, places, t]);

  const handleViewModeChange = (mode: string) => {
      setUIState({ 
          sortMode: mode as any,
          categoryFilter: [] 
      });
  };

  // --- 3. FILTER & SORT LOGIC ---
  const filteredLists = useMemo(() => {
    const mainList: any[] = [];
    const specialList: any[] = []; 

    const isPrint = !!overrideSortMode || uiState.isPrintMode;
    const term = isPrint ? '' : (uiState.searchTerm || '').toLowerCase();
    const activeFilters = isPrint ? [] : (uiState.categoryFilter || []); 
    const sortMode = activeSortMode;
    const selectedCategory = isPrint ? 'all' : uiState.selectedCategory;

    const ignoreList = APPENDIX_ONLY_INTERESTS || [];
    const minRating = userInputs.searchSettings?.minRating || 0;
    const minDuration = userInputs.searchSettings?.minDuration || 0;

    // --- FIX: Day Mode Smart Filtering for the Map ---
    let selectedDayPlaceIds = new Set<string>();
    let otherDayPlaceIds = new Set<string>();

    if (sortMode === 'day' && activeFilters.length > 0) {
        const itineraryDays = project.itinerary?.days || [];
        itineraryDays.forEach((day: any, index: number) => {
            const labelDe = `Tag ${index + 1}`;
            const labelEn = `Day ${index + 1}`;
            const labelTranslated = `${t('sights.day', {defaultValue: 'Tag'})} ${index + 1}`;
            
            const isSelected = activeFilters.includes(labelDe) || activeFilters.includes(labelEn) || activeFilters.includes(labelTranslated);

            (day.activities || day.aktivitaeten || []).forEach((act: any) => {
                const id = act.id || act.original_sight_id;
                if (id) {
                    if (isSelected) selectedDayPlaceIds.add(id);
                    else otherDayPlaceIds.add(id);
                }
            });
        });
    }

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
              // Smart Day Filter: Hide places that belong to OTHER days.
              // Keep places of the SELECTED day AND Unassigned places!
              if (otherDayPlaceIds.has(p.id) && !selectedDayPlaceIds.has(p.id)) {
                  return; 
              }
          }
      }

      const rating = p.rating || 0;
      const duration = p.duration || p.min_duration_minutes || 0;
      const isReserve = (p.userPriority === -1) || (duration < minDuration) || (rating > 0 && rating < minRating);
      
      const placeWithMeta = { ...p, _isReserve: isReserve };

      if (cat === 'special') specialList.push(placeWithMeta);
      else mainList.push(placeWithMeta); 
    });

    const sortFn = (a: any, b: any) => {
      // 1. Force reserves to the bottom within their group
      if (a._isReserve && !b._isReserve) return 1;
      if (!a._isReserve && b._isReserve) return -1;

      // 2. Regular priority sorting
      if (sortMode === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
      const pA = a.userPriority ?? a.userSelection?.priority ?? 0;
      const pB = b.userPriority ?? b.userSelection?.priority ?? 0;
      if (pA !== pB) return pB - pA;
      
      return (a.category || '').localeCompare(b.category || '');
    };

    return { 
        main: mainList.sort(sortFn), 
        special: specialList.sort(sortFn)
    };
  }, [places, uiState.searchTerm, uiState.categoryFilter, activeSortMode, uiState.selectedCategory, uiState.isPrintMode, overrideSortMode, userInputs.searchSettings, tourOptions, project.itinerary, t]);

  // --- 4. RENDERER: GROUPED LIST ---
  const renderGroupedList = (list: any[], groupByOverride?: 'city') => {
    if (list.length === 0) return null; 
    const sortMode = activeSortMode;

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
                // Keep the AI suggestion order for the tour, but push reserves to the end
                groups[title] = tourPlaces.sort((a, b) => {
                    if (a._isReserve && !b._isReserve) return 1;
                    if (!a._isReserve && b._isReserve) return -1;
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
                   isReserve={place._isReserve} 
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

      {/* MAP VIEW vs DAY VIEW vs LIST VIEW */}
      {uiState.viewMode === 'map' && !overrideSortMode ? (
        <div className="mb-8 print:hidden">
            <SightsMapView places={[...filteredLists.main, ...filteredLists.special] as Place[]} />
        </div>
      ) : isDayMode ? (
        <div className="mb-8">
            <DayPlannerView 
                places={places} 
                showPlanningMode={showPlanningMode} 
                overrideDetailLevel={overrideDetailLevel} 
            />
        </div>
      ) : (
        <>
            {/* LIST 1: CANDIDATES & RESERVE */}
            <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative mx-4 print:border-none print:shadow-none print:p-0 print:mx-0 print:mb-4">
                <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden z-10">
                    {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {t('sights.candidates', { defaultValue: 'ORTE & KANDIDATEN' })} ({filteredLists.main.length})
                </div>

                {/* NEW: RADAR ACTION BUTTON */}
                {!overrideSortMode && (
                    <div className="flex justify-end mb-4 print:hidden pt-2">
                        <button 
                            onClick={handleLocateNearestSight}
                            disabled={isLocating}
                            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border ${isLocating ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent hover:shadow-md'}`}
                        >
                            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? 'Ortung läuft...' : 'Radar: Was ist in meiner Nähe?'}
                        </button>
                    </div>
                )}
                
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

            {/* LIST 2: SONDERTAGE */}
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
// --- END OF FILE 436 Zeilen ---
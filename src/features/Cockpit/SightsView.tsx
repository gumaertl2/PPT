// 27.02.2026 19:35 - LOGIC: Fixed budget calculation to use net days (-2), subtract breaks, and add 30min logistics overhead per sight.
// 27.02.2026 19:25 - UX: Implemented true "Freeze Mode" via useRef to prevent cards from jumping or disappearing during Planning Mode.
// 27.02.2026 14:45 - UX: Froze priority and reserve sorting.
// src/features/Cockpit/SightsView.tsx

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { SightFilterModal } from './SightFilterModal'; 
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode, Place, DetailLevel } from '../../core/types';
import { SightsMapView } from './SightsMapView';
import { DayPlannerView } from './DayPlannerView'; 
import { LiveScout } from '../../services/LiveScout'; 

import { 
  FileText,
  Briefcase, 
  Layout,
  Navigation,
  Zap,
  RefreshCw
} from 'lucide-react';

const TRAVEL_PACE_CONFIG: Record<string, { startHour: number; endHour: number; breakMinutes: number; bufferMinutes: number }> = {
  'fast': { startHour: 8, endHour: 19, breakMinutes: 60, bufferMinutes: 0 }, 
  'balanced': { startHour: 9.5, endHour: 17, breakMinutes: 90, bufferMinutes: 45 }, 
  'relaxed': { startHour: 10, endHour: 16, breakMinutes: 90, bufferMinutes: 45 } 
};

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

// HELPER: Map React-State (userPriority/isFixed) to a clean 0-4 scale for grouping & sorting
const getRealPriorityValue = (p: any): number => {
    if (p.isFixed) return 4;               // Fix
    if (p.userPriority === 1) return 3;    // Prio 1
    if (p.userPriority === 2) return 2;    // Prio 2
    if (p.userPriority === -1) return 0;   // Ignore
    return 1;                              // Ohne Prio
};

export const SightsView: React.FC<{ overrideSortMode?: any, overrideDetailLevel?: DetailLevel }> = ({ overrideSortMode, overrideDetailLevel }) => {
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
  const [isLiveChecking, setIsLiveChecking] = useState(false);
  const [liveCheckProgress, setLiveCheckProgress] = useState({ current: 0, total: 0 });

  const { userInputs, data, analysis } = project; 
  const places = Object.values(data.places || {}) as Place[];

  const showPlanningMode = uiState.showPlanningMode || false;
  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';
  const isTourMode = activeSortMode === 'tour';
  const isDayMode = activeSortMode === 'day';

  // UX FIX: Freeze Reference Cache for Planning Mode
  const frozenMetaRef = useRef<Record<string, any>>({});

  useEffect(() => {
      // Clear the cache whenever Planning Mode is turned OFF
      if (!showPlanningMode) {
          frozenMetaRef.current = {};
      }
  }, [showPlanningMode]);

  useEffect(() => {
    if (overrideSortMode) return;

    if (uiState.viewMode === 'list' && uiState.selectedPlaceId) {
      setTimeout(() => {
        const element = document.getElementById(`card-${uiState.selectedPlaceId}`);
        if (element) {
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
    if (catId === 'hotel') return t('interests.hotel', { defaultValue: 'Hotels' });
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };

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
                  setUIState({ viewMode: 'list', selectedPlaceId: nearestPlaceId });
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

  // BUDGET CALCULATION: Always uses live data so the progress bar updates instantly!
  const budgetStats = useMemo(() => {
    let totalMinutes = 0;
    const pace = userInputs.pace || 'balanced';
    const config = TRAVEL_PACE_CONFIG[pace] || TRAVEL_PACE_CONFIG['balanced'];
    
    const start = new Date(`2000-01-01T${userInputs.dates?.dailyStartTime || '09:00'}`); 
    const end = new Date(`2000-01-01T${userInputs.dates?.dailyEndTime || '18:00'}`);
    let dailyMinutes = (end.getTime() - start.getTime()) / 60000;
    
    if (isNaN(dailyMinutes) || dailyMinutes <= 0) {
        dailyMinutes = (config.endHour - config.startHour) * 60;
    }
    // NEU: Ziehe immer die Mittagspause/Breaks vom Netto-Tagesbudget ab
    dailyMinutes = Math.max(0, dailyMinutes - config.breakMinutes);

    const daysCountRaw = (new Date(userInputs.dates.end).getTime() - new Date(userInputs.dates.start).getTime()) / (1000 * 3600 * 24) + 1;
    // NEU: Ziehe 2 Tage für An- und Abreise ab (Minimum 1 Tag)
    const daysCount = Math.max(1, daysCountRaw - 2);
    
    const totalBudget = Math.floor(dailyMinutes * daysCount);

    places.forEach((p: any) => {
      const prio = p.userPriority || 0;
      if (prio > 0 || p.isFixed) {
         const dur = p.duration || p.min_duration_minutes || 60;
         // NEU: Pauschal 30 Minuten Logistik-/Fahrtzeit pro Ort aufschlagen
         totalMinutes += (dur + 30);
      }
    });

    return { total: totalBudget, used: totalMinutes, remaining: totalBudget - totalMinutes };
  }, [userInputs, places]);

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const ignoreList = APPENDIX_ONLY_INTERESTS || [];
    places.forEach((p: any) => {
      const cat = p.category || 'Sonstiges';
      if (!ignoreList.includes(cat) || cat === 'hotel') { 
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
              label: t('sights.tour_special', { defaultValue: 'Tour: Sondertage & Ideen' }),
              count: specialPlaces.length,
              placeIds: specialPlaces.map((p: any) => p.id)
          });
      }

      return mappedTours;
  }, [analysis, places, t]);

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
          return { id: label, label: label, count: count, dayIndex: index };
      }).filter((d: any) => d.count > 0);
  }, [project.itinerary, places, t]);

  // PRIORITY BADGES: Always uses live data so counts update instantly
  const priorityOptions = useMemo(() => {
    const counts: Record<string, number> = { '4': 0, '3': 0, '2': 0, '1': 0, '0': 0 };
    places.forEach((p: any) => {
        counts[String(getRealPriorityValue(p))]++;
    });
    return [
        { id: '4', label: t('sights.must_see', { defaultValue: '⭐️ Muss ich sehen (Fix)' }), count: counts['4'] },
        { id: '3', label: t('sights.prio_1', { defaultValue: '🥇 Prio 1' }), count: counts['3'] },
        { id: '2', label: t('sights.prio_2', { defaultValue: '🥈 Prio 2' }), count: counts['2'] },
        { id: '1', label: t('sights.no_prio', { defaultValue: '⚪️ Ohne Prio' }), count: counts['1'] },
        { id: '0', label: t('sights.ignored', { defaultValue: '❌ Ignoriert' }), count: counts['0'] }
    ].filter(o => o.count > 0);
  }, [places, t]);

  const handleViewModeChange = (mode: string) => {
      setUIState({ sortMode: mode as any, categoryFilter: [] });
  };

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

    const seenIds = new Set<string>();
    const uniquePlaces = places.filter(p => {
        if (!p.id || seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
    });

    let selectedDayPlaceIds = new Set<string>();
    let otherDayPlaceIds = new Set<string>();

    if (sortMode === 'day' && activeFilters.length > 0) {
        const itineraryDays = project.itinerary?.days || [];
        itineraryDays.forEach((day: any, index: number) => {
            const labelTranslated = `${t('sights.day', {defaultValue: 'Tag'})} ${index + 1}`;
            const isSelected = activeFilters.includes(`Tag ${index+1}`) || activeFilters.includes(`Day ${index+1}`) || activeFilters.includes(labelTranslated);
            (day.activities || day.aktivitaeten || []).forEach((act: any) => {
                const id = act.id || act.original_sight_id;
                if (id) {
                    if (isSelected) selectedDayPlaceIds.add(id);
                    else otherDayPlaceIds.add(id);
                }
            });
        });
    }

    // HELPER: Lazy-Freeze Meta Extraction
    const getMeta = (p: any) => {
        const duration = p.duration || p.min_duration_minutes || 0;
        const rating = p.rating || 0;
        const currentPrioVal = getRealPriorityValue(p);
        const currentIsReserve = (p.userPriority === -1) || (duration < minDuration) || (rating > 0 && rating < minRating);
        const currentCat = p.category || 'Sonstiges';
        const currentName = p.name || '';

        // If NOT in planning mode, always return fresh data
        if (!showPlanningMode) {
            return { prioVal: currentPrioVal, isReserve: currentIsReserve, cat: currentCat, name: currentName };
        }

        // If in planning mode, freeze the data on first access
        if (!frozenMetaRef.current[p.id]) {
            frozenMetaRef.current[p.id] = { prioVal: currentPrioVal, isReserve: currentIsReserve, cat: currentCat, name: currentName };
        }

        return frozenMetaRef.current[p.id];
    };

    uniquePlaces.forEach((p: any) => {
      const meta = getMeta(p);
      const cat = meta.cat;

      if (ignoreList.includes(cat) && cat !== 'hotel') return; 

      if (term) {
          const searchableText = [p.name, p.official_name, p.category, p.description, p.detailContent, p.address].filter(Boolean).join(' ').toLowerCase();
          if (!searchableText.includes(term)) return;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
          const pCat = p.userSelection?.customCategory || cat;
          if (pCat !== selectedCategory) return;
      }

      if (activeFilters.length > 0) {
          if (sortMode === 'category' && !activeFilters.includes(cat)) return;
          else if (sortMode === 'priority') {
              const prioValStr = String(meta.prioVal); // Uses FROZEN priority for filter stability
              if (!activeFilters.includes(prioValStr)) return;
          }
          else if (sortMode === 'tour') {
              const inSelectedTour = tourOptions.some((tour: any) => activeFilters.includes(tour.id) && tour.placeIds.includes(p.id));
              if (!inSelectedTour) return;
          }
          else if (sortMode === 'day' && otherDayPlaceIds.has(p.id) && !selectedDayPlaceIds.has(p.id)) return;
      }

      // UX: Calculate live reserve status just for visual greying-out (opacity), 
      // but use the frozen `meta` for strict list ordering.
      const liveDuration = p.duration || p.min_duration_minutes || 0;
      const liveRating = p.rating || 0;
      const liveIsReserve = (p.userPriority === -1) || (liveDuration < minDuration) || (liveRating > 0 && liveRating < minRating);

      const placeWithMeta = { ...p, _meta: meta, _liveIsReserve: liveIsReserve };

      if (cat === 'special') specialList.push(placeWithMeta);
      else mainList.push(placeWithMeta); 
    });

    const sortFn = (a: any, b: any) => {
      const aMeta = a._meta;
      const bMeta = b._meta;

      if (sortMode === 'alphabetical') return aMeta.name.localeCompare(bMeta.name);
      
      // UX-FIX: Use frozen `isReserve` and `prioVal` so elements never jump during Planning Mode
      if (aMeta.isReserve && !bMeta.isReserve) return 1;
      if (!aMeta.isReserve && bMeta.isReserve) return -1;
      
      if (aMeta.prioVal !== bMeta.prioVal) return bMeta.prioVal - aMeta.prioVal; 

      const catCompare = aMeta.cat.localeCompare(bMeta.cat);
      if (catCompare !== 0) return catCompare;

      return aMeta.name.localeCompare(bMeta.name);
    };

    return { main: mainList.sort(sortFn), special: specialList.sort(sortFn) };
  }, [places, uiState.searchTerm, uiState.categoryFilter, activeSortMode, uiState.selectedCategory, uiState.isPrintMode, overrideSortMode, userInputs.searchSettings, tourOptions, project.itinerary, t, showPlanningMode]);

  const handleBatchLiveCheck = async () => {
      if (isLiveChecking) return;
      const now = Date.now();
      const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;

      const candidates = [...filteredLists.main, ...filteredLists.special].filter(p => {
          if (p.category === 'internal') return false;
          if (!p.liveStatus) return true;
          const lastCheckedTime = new Date(p.liveStatus.lastChecked).getTime();
          return (now - lastCheckedTime) > fourWeeksMs;
      }).map(p => p.id);

      if (candidates.length === 0) {
          alert(t('sights.live_check_up_to_date', { defaultValue: 'Alle aktuell angezeigten Orte sind bereits auf dem neuesten Stand (jünger als 4 Wochen).' }));
          return;
      }

      setIsLiveChecking(true);
      setLiveCheckProgress({ current: 0, total: candidates.length });
      try {
          await LiveScout.verifyBatch(candidates, (curr, total) => {
              setLiveCheckProgress({ current: curr, total });
          });
      } catch (err) {
          console.error("Batch Live Check failed", err);
      } finally {
          setIsLiveChecking(false);
      }
  };

  const renderGroupedList = (list: any[], groupByOverride?: 'city') => {
    if (list.length === 0) return null; 
    const sortMode = activeSortMode;
    const groups: Record<string, any[]> = {};
    
    list.forEach(p => {
        const meta = p._meta; // Use frozen meta for robust grouping

        if (groupByOverride === 'city') {
            const key = p.city || t('sights.group_general_regional', { defaultValue: 'Allgemein / Überregional' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
        else if (sortMode === 'priority') {
            const val = meta.prioVal;
            let key = t('sights.no_prio', { defaultValue: '⚪️ Ohne Priorität' });
            if (val === 4) key = t('sights.must_see', { defaultValue: '⭐️ Muss ich sehen (Fix)' });
            if (val === 3) key = t('sights.prio_1', { defaultValue: '🥇 Prio 1' });
            if (val === 2) key = t('sights.prio_2', { defaultValue: '🥈 Prio 2' });
            if (val === 0) key = t('sights.ignored', { defaultValue: '❌ Reserve / Ignoriert' });
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
        else if (sortMode === 'tour') {
            const tourGuide = (analysis as any)?.tourGuide;
            const tours = (tourGuide?.guide?.tours || []) as any[];
            const assignedIds = new Set<string>();
            tours.forEach((tour: any) => {
                const title = tour.tour_title || "Tour";
                const tourPlaces = list.filter(lp => tour.suggested_order_ids?.includes(lp.id));
                if (tourPlaces.length > 0) {
                    groups[title] = tourPlaces.sort((a, b) => (tour.suggested_order_ids.indexOf(a.id) - tour.suggested_order_ids.indexOf(b.id)));
                    tourPlaces.forEach(lp => assignedIds.add(lp.id));
                }
            });
            const leftovers = list.filter(lp => !assignedIds.has(lp.id));
            if (leftovers.length > 0) groups[t('sights.group_other_tour', { defaultValue: 'Weitere Orte (Ohne Tour)' })] = leftovers;
        } 
        else {
            let key = t('sights.group_general', { defaultValue: 'Allgemein' });
            if (sortMode === 'category') key = resolveCategoryLabel(meta.cat);
            else if (sortMode === 'alphabetical') key = meta.name ? meta.name[0].toUpperCase() : '?';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
    });

    const groupKeys = Object.keys(groups);
    if (sortMode === 'priority') {
        const priorityOrder = [
          t('sights.must_see', { defaultValue: '⭐️ Muss ich sehen (Fix)' }),
          t('sights.prio_1', { defaultValue: '🥇 Prio 1' }),
          t('sights.prio_2', { defaultValue: '🥈 Prio 2' }),
          t('sights.no_prio', { defaultValue: '⚪️ Ohne Priorität' }),
          t('sights.ignored', { defaultValue: '❌ Reserve / Ignoriert' })
        ];
        groupKeys.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
    }

    return groupKeys.map((groupKey) => {
      const items = groups[groupKey];
      return (
        <div key={groupKey} className="mb-6 last:mb-0 print:break-inside-avoid">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between print:text-black">
            <span className="flex items-center gap-2">{groupByOverride === 'city' && <span className="text-lg">📍</span>}{groupKey}</span>
            <span className="text-xs text-gray-300 print:text-gray-500">{items.length}</span>
          </h3>
          <div className="space-y-3">
            {items.map(place => (
              <div key={place.id} id={`card-${place.id}`}>
                  {/* UX: Passing _liveIsReserve allows instant visual feedback (grey out) without changing list position! */}
                  <SightCard id={place.id} data={place} mode="selection" showPriorityControls={showPlanningMode} detailLevel={overrideDetailLevel} isReserve={place._liveIsReserve} />
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="pb-24 sights-view-root print:pb-0">
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
                 <span className={`text-xl font-black ${budgetStats.remaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>{Math.round(budgetStats.used / 60)} h</span>
              </div>
              {budgetStats.remaining < 0 && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">! {t('sights.time_exceeded', { defaultValue: 'Zeit überschritten' })}</span>}
           </div>
           <div className="text-xs text-gray-400 font-medium italic hidden md:block">{t('sights.planning_active', { defaultValue: 'Planungsmodus aktiv' })}</div>
        </div>
      )}

      {uiState.viewMode === 'map' && !overrideSortMode ? (
        <div className="mb-8 print:hidden"><SightsMapView places={[...filteredLists.main, ...filteredLists.special] as Place[]} /></div>
      ) : isDayMode ? (
        <div className="mb-8"><DayPlannerView places={places} showPlanningMode={showPlanningMode} overrideDetailLevel={overrideDetailLevel} /></div>
      ) : (
        <>
            <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative mx-4 print:border-none print:shadow-none print:p-0">
                <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden z-10">
                    {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {t('sights.candidates', { defaultValue: 'ORTE & KANDIDATEN' })} ({filteredLists.main.length})
                </div>
                {!overrideSortMode && (
                    <div className="flex justify-end mb-4 print:hidden pt-2 gap-2 flex-wrap">
                        <button onClick={handleBatchLiveCheck} disabled={isLiveChecking} className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border ${isLiveChecking ? 'bg-amber-50 text-amber-500 border-amber-100 cursor-not-allowed' : 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 hover:shadow-md'}`}>
                            {isLiveChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500 fill-current" />}
                            {isLiveChecking ? t('sights.live_check_progress', { current: liveCheckProgress.current, total: liveCheckProgress.total, defaultValue: `Update läuft... (${liveCheckProgress.current}/${liveCheckProgress.total})` }) : t('sights.live_check_btn', { defaultValue: 'Live-Update (Auswahl)' })}
                        </button>
                        <button onClick={handleLocateNearestSight} disabled={isLocating} className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border ${isLocating ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent hover:shadow-md'}`}>
                            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? t('sights.radar_locating', { defaultValue: 'Ortung läuft...' }) : t('sights.radar_button', { defaultValue: 'Radar: Was ist in meiner Nähe?' })}
                        </button>
                    </div>
                )}
                <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>
            </div>

            {!isTourMode && filteredLists.special.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl border-2 border-amber-200 shadow-sm p-4 md:p-6 relative mx-4 mb-8 print:border-none print:bg-transparent">
                    <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                        <Layout className="w-3 h-3" /> {t('sights.special_days_ideas', { defaultValue: 'SONDERTAGE & IDEEN' })} ({filteredLists.special.length})
                    </div>
                    <div className="mt-2">{renderGroupedList(filteredLists.special, 'city')}</div>
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
        priorityOptions={priorityOptions} 
        activeSortMode={activeSortMode} 
        onSortModeChange={handleViewModeChange} 
        showPlanningMode={showPlanningMode} 
        onTogglePlanningMode={() => setUIState({ showPlanningMode: !showPlanningMode })} 
      />
    </div>
  );
};
// Zeilenanzahl: 588
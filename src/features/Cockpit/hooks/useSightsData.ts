// 10.04.2026 19:40 - FIX: Resolved case-sensitivity bug causing white screens when AI provides capitalized categories (e.g., "Restaurant" vs "restaurant").
// 05.04.2026 19:00 - ARCHITECTURE: Extracted massive data processing logic from SightsView into a clean custom hook.
// src/features/Cockpit/hooks/useSightsData.ts

import { useMemo, useEffect, useState, useRef } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { APPENDIX_ONLY_INTERESTS } from '../../../data/constants';
import { LiveScout } from '../../../services/LiveScout';
import type { Place } from '../../../core/types';

const TRAVEL_PACE_CONFIG: Record<string, { startHour: number; endHour: number; breakMinutes: number; bufferMinutes: number }> = {
  'fast': { startHour: 8, endHour: 19, breakMinutes: 60, bufferMinutes: 0 }, 
  'balanced': { startHour: 9.5, endHour: 17, breakMinutes: 90, bufferMinutes: 45 }, 
  'relaxed': { startHour: 10, endHour: 16, breakMinutes: 90, bufferMinutes: 45 } 
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export const getRealPriorityValue = (p: any): number => {
    if (p.isFixed) return 4;               
    if (p.userPriority === 1) return 3;    
    if (p.userPriority === 2) return 2;    
    if (p.userPriority === -1) return 0;   
    return 1;                              
};

export const getRealDay = (dateStr: string, startStr: string) => {
    if (!startStr) return 1;
    const start = new Date(startStr); start.setHours(0,0,0,0);
    const visit = new Date(dateStr); visit.setHours(0,0,0,0);
    const diff = visit.getTime() - start.getTime();
    return Math.floor(diff / 86400000) + 1;
};

export const useSightsData = (places: Place[], overrideSortMode?: any) => {
  const { t } = useTranslation();
  const { project, uiState, setUIState } = useTripStore();
  
  const [isLocating, setIsLocating] = useState(false);
  const [isLiveChecking, setIsLiveChecking] = useState(false);
  const [liveCheckProgress, setLiveCheckProgress] = useState({ current: 0, total: 0 });

  const { userInputs, analysis } = project; 
  const showPlanningMode = uiState.showPlanningMode || false;
  
  const isPrint = !!overrideSortMode || uiState.isPrintMode;
  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';

  const frozenMetaRef = useRef<Record<string, any>>({});

  useEffect(() => {
      if (!showPlanningMode) {
          frozenMetaRef.current = {};
      }
  }, [showPlanningMode]);

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
                  const cat = (p.userSelection?.customCategory || p.category || '').toLowerCase();
                  if (cat === 'hotel' || cat === 'accommodation') return;
                  
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
    dailyMinutes = Math.max(0, dailyMinutes - config.breakMinutes);

    const daysCountRaw = (new Date(userInputs.dates.end).getTime() - new Date(userInputs.dates.start).getTime()) / (1000 * 3600 * 24) + 1;
    const daysCount = Math.max(1, daysCountRaw - 2);
    
    const totalBudget = Math.floor(dailyMinutes * daysCount);

    places.forEach((p: any) => {
      const cat = (p.userSelection?.customCategory || p.category || '').toLowerCase();
      if (cat === 'hotel' || cat === 'accommodation') return;

      const prio = p.userPriority || 0;
      if (prio > 0 || p.isFixed) {
         const dur = p.duration || p.min_duration_minutes || 60;
         totalMinutes += (dur + 30);
      }
    });

    return { total: totalBudget, used: totalMinutes, remaining: totalBudget - totalMinutes };
  }, [userInputs, places]);

  const allHotels = useMemo(() => {
      return places.filter(p => {
          const cat = p.userSelection?.customCategory || p.category || '';
          return cat.toLowerCase() === 'hotel' || cat.toLowerCase() === 'accommodation';
      });
  }, [places]);

  const tourOptions = useMemo(() => {
      const tourGuide = (analysis as any)?.tourGuide;
      const tours = (tourGuide?.guide?.tours || []) as any[];
      
      const mappedTours = tours.map((tour: any) => {
          const count = (tour.suggested_order_ids || []).filter((id: string) => {
              const p = places.find(pl => pl.id === id);
              if (!p) return false;
              const cat = (p.userSelection?.customCategory || p.category || '').toLowerCase();
              if (cat === 'hotel' || cat === 'accommodation') return false;
              if (!isPrint && uiState.visitedFilter === 'visited' && !p.visited) return false;
              if (!isPrint && uiState.visitedFilter === 'unvisited' && p.visited) return false;
              return true;
          }).length;

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
  }, [analysis, places, uiState.visitedFilter, t, isPrint]);

  const filteredLists = useMemo(() => {
    const mainList: any[] = [];
    const specialList: any[] = []; 
    
    const term = isPrint ? '' : (uiState.searchTerm || '').toLowerCase();
    const activeFilters = isPrint ? [] : (uiState.categoryFilter || []); 
    const sortMode = activeSortMode;
    const selectedCategory = isPrint ? 'all' : uiState.selectedCategory;
    const visitedFilter = isPrint ? 'all' : uiState.visitedFilter;
    
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
        if (visitedFilter === 'visited') {
            uniquePlaces.forEach(p => {
                if (p.visited && p.visitedAt) {
                    const realDay = getRealDay(p.visitedAt, project.userInputs.dates?.start || new Date().toISOString());
                    const labelTranslated = `${t('sights.day', {defaultValue: 'Tag'})} ${realDay}`;
                    const isSelected = activeFilters.includes(`Tag ${realDay}`) || activeFilters.includes(`Day ${realDay}`) || activeFilters.includes(labelTranslated);
                    if (isSelected) selectedDayPlaceIds.add(p.id);
                    else otherDayPlaceIds.add(p.id);
                } else {
                    otherDayPlaceIds.add(p.id);
                }
            });
        } else {
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
    }

    const getMeta = (p: any) => {
        const duration = p.duration || p.min_duration_minutes || 0;
        const rating = p.rating || 0;
        const currentPrioVal = getRealPriorityValue(p);
        
        const isFilterFail = (duration > 0 && duration < minDuration) || (rating > 0 && rating < minRating);
        const currentIsReserve = p.userPriority === -1 || (p.userPriority === 0 && !p.isFixed && isFilterFail);

        const currentCat = p.category || 'Sonstiges';
        const currentName = p.name || '';

        const metaObj = { prioVal: currentPrioVal, isReserve: currentIsReserve, cat: currentCat, name: currentName };

        if (!showPlanningMode) return metaObj;

        if (!frozenMetaRef.current[p.id]) {
            frozenMetaRef.current[p.id] = metaObj;
        }

        return frozenMetaRef.current[p.id];
    };

    uniquePlaces.forEach((p: any) => {
      if (visitedFilter === 'visited' && !p.visited) return;
      if (visitedFilter === 'unvisited' && p.visited) return;

      const originalCat = p.category || 'Sonstiges'; 
      const checkCat = (p.userSelection?.customCategory || originalCat).toLowerCase();

      if (checkCat === 'hotel' || checkCat === 'accommodation') return;
      if (ignoreList.some((i: string) => i.toLowerCase() === originalCat.toLowerCase())) return; 

      const meta = getMeta(p);
      const cat = meta.cat;

      if (term) {
          const searchableText = [p.name, p.official_name, p.category, p.description, p.detailContent, p.address].filter(Boolean).join(' ').toLowerCase();
          if (!searchableText.includes(term)) return;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
          const pCat = p.userSelection?.customCategory || originalCat;
          if (pCat.toLowerCase() !== selectedCategory.toLowerCase()) return;
      }

      if (activeFilters.length > 0) {
          if (sortMode === 'category') {
              const matchesCat = activeFilters.some((f: string) => f.toLowerCase() === cat.toLowerCase() || f.toLowerCase() === originalCat.toLowerCase());
              if (!matchesCat) return;
          }
          else if (sortMode === 'priority') {
              const prioValStr = String(meta.prioVal); 
              if (!activeFilters.includes(prioValStr)) return;
          }
          else if (sortMode === 'tour') {
              const inSelectedTour = tourOptions.some((tour: any) => activeFilters.includes(tour.id) && tour.placeIds.includes(p.id));
              if (!inSelectedTour) return;
          }
          else if (sortMode === 'day' && otherDayPlaceIds.has(p.id) && !selectedDayPlaceIds.has(p.id)) return;
      }

      const liveDuration = p.duration || p.min_duration_minutes || 0;
      const liveRating = p.rating || 0;
      
      const liveFilterFail = (liveDuration > 0 && liveDuration < minDuration) || (liveRating > 0 && liveRating < minRating);
      const liveIsReserve = p.userPriority === -1 || (p.userPriority === 0 && !p.isFixed && liveFilterFail);

      const placeWithMeta = { ...p, _meta: meta, _liveIsReserve: liveIsReserve };

      if (originalCat === 'special') specialList.push(placeWithMeta);
      else mainList.push(placeWithMeta); 
    });

    const sortFn = (a: any, b: any) => {
      const aMeta = a._meta;
      const bMeta = b._meta;

      if (sortMode === 'alphabetical') return aMeta.name.localeCompare(bMeta.name);
      
      if (aMeta.isReserve && !bMeta.isReserve) return 1;
      if (!aMeta.isReserve && bMeta.isReserve) return -1;
      
      if (aMeta.prioVal !== bMeta.prioVal) return bMeta.prioVal - aMeta.prioVal; 

      const catCompare = aMeta.cat.toLowerCase().localeCompare(bMeta.cat.toLowerCase());
      if (catCompare !== 0) return catCompare;

      return aMeta.name.localeCompare(bMeta.name);
    };

    return { main: mainList.sort(sortFn), special: specialList.sort(sortFn) };
  }, [places, uiState.searchTerm, uiState.categoryFilter, activeSortMode, uiState.selectedCategory, isPrint, uiState.visitedFilter, userInputs.searchSettings, tourOptions, project.itinerary, t, showPlanningMode]);

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
      } catch (err: any) {
          console.error("Batch Live Check failed", err);
          const errMsg = err?.message || String(err);
          if (errMsg.includes('429') || errMsg.includes('Rate Limit') || errMsg.includes('400')) {
              alert(t('sights.error_api_limit', { defaultValue: 'Der Server ist momentan überlastet oder der API-Key ist ungültig.' }));
          } else {
              alert(t('sights.error_general', { defaultValue: 'Beim Live-Update ist ein Fehler aufgetreten.' }));
          }
      } finally {
          setIsLiveChecking(false);
      }
  };

  return {
      filteredLists,
      budgetStats,
      allHotels,
      tourOptions,
      handleLocateNearestSight,
      handleBatchLiveCheck,
      isLocating,
      isLiveChecking,
      liveCheckProgress
  };
};
// --- END OF FILE 299 Zeilen ---
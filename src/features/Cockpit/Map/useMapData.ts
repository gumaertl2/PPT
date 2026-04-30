// 05.04.2026 19:30 - ARCHITECTURE: Extracted all heavy map data processing (spiderifying, geocoding, filtering) into a clean hook.
// src/features/Cockpit/Map/useMapData.ts

import { useMemo, useState, useEffect } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { GeocodingService } from '../../../services/GeocodingService';
import type { Place } from '../../../core/types/models';

export const useMapData = (places: Place[], currentZoom: number, forceDiaryMode?: boolean) => {
    const { project, uiState, setProject } = useTripStore();
    
    const [isUpdatingCoords, setIsUpdatingCoords] = useState(false);
    const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });

    const allPlacesFromStore = useMemo(() => Object.values(project.data.places), [project.data.places]);
    const allValidPlacesForLegend = useMemo(() => (allPlacesFromStore as Place[]).filter(p => p.location && p.location.lat && p.location.lng && p.userPriority !== -1), [allPlacesFromStore]);

    const validPlaces = useMemo(() => places.filter(p => p.location && p.location.lat && p.location.lng && p.userPriority !== -1), [places]);

    const defaultCenter: [number, number] = useMemo(() => {
        if (validPlaces.length === 0) return [48.1351, 11.5820];
        const lats = validPlaces.map(p => p.location!.lat);
        const lngs = validPlaces.map(p => p.location!.lng);
        return [
            (Math.min(...lats) + Math.max(...lats)) / 2, 
            (Math.min(...lngs) + Math.max(...lngs)) / 2
        ];
    }, [validPlaces]);

    const hotelInfo = useMemo(() => {
        const names = new Set<string>();
        const ids = new Set<string>();
        if (project.userInputs.logistics.mode === 'stationaer') {
            const h = project.userInputs.logistics.stationary.hotel;
            if (h) {
                if (h.length > 30) ids.add(h);
                else names.add(h.toLowerCase()); 
            }
        } else {
            project.userInputs.logistics.roundtrip.stops?.forEach((s: any) => {
                if (s.hotel) {
                    if (s.hotel.length > 30) ids.add(s.hotel);
                    else names.add(s.hotel.toLowerCase());
                }
            });
        }
        return { ids, names };
    }, [project.userInputs.logistics]);

    const validPlacesIncludedHotels = useMemo(() => {
        const baseValid = places.filter(p => p.location && p.location.lat && p.location.lng && p.userPriority !== -1);
        
        const allValidHotels = allPlacesFromStore.filter((p: Place) => {
            if (!p.location || !p.location.lat || !p.location.lng) return false;
            if (p.userPriority === -1) return false; 
            
            const cat = p.userSelection?.customCategory || p.category || '';
            return hotelInfo.ids.has(p.id) || 
                   hotelInfo.names.has(p.name?.toLowerCase() || '') || 
                   hotelInfo.names.has(p.official_name?.toLowerCase() || '') ||
                   cat.toLowerCase() === 'hotel' ||
                   cat.toLowerCase() === 'accommodation';
        });

        const combined = [...baseValid];
        const existingIds = new Set(baseValid.map(p => p.id));
        
        allValidHotels.forEach(h => {
            if (!existingIds.has(h.id)) {
                combined.push(h as Place);
                existingIds.add(h.id);
            }
        });
        
        return combined;
    }, [places, allPlacesFromStore, hotelInfo]);

    const standaloneExpenses = useMemo(() => {
        return Object.values(project.data.expenses || {}).filter((e: any) => e.location && e.location.lat && e.location.lng && !e.placeId);
    }, [project.data.expenses]);

    const visitedSequence = useMemo(() => {
        const map = new Map<string, number>();
        if (uiState.visitedFilter === 'visited' || forceDiaryMode) {
            const visited = allPlacesFromStore
                .filter(p => p.visited && p.visitedAt)
                .sort((a, b) => new Date(a.visitedAt!).getTime() - new Date(b.visitedAt!).getTime());
            
            visited.forEach((p, index) => {
                map.set(p.id, index + 1);
            });
        }
        return map;
    }, [allPlacesFromStore, uiState.visitedFilter, forceDiaryMode]);

    const scheduledPlaces = useMemo(() => {
        const map = new Map<string, number>();
        if (!project.itinerary?.days) return map;
        project.itinerary.days.forEach((day: any, index: number) => {
            const activities = day.activities || day.aktivitaeten || [];
            activities.forEach((act: any) => {
                if (act.type === 'sight' || act.original_sight_id) {
                    const id = act.id || act.original_sight_id;
                    if (id) map.set(id, index + 1); 
                }
            });
        });
        return map;
    }, [project.itinerary]);

    const displayPlaces = useMemo(() => {
        const scaleFactor = Math.pow(0.5, Math.max(0, currentZoom - 10));
        const GROUP_DISTANCE = 0.03 * scaleFactor; 
        
        const groups: Place[][] = [];
        validPlacesIncludedHotels.forEach(p => {
            let added = false;
            for (const group of groups) {
                const centerLat = group[0].location!.lat;
                const centerLng = group[0].location!.lng;
                
                if (Math.abs(p.location!.lat - centerLat) < GROUP_DISTANCE && 
                    Math.abs(p.location!.lng - centerLng) < GROUP_DISTANCE) {
                    group.push(p);
                    added = true;
                    break;
                }
            }
            if (!added) groups.push([p]);
        });

        const result: (Place & { displayLat: number, displayLng: number })[] = [];

        groups.forEach(group => {
            if (group.length === 1) {
                result.push({ ...group[0], displayLat: group[0].location!.lat, displayLng: group[0].location!.lng });
            } else {
                const centerLat = group.reduce((sum, p) => sum + p.location!.lat, 0) / group.length;
                const centerLng = group.reduce((sum, p) => sum + p.location!.lng, 0) / group.length;
                const latRatio = Math.cos(centerLat * Math.PI / 180); 
                
                const minRadius = 0.015; 
                const arcPerItem = 0.022; 
                
                let SPREAD_RADIUS = Math.max(minRadius, (group.length * arcPerItem) / (2 * Math.PI));
                SPREAD_RADIUS = SPREAD_RADIUS * scaleFactor; 
                
                const sortedGroup = [...group].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

                sortedGroup.forEach((p, index) => {
                    const angle = (index / group.length) * 2 * Math.PI;
                    result.push({
                        ...p,
                        displayLat: centerLat + Math.cos(angle) * SPREAD_RADIUS,
                        displayLng: centerLng + (Math.sin(angle) * SPREAD_RADIUS) / latRatio
                    });
                });
            }
        });
        
        return result;
    }, [validPlacesIncludedHotels, currentZoom]);

    useEffect(() => {
      const runGeocoding = async () => {
          const needsValidation = allPlacesFromStore.some(p => !p.coordinatesValidated);
          if (needsValidation && !isUpdatingCoords) {
              setIsUpdatingCoords(true);
              try {
                  const { updatedPlaces, hasChanges } = await GeocodingService.enrichPlacesWithCoordinates(
                      allPlacesFromStore, 
                      (curr, total) => setUpdateProgress({ current: curr, total })
                  );
                  if (hasChanges) {
                      const newPlacesRecord = updatedPlaces.reduce((acc, p) => {
                          acc[p.id] = p;
                          return acc;
                      }, {} as Record<string, Place>);
                      setProject({
                          ...project,
                          data: { ...project.data, places: newPlacesRecord }
                      });
                  }
              } catch (e) {
                  console.error("Background Geocoding failed", e);
              } finally {
                  setIsUpdatingCoords(false);
              }
          }
      };
      const timer = setTimeout(runGeocoding, 1000);
      return () => clearTimeout(timer);
    }, [allPlacesFromStore.length]);

    return {
        defaultCenter,
        displayPlaces,
        hotelInfo,
        validPlacesIncludedHotels,
        standaloneExpenses,
        visitedSequence,
        scheduledPlaces,
        allValidPlacesForLegend,
        isUpdatingCoords,
        updateProgress
    };
};
// --- END OF FILE 197 Zeilen ---
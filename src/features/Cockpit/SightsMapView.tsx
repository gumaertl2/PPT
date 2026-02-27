// 27.02.2026 10:25 - FEAT: Passed unfiltered place list to MapLegend to enable global map filtering.
// 27.02.2026 09:40 - REFACTOR: Removed automatic background Live-Check from MapView to prevent unnecessary API usage.
// src/features/Cockpit/SightsMapView.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../core/types/models';
import { 
  ExternalLink, RefreshCw, Maximize, Minimize, 
  Navigation, CloudOff, Database, CalendarClock, Clock, Layers
} from 'lucide-react'; 
import { GeocodingService } from '../../services/GeocodingService'; 
import { OfflineMapModal } from './OfflineMapModal';

import { MAP_LAYERS, getCategoryColor, createSmartIcon, DAY_COLORS } from './Map/MapConstants';
import { MapStyles, MapLogic, MapResizer, UserLocationMarker, OfflineTileLayer, MapLegend } from './Map/MapSubComponents';

export const SightsMapView: React.FC<{ places: Place[] }> = ({ places }) => {
  const { t } = useTranslation();
  const { uiState, setUIState, project, setProject, updatePlace } = useTripStore(); 
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const [isUpdatingCoords, setIsUpdatingCoords] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const validPlaces = useMemo(() => places.filter(p => p.location && p.location.lat && p.location.lng), [places]);
  const defaultCenter: [number, number] = validPlaces.length > 0 
    ? [validPlaces[0].location!.lat, validPlaces[0].location!.lng] 
    : [48.1351, 11.5820]; 

  const allPlacesFromStore = useMemo(() => Object.values(project.data.places), [project.data.places]);
  
  // FIX: Wir übergeben der Legende IMMER alle Orte mit Koordinaten, damit die Filter-Buttons nicht verschwinden.
  const allValidPlacesForLegend = useMemo(() => (allPlacesFromStore as Place[]).filter(p => p.location && p.location.lat && p.location.lng), [allPlacesFromStore]);

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

  const hotelInfo = useMemo(() => {
      const names = new Set<string>();
      const ids = new Set<string>();
      if (project.userInputs.logistics.mode === 'stationaer') {
          const h = project.userInputs.logistics.stationary.hotel;
          if (h) {
              if (h.length > 20) ids.add(h); 
              else names.add(h.toLowerCase()); 
          }
      } else {
          project.userInputs.logistics.roundtrip.stops?.forEach((s: any) => {
              if (s.hotel) {
                  if (s.hotel.length > 20) ids.add(s.hotel);
                  else names.add(s.hotel.toLowerCase());
              }
          });
      }
      return { ids, names };
  }, [project.userInputs.logistics]);

  const tripStart = project.userInputs.dates?.start || '';
  const tripEnd = project.userInputs.dates?.end || '';

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

  useEffect(() => {
    if (uiState.selectedPlaceId && markerRefs.current[uiState.selectedPlaceId]) {
      const marker = markerRefs.current[uiState.selectedPlaceId];
      setTimeout(() => marker?.openPopup(), 150);
    }
  }, [uiState.selectedPlaceId]);

  const handleLocateUser = () => {
      if (!navigator.geolocation) {
          alert("Dein Browser oder Gerät unterstützt leider kein GPS.");
          return;
      }
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setUserLocation([position.coords.latitude, position.coords.longitude]);
              setIsLocating(false);
          },
          (error) => {
              console.error("GPS Error:", error);
              alert("Standort konnte nicht ermittelt werden. Bitte überprüfe deine Berechtigungen.");
              setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
  };

  const containerClasses = isFullscreen
    ? "fixed left-0 right-0 bottom-0 top-[70px] md:top-[80px] z-[40] bg-slate-100 shadow-2xl transition-all"
    : "h-[calc(100vh-180px)] min-h-[600px] w-full rounded-[2rem] overflow-hidden shadow-inner border border-slate-200 z-0 relative bg-slate-100 transition-all";

  return (
    <div className={containerClasses}>
      
      {isUpdatingCoords && (
          <div className={`absolute top-4 right-20 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600 animate-in slide-in-from-top-2`}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span className="hidden sm:inline">Optimiere Koordinaten... ({updateProgress.current}/{updateProgress.total})</span>
          </div>
      )}

      <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`absolute top-4 right-4 z-[1000] bg-white text-slate-700 p-2.5 rounded-xl shadow-lg border border-slate-200 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none`}
          title={isFullscreen ? t('map.exit_fullscreen', "Breitbildmodus beenden") : t('map.enter_fullscreen', "Karte auf volle Breite vergrößern")}
      >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      <button 
          onClick={handleLocateUser}
          className={`absolute top-[68px] right-4 z-[1000] bg-white text-blue-600 p-2.5 rounded-xl shadow-lg border border-slate-200 hover:bg-blue-50 transition-all focus:outline-none ${isLocating ? 'animate-pulse opacity-70' : ''}`}
          title={t('map.locate_me', "Meinen aktuellen GPS-Standort anzeigen")}
      >
          <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin text-slate-400' : 'fill-blue-100'}`} />
      </button>

      <button 
          onClick={() => setUIState({ isMapManagerOpen: true })}
          className={`absolute top-[120px] right-4 z-[1000] p-2.5 rounded-xl shadow-lg border transition-all focus:outline-none ${
              uiState.mapMode === 'offline' 
                  ? 'bg-slate-800 text-white border-slate-900 hover:bg-black' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'
          }`}
          title={t('map.manager.title', "Offline-Karten & Download")}
      >
          {uiState.mapMode === 'offline' ? <CloudOff className="w-5 h-5" /> : <Database className="w-5 h-5" />}
      </button>

      <div className="absolute top-[172px] right-4 z-[1000]">
          <button 
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`p-2.5 rounded-xl shadow-lg border transition-all focus:outline-none ${isLayerMenuOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
              title="Karten-Ansicht (Ebenen) wechseln"
          >
              <Layers className="w-5 h-5" />
          </button>
          {isLayerMenuOpen && (
              <div className="absolute top-0 right-14 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl w-48 overflow-hidden animate-in slide-in-from-right-2">
                  {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                      <button
                          key={key}
                          onClick={() => { setUIState({ mapLayer: key as any }); setIsLayerMenuOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${uiState.mapLayer === key ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}
                      >
                          {t(layer.nameKey, layer.defaultName)}
                      </button>
                  ))}
              </div>
          )}
      </div>

      <MapStyles />
      <MapContainer center={defaultCenter} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
        <MapResizer isFullscreen={isFullscreen} />
        <OfflineTileLayer />
        <MapLogic places={places} />
        <OfflineMapModal />
        <UserLocationMarker location={userLocation} />

        {validPlaces.map((place) => {
          const isSelected = uiState.selectedPlaceId === place.id;
          const isHotel = hotelInfo.ids.has(place.id) || 
                          hotelInfo.names.has(place.name?.toLowerCase() || '') || 
                          hotelInfo.names.has(place.official_name?.toLowerCase() || '') ||
                          place.category?.toLowerCase().includes('hotel') ||
                          place.category?.toLowerCase().includes('accommodation');

          const dayNumber = scheduledPlaces.get(place.id);
          const markerColor = getCategoryColor(place.category, place);
          const isFixed = !!place.isFixed;
          const userPrio = place.userPriority ?? 0;
          
          let baseZ = 0;
          if (isFixed) baseZ = 400;
          else if (userPrio === 1) baseZ = 300;
          else if (userPrio === 2) baseZ = 200;
          else if (userPrio === -1) baseZ = -100;
          
          return (
            <Marker 
              key={place.id} 
              position={[place.location!.lat, place.location!.lng]}
              icon={createSmartIcon(markerColor, isSelected, dayNumber, isHotel, userPrio, isFixed)}
              zIndexOffset={isSelected ? 1000 : (isHotel ? 900 : (dayNumber ? 500 : baseZ))} 
              ref={(ref) => { markerRefs.current[place.id] = ref; }}
              eventHandlers={{ click: () => setUIState({ selectedPlaceId: place.id }) }}
            >
              <Tooltip direction="top" offset={[0, -15]} opacity={0.95} className="custom-tooltip">{place.name}</Tooltip>

              <Popup>
                <div className="min-w-[220px] font-sans p-1">
                  <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: markerColor }} />
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {place.category === 'special' ? (place.details?.specialType === 'sunny' ? 'Sonnentag ☀️' : 'Regentag 🌧️') : (place.category || 'Ort')}
                          </span>
                      </div>
                      {dayNumber && (
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length] }}>📅 Tag {dayNumber}</span>
                      )}
                      {isHotel && <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">🏨 Unterkunft</span>}
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-sm mb-1 mt-1">{place.name}</h3>
                  {place.address && <p className="text-xs text-slate-600 mb-2 leading-snug flex gap-1">📍 <span className="opacity-80">{place.address}</span></p>}

                  <div className="flex justify-between gap-1 mt-3 mb-2 border-t border-slate-100 pt-2 no-print">
                     <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: isFixed && userPrio === 1 ? 0 : 1, isFixed: !(isFixed && userPrio === 1) }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${isFixed && userPrio === 1 ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border-slate-200'}`}>Fix</button>
                     <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: !isFixed && userPrio === 1 ? 0 : 1, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${!isFixed && userPrio === 1 ? 'bg-green-600 text-white border-green-700' : 'bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-700 border-slate-200'}`}>Prio 1</button>
                     <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === 2 ? 0 : 2, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200'}`}>Prio 2</button>
                     <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === -1 ? 0 : -1, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-slate-50 text-slate-400 hover:bg-gray-100 border-slate-200'}`}>Ignore</button>
                  </div>

                  {isFixed && (
                     <div className="flex flex-col gap-1 bg-purple-50 px-2 py-1.5 rounded-md text-xs mt-1 mb-2 border border-purple-100 no-print animate-in slide-in-from-top-1">
                        <span className="font-bold text-purple-800 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Fixtermin</span>
                        <div className="flex gap-1 items-center">
                           <input type="date" value={place.fixedDate || ''} min={tripStart} max={tripEnd} onChange={(e) => updatePlace(place.id, { fixedDate: e.target.value })} className="bg-white border border-purple-200 rounded px-1 py-0.5 text-[10px] w-full focus:ring-1 focus:ring-purple-500 outline-none" title="Datum" />
                           <input type="time" value={place.fixedTime || ''} onChange={(e) => updatePlace(place.id, { fixedTime: e.target.value })} className="bg-white border border-purple-200 rounded px-1 py-0.5 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none" title="Uhrzeit" />
                           <div className="flex items-center gap-0.5 bg-white border border-purple-200 rounded px-1 py-0.5 focus-within:ring-1 focus-within:ring-purple-500"><Clock className="w-2.5 h-2.5 text-purple-400" /><input type="number" placeholder="Min" value={place.visitDuration || ''} onChange={(e) => updatePlace(place.id, { visitDuration: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent border-none p-0 text-center text-[10px] text-purple-900 focus:ring-0 placeholder:text-purple-300 outline-none" title="Dauer in Minuten" /></div>
                        </div>
                     </div>
                  )}

                  <button 
                    onClick={() => {
                        let targetSortMode = uiState.sortMode || 'category';
                        let targetFilter = uiState.categoryFilter || [];
                        if ((targetSortMode as string) === 'day') {
                            const isVisibleInCurrentView = dayNumber && (targetFilter.length === 0 || targetFilter.some(f => f.includes(String(dayNumber))));
                            if (!isVisibleInCurrentView) { targetSortMode = 'category' as any; targetFilter = []; }
                        }
                        if (isFullscreen) setIsFullscreen(false);
                        setUIState({ viewMode: 'list', selectedPlaceId: place.id, sortMode: targetSortMode, categoryFilter: targetFilter });
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} /> Im Reiseführer zeigen
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapLegend places={allValidPlacesForLegend} />
      </MapContainer>
    </div>
  );
};
// --- END OF FILE 211 Zeilen ---
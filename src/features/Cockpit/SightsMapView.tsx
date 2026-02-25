// 25.02.2026 13:50 - FIX: Brought Fix-fields (Date, Time, Duration) into map popup and restricted date inputs.
// 25.02.2026 13:30 - FEAT: Visual Priority rendering (Circles vs Squares, Opacity, Tooltip).
// src/features/Cockpit/SightsMapView.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../core/types/models';
import { 
  ExternalLink, RefreshCw, Zap, Maximize, Minimize, 
  Navigation, CloudOff, Database, CalendarClock, Clock 
} from 'lucide-react'; 
import { GeocodingService } from '../../services/GeocodingService'; 
import { LiveScout } from '../../services/LiveScout'; 
import { MapOfflineService } from '../../services/MapOfflineService';
import { OfflineMapModal } from './OfflineMapModal';

const CATEGORY_COLORS: Record<string, string> = {
  'museum': '#dc2626', 'architecture': '#db2777', 'sight': '#dc2626',        
  'districts': '#9333ea', 'city_info': '#7e22ce', 'nature': '#16a34a',       
  'parks': '#84cc16', 'view': '#16a34a', 'beach': '#2563eb', 'lake': '#2563eb',
  'wellness': '#06b6d4', 'relaxation': '#06b6d4', 'sports': '#ea580c',       
  'hiking': '#ea580c', 'abenteuer': '#ea580c', 'restaurant': '#ca8a04',   
  'food': '#ca8a04', 'gastronomy': '#ca8a04', 'dinner': '#ca8a04',
  'lunch': '#ca8a04', 'shopping': '#7c3aed', 'market': '#7c3aed',
  'nightlife': '#1e3a8a', 'family': '#0d9488', 'hotel': '#000000',        
  'accommodation': '#000000', 'camping': '#000000', 'campsite': '#000000',
  'stellplatz': '#000000', 'arrival': '#4b5563', 'general': '#64748b',
  'special': '#f59e0b', 'sunny': '#f59e0b', 'rainy': '#3b82f6'    
};

const DEFAULT_COLOR = '#64748b'; 

const createSmartIcon = (categoryColor: string, isSelected: boolean, dayNumber?: number, isHotel?: boolean, userPriority: number = 0, isFixed: boolean = false) => {
  const baseSize = isSelected ? 28 : 22;
  const animClass = isSelected ? 'marker-pulse' : '';
  const border = isSelected ? '3px solid #000' : '2px solid white';

  const isIgnored = userPriority === -1;
  const hasPrio = isFixed || userPriority === 1 || userPriority === 2;
  
  const shapeRadius = hasPrio ? '50%' : '6px';
  const opacity = isIgnored ? '0.4' : '0.9'; 
  const grayscale = isIgnored ? 'filter: grayscale(100%);' : '';

  if (isHotel) {
      return L.divIcon({
          className: `custom-map-marker ${animClass}`,
          html: `<div style="background-color: #0f172a; width: ${baseSize + 6}px; height: ${baseSize + 6}px; border-radius: 8px; border: ${border}; display: flex; align-items: center; justify-content: center; font-size: ${baseSize * 0.6}px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); z-index: 999;">🏨</div>`,
          iconSize: [baseSize + 6, baseSize + 6],
          iconAnchor: [(baseSize + 6) / 2, (baseSize + 6) / 2],
          popupAnchor: [0, -12]
      });
  }

  if (dayNumber) {
      const dayColor = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
      return L.divIcon({
          className: `custom-map-marker ${animClass}`,
          html: `<div style="background-color: ${dayColor}; width: ${baseSize + 2}px; height: ${baseSize + 2}px; border-radius: 50%; border: ${border}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-family: sans-serif; font-size: ${baseSize * 0.55}px; box-shadow: 0 3px 6px rgba(0,0,0,0.3); z-index: 500;">${dayNumber}</div>`,
          iconSize: [baseSize + 2, baseSize + 2],
          iconAnchor: [(baseSize + 2) / 2, (baseSize + 2) / 2],
          popupAnchor: [0, -12]
      });
  }

  return L.divIcon({
      className: `custom-map-marker ${animClass}`,
      html: `<div style="background-color: ${categoryColor}; width: ${baseSize - 2}px; height: ${baseSize - 2}px; border-radius: ${shapeRadius}; border: ${border}; opacity: ${opacity}; ${grayscale} box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [baseSize - 2, baseSize - 2],
      iconAnchor: [(baseSize - 2) / 2, (baseSize - 2) / 2],
      popupAnchor: [0, -10]
  });
};

const DAY_COLORS = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', 
    '#0ea5e9', '#f43f5e', '#14b8a6', '#f97316', '#6366f1'  
];

const getCategoryColor = (cat?: string, place?: Place): string => {
  if (!cat) return DEFAULT_COLOR;
  if (cat === 'special' && place?.details?.specialType) {
      if (place.details.specialType === 'sunny') return CATEGORY_COLORS['sunny'];
      if (place.details.specialType === 'rainy') return CATEGORY_COLORS['rainy'];
  }
  const normalized = cat.toLowerCase().trim();
  if (CATEGORY_COLORS[normalized]) return CATEGORY_COLORS[normalized];
  const match = Object.keys(CATEGORY_COLORS).find(key => normalized.includes(key));
  return match ? CATEGORY_COLORS[match] : DEFAULT_COLOR;
};

interface SightsMapViewProps {
  places: Place[]; 
}

const MapStyles = () => (
  <style>{`
    @keyframes pulse-black {
      0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7); transform: scale(1); }
      70% { box-shadow: 0 0 0 12px rgba(0, 0, 0, 0); transform: scale(1.1); }
      100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); transform: scale(1); }
    }
    .marker-pulse > div {
      animation: pulse-black 1.5s infinite;
      z-index: 9999 !important;
    }
    @keyframes pulse-blue {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); transform: scale(1); }
      70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); transform: scale(1.1); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); transform: scale(1); }
    }
    .user-pulse > div {
      animation: pulse-blue 1.5s infinite;
      z-index: 10000 !important;
    }
    .leaflet-container { z-index: 1; }
    .leaflet-tooltip.custom-tooltip {
       background-color: rgba(255, 255, 255, 0.95);
       border: 1px solid #e2e8f0;
       border-radius: 8px;
       box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
       color: #1e293b;
       font-weight: 700;
       padding: 4px 8px;
    }
    .leaflet-tooltip-top.custom-tooltip::before { border-top-color: rgba(255, 255, 255, 0.95); }
  `}</style>
);

const MapLogic: React.FC<{ places: Place[] }> = ({ places }) => {
  const map = useMap();
  const { uiState } = useTripStore(); 
  const isInitialized = useRef(false);
  const lastSelectedId = useRef<string | null>(uiState.selectedPlaceId);

  useEffect(() => {
    const isOffline = uiState.mapMode === 'offline';
    const maxLimit = isOffline ? 14 : 18;
    map.setMaxZoom(maxLimit);
    if (isOffline && map.getZoom() > 14) {
      map.setZoom(14, { animate: true });
    }
  }, [uiState.mapMode, map]);

  useEffect(() => {
    const validPlaces = places.filter(p => p.location?.lat && p.location?.lng);
    if (validPlaces.length === 0) return;

    const currentId = uiState.selectedPlaceId;
    const currentPlace = currentId ? validPlaces.find(p => p.id === currentId) : null;

    if (!isInitialized.current) {
        if (currentPlace && currentPlace.location) {
            map.setView([currentPlace.location.lat, currentPlace.location.lng], 12, { animate: false });
        } else {
            const bounds = L.latLngBounds(validPlaces.map(p => [p.location!.lat, p.location!.lng]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        isInitialized.current = true;
    } 
    else {
        if (lastSelectedId.current && !currentId) {
            const bounds = L.latLngBounds(validPlaces.map(p => [p.location!.lat, p.location!.lng]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }
    lastSelectedId.current = currentId;
  }, [places, uiState.selectedPlaceId, map]);

  return null;
};

const MapResizer: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
    const map = useMap();
    useEffect(() => {
        const timer1 = setTimeout(() => map.invalidateSize(), 50);
        const timer2 = setTimeout(() => map.invalidateSize(), 300);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, [isFullscreen, map]);
    return null;
};

const UserLocationMarker: React.FC<{ location: [number, number] | null }> = ({ location }) => {
    const map = useMap();
    
    useEffect(() => {
        if (location) {
            map.flyTo(location, 14, { animate: true, duration: 1.5 });
        }
    }, [location, map]);

    if (!location) return null;

    const userIcon = L.divIcon({
        className: 'custom-map-marker user-pulse',
        html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10]
    });

    return (
        <Marker position={location} icon={userIcon} zIndexOffset={9999}>
            <Popup>
                <div className="text-xs font-bold text-blue-600 p-1">Mein aktueller Standort</div>
            </Popup>
        </Marker>
    );
};

const OfflineTileLayer = () => {
    const { uiState } = useTripStore();
    const { mapMode } = uiState;
    const map = useMap();

    useEffect(() => {
        const url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

        const ExtendedLayer = L.TileLayer.extend({
            createTile: function(coords: L.Coords, done: L.DoneCallback) {
                const tile = document.createElement('img');
                const key = `${coords.z}/${coords.x}/${coords.y}`;

                L.DomEvent.on(tile, 'load', L.Util.bind((this as any)._tileOnLoad, this, done, tile));
                L.DomEvent.on(tile, 'error', L.Util.bind((this as any)._tileOnError, this, done, tile));

                if ((this as any).options.crossOrigin || (this as any).options.crossOrigin === "") {
                    tile.crossOrigin = (this as any).options.crossOrigin === true ? "" : (this as any).options.crossOrigin;
                }
                tile.alt = "";
                tile.setAttribute('role', 'presentation');

                MapOfflineService.getTile(key).then(blob => {
                    if (blob) {
                        tile.src = URL.createObjectURL(blob);
                    } else if (mapMode === 'offline') {
                        tile.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEW1tbW6T9UMAAAAH0lEQVRoQ+3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAIAvAxaAAGE6fS8AAAAASUVORK5CYII=';
                    } else {
                        tile.src = (this as any).getTileUrl(coords);
                    }
                });
                return tile;
            }
        });

        const layer = new (ExtendedLayer as any)(url, {
            attribution: '&copy; OpenStreetMap'
        });

        layer.addTo(map);
        return () => { map.removeLayer(layer); };
    }, [mapMode, map]);

    return null;
};

const MapLegend: React.FC<{ places: Place[] }> = ({ places }) => {
  const categories = useMemo(() => {
    const cats = new Set<string>();
    places.forEach(p => {
      const c = p.category || 'general';
      cats.add(c);
    });
    return Array.from(cats).sort();
  }, [places]);

  if (categories.length === 0) return null;

  return (
    <div className={`absolute left-6 z-[500] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-xl max-h-[200px] overflow-y-auto bottom-6`}>
      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider sticky top-0 bg-white/95 pb-1">Legende</h4>
      <div className="space-y-1.5">
        {categories.map(cat => (
          <div key={cat} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded border border-white shadow-sm shrink-0" 
              style={{ backgroundColor: getCategoryColor(cat) }}
            ></div>
            <span className="text-xs font-medium text-slate-700 capitalize truncate max-w-[120px]" title={cat}>
               {cat.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full border border-slate-400 bg-slate-100 shadow-sm flex items-center justify-center"></div>
              <span className="text-[10px] text-slate-500 font-bold leading-tight">Hohe Prio (Kreis)</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm text-[8px] text-white flex items-center justify-center font-bold">1</div>
              <span className="text-[10px] text-slate-500 font-bold leading-tight">Geplant (Tag 1)</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-md bg-slate-900 border-2 border-white shadow-sm text-[10px] flex items-center justify-center">🏨</div>
              <span className="text-[10px] text-slate-500 font-bold leading-tight">Unterkunft</span>
          </div>
      </div>
    </div>
  );
};

export const SightsMapView: React.FC<SightsMapViewProps> = ({ places }) => {
  const { t } = useTranslation();
  const defaultCenter: [number, number] = [48.1351, 11.5820]; 
  const { uiState, setUIState, project, setProject, updatePlace } = useTripStore(); 
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const [isUpdatingCoords, setIsUpdatingCoords] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveCheckProgress, setLiveCheckProgress] = useState({ current: 0, total: 0 });
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const allPlacesFromStore = useMemo(() => Object.values(project.data.places), [project.data.places]);

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

  // Für min/max Limitierungen der Fix-Felder auf der Karte
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
    const runLiveCheck = () => {
        if (isCheckingLive) return;

        const uncheckedPlaces = allPlacesFromStore.filter(p => !p.liveStatus && p.category !== 'internal');
        
        if (uncheckedPlaces.length > 0) {
            const candidates = uncheckedPlaces.slice(0, 50).map(p => p.id);
            if (candidates.length > 0) {
                setIsCheckingLive(true);
                setLiveCheckProgress({ current: 0, total: candidates.length });
                LiveScout.verifyBatch(candidates, (curr, total) => {
                    setLiveCheckProgress({ current: curr, total });
                })
                .catch(e => console.error("LiveCheck error", e))
                .finally(() => setIsCheckingLive(false));
            }
        }
    };
    const timer = setTimeout(runLiveCheck, 2000);
    return () => clearTimeout(timer);
  }, []); 

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

  const validPlaces = places.filter(p => p.location && p.location.lat && p.location.lng);

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

      {isCheckingLive && (
          <div className={`absolute right-20 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600 animate-in slide-in-from-top-2 ${isUpdatingCoords ? 'top-16' : 'top-4'}`}>
              <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-current" />
              <span className="hidden sm:inline">Live-Check... ({liveCheckProgress.current}/{liveCheckProgress.total})</span>
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

      <MapStyles />
      <MapContainer 
        center={defaultCenter} 
        zoom={10} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
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
              <Tooltip direction="top" offset={[0, -15]} opacity={0.95} className="custom-tooltip">
                {place.name}
              </Tooltip>

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
                          <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length] }}>
                              📅 Tag {dayNumber}
                          </span>
                      )}
                      {isHotel && <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">🏨 Unterkunft</span>}
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-sm mb-1 mt-1">{place.name}</h3>
                  {place.address && <p className="text-xs text-slate-600 mb-2 leading-snug flex gap-1">📍 <span className="opacity-80">{place.address}</span></p>}

                  {/* Inline Prio-Buttons im Map Popup */}
                  <div className="flex justify-between gap-1 mt-3 mb-2 border-t border-slate-100 pt-2 no-print">
                     <button 
                       onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: isFixed && userPrio === 1 ? 0 : 1, isFixed: !(isFixed && userPrio === 1) }); }} 
                       className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${isFixed && userPrio === 1 ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border-slate-200'}`}
                     >Fix</button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: !isFixed && userPrio === 1 ? 0 : 1, isFixed: false }); }} 
                       className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${!isFixed && userPrio === 1 ? 'bg-green-600 text-white border-green-700' : 'bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-700 border-slate-200'}`}
                     >Prio 1</button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === 2 ? 0 : 2, isFixed: false }); }} 
                       className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200'}`}
                     >Prio 2</button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === -1 ? 0 : -1, isFixed: false }); }} 
                       className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-slate-50 text-slate-400 hover:bg-gray-100 border-slate-200'}`}
                     >Ignore</button>
                  </div>

                  {/* Fixtermin-Felder (nur sichtbar wenn Fix aktiv ist) */}
                  {isFixed && (
                     <div className="flex flex-col gap-1 bg-purple-50 px-2 py-1.5 rounded-md text-xs mt-1 mb-2 border border-purple-100 no-print animate-in slide-in-from-top-1">
                        <span className="font-bold text-purple-800 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Fixtermin</span>
                        <div className="flex gap-1 items-center">
                           <input type="date" value={place.fixedDate || ''} min={tripStart} max={tripEnd} onChange={(e) => updatePlace(place.id, { fixedDate: e.target.value })} className="bg-white border border-purple-200 rounded px-1 py-0.5 text-[10px] w-full focus:ring-1 focus:ring-purple-500 outline-none" title="Datum" />
                           <input type="time" value={place.fixedTime || ''} onChange={(e) => updatePlace(place.id, { fixedTime: e.target.value })} className="bg-white border border-purple-200 rounded px-1 py-0.5 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none" title="Uhrzeit" />
                           <div className="flex items-center gap-0.5 bg-white border border-purple-200 rounded px-1 py-0.5 focus-within:ring-1 focus-within:ring-purple-500">
                               <Clock className="w-2.5 h-2.5 text-purple-400" />
                               <input type="number" placeholder="Min" value={place.visitDuration || ''} onChange={(e) => updatePlace(place.id, { visitDuration: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent border-none p-0 text-center text-[10px] text-purple-900 focus:ring-0 placeholder:text-purple-300 outline-none" title="Dauer in Minuten" />
                           </div>
                        </div>
                     </div>
                  )}

                  <button 
                    onClick={() => {
                        let targetSortMode = uiState.sortMode || 'category';
                        let targetFilter = uiState.categoryFilter || [];
                        
                        if ((targetSortMode as string) === 'day') {
                            const isVisibleInCurrentView = dayNumber && (targetFilter.length === 0 || targetFilter.some(f => f.includes(String(dayNumber))));
                            if (!isVisibleInCurrentView) {
                                targetSortMode = 'category' as any;
                                targetFilter = [];
                            }
                        }

                        if (isFullscreen) setIsFullscreen(false);

                        setUIState({ 
                            viewMode: 'list', 
                            selectedPlaceId: place.id,
                            sortMode: targetSortMode,
                            categoryFilter: targetFilter
                        });
                    }}
                    className="w-full mt-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm"
                  >
                    <ExternalLink size={12} />
                    Im Reiseführer zeigen
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapLegend places={validPlaces} />
      </MapContainer>
    </div>
  );
};
// --- END OF FILE 729 Zeilen ---
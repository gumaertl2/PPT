// 09.02.2026 19:50 - FEAT: Added Progress Toast for Background Live Check.
// 09.02.2026 19:40 - FEAT: Auto-start LiveScout (max 50) when Map View opens.
// 08.02.2026 16:15 - FIX: Critical Data Loss Bug. Geocoding now uses ALL places from store.
// src/features/Cockpit/SightsMapView.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '../../store/useTripStore';
// FIX: Direct import to avoid SyntaxError with barrel files
import type { Place } from '../../core/types/models';
import { ExternalLink, RefreshCw, Zap } from 'lucide-react'; 
import { GeocodingService } from '../../services/GeocodingService'; 
import { LiveScout } from '../../services/LiveScout'; 

// --- HIGH CONTRAST PALETTE ---

const CATEGORY_COLORS: Record<string, string> = {
  'museum': '#dc2626',       
  'architecture': '#db2777', 
  'sight': '#dc2626',        
  'districts': '#9333ea',    
  'city_info': '#7e22ce',    
  'nature': '#16a34a',       
  'parks': '#84cc16',        
  'view': '#16a34a',
  'beach': '#2563eb',        
  'lake': '#2563eb',
  'wellness': '#06b6d4',     
  'relaxation': '#06b6d4',
  'sports': '#ea580c',       
  'hiking': '#ea580c',
  'abenteuer': '#ea580c',
  
  // GASTRONOMY (Expanded)
  'restaurant': '#ca8a04',   
  'food': '#ca8a04',
  'gastronomy': '#ca8a04',   
  'dinner': '#ca8a04',
  'lunch': '#ca8a04',

  'shopping': '#7c3aed',     
  'market': '#7c3aed',
  'nightlife': '#1e3a8a',    
  'family': '#0d9488',       
  
  // ACCOMMODATION (Expanded for Camper/Mobil)
  'hotel': '#000000',        
  'accommodation': '#000000',
  'camping': '#000000',
  'campsite': '#000000',
  'stellplatz': '#000000',
  
  'arrival': '#4b5563',      
  'general': '#64748b',
  'special': '#f59e0b', 
  'sunny': '#f59e0b',   
  'rainy': '#3b82f6'    
};

const DEFAULT_COLOR = '#64748b'; 

const getCategoryColor = (cat?: string, place?: Place): string => {
  if (!cat) return DEFAULT_COLOR;
  
  if (cat === 'special' && place?.details?.specialType) {
      if (place.details.specialType === 'sunny') return CATEGORY_COLORS['sunny'];
      if (place.details.specialType === 'rainy') return CATEGORY_COLORS['rainy'];
  }

  const normalized = cat.toLowerCase().trim();
  if (CATEGORY_COLORS[normalized]) return CATEGORY_COLORS[normalized];
  
  // Fuzzy Match: Check if any key is part of the category string (e.g. "luxury hotel" matches "hotel")
  const match = Object.keys(CATEGORY_COLORS).find(key => normalized.includes(key));
  return match ? CATEGORY_COLORS[match] : DEFAULT_COLOR;
};

const createCustomIcon = (color: string, isSelected: boolean) => {
  const size = isSelected ? 24 : 16;        
  const anchor = isSelected ? 12 : 8;       
  const border = isSelected ? '3px solid #000' : '2px solid white'; 
  const animClass = isSelected ? 'marker-pulse' : '';

  return L.divIcon({
    className: `custom-map-marker ${animClass}`,
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: ${border};
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
        transition: all 0.3s ease;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    popupAnchor: [0, -10]
  });
};

interface SightsMapViewProps {
  places: Place[]; // This contains FILTERED places for display
}

const MapStyles = () => (
  <style>{`
    @keyframes pulse-black {
      0% {
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.7);
        transform: scale(1);
      }
      70% {
        box-shadow: 0 0 0 12px rgba(0, 0, 0, 0);
        transform: scale(1.1);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
        transform: scale(1);
      }
    }
      
    .marker-pulse > div {
      animation: pulse-black 1.5s infinite;
      z-index: 9999 !important;
    }
  `}</style>
);

const MapLogic: React.FC<{ places: Place[] }> = ({ places }) => {
  const map = useMap();
  const { uiState } = useTripStore(); 
  
  const isInitialized = useRef(false);
  const lastSelectedId = useRef<string | null>(uiState.selectedPlaceId);

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
    <div className="absolute bottom-6 left-6 z-[500] bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-xl max-h-[200px] overflow-y-auto">
      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider sticky top-0 bg-white/95 pb-1">Legende</h4>
      <div className="space-y-1.5">
        {categories.map(cat => (
          <div key={cat} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0" 
              style={{ backgroundColor: getCategoryColor(cat) }}
            ></div>
            <span className="text-xs font-medium text-slate-700 capitalize truncate max-w-[120px]" title={cat}>
               {cat.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SightsMapView: React.FC<SightsMapViewProps> = ({ places }) => {
  const defaultCenter: [number, number] = [48.1351, 11.5820]; 
  const { uiState, setUIState, project, setProject } = useTripStore(); 
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // NEW: State for Background Updates
  const [isUpdatingCoords, setIsUpdatingCoords] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });

  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveCheckProgress, setLiveCheckProgress] = useState({ current: 0, total: 0 });

  // Access COMPLETE dataset from store for geocoding logic
  const allPlacesFromStore = useMemo(() => Object.values(project.data.places), [project.data.places]);

  // NEW: Background Geocoding Service
  useEffect(() => {
    const runGeocoding = async () => {
        const needsValidation = allPlacesFromStore.some(p => !p.coordinatesValidated);
        
        if (needsValidation && !isUpdatingCoords) {
            setIsUpdatingCoords(true);
            try {
                // Run Batch Update on ALL places
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
                        data: {
                            ...project.data,
                            places: newPlacesRecord 
                        }
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

  // NEW: Background Live Check on Map View (Max 50)
  useEffect(() => {
    const runLiveCheck = () => {
        // Prevent double run
        if (isCheckingLive) return;

        const uncheckedPlaces = allPlacesFromStore
            .filter(p => !p.liveStatus && p.category !== 'internal');
        
        if (uncheckedPlaces.length > 0) {
            // "Sofort max. 50"
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

    // Delay to start after geocoding has likely started
    const timer = setTimeout(runLiveCheck, 2000);
    return () => clearTimeout(timer);
  }, []); // Run once on mount

  useEffect(() => {
    if (uiState.selectedPlaceId && markerRefs.current[uiState.selectedPlaceId]) {
      const marker = markerRefs.current[uiState.selectedPlaceId];
      setTimeout(() => {
          marker?.openPopup();
      }, 150);
    }
  }, [uiState.selectedPlaceId]);

  const validPlaces = places.filter(p => p.location && p.location.lat && p.location.lng);

  return (
    <div className="h-[600px] w-full rounded-[2rem] overflow-hidden shadow-inner border border-slate-200 z-0 relative bg-slate-100">
      
      {/* 1. Geocoding Indicator */}
      {isUpdatingCoords && (
          <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600 animate-in slide-in-from-top-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>
                  Optimiere Koordinaten... ({updateProgress.current}/{updateProgress.total})
              </span>
          </div>
      )}

      {/* 2. Live Check Indicator (Stacked below Geocoding) */}
      {isCheckingLive && (
          <div className={`absolute right-4 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600 animate-in slide-in-from-top-2 ${isUpdatingCoords ? 'top-16' : 'top-4'}`}>
              <Zap className="w-3.5 h-3.5 animate-pulse text-amber-500 fill-current" />
              <span>
                  Live-Check... ({liveCheckProgress.current}/{liveCheckProgress.total})
              </span>
          </div>
      )}

      <MapStyles />
      <MapContainer 
        center={defaultCenter} 
        zoom={10} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapLogic places={places} />

        {validPlaces.map((place) => {
          const isSelected = uiState.selectedPlaceId === place.id;
          const markerColor = getCategoryColor(place.category, place);
          
          return (
            <Marker 
              key={place.id} 
              position={[place.location!.lat, place.location!.lng]}
              icon={createCustomIcon(markerColor, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0} 
              ref={(ref) => { markerRefs.current[place.id] = ref; }}
              eventHandlers={{
                click: () => {
                  setUIState({ selectedPlaceId: place.id });
                },
              }}
            >
              <Popup>
                <div className="min-w-[220px] font-sans p-1">
                  <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: markerColor }} 
                      />
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {place.category === 'special' 
                            ? (place.details?.specialType === 'sunny' ? 'Sonnentag ☀️' : 'Regentag 🌧️') 
                            : (place.category || 'Ort')}
                      </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{place.name}</h3>
                  
                  {place.address && (
                    <p className="text-xs text-slate-600 mb-2 leading-snug flex gap-1">
                      📍 <span className="opacity-80">{place.address}</span>
                    </p>
                  )}

                  <button 
                    onClick={() => setUIState({ viewMode: 'list', selectedPlaceId: place.id })}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors shadow-sm"
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
// --- END OF FILE 397 Zeilen ---
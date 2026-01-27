// 28.01.2026 22:00 - FEAT: Added 'Special Day' markers (Sunny/Rainy colors) to Map View.
// 24.01.2026 16:30 - FIX: Removed unused imports (TS6133) & maintained High-Contrast/Zoom Logic.
// src/features/Cockpit/SightsMapView.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '../../store/useTripStore';
import type { Place } from '../../core/types';
// FIX: Added imports for Special Icons
import { ExternalLink, Sun, CloudRain } from 'lucide-react';

// FIX: Removed unused 'icon' and 'iconShadow' imports to resolve Vercel build errors.

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
  'restaurant': '#ca8a04',   
  'food': '#ca8a04',
  'shopping': '#7c3aed',     
  'market': '#7c3aed',
  'nightlife': '#1e3a8a',    
  'family': '#0d9488',       
  'hotel': '#000000',        
  'arrival': '#4b5563',      
  'general': '#64748b',
  // FIX: Special Day Colors
  'special': '#f59e0b', // Default Amber
  'sunny': '#f59e0b',   // Amber
  'rainy': '#3b82f6'    // Blue
};

const DEFAULT_COLOR = '#64748b'; 

// FIX: Enhanced to support Special Type logic
const getCategoryColor = (cat?: string, place?: Place): string => {
  if (!cat) return DEFAULT_COLOR;
  
  // Special Handling for 'special' category (Sondertage)
  if (cat === 'special' && place?.details?.specialType) {
      if (place.details.specialType === 'sunny') return CATEGORY_COLORS['sunny'];
      if (place.details.specialType === 'rainy') return CATEGORY_COLORS['rainy'];
  }

  const normalized = cat.toLowerCase().trim();
  if (CATEGORY_COLORS[normalized]) return CATEGORY_COLORS[normalized];
  const match = Object.keys(CATEGORY_COLORS).find(key => normalized.includes(key));
  return match ? CATEGORY_COLORS[match] : DEFAULT_COLOR;
};

// Custom Icon with 'isSelected' state for Highlighting
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
  places: Place[];
}

// --- STYLES FOR ANIMATION ---
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

// --- SUB-COMPONENTS ---

// 1. Controller: Intelligent Zoom Logic
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

    // SCENARIO A: INITIAL MOUNT (List -> Map)
    if (!isInitialized.current) {
        if (currentPlace && currentPlace.location) {
            // Focus on Selection (Level 12 for Overview Context)
            map.setView([currentPlace.location.lat, currentPlace.location.lng], 12, { animate: false });
        } else {
            // Overview
            const bounds = L.latLngBounds(validPlaces.map(p => [p.location!.lat, p.location!.lng]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        isInitialized.current = true;
    } 
    // SCENARIO B: RUNTIME UPDATE
    else {
        // Case: Selection CLEARED (Header "Map" Button clicked) -> Go to Overview
        if (lastSelectedId.current && !currentId) {
            const bounds = L.latLngBounds(validPlaces.map(p => [p.location!.lat, p.location!.lng]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
        // Case: Selection CHANGED (Marker Clicked) -> DO NOTHING (User explores map)
    }

    lastSelectedId.current = currentId;

  }, [places, uiState.selectedPlaceId, map]);

  return null;
};

// 2. Legend
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
              style={{ backgroundColor: getCategoryColor(cat) }} // Pass place? No, legend is generic
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

// --- MAIN COMPONENT ---

export const SightsMapView: React.FC<SightsMapViewProps> = ({ places }) => {
  
  const defaultCenter: [number, number] = [48.1351, 11.5820]; 
  const { uiState, setUIState } = useTripStore();
  
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  // EFFECT: Auto-Open Popup when selectedPlaceId changes
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
          // FIX: Pass place object to color function to detect special type
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
// --- END OF FILE 270 Zeilen ---
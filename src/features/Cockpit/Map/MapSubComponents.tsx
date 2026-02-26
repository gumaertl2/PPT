// 26.02.2026 12:05 - FEAT: Extracted Map SubComponents and updated OfflineTileLayer to support dynamic MAP_LAYERS with unique cache keys.
// src/features/Cockpit/Map/MapSubComponents.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTripStore } from '../../../store/useTripStore';
import { MapOfflineService } from '../../../services/MapOfflineService';
import type { Place } from '../../../core/types/models';
import { MAP_LAYERS, getCategoryColor, DAY_COLORS } from './MapConstants';

export const MapStyles = () => (
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

export const MapLogic: React.FC<{ places: Place[] }> = ({ places }) => {
  const map = useMap();
  const { uiState } = useTripStore(); 
  const isInitialized = useRef(false);
  const lastSelectedId = useRef<string | null>(uiState.selectedPlaceId);

  useEffect(() => {
    const isOffline = uiState.mapMode === 'offline';
    const activeLayer = MAP_LAYERS[uiState.mapLayer as keyof typeof MAP_LAYERS] || MAP_LAYERS['standard'];
    const maxLimit = isOffline ? 14 : activeLayer.maxZoom;
    
    map.setMaxZoom(maxLimit);
    if (isOffline && map.getZoom() > 14) {
      map.setZoom(14, { animate: true });
    }
  }, [uiState.mapMode, uiState.mapLayer, map]);

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

export const MapResizer: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
    const map = useMap();
    useEffect(() => {
        const timer1 = setTimeout(() => map.invalidateSize(), 50);
        const timer2 = setTimeout(() => map.invalidateSize(), 300);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, [isFullscreen, map]);
    return null;
};

export const UserLocationMarker: React.FC<{ location: [number, number] | null }> = ({ location }) => {
    const map = useMap();
    useEffect(() => {
        if (location) map.flyTo(location, 14, { animate: true, duration: 1.5 });
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
            <Popup><div className="text-xs font-bold text-blue-600 p-1">Mein aktueller Standort</div></Popup>
        </Marker>
    );
};

// FIX: Offline Tile Layer now correctly reads uiState.mapLayer and caches with prefix
export const OfflineTileLayer = () => {
    const { uiState } = useTripStore();
    const { mapMode, mapLayer } = uiState;
    const map = useMap();

    useEffect(() => {
        const layerConfig = MAP_LAYERS[mapLayer as keyof typeof MAP_LAYERS] || MAP_LAYERS['standard'];
        const url = layerConfig.url;

        const ExtendedLayer = L.TileLayer.extend({
            createTile: function(coords: L.Coords, done: L.DoneCallback) {
                const tile = document.createElement('img');
                const key = `${mapLayer}/${coords.z}/${coords.x}/${coords.y}`;

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
            attribution: layerConfig.attribution,
            maxZoom: layerConfig.maxZoom
        });

        layer.addTo(map);
        return () => { map.removeLayer(layer); };
    }, [mapMode, mapLayer, map]);

    return null;
};

export const MapLegend: React.FC<{ places: Place[] }> = ({ places }) => {
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
// --- END OF FILE 221 Zeilen ---
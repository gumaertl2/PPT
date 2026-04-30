// 05.04.2026 18:30 - ARCHITECTURE: Extracted map utility components to reduce file size.
// src/features/Cockpit/Map/MapUtils.tsx

import React, { useEffect } from 'react';
import { useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '../../../core/types/models';

export const ZoomListener: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
    useMapEvents({
        zoomend: (e) => {
            onZoomChange(e.target.getZoom());
        }
    });
    return null;
};

export const PrintHelper: React.FC<{ isPreviewMode: boolean }> = ({ isPreviewMode }) => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => map.invalidateSize(false), 300);
        return () => clearTimeout(timer);
    }, [map, isPreviewMode]);
    return null;
};

export const PrintMapFitter: React.FC<{ places: Place[], isPrintMode?: boolean }> = ({ places, isPrintMode }) => {
    const map = useMap();
    useEffect(() => {
        if (isPrintMode && places.length > 0) {
            const validFitPlaces = places.filter(p => p.location && p.location.lat && p.location.lng);
            
            if (validFitPlaces.length > 0) {
                const lats = validFitPlaces.map(p => p.location!.lat);
                const lngs = validFitPlaces.map(p => p.location!.lng);
                
                const bounds: L.LatLngBoundsExpression = [
                    [Math.min(...lats), Math.min(...lngs)],
                    [Math.max(...lats), Math.max(...lngs)]
                ];
                
                map.invalidateSize();
                map.fitBounds(bounds, { padding: [15, 15], animate: false, maxZoom: 11 });
            }
        }
    }, [map, places, isPrintMode]);
    return null;
};
// --- END OF FILE 39 Zeilen ---
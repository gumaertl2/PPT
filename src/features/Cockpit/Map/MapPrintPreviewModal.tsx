// 05.04.2026 19:45 - FIX: Removed unused 'useEffect' import to resolve Vercel TS6133 build error.
// 05.04.2026 18:30 - ARCHITECTURE: Extracted print preview modal to reduce main map file size.
// src/features/Cockpit/Map/MapPrintPreviewModal.tsx

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, Tooltip } from 'react-leaflet';
import { Printer, X } from 'lucide-react';
import type { Place } from '../../../core/types/models';
import { ZoomListener, PrintHelper, PrintMapFitter } from './MapUtils';
import { getCategoryColor, createSmartIcon } from './MapConstants';
import { MapStyles, MapLogic, OfflineTileLayer } from './MapSubComponents';

interface MapPrintPreviewModalProps {
    isOpen: boolean; 
    onClose: () => void; 
    places: Place[]; 
    uiState: any; 
    hotelInfo: any; 
    visitedSequence: Map<string, number>; 
    scheduledPlaces: Map<string, number>; 
    t: any;
}

export const MapPrintPreviewModal: React.FC<MapPrintPreviewModalProps> = ({ isOpen, onClose, places, uiState, hotelInfo, visitedSequence, scheduledPlaces, t }) => {
    
    const [currentZoom, setCurrentZoom] = useState(10);
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

    const displayPlaces = useMemo(() => {
        const scaleFactor = Math.pow(0.5, Math.max(0, currentZoom - 10));
        const GROUP_DISTANCE = 0.03 * scaleFactor; 
        
        const groups: Place[][] = [];
        validPlaces.forEach(p => {
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
    }, [validPlaces, currentZoom]);

    if (!isOpen) return null;

    return createPortal(
        <div className="print-preview-portal fixed inset-0 z-[999999] bg-slate-900 flex flex-col print:bg-white print:block print:static print:h-auto">
            <div className="h-16 bg-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xl no-print">
                <div className="text-white font-bold flex items-center gap-2">
                    <Printer className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors" title={t('actions.cancel', { defaultValue: 'Abbrechen' })}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2">
                        <Printer className="w-4 h-4" /> {t('tooltips.menu_items.print', { defaultValue: 'Drucken' })}
                    </button>
                </div>
            </div>

            <div className="print-content-area flex-1 overflow-hidden flex justify-center items-center p-4 print:p-0 print:block print:overflow-visible print:h-auto">
                <style type="text/css" media="print">
                    {`
                        @page { size: A4 landscape; margin: 0; }
                        body { margin: 0 !important; padding: 0 !important; background: white !important; }
                        #root { display: none !important; }
                        
                        .print-preview-portal {
                            position: static !important;
                            display: block !important;
                            width: 100% !important;
                            height: auto !important;
                            background: white !important;
                        }
                        
                        .print-content-area {
                            display: block !important;
                            width: 100% !important;
                            height: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                        }

                        #print-map-wrapper {
                            position: relative !important; left: auto !important; top: auto !important;
                            width: 297mm !important; height: 209mm !important;
                            margin: 0 !important; padding: 0 !important;
                            transform: none !important;
                            box-shadow: none !important;
                            page-break-inside: avoid;
                        }
                        
                        .leaflet-control-container, .no-print { display: none !important; }
                        .leaflet-container { background: #f8fafc !important; }
                        
                        .leaflet-tile, .leaflet-marker-pane, .leaflet-marker-icon, .leaflet-marker-icon *, .leaflet-marker-shadow {
                            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                            color-adjust: exact !important; forced-color-adjust: none !important;
                            box-shadow: none !important; text-shadow: none !important;
                            filter: none !important; -webkit-filter: none !important;
                        }
                    `}
                </style>

                <div id="print-map-wrapper" className="w-[297mm] h-[209mm] max-w-full max-h-full bg-white shadow-2xl overflow-hidden print:shadow-none print:w-[297mm] print:h-[209mm]" style={{ transformOrigin: 'center center', transform: 'scale(min(calc((100vw - 2rem) / 1122), calc((100vh - 5rem) / 790)))' }}>
                     <MapContainer 
                        center={defaultCenter} 
                        zoom={10} 
                        zoomSnap={0.1} 
                        style={{ height: "100%", width: "100%" }} 
                        scrollWheelZoom={true} 
                        zoomControl={true}
                        dragging={true}
                    >
                        <ZoomListener onZoomChange={setCurrentZoom} />
                        <PrintMapFitter places={validPlaces} isPrintMode={true} />
                        <PrintHelper isPreviewMode={isOpen} />
                        <MapStyles /> 
                        <OfflineTileLayer />
                        <MapLogic places={places} />

                        {displayPlaces.map((place) => {
                            const isHotel = hotelInfo.ids.has(place.id) || 
                                            hotelInfo.names.has(place.name?.toLowerCase() || '') || 
                                            hotelInfo.names.has(place.official_name?.toLowerCase() || '') ||
                                            place.category?.toLowerCase().includes('hotel') ||
                                            place.category?.toLowerCase().includes('accommodation');

                            let badgeNumber = undefined;
                            if (uiState.visitedFilter === 'visited' || uiState.viewMode === 'diary') {
                                badgeNumber = visitedSequence.get(place.id);
                            } else if (uiState.sortMode === 'day') {
                                badgeNumber = scheduledPlaces.get(place.id);
                            }
                            
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
                                    position={[place.displayLat, place.displayLng]}
                                    icon={createSmartIcon(markerColor, false, badgeNumber, isHotel, userPrio, isFixed, !!place.visited)}
                                    zIndexOffset={(isHotel ? 900 : (badgeNumber ? 500 : baseZ))} 
                                >
                                    <Tooltip direction="top" offset={[0, -15]} opacity={0.95} className="custom-tooltip print:hidden">{place.name}</Tooltip>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>,
        document.body
    );
};
// --- END OF FILE 197 Zeilen ---
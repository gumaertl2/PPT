// 05.04.2026 19:50 - FIX: Restored zoomDelta={0.1} and wheelPxPerZoom={120} to MapContainer for smooth, stepless mouse wheel zooming.
// 05.04.2026 19:30 - ARCHITECTURE: Ultimate cleanup. Extracted data logic to useMapData hook and massive popup to MapMarkerPopup component. File size dropped from 760+ to ~200 lines.
// src/features/Cockpit/SightsMapView.tsx

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../core/types/models';
import { RefreshCw, Maximize, Minimize, Navigation, CloudOff, Database, Layers } from 'lucide-react'; 
import { OfflineMapModal } from './OfflineMapModal';

import { MAP_LAYERS, getCategoryColor, createSmartIcon } from './Map/MapConstants';
import { MapStyles, MapLogic, MapResizer, UserLocationMarker, OfflineTileLayer, MapLegend } from './Map/MapSubComponents';
import { ZoomListener, PrintMapFitter } from './Map/MapUtils';
import { MapPrintPreviewModal } from './Map/MapPrintPreviewModal';
import { MapMarkerPopup } from './Map/MapMarkerPopup';
import { useMapData } from './Map/useMapData';

export const SightsMapView: React.FC<{ places: Place[], setViewMode?: (mode: any) => void, forceDiaryMode?: boolean, isPrintMode?: boolean }> = ({ places, setViewMode, forceDiaryMode, isPrintMode }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) === 'en' ? 'en' : 'de';
  
  const { uiState, setUIState, project } = useTripStore(); 
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(10);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);

  const triggerHighlight = (id: string) => {
      setHighlightedPlaceId(id);
      setTimeout(() => setHighlightedPlaceId(null), 3000);
  };

  useEffect(() => {
      const handleOpenPreview = () => setShowPrintModal(true);
      window.addEventListener('open-map-print-preview', handleOpenPreview);
      return () => window.removeEventListener('open-map-print-preview', handleOpenPreview);
  }, []);

  const tripStart = project.userInputs.dates?.start || ''; 
  const tripEnd = project.userInputs.dates?.end || '';

  const {
      defaultCenter, displayPlaces, hotelInfo, validPlacesIncludedHotels, standaloneExpenses,
      visitedSequence, scheduledPlaces, allValidPlacesForLegend, isUpdatingCoords, updateProgress
  } = useMapData(places, currentZoom, forceDiaryMode);

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

  const containerClasses = isPrintMode
    ? "h-[450px] w-full relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden print:border-none print:rounded-none"
    : isFullscreen
        ? "fixed left-0 right-0 bottom-0 top-[70px] md:top-[80px] z-[40] bg-slate-100 shadow-2xl transition-all"
        : "h-[calc(100vh-180px)] min-h-[600px] w-full rounded-[2rem] overflow-hidden shadow-inner border border-slate-200 z-0 relative bg-slate-100 transition-all";

  return (
    <>
      <div className={containerClasses}>
        
        {!showPrintModal && (
             <style type="text/css" media="print">
                 {`
                     .leaflet-control-container { display: none !important; }
                     .leaflet-container { background: #f8fafc !important; }
                     .leaflet-tile, .leaflet-marker-pane, .leaflet-marker-icon, .leaflet-marker-icon *, .leaflet-marker-shadow {
                         -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                         color-adjust: exact !important; forced-color-adjust: none !important;
                         box-shadow: none !important; text-shadow: none !important;
                         filter: none !important; -webkit-filter: none !important;
                     }
                 `}
             </style>
        )}

        <MapStyles /> 

        {isUpdatingCoords && (
            <div className={`absolute top-4 right-20 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 text-xs font-medium text-slate-600 animate-in slide-in-from-top-2 print:hidden`}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span className="hidden sm:inline">Optimiere Koordinaten... ({updateProgress.current}/{updateProgress.total})</span>
            </div>
        )}

        {!isPrintMode && (
            <div className="print:hidden">
              <button onClick={() => setIsFullscreen(!isFullscreen)} className={`absolute top-4 right-4 z-[1000] bg-white text-slate-700 p-2.5 rounded-xl shadow-lg border border-slate-200 hover:text-blue-600 hover:bg-blue-50 transition-all focus:outline-none`} title={isFullscreen ? t('map.exit_fullscreen', "Breitbildmodus beenden") : t('map.enter_fullscreen', "Karte auf volle Breite vergrößern")}>
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
              <button onClick={handleLocateUser} className={`absolute top-[68px] right-4 z-[1000] bg-white text-blue-600 p-2.5 rounded-xl shadow-lg border border-slate-200 hover:bg-blue-50 transition-all focus:outline-none ${isLocating ? 'animate-pulse opacity-70' : ''}`} title={t('map.locate_me', "Meinen aktuellen GPS-Standort anzeigen")}>
                  <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin text-slate-400' : 'fill-blue-100'}`} />
              </button>
              <button onClick={() => setUIState({ isMapManagerOpen: true })} className={`absolute top-[120px] right-4 z-[1000] p-2.5 rounded-xl shadow-lg border transition-all focus:outline-none ${uiState.mapMode === 'offline' ? 'bg-slate-800 text-white border-slate-900 hover:bg-black' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`} title={t('map.manager.title', "Offline-Karten & Download")}>
                  {uiState.mapMode === 'offline' ? <CloudOff className="w-5 h-5" /> : <Database className="w-5 h-5" />}
              </button>
              <div className="absolute top-[172px] right-4 z-[1000]">
                  <button onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)} className={`p-2.5 rounded-xl shadow-lg border transition-all focus:outline-none ${isLayerMenuOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`} title="Karten-Ansicht (Ebenen) wechseln">
                      <Layers className="w-5 h-5" />
                  </button>
                  {isLayerMenuOpen && (
                      <div className="absolute top-0 right-14 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl w-48 overflow-hidden animate-in slide-in-from-right-2">
                          {Object.entries(MAP_LAYERS).map(([key, layer]) => (
                              <button key={key} onClick={() => { setUIState({ mapLayer: key as any }); setIsLayerMenuOpen(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${uiState.mapLayer === key ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>{t(layer.nameKey, layer.defaultName)}</button>
                          ))}
                      </div>
                  )}
              </div>
            </div>
        )}

        <MapContainer center={defaultCenter} zoom={10} zoomSnap={0.1} zoomDelta={0.1} wheelPxPerZoom={120} style={{ height: "100%", width: "100%" }} scrollWheelZoom={!isPrintMode} zoomControl={!isPrintMode} dragging={!isPrintMode} touchZoom={!isPrintMode} doubleClickZoom={!isPrintMode} zoomAnimation={!isPrintMode} fadeAnimation={!isPrintMode} markerZoomAnimation={!isPrintMode}>
          <ZoomListener onZoomChange={setCurrentZoom} />
          <PrintMapFitter places={validPlacesIncludedHotels} isPrintMode={isPrintMode} />
          <MapResizer isFullscreen={isFullscreen} />
          <OfflineTileLayer />
          <MapLogic places={places} />
          {!isPrintMode && <OfflineMapModal />}
          <UserLocationMarker location={userLocation} />

          {displayPlaces.map((place) => {
            const isSelected = uiState.selectedPlaceId === place.id;
            const cat = place.userSelection?.customCategory || place.category || '';
            const isHotel = hotelInfo.ids.has(place.id) || hotelInfo.names.has(place.name?.toLowerCase() || '') || hotelInfo.names.has(place.official_name?.toLowerCase() || '') || cat.toLowerCase() === 'hotel' || cat.toLowerCase() === 'accommodation';

            let badgeNumber = undefined;
            if (uiState.visitedFilter === 'visited' || forceDiaryMode) badgeNumber = visitedSequence.get(place.id);
            else if (uiState.sortMode === 'day') badgeNumber = scheduledPlaces.get(place.id);
            
            const markerColor = getCategoryColor(place.category, place);
            const isFixed = !!place.isFixed;
            const userPrio = place.userPriority ?? 0;
            
            let baseZ = 0;
            if (isFixed) baseZ = 400;
            else if (userPrio === 1) baseZ = 300;
            else if (userPrio === 2) baseZ = 200;
            else if (userPrio === -1) baseZ = -100;
            
            return (
              <Marker key={place.id} position={[place.displayLat, place.displayLng]} icon={createSmartIcon(markerColor, isSelected, badgeNumber, isHotel, userPrio, isFixed, !!place.visited)} zIndexOffset={isSelected ? 1000 : (isHotel ? 900 : (badgeNumber ? 500 : baseZ))} ref={(ref) => { markerRefs.current[place.id] = ref; }} eventHandlers={{ click: () => setUIState({ selectedPlaceId: place.id }) }}>
                {!isPrintMode && <Tooltip direction="top" offset={[0, -15]} opacity={0.95} className="custom-tooltip print:hidden">{place.name}</Tooltip>}
                {!isPrintMode && (
                    <MapMarkerPopup place={place} isHotel={isHotel} markerColor={markerColor} badgeNumber={badgeNumber} scheduledDay={scheduledPlaces.get(place.id)} isFixed={isFixed} userPrio={userPrio} t={t} currentLang={currentLang} tripStart={tripStart} tripEnd={tripEnd} forceDiaryMode={forceDiaryMode} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} setViewMode={setViewMode} highlightedPlaceId={highlightedPlaceId} triggerHighlight={triggerHighlight} />
                )}
              </Marker>
            );
          })}

          {standaloneExpenses.map((exp: any) => {
              const isSelected = uiState.selectedPlaceId === exp.id;
              return (
                  <Marker key={exp.id} position={[exp.location.lat, exp.location.lng]} icon={createSmartIcon('#10b981', isSelected, undefined, false, 0, false, true)} zIndexOffset={isSelected ? 1000 : 400} ref={(ref) => { markerRefs.current[exp.id] = ref; }} eventHandlers={{ click: () => setUIState({ selectedPlaceId: exp.id }) }}>
                      {!isPrintMode && <Tooltip direction="top" offset={[0, -15]} opacity={0.95} className="custom-tooltip print:hidden">{exp.title}</Tooltip>}
                      {!isPrintMode && (
                          <Popup className="print:hidden">
                              <div className="min-w-[200px] font-sans p-1">
                                  <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded bg-emerald-500" /><span className="text-[10px] uppercase font-bold text-slate-400">{t('finance.expense', { defaultValue: 'Ausgabe' })}</span></div>
                                  <h3 className="font-bold text-slate-900 text-sm mb-1">{exp.title}</h3>
                                  <p className="text-lg font-black text-emerald-600 mb-2">{exp.amount.toFixed(2)} {exp.currency}</p>
                                  <p className="text-xs text-slate-500 mb-2">{new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US')} • {t('finance.paid_by_label', {defaultValue: 'Gezahlt von'})} {exp.paidBy}</p>
                              </div>
                          </Popup>
                      )}
                  </Marker>
              );
          })}

          {!isPrintMode && <MapLegend places={allValidPlacesForLegend} />}
        </MapContainer>
      </div>

      <MapPrintPreviewModal isOpen={showPrintModal} onClose={() => setShowPrintModal(false)} places={places} uiState={uiState} hotelInfo={hotelInfo} visitedSequence={visitedSequence} scheduledPlaces={scheduledPlaces} t={t} />
    </>
  );
};
// --- END OF FILE 233 Zeilen ---
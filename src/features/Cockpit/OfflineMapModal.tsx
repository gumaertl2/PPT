// 26.02.2026 13:10 - FIX: Added download throttle (250ms sleep and reduced batch size) to prevent IP bans.
// 26.02.2026 12:55 - FEAT: Applied i18n translation hook to active layer name.
// 26.02.2026 12:20 - FEAT: Downloader uses selected MAP_LAYER and caches it securely with a layer prefix.
// src/features/Cockpit/OfflineMapModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Trash2, CloudOff, Database, Loader2, Map as MapIcon, Layers, Maximize2 } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { MapOfflineService } from '../../services/MapOfflineService';
import type { MapRegion } from '../../services/MapOfflineService';
import { useMap, useMapEvents, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { MAP_LAYERS } from './Map/MapConstants'; 

export const OfflineMapModal: React.FC = () => {
  const { t } = useTranslation();
  const { uiState, setUIState } = useTripStore();
  const map = useMap(); 
  
  const [cachedTileCount, setCachedTileCount] = useState(0);
  const [savedRegions, setSavedRegions] = useState<MapRegion[]>([]);
  const [regionName, setRegionName] = useState('');
  
  const [detailLevel, setDetailLevel] = useState<'standard' | 'high'>('standard');
  const [targetMB, setTargetMB] = useState(50);
  const [previewBounds, setPreviewBounds] = useState<L.LatLngBounds | null>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [totalToDownload, setTotalToDownload] = useState(0);

  useEffect(() => {
    if (uiState.isMapManagerOpen) {
      updateStats();
    } else {
      setIsMinimized(false); 
    }
  }, [uiState.isMapManagerOpen]);

  const updateStats = async () => {
    const stats = await MapOfflineService.getStats();
    const regions = await MapOfflineService.getRegions();
    setCachedTileCount(stats.count);
    setSavedRegions(regions);
  };

  const formatSize = (count: number) => {
    const mb = (count * 18) / 1024; 
    return mb.toFixed(1) + ' MB';
  };

  const fractionalLon2tile = (lon: number, zoom: number) => ((lon + 180) / 360) * Math.pow(2, zoom);
  const fractionalLat2tile = (lat: number, zoom: number) => ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * Math.pow(2, zoom);
  
  const tile2lon = (x: number, zoom: number) => (x / Math.pow(2, zoom)) * 360 - 180;
  const tile2lat = (y: number, zoom: number) => {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const updatePreviewBounds = useCallback(() => {
    if (!map) return;
    
    let pixelCenterX = map.getSize().x / 2;
    let pixelCenterY = map.getSize().y / 2;

    if (!isMinimized) {
      if (window.innerWidth >= 768) {
        pixelCenterX = (map.getSize().x - 340) / 2;
      } else {
        pixelCenterY = map.getSize().y * 0.35;
      }
    }

    const center = map.containerPointToLatLng(L.point(pixelCenterX, pixelCenterY));
    const safeMB = Math.max(10, Math.min(500, targetMB || 10));

    const maxTiles = (safeMB * 1024) / 18;
    const tilesAtMaxZoom = maxTiles * 0.75;
    const boxSizeInTiles = Math.sqrt(tilesAtMaxZoom);
    
    const maxZoom = detailLevel === 'high' ? 16 : 14;

    const cx = fractionalLon2tile(center.lng, maxZoom);
    const cy = fractionalLat2tile(center.lat, maxZoom);
    
    const minX = cx - boxSizeInTiles / 2;
    const maxX = cx + boxSizeInTiles / 2;
    const minY = cy - boxSizeInTiles / 2;
    const maxY = cy + boxSizeInTiles / 2;

    const north = tile2lat(minY, maxZoom);
    const south = tile2lat(maxY, maxZoom);
    const west = tile2lon(minX, maxZoom);
    const east = tile2lon(maxX, maxZoom);

    setPreviewBounds(L.latLngBounds([south, west], [north, east]));
  }, [map, targetMB, detailLevel, isMinimized]);

  useMapEvents({
    move() { if (uiState.isMapManagerOpen) updatePreviewBounds(); },
    zoom() { if (uiState.isMapManagerOpen) updatePreviewBounds(); },
    resize() { if (uiState.isMapManagerOpen) updatePreviewBounds(); }
  });

  useEffect(() => {
    if (uiState.isMapManagerOpen) updatePreviewBounds();
    else setPreviewBounds(null);
  }, [uiState.isMapManagerOpen, targetMB, detailLevel, updatePreviewBounds]);

  const handleTargetMBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTargetMB(isNaN(val) ? 0 : val);
  };

  const handleDownloadArea = async () => {
    if (!regionName.trim() || !previewBounds) return;

    const safeMB = Math.max(10, Math.min(500, targetMB || 10));
    setTargetMB(safeMB);

    const bounds = previewBounds;
    const minZoom = 10; 
    const maxZoom = detailLevel === 'high' ? 16 : 14; 
    
    const activeLayer = MAP_LAYERS[uiState.mapLayer as keyof typeof MAP_LAYERS] || MAP_LAYERS['standard'];
    const urlsToFetch: {key: string, url: string}[] = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = Math.floor(fractionalLon2tile(bounds.getWest(), z));
      const x2 = Math.floor(fractionalLon2tile(bounds.getEast(), z));
      const y1 = Math.floor(fractionalLat2tile(bounds.getNorth(), z));
      const y2 = Math.floor(fractionalLat2tile(bounds.getSouth(), z));

      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          urlsToFetch.push({
            key: `${uiState.mapLayer}/${z}/${x}/${y}`,
            url: activeLayer.url.replace('{s}', 'a').replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
          });
        }
      }
    }

    if (urlsToFetch.length > 15000) {
      alert(t('map.manager.limit_error', 'Bereich zu groß für diese Detailstufe.'));
      return;
    }

    setIsDownloading(true);
    setTotalToDownload(urlsToFetch.length);
    setDownloadProgress(0);

    const savedKeys: string[] = [];
    
    // FIX: Batch-Size reduziert auf 5 für sanfteren Traffic ohne Spike-Erkennung beim Tile-Server
    const batchSize = 5; 

    for (let i = 0; i < urlsToFetch.length; i += batchSize) {
      const batch = urlsToFetch.slice(i, i + batchSize);
      await Promise.all(batch.map(async (tile) => {
        try {
          const existing = await MapOfflineService.getTile(tile.key);
          if (!existing) {
            const res = await fetch(tile.url);
            if (res.ok) {
              const blob = await res.blob();
              await MapOfflineService.saveTile(tile.key, blob);
            }
          }
          savedKeys.push(tile.key);
        } catch (e) {
          console.warn("Tile fetch failed", tile.key);
        }
      }));
      setDownloadProgress(Math.min(i + batchSize, urlsToFetch.length));
      
      // FIX: Tempolimit! Nach jedem Mini-Batch warten wir eine Viertelsekunde (250ms), um den IP-Ban zu umgehen.
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    const translatedLayerName = t(activeLayer.nameKey, activeLayer.defaultName).split(' ')[0];
    
    const newRegion: MapRegion = {
      id: uuidv4(),
      name: `${regionName.trim()} (${translatedLayerName})` + (detailLevel === 'high' ? ' HD' : ''),
      tileKeys: savedKeys,
      sizeInMB: (savedKeys.length * 18) / 1024,
      createdAt: new Date().toISOString()
    };
    await MapOfflineService.saveRegion(newRegion);

    setIsDownloading(false);
    setRegionName('');
    updateStats();
  };

  const handleDeleteRegion = async (id: string) => {
    if (window.confirm(t('actions.delete') + '?')) {
      setSavedRegions(prev => prev.filter(r => r.id !== id));
      try {
        await MapOfflineService.deleteRegion(id);
        updateStats();
      } catch (e) {
        console.error("Deletion failed", e);
        updateStats();
      }
    }
  };

  const stopEventPropagation = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
    e.stopPropagation();
  };

  if (!uiState.isMapManagerOpen) return null;

  return (
    <>
      {previewBounds && (
        <Rectangle 
          bounds={previewBounds} 
          pathOptions={{ color: '#3b82f6', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.15, dashArray: '6, 6' }} 
        />
      )}

      {isMinimized && (
        <div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto"
          onDoubleClick={stopEventPropagation}
          onMouseDown={stopEventPropagation}
          onTouchStart={stopEventPropagation}
          onWheel={stopEventPropagation}
        >
          <button 
            onClick={() => setIsMinimized(false)}
            className="bg-blue-600 text-white px-5 py-3.5 rounded-full shadow-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all border-4 border-white/20"
          >
            <MapIcon className="w-5 h-5 animate-pulse" />
            {t('map.manager.btn_restore', 'Ausschnitt wählen & Fortfahren')}
          </button>
        </div>
      )}

      {!isMinimized && (
        <div className="absolute md:top-4 md:right-20 bottom-0 left-0 right-0 md:left-auto z-[9999] pointer-events-none flex flex-col w-full md:w-[260px]">
          <div 
            className="bg-white/95 backdrop-blur-md md:rounded-2xl rounded-t-2xl shadow-2xl w-full flex flex-col border border-slate-200 pointer-events-auto animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 max-h-[85vh] md:max-h-full"
            onDoubleClick={stopEventPropagation}
            onMouseDown={stopEventPropagation}
            onTouchStart={stopEventPropagation}
            onWheel={stopEventPropagation}
          >
            
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200/60 bg-slate-50/80 md:rounded-t-2xl rounded-t-2xl shrink-0 relative z-10">
              <div className="flex items-center gap-2 text-slate-800">
                <Database className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-base">{t('map.manager.title', 'Offline-Karten')}</h3>
              </div>
              <button 
                onClick={() => setUIState({ isMapManagerOpen: false })}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar relative z-0">
              
              <div className="bg-slate-100 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">{t('map.manager.storage_label', 'Speicherplatz')}</p>
                  <p className="text-base font-black text-slate-800 leading-none">{formatSize(cachedTileCount)}</p>
                </div>
                <CloudOff className={`w-4 h-4 ${uiState.mapMode === 'offline' ? 'text-amber-500' : 'text-slate-300'}`} />
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-bold text-slate-800">{t('map.manager.area_size', 'Budget & Rahmen')}</h4>
                    <button 
                      onClick={() => setIsMinimized(true)}
                      className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-md text-[9px] font-bold transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                      {t('map.manager.btn_minimize', 'Karte ausrichten')}
                    </button>
                 </div>

                 <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-2">
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={targetMB || ''} 
                        onChange={handleTargetMBChange}
                        onBlur={() => setTargetMB(m => Math.max(10, Math.min(500, m || 10)))}
                        step="10"
                        className="w-16 text-right bg-transparent font-black text-2xl text-blue-600 outline-none"
                      />
                      <span className="font-bold text-slate-400 text-sm ml-1">MB</span>
                    </div>
                 </div>
              </div>

              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setDetailLevel('standard')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                    detailLevel === 'standard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[10px]"><MapIcon className="w-3 h-3" /> {t('map.manager.zoom_standard', 'Standard')}</div>
                </button>
                <button 
                  onClick={() => setDetailLevel('high')}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                    detailLevel === 'high' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold text-[10px]"><Layers className="w-3 h-3" /> {t('map.manager.zoom_high', 'Detail')}</div>
                </button>
              </div>

              <div className="space-y-2.5">
                <input 
                  type="text"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder={t('map.manager.name_placeholder', 'Name der Region...')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button 
                  onClick={handleDownloadArea}
                  disabled={isDownloading || !regionName.trim()}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                    isDownloading ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                  }`}
                >
                  {isDownloading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {downloadProgress} / {totalToDownload}</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> {t('map.manager.btn_download', 'Diesen Bereich speichern')}</>
                  )}
                </button>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800">{t('map.manager.saved_title', 'Gespeicherte Gebiete')}</h4>
                {savedRegions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">{t('map.manager.no_regions', 'Noch keine Daten.')}</p>
                ) : (
                  <div className="space-y-2">
                    {savedRegions.map(region => (
                      <div key={region.id} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <MapIcon className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{region.name}</p>
                            <p className="text-[9px] text-slate-400">{region.sizeInMB.toFixed(1)} MB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteRegion(region.id)}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-700">{t('map.mode_offline', 'Offline-Modus')}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{t('map.manager.offline_hint', 'Stoppt alle Live-Daten.')}</p>
                </div>
                <button 
                  onClick={() => setUIState({ mapMode: uiState.mapMode === 'live' ? 'offline' : 'live' })}
                  className={`px-2.5 py-1.5 rounded-md font-bold text-[9px] flex items-center gap-1 transition-all shadow-sm ${
                    uiState.mapMode === 'offline' ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {uiState.mapMode === 'offline' ? 'AKTIV' : 'AUS'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
// --- END OF FILE 387 Zeilen ---
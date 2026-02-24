// 24.02.2026 16:20 - FIX: Changed MapRegion import to 'import type' to resolve runtime SyntaxError.
// 24.02.2026 16:10 - FEAT: Added Region Management UI, MB display, and Zoom-14 efficiency.
// 24.02.2026 15:40 - FEAT: Dedicated Offline Map Manager Modal with targeted area download.
// src/features/Cockpit/OfflineMapModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, CloudOff, Database, Loader2, Info, Map as MapIcon } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { MapOfflineService } from '../../services/MapOfflineService';
import type { MapRegion } from '../../services/MapOfflineService';
import { useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

export const OfflineMapModal: React.FC = () => {
  const { t } = useTranslation();
  const { uiState, setUIState } = useTripStore();
  const map = useMap(); 
  
  const [cachedTileCount, setCachedTileCount] = useState(0);
  const [savedRegions, setSavedRegions] = useState<MapRegion[]>([]);
  const [regionName, setRegionName] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [totalToDownload, setTotalToDownload] = useState(0);

  useEffect(() => {
    if (uiState.isMapManagerOpen) {
      updateStats();
    }
  }, [uiState.isMapManagerOpen]);

  const updateStats = async () => {
    const stats = await MapOfflineService.getStats();
    const regions = await MapOfflineService.getRegions();
    setCachedTileCount(stats.count);
    setSavedRegions(regions);
  };

  const formatSize = (count: number) => {
    const mb = (count * 18) / 1024; // Durchschnitt ~18KB pro Kachel
    return mb.toFixed(1) + ' MB';
  };

  if (!uiState.isMapManagerOpen) return null;

  const lon2tile = (lon: number, zoom: number) => (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
  const lat2tile = (lat: number, zoom: number) => (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));

  const handleDownloadArea = async () => {
    if (!regionName.trim()) {
      alert(t('map.manager.name_label'));
      return;
    }

    const bounds = map.getBounds();
    const minZoom = 10; 
    const maxZoom = 14; // Optimiert für Straßennamen bei geringem Speicherverbrauch
    
    const urlsToFetch: {key: string, url: string}[] = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const x1 = lon2tile(bounds.getWest(), z);
      const x2 = lon2tile(bounds.getEast(), z);
      const y1 = lat2tile(bounds.getNorth(), z);
      const y2 = lat2tile(bounds.getSouth(), z);

      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          urlsToFetch.push({
            key: `${z}/${x}/${y}`,
            url: `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`
          });
        }
      }
    }

    if (urlsToFetch.length > 5000) {
      alert(t('map.manager.limit_error'));
      return;
    }

    setIsDownloading(true);
    setTotalToDownload(urlsToFetch.length);
    setDownloadProgress(0);

    const savedKeys: string[] = [];

    const batchSize = 10;
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
    }

    // Region Metadaten speichern
    const newRegion: MapRegion = {
      id: uuidv4(),
      name: regionName.trim(),
      tileKeys: savedKeys,
      sizeInMB: (savedKeys.length * 18) / 1024,
      createdAt: new Date().toISOString()
    };
    await MapOfflineService.saveRegion(newRegion);

    setIsDownloading(false);
    setRegionName('');
    updateStats();
    alert(t('map.manager.success_msg'));
  };

  const handleDeleteRegion = async (id: string) => {
    if (window.confirm(t('common.confirm'))) {
      await MapOfflineService.deleteRegion(id);
      updateStats();
    }
  };

  return (
    <div className="absolute inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-lg">{t('map.manager.title')}</h3>
          </div>
          <button 
            onClick={() => setUIState({ isMapManagerOpen: false })}
            className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto max-h-[70vh]">
          
          <div className="bg-slate-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">{t('map.manager.storage_label')}</p>
              <p className="text-xl font-black text-slate-800">{formatSize(cachedTileCount)}</p>
            </div>
            <CloudOff className={`w-6 h-6 ${uiState.mapMode === 'offline' ? 'text-amber-500' : 'text-slate-300'}`} />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800">{t('map.manager.download_title')}</h4>
            <input 
              type="text"
              value={regionName}
              onChange={(e) => setRegionName(e.target.value)}
              placeholder={t('map.manager.name_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button 
              onClick={handleDownloadArea}
              disabled={isDownloading || !regionName.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                isDownloading ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
              }`}
            >
              {isDownloading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {downloadProgress} / {totalToDownload}</>
              ) : (
                <><Download className="w-4 h-4" /> {t('map.manager.btn_download')}</>
              )}
            </button>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800">{t('map.manager.saved_title')}</h4>
            {savedRegions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">{t('map.manager.no_regions')}</p>
            ) : (
              <div className="space-y-2">
                {savedRegions.map(region => (
                  <div key={region.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <MapIcon className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{region.name}</p>
                        <p className="text-[10px] text-slate-400">{region.sizeInMB.toFixed(1)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteRegion(region.id)}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-amber-800 font-medium leading-tight mb-2">{t('map.manager.download_desc')}</p>
              <button 
                onClick={() => setUIState({ mapMode: uiState.mapMode === 'live' ? 'offline' : 'live' })}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center gap-2 transition-all ${
                  uiState.mapMode === 'offline' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {t('map.mode_offline')}: {uiState.mapMode === 'offline' ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 195 Zeilen ---
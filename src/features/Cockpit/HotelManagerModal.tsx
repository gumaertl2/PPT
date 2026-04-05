// 05.04.2026 18:00 - FIX: Extracted setUIState correctly from useTripStore to fix the broken "jump to map" button inside the modal.
// 05.04.2026 13:30 - FIX: Implemented full i18n support, decoupled sorting logic from translated strings.
// src/features/Cockpit/HotelManagerModal.tsx

import React, { useMemo, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { useTranslation } from 'react-i18next';
import { X, BedDouble } from 'lucide-react';
import type { Place, RouteStop } from '../../core/types';

interface HotelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  overrideDetailLevel?: any;
}

export const HotelManagerModal: React.FC<HotelManagerModalProps> = ({ isOpen, onClose, overrideDetailLevel }) => {
  const { t } = useTranslation();
  const { project, uiState, setUIState } = useTripStore();
  const places = Object.values(project.data.places || {}) as Place[];
  const showPlanningMode = uiState.showPlanningMode || false;

  useEffect(() => {
    if (isOpen && uiState.selectedPlaceId) {
        setTimeout(() => {
            const el = document.getElementById(`hotel-card-${uiState.selectedPlaceId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-4', 'transition-all', 'duration-500');
                setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-4'), 3000);
            }
        }, 300);
    }
  }, [isOpen, uiState.selectedPlaceId]);

  const groupedHotels = useMemo(() => {
      const mode = project.userInputs.logistics.mode;
      const stops = project.userInputs.logistics.roundtrip?.stops || [];
      
      const hotelList = places.filter(p => {
          const cat = p.userSelection?.customCategory || p.category || '';
          return cat.toLowerCase() === 'hotel' || cat.toLowerCase() === 'accommodation';
      });
      
      const getStopIndex = (p: any) => {
          if (mode === 'stationaer') return -2; 
          let idx = stops.findIndex((s: RouteStop) => s.hotel === p.id);
          if (idx !== -1) return idx;
          
          const hCity = (p.city || '').toLowerCase();
          const hAddr = (p.address || '').toLowerCase();
          const hName = (p.name || '').toLowerCase();
          const hReasoning = (p.location_match || '').toLowerCase();
          
          return stops.findIndex((s: RouteStop) => {
              const sLoc = (s.location || '').replace(/Region\s+/i, '').trim().toLowerCase();
              if (sLoc.length < 3) return false;
              
              const match1 = hCity.includes(sLoc) || (hCity.length > 2 && sLoc.includes(hCity));
              const match2 = hAddr.includes(sLoc) || (hAddr.length > 2 && sLoc.includes(hAddr));
              const match3 = hName.includes(sLoc) || (hName.length > 2 && sLoc.includes(hName));
              const match4 = hReasoning.includes(sLoc);
              
              return match1 || match2 || match3 || match4;
          });
      };

      const groups: Record<string, Place[]> = {};
      
      hotelList.forEach(p => {
          const idx = getStopIndex(p);
          let internalKey = '';
          if (idx === -2) internalKey = 'stationary';
          else if (idx >= 0) internalKey = `station_${idx}`;
          else internalKey = 'other';
          
          if (!groups[internalKey]) groups[internalKey] = [];
          groups[internalKey].push({ ...p, _targetStopIndex: idx >= 0 ? idx : undefined } as any);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
          if (a === 'stationary') return -1;
          if (b === 'stationary') return 1;
          if (a.startsWith('station_') && b.startsWith('station_')) {
              return parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]);
          }
          if (a.startsWith('station_')) return -1;
          if (b.startsWith('station_')) return 1;
          return 0; 
      });

      return { groups, sortedKeys, stops };
  }, [places, project.userInputs.logistics]);

  const renderGroupTitle = (key: string) => {
      if (key === 'stationary') return t('cockpit.hotel_manager.stationary_group', { defaultValue: '🏡 Unterkunft / Hotel (Stationär)' });
      if (key.startsWith('station_')) {
          const idx = parseInt(key.split('_')[1]);
          const locationName = groupedHotels.stops[idx]?.location || '';
          return t('cockpit.hotel_manager.station_group', { index: idx + 1, name: locationName, defaultValue: `🏡 Station ${idx + 1}: ${locationName}` });
      }
      return t('cockpit.hotel_manager.other_group', { defaultValue: '🏡 Weitere Unterkünfte' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in">
        <div className="bg-slate-50 w-full max-w-5xl max-h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            <div className="px-4 sm:px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <BedDouble className="w-6 h-6 text-emerald-600" />
                    {t('cockpit.manage_hotels', { defaultValue: 'Unterkünfte verwalten' })}
                </h2>
                <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {groupedHotels.sortedKeys.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 font-medium">
                        {t('cockpit.hotel_manager.empty', { defaultValue: 'Keine Unterkünfte vorhanden.' })}
                    </div>
                ) : (
                    groupedHotels.sortedKeys.map(key => {
                        const items = groupedHotels.groups[key].sort((a: any, b: any) => {
                            const aIsReserve = a.userPriority === -1;
                            const bIsReserve = b.userPriority === -1;
                            if (aIsReserve && !bIsReserve) return 1;
                            if (!aIsReserve && bIsReserve) return -1;
                            return (b.userPriority || 0) - (a.userPriority || 0);
                        });

                        return (
                            <div key={key} className="mb-8 last:mb-0">
                                <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-3 pb-2 border-b border-emerald-100/50 flex justify-between items-center">
                                    <span>{renderGroupTitle(key)}</span>
                                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-xs shadow-inner border border-emerald-200">{items.length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {items.map(place => (
                                        <div key={place.id} id={`hotel-card-${place.id}`}>
                                            <SightCard 
                                                id={place.id} 
                                                data={place} 
                                                mode="selection" 
                                                showPriorityControls={showPlanningMode} 
                                                detailLevel={overrideDetailLevel || 'standard'} 
                                                isReserve={place.userPriority === -1} 
                                                onShowMapOverride={(e) => {
                                                    setUIState({ selectedPlaceId: place.id, viewMode: 'map' });
                                                    onClose();
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
                <button onClick={onClose} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all">
                    {t('actions.close', { defaultValue: 'Schließen' })}
                </button>
            </div>
        </div>
    </div>
  );
};
// --- END OF FILE 162 Zeilen ---
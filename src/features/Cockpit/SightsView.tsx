// 05.04.2026 19:00 - ARCHITECTURE: Refactored massive file. Extracted data logic to useSightsData hook. File is now clean and maintainable.
// src/features/Cockpit/SightsView.tsx

import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests'; 
import type { LanguageCode, Place, DetailLevel, CockpitViewMode } from '../../core/types';
import { SightsMapView } from './SightsMapView';
import { DayPlannerView } from './DayPlannerView'; 
import { HotelManagerModal } from './HotelManagerModal';
import { useSightsData } from './hooks/useSightsData';

import { 
  FileText,
  Briefcase, 
  Layout,
  Navigation,
  Zap,
  RefreshCw,
  BedDouble
} from 'lucide-react';

export const SightsView: React.FC<{ overrideSortMode?: any, overrideDetailLevel?: DetailLevel, setViewMode?: (mode: CockpitViewMode) => void }> = ({ overrideSortMode, overrideDetailLevel, setViewMode }) => {
  const { t, i18n } = useTranslation(); 
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;

  const { project, uiState, setUIState } = useTripStore();
  const places = Object.values(project.data.places || {}) as Place[];
  const showPlanningMode = uiState.showPlanningMode || false;
  const activeSortMode = overrideSortMode || (uiState.sortMode as string) || 'category';
  const isTourMode = activeSortMode === 'tour';
  const isDayMode = activeSortMode === 'day';

  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);

  // DEDICATED HOOK: All heavy lifting happens here now!
  const { 
      filteredLists, 
      budgetStats, 
      allHotels, 
      tourOptions, 
      handleLocateNearestSight, 
      handleBatchLiveCheck, 
      isLocating, 
      isLiveChecking, 
      liveCheckProgress 
  } = useSightsData(places, overrideSortMode);

  useEffect(() => {
      (window as any).__openHotelModal = (placeId: string) => {
          setUIState({ selectedPlaceId: placeId });
          setIsHotelModalOpen(true);
      };
      return () => {
          delete (window as any).__openHotelModal;
      };
  }, [setUIState]);

  useEffect(() => {
    if (overrideSortMode) return;
    if (uiState.viewMode === 'list' && uiState.selectedPlaceId) {
      setTimeout(() => {
        const element = document.getElementById(`card-${uiState.selectedPlaceId}`);
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'transition-all', 'duration-500');
          setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4'), 3000);
        }
      }, 150);
    }
  }, [uiState.selectedPlaceId, uiState.viewMode, overrideSortMode]);
  
  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "";
    if (catId === 'custom_diary') return `📔 ${t('diary.title', { defaultValue: 'Eigenes Reisetagebuch' })}`;
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    if (catId === 'hotel') return t('interests.hotel', { defaultValue: 'Hotels' });
    return String(catId).charAt(0).toUpperCase() + String(catId).slice(1).replace(/_/g, ' ');
  };

  const renderGroupedList = (list: any[], groupByOverride?: 'city') => {
    if (list.length === 0) return null; 
    const sortMode = activeSortMode;
    const groups: Record<string, any[]> = {};
    
    list.forEach(p => {
        const meta = p._meta; 

        if (groupByOverride === 'city') {
            const key = p.city || t('sights.group_general_regional', { defaultValue: 'Allgemein / Überregional' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
        else if (sortMode === 'priority') {
            const val = meta.prioVal;
            let key = t('sights.no_prio', { defaultValue: '⚪️ Ohne Priorität' });
            if (val === 4) key = t('sights.must_see', { defaultValue: '⭐️ Muss ich sehen (Fix)' });
            if (val === 3) key = t('sights.prio_1', { defaultValue: '🥇 Prio 1' });
            if (val === 2) key = t('sights.prio_2', { defaultValue: '🥈 Prio 2' });
            if (val === 0) key = t('sights.ignored', { defaultValue: '❌ Reserve / Ignoriert' });
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
        else if (sortMode === 'tour') {
            const assignedIds = new Set<string>();
            tourOptions.forEach((tour: any) => {
                const title = tour.label || "Tour";
                const tourPlaces = list.filter(lp => tour.placeIds?.includes(lp.id));
                if (tourPlaces.length > 0) {
                    groups[title] = tourPlaces.sort((a, b) => (tour.placeIds.indexOf(a.id) - tour.placeIds.indexOf(b.id)));
                    tourPlaces.forEach(lp => assignedIds.add(lp.id));
                }
            });
            const leftovers = list.filter(lp => !assignedIds.has(lp.id));
            if (leftovers.length > 0) groups[t('sights.group_other_tour', { defaultValue: 'Weitere Orte (Ohne Tour)' })] = leftovers;
        } 
        else {
            let key = t('sights.group_general', { defaultValue: 'Allgemein' });
            if (sortMode === 'category') {
                key = resolveCategoryLabel(String(meta.cat));
            } else if (sortMode === 'alphabetical') {
                // SAFETY FIX: Check string type and length to prevent crash
                key = typeof meta.name === 'string' && meta.name.length > 0 ? meta.name[0].toUpperCase() : '?';
            }
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
    });

    const groupKeys = Object.keys(groups);
    if (sortMode === 'priority') {
        const priorityOrder = [
          t('sights.must_see', { defaultValue: '⭐️ Muss ich sehen (Fix)' }),
          t('sights.prio_1', { defaultValue: '🥇 Prio 1' }),
          t('sights.prio_2', { defaultValue: '🥈 Prio 2' }),
          t('sights.no_prio', { defaultValue: '⚪️ Ohne Priorität' }),
          t('sights.ignored', { defaultValue: '❌ Reserve / Ignoriert' })
        ];
        groupKeys.sort((a, b) => priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
    } else if (sortMode === 'category') {
        groupKeys.sort((a, b) => a.localeCompare(b));
    }

    return groupKeys.map((groupKey) => {
      const items = groups[groupKey];
      return (
        <div key={groupKey} className="mb-6 last:mb-0 print:break-inside-avoid">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between print:text-black">
            <span className="flex items-center gap-2">{groupByOverride === 'city' && <span className="text-lg">📍</span>}{groupKey}</span>
            <span className="text-xs text-gray-300 print:text-gray-500">{items.length}</span>
          </h3>
          <div className="space-y-3">
            {items.map(place => (
              <div key={place.id} id={`card-${place.id}`}>
                  <SightCard id={place.id} data={place} mode="selection" showPriorityControls={showPlanningMode} detailLevel={overrideDetailLevel} isReserve={place._liveIsReserve} />
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="pb-24 sights-view-root print:pb-0">
      
      {isHotelModalOpen && (
          <HotelManagerModal 
             isOpen={isHotelModalOpen} 
             onClose={() => setIsHotelModalOpen(false)} 
             overrideDetailLevel={overrideDetailLevel} 
          />
      )}

      {showPlanningMode && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-10 animate-in fade-in slide-in-from-top-2 print:hidden">
           <div className="flex items-center gap-6 w-full justify-center md:justify-start">
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.budget', { defaultValue: 'Budget' })}</span>
                 <span className="text-xl font-black text-gray-800">{Math.round(budgetStats.total / 60)} h</span>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.planned', { defaultValue: 'Geplant' })}</span>
                 <span className={`text-xl font-black ${budgetStats.remaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>{Math.round(budgetStats.used / 60)} h</span>
              </div>
              {budgetStats.remaining < 0 && <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">! {t('sights.time_exceeded', { defaultValue: 'Zeit überschritten' })}</span>}
           </div>
           <div className="text-xs text-gray-400 font-medium italic hidden md:block">{t('sights.planning_active', { defaultValue: 'Planungsmodus aktiv' })}</div>
        </div>
      )}

      {uiState.viewMode === 'map' && !overrideSortMode ? (
        <div className="mb-8 print:hidden"><SightsMapView places={[...filteredLists.main, ...filteredLists.special] as Place[]} setViewMode={setViewMode} /></div>
      ) : isDayMode ? (
        <div className="mb-8"><DayPlannerView places={places} showPlanningMode={showPlanningMode} overrideDetailLevel={overrideDetailLevel} /></div>
      ) : (
        <>
            <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative mx-4 print:border-none print:shadow-none print:p-0">
                <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden z-10">
                    {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                    {t('sights.candidates', { defaultValue: 'ORTE & KANDIDATEN' })} ({filteredLists.main.length})
                </div>
                
                {!overrideSortMode && (
                    <div className="flex justify-end mb-4 print:hidden pt-2 gap-2 flex-wrap">
                        
                        <button 
                            onClick={() => setIsHotelModalOpen(true)} 
                            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border bg-emerald-600 hover:bg-emerald-700 text-white border-transparent hover:shadow-md mr-auto"
                            title={t('cockpit.hotel_manager.tooltip', { defaultValue: 'Unterkünfte separat verwalten' })}
                        >
                            <BedDouble className="w-4 h-4" /> 
                            {t('cockpit.hotel_manager.title', { defaultValue: 'Unterkünfte verwalten' })} ({allHotels.length})
                        </button>

                        <button onClick={handleBatchLiveCheck} disabled={isLiveChecking} className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border ${isLiveChecking ? 'bg-amber-50 text-amber-500 border-amber-100 cursor-not-allowed' : 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 hover:shadow-md'}`}>
                            {isLiveChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-500 fill-current" />}
                            {isLiveChecking ? t('sights.live_check_progress', { current: liveCheckProgress.current, total: liveCheckProgress.total, defaultValue: `Update läuft... (${liveCheckProgress.current}/${liveCheckProgress.total})` }) : t('sights.live_check_btn', { defaultValue: 'Live-Update (Auswahl)' })}
                        </button>
                        <button onClick={handleLocateNearestSight} disabled={isLocating} className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm border ${isLocating ? 'bg-indigo-50 text-indigo-400 border-indigo-100 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent hover:shadow-md'}`}>
                            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? t('sights.radar_locating', { defaultValue: 'Ortung läuft...' }) : t('sights.radar_button', { defaultValue: 'Radar: Was ist in meiner Nähe?' })}
                        </button>
                    </div>
                )}
                
                <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>
            </div>

            {!isTourMode && filteredLists.special.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl border-2 border-amber-200 shadow-sm p-4 md:p-6 relative mx-4 mb-8 print:border-none print:bg-transparent">
                    <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 print:hidden">
                        <Layout className="w-3 h-3" /> {t('sights.special_days_ideas', { defaultValue: 'SONDERTAGE & IDEEN' })} ({filteredLists.special.length})
                    </div>
                    <div className="mt-2">{renderGroupedList(filteredLists.special, 'city')}</div>
                </div>
            )}
        </>
      )}
    </div>
  );
};
// --- END OF FILE 234 Zeilen ---
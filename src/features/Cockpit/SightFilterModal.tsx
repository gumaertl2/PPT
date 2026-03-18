// 19.03.2026 13:30 - UX: Updated search placeholder to clearly indicate full-text capabilities.
// 17.03.2026 14:30 - FIX: Enforced strict I18N compliance for 'Real Days'.
// src/features/Cockpit/SightFilterModal.tsx

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { INTEREST_DATA } from '../../data/interests'; 
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import { 
  Filter, X, List, Grid, FileText, Tags, Map as MapIcon, 
  Calendar, ArrowDownAZ, Search, Briefcase, Star, CheckCircle
} from 'lucide-react';

const getRealPriorityValue = (p: any): number => {
    if (p.isFixed) return 4;               
    if (p.userPriority === 1) return 3;    
    if (p.userPriority === 2) return 2;    
    if (p.userPriority === -1) return 0;   
    return 1;                              
};

const getRealDay = (dateStr: string, startStr: string) => {
    if (!startStr) return 1;
    const start = new Date(startStr); start.setHours(0,0,0,0);
    const visit = new Date(dateStr); visit.setHours(0,0,0,0);
    const diff = visit.getTime() - start.getTime();
    return Math.floor(diff / 86400000) + 1;
};

export const SightFilterModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { project, uiState, setUIState, isSightFilterOpen, toggleSightFilter } = useTripStore();
  
  const currentLang = i18n.language.substring(0, 2) === 'en' ? 'en' : 'de';

  const places = Object.values(project.data.places || {}) as any[];
  const analysis = project.analysis;
  const activeSortMode = uiState.sortMode || 'category';
  const showPlanningMode = uiState.showPlanningMode || false;

  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "";
    if (catId === 'custom_diary') return `📔 ${t('diary.title', { defaultValue: currentLang === 'en' ? 'Live Diary' : 'Eigenes Reisetagebuch' })}`;
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    if (catId === 'hotel') return t('interests.hotel', { defaultValue: currentLang === 'en' ? 'Hotels' : 'Hotels' });
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    const ignoreList = APPENDIX_ONLY_INTERESTS || [];
    places.forEach((p: any) => {
      if (uiState.visitedFilter === 'visited' && !p.visited) return;
      if (uiState.visitedFilter === 'unvisited' && p.visited) return;

      const cat = p.category || 'Sonstiges';
      if (!ignoreList.includes(cat) || cat === 'hotel') { 
          counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    
    return Object.keys(counts).sort().map(cat => ({
        id: cat,
        label: resolveCategoryLabel(cat),
        count: counts[cat]
    }));
  }, [places, uiState.visitedFilter, currentLang, t]);

  const tourOptions = useMemo(() => {
      const tourGuide = (analysis as any)?.tourGuide;
      const tours = (tourGuide?.guide?.tours || []) as any[];
      
      const mappedTours = tours.map((tour: any) => {
          const count = (tour.suggested_order_ids || []).filter((id: string) => {
              const p = places.find(pl => pl.id === id);
              if (!p) return false;
              if (uiState.visitedFilter === 'visited' && !p.visited) return false;
              if (uiState.visitedFilter === 'unvisited' && p.visited) return false;
              return true;
          }).length;

          return {
              id: tour.tour_title || "Tour", 
              label: tour.tour_title || "Tour",
              count: count,
              placeIds: tour.suggested_order_ids || []
          };
      }).filter((t: any) => t.count > 0);

      const specialPlaces = places.filter((p: any) => p.category === 'special');
      if (specialPlaces.length > 0) {
          mappedTours.push({
              id: 'tour_special', 
              label: t('sights.tour_special', { defaultValue: currentLang === 'en' ? 'Tour: Special Days & Ideas' : 'Tour: Sondertage & Ideen' }),
              count: specialPlaces.length,
              placeIds: specialPlaces.map((p: any) => p.id)
          });
      }

      return mappedTours;
  }, [analysis, places, uiState.visitedFilter, currentLang, t]);

  const dayOptions = useMemo(() => {
      if (uiState.visitedFilter === 'visited') {
          const visited = places.filter(p => p.visited && p.visitedAt);
          const counts: Record<number, number> = {};
          visited.forEach(p => {
              const realDay = getRealDay(p.visitedAt, project.userInputs.dates?.start || new Date().toISOString());
              counts[realDay] = (counts[realDay] || 0) + 1;
          });
          return Object.keys(counts).map(dayStr => {
              const d = parseInt(dayStr);
              const label = `${t('sights.day', {defaultValue: currentLang === 'en' ? 'Day' : 'Tag'})} ${d}`;
              return { id: label, label: label, count: counts[d], dayIndex: d - 1 };
          }).sort((a, b) => a.dayIndex - b.dayIndex);
      }

      const itineraryDays = project.itinerary?.days || [];
      return itineraryDays.map((day: any, index: number) => {
          let count = 0;
          const activities = day.activities || day.aktivitaeten || [];
          if (activities.length > 0) {
              count = activities.filter((akt: any) => {
                  const p = places.find(pl => pl.id === (akt.id || akt.original_sight_id));
                  if (!p) return false;
                  if (uiState.visitedFilter === 'unvisited' && p.visited) return false;
                  return true;
              }).length;
          }
          const label = `${t('sights.day', {defaultValue: currentLang === 'en' ? 'Day' : 'Tag'})} ${index + 1}`;
          return { id: label, label: label, count: count, dayIndex: index };
      }).filter((d: any) => d.count > 0);
  }, [project.itinerary, project.userInputs.dates, places, uiState.visitedFilter, currentLang, t]);

  const priorityOptions = useMemo(() => {
    const counts: Record<string, number> = { '4': 0, '3': 0, '2': 0, '1': 0, '0': 0 };
    places.forEach((p: any) => {
        if (uiState.visitedFilter === 'visited' && !p.visited) return;
        if (uiState.visitedFilter === 'unvisited' && p.visited) return;
        counts[String(getRealPriorityValue(p))]++;
    });
    return [
        { id: '4', label: t('sights.must_see', { defaultValue: currentLang === 'en' ? '⭐️ Must See (Fixed)' : '⭐️ Muss ich sehen (Fix)' }), count: counts['4'] },
        { id: '3', label: t('sights.prio_1', { defaultValue: currentLang === 'en' ? '🥇 Prio 1' : '🥇 Prio 1' }), count: counts['3'] },
        { id: '2', label: t('sights.prio_2', { defaultValue: currentLang === 'en' ? '🥈 Prio 2' : '🥈 Prio 2' }), count: counts['2'] },
        { id: '1', label: t('sights.no_prio', { defaultValue: currentLang === 'en' ? '⚪️ No Prio' : '⚪️ Ohne Prio' }), count: counts['1'] },
        { id: '0', label: t('sights.ignored', { defaultValue: currentLang === 'en' ? '❌ Ignored' : '❌ Ignoriert' }), count: counts['0'] }
    ].filter(o => o.count > 0);
  }, [places, uiState.visitedFilter, currentLang, t]);

  if (!isSightFilterOpen) return null;

  const hasTours = tourOptions.length > 0;
  const hasDays = dayOptions.length > 0;

  const activeFilterOptions = activeSortMode === 'tour' ? tourOptions 
                            : activeSortMode === 'day' ? dayOptions 
                            : activeSortMode === 'priority' ? priorityOptions
                            : categoryOptions;

  const handleFilterToggle = (filterId: string) => {
    const current = uiState.categoryFilter || [];
    if (current.includes(filterId)) {
      setUIState({ categoryFilter: current.filter(c => c !== filterId) });
    } else {
      setUIState({ categoryFilter: [...current, filterId] });
    }
  };

  const handleResetFilters = () => {
    setUIState({ categoryFilter: [] });
  };

  const onSortModeChange = (mode: string) => {
      setUIState({ sortMode: mode as any, categoryFilter: [] });
  };
  
  const onTogglePlanningMode = () => {
      setUIState({ showPlanningMode: !showPlanningMode });
  };

  const onClose = toggleSightFilter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          
          <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <Filter className="w-5 h-5 text-blue-600" />
               {t('sights.adjust_view', { defaultValue: currentLang === 'en' ? 'Adjust View' : 'Ansicht anpassen' })}
             </h3>
             <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
               <X className="w-5 h-5 text-gray-500" />
             </button>
          </div>

          <div className="p-5 space-y-5 overflow-y-auto">
             
             <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> {t('sights.visited_status', { defaultValue: currentLang === 'en' ? 'Visit Status' : 'Besuchsstatus' })}</label>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button 
                    onClick={() => setUIState({ visitedFilter: 'all' })}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      uiState.visitedFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {t('sights.visited_all', { defaultValue: currentLang === 'en' ? 'All' : 'Alle' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ visitedFilter: 'unvisited' })}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      uiState.visitedFilter === 'unvisited' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {t('sights.visited_unvisited', { defaultValue: currentLang === 'en' ? 'Unvisited' : 'Nicht besuchte' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ visitedFilter: 'visited' })}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                      uiState.visitedFilter === 'visited' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {t('sights.visited_done', { defaultValue: currentLang === 'en' ? 'Visited' : 'Besuchte' })}
                  </button>
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.detail_level', { defaultValue: currentLang === 'en' ? 'Detail Level' : 'Detailgrad' })}</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setUIState({ detailLevel: 'kompakt' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      uiState.detailLevel === 'kompakt' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" /> {t('sights.compact', { defaultValue: currentLang === 'en' ? 'Compact' : 'Kompakt' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ detailLevel: 'standard' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      uiState.detailLevel === 'standard' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" /> {t('sights.standard', { defaultValue: 'Standard' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ detailLevel: 'details' })}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      uiState.detailLevel === 'details' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> {t('sights.details', { defaultValue: 'Details' })}
                  </button>
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.group_sort', { defaultValue: currentLang === 'en' ? 'Group & Sort By' : 'Gruppieren & Sortieren nach' })}</label>
                <div className="grid grid-cols-5 gap-1.5">
                    <button
                       onClick={() => onSortModeChange('category')}
                       className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                           activeSortMode === 'category' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                    >
                        <Tags className="w-4 h-4 mb-1" />
                        <span>Kategorie</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('priority')}
                       className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                           activeSortMode === 'priority' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                    >
                        <Star className="w-4 h-4 mb-1" />
                        <span>Priorität</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('tour')}
                       disabled={!hasTours}
                       className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                           activeSortMode === 'tour' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       } ${!hasTours ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        <MapIcon className="w-4 h-4 mb-1" />
                        <span>Tour</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('day')}
                       disabled={!hasDays}
                       className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                           activeSortMode === 'day' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       } ${!hasDays ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        <Calendar className="w-4 h-4 mb-1" />
                        <span>{uiState.visitedFilter === 'visited' ? t('sights.real_days', { defaultValue: currentLang === 'en' ? 'Real Days' : 'Echte Tage' }) : t('sights.day', { defaultValue: currentLang === 'en' ? 'Day' : 'Tag' })}</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('alphabetical')}
                       className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                           activeSortMode === 'alphabetical' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                    >
                        <ArrowDownAZ className="w-4 h-4 mb-1" />
                        <span>A-Z</span>
                    </button>
                </div>
             </div>

             {activeSortMode !== 'alphabetical' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-bold text-gray-500 uppercase">{t('sights.filter_selection', { defaultValue: currentLang === 'en' ? 'Selection' : 'Auswahl' })}</label>
                       {uiState.categoryFilter.length > 0 && (
                          <button 
                            onClick={handleResetFilters}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            {t('sights.reset_filter', { defaultValue: currentLang === 'en' ? 'Show All' : 'Alle anzeigen' })}
                          </button>
                       )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                       {activeFilterOptions.map(opt => {
                          const isActive = uiState.categoryFilter.includes(opt.id);
                          return (
                            <button 
                              key={opt.id}
                              onClick={() => handleFilterToggle(opt.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                                isActive 
                                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                                  {opt.count}
                              </span>
                            </button>
                          );
                       })}
                       {activeFilterOptions.length === 0 && (
                           <p className="text-xs text-gray-400 italic w-full text-center py-2">
                             {t('sights.no_filters_available', { defaultValue: currentLang === 'en' ? 'No results for this status.' : 'Mit diesem Status gibt es hier keine Ergebnisse.' })}
                           </p>
                       )}
                    </div>
                </div>
             )}

             <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.search', { defaultValue: currentLang === 'en' ? 'Search' : 'Suche' })}</label>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   {/* FIX: Neuer Platzhalter für Volltextsuche */}
                   <input 
                      type="text" 
                      placeholder={t('sights.search_placeholder_full', { defaultValue: currentLang === 'en' ? 'Keyword, place, note...' : 'Stichwort, Ort, Notiz...' })}
                      value={uiState.searchTerm}
                      onChange={(e) => setUIState({ searchTerm: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                   />
                </div>
             </div>

             <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                     <Briefcase className="w-4 h-4" />
                     {t('sights.planning_mode', { defaultValue: currentLang === 'en' ? 'Planning Mode' : 'Planungsmodus' })}
                   </label>
                   <button 
                     onClick={onTogglePlanningMode}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPlanningMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPlanningMode ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                </div>
                <p className="text-[10px] text-blue-700 mt-1.5 leading-snug">
                   {t('sights.planning_mode_desc', { defaultValue: currentLang === 'en' ? 'Enable this to view budget, priorities and the reserve list.' : 'Aktivieren Sie dies, um Budget, Prioritäten und die Reserve-Liste anzuzeigen.' })}
                </p>
             </div>

          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end">
             <button 
               onClick={onClose}
               className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
             >
               {t('sights.apply', { defaultValue: currentLang === 'en' ? 'Apply' : 'Übernehmen' })}
             </button>
          </div>
       </div>
    </div>
  );
};
// --- END OF FILE 334 Zeilen ---
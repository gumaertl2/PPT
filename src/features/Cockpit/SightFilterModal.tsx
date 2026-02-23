// 23.02.2026 11:00 - FIX: Fully integrated i18n for view switcher buttons (Category, Day, Tour) and empty states.
// 21.01.2026 02:45 - FIX: Restored 'Planning Mode' Toggle inside Filter Modal (was lost during refactor).
// src/features/Cockpit/SightFilterModal.tsx
// 21.01.2026 01:55 - FIX: Added missing 'Search' import to prevent ReferenceError.
// 21.01.2026 01:40 - FEAT: Extracted Filter Modal Logic into dedicated component with View Switcher.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { 
  Filter, 
  X, 
  List, 
  Grid, 
  FileText, 
  Tags, 
  Map as MapIcon, 
  Calendar, 
  ArrowDownAZ,
  Search,
  Briefcase
} from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface SightFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryOptions: FilterOption[];
  tourOptions: FilterOption[];
  dayOptions: FilterOption[];
  activeSortMode: string;
  onSortModeChange: (mode: string) => void;
  showPlanningMode: boolean;
  onTogglePlanningMode: () => void;
}

export const SightFilterModal: React.FC<SightFilterModalProps> = ({
  isOpen,
  onClose,
  categoryOptions,
  tourOptions,
  dayOptions,
  activeSortMode,
  onSortModeChange,
  showPlanningMode,
  onTogglePlanningMode
}) => {
  const { t } = useTranslation();
  const { uiState, setUIState } = useTripStore();

  if (!isOpen) return null;

  const hasTours = tourOptions.length > 0;
  const hasDays = dayOptions.length > 0;

  // Determine which options to show based on active sort mode
  const activeFilterOptions = activeSortMode === 'tour' ? tourOptions 
                            : activeSortMode === 'day' ? dayOptions 
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          
          {/* HEADER */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <Filter className="w-5 h-5 text-blue-600" />
               {t('sights.adjust_view', { defaultValue: 'Ansicht anpassen' })}
             </h3>
             <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
               <X className="w-5 h-5 text-gray-500" />
             </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
             
             {/* A. DETAIL LEVEL */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.detail_level', { defaultValue: 'Detailgrad' })}</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setUIState({ detailLevel: 'kompakt' })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      uiState.detailLevel === 'kompakt' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4" /> {t('sights.compact', { defaultValue: 'Kompakt' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ detailLevel: 'standard' })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      uiState.detailLevel === 'standard' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="w-4 h-4" /> {t('sights.standard', { defaultValue: 'Standard' })}
                  </button>
                  <button 
                    onClick={() => setUIState({ detailLevel: 'details' })}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      uiState.detailLevel === 'details' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> {t('sights.details', { defaultValue: 'Details' })}
                  </button>
                </div>
             </div>

             {/* B. VIEW SWITCHER (CATEGORY / TOUR / DAY / ALPHA) */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.group_sort', { defaultValue: 'Sicht wählen' })}</label>
                <div className="grid grid-cols-4 gap-2">
                    <button
                       onClick={() => onSortModeChange('category')}
                       className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                           activeSortMode === 'category' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                    >
                        <Tags className="w-4 h-4 mb-1" />
                        <span>{t('sights.category', { defaultValue: 'Kategorie' })}</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('tour')}
                       disabled={!hasTours}
                       className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                           activeSortMode === 'tour' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       } ${!hasTours ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        <MapIcon className="w-4 h-4 mb-1" />
                        <span>{t('sights.tour_short', { defaultValue: 'Tour' })} ({tourOptions.length})</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('day')}
                       disabled={!hasDays}
                       className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                           activeSortMode === 'day' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       } ${!hasDays ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        <Calendar className="w-4 h-4 mb-1" />
                        <span>{t('sights.day', { defaultValue: 'Tag' })} ({dayOptions.length})</span>
                    </button>

                    <button
                       onClick={() => onSortModeChange('alphabetical')}
                       className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                           activeSortMode === 'alphabetical' ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                       }`}
                    >
                        <ArrowDownAZ className="w-4 h-4 mb-1" />
                        <span>{t('sights.alpha_short', { defaultValue: 'A-Z' })}</span>
                    </button>
                </div>
             </div>

             {/* C. DYNAMIC FILTER CHIPS */}
             {activeSortMode !== 'alphabetical' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold text-gray-500 uppercase">{t('sights.filter_selection', { defaultValue: 'Auswahl' })}</label>
                       {uiState.categoryFilter.length > 0 && (
                          <button 
                            onClick={handleResetFilters}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {t('sights.reset_filter', { defaultValue: 'Alle anzeigen' })}
                          </button>
                       )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {activeFilterOptions.map(opt => {
                          const isActive = uiState.categoryFilter.includes(opt.id);
                          return (
                            <button 
                              key={opt.id}
                              onClick={() => handleFilterToggle(opt.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-2 ${
                                isActive 
                                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                                  {opt.count}
                              </span>
                            </button>
                          );
                       })}
                       {activeFilterOptions.length === 0 && (
                           <p className="text-xs text-gray-400 italic w-full text-center py-2">
                             {t('sights.no_filters_available', { defaultValue: 'Keine Filter verfügbar.' })}
                           </p>
                       )}
                    </div>
                </div>
             )}
             {activeSortMode === 'alphabetical' && (
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center text-xs text-gray-500 italic">
                     {t('sights.sort_alpha_desc', { defaultValue: 'Sortiert alle Orte alphabetisch von A bis Z.' })}
                 </div>
             )}

             {/* D. SEARCH */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('sights.search', { defaultValue: 'Suche' })}</label>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                      type="text" 
                      placeholder={t('sights.search_placeholder', { defaultValue: 'Name oder Kategorie...' })}
                      value={uiState.searchTerm}
                      onChange={(e) => setUIState({ searchTerm: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                   />
                </div>
             </div>

             {/* E. PLANNING MODE TOGGLE (RESTORED) */}
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                     <Briefcase className="w-4 h-4" />
                     {t('sights.planning_mode', { defaultValue: 'Planungsmodus' })}
                   </label>
                   <button 
                     onClick={onTogglePlanningMode}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showPlanningMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                   >
                     <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showPlanningMode ? 'translate-x-6' : 'translate-x-1'}`} />
                   </button>
                </div>
                <p className="text-xs text-blue-700 mt-2 leading-snug">
                   {t('sights.planning_mode_desc', { defaultValue: 'Aktivieren Sie dies, um Budget, Prioritäten und die Reserve-Liste anzuzeigen.' })}
                </p>
             </div>

          </div>

          <div className="p-4 border-t border-gray-100 flex justify-end">
             <button 
               onClick={onClose}
               className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
             >
               {t('sights.apply', { defaultValue: 'Übernehmen' })}
             </button>
          </div>
       </div>
    </div>
  );
};
// --- END OF FILE 258 Zeilen ---
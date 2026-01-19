// src/features/Cockpit/SightsView.tsx
// 19.01.2026 20:30 - FIX: Non-Destructive Merge of V30 Features (Tours, Special Days) into Planning View.
// 14.01.2026 12:05 - FIX: Removed unused imports, fixed 'pace' access, corrected hasTours/hasDays checks.

import React, { useMemo, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { SightCard } from './SightCard';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  X,
  List,
  Grid,
  FileText,
  Briefcase, // Icon for Planning Mode
  // NEW IMPORTS
  Sun,
  CloudRain,
  Layout
} from 'lucide-react';

// --- CONFIG (Ported from V30) ---
const TRAVEL_PACE_CONFIG: Record<string, { startHour: number; endHour: number; breakMinutes: number; bufferMinutes: number }> = {
  'fast': { startHour: 8, endHour: 19, breakMinutes: 60, bufferMinutes: 0 }, 
  'balanced': { startHour: 9.5, endHour: 17, breakMinutes: 90, bufferMinutes: 45 }, 
  'relaxed': { startHour: 10, endHour: 16, breakMinutes: 90, bufferMinutes: 45 } 
};

export const SightsView: React.FC = () => {
  const { t } = useTranslation();
  const { 
    project, 
    uiState, 
    setUIState, 
    isSightFilterOpen, 
    toggleSightFilter 
  } = useTripStore();
  
  // FIX: Added analysis access for V30 features
  const { userInputs, data, analysis } = project; 
  const places = Object.values(data.places || {});

  // Local State: Planning Mode (Default OFF -> Clean Guide View)
  const [showPlanningMode, setShowPlanningMode] = useState(false);
  
  // --- 1. BUDGET LOGIC ---
  const budgetStats = useMemo(() => {
    let totalMinutes = 0;
    // FIX: 'pace' is a direct property of userInputs, not under logistics
    const pace = userInputs.pace || 'balanced';
    const config = TRAVEL_PACE_CONFIG[pace] || TRAVEL_PACE_CONFIG['balanced'];
    
    // Berechne verfügbare Zeit
    const start = new Date(`2000-01-01T${userInputs.dates?.dailyStartTime || '09:00'}`); 
    const end = new Date(`2000-01-01T${userInputs.dates?.dailyEndTime || '18:00'}`);
    let dailyMinutes = (end.getTime() - start.getTime()) / 60000;
    
    // Fallback falls User-Daten fehlen
    if (isNaN(dailyMinutes) || dailyMinutes <= 0) {
       dailyMinutes = (config.endHour - config.startHour) * 60 - config.breakMinutes;
    }

    const days = (new Date(userInputs.dates.end).getTime() - new Date(userInputs.dates.start).getTime()) / (1000 * 3600 * 24) + 1;
    const totalBudget = Math.floor(dailyMinutes * days);

    // Berechne Verbrauch (Nur Prio 1, 2, 3)
    places.forEach((p: any) => {
      const prio = p.userSelection?.priority || 0;
      if (prio > 0) {
         const dur = p.userSelection?.customDuration || p.min_duration_minutes || 60;
         totalMinutes += dur;
      }
    });

    return { total: totalBudget, used: totalMinutes, remaining: totalBudget - totalMinutes };
  }, [userInputs, places]);

  // --- 2. HELPERS FOR MODAL ---
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    places.forEach((p: any) => {
      if (p.kategorie) cats.add(p.kategorie);
      else cats.add('Sonstiges');
    });
    return Array.from(cats).sort();
  }, [places]);

  // FIX: Check data.routes and itinerary.days instead of non-existent analysis properties
  // UPDATE: We check analysis.tourGuide for tours now (V30 structure)
  const hasTours = !!(analysis as any)?.tourGuide?.erkundungstouren?.length;
  const hasDays = (project.itinerary?.days?.length || 0) > 0;

  const handleCategoryToggle = (cat: string) => {
    const current = uiState.categoryFilter || [];
    if (current.includes(cat)) {
      setUIState({ categoryFilter: current.filter(c => c !== cat) });
    } else {
      setUIState({ categoryFilter: [...current, cat] });
    }
  };

  // --- 3. FILTER & SORT LOGIC ---
  const filteredLists = useMemo(() => {
    const mainList: any[] = [];
    const reserveList: any[] = [];
    const term = uiState.searchTerm.toLowerCase();
    const activeCats = uiState.categoryFilter;

    // Get constraints from user settings (default to 0 if missing)
    const minRating = userInputs.searchSettings?.minRating || 0;
    const minDuration = userInputs.searchSettings?.minDuration || 0;

    places.forEach((p: any) => {
      // Search Filter
      if (term && !p.name.toLowerCase().includes(term) && !p.kategorie?.toLowerCase().includes(term)) {
        return; 
      }
      
      // Category Filter
      const cat = p.kategorie || 'Sonstiges';
      if (activeCats.length > 0 && !activeCats.includes(cat)) {
          return;
      }

      // V30 Split Logic (Min Duration & Rating)
      const rating = p.google_rating || 0;
      const duration = p.min_duration_minutes || p.dauer_min || 0;
      
      // Logic: Reserve if explicit ignored OR duration too short OR rating too low (if rating exists)
      const isReserve = (p.userSelection?.priority === -1) || 
                        (duration < minDuration) || 
                        (rating > 0 && rating < minRating);
      
      if (isReserve) {
        reserveList.push(p);
      } else {
        mainList.push(p);
      }
    });

    // Dynamic Sort
    const sortMode = uiState.sortMode || 'category';
    
    const sortFn = (a: any, b: any) => {
      if (sortMode === 'alphabetical') return a.name.localeCompare(b.name);
      return (a.kategorie || '').localeCompare(b.kategorie || '');
    };

    return { main: mainList.sort(sortFn), reserve: reserveList.sort(sortFn) };
  }, [places, uiState.searchTerm, uiState.categoryFilter, uiState.sortMode, userInputs.searchSettings]);


  // --- 4. NEW: SONDERTAGE RENDERER ---
  const renderSondertage = () => {
    const ideenScout = (analysis as any)?.ideenScout;
    const sondertage = ideenScout?.sondertage || [];

    if (sondertage.length === 0) return null;

    return (
      <div className="mb-8 space-y-6 animate-in fade-in">
         {sondertage.map((st: any, idx: number) => (
            <div key={idx} className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 p-4 shadow-sm">
               <h3 className="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
                 <Layout className="w-5 h-5 text-slate-400" />
                 Flexible Ideen für {st.uebernachtungsort}
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SONNE */}
                  <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                     <div className="flex items-center gap-2 mb-3 text-amber-700 font-semibold border-b border-amber-200/50 pb-2">
                        <Sun className="w-4 h-4" /> Bei Sonnenschein
                     </div>
                     <div className="space-y-3">
                        {(st.sonnentag_ideen || []).map((idee: any, i: number) => (
                           <div key={i} className="bg-white p-2.5 rounded border border-amber-100 shadow-sm text-sm">
                              <div className="font-bold text-slate-800">{idee.name}</div>
                              <p className="text-xs text-slate-600 mt-1">{idee.beschreibung}</p>
                              {idee.planungs_hinweis && (
                                 <div className="mt-2 text-[10px] bg-amber-50 text-amber-800 p-1.5 rounded">
                                    💡 {idee.planungs_hinweis}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* REGEN */}
                  <div className="bg-slate-100/50 rounded-lg p-3 border border-slate-200">
                     <div className="flex items-center gap-2 mb-3 text-slate-600 font-semibold border-b border-slate-200 pb-2">
                        <CloudRain className="w-4 h-4" /> Bei Regen
                     </div>
                     <div className="space-y-3">
                        {(st.schlechtwetter_ideen || []).map((idee: any, i: number) => (
                           <div key={i} className="bg-white p-2.5 rounded border border-slate-200 shadow-sm text-sm">
                              <div className="font-bold text-slate-800">{idee.name}</div>
                              <p className="text-xs text-slate-600 mt-1">{idee.beschreibung}</p>
                              {idee.planungs_hinweis && (
                                 <div className="mt-2 text-[10px] bg-slate-50 text-slate-600 p-1.5 rounded">
                                    ☂️ {idee.planungs_hinweis}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         ))}
      </div>
    );
  };


  // --- 5. UPDATED: RENDER GROUPED LIST (Supports Tours) ---
  const renderGroupedList = (list: any[]) => {
    if (list.length === 0) return <p className="text-gray-400 italic p-4">{t('sights.no_places', { defaultValue: 'Keine Orte gefunden.' })}</p>;

    const sortMode = uiState.sortMode || 'category';
    const groups: Record<string, any[]> = {};
    
    // CASE: TOURS (V30 Logic)
    if (sortMode === 'tour') {
        const tourGuide = (analysis as any)?.tourGuide;
        const tours = tourGuide?.erkundungstouren || [];
        const assignedIds = new Set<string>();

        // 1. Assign to defined tours
        tours.forEach((tour: any) => {
            const title = tour.tour_titel || "Tour";
            // Filter places in this list that match the tour IDs
            const tourPlaces = list.filter(p => tour.vorgeschlagene_reihenfolge_ids?.includes(p.id));
            
            if (tourPlaces.length > 0) {
                // Sort by occurrence in tour definition
                groups[title] = tourPlaces.sort((a, b) => {
                    const idxA = tour.vorgeschlagene_reihenfolge_ids.indexOf(a.id);
                    const idxB = tour.vorgeschlagene_reihenfolge_ids.indexOf(b.id);
                    return idxA - idxB;
                });
                tourPlaces.forEach(p => assignedIds.add(p.id));
            }
        });

        // 2. Leftovers
        const leftovers = list.filter(p => !assignedIds.has(p.id));
        if (leftovers.length > 0) {
            groups['Weitere Orte (Ohne Tour)'] = leftovers;
        }

    } else {
        // CASE: STANDARD (Category / Alphabetical) - PRESERVED LOGIC
        list.forEach(p => {
            let key = 'Allgemein';
            if (sortMode === 'category') key = p.kategorie || 'Sonstiges';
            else if (sortMode === 'alphabetical') key = p.name ? p.name[0].toUpperCase() : '?';
            
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
    }

    return Object.entries(groups).map(([groupKey, items]) => (
      <div key={groupKey} className="mb-6 last:mb-0">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1 ml-1 flex justify-between">
          <span>{groupKey}</span>
          <span className="text-xs text-gray-300">{items.length}</span>
        </h3>
        <div className="space-y-3">
          {items.map(place => (
            <SightCard 
               key={place.id} 
               id={place.id} 
               data={place} 
               mode="selection" 
               showPriorityControls={showPlanningMode} // Controlled by Planning Mode
            />
          ))}
        </div>
      </div>
    ));
  };

  // --- MAIN RENDER ---
  return (
    <div className="pb-24">
      
      {/* 1. TOP BAR (Only visible in Planning Mode) */}
      {showPlanningMode && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-20 z-10 animate-in fade-in slide-in-from-top-2">
           <div className="flex items-center gap-6 w-full justify-center md:justify-start">
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.budget', { defaultValue: 'Budget' })}</span>
                 <span className="text-xl font-black text-gray-800">{Math.round(budgetStats.total / 60)} h</span>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <div className="flex flex-col items-center">
                 <span className="text-xs text-gray-500 uppercase font-bold">{t('sights.planned', { defaultValue: 'Geplant' })}</span>
                 <span className={`text-xl font-black ${budgetStats.remaining < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                   {Math.round(budgetStats.used / 60)} h
                 </span>
              </div>
              {budgetStats.remaining < 0 && (
                 <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                   ! {t('sights.time_exceeded', { defaultValue: 'Zeit überschritten' })}
                 </span>
              )}
           </div>
           
           <div className="text-xs text-gray-400 font-medium italic hidden md:block">
             {t('sights.planning_active', { defaultValue: 'Planungsmodus aktiv' })}
           </div>
        </div>
      )}

      {/* 2. SONDERTAGE (NEW V30 Feature) */}
      {renderSondertage()}

      {/* 3. LISTS */}
      
      <div className="bg-white rounded-xl border-2 border-blue-600 shadow-sm p-4 md:p-6 mb-8 relative">
        <div className="absolute -top-3 left-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
           {showPlanningMode ? <Briefcase className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
           {t('sights.candidates', { defaultValue: 'KANDIDATEN' })} ({filteredLists.main.length})
        </div>
        <div className="mt-2">{renderGroupedList(filteredLists.main)}</div>
      </div>

      {filteredLists.reserve.length > 0 && (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 md:p-6 relative opacity-90 hover:opacity-100 transition-opacity">
           <div className="absolute -top-3 left-6 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
             <Filter className="w-3 h-3" />
             {t('sights.reserve', { defaultValue: 'RESERVE / WENIGER PASSEND' })} ({filteredLists.reserve.length})
           </div>
           <div className="mt-2">{renderGroupedList(filteredLists.reserve)}</div>
        </div>
      )}

      {/* 4. MODAL OVERLAY: ADJUST VIEW */}
      {isSightFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   <Filter className="w-5 h-5 text-blue-600" />
                   {t('sights.adjust_view', { defaultValue: 'Ansicht anpassen' })}
                 </h3>
                 <button onClick={toggleSightFilter} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                   <X className="w-5 h-5 text-gray-500" />
                 </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                 
                 {/* 1. DETAIL LEVEL */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sights.detail_level', { defaultValue: 'Detailgrad' })}</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setUIState({ detailLevel: 'kompakt' })}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                          uiState.detailLevel === 'kompakt' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <List className="w-4 h-4" /> {t('sights.compact', { defaultValue: 'Kompakt' })}
                      </button>
                      <button 
                        onClick={() => setUIState({ detailLevel: 'standard' })}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                          uiState.detailLevel === 'standard' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Grid className="w-4 h-4" /> {t('sights.standard', { defaultValue: 'Standard' })}
                      </button>
                      <button 
                        onClick={() => setUIState({ detailLevel: 'details' })}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                          uiState.detailLevel === 'details' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> {t('sights.details', { defaultValue: 'Details' })}
                      </button>
                    </div>
                 </div>

                 {/* 2. CATEGORIES */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-sm font-bold text-gray-700">{t('sights.categories', { defaultValue: 'Kategorien' })}</label>
                       {uiState.categoryFilter.length > 0 && (
                          <button 
                            onClick={() => setUIState({ categoryFilter: [] })}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {t('sights.reset_filter', { defaultValue: 'Alle anzeigen' })}
                          </button>
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       {availableCategories.map(cat => {
                          const isActive = uiState.categoryFilter.includes(cat);
                          return (
                            <button 
                              key={cat}
                              onClick={() => handleCategoryToggle(cat)}
                              className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                isActive 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                       })}
                    </div>
                 </div>

                 {/* 3. SORTING */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sights.group_sort', { defaultValue: 'Gruppieren & Sortieren nach' })}</label>
                    <select 
                       value={uiState.sortMode || 'category'}
                       onChange={(e) => setUIState({ sortMode: e.target.value as any })}
                       className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                       <option value="category">{t('sights.category', { defaultValue: 'Kategorie' })}</option>
                       <option value="alphabetical">{t('sights.alphabetical', { defaultValue: 'Alphabetisch' })}</option>
                       {hasDays && <option value="day">{t('sights.day', { defaultValue: 'Tag (Tagesplan)' })}</option>}
                       {hasTours && <option value="tour">{t('sights.tour', { defaultValue: 'Tour (Routenplan)' })}</option>}
                    </select>
                 </div>

                 {/* 4. SEARCH */}
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('sights.search', { defaultValue: 'Suche' })}</label>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input 
                          type="text" 
                          placeholder={t('sights.search_placeholder', { defaultValue: 'Name oder Kategorie...' })}
                          value={uiState.searchTerm}
                          onChange={(e) => setUIState({ searchTerm: e.target.value })}
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                    </div>
                 </div>

                 {/* 5. PLANNING MODE TOGGLE */}
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between">
                       <label className="text-sm font-bold text-blue-900 flex items-center gap-2">
                         <Briefcase className="w-4 h-4" />
                         {t('sights.planning_mode', { defaultValue: 'Planungsmodus' })}
                       </label>
                       <button 
                         onClick={() => setShowPlanningMode(!showPlanningMode)}
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
                   onClick={toggleSightFilter}
                   className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                 >
                   {t('sights.apply', { defaultValue: 'Übernehmen' })}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
// --- END OF FILE 565 Zeilen ---
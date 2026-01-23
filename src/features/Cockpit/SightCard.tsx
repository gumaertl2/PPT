// 23.01.2026 17:05 - FIX: Emergency correction of ReferenceError (removed phantom 'item' prefix).
// 23.01.2026 16:30 - FIX: Added no-print classes to interactive elements for clean PDF output.
// src/features/Cockpit/SightCard.tsx
// 21.01.2026 09:55 - FIX: Appended structured detail appendix to original standard view with Close & Scroll logic.
// 21.01.2026 02:15 - FIX: Implemented step-by-step Detail Toggle (+/-) for Compact/Standard/Details.
// 21.01.2026 01:25 - FIX: Added full text display support for 'details' view level.

import React, { useState, useEffect, useRef } from 'react'; // FIX: useRef added
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
// FIX: Import für Übersetzung
import { INTEREST_DATA } from '../../data/interests'; 
import type { LanguageCode } from '../../core/types';
import { 
  Trash2, 
  Database, 
  Star, 
  X, 
  Plus, 
  Minus, 
  Globe, 
  Search, 
  Map as MapIcon,
  ChevronUp // FIX: Added for Close Button
} from 'lucide-react';

interface SightCardProps {
  id: string;
  data: any; 
  mode?: 'selection' | 'view'; 
  showPriorityControls?: boolean;
}

// DEFINITION DER STUFEN
const VIEW_LEVELS = ['kompakt', 'standard', 'details'] as const;
type ViewLevel = typeof VIEW_LEVELS[number];

export const SightCard: React.FC<SightCardProps> = ({ id, data, mode = 'selection', showPriorityControls = true }) => {
  const { t, i18n } = useTranslation(); // FIX: i18n added
  const { uiState, updatePlace, deletePlace } = useTripStore();
  
  // FIX: Scroll Anchor for "Close & Scroll" Logic
  const cardRef = useRef<HTMLDivElement>(null);

  // FIX: Local state initialized with 'kompakt'
  const [viewLevel, setViewLevel] = useState<ViewLevel>('kompakt');
  
  // SYNC: Update local state when global state changes (but allow local override afterwards)
  useEffect(() => {
    setViewLevel(uiState.detailLevel as ViewLevel);
  }, [uiState.detailLevel]);

  // DERIVED STATES
  const isStandardOrHigher = viewLevel === 'standard' || viewLevel === 'details';
  const isDetailed = viewLevel === 'details';
  const currentLevelIndex = VIEW_LEVELS.indexOf(viewLevel);

  const [showDebug, setShowDebug] = useState(false);

  // V40 Data Access (English)
  const name = data.name || 'Unbekannter Ort';
  const description = data.description || data.shortDesc || ''; // V40 Key
  const category = data.category || 'Allgemein'; // V40 Key
  const rating = data.rating || 0; // V40 Key
  
  const userRatingsTotal = data.ratingCount || 0; // V40 Key
  
  // User Selection State
  const userSelection = data.userSelection || {};
  const priority = userSelection.priority ?? 0; 
  const customDuration = userSelection.customDuration || data.duration || 60; // V40 Key
  const customCategory = userSelection.customCategory || category;
  
  const isFixed = priority === 3;
  const fixedDate = userSelection.fixedDate || '';
  const fixedTime = userSelection.fixedTime || '';

  // FIX: Helper to resolve Label (city_info -> Stadt-Infos)
  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "Allgemein";
    const currentLang = i18n.language.substring(0, 2) as LanguageCode;
    
    // Versuch 1: Lookup in INTEREST_DATA
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    // Fallback: Wenn es keine ID ist, sondern schon Text
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };
  
  const displayCategory = resolveCategoryLabel(customCategory); // Use localized label

  const highlightText = (text: string | undefined | null) => {
    if (!text) return null;
    const term = uiState.searchTerm?.trim();
    if (!term || term.length < 2) return text;

    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5 box-decoration-clone">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handlePriorityChange = (newPrio: number) => {
    const targetPrio = (priority === newPrio) ? 0 : newPrio;
    updatePlace(id, {
      userSelection: { ...userSelection, priority: targetPrio }
    });
  };

  const handleDelete = () => {
    if (confirm(t('sights.delete_confirm', { defaultValue: 'Diesen Ort wirklich löschen?' }))) {
      deletePlace(id);
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    updatePlace(id, {
      userSelection: { ...userSelection, customDuration: isNaN(val) ? 0 : val }
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updatePlace(id, {
      userSelection: { ...userSelection, customCategory: e.target.value }
    });
  };

  const handleDateChange = (field: 'fixedDate' | 'fixedTime', val: string) => {
    updatePlace(id, {
      userSelection: { ...userSelection, [field]: val }
    });
  };

  // LOGIC: Step Up / Step Down
  const handleStepUp = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (currentLevelIndex < VIEW_LEVELS.length - 1) {
        setViewLevel(VIEW_LEVELS[currentLevelIndex + 1]);
    }
  };

  const handleStepDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (currentLevelIndex > 0) {
        setViewLevel(VIEW_LEVELS[currentLevelIndex - 1]);
    }
  };

  // FIX: NEW Logic for Close Details (Return to standard level and scroll to top)
  const handleCloseDetails = () => {
    setViewLevel('standard');
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const renderStars = () => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1 text-amber-500 text-xs font-medium whitespace-nowrap" title={`Google Rating: ${rating} (${userRatingsTotal})`}>
        <Star className="w-3 h-3 fill-amber-500" />
        <span>{rating}</span>
        <span className="text-gray-400 font-normal">({userRatingsTotal})</span>
      </div>
    );
  };

  const renderViewControls = () => {
    const canStepDown = currentLevelIndex > 0;
    const canStepUp = currentLevelIndex < VIEW_LEVELS.length - 1;

    return (
      <div className="flex items-center gap-0.5 bg-slate-50 rounded p-0.5 border border-slate-100 ml-2 no-print">
        <button 
          onClick={handleStepDown}
          disabled={!canStepDown}
          className={`p-0.5 rounded transition-all ${
             canStepDown 
             ? 'text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm' 
             : 'text-slate-300 cursor-not-allowed'
          }`}
          title={t('sights.less_details', { defaultValue: 'Weniger Details' })}
        >
          {/* FIX: Removed 'item.' prefix to resolve ReferenceError */}
          <Minus className="w-3 h-3" />
        </button>
        
        {/* Visual Indicator of Level (Optional, tiny dots) */}
        <div className="flex gap-0.5 px-0.5">
            {VIEW_LEVELS.map((level, idx) => (
                <div key={level} className={`w-0.5 h-0.5 rounded-full ${idx <= currentLevelIndex ? 'bg-blue-500' : 'bg-slate-200'}`} />
            ))}
        </div>

        <button 
          onClick={handleStepUp}
          disabled={!canStepUp}
          className={`p-0.5 rounded transition-all ${
             canStepUp 
             ? 'text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm' 
             : 'text-slate-300 cursor-not-allowed'
          }`}
          title={t('sights.more_details', { defaultValue: 'Mehr Details' })}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const renderPriorityControls = () => {
    if (mode !== 'selection') return null;
    if (!showPriorityControls) return null;

    const btnBase = "px-2 py-0.5 text-[10px] font-bold rounded shadow-sm transition-all border";
    
    return (
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100 no-print">
        <button
          onClick={() => handlePriorityChange(3)}
          className={`${btnBase} ${priority === 3 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-700 hover:bg-indigo-50 border-gray-200'}`}
          title={t('sights.must_see', { defaultValue: 'Muss ich sehen' })}
        >
          ★ Top
        </button>
        <button
          onClick={() => handlePriorityChange(1)}
          className={`${btnBase} ${priority === 1 ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 hover:bg-green-50 border-gray-200'}`}
        >
          Prio 1
        </button>
        <button
          onClick={() => handlePriorityChange(2)}
          className={`${btnBase} ${priority === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-200'}`}
        >
          Prio 2
        </button>
        <button
          onClick={() => handlePriorityChange(-1)}
          className={`${btnBase} ${priority === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-gray-400 hover:bg-gray-100 border-gray-200'}`}
        >
          Ignore
        </button>

        <div className="flex-1"></div>
        
        <button onClick={() => setShowDebug(true)} className="text-gray-300 hover:text-blue-600 p-1" title="Debug">
          <Database className="w-3 h-3" />
        </button>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-600 p-1" title="Löschen">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  let borderClass = 'border-gray-200';
  if (priority === 3) borderClass = 'border-indigo-500 border-l-4';
  if (priority === 1) borderClass = 'border-green-500 border-l-4';
  if (priority === 2) borderClass = 'border-blue-400 border-l-4';
  if (priority === -1) borderClass = 'border-gray-100 opacity-60';

  return (
    <>
      {/* FIX: cardRef applied to outer container */}
      <div ref={cardRef} className={`bg-white rounded-lg shadow-sm border p-3 mb-3 transition-all hover:shadow-md ${borderClass}`}>
        
        {/* ROW 1: HEADER */}
        <div className="flex justify-between items-start mb-1">
           <h3 className="font-bold text-gray-900 text-base leading-tight">
             {highlightText(name)}
           </h3>
           {renderViewControls()}
        </div>

        {/* ROW 2: META BAR */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mb-1">
            
            <select 
               value={customCategory} 
               onChange={handleCategoryChange}
               className="bg-transparent border-none p-0 pr-4 text-xs font-medium text-gray-700 focus:ring-0 cursor-pointer hover:text-blue-600 py-0.5"
            >
               <option value={category}>{displayCategory}</option> {/* Show Localized Label */}
               <option value="Kultur">Kultur</option>
               <option value="Natur">Natur</option>
               <option value="Entspannung">Entspannung</option>
               <option value="Abenteuer">Abenteuer</option>
               <option value="Shopping">Shopping</option>
            </select>
            <span className="text-gray-300">|</span>

            <div className="flex items-center gap-1">
               <input
                 type="number"
                 step="15"
                 value={customDuration}
                 onChange={handleDurationChange}
                 className="w-10 bg-transparent border-b border-gray-300 p-0 text-center text-xs focus:border-blue-500 focus:ring-0"
               />
               <span>min</span>
            </div>
            <span className="text-gray-300">|</span>

            {renderStars()}

            <div className="flex items-center gap-2 ml-auto no-print">
               {data.website && (
                 <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600" title="Homepage">
                   <Globe className="w-3.5 h-3.5" />
                 </a>
               )}
               <a 
                 href={`https://www.google.com/search?q=${encodeURIComponent(name + ' ' + (data.city || ''))}`} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-gray-400 hover:text-blue-600"
                 title="Google Suche"
               >
                 <Search className="w-3.5 h-3.5" />
               </a>
               <span className="text-gray-300 cursor-not-allowed" title="Karte (Coming soon)">
                 <MapIcon className="w-3.5 h-3.5" />
               </span>
            </div>
        </div>

        {isFixed && (
          <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded text-[10px] mb-1">
            <span className="font-bold text-indigo-800">Fixtermin:</span>
            <input 
              type="date" 
              value={fixedDate}
              onChange={(e) => handleDateChange('fixedDate', e.target.value)}
              className="bg-transparent border-none p-0 h-4 text-indigo-900 focus:ring-0"
            />
            <input 
              type="time" 
              value={fixedTime}
              onChange={(e) => handleDateChange('fixedTime', e.target.value)}
              className="bg-transparent border-none p-0 h-4 text-indigo-900 focus:ring-0"
            />
          </div>
        )}

        {renderPriorityControls()}

        {isStandardOrHigher && (
          <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            {/* FIX: line-clamp-2 removed if isDetailed is true */}
            <p className={`${isDetailed ? '' : 'line-clamp-2'} leading-snug text-xs mb-2`}>
              {highlightText(description)}
            </p>
            
            {data.reasoning && (
               <p className="text-[10px] text-indigo-600 italic mb-2 border-l-2 border-indigo-200 pl-2 leading-tight">
                 "{highlightText(data.reasoning)}"
               </p>
            )}

            <div className="text-xs text-gray-500 leading-snug">
               {data.address && ( // V40 Key
                 <>
                   <span className="font-semibold text-gray-400">📍</span> {highlightText(data.address)}
                 </>
               )}
               
               {data.openingHours && ( // V40 Key
                 <>
                   <span className="mx-2 text-gray-300">|</span>
                   <span className="font-semibold text-gray-400">🕒</span> {highlightText(data.openingHours)}
                 </>
               )}

               {data.priceLevel && ( // V40 Key
                 <>
                   <span className="mx-2 text-gray-300">|</span>
                   <span className="font-semibold text-gray-400">💶</span> {highlightText(data.priceLevel)}
                 </>
               )}
            </div>

            {data.logistics && ( // V40 Key
               <div className="mt-1.5 bg-slate-50 p-1.5 rounded text-[11px] text-slate-700 border border-slate-100 leading-tight">
                 <span className="font-bold text-slate-500 mr-1">Logistik:</span> 
                 {highlightText(data.logistics)}
               </div>
            )}

            {/* FIX: APPEND STRUCTURED PDF-STYLE DETAILS ONLY IF ISDETAILED (Stage 3) */}
            {isDetailed && (
              <div className="mt-6 pt-6 border-t-2 border-dashed border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                
                {/* STRUCTURED DESCRIPTION PARSER (PDF Redaktionsanweisung) */}
                <div className="space-y-4 text-[13px] leading-relaxed text-slate-800 px-1">
                   {description.split(/\n\n/).map((section: string, idx: number) => {
                      const content = section.trim();
                      if (!content) return null;

                      // Detection of Headers (Markdown ### or Keywords like 'Teil 1' or 'Top 5')
                      const isHeader = content.startsWith('###') || 
                                       content.toLowerCase().startsWith('teil') || 
                                       content.toLowerCase().includes('top 5') ||
                                       content.toLowerCase().includes('fakten');

                      if (isHeader) {
                          const cleanHeader = content.replace(/^###\s*/, '');
                          return (
                            <h4 key={idx} className="font-black text-blue-900 text-[11px] uppercase tracking-wider border-l-4 border-blue-600 pl-3 mt-8 mb-3 bg-slate-50 py-1 rounded-r shadow-sm">
                               {highlightText(cleanHeader)}
                            </h4>
                          );
                      }

                      // Detection of List Items (e.g., "1. Titel")
                      if (/^\d+\./.test(content)) {
                          return (
                            <div key={idx} className="pl-4 py-2 bg-white border border-slate-100 rounded-lg shadow-sm italic text-xs text-slate-700 border-l-4 border-slate-300 ml-2">
                               {highlightText(content)}
                            </div>
                          );
                      }

                      // Normal Paragraph
                      return <p key={idx} className="mb-3 text-xs leading-normal">{highlightText(content)}</p>;
                   })}
                </div>

                {/* CLOSE BUTTON (Action Anchor) */}
                <div className="pt-8 flex justify-center pb-4 no-print">
                   <button 
                      onClick={handleCloseDetails}
                      className="flex items-center gap-2 px-10 py-2.5 bg-slate-800 hover:bg-black text-white rounded-full text-[10px] font-black transition-all shadow-lg hover:shadow-xl active:scale-95 group"
                   >
                      <ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                      {t('sights.close_details', { defaultValue: 'DETAILS SCHLIESSEN' })}
                   </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {showDebug && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                 <h3 className="font-bold text-lg">JSON Data: {name}</h3>
                 <button onClick={() => setShowDebug(false)} className="text-gray-500 hover:text-black">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-4 overflow-auto bg-slate-50 font-mono text-xs">
                 <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>
           </div>
        </div>
      )}
    </>
  );
};
// --- END OF FILE 454 Zeilen ---
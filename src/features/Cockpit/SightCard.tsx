// 20.01.2026 19:05 - FIX: Migrated SightCard to English V40 Keys (SSOT).
// src/features/Cockpit/SightCard.tsx

import React, { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Trash2, 
  Database, 
  Star, 
  X, 
  Plus, 
  Minus, 
  Globe, 
  Search, 
  Map as MapIcon
} from 'lucide-react';

interface SightCardProps {
  id: string;
  data: any; 
  mode?: 'selection' | 'view'; 
  showPriorityControls?: boolean;
}

export const SightCard: React.FC<SightCardProps> = ({ id, data, mode = 'selection', showPriorityControls = true }) => {
  const { t } = useTranslation();
  const { uiState, updatePlace, deletePlace } = useTripStore();
  
  const [viewLevel, setViewLevel] = useState<'kompakt' | 'standard'>('kompakt');
  
  useEffect(() => {
    const target = uiState.detailLevel === 'details' ? 'standard' : uiState.detailLevel;
    setViewLevel(target as 'kompakt' | 'standard');
  }, [uiState.detailLevel]);

  const isStandard = viewLevel === 'standard';
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
    return (
      <div className="flex items-center gap-0.5 bg-slate-50 rounded p-0.5 border border-slate-100 ml-2">
        <button 
          onClick={() => setViewLevel('kompakt')}
          className={`p-0.5 rounded transition-all ${!isStandard ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          title={t('sights.compact_view', { defaultValue: 'Kompaktansicht' })}
        >
          <Minus className="w-3 h-3" />
        </button>
        <button 
          onClick={() => setViewLevel('standard')}
          className={`p-0.5 rounded transition-all ${isStandard ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          title={t('sights.standard_view', { defaultValue: 'Standardansicht' })}
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
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
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
      <div className={`bg-white rounded-lg shadow-sm border p-3 mb-3 transition-all hover:shadow-md ${borderClass}`}>
        
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
               <option value={category}>{category}</option>
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

            <div className="flex items-center gap-2 ml-auto">
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

        {isStandard && (
          <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            <p className="line-clamp-2 leading-snug text-xs mb-2">{highlightText(description)}</p>
            
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
// --- END OF FILE 336 Zeilen ---
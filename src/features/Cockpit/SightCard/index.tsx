// 29.01.2026 19:55 - REFACTOR: Split SightCard into Sub-Components (Header, Meta, Body).
// src/features/Cockpit/SightCard/index.tsx

import React, { useState, useEffect, useRef } from 'react'; 
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../../data/interests'; 
import type { LanguageCode } from '../../../core/types';
import { Database, Trash2, Plus, Minus, X } from 'lucide-react';

import { SightCardHeader } from './SightCardHeader';
import { SightCardMeta } from './SightCardMeta';
import { SightCardBody } from './SightCardBody';

interface SightCardProps {
  id: string;
  data: any; 
  mode?: 'selection' | 'view'; 
  showPriorityControls?: boolean;
}

const VIEW_LEVELS = ['kompakt', 'standard', 'details'] as const;
type ViewLevel = typeof VIEW_LEVELS[number];

export const SightCard: React.FC<SightCardProps> = ({ id, data, mode = 'selection', showPriorityControls = true }) => {
  const { t, i18n } = useTranslation(); 
  const { uiState, updatePlace, deletePlace, setUIState, project, assignHotelToLogistics } = useTripStore(); 
  const cardRef = useRef<HTMLDivElement>(null);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('kompakt');
  
  useEffect(() => {
    setViewLevel(uiState.detailLevel as ViewLevel);
  }, [uiState.detailLevel]);

  const isStandardOrHigher = viewLevel === 'standard' || viewLevel === 'details';
  const isDetailed = viewLevel === 'details';
  const currentLevelIndex = VIEW_LEVELS.indexOf(viewLevel);
  const [showDebug, setShowDebug] = useState(false);

  // Derivation of Values
  const name = data.name || 'Unbekannter Ort';
  const category = data.category || 'Allgemein'; 
  const isHotel = category === 'Hotel' || category === 'accommodation';
  const userSelection = data.userSelection || {};
  const priority = userSelection.priority ?? 0; 
  
  // NEW: Calculate Selection State from Logistics (SSOT)
  const isSelectedInLogistics = () => {
      const logistics = project.userInputs.logistics;
      if (logistics.mode === 'stationaer') {
          return logistics.stationary.hotel === id;
      } else {
          // Check all stops
          return logistics.roundtrip.stops?.some((s: any) => s.hotel === id);
      }
  };
  const isSelected = isSelectedInLogistics();

  const handleHotelSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    assignHotelToLogistics(id);
  };

  // --- Handlers & Helpers ---

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

  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "Allgemein";
    const currentLang = i18n.language.substring(0, 2) as LanguageCode;
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };

  const ensureAbsoluteUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      if (url.trim().match(/^(http:\/\/|https:\/\/)/i)) {
          return url.trim();
      }
      return `https://${url.trim()}`;
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

  const handleStepUp = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (currentLevelIndex < VIEW_LEVELS.length - 1) {
        setViewLevel(VIEW_LEVELS[currentLevelIndex + 1]);
    }
  };

  const handleStepDown = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (currentLevelIndex > 0) {
        setViewLevel(VIEW_LEVELS[currentLevelIndex - 1]);
    }
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
        >
          <Minus className="w-3 h-3" />
        </button>
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
        >★ Top</button>
        <button
          onClick={() => handlePriorityChange(1)}
          className={`${btnBase} ${priority === 1 ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 hover:bg-green-50 border-gray-200'}`}
        >Prio 1</button>
        <button
          onClick={() => handlePriorityChange(2)}
          className={`${btnBase} ${priority === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-200'}`}
        >Prio 2</button>
        <button
          onClick={() => handlePriorityChange((-1))}
          className={`${btnBase} ${priority === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-gray-400 hover:bg-gray-100 border-gray-200'}`}
        >Ignore</button>
        <div className="flex-1"></div>
        <button onClick={() => setShowDebug(true)} className="text-gray-300 hover:text-blue-600 p-1"><Database className="w-3 h-3" /></button>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-600 p-1"><Trash2 className="w-3 h-3" /></button>
      </div>
    );
  };

  // Border Class Logic
  let borderClass = 'border-gray-200';
  if (priority === 3) borderClass = 'border-indigo-500 border-l-4';
  if (priority === 1) borderClass = 'border-green-500 border-l-4';
  if (priority === 2) borderClass = 'border-blue-400 border-l-4';
  if (priority === -1) borderClass = 'border-gray-100 opacity-60';
  const isSpecial = category === 'special';
  if (isSpecial) borderClass = data.details?.specialType === 'sunny' ? 'border-amber-400 border-l-4' : 'border-blue-400 border-l-4';
  
  if (isHotel) {
      if (isSelected) {
          borderClass = 'border-emerald-600 border-l-[6px] ring-1 ring-emerald-500 bg-emerald-50/30';
      } else {
          borderClass = 'border-emerald-500 border-l-4';
      }
  }

  return (
    <>
      <div ref={cardRef} className={`bg-white rounded-lg shadow-sm border p-3 mb-3 transition-all hover:shadow-md ${borderClass}`}>
        <SightCardHeader 
            name={name} 
            isHotel={isHotel} 
            isSelected={isSelected} 
            highlightText={highlightText} 
            renderViewControls={renderViewControls} 
        />
        
        <SightCardMeta 
            data={data}
            customCategory={userSelection.customCategory || category}
            customDuration={userSelection.customDuration || data.duration}
            isSpecial={isSpecial}
            specialType={data.details?.specialType}
            rating={data.rating || 0}
            userRatingsTotal={data.user_ratings_total || data.rating_count || 0}
            isHotel={isHotel}
            priceEstimate={data.price_estimate || (data.cost ? `${data.cost} ${data.currency || '€'}` : null)}
            bookingUrl={data.bookingUrl}
            sourceUrl={data.source_url}
            websiteUrl={data.website}
            isSelected={isSelected}
            displayCategory={resolveCategoryLabel(userSelection.customCategory || category)}
            onCategoryChange={(e) => updatePlace(id, { userSelection: { ...userSelection, customCategory: e.target.value } })}
            onDurationChange={(e) => updatePlace(id, { userSelection: { ...userSelection, customDuration: parseInt(e.target.value) || 0 } })}
            onHotelSelect={handleHotelSelect}
            onShowMap={(e) => { e.stopPropagation(); setUIState({ selectedPlaceId: id, viewMode: 'map' }); }}
            ensureAbsoluteUrl={ensureAbsoluteUrl}
        />

        {data.userSelection?.fixedDate && (
          <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded text-[10px] mb-1">
            <span className="font-bold text-indigo-800">Fixtermin:</span>
            <input type="date" value={data.userSelection.fixedDate} onChange={(e) => updatePlace(id, { userSelection: { ...userSelection, fixedDate: e.target.value } })} className="bg-transparent border-none p-0 h-4 text-indigo-900 focus:ring-0" />
            <input type="time" value={data.userSelection.fixedTime} onChange={(e) => updatePlace(id, { userSelection: { ...userSelection, fixedTime: e.target.value } })} className="bg-transparent border-none p-0 h-4 text-indigo-900 focus:ring-0" />
          </div>
        )}

        {renderPriorityControls()}
        
        <SightCardBody 
            data={data}
            isHotel={isHotel}
            isStandardOrHigher={isStandardOrHigher}
            isDetailed={isDetailed}
            highlightText={highlightText}
            t={t}
            onCloseDetails={() => {
                setViewLevel('standard');
                setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }}
        />
      </div>
      
      {showDebug && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b"><h3 className="font-bold text-lg">JSON Data: {name}</h3><button onClick={() => setShowDebug(false)} className="text-gray-500 hover:text-black"><X className="w-6 h-6" /></button></div>
              <div className="p-4 overflow-auto bg-slate-50 font-mono text-xs"><pre>{JSON.stringify(data, null, 2)}</pre></div>
           </div>
        </div>
      )}
    </>
  );
};
// --- END OF FILE 228 Zeilen ---
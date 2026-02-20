// 20.02.2026 19:15 - UX: Passed 'isReserve' flag to card styles to visually dim reserve items within their natural group.
// 20.02.2026 13:10 - LAYOUT: Cleaned up action controls, wired Check-In & Note to Header.
// src/features/Cockpit/SightCard/index.tsx

import React, { useState, useEffect, useRef } from 'react'; 
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { Database, Trash2, Plus, Minus, X, CalendarClock, Clock } from 'lucide-react';
import { TripOrchestrator } from '../../../services/orchestrator';

import { SightCardHeader } from './SightCardHeader';
import { SightCardMeta } from './SightCardMeta';
import { SightCardBody } from './SightCardBody';

type ViewLevel = 'compact' | 'standard' | 'details';
const VIEW_LEVELS = ['compact', 'standard', 'details'] as const;

interface SightCardProps {
  id: string;
  data: any; 
  mode?: 'selection' | 'view'; 
  showPriorityControls?: boolean;
  detailLevel?: ViewLevel;
  isReserve?: boolean; // NEW
}

export const SightCard: React.FC<SightCardProps> = ({ 
  id, 
  data, 
  mode = 'selection', 
  showPriorityControls = true,
  detailLevel: overrideDetailLevel,
  isReserve
}) => {
  const { t } = useTranslation(); 
   
  const livePlace = useTripStore(s => (id && s.project?.data?.places?.[id]) ? s.project.data.places[id] : null);
  const activeData = livePlace || data;

  const { uiState, updatePlace, deletePlace, setUIState, project, assignHotelToLogistics, togglePlaceVisited } = useTripStore(); 
  const cardRef = useRef<HTMLDivElement>(null);

  const getEffectiveViewLevel = (): ViewLevel => {
      if (overrideDetailLevel) return overrideDetailLevel;
      if (uiState.isPrintMode && uiState.printConfig?.detailLevel) {
          return uiState.printConfig.detailLevel as ViewLevel;
      }
      return (uiState.detailLevel as ViewLevel) || 'compact';
  };

  const [viewLevel, setViewLevel] = useState<ViewLevel>(getEffectiveViewLevel);
  const [showNoteInput, setShowNoteInput] = useState(false); 
   
  useEffect(() => {
    setViewLevel(getEffectiveViewLevel());
  }, [uiState.detailLevel, uiState.isPrintMode, uiState.printConfig, overrideDetailLevel]);

  const isStandardOrHigher = viewLevel === 'standard' || viewLevel === 'details';
  const isDetailed = viewLevel === 'details';
  const currentLevelIndex = VIEW_LEVELS.indexOf(viewLevel);
  const [showDebug, setShowDebug] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const name = activeData.name || activeData.official_name || activeData.name_official || 'Unbekannter Ort';
  const category = activeData.category || 'Allgemein'; 
  const isHotel = category === 'Hotel' || category === 'accommodation';
  const userSelection = activeData.userSelection || {};
  const priority = activeData.userPriority ?? userSelection.priority ?? 0; 
   
  const hasCategoryChanged = !!userSelection.customCategory && userSelection.customCategory !== category;

  const isVisited = !!activeData.visited;
  const visitedAt = activeData.visitedAt;

  const isSelectedInLogistics = () => {
      const logistics = project.userInputs.logistics;
      if (logistics.mode === 'stationaer') {
          return logistics.stationary.hotel === id;
      } else {
          return logistics.roundtrip.stops?.some((s: any) => s.hotel === id);
      }
  };
  const isSelected = isSelectedInLogistics();

  let scheduledInfo: string | null = null;
  if (project.itinerary?.days) {
      for (const day of project.itinerary.days) {
          const activities = day.activities || day.aktivitaeten || [];
          const foundAct = activities.find((a: any) => (a.id || a.original_sight_id) === id);
          if (foundAct) {
              let dateStr = day.date || '';
              if (dateStr && dateStr.includes('-')) {
                  const parts = dateStr.split('-');
                  if (parts.length === 3) dateStr = `${parts[2]}.${parts[1]}.`;
              }
              const timeStr = foundAct.time ? `${foundAct.time}` : '';
              if (dateStr || timeStr) {
                 scheduledInfo = `(${dateStr}${dateStr && timeStr ? ', ' : ''}${timeStr})`;
              }
              break; 
          }
      }
  }

  const handleHotelSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    assignHotelToLogistics(id);
  };

  const handleRegenerate = async () => {
      setIsRegenerating(true);
      try {
          await TripOrchestrator.executeTask('details', undefined, [activeData]);
      } catch (error) {
          console.error("Regeneration failed:", error);
      } finally {
          setIsRegenerating(false);
      }
  };

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

  const ensureAbsoluteUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      if (url.trim().match(/^(http:\/\/|https:\/\/)/i)) {
          return url.trim();
      }
      return `https://${url.trim()}`;
  };

  const handlePriorityChange = (newPrio: number, isFixMode: boolean = false) => {
    if (priority === newPrio && !!activeData.isFixed === isFixMode) {
        updatePlace(id, { userPriority: 0, isFixed: false });
    } else {
        updatePlace(id, { userPriority: newPrio, isFixed: isFixMode });
    }
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
      <div className="flex items-center gap-0.5 bg-slate-50 rounded p-0.5 border border-slate-100 no-print ml-1">
        <button onClick={handleStepDown} disabled={!canStepDown} className={`p-0.5 rounded transition-all ${canStepDown ? 'text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}><Minus className="w-3 h-3" /></button>
        <div className="flex gap-0.5 px-0.5">{VIEW_LEVELS.map((level, idx) => (<div key={level} className={`w-0.5 h-0.5 rounded-full ${idx <= currentLevelIndex ? 'bg-blue-500' : 'bg-slate-200'}`} />))}</div>
        <button onClick={handleStepUp} disabled={!canStepUp} className={`p-0.5 rounded transition-all ${canStepUp ? 'text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}><Plus className="w-3 h-3" /></button>
      </div>
    );
  };

  const renderActionControls = () => {
    if (mode !== 'selection') return null;
    if (!showPriorityControls) return null; 
    
    const btnBase = "px-2 py-0.5 text-[10px] font-bold rounded shadow-sm transition-all border flex items-center gap-1";
    const isFixed = !!activeData.isFixed;

    return (
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100 no-print">
        <button onClick={() => handlePriorityChange(1, true)} className={`${btnBase} ${priority === 1 && isFixed ? 'bg-purple-600 text-white border-purple-700' : 'bg-white text-gray-700 hover:bg-purple-50 border-gray-200'}`} title="Fester Termin: KI muss diesen Ort exakt einplanen.">{priority === 1 && isFixed ? <CalendarClock className="w-3 h-3" /> : null} * Fix</button>
        <button onClick={() => handlePriorityChange(1, false)} className={`${btnBase} ${priority === 1 && !isFixed ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 hover:bg-green-50 border-gray-200'}`}>Prio 1</button>
        <button onClick={() => handlePriorityChange(2, false)} className={`${btnBase} ${priority === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-blue-50 border-gray-200'}`}>Prio 2</button>
        <button onClick={() => handlePriorityChange((-1), false)} className={`${btnBase} ${priority === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-gray-400 hover:bg-gray-100 border-gray-200'}`}>Ignore</button>
        
        <div className="flex-1"></div>
        
        <button onClick={() => setShowDebug(true)} className="text-gray-300 hover:text-blue-600 p-1"><Database className="w-3 h-3" /></button>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-600 p-1"><Trash2 className="w-3 h-3" /></button>
      </div>
    );
  };

  let borderClass = 'border-gray-200';
  let bgClass = 'bg-white';
  const isSpecial = category === 'special';

  if (isVisited) {
      borderClass = 'border-emerald-500 border-l-[6px] ring-1 ring-emerald-200';
      bgClass = 'bg-emerald-50/40'; 
  } else if (activeData.isFixed) {
      borderClass = 'border-purple-500 border-l-[6px] ring-1 ring-purple-100';
  } else if (priority === 1) {
      borderClass = 'border-green-500 border-l-4';
  } else if (priority === 2) {
      borderClass = 'border-blue-400 border-l-4';
  } else if (isReserve || priority === -1) { // FIX: Applies visual dimming for ALL reserve items
      borderClass = 'border-slate-200 opacity-60';
      bgClass = 'bg-slate-50/50';
  }

  if (!isVisited && isSpecial) {
      borderClass = activeData.details?.specialType === 'sunny' ? 'border-amber-400 border-l-4' : 'border-blue-400 border-l-4';
  }

  if (isHotel && !isVisited) {
      if (isSelected) {
          borderClass = 'border-emerald-600 border-l-[6px] ring-1 ring-emerald-500';
          bgClass = 'bg-emerald-50/30';
      } else {
          borderClass = 'border-emerald-500 border-l-4';
      }
  }

  return (
    <>
      <div ref={cardRef} className={`${bgClass} rounded-lg shadow-sm border p-3 mb-3 transition-all hover:shadow-md ${borderClass}`}>
        
        <SightCardHeader 
            name={name} 
            isHotel={isHotel} 
            isSelected={isSelected} 
            highlightText={highlightText} 
            renderViewControls={renderViewControls} 
            scheduledInfo={scheduledInfo}
            isVisited={isVisited} 
            visitedAt={visitedAt} 
            onToggleVisited={(e) => { e.stopPropagation(); togglePlaceVisited(id); }} 
            showNoteInput={showNoteInput}
            hasNote={!!activeData.userNote}
            onToggleNote={(e) => { e.stopPropagation(); setShowNoteInput(!showNoteInput); }}
            isReserve={isReserve} 
        />
        
        <SightCardMeta 
            data={activeData}
            customCategory={userSelection.customCategory || category}
            customDuration={userSelection.customDuration || activeData.duration}
            isSpecial={isSpecial}
            specialType={activeData.details?.specialType}
            isHotel={isHotel}
            priceEstimate={activeData.price_estimate || (activeData.cost ? `${activeData.cost} ${activeData.currency || '€'}` : null)}
            bookingUrl={activeData.bookingUrl}
            sourceUrl={activeData.source_url}
            websiteUrl={activeData.website}
            isSelected={isSelected}
            onCategoryChange={(e) => updatePlace(id, { userSelection: { ...userSelection, customCategory: e.target.value } })}
            onDurationChange={(e) => updatePlace(id, { userSelection: { ...userSelection, customDuration: parseInt(e.target.value) || 0 } })}
            onHotelSelect={handleHotelSelect}
            onShowMap={(e) => { e.stopPropagation(); setUIState({ selectedPlaceId: id, viewMode: 'map' }); }}
            ensureAbsoluteUrl={ensureAbsoluteUrl}
            t={t} 
        />

        {activeData.isFixed && (
          <div className="flex flex-wrap items-center gap-2 bg-purple-50 px-3 py-2 rounded-md text-xs mb-1 mt-2 border border-purple-100 animate-in slide-in-from-top-1 fade-in">
            <span className="font-bold text-purple-800 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Fixtermin:</span>
            <input type="date" value={activeData.fixedDate || ''} onChange={(e) => updatePlace(id, { fixedDate: e.target.value })} className="bg-white border border-purple-200 rounded px-2 py-0.5 text-purple-900 focus:ring-1 focus:ring-purple-500 focus:border-purple-500" title="Datum" />
            <input type="time" value={activeData.fixedTime || ''} onChange={(e) => updatePlace(id, { fixedTime: e.target.value })} className="bg-white border border-purple-200 rounded px-2 py-0.5 text-purple-900 focus:ring-1 focus:ring-purple-500 focus:border-purple-500" title="Uhrzeit" />
            <div className="flex items-center gap-1 bg-white border border-purple-200 rounded px-2 py-0.5 ml-1"><Clock className="w-3 h-3 text-purple-400" /><input type="number" placeholder="Min" value={activeData.visitDuration || ''} onChange={(e) => updatePlace(id, { visitDuration: parseInt(e.target.value) || 0 })} className="w-10 bg-transparent border-none p-0 text-center text-purple-900 focus:ring-0 placeholder:text-purple-300" title="Dauer in Minuten" /></div>
          </div>
        )}

        {/* USER NOTE FIELD */}
        {(showNoteInput || activeData.userNote) && (
            <div className="mt-2 mb-1 animate-in fade-in slide-in-from-top-1">
                <textarea
                    value={activeData.userNote || ''}
                    onChange={(e) => updatePlace(id, { userNote: e.target.value })}
                    placeholder="Meine persönliche Notiz / Erlebnisbericht..."
                    className="w-full text-xs text-indigo-900 bg-indigo-50/50 border border-indigo-100 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white placeholder:text-indigo-300 resize-y min-h-[60px]"
                />
            </div>
        )}

        {renderActionControls()}
        
        <SightCardBody 
            data={activeData}
            isHotel={isHotel}
            isStandardOrHigher={isStandardOrHigher}
            isDetailed={isDetailed}
            highlightText={highlightText}
            t={t}
            onRegenerate={handleRegenerate}
            isRegenerating={isRegenerating}
            hasCategoryChanged={hasCategoryChanged}
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
              <div className="p-4 overflow-auto bg-slate-50 font-mono text-xs"><pre>{JSON.stringify(activeData, null, 2)}</pre></div>
           </div>
        </div>
      )}
    </>
  );
};
// --- END OF FILE 403 Zeilen ---
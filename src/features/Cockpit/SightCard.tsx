// 28.01.2026 18:45 - FIX: Enhanced Google Maps URL generation (Added City Context to Waypoints).
// 28.01.2026 17:50 - FIX: Implemented functional Google Maps URL generation for Walking Tours (Waypoints).
// 28.01.2026 00:15 - FIX: Removed default duration (60min). Field is now empty if unknown.
// src/features/Cockpit/SightCard.tsx

import React, { useState, useEffect, useRef } from 'react'; 
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
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
  ChevronUp, 
  Footprints,
  // NEW ICONS for V30 Data
  Trophy,
  Phone,
  Utensils,
  Sparkles
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
  const { t, i18n } = useTranslation(); 
  const { uiState, updatePlace, deletePlace, setUIState } = useTripStore(); 
  
  // FIX: Scroll Anchor for "Close & Scroll" Logic
  const cardRef = useRef<HTMLDivElement>(null);

  // FIX: Local state initialized with 'kompakt'
  const [viewLevel, setViewLevel] = useState<ViewLevel>('kompakt');
  
  // SYNC: Update local state when global state changes
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
  const description = data.description || data.shortDesc || ''; 
  const category = data.category || 'Allgemein'; 
  const rating = data.rating || 0; 
  
  // FIX: Access the correct field from JSON/Type (Priority: user_ratings_total)
  const userRatingsTotal = data.user_ratings_total || data.ratingCount || 0; 
  
  // NEW V30 Data Fields (27.01.2026)
  const awards = data.awards || [];
  const phone = data.phone;
  const cuisine = data.cuisine;
  const vibe = data.vibe || [];
  const openingHoursHint = data.openingHoursHint || data.openingHours;

  // User Selection State
  const userSelection = data.userSelection || {};
  const priority = userSelection.priority ?? 0; 
  // FIX: Removed default '|| 60' to allow empty/unknown duration
  const customDuration = userSelection.customDuration || data.duration; 
  const customCategory = userSelection.customCategory || category;
  
  const isFixed = priority === 3;
  const fixedDate = userSelection.fixedDate || '';
  const fixedTime = userSelection.fixedTime || '';

  // FIX: Helper to resolve Label (city_info -> Stadt-Infos)
  const resolveCategoryLabel = (catId: string): string => {
    if (!catId) return "Allgemein";
    const currentLang = i18n.language.substring(0, 2) as LanguageCode;
    
    const def = INTEREST_DATA[catId];
    if (def && def.label) {
        return (def.label as any)[currentLang] || (def.label as any)['de'] || catId;
    }
    return catId.charAt(0).toUpperCase() + catId.slice(1).replace(/_/g, ' ');
  };

  // FIX: Ensure absolute URL for external links
  const ensureAbsoluteUrl = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      if (url.trim().match(/^(http:\/\/|https:\/\/)/i)) {
          return url.trim();
      }
      return `https://${url.trim()}`;
  };
  
  const displayCategory = resolveCategoryLabel(customCategory); 

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

  const renderWalkRoute = () => {
    if (!data.waypoints || !Array.isArray(data.waypoints) || data.waypoints.length < 2) return null;

    // FIX: Extract City Context (Robustness against generic street names)
    // Try data.city first, then fallback to extracting from address string (e.g. "70173 Stuttgart")
    const cityContext = data.city || (data.address ? data.address.match(/\d{5}\s+([^,]+)/)?.[1] : '') || '';

    // Helper to append city if missing
    const formatWp = (wp: any) => {
        let val = wp.address || wp.name || '';
        // If we have a city context and it's NOT already in the string, append it.
        if (cityContext && val && !val.toLowerCase().includes(cityContext.toLowerCase())) {
            val += `, ${cityContext}`;
        }
        return val;
    };

    // FIX: Use official Google Maps Directions API URL structure (https://www.google.com/maps/dir/...)
    const origin = encodeURIComponent(formatWp(data.waypoints[0]));
    const destination = encodeURIComponent(formatWp(data.waypoints[data.waypoints.length - 1]));
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

    if (data.waypoints.length > 2) {
        const intermediates = data.waypoints.slice(1, -1).map((wp: any) => encodeURIComponent(formatWp(wp))).join('|');
        url += `&waypoints=${intermediates}`;
    }

    return (
      <div className="mt-2 mb-1 p-2 bg-indigo-50 rounded border border-indigo-100 flex items-start gap-2">
         <Footprints className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
         <div className="flex-1">
             <div className="text-[11px] font-bold text-indigo-800 mb-1">
                 Spaziergang: {data.waypoints.length} Stationen
             </div>
             <ol className="text-[10px] text-indigo-700 list-decimal list-inside leading-tight mb-2 opacity-80">
                 {data.waypoints.map((wp: any, i: number) => (
                     <li key={i} className="truncate">{wp.name}</li>
                 ))}
             </ol>
             <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-700 transition-colors shadow-sm"
             >
                <MapIcon className="w-3 h-3" />
                Route auf Google Maps öffnen
             </a>
         </div>
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
          onClick={() => handlePriorityChange((-1))}
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
               <option value={category}>{displayCategory}</option>
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
                 // FIX: Allow empty value if duration is undefined
                 value={customDuration || ''}
                 onChange={handleDurationChange}
                 className="w-10 bg-transparent border-b border-gray-300 p-0 text-center text-xs focus:border-blue-500 focus:ring-0"
               />
               <span>min</span>
            </div>
            <span className="text-gray-300">|</span>

            {renderStars()}

            <div className="flex items-center gap-2 ml-auto no-print">
               {data.website && (
                 <a href={ensureAbsoluteUrl(data.website)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600" title="Homepage">
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
               <button 
                 onClick={(e) => { e.stopPropagation(); setUIState({ selectedPlaceId: id, viewMode: 'map' }); }}
                 className="text-gray-400 hover:text-blue-600 transition-colors" 
                 title="Auf Karte zeigen"
               >
                 <MapIcon className="w-3.5 h-3.5" />
               </button>
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
            
            {/* FIX: Cuisine & Vibe Tags (V30 Style) */}
            {(cuisine || vibe.length > 0) && (
               <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
                  {cuisine && (
                     <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 px-2 py-0.5 rounded border border-orange-100">
                        <Utensils className="w-3 h-3" /> {cuisine}
                     </span>
                  )}
                  {vibe.map((v: string, i: number) => (
                     <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100">
                        <Sparkles className="w-3 h-3" /> {v}
                     </span>
                  ))}
               </div>
            )}

            <p className={`${isDetailed ? '' : 'line-clamp-2'} leading-snug text-xs mb-2`}>
              {highlightText(description)}
            </p>
            
            {data.reasoning && (
               <p className="text-[10px] text-indigo-600 italic mb-2 border-l-2 border-indigo-200 pl-2 leading-tight">
                 "{highlightText(data.reasoning)}"
               </p>
            )}

            {/* FIX: Awards Section (V30 Style - Prominent) */}
            {awards.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 mt-1">
                {awards.map((award: string, i: number) => (
                   <span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm">
                      <Trophy className="w-3 h-3 text-amber-600 fill-amber-100" />
                      {highlightText(award)}
                   </span>
                ))}
              </div>
            )}

            {/* FIX: Enhanced Info Grid (Phone, Hours, Price) */}
            <div className="text-xs text-gray-500 leading-snug space-y-1">
               <div className="flex flex-wrap gap-x-3 gap-y-1">
                   {data.address && (
                     <span className="flex items-center gap-1">
                       <span className="font-semibold text-gray-400">📍</span> {highlightText(data.address)}
                     </span>
                   )}
                   {phone && (
                      <span className="flex items-center gap-1 text-gray-600">
                         <Phone className="w-3 h-3 text-gray-400" /> 
                         <a href={`tel:${phone}`} className="hover:text-blue-600 hover:underline">{phone}</a>
                      </span>
                   )}
               </div>
               
               <div className="flex flex-wrap gap-x-3 gap-y-1">
                   {openingHoursHint && (
                     <span className="flex items-center gap-1">
                       <span className="font-semibold text-gray-400">🕒</span> {highlightText(openingHoursHint)}
                     </span>
                   )}

                   {data.priceLevel && (
                     <span className="flex items-center gap-1">
                       <span className="font-semibold text-gray-400">💶</span> {highlightText(data.priceLevel)}
                     </span>
                   )}
               </div>
            </div>

            {data.logistics && (
               <div className="mt-1.5 bg-slate-50 p-1.5 rounded text-[11px] text-slate-700 border border-slate-100 leading-tight">
                 <span className="font-bold text-slate-500 mr-1">Logistik:</span> 
                 {highlightText(data.logistics)}
               </div>
            )}
            
            {renderWalkRoute()}

            {isDetailed && (
              <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                
                <div className="space-y-3 text-[13px] leading-relaxed text-slate-800 px-1">
                   {(data.detailContent || description).split(/\n\n/).map((section: string, idx: number) => {
                      const content = section.trim();
                      if (!content) return null;

                      const isHeader = content.length < 100 && (
                          content.startsWith('###') || 
                          content.toLowerCase().startsWith('teil') || 
                          (content.toLowerCase().includes('top 5') && content.length < 50) || 
                          (content.toLowerCase().includes('fakten') && content.length < 50)
                      );

                      if (isHeader) {
                          const cleanHeader = content.replace(/^###\s*/, '');
                          return (
                            <h4 key={idx} className="font-black text-blue-900 text-[11px] uppercase tracking-wider border-l-4 border-blue-600 pl-3 mt-6 mb-2 bg-slate-50 py-1 rounded-r shadow-sm">
                               {highlightText(cleanHeader)}
                            </h4>
                          );
                      }

                      const lines = content.split('\n');
                      if (lines.length > 1) {
                         return (
                            <div key={idx} className="mb-3">
                              {lines.map((line, lIdx) => {
                                 const cleanLine = line.trim();
                                 if (!cleanLine) return null;
                                 
                                 const isListItem = /^[-\*•\d\.]/.test(cleanLine);
                                 
                                 if (isListItem) {
                                     return (
                                        <div key={lIdx} className="pl-4 py-1 text-xs text-slate-700 border-l-2 border-slate-200 ml-1 mb-1">
                                            {highlightText(cleanLine)}
                                        </div>
                                     );
                                 }
                                 
                                 return <p key={lIdx} className="mb-1 text-xs">{highlightText(cleanLine)}</p>;
                              })}
                            </div>
                         );
                      }

                      return <p key={idx} className="mb-3 text-xs leading-normal">{highlightText(content)}</p>;
                   })}
                </div>

                <div className="pt-4 flex justify-center pb-2 no-print">
                   <button 
                      onClick={handleCloseDetails}
                      className="flex items-center gap-2 px-10 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold transition-all border border-slate-200 shadow-sm active:scale-95 group"
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
// --- END OF FILE 602 Zeilen ---
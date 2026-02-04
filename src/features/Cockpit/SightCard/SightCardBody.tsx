// 05.02.2026 21:00 - FEATURE: Added 'Planungs-Hinweis' & 'Preis' display (PDF Style).
// 05.02.2026 19:40 - FIX: Restored Icons (MapPin, Clock, Wallet) for Address/Hours/Price.
// 05.02.2026 19:30 - FEATURE: Added 'Regenerate Text' button.
// src/features/Cockpit/SightCard/SightCardBody.tsx

import React from 'react';
// FIX: Added Info and Banknote icons
import { CheckCircle2, ChefHat, Utensils, Sparkles, Trophy, Phone, Footprints, Map as MapIcon, ChevronUp, RefreshCw, MapPin, Clock, Wallet, Info, Banknote } from 'lucide-react';

interface SightCardBodyProps {
  data: any;
  isHotel: boolean;
  isStandardOrHigher: boolean;
  isDetailed: boolean;
  highlightText: (text: string | undefined | null) => React.ReactNode;
  t: any;
  onCloseDetails: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export const SightCardBody: React.FC<SightCardBodyProps> = ({
  data,
  isHotel,
  isStandardOrHigher,
  isDetailed,
  highlightText,
  t,
  onCloseDetails,
  onRegenerate,
  isRegenerating = false
}) => {
  if (!isStandardOrHigher) return null;

  const renderWalkRoute = () => {
    if (!data.waypoints || !Array.isArray(data.waypoints) || data.waypoints.length < 2) return null;

    const cityContext = data.city || (data.address ? data.address.match(/\d{5}\s+([^,]+)/)?.[1] : '') || '';
    const formatWp = (wp: any) => {
        let val = wp.address || wp.name || '';
        if (cityContext && val && !val.toLowerCase().includes(cityContext.toLowerCase())) {
            val += `, ${cityContext}`;
        }
        return val;
    };

    const origin = encodeURIComponent(formatWp(data.waypoints[0]));
    const destination = encodeURIComponent(formatWp(data.waypoints[data.waypoints.length - 1]));
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;

    if (data.waypoints.length > 2) {
        const intermediates = data.waypoints.slice(1, -1).map((wp: any) => encodeURIComponent(formatWp(wp))).join('|');
        url += `&waypoints=${intermediates}`;
    }

    return (
      <div className="mt-1 mb-1 p-2 bg-slate-50/50 rounded border border-slate-100 flex items-start gap-2">
         <Footprints className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
         <div className="flex-1">
             <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">
                 Spaziergang: {data.waypoints.length} Stationen
             </div>
             <div className="text-[10px] text-slate-600 leading-tight mb-2 flex flex-wrap gap-x-1.5 gap-y-0.5">
                 {data.waypoints.map((wp: any, i: number) => (
                     <span key={i} className="flex items-center whitespace-nowrap">
                        <span className="opacity-50 mr-0.5">{i + 1}.</span>
                        {wp.name}
                        {i < data.waypoints.length - 1 && <span className="ml-1.5 text-slate-300">|</span>}
                     </span>
                 ))}
             </div>
             <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
             >
                <MapIcon className="w-3 h-3" />
                <span className="underline decoration-indigo-200 underline-offset-2">Route auf Google Maps ﾃｶffnen</span>
             </a>
         </div>
      </div>
    );
  };

  return (
    <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            
      {/* HOTEL: LOCATION MATCH */}
      {isHotel && data.location_match && (
            <div className="flex items-start gap-2 mb-2 text-[11px] text-emerald-800 bg-emerald-50/50 p-2 rounded border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-snug">
                  <span className="font-bold block text-emerald-700 text-[10px] uppercase">Strategische Lage:</span>
                  <span className="italic">"{highlightText(data.location_match)}"</span>
              </div>
          </div>
      )}

      {/* FOOD: SIGNATURE DISH */}
      {data.signature_dish && (
          <div className="flex items-start gap-1.5 mb-2 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-100">
              <ChefHat className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span className="font-medium italic">"{highlightText(data.signature_dish)}"</span>
          </div>
      )}

      {(data.cuisine || (data.vibe && data.vibe.length > 0)) && (
          <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
            {data.cuisine && (<span className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 px-2 py-0.5 rounded border border-orange-100"><Utensils className="w-3 h-3" /> {data.cuisine}</span>)}
            {data.vibe && data.vibe.map((v: string, i: number) => (<span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100"><Sparkles className="w-3 h-3" /> {v}</span>))}
          </div>
      )}

      <p className={`${isDetailed ? '' : 'line-clamp-2'} leading-snug text-xs mb-2`}>{highlightText(data.description || data.shortDesc)}</p>
      
      {data.reasoning && (<p className="text-[10px] text-indigo-600 italic mb-2 border-l-2 border-indigo-200 pl-2 leading-tight">"{highlightText(data.reasoning)}"</p>)}
      
      {data.category === 'special' && data.details?.note && (
        <p className="text-[10px] text-amber-700 italic mb-2 border-l-2 border-amber-300 pl-2 leading-tight bg-amber-50 p-1 rounded-r">
          <span className="font-bold not-italic">Tipp: </span>"{highlightText(data.details.note)}"
        </p>
      )}

      {data.awards && data.awards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 mt-1">
          {data.awards.map((award: string, i: number) => (<span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm"><Trophy className="w-3 h-3 text-amber-600 fill-amber-100" />{highlightText(award)}</span>))}
        </div>
      )}

      {/* NEW: Logistics & Price Section (PDF Style) */}
      {(data.logistics || data.price_estimate) && (
        <div className="mt-2 mb-2 space-y-1.5 bg-slate-50/80 p-2 rounded border border-slate-100">
            {/* Logistik / Planungs-Hinweis */}
            {data.logistics && (
                <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-slate-700 leading-tight">
                        <span className="font-bold text-slate-800">Planungs-Hinweis: </span>
                        {highlightText(data.logistics)}
                    </div>
                </div>
            )}
            
            {/* Preis */}
            {data.price_estimate && (
                <div className="flex items-start gap-2">
                    <Banknote className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-slate-700 leading-tight">
                        <span className="font-bold text-slate-800">Preis: </span>
                        {highlightText(data.price_estimate)}
                    </div>
                </div>
            )}
        </div>
      )}

      <div className="text-xs text-gray-500 leading-snug space-y-1 mt-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
              {data.address && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /> {highlightText(data.address)}</span>)}
              {(data.phone || data.phone_number) && (<span className="flex items-center gap-1 text-gray-600"><Phone className="w-3 h-3 text-gray-400" /><a href={`tel:${data.phone || data.phone_number}`} className="hover:text-blue-600 hover:underline">{data.phone || data.phone_number}</a></span>)}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(data.openingHoursHint || data.openingHours) && (<span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> {highlightText(data.openingHoursHint || data.openingHours)}</span>)}
              {data.priceLevel && (<span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-gray-400" /> {highlightText(data.priceLevel)}</span>)}
          </div>
      </div>
      
      {isHotel && data.pros && data.pros.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
              {data.pros.map((p: string, idx: number) => (
                  <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                      + {p}
                  </span>
              ))}
          </div>
      )}

      {renderWalkRoute()}

      {isDetailed && data.category !== 'special' && (
        <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
          
          {/* REGENERATE BUTTON */}
          {onRegenerate && (
            <div className="flex justify-end no-print -mt-1 mb-2">
                <button 
                    onClick={onRegenerate} 
                    disabled={isRegenerating}
                    className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold border transition-all
                        ${isRegenerating 
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'}
                    `}
                >
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {isRegenerating ? 'Schreibe neu...' : 'Text aktualisieren'}
                </button>
            </div>
          )}

          <div className="space-y-3 text-[13px] leading-relaxed text-slate-800 px-1">
              {(data.detailContent || data.description).split(/\n\n/).map((section: string, idx: number) => {
                const content = section.trim();
                if (!content) return null;
                const isHeader = content.length < 100 && (content.startsWith('###') || content.toLowerCase().startsWith('teil') || (content.toLowerCase().includes('top 5') && content.length < 50) || (content.toLowerCase().includes('fakten') && content.length < 50));
                if (isHeader) {
                    const cleanHeader = content.replace(/^###\s*/, '');
                    return (<h4 key={idx} className="font-black text-blue-900 text-[11px] uppercase tracking-wider border-l-4 border-blue-600 pl-3 mt-6 mb-2 bg-slate-50 py-1 rounded-r shadow-sm">{highlightText(cleanHeader)}</h4>);
                }
                const lines = content.split('\n');
                if (lines.length > 1) {
                    return (<div key={idx} className="mb-3">{lines.map((line, lIdx) => {
                            const cleanLine = line.trim();
                            if (!cleanLine) return null;
                            const isListItem = /^[-\*窶｢\d\.]/.test(cleanLine);
                            if (isListItem) { return (<div key={lIdx} className="pl-4 py-1 text-xs text-slate-700 border-l-2 border-slate-200 ml-1 mb-1">{highlightText(cleanLine)}</div>); }
                            return <p key={lIdx} className="mb-1 text-xs">{highlightText(cleanLine)}</p>;
                        })}</div>);
                }
                return <p key={idx} className="mb-3 text-xs leading-normal">{highlightText(content)}</p>;
              })}
          </div>
          <div className="pt-4 flex justify-center pb-2 no-print">
              <button onClick={onCloseDetails} className="flex items-center gap-2 px-10 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold transition-all border border-slate-200 shadow-sm active:scale-95 group"><ChevronUp className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />{t('sights.close_details', { defaultValue: 'DETAILS SCHLIESSEN' })}</button>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE 200 Zeilen ---
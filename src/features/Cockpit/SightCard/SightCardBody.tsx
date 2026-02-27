// 27.02.2026 19:15 - UX: Made Flex Day exception toggleable (can be removed) and fully mobile-friendly.
// 27.02.2026 18:15 - FEAT: Added "Flex Day" Button to UI for overriding strict planner rules.
// 27.02.2026 17:40 - FEAT: Added KI-Planungs-Konflikt warning for unassigned places.
// src/features/Cockpit/SightCard/SightCardBody.tsx

import React, { useState } from 'react';
import { CheckCircle2, ChefHat, Utensils, Sparkles, Trophy, Phone, Footprints, Map as MapIcon, ChevronUp, RefreshCw, MapPin, Clock, Info, Banknote, Star, Zap, Loader2, AlertCircle, Unlock, X } from 'lucide-react';
import { LiveScout } from '../../../services/LiveScout'; 
import { useTripStore } from '../../../store/useTripStore';

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
  hasCategoryChanged?: boolean; 
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
  isRegenerating = false,
  hasCategoryChanged = false 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const { project, updatePlace } = useTripStore();

  if (!isStandardOrHigher) return null;

  const handleLiveCheck = async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (isChecking) return;
      setIsChecking(true);
      try {
          await LiveScout.verifyPlace(data.id);
      } catch (err) {
          console.error("Live Check failed", err);
      } finally {
          setIsChecking(false);
      }
  };

  const resolveDescription = () => {
      return data.description || data.shortDesc || data.summary || data.editorial_summary?.overview || "";
  };
  
  const descriptionText = resolveDescription();

  const unassignedList = (project.analysis as any)?.initialTagesplaner?.unassigned || [];
  const unassignedInfo = unassignedList.find((u: any) => u.id === data.id);
  const isFlexDayAllowed = data.userSelection?.allowFlexibleDay === true;

  // UX-FIX: Toggle function instead of just setting to true
  const handleToggleFlexDay = (e: React.MouseEvent) => {
      e.stopPropagation();
      updatePlace(data.id, { 
          userSelection: { ...data.userSelection, allowFlexibleDay: !isFlexDayAllowed } 
      });
  };

  // --- UNIFIED RENDERERS FOR LIVE DATA ---
  
  const renderPrice = () => {
      const livePrice = data.liveStatus?.priceLevel; 
      const finalPrice = livePrice || data.price_estimate || data.priceLevel || data.cost;
      if (!finalPrice) return null;
      
      const isLive = !!data.liveStatus?.priceLevel;

      return (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border font-medium text-xs shadow-sm transition-all ${isLive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}>
              <Banknote className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{highlightText(String(finalPrice))}</span>
              {isLive && <span title={t('sights.live_price_tooltip', { defaultValue: 'Live abgerufener Preis' })} className="flex items-center"><Zap className="w-2.5 h-2.5 text-emerald-500 fill-current ml-0.5" /></span>}
          </div>
      );
  };

  const renderOpeningHours = () => {
      if (isChecking) {
          return <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium bg-blue-50 px-2 py-1 rounded border border-blue-100"><Loader2 className="w-3 h-3 animate-spin" /> {t('sights.live_check_loading', { defaultValue: 'Live-Check...' })}</div>;
      }

      if (data.liveStatus) {
          const ls = data.liveStatus;
          let colorClass = 'text-slate-700';
          let bgClass = 'bg-white border-slate-200';
          let label = ls.openingHoursToday || t('sights.live_checked', { defaultValue: 'Geprüft' });
          let statusBadge = null;

          if (ls.status === 'open') {
              colorClass = 'text-emerald-800';
              bgClass = 'bg-emerald-50 border-emerald-200';
              statusBadge = <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 shadow-sm">{t('sights.status_open', { defaultValue: 'Offen' })}</span>;
          } else if (ls.status === 'closed' || ls.status === 'permanently_closed') {
              colorClass = 'text-red-800';
              bgClass = 'bg-red-50 border-red-200';
              label = ls.openingHoursToday || t('sights.status_closed', { defaultValue: 'Geschlossen' });
              statusBadge = <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 shadow-sm">{t('sights.status_closed_short', { defaultValue: 'Zu' })}</span>;
          } else if (ls.status === 'corrected') {
              colorClass = 'text-amber-800';
              bgClass = 'bg-amber-50 border-amber-200';
              statusBadge = <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1 shadow-sm">{t('sights.status_changed', { defaultValue: 'Geändert' })}</span>;
          }

          return (
              <div className={`flex items-center gap-1 px-2 py-1 rounded border shadow-sm ${bgClass} ${colorClass} text-xs transition-all`}>
                  <Zap className="w-3 h-3 fill-current opacity-70" />
                  <span className="font-bold">{label}</span>
                  {statusBadge}
                  <button onClick={handleLiveCheck} className="ml-1 opacity-40 hover:opacity-100 transition-opacity" title={t('sights.reload', { defaultValue: 'Neu laden' })}><RefreshCw className="w-3 h-3" /></button>
              </div>
          );
      }
      
      const llmHours = data.openingHoursHint || data.openingHours;
      return (
          <div className="flex items-center gap-2">
              {llmHours && (
                  <div className="flex items-center gap-1.5 text-slate-600 text-xs bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{highlightText(llmHours)}</span>
                  </div>
              )}
              <button 
                  onClick={handleLiveCheck} 
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 rounded text-[10px] font-bold transition-colors shadow-sm"
                  title={t('sights.live_check_tooltip', { defaultValue: 'Echte Öffnungszeiten & Status live abrufen' })}
              >
                  <Zap className="w-3 h-3" /> {t('sights.live_check_btn_short', { defaultValue: 'Live-Check' })}
              </button>
          </div>
      );
  };

  const renderWalkRoute = () => {
    if (!data.waypoints || !Array.isArray(data.waypoints) || data.waypoints.length < 2) return null;
    const cityContext = data.city || (data.address ? data.address.match(/\d{5}\s+([^,]+)/)?.[1] : '') || '';
    const formatWp = (wp: any) => {
        let val = wp.address || wp.name || '';
        if (cityContext && val && !val.toLowerCase().includes(cityContext.toLowerCase())) val += `, ${cityContext}`;
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
             <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tight">{t('sights.walk_route_title', { count: data.waypoints.length, defaultValue: `Spaziergang: ${data.waypoints.length} Stationen` })}</div>
             <div className="text-[10px] text-slate-600 leading-tight mb-2 flex flex-wrap gap-x-1.5 gap-y-0.5">
                 {data.waypoints.map((wp: any, i: number) => (
                     <span key={i} className="flex items-center whitespace-nowrap"><span className="opacity-50 mr-0.5">{i + 1}.</span>{wp.name}{i < data.waypoints.length - 1 && <span className="ml-1.5 text-slate-300">|</span>}</span>
                 ))}
             </div>
             <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"><MapIcon className="w-3 h-3" /><span className="underline decoration-indigo-200 underline-offset-2">{t('sights.open_gmaps', { defaultValue: 'Route auf Google Maps öffnen' })}</span></a>
         </div>
      </div>
    );
  };

  return (
    <div className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
      
      {/* KI-Planungs-Konflikt Warnung & Flex-Button Toggle */}
      {unassignedInfo && (
          <div className="flex flex-col gap-2 mb-3 p-2.5 bg-orange-50 border border-orange-200 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2 text-xs text-orange-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                  <div>
                      <strong className="block font-bold mb-0.5 uppercase tracking-wide text-[10px] text-orange-700">{t('sights.planning_conflict', { defaultValue: 'KI-Planungs-Konflikt (Nicht im Tagesplan)' })}</strong>
                      <span className="leading-snug">{unassignedInfo.reason}</span>
                  </div>
              </div>
              
              {!isFlexDayAllowed ? (
                  <button 
                      onClick={handleToggleFlexDay}
                      className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 bg-white border border-orange-300 text-orange-700 rounded-md text-[10px] font-bold hover:bg-orange-100 transition-colors shadow-sm"
                  >
                      <Unlock className="w-3 h-3" />
                      {t('sights.allow_flex_day', { defaultValue: 'Ausnahmeregel: Zeitgrenzen für diesen Ort ignorieren' })}
                  </button>
              ) : (
                  <div className="mt-1 flex items-center justify-between w-full py-1 pl-2 pr-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[10px] font-bold">
                      <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('sights.flex_day_active', { defaultValue: 'Ausnahmeregel aktiv! (Für Neuplanung)' })}
                      </div>
                      <button 
                          onClick={handleToggleFlexDay}
                          className="p-1 hover:bg-red-100 hover:text-red-700 text-emerald-600 rounded transition-colors"
                          title={t('sights.remove_flex_day', { defaultValue: 'Ausnahmeregel entfernen' })}
                      >
                          <X className="w-3.5 h-3.5" />
                      </button>
                  </div>
              )}
          </div>
      )}

      {isHotel && data.location_match && (
            <div className="flex items-start gap-2 mb-2 text-[11px] text-emerald-800 bg-emerald-50/50 p-2 rounded border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="leading-snug">
                  <span className="font-bold block text-emerald-700 text-[10px] uppercase">{t('sights.strategic_location', { defaultValue: 'Strategische Lage:' })}</span>
                  <span className="italic">"{highlightText(data.location_match)}"</span>
              </div>
          </div>
      )}

      {data.rating && (
          <div className="flex items-center gap-1 mb-2">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-xs text-slate-800">{data.rating}</span>
              {data.user_ratings_total && (<span className="text-xs text-slate-400">({data.user_ratings_total})</span>)}
          </div>
      )}

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

      <p className={`${isDetailed ? '' : 'line-clamp-2'} leading-snug text-xs mb-2`}>
        {highlightText(descriptionText)}
      </p>
      
      {data.reasoning && (<p className="text-[10px] text-indigo-600 italic mb-2 border-l-2 border-indigo-200 pl-2 leading-tight">"{highlightText(data.reasoning)}"</p>)}
      
      {data.category === 'special' && data.details?.note && (
        <p className="text-[10px] text-amber-700 italic mb-2 border-l-2 border-amber-300 pl-2 leading-tight bg-amber-50 p-1 rounded-r">
          <span className="font-bold not-italic">{t('sights.tip', { defaultValue: 'Tipp:' })} </span>"{highlightText(data.details.note)}"
        </p>
      )}

      {data.awards && data.awards.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 mt-1">
          {data.awards.map((award: string, i: number) => (<span key={i} className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shadow-sm"><Trophy className="w-3 h-3 text-amber-600 fill-amber-100" />{highlightText(award)}</span>))}
        </div>
      )}

      <div className="mt-3 bg-slate-50/80 rounded-xl p-3 border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
              {data.address && (<span className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" /> <span className="leading-snug">{highlightText(data.address)}</span></span>)}
              {(data.phone || data.phone_number) && (<span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /><a href={`tel:${data.phone || data.phone_number}`} className="hover:text-blue-600 hover:underline font-medium">{data.phone || data.phone_number}</a></span>)}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-slate-200/60">
              {renderOpeningHours()}
              {renderPrice()}
          </div>
          
          {data.liveStatus && (
              <div className="flex items-start gap-1.5 pt-1 text-[10px] text-slate-500">
                  <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                      {data.liveStatus.note && <><strong className="text-slate-600">{t('sights.live_note', { defaultValue: 'Live-Hinweis:' })}</strong> {highlightText(data.liveStatus.note)} </>}
                      <span className="opacity-70">
                          {data.liveStatus.note ? '(' : ''}{t('sights.live_stand', { defaultValue: 'Stand:' })} {new Date(data.liveStatus.lastChecked).toLocaleDateString(t('lang', { defaultValue: 'de-DE' }), { day: '2-digit', month: '2-digit', year: 'numeric' })}{data.liveStatus.note ? ')' : ''}
                      </span>
                  </span>
              </div>
          )}

          {data.logistics && (
              <div className="flex items-start gap-1.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="leading-snug"><strong className="text-slate-800">{t('sights.planning_note', { defaultValue: 'Planungs-Hinweis:' })} </strong>{highlightText(data.logistics)}</span>
              </div>
          )}
      </div>

      {isHotel && data.pros && data.pros.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
              {data.pros.map((p: string, idx: number) => (<span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">+ {p}</span>))}
          </div>
      )}

      {renderWalkRoute()}

      {isDetailed && data.category !== 'special' && (
        <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
          {onRegenerate && hasCategoryChanged && (
            <div className="flex justify-end no-print -mt-1 mb-2">
                <button onClick={onRegenerate} disabled={isRegenerating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold border transition-all ${isRegenerating ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'}`}>
                    <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />{isRegenerating ? t('sights.regenerating', { defaultValue: 'Schreibe neu...' }) : t('sights.regenerate_text', { defaultValue: 'Text aktualisieren' })}
                </button>
            </div>
          )}

          <div className="space-y-3 text-[13px] leading-relaxed text-slate-800 px-1">
              {(data.detailContent || descriptionText || "").split(/\n\n/).map((section: string, idx: number) => {
                const content = section.trim();
                if (!content) return null;
                const isHeader = content.length < 100 && (content.startsWith('###') || content.toLowerCase().startsWith('teil') || (content.toLowerCase().includes('top 5') && content.length < 50) || (content.toLowerCase().includes('fakten') && content.length < 50));
                if (isHeader) return (<h4 key={idx} className="font-black text-blue-900 text-[11px] uppercase tracking-wider border-l-4 border-blue-600 pl-3 mt-6 mb-2 bg-slate-50 py-1 rounded-r shadow-sm">{highlightText(content.replace(/^###\s*/, ''))}</h4>);
                const lines = content.split('\n');
                if (lines.length > 1) {
                    return (<div key={idx} className="mb-3">{lines.map((line, lIdx) => {
                            const cleanLine = line.trim();
                            if (!cleanLine) return null;
                            if (/^[-\*窶｢\d\.]/.test(cleanLine)) return (<div key={lIdx} className="pl-4 py-1 text-xs text-slate-700 border-l-2 border-slate-200 ml-1 mb-1">{highlightText(cleanLine)}</div>);
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
// --- END OF FILE 319 Zeilen ---
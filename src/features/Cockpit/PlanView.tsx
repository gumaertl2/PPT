// 06.02.2026 21:00 - FIX: Google Maps Link now uses 'generateGoogleMapsRouteUrl' with country context.
// 06.02.2026 20:45 - FIX: Compact Route Layout & Corrected Maps Link.
// 06.02.2026 20:30 - FIX: Allow 'mobil' mode to trigger Route Block (Legacy compatibility).
// src/features/Cockpit/PlanView.tsx

import React, { useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  CheckCircle,
  Lightbulb,
  Map as MapIcon,
  ExternalLink,
  Layout as LayoutIcon,
  Navigation,
  Quote,
  Clock,
  ArrowRight
} from 'lucide-react';
import type { LanguageCode } from '../../core/types';
import { 
  STRATEGY_OPTIONS, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS,
  INTEREST_DATA
} from '../../data/staticData';
// FIX: Import the utility to ensure consistent link generation with RouteReviewView
import { generateGoogleMapsRouteUrl } from './utils';

export const PlanView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project } = useTripStore();
  const { userInputs, analysis } = project;
  const { logistics, travelers, dates, selectedInterests, pace, budget, vibe, strategyId } = userInputs;
  const chefPlaner = analysis.chefPlaner;
  const routeAnalysis = analysis.routeArchitect;

  const isRoundtripContext = ['roundtrip', 'mobil'].includes(logistics.mode);

  // --- HELPER: Label Resolution ---
  const resolveLabel = (item: any): string => {
    if (!item || !item.label) return '';
    if (typeof item.label === 'string') return item.label;
    return (item.label as any)[currentLang] || (item.label as any)['de'] || '';
  };

  const InfoRow = ({ label, value, sub }: { label: string, value: React.ReactNode, sub?: string }) => (
    <div className="text-sm">
      <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</span>
      <div className="font-medium text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );

  // --- 1. COCKPIT & WER/WIE ---
  const renderReviewBlocks = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
        {/* BLOCK 1: COCKPIT */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all h-full">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                <h3 className="text-sm font-bold text-slate-600 uppercase flex items-center gap-2">
                    <LayoutIcon className="w-4 h-4 text-blue-500" /> 1. Cockpit
                </h3>
            </div>
            <div className="space-y-4">
                <InfoRow 
                    label={t('review.label_logistics')} 
                    value={!isRoundtripContext ? t('logistics.stationary') : t('logistics.roadtrip')} 
                    sub={!isRoundtripContext 
                    ? `${logistics.stationary.region || '-'} ${logistics.stationary.destination ? `(${logistics.stationary.destination})` : ''}`
                    : `${logistics.roundtrip.region || '-'} (${logistics.roundtrip.stops.length} ${t('cockpit.stops_label')})`
                    }
                />
                <div className="h-px bg-slate-50 my-2"></div>
                <InfoRow 
                    label={t('review.label_dates')} 
                    value={dates.flexible ? t('review.value_flexible') : t('review.value_fix')}
                    sub={dates.flexible 
                        ? `${t('cockpit.duration_label')}: ~${dates.duration}` 
                        : `${dates.start || '?'} - ${dates.end || '?'}`
                    } 
                />
                {(dates.arrival.type || dates.arrival.time) && (
                    <div className="flex gap-4 pt-1">
                        <div className="flex-1">
                            <InfoRow label={t('review.label_arrival')} value={dates.arrival.time || '-'} />
                        </div>
                        <div className="flex-1">
                            <InfoRow label={t('review.label_departure')} value={dates.departure?.time || '-'} />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* BLOCK 2: WER & WIE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all h-full">
            <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
                <h3 className="text-sm font-bold text-slate-600 uppercase flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" /> 2. Wer & Wie
                </h3>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                        label={t('review.label_travelers')} 
                        value={`${travelers.adults} ${t('profile.adults')} / ${travelers.children} ${t('profile.children')}`} 
                        sub={travelers.children > 0 ? `${t('profile.age_children')}: ${travelers.ages || '-'}` : undefined}
                    />
                    <InfoRow 
                        label={t('review.label_origin')} 
                        value={travelers.origin || '-'} 
                        sub={travelers.nationality || '-'}
                    />
                </div>
                <div className="h-px bg-slate-50 my-2"></div>
                <InfoRow 
                    label={t('review.label_strategy')} 
                    value={<span className="text-blue-600">{resolveLabel(STRATEGY_OPTIONS[strategyId]) || strategyId}</span>} 
                />
                <div className="grid grid-cols-3 gap-2">
                    <InfoRow label={t('profile.options_pace')} value={resolveLabel(PACE_OPTIONS[pace]) || pace} />
                    <InfoRow label={t('profile.options_budget')} value={resolveLabel(BUDGET_OPTIONS[budget]) || budget} />
                    <InfoRow label={t('profile.options_vibe')} value={resolveLabel(VIBE_OPTIONS[vibe]) || vibe} />
                </div>
                <div className="h-px bg-slate-50 my-2"></div>
                <InfoRow 
                    label={t('review.label_interests')} 
                    value={
                        selectedInterests.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                            {selectedInterests.map(id => (
                                <span key={id} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200">
                                {INTEREST_DATA[id] ? resolveLabel(INTEREST_DATA[id]) : id}
                                </span>
                            ))}
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">{t('review.value_no_interests')}</span>
                        )
                    } 
                />
            </div>
        </div>
      </div>
    );
  };

  // --- 2. ANALYSE ---
  const renderAnalysisBlock = () => {
    if (!chefPlaner) return null;

    return (
      <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
          <CheckCircle className="w-4 h-4 text-blue-500" />
          {t('analysis.plausibility')}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {chefPlaner.plausibility_check || t('analysis.noCheck')}
        </p>
        
        {chefPlaner.strategic_briefing && (
          <div className="pt-4 border-t border-gray-100">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
               <Lightbulb className="w-3 h-3" />
               {t('analysis.briefing')}
             </h4>
             <p className="text-sm text-gray-600 italic mb-2">
              "{chefPlaner.strategic_briefing?.sammler_briefing}"
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded inline-block">
              <strong>{t('analysis.radius')}:</strong> {chefPlaner.strategic_briefing?.search_radius_instruction}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 3. ROUTE ---
  
  const matchedRoute = useMemo(() => {
      if (!isRoundtripContext || !routeAnalysis?.routes) return null;
      
      const currentStops = logistics.roundtrip.stops || [];
      const currentLocations = currentStops.map(s => s.location).sort().join('|');

      return routeAnalysis.routes.find((p: any) => {
          if (!p.stages) return false;
          const proposalStr = p.stages.map((s: any) => s.location_name).sort().join('|');
          return proposalStr === currentLocations;
      });
  }, [isRoundtripContext, logistics, routeAnalysis]);

  const renderRouteBlock = () => {
    if (!isRoundtripContext) return null;

    const roundtrip = logistics.roundtrip;
    const stops = roundtrip.stops || [];

    // CORRECTED MAPS LINK GENERATION
    const generateMapsLink = () => {
       // 1. Prefer existing link from analysis
       if (routeAnalysis?.googleMapsLink) return routeAnalysis.googleMapsLink;
       
       // 2. Fallback: Use utility with Context to prevent Ambiguity
       const locations = [
           roundtrip.startLocation,
           ...stops.map(s => s.name || s.location),
           roundtrip.endLocation
       ].filter(Boolean) as string[];

       // Determine Country Context (same logic as in RouteReviewView)
       const countryContext = logistics.roundtrip.region || (logistics as any).target_countries?.[0] || "";

       return generateGoogleMapsRouteUrl(locations, 'driving', countryContext);
    };

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
         
         {/* HEADER */}
         <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
               <MapIcon size={24} />
            </div>
            <div>
               <h2 className="text-xl font-bold text-slate-900">Routen-Planung</h2>
               <p className="text-sm text-slate-500">
                  {roundtrip.startLocation} ➔ {roundtrip.endLocation}
               </p>
            </div>
         </div>

         {/* MATCHED ROUTE INFO */}
         {matchedRoute ? (
             <div className="mb-6 bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                 <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-blue-900">{matchedRoute.title}</h3>
                    <div className="flex gap-2">
                        {matchedRoute.total_km && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Navigation size={10} /> {matchedRoute.total_km} km
                            </span>
                        )}
                        {matchedRoute.total_drive_time && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Clock size={10} /> {matchedRoute.total_drive_time} h
                            </span>
                        )}
                    </div>
                 </div>
                 <p className="text-sm text-slate-700 leading-relaxed italic flex gap-2">
                    <Quote size={16} className="text-blue-300 shrink-0 mt-0.5" />
                    {matchedRoute.description}
                 </p>
             </div>
         ) : (
             routeAnalysis?.route_reasoning && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                    "{routeAnalysis.route_reasoning}"
                </div>
             )
         )}

         {/* COMPACT STATIONS LIST (Horizontal) */}
         <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Reiseverlauf & Aufenthalte
            </h4>
            <div className="flex flex-wrap items-center gap-y-2 text-sm leading-relaxed">
                {/* START */}
                <span className="font-semibold text-slate-700">{roundtrip.startLocation}</span>
                
                <ArrowRight size={14} className="mx-2 text-slate-300" />

                {/* STOPS */}
                {stops.map((stop, idx) => (
                    <React.Fragment key={idx}>
                        <span className="inline-flex items-center gap-1">
                            <span className="font-bold text-slate-900">{stop.name || stop.location}</span>
                            {stop.duration && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100 font-medium">
                                    ({stop.duration})
                                </span>
                            )}
                        </span>
                        
                        <ArrowRight size={14} className="mx-2 text-slate-300" />
                    </React.Fragment>
                ))}

                {/* END */}
                <span className="font-semibold text-slate-700">{roundtrip.endLocation}</span>
            </div>
         </div>

         {/* MAPS ACTION */}
         <div className="pt-4 border-t border-slate-50 flex justify-center">
            <a 
               href={generateMapsLink()} 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg group"
            >
               <MapIcon size={18} />
               {t('actions.openMaps', { defaultValue: 'Route auf Google Maps öffnen' })}
               <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </a>
         </div>
      </div>
    );
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
       {renderReviewBlocks()}
       {renderAnalysisBlock()}
       {renderRouteBlock()}
    </div>
  );
};
// --- END OF FILE 290 Zeilen ---
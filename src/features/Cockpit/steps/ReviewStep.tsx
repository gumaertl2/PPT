// 06.02.2026 15:20 - FEAT: Display currentFileName in Review Step.
// 20.01.2026 21:10 - FIX: Robust resolveLabel and Safety Checks for missing data.
// src/features/Cockpit/steps/ReviewStep.tsx

import React from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, 
  Users, 
  Heart, 
  Calendar, 
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import type { LanguageCode } from '../../../core/types';
import { 
  STRATEGY_OPTIONS, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS,
  INTEREST_DATA
} from '../../../data/staticData';

interface ReviewStepProps {
  onEdit?: (stepIndex: number) => void;
}

export const ReviewStep = ({ onEdit }: ReviewStepProps) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project, uiState } = useTripStore(); // FIX: Added uiState access
  const { userInputs } = project;
  const { logistics, travelers, dates, selectedInterests, notes, customPreferences, pace, budget, vibe, strategyId, aiOutputLanguage } = userInputs;

  // --- HELPER: Label Resolution ---
  const resolveLabel = (item: any): string => {
    if (!item || !item.label) return '';
    if (typeof item.label === 'string') return item.label;
    return (item.label as any)[currentLang] || (item.label as any)['de'] || '';
  };

  const hasLogistics = logistics.mode === 'stationaer' ? !!logistics.stationary.region : !!logistics.roundtrip.region;
  const hasTravelers = travelers.adults > 0;
  const hasInterests = selectedInterests.length > 0;
  const validFixedEvents = dates.fixedEvents.filter(e => e.title?.trim() || e.date);

  const renderStatus = (isValid: boolean) => (
    isValid 
      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
      : <AlertCircle className="w-4 h-4 text-amber-500" />
  );

  const Section = ({ 
    stepIndex, 
    title,
    icon: Icon,
    isValid,
    children 
  }: { 
    stepIndex: number; 
    title: string;
    icon: any;
    isValid: boolean;
    children: React.ReactNode;
  }) => (
    <div 
      onClick={() => onEdit && onEdit(stepIndex)}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-400 hover:shadow-md transition-all h-full"
    >
      <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-2">
         <h3 className="text-sm font-bold text-slate-600 uppercase flex items-center gap-2">
           <Icon className="w-4 h-4 text-blue-500" /> {title}
         </h3>
         <div className="flex items-center gap-2">
           {renderStatus(isValid)}
           <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 text-blue-600 p-1 rounded">
              <ArrowUpRight className="w-3 h-3" />
           </div>
         </div>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );

  const InfoRow = ({ label, value, sub }: { label: string, value: React.ReactNode, sub?: string }) => (
    <div className="text-sm">
      <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</span>
      <div className="font-medium text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-2">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <strong>{t('review.ready_title')}</strong>
          <p className="text-xs mt-1 text-blue-700 opacity-80">
            {t('review.ready_text')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LOGISTICS */}
        <Section 
          stepIndex={0} 
          title={t('wizard.steps.logistics')} 
          icon={MapPin}
          isValid={hasLogistics}
        >
          <InfoRow 
            label={t('review.label_logistics')} 
            value={logistics.mode === 'stationaer' ? t('logistics.stationary') : t('logistics.roadtrip')} 
            sub={logistics.mode === 'stationaer' 
              ? `${logistics.stationary.region || '-'} ${logistics.stationary.destination ? `(${logistics.stationary.destination})` : ''}`
              : `${logistics.roundtrip.region || '-'} (${logistics.roundtrip.stops.length} ${t('cockpit.stops_label')})`
            }
          />
          <div className="pt-2 border-t border-slate-50">
            <InfoRow 
              label={t('review.label_dates')} 
              value={dates.flexible ? t('review.value_flexible') : t('review.value_fix')}
              sub={dates.flexible 
                ? `${t('cockpit.duration_label')}: ~${dates.duration}` 
                : `${dates.start || '?'} - ${dates.end || '?'}`
              } 
            />
          </div>
          {(dates.arrival.type || dates.arrival.time) && (
             <div className="flex gap-4 pt-2 border-t border-slate-50">
                <div className="flex-1">
                   <InfoRow label={t('review.label_arrival')} value={dates.arrival.time || '-'} />
                </div>
                <div className="flex-1">
                   <InfoRow label={t('review.label_departure')} value={dates.departure?.time || '-'} />
                </div>
             </div>
          )}
        </Section>

        {/* TRAVELERS */}
        <Section 
          stepIndex={1} 
          title={t('wizard.steps.travelers')} 
          icon={Users}
          isValid={hasTravelers}
        >
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
          <div className="pt-2 border-t border-slate-50">
             <InfoRow 
                label={t('review.label_strategy')} 
                value={<span className="text-blue-600">{resolveLabel(STRATEGY_OPTIONS[strategyId]) || strategyId}</span>} 
             />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
            <InfoRow label={t('profile.options_pace')} value={resolveLabel(PACE_OPTIONS[pace]) || pace} />
            <InfoRow label={t('profile.options_budget')} value={resolveLabel(BUDGET_OPTIONS[budget]) || budget} />
            <InfoRow label={t('profile.options_vibe')} value={resolveLabel(VIBE_OPTIONS[vibe]) || vibe} />
          </div>
        </Section>

        {/* INTERESTS */}
        <Section 
          stepIndex={2} 
          title={t('wizard.steps.interests')} 
          icon={Heart}
          isValid={hasInterests}
        >
          <InfoRow 
            label={t('review.label_interests')} 
            value={
              selectedInterests.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {selectedInterests.map(id => (
                    <span key={id} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md border border-slate-200">
                      {/* FIX: Safety check for undefined INTEREST_DATA */}
                      {INTEREST_DATA[id] ? resolveLabel(INTEREST_DATA[id]) : id}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">{t('review.value_no_interests')}</span>
              )
            } 
          />
        </Section>

        {/* DATES */}
        <Section 
          stepIndex={3} 
          title={t('wizard.steps.dates')} 
          icon={Calendar}
          isValid={true} 
        >
          <InfoRow 
            label={t('review.label_events')} 
            value={
              validFixedEvents.length > 0 ? (
                <ul className="space-y-2 mt-1">
                  {validFixedEvents.map((evt, idx) => {
                     const [d, tVal] = (evt.date || '').split('T');
                     return (
                      <li key={evt.id || idx} className="flex items-start gap-2 text-xs bg-slate-50 p-1.5 rounded border border-slate-100">
                        <div className="font-mono text-slate-500 whitespace-nowrap pt-0.5">
                           {d || '??'} {tVal && `| ${tVal}`}
                        </div>
                        <div className="font-bold text-slate-700">
                           {evt.title}
                           {evt.duration && <span className="font-normal text-slate-400 ml-1">({evt.duration})</span>}
                        </div>
                      </li>
                     );
                  })}
                </ul>
              ) : (
                <span className="text-slate-400 italic">{t('review.value_no_events')}</span>
              )
            } 
          />
        </Section>

        {/* MISC */}
        <div className="md:col-span-2">
          <Section 
            stepIndex={4} 
            title={t('wizard.steps.misc')} 
            icon={FileText}
            isValid={true}
          >
            {/* NEW: Show Filename if available */}
            {uiState.currentFileName && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                   <InfoRow 
                     label={t('review.label_filename', 'Dateiname')} 
                     value={uiState.currentFileName} 
                   />
                </div>
            )}
            
            <div className="mb-4 pb-4 border-b border-slate-100">
               <InfoRow 
                 label={t('misc.output_lang_label', 'Sprache für den KI-Reiseplan')} 
                 value={t(`misc.lang_${aiOutputLanguage || 'de'}`)}
               />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoRow 
                   label={t('review.label_notes')} 
                   value={notes || <span className="text-slate-400 italic">{t('review.value_none')}</span>} 
                />
                <InfoRow 
                   label={t('review.label_nogos')} 
                   value={customPreferences['noGos'] || <span className="text-slate-400 italic">{t('review.value_none')}</span>} 
                />
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
};
// --- END OF FILE 266 Zeilen ---
// src/features/cockpit/steps/ReviewStep.tsx - 07.01.2026 17:47
// UPDATE: Added AI Output Language display in Misc section

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
  
  // Store Access
  const { project } = useTripStore();
  const { userInputs } = project;
  const { logistics, travelers, dates, selectedInterests, notes, customPreferences, pace, budget, vibe, strategyId, aiOutputLanguage } = userInputs;

  // --- VALIDIERUNG ---
  const hasLogistics = logistics.mode === 'stationaer' ? !!logistics.stationary.region : !!logistics.roundtrip.region;
  const hasTravelers = travelers.adults > 0;
  const hasInterests = selectedInterests.length > 0;
  const validFixedEvents = dates.fixedEvents.filter(e => e.title?.trim() || e.date);

  const renderStatus = (isValid: boolean) => (
    isValid 
      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
      : <AlertCircle className="w-4 h-4 text-amber-500" />
  );

  // --- KACHEL WRAPPER ---
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
           {/* Edit Hint Icon */}
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

  // --- HELPER FÜR LIST ITEMS ---
  const InfoRow = ({ label, value, sub }: { label: string, value: React.ReactNode, sub?: string }) => (
    <div className="text-sm">
      <span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">{label}</span>
      <div className="font-medium text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Intro Box */}
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
        
        {/* =========================================================
            SCHRITT 1: COCKPIT (Logistik & Zeitraum)
           ========================================================= */}
        <Section 
          stepIndex={0} 
          title={t('wizard.steps.logistics')} 
          icon={MapPin}
          isValid={hasLogistics}
        >
          {/* Logistik */}
          <InfoRow 
            label={t('review.label_logistics')} 
            value={logistics.mode === 'stationaer' ? t('logistics.stationary') : t('logistics.roadtrip')} 
            sub={logistics.mode === 'stationaer' 
              ? `${logistics.stationary.region || '-'} ${logistics.stationary.destination ? `(${logistics.stationary.destination})` : ''}`
              : `${logistics.roundtrip.region || '-'} (${logistics.roundtrip.stops.length} ${t('cockpit.stops_label')})`
            }
          />
          
          {/* Zeitraum (gehört logisch zu Schritt 1) */}
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

          {/* Ankunft/Abreise */}
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


        {/* =========================================================
            SCHRITT 2: WER & WIE
           ========================================================= */}
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

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
             <InfoRow 
                label={t('profile.group_title')} 
                value={t(`profile.group_${travelers.groupType || 'other'}`)} 
             />
             <InfoRow 
                label={t('profile.pets_title')} 
                value={travelers.pets ? t('profile.pets_yes') : t('profile.pets_no')} 
             />
          </div>

          <div className="pt-2 border-t border-slate-50">
             <InfoRow 
                label={t('review.label_strategy')} 
                value={<span className="text-blue-600">{STRATEGY_OPTIONS[strategyId]?.label[currentLang] || strategyId}</span>} 
             />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
            <InfoRow label={t('profile.options_pace')} value={PACE_OPTIONS[pace]?.label[currentLang]} />
            <InfoRow label={t('profile.options_budget')} value={BUDGET_OPTIONS[budget]?.label[currentLang]} />
            <InfoRow label={t('profile.options_vibe')} value={VIBE_OPTIONS[vibe]?.label[currentLang]} />
          </div>
        </Section>


        {/* =========================================================
            SCHRITT 3: INTERESSEN
           ========================================================= */}
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
                      {INTEREST_DATA[id]?.label[currentLang] || id}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">{t('review.value_no_interests')}</span>
              )
            } 
          />
        </Section>


        {/* =========================================================
            SCHRITT 4: TERMINE (Feste Termine)
           ========================================================= */}
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


        {/* =========================================================
            SCHRITT 5: SONSTIGES
           ========================================================= */}
        <div className="md:col-span-2">
          <Section 
            stepIndex={4} 
            title={t('wizard.steps.misc')} 
            icon={FileText}
            isValid={true}
          >
            {/* NEU: Anzeige der gewählten KI-Sprache */}
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
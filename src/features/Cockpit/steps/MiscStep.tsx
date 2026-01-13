// src/features/cockpit/steps/MiscStep.tsx - 07.01.2026 17:45
// UPDATE: AI Output Language moved to top position

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../../store/useTripStore';
import { FileText, AlertOctagon, Info, Globe } from 'lucide-react';

interface MiscStepProps {
  onEdit?: (stepIndex: number) => void;
}

export const MiscStep: React.FC<MiscStepProps> = () => {
  const { t } = useTranslation();
  const { project, setNotes, setCustomPreference, setAiOutputLanguage } = useTripStore();
  const { notes, customPreferences, aiOutputLanguage } = project.userInputs;

  const noGos = customPreferences['noGos'] || '';

  const languages = [
    { code: 'de', label: t('misc.lang_de') },
    { code: 'en', label: t('misc.lang_en') },
    { code: 'es', label: t('misc.lang_es') },
    { code: 'fr', label: t('misc.lang_fr') },
    { code: 'it', label: t('misc.lang_it') },
    { code: 'pt', label: t('misc.lang_pt') },
    { code: 'nl', label: t('misc.lang_nl') },
    { code: 'pl', label: t('misc.lang_pl') },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. SPRACH-AUSWAHL (JETZT OBEN) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          {t('misc.output_lang_label', 'Sprache für den KI-Reiseplan')}
        </h3>
        
        <div className="max-w-md">
          <select
            value={aiOutputLanguage || 'de'}
            onChange={(e) => setAiOutputLanguage(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
             <Info className="w-4 h-4 text-indigo-400 mt-0.5" />
             <p>{t('misc.output_lang_hint', 'In welcher Sprache soll der Plan erstellt werden?')}</p>
          </div>
        </div>
      </div>

      {/* 2. NOTIZEN */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          {t('misc.notes_label')}
        </h3>
        
        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('misc.notes_placeholder')}
            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
          <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
             <Info className="w-4 h-4 text-blue-400 mt-0.5" />
             <p>{t('misc.notes_hint')}</p>
          </div>
        </div>
      </div>

      {/* 3. NO-GOS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          {t('misc.nogos_label')}
        </h3>
        
        <div className="relative">
          <textarea
            value={noGos}
            onChange={(e) => setCustomPreference('noGos', e.target.value)}
            placeholder={t('misc.nogos_placeholder')}
            className="w-full h-24 p-4 bg-red-50/30 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none placeholder-red-300 text-slate-700"
          />
           <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
             <Info className="w-4 h-4 text-red-400 mt-0.5" />
             <p>{t('misc.nogos_hint')}</p>
          </div>
        </div>
      </div>

    </div>
  );
};
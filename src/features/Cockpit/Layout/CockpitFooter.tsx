// src/features/cockpit/Layout/CockpitFooter.tsx
// 10.01.2026 21:00
// FIX: Updated status type to match new Hook ('waiting_for_user'). Preserved Language Switcher & Full Logic.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, AlertCircle, X, Globe } from 'lucide-react';
import { useTripStore } from '../../../store/useTripStore';
import type { LanguageCode } from '../../../core/types';

interface CockpitFooterProps {
  // FIX: Updated type to match useTripGeneration hook
  status: 'idle' | 'generating' | 'success' | 'error' | 'waiting_for_user' | 'paused';
  error: string | null;
  onResetStatus: () => void;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onAnalyze: () => void;
}

export const CockpitFooter: React.FC<CockpitFooterProps> = ({
  status,
  error,
  onResetStatus,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onAnalyze
}) => {
  const { t, i18n } = useTranslation();
  const { setLanguage, project } = useTripStore();
  
  const isReviewStep = currentStep === totalSteps - 1;

  // Sprach-Umschalter Logik
  const toggleLanguage = () => {
    const current = project.meta.language;
    const next: LanguageCode = current === 'de' ? 'en' : 'de';
    
    // 1. i18next (UI)
    i18n.changeLanguage(next);
    // 2. Store (Projekt-Daten)
    setLanguage(next);
  };

  const currentLangLabel = project.meta.language.toUpperCase();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-4xl mx-auto flex flex-col gap-2">

        {/* --- FEHLERANZEIGE (Banner) --- */}
        {status === 'error' && error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">
                {error.includes("401") 
                    ? "API Key ungültig oder fehlt. Bitte in den Einstellungen prüfen." 
                    : error}
            </div>
            <button onClick={onResetStatus} className="p-1 hover:bg-red-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center">
            {/* BACK BUTTON */}
            <button 
                onClick={onBack}
                disabled={currentStep === 0 || status === 'generating'}
                className="px-4 md:px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-50"
            >
                <ChevronLeft className="w-4 h-4" /> 
                <span className="hidden md:inline">{t('actions.back')}</span>
            </button>

            {/* LANGUAGE SWITCHER (CENTERED) */}
            <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600 transition-all text-xs font-bold tracking-wide"
                title="Sprache wechseln / Change Language"
            >
                <Globe className="w-3.5 h-3.5" />
                {currentLangLabel}
            </button>

            {/* NEXT / ANALYZE BUTTON */}
            {isReviewStep ? (
            <button 
                onClick={onAnalyze}
                disabled={status === 'generating'}
                className="px-6 md:px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
            >
                {status === 'generating' ? (
                <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span className="hidden md:inline">{t('actions.analyzing', 'Analysiere...')}</span>
                </>
                ) : (
                <>
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden md:inline">{t('actions.analyze_inputs', 'Eingaben analysieren')}</span>
                    <span className="md:hidden">Analyse</span>
                </>
                )}
            </button>
            ) : (
            <button 
                onClick={onNext}
                className="px-6 md:px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5"
            >
                <span className="hidden md:inline">{t('actions.next')}</span> 
                <span className="md:hidden">Weiter</span>
                <ChevronRight className="w-4 h-4" />
            </button>
            )}
        </div>
      </div>
    </div>
  );
};
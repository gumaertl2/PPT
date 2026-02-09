// 09.02.2026 12:55 - FIX: Added 'overrideDetailLevel' to support Print Settings (Strict User Base).
// 06.02.2026 18:40 - FIX: Added Safety Check for 'config' to prevent Runtime Crash.
// 06.02.2026 18:05 - FIX: Reverted BriefingView import to Named Import.
// src/features/Cockpit/PrintReport.tsx

import React from 'react';
import { useTripStore } from '../../store/useTripStore';
// FIX: Named import ensures compatibility
import { BriefingView } from './BriefingView'; 
import { AnalysisReviewView } from './AnalysisReviewView';
import { RouteReviewView } from './RouteReviewView';
import { SightsView } from './SightsView';
import { InfoView } from '../info/InfoView';
import type { PrintConfig } from '../../core/types';
import { useTranslation } from 'react-i18next';

interface PrintReportProps {
  config: PrintConfig;
}

export const PrintReport: React.FC<PrintReportProps> = ({ config }) => {
  const { t } = useTranslation();
  const { project, uiState } = useTripStore();
  const { logistics } = project.userInputs;

  // SAFETY GUARD: Prevent crash if config is missing (Fixes TypeError: config is undefined)
  if (!config) return null;

  // Helper für saubere Seitenumbrüche
  const PageBreak = () => <div className="break-before-page" style={{ pageBreakBefore: 'always' }} />;

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="border-b-2 border-slate-800 mb-6 pb-2 mt-8 print:break-after-avoid">
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">{title}</h2>
    </div>
  );

  return (
    <div className="print-report font-sans text-slate-900 bg-white max-w-[210mm] mx-auto">
      
      {/* 1. HEADER (Immer sichtbar auf Seite 1) */}
      <div className="mb-12 text-center border-b border-slate-200 pb-8">
         <h1 className="text-4xl font-black text-slate-900 mb-2">{project.meta.name}</h1>
         <p className="text-slate-500 uppercase tracking-widest text-sm">
            {new Date().toLocaleDateString()} • Papatours V40
         </p>
         {/* Show Filename if available */}
         {uiState.currentFileName && (
             <p className="text-xs text-slate-400 mt-1 font-mono">
                Datei: {uiState.currentFileName}
             </p>
         )}
      </div>

      {/* 2. SECTIONS BASED ON CONFIG */}

      {/* A) BRIEFING & STRATEGIE (Schritt 6 Start) */}
      {config.sections.briefing && (
        <section className="print-section mb-8">
           <SectionHeader title={t('print.section_briefing', { defaultValue: 'Briefing & Strategie' })} />
           <BriefingView />
        </section>
      )}

      {/* B) FUNDAMENT & ANALYSE (+ ROUTE) */}
      {config.sections.analysis && (
        <>
          {(config.sections.briefing) && <PageBreak />}
          <section className="print-section">
             <SectionHeader title={t('print.section_analysis', { defaultValue: 'Fundament & Analyse' })} />
             <AnalysisReviewView />
             
             {/* Rundreise-Route (falls vorhanden) */}
             {logistics.mode === 'roundtrip' && (
                <div className="mt-8 pt-8 border-t border-slate-200 break-inside-avoid">
                   <h3 className="text-xl font-bold mb-4 uppercase">Routen-Verlauf</h3>
                   <RouteReviewView />
                </div>
             )}
          </section>
        </>
      )}

      {/* C) REISEFÜHRER: TOUREN (Tagesplanung) */}
      {config.sections.tours && (
        <>
           {(config.sections.briefing || config.sections.analysis) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_tours', { defaultValue: 'Reiseführer: Touren & Ablauf' })} />
              {/* Force SightsView into Tour Sort Mode & Apply Detail Level */}
              <SightsView 
                  overrideSortMode="tour" 
                  overrideDetailLevel={config.detailLevel} 
              />
           </section>
        </>
      )}

      {/* D) REISEFÜHRER: KATEGORIEN (Alle Orte) */}
      {config.sections.categories && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.tours) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_categories', { defaultValue: 'Reiseführer: Kategorien' })} />
              {/* Force SightsView into Category Sort Mode & Apply Detail Level */}
              <SightsView 
                  overrideSortMode="category" 
                  overrideDetailLevel={config.detailLevel} 
              />
           </section>
        </>
      )}

      {/* E) REISE-INFOS (A-Z, Anhang) */}
      {config.sections.infos && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.tours || config.sections.categories) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_infos', { defaultValue: 'Reise-Informationen (A-Z)' })} />
              <InfoView />
           </section>
        </>
      )}

      {/* FOOTER */}
      <div className="mt-16 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
         Generiert mit Papatours AI • {project.meta.id}
      </div>

    </div>
  );
};
// --- END OF FILE 130 Zeilen ---
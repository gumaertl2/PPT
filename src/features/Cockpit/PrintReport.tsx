// 20.02.2026 17:30 - FEAT: Added 'DiaryPrintView' to render the personal travel diary chronologically.
// 20.02.2026 10:25 - FIX: Restored missing comments and applied exact I18N keys.
// src/features/Cockpit/PrintReport.tsx

import React from 'react';
import { useTripStore } from '../../store/useTripStore';
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
  const { t, i18n } = useTranslation();
  const { project, uiState } = useTripStore();
  const { logistics } = project.userInputs;

  if (!config) return null;

  const PageBreak = () => <div className="break-before-page" style={{ pageBreakBefore: 'always' }} />;

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="border-b-2 border-slate-800 mb-6 pb-2 mt-8 print:break-after-avoid">
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">{title}</h2>
    </div>
  );

  // NEW: Print-Optimized Version of the Diary
  const DiaryPrintView = () => {
      const visitedPlaces = Object.values(project.data?.places || {})
          .filter((p: any) => p.visited && p.visitedAt)
          .sort((a: any, b: any) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());

      if (visitedPlaces.length === 0) return <p className="text-slate-500 italic mt-4">{t('print.no_diary_entries', { defaultValue: 'Noch keine Einträge im Tagebuch vorhanden.' })}</p>;

      const currentLang = i18n.language.substring(0, 2);

      return (
          <div className="space-y-6 mt-4">
              {visitedPlaces.map((place: any) => {
                  const dateObj = new Date(place.visitedAt);
                  const dateStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', {
                      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
                  }).format(dateObj);
                  const timeStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', {
                      hour: '2-digit', minute: '2-digit'
                  }).format(dateObj);

                  const isCustomEntry = place.category === 'custom_diary';
                  
                  return (
                      <div key={place.id} className="border-l-4 border-emerald-500 pl-4 py-1 print:break-inside-avoid">
                          <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-slate-900 text-lg leading-tight">{place.name}</h4>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded shrink-0 ml-4">
                                  {dateStr}, {timeStr}
                              </span>
                          </div>
                          {!isCustomEntry && (
                              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">
                                  {place.category}
                              </div>
                          )}
                          {place.userNote && (
                              <div className="mt-2 text-sm text-slate-700 italic border-l-2 border-slate-200 pl-3 py-1 leading-relaxed">
                                  {place.userNote.split('\n').map((line: string, i: number) => (
                                      <React.Fragment key={i}>
                                          {line}<br/>
                                      </React.Fragment>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      );
  };

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

      {/* A) BRIEFING & STRATEGIE */}
      {config.sections.briefing && (
        <section className="print-section mb-8">
           <SectionHeader title={t('print.sections.briefing', { defaultValue: 'Briefing & Strategie' })} />
           <BriefingView />
        </section>
      )}

      {/* B) FUNDAMENT & ANALYSE (+ ROUTE) */}
      {config.sections.analysis && (
        <>
          {(config.sections.briefing) && <PageBreak />}
          <section className="print-section">
             <SectionHeader title={t('print.sections.analysis', { defaultValue: 'Fundament & Analyse' })} />
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

      {/* C) REISEFÜHRER: TAGESPLAN */}
      {config.sections.days && (
        <>
           {(config.sections.briefing || config.sections.analysis) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_days', { defaultValue: 'Reiseführer: Tage (Chronologisch)' })} />
              {/* Force SightsView into Day Sort Mode & Apply Detail Level */}
              <SightsView 
                  overrideSortMode="day" 
                  overrideDetailLevel={config.detailLevel} 
              />
           </section>
        </>
      )}

      {/* D) REISEFÜHRER: TOUREN */}
      {config.sections.tours && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.tours', { defaultValue: 'Reiseführer (Touren)' })} />
              {/* Force SightsView into Tour Sort Mode & Apply Detail Level */}
              <SightsView 
                  overrideSortMode="tour" 
                  overrideDetailLevel={config.detailLevel} 
              />
           </section>
        </>
      )}

      {/* E) REISEFÜHRER: KATEGORIEN (Alle Orte) */}
      {config.sections.categories && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days || config.sections.tours) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.categories', { defaultValue: 'Reiseführer (Kategorien)' })} />
              {/* Force SightsView into Category Sort Mode & Apply Detail Level */}
              <SightsView 
                  overrideSortMode="category" 
                  overrideDetailLevel={config.detailLevel} 
              />
           </section>
        </>
      )}

      {/* F) REISE-INFOS (A-Z, Anhang) */}
      {config.sections.infos && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days || config.sections.tours || config.sections.categories) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.infos', { defaultValue: 'Reise-Infos A-Z' })} />
              <InfoView />
           </section>
        </>
      )}

      {/* G) REISETAGEBUCH (Chronik) */}
      {config.sections.diary && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days || config.sections.tours || config.sections.categories || config.sections.infos) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_diary', { defaultValue: 'Mein Reisetagebuch' })} />
              <DiaryPrintView />
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
// --- END OF FILE 207 Zeilen ---
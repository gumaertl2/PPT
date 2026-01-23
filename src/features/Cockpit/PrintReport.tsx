/* 23.01.2026 18:30 - FIX: Resolved TS6133 (Unused variable detailLevel). */
/* src/features/Cockpit/PrintReport.tsx */

import React from 'react';
import { useTripStore } from '../../store/useTripStore';
import BriefingView from './BriefingView';
import { AnalysisReviewView } from './AnalysisReviewView';
import { SightsView } from './SightsView';
import { InfoView } from '../info/InfoView';

const PrintReport: React.FC = () => {
  const { uiState, project } = useTripStore();
  // FIX: Removed unused detailLevel from destructuring to resolve TS6133
  const { isPrintMode, printConfig } = uiState; 

  // Nur rendern, wenn der Druckmodus aktiv ist
  if (!isPrintMode || !printConfig) return null;

  const { sections } = printConfig;

  return (
    <div className={`print-only print-container detail-${printConfig.detailLevel} w-full bg-white text-slate-900 p-8`}>
      
      {/* Titel des Berichts */}
      <div className="mb-12 border-b-4 border-slate-900 pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">
          {project.meta.name || 'Reisebericht'}
        </h1>
        <p className="text-sm text-slate-500 font-bold mt-2">
          Erstellt mit Papatours am {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* 1. Briefing & Strategie */}
      {sections.briefing && (
        <section className="print-section mb-12">
          <div className="mb-6 border-b-2 border-slate-200 pb-2">
            <h2 className="text-2xl font-bold uppercase text-blue-900">Briefing & Strategie</h2>
          </div>
          <BriefingView />
        </section>
      )}

      {/* 2. Fundament & Analyse */}
      {sections.analysis && project.analysis.chefPlaner && (
        <section className="print-section mb-12">
          <div className="mb-6 border-b-2 border-slate-200 pb-2">
            <h2 className="text-2xl font-bold uppercase text-blue-900">Fundament & Analyse</h2>
          </div>
          <AnalysisReviewView onNext={() => {}} />
        </section>
      )}

      {/* 3. Reiseführer (Orte/Kategorien) */}
      {sections.categories && (
        <section className="print-section mb-12">
          <div className="mb-6 border-b-2 border-slate-200 pb-2">
            <h2 className="text-2xl font-bold uppercase">Reiseführer: Orte & Sehenswürdigkeiten</h2>
          </div>
          <SightsView />
        </section>
      )}

      {/* 4. Reise-Infos A-Z */}
      {sections.infos && project.analysis.infoAutor && (
        <section className="print-section mb-12">
          <div className="mb-6 border-b-2 border-slate-200 pb-2">
            <h2 className="text-2xl font-bold uppercase">Reise-Infos (A-Z)</h2>
          </div>
          <InfoView />
        </section>
      )}

      {/* Footer für jede Seite (via CSS geregelt) */}
      <div className="fixed bottom-0 left-0 right-0 hidden print:block text-[10px] text-slate-400 text-center pt-4 border-t border-slate-100">
        Seite 1 von 1 — {project.meta.name} — Papatours Reiseplaner
      </div>

    </div>
  );
};

export default PrintReport;

// --- END OF FILE 80 Zeilen ---
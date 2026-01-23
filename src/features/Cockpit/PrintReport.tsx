// 23.01.2026 15:25 - NEW: PrintReport component to aggregate selected sections for multi-page printing.
// src/features/Cockpit/PrintReport.tsx

import React from 'react';
import { useTripStore } from '../../store/useTripStore';
import BriefingView from './BriefingView';
import { AnalysisReviewView } from './AnalysisReviewView';
import { SightsView } from './SightsView';
import { InfoView } from '../info/InfoView';

const PrintReport: React.FC = () => {
  const { isPrintMode, printConfig, project } = useTripStore();

  // Sicherheits-Check: Nur rendern, wenn Druckmodus aktiv und Konfiguration vorhanden
  if (!isPrintMode || !printConfig) return null;

  const { detailLevel, sections } = printConfig;

  return (
    <div className={`print-only print-container print-${detailLevel} w-full bg-white text-slate-900`}>
      
      {/* 1. Briefing & Strategie */}
      {sections.briefing && (
        <section className="print-section">
          <BriefingView />
        </section>
      )}

      {/* 2. Fundament & Analyse */}
      {sections.analysis && project.analysis.chefPlaner && (
        <section className="print-section">
          <AnalysisReviewView />
        </section>
      )}

      {/* 3. Reiseführer (Kategorien / Sights) */}
      {sections.categories && (
        <section className="print-section">
          <div className="mb-6 border-b-2 border-slate-900 pb-2">
            <h2 className="text-2xl font-bold uppercase">Reiseführer: Orte & Sehenswürdigkeiten</h2>
          </div>
          <SightsView />
        </section>
      )}

      {/* 4. Reise-Infos A-Z */}
      {sections.infos && project.analysis.infoAutor && (
        <section className="print-section">
          <div className="mb-6 border-b-2 border-slate-900 pb-2 page-break-before">
            <h2 className="text-2xl font-bold uppercase">Wichtige Reise-Infos (A-Z)</h2>
          </div>
          <InfoView />
        </section>
      )}

      {/* Platzhalter für Reiseführer (Touren / Tage) */}
      {sections.tours && (
        <section className="print-section italic text-slate-400 p-8 border border-dashed border-slate-200 text-center">
          Die Sektion 'Reiseführer (Touren/Tage)' wird in Kürze integriert.
        </section>
      )}

    </div>
  );
};

export default PrintReport;

// --- END OF FILE 68 Zeilen ---
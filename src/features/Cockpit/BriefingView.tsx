// 06.02.2026 18:00 - FIX: Switched to Named Export to resolve 'star export' syntax error.
// 23.01.2026 12:20 - NEW: BriefingView combining User Inputs and AI Strategy for Report/Print.
// src/features/Cockpit/BriefingView.tsx

import React from 'react';
import { 
  ClipboardCheck, 
  Users, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  Target,
  Compass
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';

// FIX: Changed to Named Export
export const BriefingView: React.FC = () => {
  useTranslation(); // Hook call kept for consistency, though 't' is currently unused in this static view
  const { project } = useTripStore();
  const { userInputs, analysis } = project;
  const chefPlaner = analysis.chefPlaner;

  if (!chefPlaner) return null;

  return (
    <div className="space-y-8 pb-12 print:pb-0 animate-in fade-in duration-500">
      {/* 1. HEADER: Reise-Zusammenfassung */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4 print:border-slate-200">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl print:bg-slate-100 print:text-slate-900">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">1. Reise-Briefing & Strategie</h2>
            <p className="text-sm text-slate-500">Zusammenfassung der Planungsgrundlagen</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Rahmendaten */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Zeit & Ort
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Zeitraum:</span>
                <span className="font-semibold text-slate-700">{userInputs.dates.start} - {userInputs.dates.end}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Region:</span>
                <span className="font-semibold text-slate-700">
                  {userInputs.logistics.mode === 'stationaer' 
                    ? userInputs.logistics.stationary.region 
                    : userInputs.logistics.roundtrip.region}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Modus:</span>
                <span className="font-semibold text-slate-700 capitalize">{userInputs.logistics.mode}</span>
              </div>
            </div>
          </div>

          {/* Reisegruppe */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> Reisegruppe
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Teilnehmer:</span>
                <span className="font-semibold text-slate-700">
                  {userInputs.travelers.adults} Erw.
                  {userInputs.travelers.children > 0 && `, ${userInputs.travelers.children} Kinder`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Nationalität:</span>
                <span className="font-semibold text-slate-700">{userInputs.travelers.nationality}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Haustiere:</span>
                <span className="font-semibold text-slate-700">{userInputs.travelers.pets ? 'Ja' : 'Nein'}</span>
              </div>
            </div>
          </div>

          {/* Vibe & Fokus */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} /> Vibe & Fokus
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pace:</span>
                <span className="font-semibold text-slate-700 capitalize">{userInputs.pace}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Budget:</span>
                <span className="font-semibold text-slate-700 capitalize">{userInputs.budget}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Interessen:</span>
                <span className="font-semibold text-slate-700 text-right truncate max-w-[120px]" title={userInputs.selectedInterests.join(', ')}>
                  {userInputs.selectedInterests.length} gewählt
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KI ANALYSE: Strategische Ergebnisse */}
      <section className="bg-slate-50 rounded-3xl p-6 border border-slate-100 print:bg-white print:border-slate-200 print:p-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl print:bg-slate-100 print:text-slate-900">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Strategische Analyse</h2>
            <p className="text-sm text-slate-500">KI-Auswertung & Optimierungsvorschläge</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plausibilität & Korrekturen */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 print:border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Plausibilitäts-Check
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{chefPlaner.plausibility_check || 'Die Reiseplanung ist plausibel und konsistent.'}"
              </p>
            </div>

            {chefPlaner.corrections.notes && chefPlaner.corrections.notes.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/50 print:border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" /> Korrektur-Hinweise
                </h4>
                <ul className="space-y-2">
                  {chefPlaner.corrections.notes.map((note, idx) => (
                    <li key={idx} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-amber-400">•</span> {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sammler-Briefing */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/50 print:border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Compass size={16} className="text-indigo-500" /> Strategisches Briefing
            </h4>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sammler-Fokus</span>
                <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                  {chefPlaner.strategic_briefing.sammler_briefing}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Such-Radius</span>
                <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                  {chefPlaner.strategic_briefing.search_radius_instruction}
                </p>
              </div>
              {chefPlaner.smart_limit_recommendation && (
                <div className="pt-3 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Smart Limit Empfehlung</span>
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="font-bold">{chefPlaner.smart_limit_recommendation.value} Orte</span> — {chefPlaner.smart_limit_recommendation.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
// --- END OF FILE 168 Zeilen ---
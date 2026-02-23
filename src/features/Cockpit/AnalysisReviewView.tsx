// 23.02.2026 11:15 - FIX: Swapped Priority in suggestionCount so User-Overrides survive component remounts.
// 06.02.2026 18:25 - FIX: Made 'onNext' optional for PrintReport compatibility (TS2741).
// 26.01.2026 10:45 - FIX: Sync Suggestion Count to SearchSettings.
// src/features/Cockpit/AnalysisReviewView.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Lightbulb, 
  Hotel,
  ArrowRight,
  Map as MapIcon,
  Calendar,
  Wand2
} from 'lucide-react';

import { useTripStore } from '../../store/useTripStore';
import { useTripGeneration } from '../../hooks/useTripGeneration';

interface AnalysisReviewViewProps {
  onNext?: () => void; // FIX: Optional for Print Mode
}

export const AnalysisReviewView: React.FC<AnalysisReviewViewProps> = ({ onNext }) => {
  const { t } = useTranslation();
  
  // Store Access
  const { project, setWorkflowModalOpen, updateSearchSettings } = useTripStore();
  const { startSingleTask, status } = useTripGeneration(); 
  
  const analysis = project.analysis.chefPlaner;
  
  // Lokaler State für Inputs
  const [feedback, setFeedback] = useState('');
  
  // INTELLIGENTE INITIALISIERUNG DES COUNTS
  const [suggestionCount, setSuggestionCount] = useState<number>(() => {
    // 1. Priority: Bereits gespeichertes Setting (SSOT - User Änderung oder vorheriger Sync)
    if (project.userInputs?.searchSettings?.sightsCount) {
        return project.userInputs.searchSettings.sightsCount;
    }
    // 2. Priority: Smart Recommendation from ChefPlaner (Greift nur beim allerersten Laden)
    if (project.analysis.chefPlaner?.smart_limit_recommendation?.value) {
      return project.analysis.chefPlaner.smart_limit_recommendation.value;
    }
    // 3. Fallback: Default
    return 50;
  });

  // FIX: Write directly to searchSettings so 'prepareBasisPayload' can read it
  useEffect(() => {
    updateSearchSettings({ sightsCount: suggestionCount });
  }, [suggestionCount, updateSearchSettings]);

  const handleReRun = async () => {
    if (!feedback.trim()) return;
    await startSingleTask('chefPlaner', feedback);
  };

  const isMobil = project.userInputs.logistics.mode === 'mobil';

  // Fallback: Wenn gar keine Analyse da ist
  if (!analysis) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800">{t('analysis.errorTitle')}</h3>
        <p className="text-red-700">{t('analysis.errorDesc')}</p>
        <button 
          onClick={() => startSingleTask('chefPlaner')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {t('analysis.retry')}
        </button>
      </div>
    );
  }

  const hasCorrections = analysis.corrections && (
      (analysis.corrections.notes && analysis.corrections.notes.length > 0) || 
      analysis.corrections.corrected_destination
  );

  return (
    <div className="space-y-6 animate-fade-in text-gray-800 pb-12">

      {/* 0. AUTOMATISCHE KORREKTUREN */}
      {hasCorrections && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-1 shrink-0" />
            <div>
              <h3 className="font-bold text-green-900 text-sm">
                {t('analysis.correctionsTitle')}
              </h3>
              <ul className="mt-1 space-y-0.5 text-sm text-green-800 list-disc list-inside">
                {analysis.corrections?.notes?.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 1. PLAUSIBILITÄTS-CHECK */}
      <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
          <CheckCircle className="w-4 h-4 text-blue-500" />
          {t('analysis.plausibility')}
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          {analysis.plausibility_check || t('analysis.noCheck')}
        </p>
        
        {analysis.strategic_briefing && (
          <div className="pt-4 border-t border-gray-100">
             <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
               <Lightbulb className="w-3 h-3" />
               {t('analysis.briefing')}
             </h4>
             <p className="text-sm text-gray-600 italic mb-2">
              "{analysis.strategic_briefing?.sammler_briefing}"
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded inline-block">
              <strong>{t('analysis.radius')}:</strong> {analysis.strategic_briefing?.search_radius_instruction}
            </div>
          </div>
        )}
      </div>

      {/* 2. VALIDIERTE HOTELS */}
      {analysis.validated_hotels && analysis.validated_hotels.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-800 uppercase flex items-center gap-2">
            <Hotel className="w-4 h-4" />
            {t('analysis.hotelsTitle')}
          </div>
          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-gray-100">
              {analysis.validated_hotels.map((hotel, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="p-3 font-medium text-gray-900 w-1/3">{hotel.station}</td>
                  <td className="p-3 text-gray-800">{hotel.official_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. VALIDIERTE TERMINE */}
      {analysis.validated_appointments && analysis.validated_appointments.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t('analysis.appointmentsTitle')}
          </div>
          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-gray-100">
              {analysis.validated_appointments.map((appt, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="p-3 text-gray-500 w-1/4">{appt.original_input}</td>
                  <td className="p-3 font-medium text-gray-900">{appt.official_name}</td>
                  <td className="p-3 text-right text-gray-500 whitespace-nowrap">{appt.estimated_duration_min} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. FEEDBACK LOOP */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg">
        <label className="block text-sm font-bold text-slate-700 mb-3">
          {t('analysis.feedbackLabel')}
        </label>
        <div className="flex gap-4 items-start">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('analysis.feedbackPlaceholder')}
            className="flex-1 h-20 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-3"
          />
          <button
            onClick={handleReRun}
            disabled={!feedback.trim() || status === 'generating'}
            className="shrink-0 flex flex-col items-center justify-center gap-1 w-24 h-20 bg-white border border-indigo-200 text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs text-center p-1"
          >
            <RefreshCw className={`w-5 h-5 ${status === 'generating' ? 'animate-spin' : ''}`} />
            {t('analysis.retry')}
          </button>
        </div>
      </div>

      {/* 5. ANZAHL VORSCHLÄGE */}
      <div className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-800 mb-1">
             {t('analysis.countLabel')}
          </label>
          {analysis.smart_limit_recommendation?.value ? (
             <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">
               <strong>{t('analysis.smartLimit')}: {analysis.smart_limit_recommendation.value}</strong>
               <span className="block opacity-90 mt-0.5">{analysis.smart_limit_recommendation?.reasoning}</span>
             </div>
          ) : (
            <span className="text-xs text-gray-500">
               Wählen Sie die Anzahl der gewünschten Aktivitäten.
            </span>
          )}
        </div>
        <div>
           <input 
            type="number"
            min={5}
            max={100}
            value={suggestionCount}
            onChange={(e) => setSuggestionCount(parseInt(e.target.value, 10))}
            className="w-24 text-center rounded-lg border-2 border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xl font-bold p-2 text-indigo-600"
          />
        </div>
      </div>

      {/* 6. ACTION BUTTON */}
      <div className="pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={(e) => {
             e.preventDefault(); 
             // FIX: Safety check for optional prop
             if (isMobil && onNext) {
                 onNext();
             } else if (!isMobil) {
                 setWorkflowModalOpen(true);
             }
          }}
          className={`w-full group flex items-center justify-center gap-3 p-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition transform ${
             isMobil 
               ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white' 
               : 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white'
          }`}
        >
          {isMobil ? (
             <MapIcon className="w-6 h-6 text-blue-100" />
          ) : (
             <Wand2 className="w-6 h-6 text-purple-200" />
          )}
          
          <div className="text-left">
            <span className="block text-lg font-bold">
               {isMobil ? t('analysis.btnRoutePlanner') : t('analysis.btnAiWorkflows')}
            </span>
          </div>
          
          <ArrowRight className="w-5 h-5 ml-2 text-white/80 group-hover:translate-x-1 transition" />
        </button>
      </div>

    </div>
  );
};
// --- END OF FILE 205 Zeilen ---
// 19.01.2026 16:35 - FIX: Added Fallback to Travelers Origin for Map Start Location (V30 Parity).
// src/features/Cockpit/RouteReviewView.tsx
// 15.01.2026 17:50 - FEATURE: V30-Style Route Selection View with Keep & Regenerate Logic.
// 15.01.2026 18:15 - UPDATE: Integrated ItineraryModal for night distribution (V30 Parity).
// 16.01.2026 01:15 - FIX: Removed Header, Full-Width Feedback, Added i18n.
// 16.01.2026 03:25 - FIX: Removed unused import (Map) to resolve build errors.
// 18.01.2026 18:15 - FIX: Auto-Select active route from Store on mount.
// 19.01.2026 18:00 - FIX: Deduplicated route stops (Timeline -> Stations). Fixes Map Link & Itinerary Modal.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  Navigation, 
  RefreshCw, 
  Check, 
  Lock, 
  ExternalLink,
  Info 
} from 'lucide-react'; 

import { useTripStore } from '../../store/useTripStore';
import { useTripGeneration } from '../../hooks/useTripGeneration';
import { generateGoogleMapsRouteUrl } from './utils';
import { ItineraryModal } from './ItineraryModal'; 

interface RouteReviewViewProps {
  onNext?: () => void;
}

// --- HELPER: Deduplizieren von aufeinanderfolgenden Orten ---
// Wandelt ["A", "A", "B", "A"] in [{name: "A", count: 2}, {name: "B", count: 1}, {name: "A", count: 1}]
const condenseLocations = (locs: string[]): { name: string; count: number }[] => {
  const result: { name: string; count: number }[] = [];
  locs.forEach(loc => {
    if (result.length === 0 || result[result.length - 1].name !== loc) {
      result.push({ name: loc, count: 1 });
    } else {
      result[result.length - 1].count++;
    }
  });
  return result;
};

export const RouteReviewView: React.FC<RouteReviewViewProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const { project, updateLogistics, addNotification } = useTripStore();
  const { startSingleTask, status } = useTripGeneration();

  // ROUTE DATA
  // CHECK: Correctly accesses 'routenVorschlaege' defined in types.ts (RouteArchitectResult)
  const routeResult = project.analysis.routeArchitect;
  const proposals = routeResult?.routenVorschlaege || [];

  // STATE
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [keptRouteIndices, setKeptRouteIndices] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
    
  const [showItineraryModal, setShowItineraryModal] = useState(false);

  // --- 0. AUTO-SELECT (FIX) ---
  // Prüft beim Laden, ob eine der Vorschläge bereits im Store aktiv ist.
  useEffect(() => {
    const currentStops = project.userInputs.logistics.roundtrip?.stops;
    if (!currentStops || currentStops.length === 0 || proposals.length === 0) return;

    // Wir vergleichen die Ortsnamen (Locations). Das ist robust genug.
    const currentLocations = currentStops.map(s => s.location).sort().join('|');

    const matchingIndex = proposals.findIndex(p => {
        // Hier müssen wir auch die Vorschläge erst "kondensieren", falls der Store kondensiert ist,
        // oder wir vergleichen einfach die rohen Listen, wenn der Store noch "roh" war.
        // Besser: Wir bauen aus dem Vorschlag die Stationen und vergleichen dann.
        const condensedProposal = condenseLocations(p.uebernachtungsorte);
        const proposalStr = condensedProposal.map(c => c.name).sort().join('|');
        return proposalStr === currentLocations;
    });

    if (matchingIndex !== -1) {
        setSelectedRouteIndex(matchingIndex);
    }
  }, [project.userInputs.logistics.roundtrip, proposals]);


  // --- ACTIONS ---

  const handleToggleKeep = (index: number) => {
    const newSet = new Set(keptRouteIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setKeptRouteIndices(newSet);
  };

  const handleSelectRoute = (index: number) => {
    setSelectedRouteIndex(index);
  };

  const handleConfirmSelection = () => {
    if (selectedRouteIndex === null) return;

    const selectedRoute = proposals[selectedRouteIndex];
    if (!selectedRoute) return;

    // FIX: Condense Timeline to Stations (Repairs Itinerary Modal)
    const condensed = condenseLocations(selectedRoute.uebernachtungsorte);

    // 1. Convert to RouteStop Format with Calculated Duration
    const stops = condensed.map((item, i) => ({
      id: `stop-${Date.now()}-${i}`,
      location: item.name,
      duration: item.count, // Nächte aus Timeline übernehmen
      hotel: undefined 
    }));

    // 2. Update Store
    updateLogistics('roundtrip', {
      stops: stops,
    });

    // 3. Open Itinerary Modal
    setShowItineraryModal(true);
  };

  const handleItinerarySaved = () => {
    setShowItineraryModal(false);
    if (onNext) onNext();
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      addNotification({ type: 'error', message: t('route.error_no_feedback', { defaultValue: 'Bitte geben Sie Feedback ein.' }) });
      return;
    }

    // 1. Prepare "Kept" Routes
    const keptRoutes = proposals.filter((_, i) => keptRouteIndices.has(i));
    
    // 2. FIX: Dynamic target count: Keep current count + 2 new ones
    const targetCount = keptRoutes.length + 2;

    // 3. Build Feedback Prompt
    const keptBlock = keptRoutes.length > 0 
        ? `\n\nKEEP THESE ROUTES EXACTLY AS IS:\n${JSON.stringify(keptRoutes, null, 2)}` 
        : "";

    // CHECK: Validated legacy output format instructions
    const fullFeedback = `User Feedback: "${feedback}"${keptBlock}\n\nTask: Generate a total of ${targetCount} route proposals in the known JSON format. Include the "kept" routes provided above unchanged at the beginning of the list, and generate exactly 2 NEW additional variations based on the user feedback. The output must contain a 'routenVorschlaege' array with exactly ${targetCount} objects.`;

    // 4. Trigger AI
    await startSingleTask('routeArchitect', fullFeedback);
    
    // 5. Reset UI
    setFeedback('');
    setSelectedRouteIndex(null);
    setKeptRouteIndices(new Set());
  };


  // --- RENDER HELPERS ---

  if (!routeResult || proposals.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('route.no_proposals', { defaultValue: 'Keine Routenvorschläge verfügbar.' })}</p>
      </div>
    );
  }

  // FIX: Robust Start Location Logic (V30 Parity) - Falls Start leer, nimm Heimatort
  const startLoc = project.userInputs.logistics.roundtrip.startLocation || 
                   project.userInputs.travelers.origin || 
                   project.userInputs.logistics.roundtrip.region || 
                   "";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4 w-1/4 min-w-[150px]">{t('route.criteria', { defaultValue: 'Kriterium' })}</th>
              {proposals.map((route, i) => (
                <th key={i} className={`p-4 min-w-[200px] border-l border-slate-100 relative ${selectedRouteIndex === i ? 'bg-blue-50/50' : ''}`}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-1">
                      <input 
                        type="radio" 
                        name="route-select"
                        checked={selectedRouteIndex === i}
                        onChange={() => handleSelectRoute(i)}
                        className="peer sr-only"
                      />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${selectedRouteIndex === i ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                        <Check className={`w-4 h-4 text-white ${selectedRouteIndex === i ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    </div>
                    <div>
                      {/* CHECK: routenName matches type */}
                      <span className={`block text-lg font-bold ${selectedRouteIndex === i ? 'text-blue-700' : 'text-slate-800'}`}>
                        {route.routenName}
                      </span>
                      {selectedRouteIndex === i && (
                        <span className="text-xs text-blue-600 font-medium animate-pulse">
                          {t('route.selected', { defaultValue: 'Ausgewählt' })}
                        </span>
                      )}
                    </div>
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            
            {/* ROW: Charakter */}
            <tr>
              <td className="p-4 font-medium text-slate-600 bg-slate-50/50">{t('route.character', { defaultValue: 'Charakter' })}</td>
              {proposals.map((r, i) => (
                <td key={i} className={`p-4 border-l border-slate-100 align-top ${selectedRouteIndex === i ? 'bg-blue-50/30' : ''}`}>
                  {r.charakter}
                </td>
              ))}
            </tr>

            {/* ROW: Verlauf (FIXED DISPLAY) */}
            <tr>
              <td className="p-4 font-medium text-slate-600 bg-slate-50/50">{t('route.itinerary', { defaultValue: 'Verlauf' })}</td>
              {proposals.map((r, i) => {
                // FIX: Use Condensed View for Display
                const condensed = condenseLocations(r.uebernachtungsorte);
                return (
                  <td key={i} className={`p-4 border-l border-slate-100 align-top ${selectedRouteIndex === i ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex flex-col gap-1">
                      {condensed.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          <span>
                             {item.name} 
                             {item.count > 1 && <span className="text-xs text-slate-400 ml-1">({item.count} Nächte)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* ROW: Stats */}
            <tr>
              <td className="p-4 font-medium text-slate-600 bg-slate-50/50">{t('route.facts', { defaultValue: 'Fakten' })}</td>
              {proposals.map((r, i) => (
                <td key={i} className={`p-4 border-l border-slate-100 align-top ${selectedRouteIndex === i ? 'bg-blue-50/30' : ''}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Navigation className="w-4 h-4" />
                      <span>{r.gesamtKilometer} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>~{r.gesamtFahrzeitStunden} {t('unit.hours', { defaultValue: 'Std.' })}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* ROW: Map Link (FIXED URL GENERATION) */}
            <tr>
              <td className="p-4 font-medium text-slate-600 bg-slate-50/50">{t('route.map', { defaultValue: 'Karte' })}</td>
              {proposals.map((r, i) => {
                // FIX: Use Condensed View for Map to prevent Waypoint Overflow
                const condensed = condenseLocations(r.uebernachtungsorte);
                const mapLocs = startLoc 
                    ? [startLoc, ...condensed.map(c => c.name), startLoc] 
                    : condensed.map(c => c.name);
                
                const url = generateGoogleMapsRouteUrl(mapLocs);

                return (
                  <td key={i} className={`p-4 border-l border-slate-100 align-top ${selectedRouteIndex === i ? 'bg-blue-50/30' : ''}`}>
                    {url ? (
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t('route.open_map', { defaultValue: 'Auf Karte öffnen' })}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* ROW: Keep Checkbox */}
            <tr className="bg-amber-50/30">
              <td className="p-4 font-medium text-amber-900/80 bg-amber-50/50 border-t border-amber-100">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('route.feedback_option', { defaultValue: 'Feedback-Option' })}
                </div>
              </td>
              {proposals.map((_, i) => (
                <td key={i} className={`p-4 border-l border-amber-100 border-t border-amber-100 align-top ${selectedRouteIndex === i ? 'bg-blue-50/30' : ''}`}>
                  <label className="flex items-center gap-2 cursor-pointer text-amber-800 hover:text-amber-900 transition-colors select-none">
                    <input 
                      type="checkbox"
                      checked={keptRouteIndices.has(i)}
                      onChange={() => handleToggleKeep(i)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">{t('route.keep', { defaultValue: 'Behalten' })}</span>
                  </label>
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col gap-6">
        
        {/* REGENERATE SECTION */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3 w-full">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
            <RefreshCw className="w-4 h-4" />
            {t('route.regenerate_title', { defaultValue: 'Anpassen & Neu Generieren' })}
          </h3>
          <p className="text-xs text-slate-500">
            {t('route.regenerate_hint', { defaultValue: 'Markieren Sie oben "Behalten", um Favoriten zu sichern.' })}
          </p>
          <div className="flex gap-2 mt-auto w-full">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('route.feedback_placeholder', { defaultValue: "z.B. 'Weniger Fahrzeit', 'Mehr Berge'..." })}
              className="flex-1 text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none h-[42px]"
            />
            <button
              onClick={handleRegenerate}
              disabled={status === 'generating'}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === 'generating' ? '...' : t('actions.generate', { defaultValue: 'Generieren' })}
            </button>
          </div>
        </div>

        {/* CONFIRM SECTION */}
        <div className="flex items-end justify-end">
          <button
            onClick={handleConfirmSelection}
            disabled={selectedRouteIndex === null || status === 'generating'}
            className={`
              w-full md:w-auto px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1
              ${selectedRouteIndex !== null 
                ? 'bg-green-600 hover:bg-green-700 text-white ring-2 ring-green-600 ring-offset-2' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            <span>✅</span>
            {t('route.confirm_continue', { defaultValue: 'Route übernehmen & weiter' })}
          </button>
        </div>

      </div>

      <ItineraryModal 
        isOpen={showItineraryModal} 
        onClose={() => setShowItineraryModal(false)}
        onSave={handleItinerarySaved}
      />
    </div>
  );
};
// --- END OF FILE 346 Zeilen ---
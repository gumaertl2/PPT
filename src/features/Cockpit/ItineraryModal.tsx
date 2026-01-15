// src/features/Cockpit/ItineraryModal.tsx
// 15.01.2026 18:00 - FEATURE: Itinerary Manager Modal (V30 Parity).
// 16.01.2026 01:25 - FIX: Full Internationalization (i18n).

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Moon, AlertTriangle, CheckCircle, BedDouble } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import type { RouteStop } from '../../core/types';

interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Triggered after successful save
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const { project, updateLogistics, addNotification } = useTripStore();
  
  // DATA
  const stops = project.userInputs.logistics.roundtrip.stops || [];
  const durationDays = project.userInputs.dates.duration || 0;
  // Nights = Days - 1 (Standard travel logic), ensuring at least 0
  const totalNights = Math.max(0, durationDays - 1);

  // LOCAL STATE
  // Map stop index to nights count
  const [nightDistribution, setNightDistribution] = useState<number[]>([]);

  // Initialize state when opening
  useEffect(() => {
    if (isOpen && stops.length > 0) {
      // If stops already have durations, use them. Otherwise distribute evenly or set to 0.
      const initialDist = stops.map(s => s.duration || 0);
      setNightDistribution(initialDist);
    }
  }, [isOpen, stops]);

  // CALCULATION
  const assignedNights = nightDistribution.reduce((a, b) => a + b, 0);
  const remainingNights = totalNights - assignedNights;
  const isBalanced = remainingNights === 0;

  // HANDLERS
  const handleNightChange = (index: number, value: string) => {
    const val = parseInt(value) || 0;
    const newDist = [...nightDistribution];
    newDist[index] = Math.max(0, val); // No negative nights
    setNightDistribution(newDist);
  };

  const handleSave = () => {
    // Soft Validation
    if (!isBalanced) {
      const msg = remainingNights > 0 
        ? t('itinerary.remaining_nights_open', { count: remainingNights, defaultValue: `Es sind noch ${remainingNights} Nächte offen.` }) 
        : t('itinerary.too_many_nights', { count: Math.abs(remainingNights), defaultValue: `Es sind ${Math.abs(remainingNights)} Nächte zu viel verplant.` });
      
      const confirmMsg = `${msg}\n\n${t('itinerary.confirm_unbalanced', { defaultValue: 'Möchten Sie trotzdem fortfahren? Für die Ideensuche ist das okay, aber der Tagesplan könnte ungenau sein.' })}`;
      
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    // UPDATE STORE
    // We create a deep copy of stops and assign the new durations
    const updatedStops = stops.map((stop, i) => ({
      ...stop,
      duration: nightDistribution[i]
    }));

    updateLogistics('roundtrip', { stops: updatedStops });

    addNotification({
      type: 'success',
      message: t('itinerary.saved_success', { defaultValue: 'Reiseroute gespeichert.' }),
      autoClose: 1500
    });

    onSave();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BedDouble className="w-6 h-6 text-blue-600" />
              {t('itinerary.title', { defaultValue: 'Übernachtungen planen' })}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {t('itinerary.subtitle', { defaultValue: 'Verteilen Sie Ihre Zeit auf die gewählten Orte.' })}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY BAR */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors
          ${isBalanced ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${isBalanced ? 'bg-green-100' : 'bg-amber-100'}`}>
              {isBalanced ? <CheckCircle className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-wider opacity-70">
                {isBalanced ? t('itinerary.status_balanced', { defaultValue: 'Planung aufgeht' }) : t('itinerary.status_unbalanced', { defaultValue: 'Anpassung nötig' })}
              </div>
              <div className="font-bold text-lg text-slate-800">
                {t('itinerary.total', { defaultValue: 'Gesamt:' })} {totalNights} {t('unit.nights', { defaultValue: 'Nächte' })}
              </div>
            </div>
          </div>

          <div className="text-right">
             <div className="text-sm text-slate-600">{t('itinerary.assigned', { defaultValue: 'Zugewiesen' })}</div>
             <div className={`text-xl font-bold ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
               {assignedNights}
             </div>
             <div className="text-xs text-slate-400">
               {remainingNights > 0 
                  ? `${remainingNights} ${t('itinerary.open', { defaultValue: 'offen' })}` 
                  : remainingNights < 0 
                    ? `${Math.abs(remainingNights)} ${t('itinerary.too_many', { defaultValue: 'zu viel' })}` 
                    : ''}
             </div>
          </div>
        </div>

        {/* LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {stops.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              {t('itinerary.no_stops', { defaultValue: 'Keine Stationen definiert.' })}
            </div>
          ) : (
            stops.map((stop, index) => (
              <div key={stop.id || index} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors shadow-sm">
                
                {/* Number Badge */}
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <div className="font-bold text-slate-800 text-lg">{stop.location}</div>
                  {stop.hotel && (
                    <div className="text-xs text-slate-500 truncate max-w-[250px]">
                      {stop.hotel}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="number"
                    min="0"
                    max={totalNights}
                    value={nightDistribution[index] || 0}
                    onChange={(e) => handleNightChange(index, e.target.value)}
                    className="w-16 text-center font-bold text-lg bg-transparent border-none focus:ring-0 p-0 text-blue-700"
                  />
                  <span className="text-xs font-semibold text-slate-400 pr-2">
                    {t('unit.nights', { defaultValue: 'Nächte' })}
                  </span>
                </div>

              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {t('actions.cancel', { defaultValue: 'Abbrechen' })}
          </button>
          
          <button
            onClick={handleSave}
            className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
              ${isBalanced ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isBalanced 
              ? t('itinerary.save_start', { defaultValue: 'Speichern & Starten' }) 
              : t('itinerary.save_anyway', { defaultValue: 'Trotzdem Speichern' })}
          </button>
        </div>

      </div>
    </div>
  );
};
// --- END OF FILE 168 Zeilen ---
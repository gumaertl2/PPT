// 27.02.2026 19:00 - FEAT: Brand new component for handling Human-in-the-Loop DayPlanner conflicts.
// src/features/Cockpit/PlannerConflictModal.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { AlertTriangle, MapPin, Check, X } from 'lucide-react';

interface PlannerConflictModalProps {
    onReject: () => void;
    onAccept: () => void;
}

export const PlannerConflictModal: React.FC<PlannerConflictModalProps> = ({ onReject, onAccept }) => {
    const { t } = useTranslation();
    const { showConflictModal, plannerConflicts, resolvePlannerConflict } = useTripStore();

    if (!showConflictModal || plannerConflicts.length === 0) return null;

    const handleRejectClick = () => {
        resolvePlannerConflict(false);
        onReject();
    };

    const handleAcceptClick = () => {
        resolvePlannerConflict(true);
        onAccept();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-orange-500">
                
                <div className="p-6 pb-4 flex items-start gap-4">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-full shrink-0">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {t('sights.conflict_modal_title', { defaultValue: 'Planungs-Kompromiss nötig' })}
                        </h2>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                            {t('sights.conflict_modal_desc', { defaultValue: 'Dein vorgegebenes Zeitbudget ist zu knapp. Die KI konnte folgende hochpriorisierte Orte nicht im Tagesplan unterbringen:' })}
                        </p>
                    </div>
                </div>

                <div className="px-6 py-2 overflow-y-auto flex-1 border-y border-slate-100 bg-slate-50/50">
                    <div className="space-y-3">
                        {plannerConflicts.map((conflict, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {conflict.prio === 4 ? (
                                        <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Fix</span>
                                    ) : (
                                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Prio {conflict.prio}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400" /> {conflict.name}
                                    </h4>
                                    <p className="text-xs text-orange-700 mt-1 italic leading-snug">
                                        "{conflict.reason}"
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
                    <button 
                        onClick={handleRejectClick}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-sm"
                    >
                        <X className="w-4 h-4" />
                        {t('sights.conflict_modal_reject', { defaultValue: 'Plan verwerfen & anpassen' })}
                    </button>
                    <button 
                        onClick={handleAcceptClick}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-md shadow-orange-200"
                    >
                        <Check className="w-4 h-4" />
                        {t('sights.conflict_modal_accept', { defaultValue: 'Plan trotzdem übernehmen' })}
                    </button>
                </div>

            </div>
        </div>
    );
};
// --- END OF FILE 90 Zeilen ---
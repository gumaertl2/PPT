// 24.02.2026 11:05 - FIX: Refined terminology in MergeProjectModal to clarify 'Loading/Discarding' instead of 'Deleting'.
// 23.02.2026 16:30 - FEAT: Created dedicated MergeProjectModal with i18n support.
// src/features/Cockpit/Layout/MergeProjectModal.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Merge, Upload } from 'lucide-react';

interface MergeProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMerge: () => void;
    onOverwrite: () => void;
}

export const MergeProjectModal: React.FC<MergeProjectModalProps> = ({ isOpen, onClose, onMerge, onOverwrite }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-6 bg-amber-50 border-b border-amber-100">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-amber-900 mb-2">
                        {t('wizard.merge_modal.title', 'Planung bereits aktiv')}
                    </h2>
                    <p className="text-sm text-amber-800 leading-relaxed">
                        {t('wizard.merge_modal.description', 'Es ist bereits eine Reise geladen. Möchten Sie die Orte der neuen Datei in Ihre bestehende Planung integrieren (Merge) oder die aktuelle Sitzung beenden und die neue Datei laden?')}
                    </p>
                </div>
                
                <div className="p-6 space-y-3 bg-slate-50">
                    <button
                        onClick={onMerge}
                        className="w-full flex items-center gap-4 p-4 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition group text-left"
                    >
                        <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-600 transition">
                            <Merge className="w-5 h-5 text-indigo-600 group-hover:text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 group-hover:text-indigo-700">
                                {t('wizard.merge_modal.btn_merge', 'Orte integrieren (Merge)')}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {t('wizard.merge_modal.desc_merge', 'Die neuen Orte werden hinzugefügt. Ihre Logistik- und Reisedaten bleiben erhalten.')}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={onOverwrite}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:shadow-md transition group text-left"
                    >
                        <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-red-600 transition">
                            <Upload className="w-5 h-5 text-slate-600 group-hover:text-white" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 group-hover:text-red-600">
                                {t('wizard.merge_modal.btn_overwrite', 'Neue Datei laden')}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {t('wizard.merge_modal.desc_overwrite', 'Das aktuelle Projekt im Speicher wird verworfen. Nicht gespeicherte Änderungen gehen verloren.')}
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition"
                    >
                        {t('actions.cancel', 'Abbrechen')}
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- END OF FILE 84 Zeilen ---
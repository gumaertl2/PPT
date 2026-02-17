// src/features/Cockpit/SafeExitModal.tsx
// 17.02.2026 12:00 - NEW: Extracted SafeExitModal for better architecture & I18n support.

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Trash2, LogOut } from 'lucide-react';

interface SafeExitModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export const SafeExitModal: React.FC<SafeExitModalProps> = ({
  isOpen,
  onCancel,
  onDiscard,
  onSave
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-white">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('safeExit.title')}</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{t('safeExit.subtitle')}</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <strong>{t('safeExit.warning')}</strong>
                    </div>
                </div>

                <div className="text-slate-600 text-sm space-y-2">
                    <p>
                        <strong>{t('safeExit.copyright_owner')}</strong>
                    </p>
                    <p>
                         {t('safeExit.copyright_notice')}
                    </p>
                    <p className="text-slate-400 text-xs mt-2 border-t pt-2">
                        <strong>{t('safeExit.disclaimer')}</strong>
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                >
                    {t('safeExit.btn_cancel')}
                </button>
                
                <button 
                    onClick={onDiscard}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    {t('safeExit.btn_discard')}
                </button>

                <button 
                    onClick={onSave}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-200 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    {t('safeExit.btn_save')}
                </button>
            </div>
        </div>
    </div>
  );
};
// --- END OF FILE 90 Lines ---
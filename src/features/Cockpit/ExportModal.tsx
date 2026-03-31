// 23.01.2026 17:30 - i18n: Replaced hardcoded strings using useTranslation (99 lines base).
// src/features/Cockpit/ExportModal.tsx

import React from 'react';
import { useTranslation } from 'react-i18next'; // FIX: i18n import
import { X, ExternalLink, CheckCircle2, FileSpreadsheet, Map as MapIcon } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation(); // FIX: hook added

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <MapIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">{t('export.title')}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <CheckCircle2 className="text-indigo-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-indigo-900">{t('export.copied_title')}</p>
              <p className="text-xs text-indigo-700 mt-1">
                {t('export.copied_subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Schritt 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">1</div>
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  {/* Hinweis: Wir behalten die HTML-Struktur (bold/italic) manuell bei */}
                  Öffne ein neues <span className="font-bold italic">Google Sheet</span> und füge die Daten in Zelle <span className="font-bold">A1</span> ein (Rechtsklick -&gt; Einfügen).
                </p>
                <a 
                  href="https://sheets.google.com/create" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <FileSpreadsheet size={14} /> {t('export.step1_btn')} <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Schritt 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">2</div>
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  Erstelle in <span className="font-bold italic">Google My Maps</span> eine neue Karte und klicke auf <span className="font-bold">"Importieren"</span>.
                </p>
                <a 
                  href="https://www.google.com/mymaps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <MapIcon size={14} /> {t('export.step2_btn')} <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Schritt 3 */}
            <div className="flex gap-4 pt-2 border-t border-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">3</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Wähle beim Import dein Google Sheet aus. Nutze die Spalte <span className="font-medium text-slate-700">"Name"</span> oder <span className="font-medium text-slate-700">"Adresse"</span> für die Position und <span className="font-medium text-slate-700">"Name"</span> als Titel.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            {t('actions.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

// --- END OF FILE 101 Zeilen ---
/**
 * src/features/cockpit/ManualPromptModal.tsx
 * MODAL: Manueller KI-Modus (Copy & Paste)
 * Wird angezeigt, wenn kein API-Key hinterlegt ist.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, X, Play } from 'lucide-react';

interface ManualPromptModalProps {
  promptText: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jsonResult: string) => void;
  error?: string | null;
  stepId?: string; // NEU: Für den Signatur-Check (Türsteher)
}

export const ManualPromptModal: React.FC<ManualPromptModalProps> = ({ 
  promptText, 
  isOpen, 
  onClose, 
  onSubmit,
  error,
  stepId
}) => {
  const { t } = useTranslation();
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Error-State zurücksetzen, wenn das Modal neu geöffnet wird
  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
      setJsonInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleSubmit = () => {
    if (!jsonInput.trim()) return;

    // 1. JSON säubern (Markdown-Blöcke wie ```json entfernen)
    let cleaned = jsonInput.trim();
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      cleaned = match[0];
    }

    // 2. Parsen & Türsteher-Prüfung (Signature Check)
    try {
      const parsed = JSON.parse(cleaned);

      if (stepId) {
        const sId = stepId.toLowerCase();
        
        // Prüfung: Fundamentalanalyse
        if (sId.includes('basis') || sId.includes('foundation')) {
          if (!parsed.places && !parsed.sights && !parsed.analysis) {
            setLocalError(t('modal.error_signature_basis', 'Falsche Daten: Die Antwort enthält keine Orte. Hast du versehentlich die Route kopiert?'));
            return;
          }
        }
        // Prüfung: Routen-Architekt
        else if (sId.includes('route')) {
          if (!parsed.route_proposals && !parsed.routes) {
            setLocalError(t('modal.error_signature_route', 'Falsche Daten: Die Antwort enthält keine Routen. Hast du versehentlich das Fundament kopiert?'));
            return;
          }
        }
        // Prüfung: Tagesplaner
        else if (sId.includes('tagesplaner') || sId.includes('itinerary')) {
          if (!parsed.days && !parsed.itinerary) {
            setLocalError(t('modal.error_signature_days', 'Falsche Daten: Die Antwort enthält keinen Tagesplan.'));
            return;
          }
        }
      }

      // Wenn alles passt: Fehler zurücksetzen und bereinigtes JSON übergeben
      setLocalError(null);
      onSubmit(cleaned);

    } catch (err) {
      // Wenn es gar kein gültiges JSON ist
      setLocalError(t('modal.error_invalid_json', 'Ungültiges JSON-Format. Bitte prüfen Sie den kopierten Text.'));
      return;
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 py-1 px-2 rounded text-xs uppercase tracking-wide">Manuell</span>
            {t('modal.manual_title', 'KI-Anfrage manuell ausführen')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* SCHRITT 1: KOPIEREN */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                {t('modal.step1_copy', 'Prompt kopieren & in KI einfügen')}
              </label>
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('modal.copied', 'Kopiert!') : t('modal.copy_btn', 'Prompt kopieren')}
              </button>
            </div>
            
            <div className="relative">
              <textarea 
                readOnly 
                value={promptText} 
                className="w-full h-32 p-3 text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none resize-none"
              />
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* SCHRITT 2: EINFÜGEN */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">2</span>
              {t('modal.step2_paste', 'Antwort (JSON) hier einfügen')}
            </label>
            <textarea 
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setLocalError(null); // Fehler beim Tippen/Einfügen ausblenden
              }}
              placeholder={t('modal.json_placeholder', 'Fügen Sie hier die Antwort der KI ein... (beginnend mit { oder [)')}
              className={`w-full h-48 p-3 text-sm font-mono border-2 border-dashed rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                displayError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
              }`}
            />
            {displayError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-medium p-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-red-500" /> 
                <span>{displayError}</span>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('actions.cancel', 'Abbrechen')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!jsonInput.trim()}
            className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {t('actions.process', 'Verarbeiten')}
          </button>
        </div>

      </div>
    </div>
  );
};

// Hilfs-Icon für den Error-State (falls noch nicht importiert)
const AlertCircleIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

// --- END OF FILE 194 Zeilen ---
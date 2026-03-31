/**
 * src/features/cockpit/ManualPromptModal.tsx
 * MODAL: Manueller KI-Modus (Copy & Paste)
 * Wird angezeigt, wenn kein API-Key hinterlegt ist.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, X, Play } from 'lucide-react';

interface ManualPromptModalProps {
  promptText: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jsonResult: string) => void;
  error?: string | null;
}

export const ManualPromptModal: React.FC<ManualPromptModalProps> = ({ 
  promptText, 
  isOpen, 
  onClose, 
  onSubmit,
  error 
}) => {
  const { t } = useTranslation();
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);

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
    onSubmit(jsonInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={t('modal.json_placeholder', 'Fügen Sie hier die Antwort der KI ein... (beginnend mit { oder [)')}
              className="w-full h-48 p-3 text-sm font-mono border-2 border-dashed border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500"
            />
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4" /> {error}
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
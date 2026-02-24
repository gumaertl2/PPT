// 24.02.2026 10:05 - FIX: Corrected Zustand state access for Free Tier toggle (using aiSettings & setAiSettings).
// 24.02.2026 09:50 - FEAT: Added Free Tier toggle directly to the WelcomeScreen.
// 09.02.2026 10:45 - FIX: Delegate file loading to store to capture 'filename'.
// src/features/Welcome/WelcomeScreen.tsx

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { Key, Upload, Plus, AlertCircle, Settings, FileText, HelpCircle, Book, Database, Globe, Check } from 'lucide-react';
import type { LanguageCode } from '../../core/types';
import { InfoModal } from './InfoModal';

// NEU: Import der dedizierten Modals
import { CatalogModal } from './CatalogModal';
import { SettingsModal } from '../Cockpit/SettingsModal';

import { getInfoText } from '../../data/Texts';
// FIX: Corrected import path casing to Match 'Texts' folder
import type { InfoCategory } from '../../data/Texts';

export const WelcomeScreen = () => {
  const { t, i18n } = useTranslation();
  // Store Updates: setLanguage und project für Sync benötigt
  const { apiKey, setApiKey, setView, loadProject, setLanguage, project, aiSettings, setAiSettings } = useTripStore();
  
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INFO MODAL LOGIC (Briefing, Terms, etc.) ---
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', content: '' });

  const openInfoModal = (category: InfoCategory) => {
    const currentLang = i18n.language.startsWith('en') ? 'en' : 'de';
    const textData = getInfoText(category, currentLang as LanguageCode);
    setInfoContent(textData);
    setInfoModalOpen(true);
  };

  // --- NEW MODALS STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // --- HANDLERS ---
  const handleStartNew = () => {
    // Key speichern, falls geändert (auch wenn leer für manuellen Modus)
    if (localKey !== apiKey) {
       setApiKey(localKey);
    }
    setView('wizard');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // FIX: Apply API key first if entered locally
    if (localKey) setApiKey(localKey);

    // FIX: Pass the FILE object directly to store. 
    // This allows the store to extract 'file.name' into uiState.currentFileName.
    try {
        await loadProject(file);
        // On success, store handles view switch to 'wizard'
    } catch (err) {
        console.error(err);
        setError(t('welcome.error_invalid_file', 'Ungültiges Dateiformat.'));
    }
    
    event.target.value = ''; // Reset input
  };

  const toggleLanguage = () => {
    // Aktuelle Sprache aus Store oder i18n nehmen
    const current = project.meta.language;
    const next: LanguageCode = current === 'de' ? 'en' : 'de';
    
    // UI und Store updaten
    i18n.changeLanguage(next);
    setLanguage(next);
  };

  const currentLangLabel = (project.meta.language || i18n.language).substring(0, 2).toUpperCase();

  // Helper für den Toggle State
  const isFreeTier = aiSettings?.isFreeTierKey ?? true;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center animate-fade-in-up relative">
      
      {/* HEADER ACTIONS (Language & Settings) */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all text-xs font-bold"
          title="Sprache wechseln / Change Language"
        >
          <Globe className="w-4 h-4" />
          {currentLangLabel}
        </button>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
          title={t('settings.title', 'Einstellungen')}
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* --- MODALS --- */}
      <InfoModal 
        isOpen={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
        title={infoContent.title} 
        content={infoContent.content} 
      />
      
      <CatalogModal 
        isOpen={showCatalog} 
        onClose={() => setShowCatalog(false)} 
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Logo & Titel */}
      <div className="mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-blue-200">
          P
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Papatours <span className="text-blue-600">V40</span>
        </h1>
        <p className="text-slate-500 text-lg">
          {t('welcome.subtitle', 'Ihr intelligenter KI-Reiseplaner.')}
        </p>
      </div>

      {/* API Key Sektion */}
      <div className="mb-8 text-left bg-slate-50 p-6 rounded-xl border border-slate-200">
        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-500" />
          {t('welcome.api_label', 'OpenAI API Key (Optional)')}
        </label>
        
        <input 
          type="password" 
          placeholder="sk-... (Leer lassen für manuellen Modus)"
          value={localKey}
          onChange={(e) => {
            setLocalKey(e.target.value);
            setError(null);
          }}
          className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
        />
        
        <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-slate-400">
              {t('welcome.storage_note', 'Gespeichert im LocalStorage (Base64).')}
            </p>
            {/* Link zur Hilfe (bleibt hier, da kontextbezogen zum Key) */}
            <button 
                onClick={() => openInfoModal('help')} 
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
                <HelpCircle className="w-3 h-3" /> {t('welcome.help_link', 'Wo finde ich meinen Key?')}
            </button>
        </div>
        
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* FREE TIER TOGGLE */}
        <div 
          className={`mt-4 p-4 border rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${isFreeTier ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-100'}`}
          onClick={() => setAiSettings({ isFreeTierKey: !isFreeTier })}
        >
          <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${isFreeTier ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
            {isFreeTier && <Check className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className={`text-sm font-bold ${isFreeTier ? 'text-indigo-900' : 'text-slate-700'}`}>
              {t('settings.free_tier_title', 'Ich nutze einen kostenlosen API-Key')}
            </div>
            <div className={`text-xs mt-1 ${isFreeTier ? 'text-indigo-700' : 'text-slate-500'}`}>
              {t('settings.free_tier_desc', 'Aktiviert Limit-Schutz (Pausen zwischen API-Aufrufen) & tauscht "Pro" automatisch gegen das schnellere "Thinking"-Modell aus.')}
            </div>
          </div>
        </div>
      </div>

      {/* Haupt-Aktionen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <button 
          onClick={handleStartNew}
          className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md group"
        >
          <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-lg">{t('welcome.btn_new', 'Neue Reise planen')}</span>
          <span className="text-blue-100 text-sm mt-1">{t('welcome.btn_new_sub', 'Startet den Wizard')}</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="font-bold text-lg">{t('welcome.btn_load', 'Reise laden')}</span>
          <span className="text-slate-400 text-sm mt-1">{t('welcome.btn_load_sub', 'Aus .json Datei')}</span>
        </button>
        
        {/* Hidden File Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json" 
            className="hidden" 
            onChange={handleFileUpload}
        />
      </div>

      {/* FOOTER LINKS */}
      <div className="pt-6 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            
            <button onClick={() => openInfoModal('briefing')} className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 p-2 rounded hover:bg-slate-50 transition-colors">
                <FileText className="w-3.5 h-3.5" /> {t('welcome.footer.briefing', 'Briefing')}
            </button>
            
            <button onClick={() => openInfoModal('description')} className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 p-2 rounded hover:bg-slate-50 transition-colors">
                <Book className="w-3.5 h-3.5" /> {t('welcome.footer.description', 'Programm-Info')}
            </button>
            
            {/* KATALOG BUTTON -> Öffnet CatalogModal */}
            <button onClick={() => setShowCatalog(true)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 p-2 rounded hover:bg-slate-50 transition-colors">
                <Database className="w-3.5 h-3.5" /> {t('welcome.footer.catalog', 'Katalog')}
            </button>
            
            <button onClick={() => openInfoModal('terms')} className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 p-2 rounded hover:bg-slate-50 transition-colors">
                <FileText className="w-3.5 h-3.5" /> {t('welcome.footer.terms', 'Nutzungsbedingungen')}
            </button>
          </div>
      </div>
    </div>
  );
};
// --- END OF FILE 178 Zeilen ---
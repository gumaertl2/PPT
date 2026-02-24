// 24.02.2026 20:10 - REFACTOR: Compacted UI (smaller cards, reduced margins/paddings) to fit 'above the fold' without scrolling.
// 24.02.2026 19:55 - REFACTOR: Removed "V40" from main title.
// 24.02.2026 19:35 - REFACTOR: Elevated Info (Marketing) and Quick Guide buttons to main grid for better visibility.
// src/features/Welcome/WelcomeScreen.tsx

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore';
import { Key, Upload, Plus, AlertCircle, Settings, FileText, HelpCircle, Book, Database, Globe, Check, Zap } from 'lucide-react';
import type { LanguageCode } from '../../core/types';
import { InfoModal } from './InfoModal';

import { CatalogModal } from './CatalogModal';
import { SettingsModal } from '../Cockpit/SettingsModal';
import { quickGuide } from '../../data/Texts/quickguide';

import { getInfoText } from '../../data/Texts';
import type { InfoCategory } from '../../data/Texts';

export const WelcomeScreen = () => {
  const { t, i18n } = useTranslation();
  const { apiKey, setApiKey, setView, loadProject, setLanguage, project, aiSettings, setAiSettings } = useTripStore();
  
  const [localKey, setLocalKey] = useState(apiKey || '');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INFO MODAL LOGIC (Briefing, Terms, etc.) ---
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', content: '' });
  const [showQuickGuide, setShowQuickGuide] = useState(false);

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
    if (localKey !== apiKey) {
       setApiKey(localKey);
    }
    setView('wizard');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (localKey) setApiKey(localKey);

    try {
        await loadProject(file);
    } catch (err) {
        console.error(err);
        setError(t('welcome.error_invalid_file', 'Ungültiges Dateiformat.'));
    }
    
    event.target.value = '';
  };

  const toggleLanguage = () => {
    const current = project.meta.language;
    const next: LanguageCode = current === 'de' ? 'en' : 'de';
    
    i18n.changeLanguage(next);
    setLanguage(next);
  };

  const currentLangLabel = (project.meta.language || i18n.language).substring(0, 2).toUpperCase();
  const langKey = project.meta.language === 'en' ? 'en' : 'de';

  const isFreeTier = aiSettings?.isFreeTierKey ?? true;

  return (
    // FIX: mt-10 -> mt-6 md:mt-10, p-8 -> p-6 md:p-8 für mehr Platz auf Mobile
    <div className="max-w-3xl mx-auto mt-6 md:mt-10 p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center animate-fade-in-up relative">
      
      {/* HEADER ACTIONS (Language & Settings) */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2">
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
          <Settings className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* --- MODALS --- */}
      <InfoModal 
        isOpen={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
        title={infoContent.title} 
        content={infoContent.content} 
      />

      <InfoModal 
        isOpen={showQuickGuide} 
        onClose={() => setShowQuickGuide(false)} 
        title={quickGuide[langKey].title} 
        content={quickGuide[langKey].content} 
      />
      
      <CatalogModal 
        isOpen={showCatalog} 
        onClose={() => setShowCatalog(false)} 
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Logo & Titel (Kompakter) */}
      <div className="mb-6 pt-2">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 tracking-tight flex items-center justify-center gap-2 md:gap-3">
          <span>🌍</span>
          PAPATOURS
        </h1>
        <p className="text-slate-500 text-base md:text-lg font-medium">
          {t('welcome.subtitle', 'Ihr intelligenter KI-Reisebegleiter.')}
        </p>
      </div>

      {/* API Key Sektion (Kompakter) */}
      <div className="mb-6 text-left bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-200">
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
          className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm py-1.5"
        />
        
        <div className="flex justify-between items-center mt-2">
            <p className="text-[11px] text-slate-400">
              {t('welcome.storage_note', 'Gespeichert im LocalStorage (Base64).')}
            </p>
            <button 
                onClick={() => openInfoModal('help')} 
                className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
            >
                <HelpCircle className="w-3 h-3" /> {t('welcome.help_link', 'Wo finde ich meinen Key?')}
            </button>
        </div>
        
        {error && (
          <div className="mt-2 flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-md">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* FREE TIER TOGGLE (Kompakter) */}
        <div 
          className={`mt-3 p-3 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-colors ${isFreeTier ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-100'}`}
          onClick={() => setAiSettings({ isFreeTierKey: !isFreeTier })}
        >
          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${isFreeTier ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
            {isFreeTier && <Check className="w-3 h-3" />}
          </div>
          <div>
            <div className={`text-xs font-bold ${isFreeTier ? 'text-indigo-900' : 'text-slate-700'}`}>
              {t('settings.free_tier_title', 'Ich nutze einen kostenlosen API-Key')}
            </div>
            <div className={`text-[10px] mt-0.5 leading-snug ${isFreeTier ? 'text-indigo-700' : 'text-slate-500'}`}>
              {t('settings.free_tier_desc', 'Aktiviert Limit-Schutz (Pausen zwischen API-Aufrufen) & tauscht "Pro" automatisch gegen das schnellere "Thinking"-Modell aus.')}
            </div>
          </div>
        </div>
      </div>

      {/* Haupt-Aktionen - 2x2 Grid (Verkleinerte Kacheln) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        
        {/* Row 1: Start & Load */}
        <button 
          onClick={handleStartNew}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md group"
        >
          <Plus className="w-6 h-6 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-base">{t('welcome.btn_new', 'Neue Reise planen')}</span>
          <span className="text-blue-100 text-xs mt-0.5">{t('welcome.btn_new_sub', 'Startet den Wizard')}</span>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <Upload className="w-6 h-6 mb-1.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="font-bold text-base">{t('welcome.btn_load', 'Reise laden')}</span>
          <span className="text-slate-400 text-xs mt-0.5">{t('welcome.btn_load_sub', 'Aus .json Datei')}</span>
        </button>

        {/* Row 2: Info & Guide */}
        <button 
          onClick={() => openInfoModal('description')}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm group"
        >
          <Book className="w-6 h-6 mb-1.5 text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-base">{t('welcome.footer.description', 'Programm-Info')}</span>
          <span className="text-slate-400 text-xs mt-0.5">{t('welcome.info_sub', 'Was ist Papatours?')}</span>
        </button>

        <button 
          onClick={() => setShowQuickGuide(true)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50 transition-all shadow-sm group"
        >
          <Zap className="w-6 h-6 mb-1.5 text-amber-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-base">{t('welcome.quick_guide_title', 'Schnellstart-Guide')}</span>
          <span className="text-slate-400 text-xs mt-0.5">{t('welcome.quick_guide_sub', 'Symbole & Funktionen erklärt')}</span>
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

      {/* FOOTER LINKS (Reduziert) */}
      <div className="pt-4 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center">
            
            <button onClick={() => openInfoModal('briefing')} className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 p-1.5 rounded hover:bg-slate-50 transition-colors">
                <FileText className="w-3.5 h-3.5" /> {t('welcome.footer.briefing', 'Briefing')}
            </button>
            
            <button onClick={() => setShowCatalog(true)} className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 p-1.5 rounded hover:bg-slate-50 transition-colors">
                <Database className="w-3.5 h-3.5" /> {t('welcome.footer.catalog', 'Katalog')}
            </button>
            
            <button onClick={() => openInfoModal('terms')} className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-600 p-1.5 rounded hover:bg-slate-50 transition-colors md:col-span-1 col-span-2">
                <FileText className="w-3.5 h-3.5" /> {t('welcome.footer.terms', 'Nutzungsbedingungen')}
            </button>
          </div>
      </div>
    </div>
  );
};

// --- END OF FILE 224 Zeilen ---
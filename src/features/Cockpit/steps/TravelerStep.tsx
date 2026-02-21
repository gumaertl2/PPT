// 21.02.2026 15:25 - FIX: TypeScript alignment for travelerNames and removed 'pets' constraint.
// 21.02.2026 13:00 - UX: Replaced 'Pets' switch with a smart comma-separated text input for traveler names (Trip Finance).
// src/features/Cockpit/steps/TravelerStep.tsx

import React, { useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Home, 
  Baby, 
  Map, 
  Sparkles, 
  Wallet, 
  Gauge, 
  X, 
  Info,
  Flag,
  Heart,
  Briefcase,
  Coffee
} from 'lucide-react';
import { 
  STRATEGY_OPTIONS, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS 
} from '../../../data/staticData';
import type { LanguageCode } from '../../../core/types';

export const TravelerStep = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  // Store Access
  const { 
    project, 
    setTravelers, 
    setConfig, 
    setCustomPreference 
  } = useTripStore();

  const { userInputs } = project;
  const { travelers, pace, budget, vibe, strategyId, customPreferences } = userInputs;

  // --- LOCAL STATE FOR MODAL ---
  const [editConfig, setEditConfig] = useState<{
    key: 'strategyId' | 'vibe' | 'budget' | 'pace';
    title: string;
    optionId: string;
    optionLabel: string;
    currentText: string;
  } | null>(null);

  // Helper um den spezifischen Key für eine Option zu generieren
  const getSpecificKey = (key: string, optionId: string) => `saved_${key}_${optionId}`;
  
  // Helper für den globalen Key (für Prompt-Generierung)
  const getGlobalKey = (key: string) => `cat_${key}`;

  const openEditor = (
    e: React.MouseEvent, 
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    optionId: string,
    label: string,
    defaultText: string
  ) => {
    e.stopPropagation(); 
    
    // 1. Versuche spezifischen Text für diese Option zu laden
    const specificKey = getSpecificKey(key, optionId);
    const specificText = customPreferences[specificKey];

    // 2. Fallback: Wenn diese Option aktiv ist, schau in den globalen Slot (Migration/Sicherheit)
    // 3. Fallback: Default Text
    const storedText = specificText !== undefined ? specificText : defaultText;

    setEditConfig({
      key,
      title: label,
      optionId,
      optionLabel: label,
      currentText: storedText
    });
  };

  const handleSave = () => {
    if (editConfig) {
      const { key, optionId, currentText } = editConfig;
      
      // 1. Speichere spezifisch für diese Option
      const specificKey = getSpecificKey(key, optionId);
      setCustomPreference(specificKey, currentText);

      // 2. Wenn die Option gerade ausgewählt ist, aktualisiere AUCH den globalen Slot für den Prompt
      const currentSelection = userInputs[key]; 
      if (currentSelection === optionId) {
         setCustomPreference(getGlobalKey(key), currentText);
      }

      setEditConfig(null);
    }
  };

  // Handler für Klick auf eine Kachel (Wechsel der Auswahl)
  const handleSelectOption = (
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    optionId: string
  ) => {
    // 1. Setze die Auswahl im Store
    setConfig(key, optionId);

    // 2. Prüfe, ob für die NEUE Option ein spezifischer Text gespeichert ist
    const specificKey = getSpecificKey(key, optionId);
    const savedTextForNewOption = customPreferences[specificKey];

    // 3. Aktualisiere den globalen Prompt-Slot
    if (savedTextForNewOption) {
      setCustomPreference(getGlobalKey(key), savedTextForNewOption);
    } else {
      setCustomPreference(getGlobalKey(key), ''); 
    }
  };

  // Helper für dynamische Farben der Karten (Selection State)
  const getCategoryColors = (key: 'strategyId' | 'vibe' | 'budget' | 'pace') => {
    switch(key) {
      case 'vibe': // Vibe = Amber/Gelb
        return {
          activeBorder: 'border-amber-500',
          activeBg: 'bg-amber-50',
          activeText: 'text-amber-700',
          ring: 'ring-amber-500',
        };
      case 'budget': // Budget = Grün
        return {
          activeBorder: 'border-green-600',
          activeBg: 'bg-green-50',
          activeText: 'text-green-800',
          ring: 'ring-green-600',
        };
      case 'pace': // Pace = Lila
        return {
          activeBorder: 'border-purple-500',
          activeBg: 'bg-purple-50',
          activeText: 'text-purple-800',
          ring: 'ring-purple-500',
        };
      default: // Strategy = Blau
        return {
          activeBorder: 'border-blue-500',
          activeBg: 'bg-blue-50',
          activeText: 'text-blue-700',
          ring: 'ring-blue-500',
        };
    }
  };

  const renderOptionGrid = (
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    options: Record<string, any>,
    currentValue: string,
    title: string,
    Icon: any,
    iconColor: string
  ) => {
    const colors = getCategoryColors(key);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(options).map((opt: any) => {
            const isActive = currentValue === opt.id;
            
            const textForEditor = opt.promptInstruction?.[currentLang] || opt.description?.[currentLang] || '';
            const specificKey = getSpecificKey(key, opt.id);
            const hasSavedTextForThisOption = !!customPreferences[specificKey];

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(key, opt.id)}
                className={`relative p-3 rounded-xl border cursor-pointer transition-all group flex flex-col justify-center min-h-[50px] ${
                  isActive 
                    ? `${colors.activeBorder} ${colors.activeBg} shadow-sm ring-1 ${colors.ring}` 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
                title={textForEditor}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-sm font-bold ${isActive ? colors.activeText : 'text-slate-700'}`}>
                    {opt.label[currentLang]}
                  </span>
                  
                  <button
                    onClick={(e) => openEditor(e, key, opt.id, opt.label[currentLang], textForEditor)}
                    className={`p-1.5 rounded-full transition-colors z-10
                      ${hasSavedTextForThisOption
                        ? 'text-amber-500 bg-amber-50 border border-amber-200' 
                        : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500' 
                      }
                    `}
                    title={t('actions.edit')}
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const groupTypes = [
      { id: 'couple', icon: Heart, label: t('profile.group_couple') },
      { id: 'family', icon: Users, label: t('profile.group_family') },
      { id: 'friends', icon: Coffee, label: t('profile.group_friends') },
      { id: 'other', icon: Briefcase, label: t('profile.group_other') }
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* 1. REISENDE & HEIMATORT */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Linke Spalte: Zahlen */}
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
             <Users className="w-3 h-3" /> {t('cockpit.travelers_label')}
           </label>
           <div className="flex gap-4 mb-4">
             <div className="flex-1">
               <label className="text-[10px] text-slate-400 block">{t('profile.adults')}</label>
               <input 
                 type="number" 
                 min="1"
                 className="w-full text-sm border-slate-300 rounded-md"
                 value={travelers.adults}
                 onChange={(e) => setTravelers({ adults: parseInt(e.target.value) || 1 })}
               />
             </div>
             <div className="flex-1">
               <label className="text-[10px] text-slate-400 block">{t('profile.children')}</label>
               <input 
                 type="number" 
                 min="0"
                 className="w-full text-sm border-slate-300 rounded-md"
                 value={travelers.children}
                 onChange={(e) => setTravelers({ children: parseInt(e.target.value) || 0 })}
               />
             </div>
           </div>
           
           {/* REISENDE NAMEN (Reisekasse) */}
           <div className="mt-4 animate-fade-in">
              <label className="text-[10px] text-slate-400 block mb-1">
                 {t('profile.traveler_names', { defaultValue: 'Namen der Reisenden (für Reisekasse)' })}
              </label>
              <input 
                type="text" 
                placeholder="z.B. Anna, Ben, Charlie"
                className="w-full text-sm border-slate-300 rounded-md placeholder:text-slate-300"
                value={travelers.travelerNames || ''}
                onChange={(e) => setTravelers({ travelerNames: e.target.value })}
              />
              <p className="text-[9px] text-slate-400 mt-1">Namen durch Komma trennen, um Ausgaben später aufzuteilen.</p>
           </div>
           
           {travelers.children > 0 && (
             <div className="mt-4 animate-fade-in">
               <label className="text-[10px] text-slate-400 block flex items-center gap-1">
                 <Baby className="w-3 h-3" /> {t('profile.age_children')}
               </label>
               <input 
                 type="text" 
                 placeholder="z.B. 4, 7, 12"
                 className="w-full text-sm border-slate-300 rounded-md"
                 value={travelers.ages || ''}
                 onChange={(e) => setTravelers({ ages: e.target.value })}
               />
             </div>
           )}
        </div>

        {/* Rechte Spalte: Gruppe & Heimat */}
        <div>
           {/* GRUPPEN-TYP */}
           <div className="mb-4">
               <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t('profile.group_title')}</label>
               <div className="flex flex-wrap gap-2">
                   {groupTypes.map(type => (
                       <button
                           key={type.id}
                           onClick={() => setTravelers({ groupType: type.id as any })}
                           className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                               travelers.groupType === type.id 
                               ? 'bg-blue-100 border-blue-400 text-blue-800' 
                               : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                           }`}
                       >
                           <type.icon className="w-3 h-3" />
                           {type.label}
                       </button>
                   ))}
               </div>
           </div>

           <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
                   <Home className="w-3 h-3" /> {t('profile.origin')}
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Berlin"
                  className="w-full text-sm border-slate-300 rounded-md"
                  value={travelers.origin}
                  onChange={(e) => setTravelers({ origin: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
                   <Flag className="w-3 h-3" /> {t('profile.nationality')}
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Deutsch"
                  className="w-full text-sm border-slate-300 rounded-md"
                  value={travelers.nationality || ''}
                  onChange={(e) => setTravelers({ nationality: e.target.value })}
                />
              </div>
           </div>
           <p className="text-[10px] text-slate-400 mt-2">
             {t('profile.origin_hint')}
           </p>
        </div>
      </div>

      {/* 2. OPTIONEN */}
      {renderOptionGrid('strategyId', STRATEGY_OPTIONS, strategyId, t('profile.options_strategy'), Map, "text-blue-500")}
      {renderOptionGrid('vibe', VIBE_OPTIONS, vibe, t('profile.options_vibe'), Sparkles, "text-amber-500")}
      {renderOptionGrid('budget', BUDGET_OPTIONS, budget, t('profile.options_budget'), Wallet, "text-green-600")}
      {renderOptionGrid('pace', PACE_OPTIONS, pace, t('profile.options_pace'), Gauge, "text-purple-500")}

      {/* --- EDITOR MODAL --- */}
      {editConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">
                <span className={
                    editConfig.key === 'vibe' ? 'text-amber-500' :
                    editConfig.key === 'budget' ? 'text-green-600' :
                    editConfig.key === 'pace' ? 'text-purple-500' : 'text-blue-600'
                }>
                    {editConfig.optionLabel}
                </span> {t('actions.edit')}
              </h3>
              <button onClick={() => setEditConfig(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t('profile.prompt_meaning')}</label>
              <textarea 
                className="w-full h-32 p-3 text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-slate-50 leading-relaxed shadow-inner"
                value={editConfig.currentText}
                onChange={(e) => setEditConfig({...editConfig, currentText: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-2">{t('profile.prompt_hint')}</p>
            </div>
            <div className="px-5 py-3 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setEditConfig(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">{t('actions.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm">{t('actions.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE 365 Zeilen ---
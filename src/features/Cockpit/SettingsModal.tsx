// src/features/Cockpit/SettingsModal.tsx
// 14.01.2026 14:15 - FIX: Corrected import casing 'data/Texts' (Linux support) and AiStrategy import.
// 14.01.2026 19:55 - UPDATE: Added Matrix UI & Clean Labels (Phase 1 Complete)
// 16.01.2026 05:45 - FIX: Switched TaskKey import to core/types to resolve TS2459/TS7053.
// 16.01.2026 18:00 - FEAT: Added UI for Chunking Limits (Auto vs Manual).
// 16.01.2026 19:15 - FEAT: Moved Chunking Limits into Matrix for granular control (V30 Parity).
// 16.01.2026 19:30 - FIX: Filtered Matrix to show only canonical V40 Workflow Keys.
// 16.01.2026 19:40 - FEAT: Added specialized helper agents (geoAnalyst, durationEstimator, etc.) to settings matrix.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Key, 
  HelpCircle, 
  BarChart3, 
  Activity, 
  Zap, 
  Cpu, 
  Settings, 
  Bug, 
  Check,
  Trash2,
  AlertTriangle,
  Server,
  Sliders, 
  Layers   
} from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import type { AiStrategy } from '../../store/useTripStore';
import { InfoModal } from '../Welcome/InfoModal';
import { getInfoText } from '../../data/Texts';
import type { LanguageCode, TaskKey } from '../../core/types';
import { CONFIG } from '../../data/config';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const { 
    apiKey, 
    setApiKey, 
    usageStats, 
    aiSettings, 
    setAiSettings,
    setTaskModel,
    resetModelOverrides,
    setTaskChunkLimit,
    resetChunkOverrides
  } = useTripStore();

  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoContent, setInfoContent] = useState({ title: '', content: '' });
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyInput(apiKey || '');
    }
  }, [isOpen, apiKey]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyInput(val);
    setApiKey(val);
  };

  const switchToManual = () => {
    setKeyInput('');
    setApiKey('');
  };

  const openHelpModal = () => {
    const currentLang = i18n.language.startsWith('en') ? 'en' : 'de';
    const textData = getInfoText('help', currentLang as LanguageCode);
    setInfoContent(textData);
    setInfoModalOpen(true);
  };

  if (!isOpen) return null;

  const strategies: Array<{ id: AiStrategy; label: string; icon: any; desc: string; color: string }> = [
    { 
      id: 'optimal', 
      label: t('settings.strategy_optimal', 'Optimal'), 
      icon: Activity, 
      desc: 'Mix aus Pro & Flash', 
      color: 'text-blue-600 bg-blue-50 border-blue-200' 
    },
    { 
      id: 'pro', 
      label: t('settings.strategy_pro', 'Pro'), 
      icon: Cpu, 
      desc: 'Gemini 1.5 Pro (Qualität)', 
      color: 'text-purple-600 bg-purple-50 border-purple-200' 
    },
    { 
      id: 'fast', 
      label: t('settings.strategy_fast', 'Fast'), 
      icon: Zap, 
      desc: 'Gemini 1.5 Flash (Speed)', 
      color: 'text-amber-600 bg-amber-50 border-amber-200' 
    }
  ];

  const modelStats = Object.entries(usageStats.byModel || {});

  // FIX: Definierte Liste der Keys für die Anzeige (Workflow Steps + Specialized Agents)
  const v40WorkflowTasks: TaskKey[] = [
    // --- Main Workflow ---
    'chefPlaner',
    'routeArchitect',
    'basis',
    'anreicherer',
    'dayplan',
    'transfers',
    'accommodation',
    'food',
    'guide',
    'details',
    'infos',
    'sondertage',
    
    // --- Specialized Agents / Helpers ---
    'geoAnalyst',
    'durationEstimator',
    'countryScout',
    'foodCollector',
    'foodEnricher'
  ];

  return (
    <>
      <InfoModal 
        isOpen={infoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
        title={infoContent.title} 
        content={infoContent.content} 
      />

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
          
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-500" />
              {t('settings.title', 'Einstellungen')}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
            
            <section>
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center justify-between">
                <span className="flex items-center gap-2"><Key className="w-4 h-4" /> Google Gemini API Key</span>
                {!apiKey && (
                  <span className="text-amber-600 text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    {t('settings.manual_mode_active', 'Manueller Modus aktiv')}
                  </span>
                )}
              </label>
              
              <div className="relative group">
                <input
                  type="password"
                  value={keyInput}
                  onChange={handleKeyChange}
                  placeholder="sk-..." 
                  className={`w-full pl-10 pr-12 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm text-slate-700 ${!apiKey ? 'border-amber-300' : 'border-slate-200'}`}
                />
                <div className="absolute left-3 top-3.5 text-slate-400">
                  <Key className="w-4 h-4" />
                </div>

                {keyInput && (
                  <button 
                    onClick={switchToManual}
                    title="Key löschen & auf manuell wechseln"
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex justify-between items-center">
                <button 
                  onClick={openHelpModal}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" /> {t('settings.help_link', 'Wo finde ich meinen Key?')}
                </button>

                {!apiKey && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{t('settings.copy_paste_mode', 'Copy & Paste Modus')}</span>
                  </div>
                )}
              </div>
            </section>

            <section>
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> {t('settings.stats_section', 'Verbrauch')}
              </label>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-slate-700">{usageStats.totalTokens.toLocaleString()}</span>
                  <span className="text-10px text-slate-400 uppercase tracking-wider mt-1">{t('settings.stats_tokens', 'Tokens')}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-slate-700">{usageStats.totalCalls}</span>
                  <span className="text-10px text-slate-400 uppercase tracking-wider mt-1">{t('settings.stats_calls', 'API Calls')}</span>
                </div>
              </div>

              {modelStats.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">Details nach Modell</div>
                    <div className="space-y-2">
                        {modelStats.map(([model, stats]) => (
                            <div key={model} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Server className="w-3 h-3 text-blue-400" />
                                    <span className="font-mono text-slate-600">{model}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                    <span>{stats.tokens.toLocaleString()} Tk</span>
                                    <span className="w-[1px] h-3 bg-slate-200"></span>
                                    <span>{stats.calls} Calls</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}
            </section>

            <section>
              <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                <Cpu className="w-4 h-4" /> {t('settings.model_section', 'KI Modell-Strategie')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {strategies.map((strat) => {
                  const isActive = aiSettings.strategy === strat.id;
                  return (
                    <button
                      key={strat.id}
                      onClick={() => { setAiSettings({ strategy: strat.id }); setShowMatrix(false); }}
                      className={`relative p-3 rounded-xl border text-left transition-all ${
                        isActive 
                          ? `${strat.color} ring-1 ring-offset-1 ring-blue-100 shadow-sm` 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <strat.icon className={`w-5 h-5 mb-2 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                      <div className="text-xs font-bold leading-tight">{strat.label}</div>
                      <div className="text-[10px] opacity-70 mt-1">{strat.desc}</div>
                      {isActive && (
                        <div className="absolute top-2 right-2 text-current">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* MATRIX ACCORDION */}
              {aiSettings.strategy === 'optimal' && (
                <div className="mt-4">
                    <button 
                        onClick={() => setShowMatrix(!showMatrix)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <span className="flex items-center gap-2"><Sliders className="w-3 h-3" /> Konfiguration anpassen (Matrix)</span>
                        <span className={`transform transition-transform ${showMatrix ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {showMatrix && (
                        <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden animate-fade-in">
                            
                            <div className="bg-slate-100 px-4 py-2 text-[10px] uppercase font-bold text-slate-500 grid grid-cols-12 gap-2">
                                <span className="col-span-4">Task / Workflow</span>
                                <span className="col-span-4 text-center">Modell</span>
                                <span className="col-span-4 text-center flex items-center justify-center gap-1">
                                   <Layers className="w-3 h-3" /> Batch (Auto/Man)
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {v40WorkflowTasks.map(taskKey => {
                                    const defaultModel = CONFIG.taskRouting.defaults[taskKey];
                                    const currentOverride = aiSettings.modelOverrides?.[taskKey];
                                    const activeModel = currentOverride || defaultModel;
                                    
                                    const chunkDefaults = CONFIG.taskRouting.chunkDefaults?.[taskKey] || { auto: 10, manual: 20 };
                                    const chunkOverrides = aiSettings.chunkOverrides?.[taskKey] || {};
                                    
                                    const activeAuto = chunkOverrides.auto;
                                    const activeManual = chunkOverrides.manual;

                                    const label = taskKey.charAt(0).toUpperCase() + taskKey.slice(1);

                                    return (
                                        <div key={taskKey} className="px-4 py-3 bg-white grid grid-cols-12 gap-2 items-center">
                                            {/* TASK LABEL */}
                                            <div className="col-span-4">
                                                <div className="text-xs font-medium text-slate-700 truncate" title={taskKey}>
                                                    {label}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                    Def: <span className="uppercase">{defaultModel}</span>
                                                </div>
                                            </div>

                                            {/* MODEL SWITCH */}
                                            <div className="col-span-4 flex justify-center">
                                                <div className="flex bg-slate-100 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => setTaskModel(taskKey, 'pro')}
                                                        className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                                                            activeModel === 'pro' 
                                                            ? 'bg-purple-100 text-purple-700 shadow-sm' 
                                                            : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        PRO
                                                    </button>
                                                    <button
                                                        onClick={() => setTaskModel(taskKey, 'flash')}
                                                        className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                                                            activeModel === 'flash' 
                                                            ? 'bg-amber-100 text-amber-700 shadow-sm' 
                                                            : 'text-slate-400 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        FLASH
                                                    </button>
                                                </div>
                                            </div>

                                            {/* CHUNK LIMITS */}
                                            <div className="col-span-4 flex gap-1 justify-end">
                                                <input 
                                                    type="number" 
                                                    placeholder={chunkDefaults.auto.toString()}
                                                    value={activeAuto || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setTaskChunkLimit(taskKey, 'auto', isNaN(val) ? 0 : val);
                                                    }}
                                                    className={`w-12 text-[10px] p-1 border rounded text-center outline-none focus:ring-1 focus:ring-blue-500 ${
                                                        activeAuto ? 'bg-blue-50 border-blue-200 font-bold text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                    }`}
                                                    title={`API Auto Limit (Default: ${chunkDefaults.auto})`}
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder={chunkDefaults.manual.toString()}
                                                    value={activeManual || ''}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setTaskChunkLimit(taskKey, 'manual', isNaN(val) ? 0 : val);
                                                    }}
                                                    className={`w-12 text-[10px] p-1 border rounded text-center outline-none focus:ring-1 focus:ring-blue-500 ${
                                                        activeManual ? 'bg-amber-50 border-amber-200 font-bold text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                                    }`}
                                                    title={`Manual Limit (Default: ${chunkDefaults.manual})`}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="bg-slate-50 px-4 py-2 flex justify-between items-center border-t border-slate-100">
                                <button onClick={resetChunkOverrides} className="text-[10px] text-slate-400 hover:text-slate-600 hover:underline">
                                    Limits zurücksetzen
                                </button>
                                <button onClick={resetModelOverrides} className="text-[10px] text-red-400 hover:text-red-600 hover:underline">
                                    Modelle zurücksetzen
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              )}
            </section>

            <section>
              <div 
                onClick={() => setAiSettings({ debug: !aiSettings.debug })}
                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${aiSettings.debug ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Bug className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{t('settings.debug_label', 'Debug-Modus (Flugschreiber)')}</span>
                </div>
                
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiSettings.debug ? 'bg-red-500' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiSettings.debug ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </div>
            </section>

          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {t('settings.btn_apply', 'Übernehmen')}
            </button>
          </div>

        </div>
      </div>
    </>
  );
};
// --- END OF FILE 418 Zeilen ---
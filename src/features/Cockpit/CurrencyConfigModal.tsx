// 22.02.2026 11:15 - FEAT: Added CurrencyConfigModal to manage base currency and up to 4 target currencies with auto-fetch and bank-spread.
// src/features/Cockpit/CurrencyConfigModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Landmark, Info } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import type { CurrencyRate, CurrencyConfig } from '../../core/types/shared';

const COMMON_CURRENCIES = [
    'EUR', 'USD', 'CHF', 'GBP', 'AUD', 'CAD', 'JPY', 'SEK', 'NOK', 
    'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'AED', 'THB', 'SGD', 'IDR', 
    'MYR', 'VND', 'PHP', 'ZAR', 'COP', 'BRL', 'MXN', 'ARS'
];

interface CurrencyConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CurrencyConfigModal: React.FC<CurrencyConfigModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { project, setProject } = useTripStore();
    
    // State für Zeile 1
    const [baseCurrency, setBaseCurrency] = useState('EUR');
    
    // State für Zeilen 2-5
    const [targets, setTargets] = useState<{ currency: string; rate: string }[]>([
        { currency: '', rate: '' },
        { currency: '', rate: '' },
        { currency: '', rate: '' },
        { currency: '', rate: '' }
    ]);
    
    const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
    const [isFetching, setIsFetching] = useState(false);

    // Lade initialen State aus dem Store
    useEffect(() => {
        if (isOpen) {
            const config = project.data.currencyConfig as CurrencyConfig | undefined;
            if (config) {
                setBaseCurrency(config.baseCurrency || 'EUR');
                const loadedTargets = [...config.rates];
                // Fülle auf 4 auf, damit immer 4 Zeilen da sind
                while (loadedTargets.length < 4) {
                    loadedTargets.push({ currency: '', rate: 0 });
                }
                setTargets(loadedTargets.slice(0, 4).map(t => ({
                    currency: t.currency,
                    rate: t.rate ? t.rate.toString() : ''
                })));
                setLastUpdated(config.lastUpdated);
            }
        }
    }, [isOpen, project.data.currencyConfig]);

    const handleTargetChange = (index: number, field: 'currency' | 'rate', value: string) => {
        const newTargets = [...targets];
        newTargets[index] = { ...newTargets[index], [field]: value };
        // Wenn man die Währung löscht, lösche auch den Kurs
        if (field === 'currency' && !value) {
            newTargets[index].rate = '';
        }
        setTargets(newTargets);
    };

    const fetchRates = async () => {
        setIsFetching(true);
        try {
            // Nutze eine kostenlose, offene API ohne Key (ExchangeRate-API)
            const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
            if (!response.ok) throw new Error('API Response not OK');
            const data = await response.json();
            
            if (data && data.rates) {
                const updatedTargets = targets.map(t => {
                    if (t.currency && data.rates[t.currency]) {
                        // Reiner API-Kurs
                        const rawRate = data.rates[t.currency];
                        // Banken-Spread / Kreditkartengebühr (z.B. 1.75% Aufschlag für den Nutzer)
                        // Wenn ich 1 EUR in USD tausche, kriege ich weniger USD als der Mittelkurs sagt.
                        const bankRate = rawRate * 0.9825; 
                        return { ...t, rate: bankRate.toFixed(4) };
                    }
                    return t;
                });
                setTargets(updatedTargets);
                setLastUpdated(new Date().toISOString());
            }
        } catch (error) {
            console.error("Fehler beim Abrufen der Kurse:", error);
            alert(t('finance.error_fetch_rates', { defaultValue: 'Die Kurse konnten nicht abgerufen werden. Bitte prüfen Sie Ihre Internetverbindung.' }));
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = () => {
        const validRates: CurrencyRate[] = targets
            .filter(t => t.currency && parseFloat(t.rate) > 0)
            .map(t => ({
                currency: t.currency,
                rate: parseFloat(t.rate)
            }));

        const newConfig: CurrencyConfig = {
            baseCurrency,
            rates: validRates,
            lastUpdated
        };

        setProject({
            ...project,
            data: {
                ...project.data,
                currencyConfig: newConfig
            }
        });
        
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-blue-600"/>
                        {t('finance.currency_config_title', { defaultValue: 'Währungen konfigurieren' })}
                    </span>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1.5 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                </div>

                {/* CONTENT */}
                <div className="p-5 overflow-y-auto space-y-6">
                    
                    {/* INFO BOX */}
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-3 text-sm text-blue-800 leading-relaxed shadow-sm">
                        <Info className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                        <div>
                            <p>{t('finance.currency_info', { defaultValue: 'Zeile 1 ist Ihre Hauptwährung für die Abrechnung. Die Zeilen 2-5 stehen als Zahlungs-Währungen bei Ausgaben zur Verfügung. Beim automatischen Abruf rechnen wir einen typischen Banken-/Kreditkarten-Aufschlag von 1,75% mit ein.' })}</p>
                        </div>
                    </div>

                    {/* ZEILE 1: HAUPTWÄHRUNG */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">
                            {t('finance.row_1_label', { defaultValue: 'Zeile 1: Hauptwährung (Basis)' })}
                        </label>
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                            <select 
                                value={baseCurrency} 
                                onChange={e => setBaseCurrency(e.target.value)} 
                                className="w-32 text-base font-black text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-blue-500 shadow-sm cursor-pointer"
                            >
                                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="flex-1 text-sm font-bold text-slate-500 px-2">
                                1.0000 (Basis)
                            </div>
                        </div>
                    </div>

                    {/* ZEILEN 2-5: NEBENWÄHRUNGEN */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">
                            {t('finance.row_target_label', { defaultValue: 'Zeilen 2-5: Fremdwährungen & Kurse' })}
                        </label>
                        {targets.map((target, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <select 
                                    value={target.currency} 
                                    onChange={e => handleTargetChange(idx, 'currency', e.target.value)} 
                                    className="w-32 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:ring-blue-500 shadow-sm cursor-pointer"
                                >
                                    <option value="">-- {t('actions.none', { defaultValue: 'Keine' })} --</option>
                                    {COMMON_CURRENCIES.filter(c => c !== baseCurrency).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">=</span>
                                    <input 
                                        type="number" 
                                        step="0.0001" 
                                        placeholder="Kurs..." 
                                        value={target.rate} 
                                        onChange={e => handleTargetChange(idx, 'rate', e.target.value)} 
                                        disabled={!target.currency}
                                        className="w-full text-sm font-bold pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-blue-500 bg-white shadow-sm disabled:bg-slate-50 disabled:text-slate-400" 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* AUTO-FETCH BUTTON */}
                    <div className="pt-2">
                        <button 
                            onClick={fetchRates} 
                            disabled={isFetching || targets.filter(t => t.currency).length === 0}
                            className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> 
                            {isFetching ? t('finance.fetching_rates', { defaultValue: 'Hole Bankenkurse...' }) : t('finance.fetch_rates', { defaultValue: 'Aktuelle Bankenkurse abrufen' })}
                        </button>
                        {lastUpdated && (
                            <div className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                                {t('finance.last_updated', { defaultValue: 'Zuletzt aktualisiert' })}: {new Date(lastUpdated).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                     <button onClick={handleSave} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-all shadow-md flex justify-center items-center gap-2">
                        <Save className="w-4 h-4"/> {t('finance.save_currencies', { defaultValue: 'Währungen speichern' })}
                     </button>
                </div>

            </div>
        </div>
    );
};
// --- END OF FILE 190 Zeilen ---
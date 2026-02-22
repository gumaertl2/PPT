// 22.02.2026 13:40 - FIX: Prevented standalone button from completely hiding on mobile when used in headers.
// 22.02.2026 13:00 - FIX: Corrected import path for 'Place' to fix Vercel build error.
// src/features/Cockpit/ExpenseEntryButton.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, X, Users, CheckCircle2, Save, MapPin, PenLine } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import type { Expense, CurrencyConfig } from '../../core/types/shared';
import type { Place } from '../../core/types';

export type ExpenseButtonMode = 'sight' | 'planner' | 'diary' | 'standalone';

interface ExpenseEntryButtonProps {
    placeId?: string;
    defaultTitle?: string;
    defaultLocation?: { lat: number, lng: number } | null;
    travelers: string;
    mode: ExpenseButtonMode;
    isMobile?: boolean; 
    forceOpen?: boolean; 
    onClose?: () => void;
}

export const ExpenseEntryButton: React.FC<ExpenseEntryButtonProps> = ({ 
    placeId, 
    defaultTitle = '', 
    defaultLocation = null,
    travelers, 
    mode, 
    isMobile,
    forceOpen = false,
    onClose
}) => {
    const { addExpense, project, setProject } = useTripStore();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(forceOpen);
    
    const currencyConfig = project.data.currencyConfig as CurrencyConfig | undefined;
    const availableCurrencies = useMemo(() => {
        if (!currencyConfig) return ['EUR'];
        const curs = [currencyConfig.baseCurrency];
        currencyConfig.rates.forEach(r => {
            if (r.currency && !curs.includes(r.currency)) {
                curs.push(r.currency);
            }
        });
        return curs;
    }, [currencyConfig]);

    const [customTitle, setCustomTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(availableCurrencies[0]);
    
    const names = (travelers || '').split(',').map(n => n.trim()).filter(Boolean);
    const [paidBy, setPaidBy] = useState('');
    const [splitMode, setSplitMode] = useState<'equal'|'exact'>('equal');
    const [splitAmong, setSplitAmong] = useState<string[]>([]);
    const [splitExact, setSplitExact] = useState<Record<string, string>>({});
    const [showSplit, setShowSplit] = useState(false);

    const [location, setLocation] = useState<{lat: number, lng: number} | null>(defaultLocation);
    const [isFetchingGPS, setIsFetchingGPS] = useState(false);

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            if (defaultLocation) setLocation(defaultLocation);
            if (!availableCurrencies.includes(currency)) setCurrency(availableCurrencies[0]);
        }
    }, [forceOpen, defaultLocation, availableCurrencies, currency]);

    const expenses = Object.values(project.data.expenses || {}).filter((e: Expense) => 
        (placeId && e.placeId === placeId) || (!placeId && e.title === defaultTitle)
    ) as Expense[];
    
    const totalSpent = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

    const handleFetchGPS = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFetchingGPS(true);
        if (!navigator.geolocation) {
            alert(t('finance.error_no_gps', { defaultValue: 'Dein Browser unterstützt kein GPS.' }));
            setIsFetchingGPS(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsFetchingGPS(false);
            },
            (err) => {
                console.error(err);
                alert(t('finance.error_gps_failed', { defaultValue: 'GPS konnte nicht abgerufen werden.' }));
                setIsFetchingGPS(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const calculateRemaining = () => {
        const total = parseFloat(amount.replace(',', '.')) || 0;
        if (total <= 0) return 0;
        let currentSum = 0;
        Object.values(splitExact).forEach(val => {
            const num = parseFloat(val.replace(',', '.')) || 0;
            if (num > 0) currentSum += num;
        });
        return total - currentSum;
    };

    const handleToggle = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!isOpen) { 
            setCustomTitle(''); 
            setAmount(''); 
            setCurrency(availableCurrencies[0]);
            setPaidBy(names.length > 0 ? names[0] : ''); 
            setSplitMode('equal'); 
            setSplitAmong(names); 
            setSplitExact({}); 
            setShowSplit(false); 
            setLocation(defaultLocation);
            setIsFetchingGPS(false);
        } else {
            if (onClose) onClose();
        }
        setIsOpen(!isOpen);
    };

    const handleSave = (e: React.MouseEvent, alsoToDiary: boolean = false) => {
        e.stopPropagation();
        const numAmount = parseFloat(amount.replace(',', '.'));
        const finalTitle = mode === 'standalone' ? (customTitle.trim() || defaultTitle) : defaultTitle;
        
        if (!finalTitle || isNaN(numAmount) || numAmount <= 0 || !paidBy) return;

        let finalSplitExact: Record<string, number> | undefined = undefined;
        if (splitMode === 'exact') {
            let sum = 0; 
            const exactData: Record<string, number> = {};
            for (const n of names) {
                const val = parseFloat((splitExact[n] || '').replace(',', '.'));
                if (!isNaN(val) && val > 0) { exactData[n] = val; sum += val; }
            }
            if (Math.abs(sum - numAmount) > 0.05) { 
                alert(t('finance.error_split_sum', { defaultValue: 'Summe der Aufteilung entspricht nicht dem Gesamtbetrag!' })); 
                return; 
            }
            finalSplitExact = exactData;
        }

        addExpense({ 
            id: uuidv4(), 
            placeId: mode === 'standalone' ? undefined : placeId, 
            title: finalTitle, 
            amount: numAmount, 
            currency, 
            paidBy, 
            splitAmong: splitAmong.length > 0 ? splitAmong : names, 
            splitExact: finalSplitExact, 
            timestamp: Date.now(),
            location: location || undefined
        });

        if (alsoToDiary) {
            const newId = `custom_${uuidv4()}`;
            const newPlace: Place = {
                id: newId, 
                name: finalTitle, 
                category: 'custom_diary',
                visited: true, 
                visitedAt: new Date().toISOString(), 
                userNote: `${t('finance.expense', { defaultValue: 'Ausgabe' })}: ${numAmount} ${currency}`,
                location: location || undefined
            };
            setProject({ ...project, data: { ...project.data, places: { ...project.data.places, [newId]: newPlace } } });
        }

        setIsOpen(false);
        if (onClose) onClose();
    };

    const renderTriggerButton = () => {
        if (forceOpen) return null; 
        
        if (mode === 'standalone') {
            // FIX: Ensure button is visible when isMobile is explicitly requested
            const btnClass = isMobile 
                ? "flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors" 
                : "flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors";
            
            return (
                <button onClick={handleToggle} className={`${btnClass} ${isOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'}`}>
                    <Banknote size={isMobile ? 16 : 14} /> 
                    <span className={isMobile ? "hidden xs:inline" : ""}>{t('finance.expense', { defaultValue: 'Ausgabe' })}</span>
                </button>
            );
        }

        if (mode === 'diary') {
            return (
                <button onClick={handleToggle} className={`p-1.5 rounded transition-colors shadow-sm border ${totalSpent > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'}`} title={totalSpent > 0 ? `${totalSpent.toFixed(2)} ${expenses[0]?.currency || 'EUR'}` : t('finance.add_expense', { defaultValue: 'Ausgabe erfassen' })}>
                    <Banknote size={12} />
                </button>
            );
        }

        const isSight = mode === 'sight';
        return (
            <button onClick={handleToggle} className={`flex items-center gap-1 text-[10px] font-bold ${isSight ? 'px-1.5 py-1' : 'px-2 py-0.5'} rounded transition-all shrink-0 border shadow-sm ${totalSpent > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'}`} title={t('finance.add_expense', { defaultValue: 'Ausgabe erfassen' })}>
                <Banknote className="w-3 h-3" /> 
                <span className="hidden sm:inline">
                    {totalSpent > 0 ? `${totalSpent.toFixed(2)} ${expenses[0]?.currency || 'EUR'}` : t('finance.expense', { defaultValue: 'Ausgabe' })}
                </span>
            </button>
        );
    };

    return (
        // FIX: Removed 'hidden sm:block' if mode is standalone AND isMobile is true
        <div className={`relative ${mode === 'standalone' && isMobile ? 'shrink-0' : mode === 'standalone' ? 'hidden sm:block' : 'shrink-0'} no-print`}>
            {renderTriggerButton()}

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => handleToggle()}>
                    <div className="bg-emerald-50 w-full max-w-sm max-h-[90dvh] rounded-2xl shadow-2xl border border-emerald-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        
                        <div className="flex justify-between items-center p-4 border-b border-emerald-100/50 bg-emerald-100/30 shrink-0">
                            <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Banknote className="w-4 h-4"/>
                                {mode === 'standalone' ? t('finance.add_expense', { defaultValue: 'Kosten erfassen' }) : (defaultTitle || t('finance.new_expense', { defaultValue: 'Neue Ausgabe' }))}
                            </span>
                            <button onClick={() => handleToggle()} className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-200 p-1.5 rounded-full transition-colors"><X className="w-4 h-4"/></button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-4">
                            
                            {(mode === 'standalone' || forceOpen) && (
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.purpose', { defaultValue: 'Verwendungszweck' })}</label>
                                    <input type="text" placeholder={t('finance.purpose_placeholder', { defaultValue: 'z.B. Supermarkt, Taxi...' })} value={customTitle || defaultTitle} onChange={e => setCustomTitle(e.target.value)} className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 shadow-sm" />
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 text-lg font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 shadow-sm" />
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24 text-sm font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 cursor-pointer shadow-sm">
                                    {availableCurrencies.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <button 
                                    onClick={handleFetchGPS} 
                                    className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl transition-all border shadow-sm ${location ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <MapPin size={16} className={isFetchingGPS ? 'animate-bounce text-emerald-500' : ''} /> 
                                    {isFetchingGPS ? t('finance.gps_fetching', { defaultValue: 'Ortung läuft...' }) : location ? t('finance.gps_saved', { defaultValue: 'Standort gespeichert ✓' }) : t('finance.gps_tag', { defaultValue: 'Aktuellen Standort (GPS) taggen' })}
                                </button>
                            </div>

                            {names.length === 0 ? (
                                <div className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed shadow-inner">
                                    {t('finance.error_no_names', { defaultValue: 'Bitte hinterlege im Planer (Schritt: "Wer & Wie") zuerst die Namen der Reisenden.' })}
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.paid_by', { defaultValue: 'Wer hat bezahlt?' })}</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {names.map(n => (
                                                <button key={n} onClick={(e) => { e.stopPropagation(); setPaidBy(n); }} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${paidBy === n ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}>{n}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <button onClick={(e) => { e.stopPropagation(); setShowSplit(!showSplit); }} className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-2 rounded-lg border border-emerald-200/50 hover:bg-emerald-100 transition-colors w-full">
                                            <Users className="w-3.5 h-3.5" /> 
                                            {t('finance.split_among', { defaultValue: 'Aufgeteilt auf:' })} {splitMode === 'exact' ? t('finance.exact', { defaultValue: 'Exakt' }) : (splitAmong.length === names.length ? t('finance.everyone', { defaultValue: 'Alle' }) : `${splitAmong.length} ${t('finance.persons', { defaultValue: 'Personen' })}`)} ✎
                                        </button>
                                        
                                        {showSplit && (
                                            <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                <div className="flex bg-emerald-50 border border-emerald-100 rounded-lg mb-3 p-1">
                                                    <button onClick={(e) => { e.stopPropagation(); setSplitMode('equal'); }} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${splitMode === 'equal' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.equal', { defaultValue: 'Gleichmäßig' })}</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setSplitMode('exact'); }} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${splitMode === 'exact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.exact', { defaultValue: 'Exakter Betrag' })}</button>
                                                </div>

                                                {splitMode === 'equal' ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {names.map(n => {
                                                            const active = splitAmong.includes(n);
                                                            return <button key={n} onClick={(e) => { e.stopPropagation(); if(active) setSplitAmong(prev => prev.filter(x => x !== n)); else setSplitAmong(prev => [...prev, n]); }} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-emerald-500 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{n} {active && '✓'}</button>;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {names.map(n => (
                                                            <div key={n} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                <span className="text-xs font-bold text-slate-700 ml-1">{n}</span>
                                                                <div className="relative w-24">
                                                                    <input type="number" step="0.01" value={splitExact[n] || ''} onChange={e => setSplitExact(prev => ({...prev, [n]: e.target.value}))} className="w-full text-right text-sm pr-8 pl-2 py-1.5 border border-emerald-200 rounded-md focus:ring-emerald-500 bg-white" onClick={e => e.stopPropagation()}/>
                                                                    <span className="absolute right-2 top-2 text-slate-400 text-[10px] font-bold">{currency}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(() => {
                                                            const rem = calculateRemaining();
                                                            const isPerfect = Math.abs(rem) < 0.01;
                                                            return (
                                                                <div className={`mt-3 p-2 rounded-lg flex items-center justify-between text-xs font-bold border ${isPerfect ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : rem < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    <span>{isPerfect ? t('finance.split_perfect', { defaultValue: 'Aufteilung stimmt!' }) : rem > 0 ? t('finance.split_remaining', { defaultValue: 'Noch zu verteilen:' }) : t('finance.split_too_much', { defaultValue: 'Zu viel verteilt:' })}</span>
                                                                    <span className="flex items-center gap-1">{isPerfect && <CheckCircle2 className="w-4 h-4" />}{Math.abs(rem).toFixed(2)}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 bg-emerald-100/50 border-t border-emerald-200/50 flex flex-col gap-2 shrink-0">
                             <button onClick={(e) => handleSave(e, true)} className="w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-all flex justify-center items-center gap-2">
                                <PenLine className="w-3.5 h-3.5"/> {t('finance.save_and_diary', { defaultValue: 'Speichern & Notiz anlegen' })}
                             </button>
                             <button onClick={(e) => handleSave(e, false)} disabled={(!amount && mode !== 'standalone') || (mode === 'standalone' && !customTitle.trim()) || isNaN(parseFloat(amount)) || !paidBy || (splitMode==='equal' && splitAmong.length === 0)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                <Save className="w-4 h-4"/> {t('finance.save', { defaultValue: 'Speichern' })}
                             </button>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
// --- END OF FILE 348 Zeilen ---
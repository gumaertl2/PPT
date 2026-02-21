// 21.02.2026 14:45 - REFACTOR: Centralized Expense Entry logic to prevent code duplication.
// src/features/Cockpit/ExpenseEntryButton.tsx

import React, { useState } from 'react';
import { Banknote, X, Users, CheckCircle2 } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { v4 as uuidv4 } from 'uuid';

export type ExpenseButtonMode = 'sight' | 'planner' | 'diary' | 'standalone';

interface ExpenseEntryButtonProps {
    placeId?: string;
    defaultTitle?: string;
    travelers: string;
    mode: ExpenseButtonMode;
    isMobile?: boolean; // For standalone styling
}

export const ExpenseEntryButton: React.FC<ExpenseEntryButtonProps> = ({ 
    placeId, 
    defaultTitle = '', 
    travelers, 
    mode, 
    isMobile 
}) => {
    const { addExpense, project } = useTripStore();
    const [isOpen, setIsOpen] = useState(false);
    
    // Form State
    const [customTitle, setCustomTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EUR');
    
    const names = (travelers || '').split(',').map(n => n.trim()).filter(Boolean);
    const [paidBy, setPaidBy] = useState('');
    const [splitMode, setSplitMode] = useState<'equal'|'exact'>('equal');
    const [splitAmong, setSplitAmong] = useState<string[]>([]);
    const [splitExact, setSplitExact] = useState<Record<string, string>>({});
    const [showSplit, setShowSplit] = useState(false);

    // Calculate total spent for this specific place/activity
    const expenses = Object.values(project.data.expenses || {}).filter((e: any) => 
        (placeId && e.placeId === placeId) || (!placeId && e.title === defaultTitle)
    );
    const totalSpent = expenses.reduce((sum, e: any) => sum + e.amount, 0);

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

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen) { 
            setCustomTitle(''); 
            setAmount(''); 
            setPaidBy(names.length > 0 ? names[0] : ''); 
            setSplitMode('equal'); 
            setSplitAmong(names); 
            setSplitExact({}); 
            setShowSplit(false); 
        }
        setIsOpen(!isOpen);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        const numAmount = parseFloat(amount.replace(',', '.'));
        const finalTitle = mode === 'standalone' ? customTitle.trim() : defaultTitle;
        
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
                alert("Summe der Aufteilung entspricht nicht dem Gesamtbetrag!"); 
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
            timestamp: Date.now() 
        });
        setIsOpen(false);
    };

    // --- BUTTON RENDERING LOGIC ---
    const renderTriggerButton = () => {
        if (mode === 'standalone') {
            const btnClass = isMobile 
                ? "w-full flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors" 
                : "flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors";
            
            return (
                <button onClick={handleToggle} className={`${btnClass} ${isOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'}`}>
                    <Banknote size={isMobile ? 16 : 14} /> Ausgabe
                </button>
            );
        }

        if (mode === 'diary') {
            return (
                <button onClick={handleToggle} className={`p-1.5 rounded transition-colors shadow-sm border ${totalSpent > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'}`} title={totalSpent > 0 ? `${totalSpent.toFixed(2)} ${expenses[0]?.currency || 'EUR'}` : 'Ausgabe erfassen'}>
                    <Banknote size={12} />
                </button>
            );
        }

        // 'sight' | 'planner'
        const isSight = mode === 'sight';
        return (
            <button onClick={handleToggle} className={`flex items-center gap-1 text-[10px] font-bold ${isSight ? 'px-1.5 py-1' : 'px-2 py-0.5'} rounded transition-all shrink-0 border shadow-sm ${totalSpent > 0 && !isSight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'}`} title="Ausgabe erfassen (Reisekasse)">
                <Banknote className="w-3 h-3" /> 
                <span className="hidden sm:inline">
                    {totalSpent > 0 && !isSight ? `${totalSpent.toFixed(2)} ${expenses[0]?.currency || 'EUR'}` : 'Kosten'}
                </span>
            </button>
        );
    };

    return (
        <div className={`relative ${mode === 'standalone' && isMobile ? 'flex-1' : mode === 'standalone' ? 'hidden sm:block' : 'shrink-0'} no-print`}>
            {renderTriggerButton()}

            {isOpen && (
                <div className={`absolute top-full mt-2 w-[calc(100vw-32px)] sm:w-72 max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] p-4 text-slate-800 cursor-default animate-in fade-in slide-in-from-top-2 ${isMobile ? 'left-0' : 'right-0'}`} onClick={e => e.stopPropagation()}>
                    
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Banknote className="w-3.5 h-3.5"/>
                            {mode === 'standalone' ? 'Kosten erfassen' : (defaultTitle || 'Neue Ausgabe')}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1 rounded-full transition-colors"><X className="w-3.5 h-3.5"/></button>
                    </div>

                    {mode === 'standalone' && (
                        <input type="text" placeholder="Wofür? (z.B. Supermarkt, Taxi)" value={customTitle} onChange={e => setCustomTitle(e.target.value)} className="w-full text-sm font-bold border-slate-300 rounded-lg p-2 mb-3 bg-slate-50 focus:ring-emerald-500" />
                    )}

                    <div className="flex gap-2 mb-4">
                        <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="flex-1 text-lg font-bold border-slate-300 rounded-lg p-2 focus:ring-emerald-500 bg-slate-50" />
                        <input type="text" placeholder="EUR" value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} className="w-20 text-sm font-bold border-slate-300 rounded-lg bg-slate-50 focus:ring-emerald-500 text-center" />
                    </div>

                    {names.length === 0 ? (
                        <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-3 leading-tight">Bitte hinterlege im Planer (Schritt: "Wer & Wie") zuerst die Namen der Reisenden.</div>
                    ) : (
                        <>
                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Wer hat bezahlt?</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {names.map(n => (
                                        <button key={n} onClick={(e) => { e.stopPropagation(); setPaidBy(n); }} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${paidBy === n ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-5">
                                <button onClick={(e) => { e.stopPropagation(); setShowSplit(!showSplit); }} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                    <Users className="w-3 h-3" /> Aufgeteilt auf: {splitMode === 'exact' ? 'Exakt' : (splitAmong.length === names.length ? 'Alle' : `${splitAmong.length} Personen`)} ✎
                                </button>
                                
                                {showSplit && (
                                    <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex bg-white border border-slate-200 rounded-md mb-2 p-0.5">
                                            <button onClick={(e) => { e.stopPropagation(); setSplitMode('equal'); }} className={`flex-1 text-[10px] py-1 rounded font-bold transition-colors ${splitMode === 'equal' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}>Gleichmäßig</button>
                                            <button onClick={(e) => { e.stopPropagation(); setSplitMode('exact'); }} className={`flex-1 text-[10px] py-1 rounded font-bold transition-colors ${splitMode === 'exact' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}>Exakter Betrag</button>
                                        </div>

                                        {splitMode === 'equal' ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {names.map(n => {
                                                    const active = splitAmong.includes(n);
                                                    return <button key={n} onClick={(e) => { e.stopPropagation(); if(active) setSplitAmong(prev => prev.filter(x => x !== n)); else setSplitAmong(prev => [...prev, n]); }} className={`px-2 py-1 rounded text-[10px] font-bold border ${active ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200'}`}>{n} {active && '✓'}</button>;
                                                })}
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {names.map(n => (
                                                    <div key={n} className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-slate-600">{n}</span>
                                                        <div className="relative w-20">
                                                            <input type="number" step="0.01" value={splitExact[n] || ''} onChange={e => setSplitExact(prev => ({...prev, [n]: e.target.value}))} className="w-full text-right text-[10px] pr-6 pl-1 py-1 border border-slate-200 rounded focus:ring-emerald-500" onClick={e => e.stopPropagation()}/>
                                                            <span className="absolute right-1.5 top-1 text-slate-400 text-[9px]">{currency}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(() => {
                                                    const rem = calculateRemaining();
                                                    const isPerfect = Math.abs(rem) < 0.01;
                                                    return (
                                                        <div className={`mt-2 p-1.5 rounded flex items-center justify-between text-[10px] font-bold ${isPerfect ? 'bg-emerald-100 text-emerald-700' : rem < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            <span>{isPerfect ? 'Stimmt!' : rem > 0 ? 'Noch zu verteilen:' : 'Zu viel verteilt:'}</span>
                                                            <span className="flex items-center gap-1">{isPerfect && <CheckCircle2 className="w-3 h-3" />}{Math.abs(rem).toFixed(2)}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleSave} disabled={(!amount && mode !== 'standalone') || (mode === 'standalone' && !customTitle.trim()) || isNaN(parseFloat(amount)) || !paidBy || (splitMode==='equal' && splitAmong.length === 0)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 shadow-sm">Speichern</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
// --- END OF FILE 219 Zeilen ---
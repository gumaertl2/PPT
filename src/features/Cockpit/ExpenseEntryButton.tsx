// [2026-11-18] [16:56] - UX: Top-aligned mobile dialog (items-start pt-2) and placed compact '+ Notiz' + 'Speichern' side by side so Save always stays above iOS keyboard/Safari bar.
// [2026-11-18] [16:43] - UX: Optimized mobile/desktop expense entry (clear '×' button on title, collapsible date chip, iOS decimal numpad, 1-tap/Enter submit, smart autofocus).
// [2026-11-18] [11:43] - FEAT: Added defaultAmount/defaultCurrency prefill support and full customTitle editability for iOS Shortcut quick-add.
// [2026-11-17] [17:01] - UX: Enlarged desktop modal width/height (sm:max-w-md max-h-[94dvh]) while keeping mobile compact.
// [2026-11-17] [16:51] - UX: Prefilled exact split amounts from current equal/weighted distribution when switching to 'Exakt'.
// [2026-11-17] [16:46] - UX: Showed sorted participant names instead of anonymous count in split toggle label.
// [2026-11-17] [16:26] - UX: Consistently sorted traveler names with active identity first followed by A-Z.
// [2026-11-17] [16:19] - UX: Added live per-person preview for equal splits in expense entry button and toggle label.
// [2026-11-17] [15:14] - UX: Upgraded header GPS icon to a clear status badge (GPS ✓ / GPS… / Ohne GPS) while keeping zero-friction saving.
// [2026-11-17] [15:10] - UX/FIX: Increased GPS timeout to 10s and added automatic low-accuracy (WiFi/cell) fallback on non-permission geolocation failure.
// [2026-11-17] [12:56] - FIX: Scoped local cash identity lookup to roomId || project.meta.id.
// [2026-11-17] [12:52] - FIX: Handled addedNames array from addTravelerSafe for comma-separated entries.
// [2026-11-17] [12:45] - FEAT: Pre-filled default expense weights ('defaultExpenseWeights') and auto-selected 'weights' split mode when configured.
// [2026-11-17] [12:12] - FEAT: Added weighted shares ('splitWeights') and partial settlement ('Rückzahlung') mode in ExpenseEntryButton.
// [2026-11-17] [12:00] - FIX: Replaced invalid 'hidden xs:inline' with 'hidden sm:inline' on standalone mobile button label.
// [2026-11-17] [10:30] - FEAT: Pre-selected stored user identity for 'paidBy' and added '+ Person' with duplicate & online checks.
// 09.04.2026 10:25 - FIX: Added fully localized i18n support for the inline names input placeholder.
// 09.04.2026 10:20 - UX: Added inline traveler names input for zero-friction expense entry when names are missing.
// src/features/Cockpit/ExpenseEntryButton.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, X, Users, CheckCircle2, Save, MapPin, PenLine, MapPinOff, UserPlus, Clock } from 'lucide-react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import type { Expense, CurrencyConfig } from '../../core/types/shared';
import type { Place } from '../../core/types';
import { LocationPickerModal } from './LocationPickerModal';
import { addTravelerSafe, getStoredCashIdentity } from '../../services/firebaseCashService';
import { computeWeightedAmounts, sortTravelerNames, formatSplitParticipantsLabel, buildInitialExactSplit } from '../../core/utils/finance';

export type ExpenseButtonMode = 'sight' | 'planner' | 'diary' | 'standalone';

interface ExpenseEntryButtonProps {
    placeId?: string;
    defaultTitle?: string;
    defaultAmount?: string;
    defaultCurrency?: string;
    defaultLocation?: { lat: number, lng: number } | null;
    travelers: string;
    mode: ExpenseButtonMode;
    isMobile?: boolean; 
    forceOpen?: boolean; 
    onClose?: () => void;
    onlySettlement?: boolean;
    autoFocusTrigger?: boolean;
}

export const ExpenseEntryButton: React.FC<ExpenseEntryButtonProps> = ({ 
    placeId, 
    defaultTitle = '', 
    defaultAmount = '',
    defaultCurrency,
    defaultLocation = null,
    travelers, 
    mode, 
    isMobile,
    forceOpen = false,
    onClose,
    onlySettlement = false,
    autoFocusTrigger = false
}) => {
    const { addExpense, project, setProject, setTravelers } = useTripStore();
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
    const [entryDate, setEntryDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const titleInputRef = useRef<HTMLInputElement | null>(null);
    const amountInputRef = useRef<HTMLInputElement | null>(null);
    const saveBtnRef = useRef<HTMLButtonElement | null>(null);
    
    const currentCashIdentity = getStoredCashIdentity(project.data.cashSync?.roomId || project.meta?.id);
    const names = sortTravelerNames(
        (travelers || '').split(',').map(n => n.trim()).filter(Boolean),
        currentCashIdentity
    );
    const [entryKind, setEntryKind] = useState<'expense' | 'settlement'>(onlySettlement ? 'settlement' : 'expense');
    const [paidBy, setPaidBy] = useState('');
    const [settlementRecipient, setSettlementRecipient] = useState('');
    const [splitMode, setSplitMode] = useState<'equal'|'weights'|'exact'>('equal');
    const [splitAmong, setSplitAmong] = useState<string[]>([]);
    const [splitWeights, setSplitWeights] = useState<Record<string, number>>({});
    const [splitExact, setSplitExact] = useState<Record<string, string>>({});
    const [showSplit, setShowSplit] = useState(false);

    const buildDefaultWeights = (nameList: string[]) => {
        const savedDefaults = project.data.defaultExpenseWeights || {};
        const w: Record<string, number> = {};
        nameList.forEach(n => { w[n] = savedDefaults[n] ?? 1; });
        return w;
    };

    const getDefaultSplitMode = (nameList: string[]): 'equal' | 'weights' => {
        const savedDefaults = project.data.defaultExpenseWeights || {};
        const hasCustom = nameList.some(n => (savedDefaults[n] ?? 1) !== 1);
        return hasCustom ? 'weights' : 'equal';
    };
    
    const [tempNames, setTempNames] = useState('');
    const [showAddPerson, setShowAddPerson] = useState(false);
    const [newPersonName, setNewPersonName] = useState('');
    const [newPersonError, setNewPersonError] = useState<string | null>(null);
    const [isAddingPerson, setIsAddingPerson] = useState(false);

    const getDefaultPaidBy = (nameList: string[]) => {
        const identity = getStoredCashIdentity(project.data.cashSync?.roomId || project.meta?.id);
        if (identity && nameList.includes(identity)) return identity;
        return nameList.length > 0 ? nameList[0] : '';
    };

    const [location, setLocation] = useState<{lat: number, lng: number} | null>(defaultLocation);
    const [isFetchingGPS, setIsFetchingGPS] = useState(false);
    const [gpsError, setGpsError] = useState(false);
    const [showLocationPicker, setShowLocationPicker] = useState(false);

    const [isNoteStep, setIsNoteStep] = useState(false);
    const [noteText, setNoteText] = useState('');
    
    const [pendingPlaceId, setPendingPlaceId] = useState<string | null>(null);

    const uniqueTitles = useMemo(() => {
        const allExpenses = Object.values(project.data.expenses || {}) as Expense[];
        return Array.from(new Set(allExpenses.map(e => e.title))).filter(Boolean).sort();
    }, [project.data.expenses]);

    const resetDate = () => {
        const d = new Date();
        const tzOffset = d.getTimezoneOffset() * 60000;
        setEntryDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
    };

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            setShowDatePicker(false);
            resetDate();
            if (defaultTitle) setCustomTitle(defaultTitle);
            if (defaultAmount) setAmount(defaultAmount);
            if (defaultCurrency && availableCurrencies.includes(defaultCurrency)) {
                setCurrency(defaultCurrency);
            } else if (!availableCurrencies.includes(currency)) {
                setCurrency(availableCurrencies[0]);
            }
            if (defaultLocation) setLocation(defaultLocation);
            
            const currentNames = (travelers || '').split(',').map(n => n.trim()).filter(Boolean);
            if (currentNames.length > 0) {
                const defPaid = getDefaultPaidBy(currentNames);
                setPaidBy(prev => prev || defPaid);
                setSettlementRecipient(prev => prev || currentNames.find(n => n !== defPaid) || '');
                setSplitMode(getDefaultSplitMode(currentNames));
                setSplitAmong(prev => prev.length > 0 ? prev : currentNames);
                setSplitWeights(prev => Object.keys(prev).length > 0 ? prev : buildDefaultWeights(currentNames));
            }
        }
    }, [forceOpen]);

    useEffect(() => {
        if (isOpen && names.length > 0 && !paidBy) {
            const defPaid = getDefaultPaidBy(names);
            setPaidBy(defPaid);
            setSettlementRecipient(names.find(n => n !== defPaid) || '');
            setSplitMode(getDefaultSplitMode(names));
            setSplitAmong(names);
            setSplitWeights(buildDefaultWeights(names));
        }
    }, [isOpen, names.length, paidBy]);

    useEffect(() => {
        if (!isOpen || isNoteStep) return;
        const timer = setTimeout(() => {
            const hasTitle = Boolean((mode === 'standalone' || forceOpen) ? (customTitle.trim() || defaultTitle) : true);
            const parsedAmt = parseFloat(amount.replace(',', '.'));
            const hasValidAmount = !isNaN(parsedAmt) && parsedAmt > 0;
            if (!hasTitle && (mode === 'standalone' || forceOpen)) {
                titleInputRef.current?.focus();
            } else if (!hasValidAmount) {
                amountInputRef.current?.focus();
            } else {
                saveBtnRef.current?.focus();
            }
        }, 40);
        return () => clearTimeout(timer);
    }, [isOpen, isNoteStep]);

    useEffect(() => {
        if (!isOpen || location || !navigator.geolocation) return;

        let cancelled = false;
        setIsFetchingGPS(true);
        setGpsError(false);

        const onSuccess = (pos: GeolocationPosition) => {
            if (cancelled) return;
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsFetchingGPS(false);
        };

        const onFinalError = (err: GeolocationPositionError) => {
            if (cancelled) return;
            console.warn("Silent GPS fetch failed or was denied:", err);
            setIsFetchingGPS(false);
            setGpsError(true);
        };

        navigator.geolocation.getCurrentPosition(
            onSuccess,
            (err) => {
                if (cancelled) return;
                if (err.code === err.PERMISSION_DENIED) {
                    onFinalError(err);
                    return;
                }
                // Fallback to fast WiFi/cell positioning indoors or after GPS timeout
                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    onFinalError,
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
                );
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );

        return () => {
            cancelled = true;
        };
    }, [isOpen, location]);

    const expenses = Object.values(project.data.expenses || {}).filter((e: Expense) => 
        (placeId && e.placeId === placeId) || (!placeId && e.title === defaultTitle)
    ) as Expense[];
    
    const totalSpent = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);

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

    const handleAddPerson = async () => {
        setIsAddingPerson(true);
        setNewPersonError(null);
        try {
            const res = await addTravelerSafe({
                rawInputName: newPersonName,
                currentTravelerNames: travelers || '',
                cashSync: project.data.cashSync
            });
            if (!res.ok) {
                setNewPersonError(res.error);
            } else {
                setTravelers({ travelerNames: res.updatedTravelerNames });
                if (res.addedNames.length === 1) {
                    setPaidBy(res.addedNames[0]);
                } else if (!paidBy && res.addedNames.length > 0) {
                    setPaidBy(res.addedNames[0]);
                }
                setSplitAmong(prev => {
                    const next = [...prev];
                    res.addedNames.forEach((n) => {
                        if (!next.includes(n)) next.push(n);
                    });
                    return next;
                });
                setSplitWeights(prev => {
                    const next = { ...prev };
                    res.addedNames.forEach((n) => {
                        if (next[n] === undefined) next[n] = 1;
                    });
                    return next;
                });
                setNewPersonName('');
                setShowAddPerson(false);
            }
        } catch (err: any) {
            setNewPersonError(err?.message || 'Fehler beim Anlegen.');
        } finally {
            setIsAddingPerson(false);
        }
    };

    const handleToggle = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!isOpen) { 
            const defPaid = getDefaultPaidBy(names);
            setEntryKind(onlySettlement ? 'settlement' : 'expense');
            setCustomTitle(mode === 'standalone' ? defaultTitle : ''); 
            setAmount(defaultAmount || ''); 
            setCurrency(defaultCurrency && availableCurrencies.includes(defaultCurrency) ? defaultCurrency : availableCurrencies[0]);
            setPaidBy(defPaid); 
            setSettlementRecipient(names.find(n => n !== defPaid) || '');
            setSplitMode(getDefaultSplitMode(names)); 
            setSplitAmong(names); 
            setSplitWeights(buildDefaultWeights(names));
            setSplitExact({}); 
            setShowSplit(false); 
            setLocation(defaultLocation);
            setIsFetchingGPS(false);
            setGpsError(false);
            setIsNoteStep(false);
            setNoteText('');
            setPendingPlaceId(null);
            setTempNames('');
            setShowAddPerson(false);
            setNewPersonName('');
            setNewPersonError(null);
            setShowDatePicker(false);
            resetDate();
        } else {
            if (onClose) onClose();
        }
        setIsOpen(!isOpen);
    };

    const handleSave = (e: React.SyntheticEvent, promptForNote: boolean = false) => {
        e.stopPropagation();
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(numAmount) || numAmount <= 0 || !paidBy) return;

        if (entryKind === 'settlement') {
            if (!settlementRecipient || settlementRecipient === paidBy) return;
            const settlementTitle = customTitle.trim() || t('finance.partial_settlement_title', {
                defaultValue: `Rückzahlung: ${paidBy} → ${settlementRecipient}`
            });
            addExpense({
                id: uuidv4(),
                title: settlementTitle,
                amount: numAmount,
                currency,
                paidBy,
                splitAmong: [settlementRecipient],
                timestamp: entryDate ? new Date(entryDate).getTime() : Date.now(),
                isSettlement: true
            });
            setIsOpen(false);
            if (onClose) onClose();
            return;
        }

        const finalTitle = mode === 'standalone' ? (customTitle.trim() || defaultTitle) : defaultTitle;
        if (!finalTitle) return;

        let finalSplitExact: Record<string, number> | undefined = undefined;
        let finalSplitWeights: Record<string, number> | undefined = undefined;
        let finalSplitAmong: string[] = splitAmong.length > 0 ? splitAmong : names;

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
        } else if (splitMode === 'weights') {
            const weightData: Record<string, number> = {};
            let totalW = 0;
            for (const n of names) {
                const w = splitWeights[n] ?? 0;
                if (w > 0) {
                    weightData[n] = w;
                    totalW += w;
                }
            }
            if (totalW <= 0) return;
            finalSplitWeights = weightData;
            finalSplitAmong = Object.keys(weightData);
        }

        const targetPlaceId = (mode === 'standalone' && promptForNote) ? `custom_${uuidv4()}` : (mode === 'standalone' ? undefined : placeId);

        addExpense({ 
            id: uuidv4(), 
            placeId: targetPlaceId, 
            title: finalTitle, 
            amount: numAmount, 
            currency, 
            paidBy, 
            splitAmong: finalSplitAmong, 
            splitExact: finalSplitExact,
            splitWeights: finalSplitWeights,
            timestamp: entryDate ? new Date(entryDate).getTime() : Date.now(),
            location: location || undefined
        });

        if (promptForNote) {
            setPendingPlaceId(targetPlaceId ?? null);
            setIsNoteStep(true);
        } else {
            setIsOpen(false);
            if (onClose) onClose();
        }
    };

    const handleSaveNote = () => {
        const newId = pendingPlaceId || `custom_${uuidv4()}`;
        const finalTitle = mode === 'standalone' ? (customTitle.trim() || defaultTitle) : defaultTitle;
        const numAmount = parseFloat(amount.replace(',', '.'));
        const autoText = `${t('finance.expense', { defaultValue: 'Ausgabe' })}: ${numAmount} ${currency}`;
        
        const finalNote = noteText.trim() ? `${noteText}\n\n(${autoText})` : autoText;

        const newPlace: Place = {
            id: newId, 
            name: finalTitle, 
            category: 'custom_diary',
            visited: true, 
            visitedAt: entryDate ? new Date(entryDate).toISOString() : new Date().toISOString(), 
            userNote: finalNote,
            location: location || undefined
        };
        setProject({ ...project, data: { ...project.data, places: { ...project.data.places, [newId]: newPlace } } });
        
        setIsNoteStep(false);
        setNoteText('');
        setPendingPlaceId(null);
        setIsOpen(false);
        if (onClose) onClose();
    };

    const renderTriggerButton = () => {
        if (forceOpen) return null; 
        
        if (mode === 'standalone') {
            const btnClass = isMobile 
                ? "flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors" 
                : "flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors";
            
            return (
                <button
                    type="button"
                    autoFocus={Boolean(autoFocusTrigger)}
                    onClick={handleToggle}
                    className={`${btnClass} ${isOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'}`}
                >
                    <Banknote size={isMobile ? 16 : 14} /> 
                    <span className={isMobile ? "hidden sm:inline" : ""}>
                        {onlySettlement ? t('finance.repayment', { defaultValue: 'Rückzahlung' }) : t('finance.expense', { defaultValue: 'Ausgabe' })}
                    </span>
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

    const totalWeights = Object.values(splitWeights).reduce((s, w) => s + (w > 0 ? w : 0), 0);
    const formattedEntryDate = useMemo(() => {
        const dt = entryDate ? new Date(entryDate) : new Date();
        if (isNaN(dt.getTime())) return entryDate;
        return dt.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }, [entryDate]);
    const isSaveDisabled = (!amount && mode !== 'standalone') || 
                           (entryKind === 'expense' && mode === 'standalone' && !(customTitle.trim() || defaultTitle)) || 
                           isNaN(parseFloat(amount.replace(',', '.'))) || 
                           parseFloat(amount.replace(',', '.')) <= 0 ||
                           !paidBy || 
                           (entryKind === 'settlement' && (!settlementRecipient || settlementRecipient === paidBy)) ||
                           (entryKind === 'expense' && splitMode === 'equal' && splitAmong.length === 0) ||
                           (entryKind === 'expense' && splitMode === 'weights' && totalWeights <= 0);

    return (
        <div className={`relative ${mode === 'standalone' && isMobile ? 'shrink-0' : mode === 'standalone' ? 'hidden sm:block' : 'shrink-0'} no-print`}>
            {renderTriggerButton()}

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2.5 pt-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => handleToggle()}>
                    <div className="bg-emerald-50 w-full max-w-sm sm:max-w-md max-h-[calc(100dvh-20px)] sm:max-h-[94dvh] rounded-2xl shadow-2xl border border-emerald-300 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        
                        <div className="flex justify-between items-center gap-2 px-3.5 py-2.5 sm:p-4 border-b border-emerald-100/50 bg-emerald-100/30 shrink-0">
                            <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                                {isNoteStep ? (
                                    <><PenLine className="w-4 h-4 shrink-0"/> <span className="truncate">{t('diary.add_note', { defaultValue: 'Notiz hinzufügen' })}</span></>
                                ) : (
                                    <>
                                        <Banknote className="w-4 h-4 shrink-0"/> 
                                        <span className="truncate">{mode === 'standalone' ? t('finance.add_expense', { defaultValue: 'Kosten erfassen' }) : (defaultTitle || t('finance.new_expense', { defaultValue: 'Neue Ausgabe' }))}</span>
                                        
                                        {entryKind === 'expense' && (
                                            <button 
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setShowLocationPicker(true); }}
                                                className={`ml-1 px-2 py-0.5 rounded-full border text-[10px] font-bold normal-case tracking-normal inline-flex items-center gap-1 shrink-0 transition-colors ${
                                                    isFetchingGPS
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300 animate-pulse'
                                                        : location
                                                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm'
                                                            : gpsError
                                                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                                title={t('map.picker_title', { defaultValue: 'Ort ändern / wählen' })}
                                            >
                                                {isFetchingGPS && <><MapPin className="w-3 h-3" /><span>GPS…</span></>}
                                                {!isFetchingGPS && location && <><MapPin className="w-3 h-3" /><span>GPS ✓</span></>}
                                                {!isFetchingGPS && !location && gpsError && <><MapPinOff className="w-3 h-3" /><span>{t('finance.no_gps', { defaultValue: 'Ohne GPS' })}</span></>}
                                                {!isFetchingGPS && !location && !gpsError && <><MapPin className="w-3 h-3" /><span>GPS</span></>}
                                            </button>
                                        )}
                                    </>
                                )}
                            </span>
                            <button type="button" onClick={() => handleToggle()} className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-200 p-1.5 rounded-full transition-colors shrink-0"><X className="w-4 h-4"/></button>
                        </div>

                        {isNoteStep ? (
                            <>
                                <div className="p-4 overflow-y-auto space-y-4">
                                    <div className="bg-white border border-indigo-100 p-4 rounded-xl shadow-sm">
                                        <p className="text-xs text-emerald-600 font-bold mb-3 flex items-center gap-1.5"><CheckCircle2 size={16}/> {t('finance.expense_saved', { defaultValue: 'Ausgabe gespeichert!' })}</p>
                                        <textarea 
                                            value={noteText}
                                            onChange={e => setNoteText(e.target.value)}
                                            placeholder={t('diary.note_placeholder', { defaultValue: 'Deine Erlebnisse oder Notizen...' })}
                                            className="w-full text-sm p-3 border border-indigo-200 rounded-lg focus:ring-indigo-500 bg-indigo-50/30 min-h-[120px] resize-y"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-100/50 border-t border-emerald-200/50 flex gap-2 shrink-0">
                                    <button type="button" onClick={() => { setIsNoteStep(false); setIsOpen(false); if(onClose) onClose(); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">{t('actions.skip', { defaultValue: 'Überspringen' })}</button>
                                    <button type="button" onClick={handleSaveNote} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md flex justify-center items-center gap-2"><Save className="w-4 h-4"/> {t('actions.save', { defaultValue: 'Speichern' })}</button>
                                </div>
                            </>
                        ) : (
                            <form
                                className="flex flex-col flex-1 min-h-0 overflow-hidden"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!isSaveDisabled) handleSave(e, false);
                                }}
                            >
                                <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 sm:space-y-3.5">
                                    {mode === 'standalone' && names.length >= 2 && !onlySettlement && (
                                        <div className="flex bg-emerald-100/70 border border-emerald-200 rounded-xl p-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setEntryKind('expense'); }}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${entryKind === 'expense' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-200/50'}`}
                                            >
                                                {t('finance.expense', { defaultValue: 'Ausgabe' })}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEntryKind('settlement');
                                                    if (!settlementRecipient || settlementRecipient === paidBy) {
                                                        setSettlementRecipient(names.find(n => n !== paidBy) || '');
                                                    }
                                                }}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${entryKind === 'settlement' ? 'bg-blue-600 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-200/50'}`}
                                            >
                                                {t('finance.repayment', { defaultValue: 'Rückzahlung / Abschlag' })}
                                            </button>
                                        </div>
                                    )}

                                    {(mode === 'standalone' || forceOpen) && (
                                        <div>
                                            <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                                                {entryKind === 'settlement' ? t('finance.note_optional', { defaultValue: 'Notiz (optional)' }) : t('finance.purpose', { defaultValue: 'Verwendungszweck' })}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    ref={titleInputRef}
                                                    type="text"
                                                    list="expense-titles-new"
                                                    placeholder={entryKind === 'settlement' ? t('finance.settlement_placeholder', { defaultValue: 'z.B. Teilzahlung, Kaution...' }) : t('finance.purpose_placeholder', { defaultValue: 'z.B. Supermarkt, Taxi...' })}
                                                    value={customTitle}
                                                    onChange={e => setCustomTitle(e.target.value)}
                                                    className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2.5 pr-9 bg-white focus:ring-emerald-500 shadow-sm"
                                                />
                                                {customTitle.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomTitle('');
                                                            titleInputRef.current?.focus();
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                                                        title={t('actions.clear', { defaultValue: 'Eingabe löschen' })}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <datalist id="expense-titles-new">
                                                {uniqueTitles.map(tTitle => <option key={tTitle} value={tTitle} />)}
                                            </datalist>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <input
                                            ref={amountInputRef}
                                            type="text"
                                            inputMode="decimal"
                                            enterKeyHint="done"
                                            placeholder="0.00"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="flex-1 text-lg font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 shadow-sm"
                                        />
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-24 text-sm font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 cursor-pointer shadow-sm">
                                            {availableCurrencies.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {showDatePicker ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="datetime-local"
                                                value={entryDate}
                                                onChange={e => setEntryDate(e.target.value)}
                                                className="flex-1 text-sm font-bold border-emerald-200 rounded-lg p-2 bg-white focus:ring-emerald-500 shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setShowDatePicker(false); }}
                                                className="px-2.5 py-2 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50"
                                            >
                                                {t('actions.done', { defaultValue: 'Fertig' })}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setShowDatePicker(true); }}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-100/60 hover:bg-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                                            >
                                                <Clock className="w-3 h-3" />
                                                <span>{formattedEntryDate}</span>
                                                <PenLine className="w-2.5 h-2.5 opacity-70" />
                                            </button>
                                        </div>
                                    )}

                                    {names.length === 0 ? (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-inner">
                                            <p className="text-xs text-amber-800 font-bold mb-2 flex items-center gap-1.5">
                                                <Users className="w-4 h-4" /> {t('finance.missing_names_title', { defaultValue: 'Wer reist mit?' })}
                                            </p>
                                            <p className="text-[10px] text-amber-700 mb-3 leading-relaxed">
                                                {t('finance.missing_names_desc', { defaultValue: 'Um Kosten aufzuteilen, müssen wir wissen, wer dabei ist. Trage die Namen (mit Komma getrennt) hier ein:' })}
                                            </p>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={tempNames}
                                                    onChange={e => setTempNames(e.target.value)}
                                                    placeholder={t('finance.missing_names_placeholder', { defaultValue: 'z.B. Max, Lisa, Tom' })} 
                                                    className="flex-1 text-sm font-bold border-amber-300 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 bg-white shadow-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (tempNames.trim()) setTravelers({ travelerNames: tempNames.trim() });
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (tempNames.trim()) setTravelers({ travelerNames: tempNames.trim() });
                                                    }}
                                                    disabled={!tempNames.trim()}
                                                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                                                >
                                                    <Save className="w-4 h-4" /> <span className="hidden xs:inline">{t('actions.save', { defaultValue: 'Speichern' })}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                                        {entryKind === 'settlement' ? t('finance.from_payer', { defaultValue: 'Von wem (Zahler)?' }) : t('finance.paid_by', { defaultValue: 'Wer hat bezahlt?' })}
                                                    </span>
                                                    {!onlySettlement && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setShowAddPerson(prev => !prev); setNewPersonError(null); }}
                                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/70 px-2 py-0.5 rounded-full transition-colors"
                                                        >
                                                            <UserPlus className="w-3 h-3" /> {t('finance.add_person', { defaultValue: 'Person' })}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {names.map(n => (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPaidBy(n);
                                                                if (settlementRecipient === n) {
                                                                    setSettlementRecipient(names.find(x => x !== n) || '');
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${paidBy === n ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                                {showAddPerson && (
                                                    <div className="mt-2 p-2 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-1.5" onClick={e => e.stopPropagation()}>
                                                        <div className="flex gap-1.5">
                                                            <input
                                                                type="text"
                                                                value={newPersonName}
                                                                onChange={e => { setNewPersonName(e.target.value); setNewPersonError(null); }}
                                                                placeholder={t('finance.new_person_placeholder', { defaultValue: 'Neuer Name...' })}
                                                                className="flex-1 text-xs font-bold border border-emerald-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleAddPerson();
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                disabled={!newPersonName.trim() || isAddingPerson}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAddPerson();
                                                                }}
                                                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                        {newPersonError && (
                                                            <p className="text-[11px] font-medium text-red-600">{newPersonError}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {entryKind === 'settlement' ? (
                                                <div>
                                                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">
                                                        {t('finance.to_recipient', { defaultValue: 'An wen?' })}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {names.filter(n => n !== paidBy).map(n => (
                                                            <button
                                                                key={n}
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setSettlementRecipient(n); }}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${settlementRecipient === n ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50'}`}
                                                            >
                                                                {n}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {(() => {
                                                        const numTotal = parseFloat(amount.replace(',', '.')) || 0;
                                                        const perPerson = splitAmong.length > 0 && numTotal > 0 ? numTotal / splitAmong.length : 0;
                                                        return (
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setShowSplit(!showSplit); }} className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-2 rounded-lg border border-emerald-200/50 hover:bg-emerald-100 transition-colors w-full">
                                                                <Users className="w-3.5 h-3.5 shrink-0" /> 
                                                                <span className="truncate">
                                                                    {t('finance.split_among', { defaultValue: 'Aufgeteilt auf:' })} {splitMode === 'exact' ? t('finance.exact', { defaultValue: 'Exakt' }) : splitMode === 'weights' ? t('finance.weights', { defaultValue: 'Anteile (×)' }) : formatSplitParticipantsLabel(splitAmong, names, currentCashIdentity, t('finance.everyone', { defaultValue: 'Alle' }))}
                                                                    {splitMode === 'equal' && perPerson > 0 ? ` (${t('finance.each_short', { defaultValue: 'je' })} ${perPerson.toFixed(2)} ${currency})` : ''} ✎
                                                                </span>
                                                            </button>
                                                        );
                                                    })()}
                                                    
                                                    {showSplit && (
                                                        <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                            <div className="flex bg-emerald-50 border border-emerald-100 rounded-lg mb-3 p-1 gap-1">
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setSplitMode('equal'); }} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${splitMode === 'equal' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.equal', { defaultValue: 'Gleichmäßig' })}</button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setSplitMode('weights'); }} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${splitMode === 'weights' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.weights', { defaultValue: 'Anteile (×)' })}</button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const hasExistingExact = Object.values(splitExact).some(v => (parseFloat((v || '').replace(',', '.')) || 0) > 0);
                                                                        if (!hasExistingExact) {
                                                                            const numTotal = parseFloat(amount.replace(',', '.')) || 0;
                                                                            if (numTotal > 0) {
                                                                                setSplitExact(buildInitialExactSplit(numTotal, splitMode, splitAmong, splitWeights));
                                                                            }
                                                                        }
                                                                        setSplitMode('exact');
                                                                    }}
                                                                    className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${splitMode === 'exact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}
                                                                >
                                                                    {t('finance.exact', { defaultValue: 'Exakt' })}
                                                                </button>
                                                            </div>

                                                            {splitMode === 'equal' ? (
                                                                <div className="space-y-2">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {names.map(n => {
                                                                            const active = splitAmong.includes(n);
                                                                            return <button type="button" key={n} onClick={(e) => { e.stopPropagation(); if(active) setSplitAmong(prev => prev.filter(x => x !== n)); else setSplitAmong(prev => [...prev, n]); }} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-emerald-500 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{n} {active && '✓'}</button>;
                                                                        })}
                                                                    </div>
                                                                    {(() => {
                                                                        const numTotal = parseFloat(amount.replace(',', '.')) || 0;
                                                                        if (splitAmong.length <= 0 || numTotal <= 0) return null;
                                                                        const perPerson = numTotal / splitAmong.length;
                                                                        return (
                                                                            <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center justify-between">
                                                                                <span>{t('finance.per_person_count', { defaultValue: 'Pro Person ({{count}}):', count: splitAmong.length })}</span>
                                                                                <span className="font-bold tabular-nums">{perPerson.toFixed(2)} {currency}</span>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            ) : splitMode === 'weights' ? (
                                                                <div className="space-y-2">
                                                                    {(() => {
                                                                        const numTotal = parseFloat(amount.replace(',', '.')) || 0;
                                                                        const preview = computeWeightedAmounts(numTotal, splitWeights);
                                                                        return names.map(n => {
                                                                            const w = splitWeights[n] ?? 0;
                                                                            const shareAmt = preview[n] || 0;
                                                                            return (
                                                                                <div key={n} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                                                                    <div className="min-w-0">
                                                                                        <span className="text-xs font-bold text-slate-700">{n}</span>
                                                                                        {numTotal > 0 && (
                                                                                            <span className="ml-2 text-[10px] font-medium text-emerald-700">
                                                                                                ({shareAmt.toFixed(2)} {currency})
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); setSplitWeights(prev => ({ ...prev, [n]: Math.max(0, Number(((prev[n] ?? 0) - 0.5).toFixed(1))) })); }}
                                                                                            className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                                                                                        >
                                                                                            -
                                                                                        </button>
                                                                                        <span className="w-9 text-center text-xs font-bold text-slate-800">{w}×</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); setSplitWeights(prev => ({ ...prev, [n]: Number(((prev[n] ?? 0) + 0.5).toFixed(1)) })); }}
                                                                                            className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                                                                                        >
                                                                                            +
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
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
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="p-3 sm:p-4 bg-emerald-100/50 border-t border-emerald-200/50 flex flex-row items-stretch gap-2 shrink-0">
                                     {!forceOpen && entryKind === 'expense' && (
                                         <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={(e) => handleSave(e, true)}
                                            disabled={isSaveDisabled}
                                            className="px-3 py-2.5 sm:py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-all flex justify-center items-center gap-1.5 shrink-0 disabled:opacity-50"
                                            title={t('finance.save_and_diary', { defaultValue: 'Speichern & Notiz anlegen' })}
                                         >
                                            <PenLine className="w-3.5 h-3.5"/> <span>{t('finance.save_and_diary_short', { defaultValue: '+ Notiz' })}</span>
                                         </button>
                                     )}
                                     <button
                                        ref={saveBtnRef}
                                        type="submit"
                                        onMouseDown={(e) => e.preventDefault()}
                                        disabled={isSaveDisabled}
                                        className="flex-1 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                     >
                                        <Save className="w-4 h-4"/> {t('finance.save', { defaultValue: 'Speichern' })}
                                     </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}
            <LocationPickerModal 
                isOpen={showLocationPicker} 
                onClose={() => setShowLocationPicker(false)} 
                initialLocation={location} 
                onSave={(loc) => setLocation(loc)} 
            />
        </div>
    );
};
// --- END OF FILE 982 Zeilen ---
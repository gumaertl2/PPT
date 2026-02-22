// 22.02.2026 17:45 - FEAT: Added transparent CSV Export functionality to verify all calculations in Excel/Google Sheets.
// 22.02.2026 17:15 - UX: Added safety confirmation prompt before deleting an expense.
// 22.02.2026 13:40 - FIX: Adjusted Mobile Layout in TripFinanceModal Header so action buttons remain visible.
// 22.02.2026 11:45 - FEAT: Integrated Smart-Currency. Auto-converts foreign expenses to base currency in settlement and added config button.
// src/features/Cockpit/TripFinanceModal.tsx

import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { X, Wallet, ListFilter, Trash2, ArrowRightLeft, Banknote, Edit3, Save, CheckCircle2, Users, MapPin, Landmark, Download } from 'lucide-react'; 
import type { Expense, LanguageCode, CurrencyConfig } from '../../core/types/shared';
import { ExpenseEntryButton } from './ExpenseEntryButton'; 
import { CurrencyConfigModal } from './CurrencyConfigModal';

interface TripFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TripFinanceModal: React.FC<TripFinanceModalProps> = ({ isOpen, onClose }) => {
  const { project, deleteExpense, updateExpense } = useTripStore();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const [activeTab, setActiveTab] = useState<'feed' | 'settlement'>('settlement');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editSplitMode, setEditSplitMode] = useState<'equal'|'exact'>('equal');
  const [editSplitAmong, setEditSplitAmong] = useState<string[]>([]);
  const [editSplitExact, setEditSplitExact] = useState<Record<string, string>>({});
  const [showSplit, setShowSplit] = useState(false);
  
  const expenses = Object.values(project.data.expenses || {}) as Expense[];
  const sortedFeed = [...expenses].sort((a, b) => b.timestamp - a.timestamp);

  const rawNames = project.userInputs.travelers.travelerNames || '';
  const allNames = rawNames.split(',').map((n: string) => n.trim()).filter(Boolean);

  // Dynamic Currencies from Config
  const currencyConfig = project.data.currencyConfig as CurrencyConfig | undefined;
  const baseCurrency = currencyConfig?.baseCurrency || 'EUR';
  
  const availableCurrencies = useMemo(() => {
      if (!currencyConfig) return ['EUR'];
      const curs = [currencyConfig.baseCurrency];
      currencyConfig.rates.forEach(r => {
          if (r.currency && !curs.includes(r.currency)) curs.push(r.currency);
      });
      return curs;
  }, [currencyConfig]);

  const startEdit = (exp: Expense) => {
      setEditingId(exp.id);
      setEditTitle(exp.title);
      setEditAmount(exp.amount.toString());
      setEditCurrency(availableCurrencies.includes(exp.currency) ? exp.currency : availableCurrencies[0]);
      setEditPaidBy(exp.paidBy);
      setShowSplit(false);
      
      if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
          setEditSplitMode('exact');
          setEditSplitAmong(allNames);
          const strExact: Record<string, string> = {};
          Object.entries(exp.splitExact).forEach(([k,v]) => strExact[k] = v.toString());
          setEditSplitExact(strExact);
      } else {
          setEditSplitMode('equal');
          setEditSplitAmong(exp.splitAmong || allNames);
          setEditSplitExact({});
      }
  };

  const calculateRemaining = () => {
      const total = parseFloat(editAmount.replace(',', '.')) || 0;
      if (total <= 0) return 0;
      let currentSum = 0;
      Object.values(editSplitExact).forEach(val => {
          const num = parseFloat(val.replace(',', '.')) || 0;
          if (num > 0) currentSum += num;
      });
      return total - currentSum;
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editingId) return;

      const numAmount = parseFloat(editAmount.replace(',', '.'));
      if (isNaN(numAmount) || numAmount <= 0 || !editPaidBy) return;

      let finalSplitExact: Record<string, number> | undefined = undefined;
      
      if (editSplitMode === 'exact') {
          let sum = 0;
          const exactData: Record<string, number> = {};
          for (const n of allNames) {
              const val = parseFloat((editSplitExact[n] || '').replace(',', '.'));
              if (!isNaN(val) && val > 0) {
                  exactData[n] = val;
                  sum += val;
              }
          }
          if (Math.abs(sum - numAmount) > 0.05) {
              alert(t('finance.error_split_sum', { defaultValue: 'Summe der Aufteilung entspricht nicht dem Gesamtbetrag!' }));
              return;
          }
          finalSplitExact = exactData;
      }

      updateExpense(editingId, {
          title: editTitle,
          amount: numAmount,
          currency: editCurrency,
          paidBy: editPaidBy,
          splitAmong: editSplitMode === 'equal' ? editSplitAmong : [],
          splitExact: finalSplitExact
      });
      setEditingId(null);
  };

  const settlement = useMemo(() => {
      const balances: Record<string, number> = {};
      const paidTotals: Record<string, number> = {};
      const totalsByCurrency: Record<string, number> = {};

      allNames.forEach((n: string) => { 
          balances[n] = 0;
          paidTotals[n] = 0;
      });

      const getRate = (currency: string) => {
          if (currency === baseCurrency) return 1;
          const rateObj = currencyConfig?.rates.find(r => r.currency === currency);
          return rateObj?.rate || 1; // Fallback 1:1 falls Kurs unerwartet fehlt
      };

      expenses.forEach(exp => {
          const cur = exp.currency || 'EUR';
          const rate = getRate(cur);
          const amountInBase = exp.amount / rate;

          // 1. Original-Währungen für die Anzeige sammeln
          if (!totalsByCurrency[cur]) totalsByCurrency[cur] = 0;
          totalsByCurrency[cur] += exp.amount;

          // 2. Bilanzen in Hauptwährung
          if (!paidTotals[exp.paidBy]) paidTotals[exp.paidBy] = 0;
          paidTotals[exp.paidBy] += amountInBase;

          if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
          balances[exp.paidBy] += amountInBase;

          if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
              Object.entries(exp.splitExact).forEach(([person, amt]) => {
                  const exactAmtInBase = amt / rate;
                  if (!balances[person]) balances[person] = 0;
                  balances[person] -= exactAmtInBase;
              });
          } else if (exp.splitAmong && exp.splitAmong.length > 0) {
              const splitAmountInBase = amountInBase / exp.splitAmong.length;
              exp.splitAmong.forEach(person => {
                  if (!balances[person]) balances[person] = 0;
                  balances[person] -= splitAmountInBase;
              });
          }
      });

      const debtors = Object.entries(balances).filter(([_, amount]) => amount < -0.01).sort((a, b) => a[1] - b[1]); 
      const creditors = Object.entries(balances).filter(([_, amount]) => amount > 0.01).sort((a, b) => b[1] - a[1]); 

      const transfers: { from: string, to: string, amount: number }[] = [];
      let d = 0; let c = 0;

      while (d < debtors.length && c < creditors.length) {
          const debtorName = debtors[d][0];
          const creditorName = creditors[c][0];
          
          const debt = Math.abs(debtors[d][1]);
          const credit = creditors[c][1];
          
          const transferAmount = Math.min(debt, credit);
          transfers.push({ from: debtorName, to: creditorName, amount: transferAmount });
          
          debtors[d][1] += transferAmount; 
          creditors[c][1] -= transferAmount; 
          
          if (Math.abs(debtors[d][1]) < 0.01) d++;
          if (creditors[c][1] < 0.01) c++;
      }

      return { balances, paidTotals, transfers, totalsByCurrency };
  }, [expenses, allNames, currencyConfig, baseCurrency]);

  // FEAT: CSV Export Logic for maximum transparency
  const handleExportCSV = () => {
      const getRate = (currency: string) => {
          if (currency === baseCurrency) return 1;
          const rateObj = currencyConfig?.rates.find(r => r.currency === currency);
          return rateObj?.rate || 1;
      };

      const lines: string[] = [];
      const sep = ";"; // Semicolon is standard for German Excel
      const fmtNum = (num: number) => num.toFixed(2).replace('.', ','); // Comma as decimal separator
      
      // Header
      const header = [
          t('finance.csv_date', { defaultValue: 'Datum' }),
          t('finance.csv_purpose', { defaultValue: 'Zweck' }),
          t('finance.csv_amount', { defaultValue: 'Betrag' }),
          t('finance.csv_currency', { defaultValue: 'Währung' }),
          t('finance.csv_rate', { defaultValue: 'Kurs' }),
          `${t('finance.csv_amount_base', { defaultValue: 'Betrag in' })} ${baseCurrency}`,
          t('finance.csv_paid_by', { defaultValue: 'Bezahlt von' }),
          ...allNames
      ];
      lines.push(header.join(sep));

      let totalBase = 0;
      const personTotals: Record<string, number> = {};
      allNames.forEach(n => personTotals[n] = 0);

      sortedFeed.forEach(exp => {
          const date = new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
          const rate = getRate(exp.currency || 'EUR');
          const amountBase = exp.amount / rate;
          totalBase += amountBase;

          const shares: Record<string, number> = {};
          allNames.forEach(n => shares[n] = 0);

          if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
              Object.entries(exp.splitExact).forEach(([person, amt]) => {
                  const exactAmtBase = amt / rate;
                  shares[person] = exactAmtBase;
                  personTotals[person] += exactAmtBase;
              });
          } else if (exp.splitAmong && exp.splitAmong.length > 0) {
              const splitAmtBase = amountBase / exp.splitAmong.length;
              exp.splitAmong.forEach(person => {
                  shares[person] = splitAmtBase;
                  personTotals[person] += splitAmtBase;
              });
          }

          const cleanTitle = `"${exp.title.replace(/"/g, '""')}"`; // Escape quotes for CSV
          
          const row = [
              date,
              cleanTitle,
              fmtNum(exp.amount),
              exp.currency || 'EUR',
              rate.toFixed(4).replace('.', ','),
              fmtNum(amountBase),
              exp.paidBy,
              ...allNames.map(n => fmtNum(shares[n]))
          ];
          lines.push(row.join(sep));
      });

      lines.push(""); // Empty line before summary
      
      const sumRow = ["", t('finance.csv_total', { defaultValue: 'GESAMTKOSTEN (Anteil)' }), "", "", "", fmtNum(totalBase), "", ...allNames.map(n => fmtNum(personTotals[n]))];
      lines.push(sumRow.join(sep));

      const paidRow = ["", t('finance.csv_paid', { defaultValue: 'BEZAHLT VON' }), "", "", "", "", "", ...allNames.map(n => fmtNum(settlement.paidTotals[n] || 0))];
      lines.push(paidRow.join(sep));

      const balanceRow = ["", t('finance.csv_balance', { defaultValue: 'BILANZ (+ Gutschrift / - Schuld)' }), "", "", "", "", "", ...allNames.map(n => fmtNum(settlement.balances[n] || 0))];
      lines.push(balanceRow.join(sep));

      // UTF-8 BOM helps Excel recognize the encoding properly
      const csvContent = "\uFEFF" + lines.join("\n"); 
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Reisekasse_${project.meta.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-slate-50 w-full max-w-xl max-h-[90dvh] h-full sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* MODAL HEADER - ADJUSTED FOR MOBILE */}
        <div className="relative z-50 bg-white border-b border-slate-200 px-3 sm:px-5 py-3 sm:py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-slate-800 truncate mr-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0"><Wallet className="w-5 h-5" /></div>
            {/* The title is hidden on very small screens to make room for buttons */}
            <h2 className="hidden xs:block text-base sm:text-lg font-bold truncate">{t('finance.title', { defaultValue: 'Reisekasse' })}</h2>
          </div>
          
          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* By passing isMobile={true}, the button won't hide itself on small screens */}
            <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} />
            
            <button onClick={handleExportCSV} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.export_csv', { defaultValue: 'Als CSV exportieren' })}>
                <Download className="w-5 h-5" />
            </button>

            <button onClick={() => setIsCurrencyModalOpen(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.currency_config_title', { defaultValue: 'Währungen konfigurieren' })}>
                <Landmark className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0" title={t('actions.close', { defaultValue: 'Schließen' })}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex p-3 bg-white border-b border-slate-200 shrink-0 gap-2 z-[100]">
            <button 
                onClick={() => setActiveTab('settlement')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <ArrowRightLeft className="w-4 h-4" /> <span className="hidden xs:inline">{t('finance.tab_settlement', { defaultValue: 'Abrechnung' })}</span>
            </button>
            <button 
                onClick={() => setActiveTab('feed')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'feed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <ListFilter className="w-4 h-4" /> <span className="hidden xs:inline">{t('finance.tab_feed', { defaultValue: 'Historie' })}</span> ({expenses.length})
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative">
            
            {expenses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                    <p className="mb-4 px-4">{t('finance.empty_state', { defaultValue: 'Noch keine Ausgaben erfasst.' })}</p>
                    <div className="w-full max-w-[200px]">
                        <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} />
                    </div>
                </div>
            ) : activeTab === 'settlement' ? (
                <div className="space-y-6 animate-in fade-in">
                    
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('finance.total_costs', { defaultValue: 'Gesamtkosten' })}</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(settlement.totalsByCurrency).map(([cur, total]) => (
                                    <div key={cur} className="text-xl font-black text-emerald-700">
                                        {total.toFixed(2)} <span className="text-sm">{cur}</span>
                                    </div>
                                ))}
                            </div>
                            {Object.keys(settlement.totalsByCurrency).length > 1 && (
                                <div className="mt-3 text-[10px] text-slate-400 font-medium bg-slate-50 p-2 rounded border border-slate-100 leading-tight">
                                    {t('finance.settlement_base_info', { defaultValue: 'Alle Abrechnungen unten erfolgen in der Hauptwährung:' })} <strong>{baseCurrency}</strong>
                                </div>
                            )}
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">{t('finance.paid_by_summary', { defaultValue: 'Wer hat gezahlt?' })} ({baseCurrency})</h3>
                             <div className="space-y-1.5">
                                 {Object.entries(settlement.paidTotals).sort((a,b) => b[1]-a[1]).map(([name, total]) => (
                                     <div key={name} className="flex justify-between items-center text-xs">
                                         <span className="font-bold text-slate-600 truncate mr-2">{name}</span>
                                         <span className="font-bold text-slate-800 shrink-0">{total > 0 ? total.toFixed(2) : '-'}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> {t('finance.who_owes_who', { defaultValue: 'Wer schuldet wem?' })}</h3>
                        {settlement.transfers.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">{t('finance.perfectly_balanced', { defaultValue: 'Die Kasse ist perfekt ausgeglichen! 🎉' })}</div>
                        ) : (
                            <div className="space-y-3">
                                {settlement.transfers.map((tr, idx) => (
                                    <div key={idx} className="flex flex-col xs:flex-row xs:items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg gap-2">
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="font-bold text-slate-800">{tr.from}</span>
                                            <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
                                            <span className="font-bold text-slate-800">{tr.to}</span>
                                        </div>
                                        <div className="font-black text-amber-700 text-right">
                                            {tr.amount.toFixed(2)} <span className="text-xs font-bold text-amber-600/70">{baseCurrency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{t('finance.balances', { defaultValue: 'Stand (Bilanzen)' })} ({baseCurrency})</h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {Object.entries(settlement.balances).map(([name, bal], idx) => (
                                <div key={name} className={`flex justify-between items-center p-3 text-sm ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                                    <span className="font-bold text-slate-700 truncate mr-2">{name}</span>
                                    <span className={`font-bold shrink-0 ${bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-red-500' : 'text-slate-400'}`}>
                                        {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 animate-in fade-in">
                    {sortedFeed.map(exp => (
                        <div key={exp.id}>
                            {editingId === exp.id ? (
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-md">
                                    <div className="flex justify-between items-center mb-4 border-b border-emerald-100/50 pb-2">
                                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> {t('actions.edit', { defaultValue: 'Bearbeiten' })}</span>
                                        <button onClick={() => setEditingId(null)} className="text-emerald-500 hover:text-emerald-800 bg-emerald-100/50 p-1 rounded-full"><X className="w-4 h-4"/></button>
                                    </div>
                                    
                                    <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.purpose', { defaultValue: 'Verwendungszweck' })}</label>
                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2.5 mb-4 focus:ring-emerald-500 bg-white shadow-sm" placeholder={t('finance.title_placeholder', { defaultValue: 'Titel' })} />
                                    
                                    <div className="flex gap-2 mb-4">
                                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="flex-1 text-lg font-bold border-emerald-200 rounded-lg p-2.5 focus:ring-emerald-500 bg-white shadow-sm" />
                                        <select value={editCurrency} onChange={e => setEditCurrency(e.target.value)} className="w-24 text-sm font-bold border-emerald-200 rounded-lg p-2.5 bg-white focus:ring-emerald-500 cursor-pointer shadow-sm">
                                            {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.paid_by', { defaultValue: 'Wer hat bezahlt?' })}</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {allNames.map((n: string) => ( 
                                                <button key={n} onClick={() => setEditPaidBy(n)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${editPaidBy === n ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>{n}</button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="mb-5">
                                        <button onClick={(e) => { e.stopPropagation(); setShowSplit(!showSplit); }} className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-2 rounded-lg border border-emerald-200/50 hover:bg-emerald-100 transition-colors w-full">
                                            <Users className="w-3.5 h-3.5" /> 
                                            {t('finance.split_among', { defaultValue: 'Aufgeteilt auf:' })} {editSplitMode === 'exact' ? t('finance.exact', { defaultValue: 'Exakt' }) : (editSplitAmong.length === allNames.length ? t('finance.everyone', { defaultValue: 'Alle' }) : `${editSplitAmong.length} ${t('finance.persons', { defaultValue: 'Personen' })}`)} ✎
                                        </button>

                                        {showSplit && (
                                            <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                <div className="flex bg-emerald-50 border border-emerald-100 rounded-lg mb-3 p-1">
                                                    <button onClick={() => setEditSplitMode('equal')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'equal' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.equal', { defaultValue: 'Gleichmäßig' })}</button>
                                                    <button onClick={() => setEditSplitMode('exact')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'exact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.exact_amount', { defaultValue: 'Exakter Betrag' })}</button>
                                                </div>

                                                {editSplitMode === 'equal' ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                    {allNames.map((n: string) => { 
                                                        const active = editSplitAmong.includes(n);
                                                        return <button key={n} onClick={() => setEditSplitAmong(active ? editSplitAmong.filter(x => x !== n) : [...editSplitAmong, n])} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{n} {active && '✓'}</button>;
                                                    })}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {allNames.map((n: string) => ( 
                                                            <div key={n} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                <span className="text-xs font-bold text-slate-700 ml-1">{n}</span>
                                                                <div className="relative w-24">
                                                                    <input type="number" step="0.01" value={editSplitExact[n] || ''} onChange={e => setEditSplitExact((prev: Record<string, string>) => ({...prev, [n]: e.target.value}))} className="w-full text-right text-sm pr-8 pl-2 py-1.5 border border-emerald-200 rounded-md focus:ring-emerald-500 bg-white" />
                                                                    <span className="absolute right-2 top-2 text-slate-400 text-[10px] font-bold">{editCurrency}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(() => {
                                                            const rem = calculateRemaining();
                                                            const isPerfect = Math.abs(rem) < 0.01;
                                                            return (
                                                                <div className={`mt-3 p-2 rounded-lg flex items-center justify-between text-xs font-bold border ${isPerfect ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : rem < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    <span>{isPerfect ? t('finance.split_perfect', { defaultValue: 'Aufteilung stimmt!' }) : rem > 0 ? t('finance.split_remaining', { defaultValue: 'Noch zu verteilen:' }) : t('finance.split_too_much', { defaultValue: 'Zu viel verteilt:' })}</span>
                                                                    <span className="flex items-center gap-1">{isPerfect && <CheckCircle2 className="w-4 h-4" />}{Math.abs(rem).toFixed(2)} {editCurrency}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleSaveEdit} disabled={!editAmount || !editTitle.trim() || isNaN(parseFloat(editAmount)) || !editPaidBy || (editSplitMode==='equal' && editSplitAmong.length === 0)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"><Save className="w-4 h-4"/> {t('finance.save', { defaultValue: 'Speichern' })}</button>
                                </div>
                            ) : (
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 hover:border-blue-200 transition-colors cursor-pointer group" onClick={() => startEdit(exp)}>
                                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><Banknote className="w-5 h-5" /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 truncate pr-2 group-hover:text-blue-700">{exp.title}</h4>
                                            <span className="font-black text-slate-800 whitespace-nowrap">{exp.amount.toFixed(2)} {exp.currency}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                            <span>{new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US')}</span>
                                            <span>•</span>
                                            <span>{t('finance.paid_by_label', { defaultValue: 'Gezahlt von' })} <strong className="text-emerald-700">{exp.paidBy}</strong></span>
                                            
                                            {exp.location && (
                                                <>
                                                    <span>•</span>
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${exp.location.lat},${exp.location.lng}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-0.5 text-blue-500 hover:underline"
                                                        title={t('sights.open_map', { defaultValue: 'Auf Karte öffnen' })}
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <MapPin size={10} /> GPS
                                                    </a>
                                                </>
                                            )}
                                        </div>
                                        {exp.splitExact && Object.keys(exp.splitExact).length > 0 ? (
                                            <div className="text-[10px] text-blue-500 mt-1 bg-blue-50 px-2 py-0.5 rounded inline-block">{t('finance.split_exact_label', { defaultValue: 'Aufteilung: Exakt' })}</div>
                                        ) : exp.splitAmong && exp.splitAmong.length > 0 ? (
                                            <div className="text-[10px] text-slate-400 mt-1 truncate">{t('finance.for', { defaultValue: 'Für:' })} {exp.splitAmong.join(', ')}</div>
                                        ) : null}
                                    </div>
                                    {/* FIX: Added window.confirm to delete button */}
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if(window.confirm(t('finance.delete_confirm', { defaultValue: 'Diese Ausgabe wirklich löschen?' }))) {
                                                deleteExpense(exp.id); 
                                            }
                                        }} 
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0" 
                                        title={t('actions.delete', { defaultValue: 'Löschen' })}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
    
    <CurrencyConfigModal 
        isOpen={isCurrencyModalOpen} 
        onClose={() => setIsCurrencyModalOpen(false)} 
    />
    </>
  );
};
// --- END OF FILE 474 Zeilen ---
// 21.03.2026 19:45 - FIX: Applied strict I18N to manual GPS override buttons (replaced hardcoded "(Ändern)") and fixed Maps tooltips.
// src/features/Cockpit/TripFinanceModal.tsx

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  X, Wallet, ListFilter, Trash2, ArrowRightLeft, Banknote, Edit3, 
  Save, CheckCircle2, Users, MapPin, Landmark, Download, TableProperties,
  ChevronUp, ChevronDown, ChevronsUpDown, Sigma, Info, Printer, Map as MapIcon, MapPinOff
} from 'lucide-react'; 
import type { Expense, LanguageCode, CurrencyConfig } from '../../core/types/shared';
import { ExpenseEntryButton } from './ExpenseEntryButton'; 
import { CurrencyConfigModal } from './CurrencyConfigModal';
import { LocationPickerModal } from './LocationPickerModal';

interface TripFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  setViewMode?: (mode: any) => void;
}

export const TripFinanceModal: React.FC<TripFinanceModalProps> = ({ isOpen, onClose, setViewMode }) => {
  const { project, deleteExpense, updateExpense, setUIState } = useTripStore();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const [activeTab, setActiveTab] = useState<'feed' | 'settlement' | 'table'>('settlement');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'timestamp', direction: 'desc' });
  const [showSubtotals, setShowSubtotals] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editDate, setEditDate] = useState(''); 
  const [editSplitMode, setEditSplitMode] = useState<'equal'|'exact'>('equal');
  const [editSplitAmong, setEditSplitAmong] = useState<string[]>([]);
  const [editSplitExact, setEditSplitExact] = useState<Record<string, string>>({});
  const [showSplit, setShowSplit] = useState(false);
  
  const [editLocation, setEditLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isUpdatingGPS, setIsUpdatingGPS] = useState(false);
  
  const expenses = Object.values(project.data.expenses || {}) as Expense[];
  
  const sortedFeed = [...expenses].sort((a, b) => b.timestamp - a.timestamp);

  const rawNames = project.userInputs.travelers.travelerNames || '';
  const allNames = rawNames.split(',').map((n: string) => n.trim()).filter(Boolean);

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

  const getRateForCurrency = (currency: string) => {
      if (currency === baseCurrency) return 1;
      const rateObj = currencyConfig?.rates.find(r => r.currency === currency);
      return rateObj?.rate || 1;
  };

  const uniqueTitles = useMemo(() => {
      return Array.from(new Set(expenses.map(e => e.title))).filter(Boolean).sort();
  }, [expenses]);

  const sortedTableData = useMemo(() => {
      const data = [...expenses];
      data.sort((a, b) => {
          let aVal: any = a[sortConfig.key as keyof Expense];
          let bVal: any = b[sortConfig.key as keyof Expense];

          if (sortConfig.key === 'amountBase') {
             const rateA = getRateForCurrency(a.currency || 'EUR');
             const rateB = getRateForCurrency(b.currency || 'EUR');
             aVal = a.amount / rateA;
             bVal = b.amount / rateB;
          } else if (sortConfig.key === 'title' || sortConfig.key === 'paidBy') {
             aVal = (aVal || '').toLowerCase();
             bVal = (bVal || '').toLowerCase();
          }

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return data;
  }, [expenses, sortConfig, currencyConfig, baseCurrency]);

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
      if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-600" /> : <ChevronDown className="w-3 h-3 text-emerald-600" />;
  };

  const startEdit = (exp: Expense) => {
      setEditingId(exp.id);
      setEditTitle(exp.title);
      setEditAmount(exp.amount.toString());
      setEditCurrency(availableCurrencies.includes(exp.currency) ? exp.currency : availableCurrencies[0]);
      setEditPaidBy(exp.paidBy);
      setShowSplit(false);
      setEditLocation(exp.location || null);

      const d = new Date(exp.timestamp);
      const tzOffset = d.getTimezoneOffset() * 60000;
      setEditDate(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      
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
          splitExact: finalSplitExact,
          timestamp: editDate ? new Date(editDate).getTime() : Date.now(),
          location: editLocation || undefined
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

      expenses.forEach(exp => {
          const cur = exp.currency || 'EUR';
          const rate = getRateForCurrency(cur);
          const amountInBase = exp.amount / rate;

          if (!totalsByCurrency[cur]) totalsByCurrency[cur] = 0;
          totalsByCurrency[cur] += exp.amount;

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

  const handleExportCSV = () => {
      const lines: string[] = [];
      const sep = ";"; 
      const fmtNum = (num: number) => num.toFixed(2).replace('.', ','); 
      
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
          const rate = getRateForCurrency(exp.currency || 'EUR');
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

          const cleanTitle = `"${exp.title.replace(/"/g, '""')}"`; 
          
          const row = [
              date, cleanTitle, fmtNum(exp.amount), exp.currency || 'EUR',
              rate.toFixed(4).replace('.', ','), fmtNum(amountBase), exp.paidBy,
              ...allNames.map(n => fmtNum(shares[n]))
          ];
          lines.push(row.join(sep));
      });

      lines.push(""); 
      
      const sumRow = ["", t('finance.csv_total', { defaultValue: 'GESAMTKOSTEN (Anteil)' }), "", "", "", fmtNum(totalBase), "", ...allNames.map(n => fmtNum(personTotals[n]))];
      lines.push(sumRow.join(sep));

      const paidRow = ["", t('finance.csv_paid', { defaultValue: 'BEZAHLT VON' }), "", "", "", "", "", ...allNames.map(n => fmtNum(settlement.paidTotals[n] || 0))];
      lines.push(paidRow.join(sep));

      const balanceRow = ["", t('finance.csv_balance', { defaultValue: 'BILANZ (+ Gutschrift / - Schuld)' }), "", "", "", "", "", ...allNames.map(n => fmtNum(settlement.balances[n] || 0))];
      lines.push(balanceRow.join(sep));

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

  const renderTableBody = () => {
      const rows: React.ReactNode[] = [];
      let currentGroupKey: string | null = null;
      let groupTotalBase = 0;
      let groupShares: Record<string, number> = {};
      allNames.forEach(n => groupShares[n] = 0);

      const getGroupKey = (exp: Expense) => {
          if (sortConfig.key === 'timestamp') return new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
          if (sortConfig.key === 'amountBase' || sortConfig.key === 'amount') return exp.amount.toString();
          return String(exp[sortConfig.key as keyof Expense] || '');
      };

      const pushSubtotal = (key: string) => {
          rows.push(
              <tr key={`subtotal-${key}`} className="bg-emerald-50/60 font-bold border-y border-emerald-200/60">
                  <td colSpan={3} className="p-3 text-right text-emerald-800 text-xs">{t('finance.subtotal', {defaultValue: 'Zwischensumme'})}: {key}</td>
                  <td className="p-3 text-right text-emerald-700">{groupTotalBase.toFixed(2)}</td>
                  <td className="p-3"></td>
                  {allNames.map(n => <td key={`sub-${n}`} className="p-3 text-right text-emerald-800 border-l border-emerald-200/50">{groupShares[n].toFixed(2)}</td>)}
              </tr>
          );
          groupTotalBase = 0;
          allNames.forEach(n => groupShares[n] = 0);
      };

      sortedTableData.forEach((exp, idx) => {
          const groupKey = getGroupKey(exp);
          
          if (showSubtotals && currentGroupKey !== null && currentGroupKey !== groupKey) {
              pushSubtotal(currentGroupKey);
          }
          currentGroupKey = groupKey;

          const date = new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
          const rate = getRateForCurrency(exp.currency || 'EUR');
          const amountBase = exp.amount / rate;
          
          const shares: Record<string, number> = {};
          allNames.forEach(n => shares[n] = 0);
          
          if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
              Object.entries(exp.splitExact).forEach(([person, amt]) => {
                  shares[person] = amt / rate;
              });
          } else if (exp.splitAmong && exp.splitAmong.length > 0) {
              const splitAmtBase = amountBase / exp.splitAmong.length;
              exp.splitAmong.forEach(person => {
                  shares[person] = splitAmtBase;
              });
          }

          groupTotalBase += amountBase;
          allNames.forEach(n => groupShares[n] += shares[n]);

          rows.push(
              <tr key={exp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => {setActiveTab('feed'); setTimeout(() => startEdit(exp), 50)}}>
                  <td className="p-3 text-slate-500 text-xs border-r border-slate-50">{date}</td>
                  <td className="p-3 font-bold text-slate-700 truncate max-w-[150px] sm:max-w-[250px]" title={exp.title}>
                      <div className="flex items-center gap-1.5">
                          <span className="truncate">{exp.title}</span>
                          {exp.location && exp.location.lat && exp.location.lng && (
                              <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${exp.location.lat},${exp.location.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-400 hover:text-indigo-600 print:hidden shrink-0"
                                  onClick={e => e.stopPropagation()}
                                  title={t('finance.show_on_map', { defaultValue: 'Auf Google Maps zeigen' })}
                              >
                                  <MapPin size={12} />
                              </a>
                          )}
                      </div>
                  </td>
                  <td className="p-3 text-right font-medium">{exp.amount.toFixed(2)} <span className="text-[10px] text-slate-400">{exp.currency}</span></td>
                  <td className="p-3 text-right font-bold text-emerald-700">{amountBase.toFixed(2)}</td>
                  <td className="p-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200">{exp.paidBy}</span></td>
                  {allNames.map(n => (
                      <td key={n} className={`p-3 text-right text-xs font-medium border-l border-slate-100 ${shares[n] > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {shares[n] > 0 ? shares[n].toFixed(2) : '-'}
                      </td>
                  ))}
              </tr>
          );

          if (showSubtotals && idx === sortedTableData.length - 1) {
              pushSubtotal(currentGroupKey);
          }
      });

      return rows;
  };

  if (!isOpen) return null;

  return (
    <>
      <style type="text/css" media="print">
          {`
              #root { display: none !important; }
              body { background-color: white !important; }
              .finance-print-container { position: static !important; display: block !important; height: auto !important; overflow: visible !important; background-color: white !important; }
              .finance-print-inner { position: static !important; display: block !important; height: auto !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; }
              .finance-print-scroll { display: block !important; height: auto !important; overflow: visible !important; }
              table { width: 100% !important; page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
          `}
      </style>
      
      {typeof document !== 'undefined' && createPortal(
        <div className="finance-print-container fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
          <div className="finance-print-inner bg-slate-50 w-full max-w-4xl max-h-[90dvh] h-full sm:h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:rounded-none print:border-none" onClick={e => e.stopPropagation()}>
            
            {/* Screen Header */}
            <div className="relative z-50 bg-white border-b border-slate-200 px-3 sm:px-5 py-3 sm:py-4 flex justify-between items-center shrink-0 print:hidden">
              <div className="flex items-center gap-2 text-slate-800 truncate mr-2">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0"><Wallet className="w-5 h-5" /></div>
                <h2 className="hidden xs:block text-base sm:text-lg font-bold truncate">{t('finance.title', { defaultValue: 'Reisekasse' })}</h2>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} />
                
                <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.print_tooltip', { defaultValue: 'Ansicht drucken' })}>
                    <Printer className="w-5 h-5" />
                </button>

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

            {/* Print Header */}
            <div className="hidden print:block pb-2 mb-4 border-b border-slate-200">
                <h1 className="text-3xl font-black text-slate-900">{project.meta.name || t('finance.title', { defaultValue: 'Reisekasse' })}</h1>
                <p className="text-slate-500 mt-1 font-medium">{activeTab === 'settlement' ? t('finance.tab_settlement', { defaultValue: 'Abrechnung' }) : activeTab === 'feed' ? t('finance.tab_feed', { defaultValue: 'Historie' }) : t('finance.tab_table', { defaultValue: 'Tabelle' })}</p>
            </div>

            <div className="flex p-3 bg-white border-b border-slate-200 shrink-0 gap-2 z-[100] overflow-x-auto print:hidden">
                <button 
                    onClick={() => setActiveTab('settlement')} 
                    className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <ArrowRightLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t('finance.tab_settlement', { defaultValue: 'Abrechnung' })}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('feed')} 
                    className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'feed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <ListFilter className="w-4 h-4" /> <span className="hidden sm:inline">{t('finance.tab_feed', { defaultValue: 'Historie' })}</span> ({expenses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('table')} 
                    className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'table' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <TableProperties className="w-4 h-4" /> <span className="hidden sm:inline">{t('finance.tab_table', { defaultValue: 'Tabelle' })}</span>
                </button>
            </div>

            <div className="finance-print-scroll flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative print:p-0 print:space-y-4">
                
                {expenses.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 flex flex-col items-center print:hidden">
                        <Wallet className="w-12 h-12 mb-4 opacity-20" />
                        <p className="mb-4 px-4">{t('finance.empty_state', { defaultValue: 'Noch keine Ausgaben erfasst.' })}</p>
                        <div className="w-full max-w-[200px]">
                            <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} />
                        </div>
                    </div>
                ) : activeTab === 'settlement' ? (
                    <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto print:max-w-none">
                        
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('finance.total_costs', { defaultValue: 'Gesamtkosten' })}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(settlement.totalsByCurrency).map(([cur, total]) => (
                                        <div key={cur} className="text-xl font-black text-emerald-700 print:text-black">
                                            {total.toFixed(2)} <span className="text-sm">{cur}</span>
                                        </div>
                                    ))}
                                </div>
                                {Object.keys(settlement.totalsByCurrency).length > 1 && (
                                    <div className="mt-3 text-[10px] text-slate-400 font-medium bg-slate-50 p-2 rounded border border-slate-100 leading-tight print:bg-white print:border-none print:p-0">
                                        {t('finance.settlement_base_info', { defaultValue: 'Alle Abrechnungen unten erfolgen in der Hauptwährung:' })} <strong>{baseCurrency}</strong>
                                    </div>
                                )}
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
                                 <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">{t('finance.paid_by_summary', { defaultValue: 'Wer hat gezahlt?' })} ({baseCurrency})</h3>
                                 <div className="space-y-1.5">
                                     {Object.entries(settlement.paidTotals).sort((a,b) => b[1]-a[1]).map(([name, total]) => (
                                         <div key={name} className="flex justify-between items-center text-xs">
                                             <span className="font-bold text-slate-600 truncate mr-2 print:text-black">{name}</span>
                                             <span className="font-bold text-slate-800 shrink-0 print:text-black">{total > 0 ? total.toFixed(2) : '-'}</span>
                                         </div>
                                     ))}
                                 </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> {t('finance.who_owes_who', { defaultValue: 'Wer schuldet wem?' })}</h3>
                            {settlement.transfers.length === 0 ? (
                                <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg print:bg-white print:border print:border-slate-200">{t('finance.perfectly_balanced', { defaultValue: 'Die Kasse ist perfekt ausgeglichen! 🎉' })}</div>
                            ) : (
                                <div className="space-y-3">
                                    {settlement.transfers.map((tr, idx) => (
                                        <div key={idx} className="flex flex-col xs:flex-row xs:items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg gap-2 print:bg-white print:border-slate-300">
                                            <div className="flex items-center gap-3 text-sm">
                                                <span className="font-bold text-slate-800 print:text-black">{tr.from}</span>
                                                <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0 print:text-slate-400" />
                                                <span className="font-bold text-slate-800 print:text-black">{tr.to}</span>
                                            </div>
                                            <div className="font-black text-amber-700 text-right print:text-black">
                                                {tr.amount.toFixed(2)} <span className="text-xs font-bold text-amber-600/70 print:text-slate-500">{baseCurrency}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{t('finance.balances', { defaultValue: 'Stand (Bilanzen)' })} ({baseCurrency})</h3>
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-slate-300">
                                {Object.entries(settlement.balances).map(([name, bal], idx) => (
                                    <div key={name} className={`flex justify-between items-center p-3 text-sm ${idx !== 0 ? 'border-t border-slate-100 print:border-slate-200' : ''}`}>
                                        <span className="font-bold text-slate-700 truncate mr-2 print:text-black">{name}</span>
                                        <span className={`font-bold shrink-0 print:text-black ${bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {bal > 0 ? '+' : ''}{bal.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'feed' ? (
                    <div className="space-y-3 animate-in fade-in max-w-2xl mx-auto print:max-w-none">
                        {sortedFeed.map(exp => (
                            <div key={exp.id} className="print:break-inside-avoid">
                                {editingId === exp.id ? (
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-md print:hidden">
                                        <div className="flex justify-between items-center mb-4 border-b border-emerald-100/50 pb-2">
                                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <Edit3 className="w-3.5 h-3.5" /> {t('actions.edit', { defaultValue: 'Bearbeiten' })}
                                                
                                                {/* BEIDE MAPS BUTTONS IM EDIT MODUS */}
                                                {exp.location && exp.location.lat && exp.location.lng && (
                                                    <div className="ml-3 flex gap-1.5">
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${exp.location.lat},${exp.location.lng}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition-colors inline-flex items-center gap-1 text-[10px] font-bold normal-case shadow-sm"
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={t('finance.show_on_map', { defaultValue: 'Auf Google Maps zeigen' })}
                                                        >
                                                            <MapPin className="w-3 h-3" /> Maps
                                                        </a>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUIState({ viewMode: 'map', selectedPlaceId: exp.placeId || exp.id });
                                                                if (setViewMode) setViewMode('sights');
                                                                onClose();
                                                            }}
                                                            className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200 transition-colors inline-flex items-center gap-1 text-[10px] font-bold normal-case shadow-sm"
                                                            title={t('diary.jump_to_map', { defaultValue: 'Zur Karte' })}
                                                        >
                                                            <MapIcon className="w-3 h-3" /> {t('diary.jump_to_map', { defaultValue: 'Zur Karte' })}
                                                        </button>
                                                    </div>
                                                )}
                                            </span>
                                            <button onClick={() => setEditingId(null)} className="text-emerald-500 hover:text-emerald-800 bg-emerald-100/50 p-1 rounded-full"><X className="w-4 h-4"/></button>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                            <div className="flex-[2]">
                                                <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.purpose', { defaultValue: 'Verwendungszweck' })}</label>
                                                <input type="text" list="expense-titles-edit" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2.5 focus:ring-emerald-500 bg-white shadow-sm" placeholder={t('finance.title_placeholder', { defaultValue: 'Titel' })} />
                                                <datalist id="expense-titles-edit">
                                                    {uniqueTitles.map(tTitle => <option key={tTitle} value={tTitle} />)}
                                                </datalist>
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">{t('finance.date', { defaultValue: 'Datum & Uhrzeit' })}</label>
                                                <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2.5 focus:ring-emerald-500 bg-white shadow-sm" />
                                            </div>
                                        </div>
                                        
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
                                        
                                        {/* MANUELLER RE-FETCH BUTTON */}
                                        <div className="flex flex-col gap-3">
                                            <button onClick={(e) => {
                                                e.stopPropagation();
                                                setShowLocationPicker(true);
                                            }} className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 justify-center transition-colors shadow-sm">
                                                {editLocation ? (
                                                    <><MapPin size={14} className="text-emerald-500" /> {t('finance.gps_saved', {defaultValue: 'Standort gespeichert ✓'})} ({t('actions.change', {defaultValue: 'Ändern'})})</>
                                                ) : (
                                                    <><MapPin size={14} className="text-slate-400" /> {t('diary.update_gps', {defaultValue: 'GPS-Daten taggen'})}</>
                                                )}
                                            </button>

                                            <button onClick={handleSaveEdit} disabled={!editAmount || !editTitle.trim() || isNaN(parseFloat(editAmount)) || !editPaidBy || (editSplitMode==='equal' && editSplitAmong.length === 0)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"><Save className="w-4 h-4"/> {t('finance.save', { defaultValue: 'Speichern' })}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 hover:border-blue-200 transition-colors cursor-pointer group print:shadow-none print:border-slate-300 print:rounded-none" onClick={() => startEdit(exp)}>
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 shrink-0 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors print:hidden"><Banknote className="w-5 h-5" /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-800 truncate pr-2 group-hover:text-blue-700 print:text-black">{exp.title}</h4>
                                                <span className="font-black text-slate-800 whitespace-nowrap print:text-black">{exp.amount.toFixed(2)} {exp.currency}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 print:text-slate-800">
                                                <span>{new Date(exp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US')}</span>
                                                <span>•</span>
                                                <span>{t('finance.paid_by_label', { defaultValue: 'Gezahlt von' })} <strong className="text-emerald-700 print:text-black">{exp.paidBy}</strong></span>
                                                
                                                {/* BEIDE MAPS BUTTONS IN DER HISTORIE */}
                                                {exp.location && exp.location.lat && exp.location.lng && (
                                                    <>
                                                        <span className="print:hidden">•</span>
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${exp.location.lat},${exp.location.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 font-bold print:hidden"
                                                            onClick={e => e.stopPropagation()}
                                                            title={t('finance.show_on_map', { defaultValue: 'Auf Google Maps zeigen' })}
                                                        >
                                                            <MapPin size={12} /> Maps
                                                        </a>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUIState({ viewMode: 'map', selectedPlaceId: exp.placeId || exp.id });
                                                                if (setViewMode) setViewMode('sights');
                                                                onClose();
                                                            }}
                                                            className="text-emerald-600 hover:text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 font-bold print:hidden ml-1"
                                                            title={t('diary.jump_to_map', { defaultValue: 'Zur Karte' })}
                                                        >
                                                            <MapIcon size={12} /> {t('diary.jump_to_map', { defaultValue: 'Zur Karte' })}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            {exp.splitExact && Object.keys(exp.splitExact).length > 0 ? (
                                                <div className="text-[10px] text-blue-500 mt-1.5 bg-blue-50 px-2 py-0.5 rounded inline-block print:border print:border-slate-300 print:bg-white">{t('finance.split_exact_label', { defaultValue: 'Aufteilung: Exakt' })}</div>
                                            ) : exp.splitAmong && exp.splitAmong.length > 0 ? (
                                                <div className="text-[10px] text-slate-400 mt-1.5 truncate print:text-slate-600">{t('finance.for', { defaultValue: 'Für:' })} {exp.splitAmong.join(', ')}</div>
                                            ) : null}
                                        </div>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if(window.confirm(t('finance.delete_confirm', { defaultValue: 'Diese Ausgabe wirklich löschen?' }))) {
                                                    deleteExpense(exp.id); 
                                                }
                                            }} 
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0 print:hidden" 
                                            title={t('actions.delete', { defaultValue: 'Löschen' })}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 animate-in fade-in max-w-full">
                        <div className="flex justify-between items-center px-1 print:hidden">
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><Info size={14}/> {t('finance.sort_hint', {defaultValue: 'Klicke auf die Spaltenköpfe zur Sortierung'})}</span>
                            <button onClick={() => setShowSubtotals(!showSubtotals)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-sm ${showSubtotals ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                <Sigma className="w-4 h-4" /> {t('finance.toggle_subtotals', { defaultValue: 'Zwischensummen' })}
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[55vh] sm:max-h-[65vh] print:shadow-none print:border-none print:overflow-visible print:max-h-none">
                            <table className="w-full text-left text-sm whitespace-nowrap print:whitespace-normal relative">
                                <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider select-none shadow-sm print:static print:bg-white print:border-b-2 print:border-black">
                                    <tr>
                                        <th className="p-3 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 group transition-colors print:bg-white print:text-black" onClick={() => handleSort('timestamp')}>
                                            <div className="flex items-center gap-1">{t('finance.csv_date', { defaultValue: 'Datum' })} <span className="print:hidden">{renderSortIcon('timestamp')}</span></div>
                                        </th>
                                        <th className="p-3 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 group transition-colors print:bg-white print:text-black" onClick={() => handleSort('title')}>
                                            <div className="flex items-center gap-1">{t('finance.csv_purpose', { defaultValue: 'Zweck' })} <span className="print:hidden">{renderSortIcon('title')}</span></div>
                                        </th>
                                        <th className="p-3 font-bold bg-slate-50 text-right cursor-pointer hover:bg-slate-100 group transition-colors print:bg-white print:text-black" onClick={() => handleSort('amount')}>
                                            <div className="flex justify-end items-center gap-1">{t('finance.csv_amount', { defaultValue: 'Betrag' })} <span className="print:hidden">{renderSortIcon('amount')}</span></div>
                                        </th>
                                        <th className="p-3 font-bold bg-slate-50 text-right text-emerald-700 cursor-pointer hover:bg-slate-100 group transition-colors print:bg-white print:text-black" onClick={() => handleSort('amountBase')}>
                                            <div className="flex justify-end items-center gap-1">{t('finance.csv_amount_base', { defaultValue: 'Betrag in' })} {baseCurrency} <span className="print:hidden">{renderSortIcon('amountBase')}</span></div>
                                        </th>
                                        <th className="p-3 font-bold bg-slate-50 text-center cursor-pointer hover:bg-slate-100 group transition-colors print:bg-white print:text-black" onClick={() => handleSort('paidBy')}>
                                            <div className="flex justify-center items-center gap-1">{t('finance.csv_paid_by', { defaultValue: 'Bezahlt von' })} <span className="print:hidden">{renderSortIcon('paidBy')}</span></div>
                                        </th>
                                        {allNames.map(n => <th key={n} className="p-3 font-bold bg-slate-50 text-right border-l border-slate-200/50 print:bg-white print:border-slate-300 print:text-black">{n}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                                    {renderTableBody()}
                                </tbody>
                                <tfoot className="sticky bottom-0 z-30 bg-slate-50 font-bold shadow-[0_-4px_10px_rgba(0,0,0,0.05)] print:static print:shadow-none print:bg-white print:border-black">
                                    {/* ZEILE 1: ANTEILIGE KOSTEN */}
                                    <tr>
                                        <td colSpan={3} className="p-3 text-right text-slate-600 text-xs print:text-black">{t('finance.csv_total', { defaultValue: 'GESAMTKOSTEN (Anteil)' })}</td>
                                        <td className="p-3 text-right text-emerald-700 text-base print:text-black">{(() => {
                                            let totalBase = 0;
                                            sortedTableData.forEach(exp => {
                                                totalBase += exp.amount / getRateForCurrency(exp.currency || 'EUR');
                                            });
                                            return totalBase.toFixed(2);
                                        })()}</td>
                                        <td className="p-3"></td>
                                        {allNames.map(n => {
                                            let pTotal = 0;
                                            sortedTableData.forEach(exp => {
                                                const rate = getRateForCurrency(exp.currency || 'EUR');
                                                const amountBase = exp.amount / rate;
                                                if (exp.splitExact && exp.splitExact[n]) {
                                                    pTotal += exp.splitExact[n] / rate;
                                                } else if (exp.splitAmong && exp.splitAmong.includes(n)) {
                                                    pTotal += amountBase / exp.splitAmong.length;
                                                }
                                            });
                                            return <td key={`total-${n}`} className="p-3 text-right text-slate-800 border-l border-slate-200/50 print:border-slate-300 print:text-black">{pTotal.toFixed(2)}</td>;
                                        })}
                                    </tr>
                                    
                                    {/* ZEILE 2: BEZAHLT VON */}
                                    <tr className="bg-slate-100 print:bg-white border-t border-slate-200">
                                        <td colSpan={3} className="p-3 text-right text-slate-600 text-xs print:text-black">{t('finance.csv_paid', { defaultValue: 'BEZAHLT VON' })}</td>
                                        <td className="p-3"></td>
                                        <td className="p-3"></td>
                                        {allNames.map(n => (
                                            <td key={`paid-${n}`} className="p-3 text-right text-slate-800 border-l border-slate-200/50 print:border-slate-300 print:text-black">
                                                {(settlement.paidTotals[n] || 0).toFixed(2)}
                                            </td>
                                        ))}
                                    </tr>
                                    
                                    {/* ZEILE 3: BILANZ */}
                                    <tr className="bg-slate-200 print:bg-white border-t border-slate-300">
                                        <td colSpan={3} className="p-3 text-right text-slate-700 text-xs print:text-black">{t('finance.csv_balance', { defaultValue: 'BILANZ (+ Gutschrift / - Schuld)' })}</td>
                                        <td className="p-3"></td>
                                        <td className="p-3"></td>
                                        {allNames.map(n => {
                                            const bal = settlement.balances[n] || 0;
                                            return (
                                                <td key={`bal-${n}`} className={`p-3 text-right font-black border-l border-slate-300/50 print:border-slate-300 print:text-black ${bal > 0.01 ? 'text-emerald-600 print:text-black' : bal < -0.01 ? 'text-red-600 print:text-black' : 'text-slate-500 print:text-black'}`}>
                                                    {bal > 0.01 ? '+' : ''}{bal.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      <CurrencyConfigModal 
          isOpen={isCurrencyModalOpen} 
          onClose={() => setIsCurrencyModalOpen(false)} 
      />
      
      <LocationPickerModal 
          isOpen={showLocationPicker} 
          onClose={() => setShowLocationPicker(false)} 
          initialLocation={editLocation} 
          onSave={(loc) => setEditLocation(loc)} 
      />
    </>
  );
};
// --- END OF FILE 795 Zeilen ---
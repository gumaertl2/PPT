// 21.02.2026 15:10 - UX: Added Standalone ExpenseEntryButton to Modal Header and Empty State.
// 21.02.2026 14:35 - UX: Added live difference calculator for exact split mode.
// src/features/Cockpit/TripFinanceModal.tsx

import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { X, Wallet, ListFilter, Trash2, ArrowRightLeft, Banknote, Edit3, Save, Users, CheckCircle2 } from 'lucide-react'; 
import type { Expense } from '../../core/types/shared';
import { ExpenseEntryButton } from './ExpenseEntryButton'; // NEW: Import the reusable button

interface TripFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TripFinanceModal: React.FC<TripFinanceModalProps> = ({ isOpen, onClose }) => {
  const { project, deleteExpense, updateExpense } = useTripStore();
  const [activeTab, setActiveTab] = useState<'feed' | 'settlement'>('settlement');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editSplitMode, setEditSplitMode] = useState<'equal'|'exact'>('equal');
  const [editSplitAmong, setEditSplitAmong] = useState<string[]>([]);
  const [editSplitExact, setEditSplitExact] = useState<Record<string, string>>({});
  
  const expenses = Object.values(project.data.expenses || {}) as Expense[];
  const sortedFeed = [...expenses].sort((a, b) => b.timestamp - a.timestamp);

  const rawNames = project.userInputs.travelers.travelerNames || '';
  const allNames = rawNames.split(',').map(n => n.trim()).filter(Boolean);

  const startEdit = (exp: Expense) => {
      setEditingId(exp.id);
      setEditTitle(exp.title);
      setEditAmount(exp.amount.toString());
      setEditCurrency(exp.currency || 'EUR');
      setEditPaidBy(exp.paidBy);
      
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
              alert(`Fehler: Die Summe der exakten Aufteilung (${sum.toFixed(2)}) entspricht nicht dem Gesamtbetrag (${numAmount.toFixed(2)}).`);
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

  // --- ABRECHNUNGS-MATHEMATIK ---
  const settlement = useMemo(() => {
      const balances: Record<string, number> = {};
      const paidTotals: Record<string, number> = {};
      const totalsByCurrency: Record<string, number> = {};

      allNames.forEach(n => {
          balances[n] = 0;
          paidTotals[n] = 0;
      });

      expenses.forEach(exp => {
          const cur = exp.currency || 'EUR';
          if (!totalsByCurrency[cur]) totalsByCurrency[cur] = 0;
          totalsByCurrency[cur] += exp.amount;

          // Echte gezahlte Beträge
          if (!paidTotals[exp.paidBy]) paidTotals[exp.paidBy] = 0;
          paidTotals[exp.paidBy] += exp.amount;

          // Bilanzen: Zahler bekommt Plus
          if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
          balances[exp.paidBy] += exp.amount;

          // Bilanzen: Aufteiler bekommen Minus
          if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
              Object.entries(exp.splitExact).forEach(([person, amt]) => {
                  if (!balances[person]) balances[person] = 0;
                  balances[person] -= amt;
              });
          } else if (exp.splitAmong && exp.splitAmong.length > 0) {
              const splitAmount = exp.amount / exp.splitAmong.length;
              exp.splitAmong.forEach(person => {
                  if (!balances[person]) balances[person] = 0;
                  balances[person] -= splitAmount;
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
  }, [expenses, allNames]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-slate-50 w-full max-w-xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex justify-between items-center shrink-0 z-[110]">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Wallet className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold">Reisekasse</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <ExpenseEntryButton travelers={rawNames} mode="standalone" />
            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex p-3 bg-white border-b border-slate-200 shrink-0 gap-2 z-[100]">
            <button 
                onClick={() => setActiveTab('settlement')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <ArrowRightLeft className="w-4 h-4" /> Abrechnung
            </button>
            <button 
                onClick={() => setActiveTab('feed')} 
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${activeTab === 'feed' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <ListFilter className="w-4 h-4" /> Historie ({expenses.length})
            </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {expenses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                    <p className="mb-4">Noch keine Ausgaben erfasst.</p>
                    <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} />
                </div>
            ) : activeTab === 'settlement' ? (
                <div className="space-y-6 animate-in fade-in">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Gesamtkosten</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(settlement.totalsByCurrency).map(([cur, total]) => (
                                    <div key={cur} className="text-xl font-black text-emerald-700">
                                        {total.toFixed(2)} <span className="text-sm">{cur}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Wer hat gezahlt?</h3>
                             <div className="space-y-1.5">
                                 {Object.entries(settlement.paidTotals).sort((a,b) => b[1]-a[1]).map(([name, total]) => (
                                     <div key={name} className="flex justify-between items-center text-xs">
                                         <span className="font-bold text-slate-600">{name}</span>
                                         <span className="font-bold text-slate-800">{total > 0 ? total.toFixed(2) : '-'}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> Wer schuldet wem?</h3>
                        {settlement.transfers.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">Die Kasse ist perfekt ausgeglichen! 🎉</div>
                        ) : (
                            <div className="space-y-3">
                                {settlement.transfers.map((t, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-800">{t.from}</span>
                                            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                                            <span className="font-bold text-slate-800">{t.to}</span>
                                        </div>
                                        <div className="font-black text-amber-700">
                                            {t.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Stand (Bilanzen)</h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            {Object.entries(settlement.balances).map(([name, bal], idx) => (
                                <div key={name} className={`flex justify-between items-center p-3 text-sm ${idx !== 0 ? 'border-t border-slate-100' : ''}`}>
                                    <span className="font-bold text-slate-700">{name}</span>
                                    <span className={`font-bold ${bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-red-500' : 'text-slate-400'}`}>
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
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-300 shadow-md">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-emerald-700 uppercase"><Edit3 className="w-3.5 h-3.5 inline mr-1" /> Bearbeiten</span>
                                        <button onClick={() => setEditingId(null)} className="text-emerald-500 hover:text-emerald-800"><X className="w-4 h-4"/></button>
                                    </div>
                                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-sm font-bold border-emerald-200 rounded-lg p-2 mb-2 focus:ring-emerald-500 bg-white" placeholder="Titel" />
                                    <div className="flex gap-2 mb-3">
                                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="flex-1 text-base font-bold border-emerald-200 rounded-lg p-2 focus:ring-emerald-500 bg-white" />
                                        <input type="text" value={editCurrency} onChange={e => setEditCurrency(e.target.value.toUpperCase())} className="w-20 text-sm font-bold border-emerald-200 rounded-lg p-2 bg-white" placeholder="EUR" />
                                    </div>
                                    <div className="mb-3">
                                        <span className="text-[10px] font-bold text-emerald-600 block mb-1">Wer hat bezahlt?</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {allNames.map(n => (
                                                <button key={n} onClick={() => setEditPaidBy(n)} className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${editPaidBy === n ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 border border-emerald-200'}`}>{n}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="flex bg-white border border-emerald-200 rounded-lg mb-2 p-0.5">
                                            <button onClick={() => setEditSplitMode('equal')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'equal' ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-600 hover:bg-emerald-50'}`}>Gleichmäßig</button>
                                            <button onClick={() => setEditSplitMode('exact')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'exact' ? 'bg-emerald-100 text-emerald-800' : 'text-emerald-600 hover:bg-emerald-50'}`}>Exakter Betrag</button>
                                        </div>
                                        {editSplitMode === 'equal' ? (
                                            <div className="flex flex-wrap gap-1.5">
                                               {allNames.map(n => {
                                                   const active = editSplitAmong.includes(n);
                                                   return <button key={n} onClick={() => setEditSplitAmong(active ? editSplitAmong.filter(x => x !== n) : [...editSplitAmong, n])} className={`px-2 py-1 rounded text-[10px] font-bold border ${active ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-emerald-600 border-emerald-200'}`}>{n} {active && '✓'}</button>;
                                               })}
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 bg-white p-2 rounded-lg border border-emerald-200">
                                                {allNames.map(n => (
                                                    <div key={n} className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-600">{n}</span>
                                                        <div className="relative w-24">
                                                            <input type="number" step="0.01" value={editSplitExact[n] || ''} onChange={e => setEditSplitExact(prev => ({...prev, [n]: e.target.value}))} className="w-full text-right text-sm pr-7 pl-2 py-1 border border-slate-200 rounded focus:ring-emerald-500" />
                                                            <span className="absolute right-2 top-1.5 text-slate-400 text-[10px]">{editCurrency}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* LIVE CALCULATOR */}
                                                {(() => {
                                                    const rem = calculateRemaining();
                                                    const isPerfect = Math.abs(rem) < 0.01;
                                                    return (
                                                        <div className={`mt-2 p-2 rounded flex items-center justify-between text-xs font-bold ${isPerfect ? 'bg-emerald-100 text-emerald-700' : rem < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            <span>{isPerfect ? 'Aufteilung stimmt!' : rem > 0 ? 'Noch zu verteilen:' : 'Zu viel verteilt:'}</span>
                                                            <span className="flex items-center gap-1">{isPerfect && <CheckCircle2 className="w-3.5 h-3.5" />}{Math.abs(rem).toFixed(2)} {editCurrency}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleSaveEdit} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm flex justify-center items-center gap-2"><Save className="w-4 h-4"/> Speichern</button>
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
                                            <span>{new Date(exp.timestamp).toLocaleDateString('de-DE')}</span>
                                            <span>•</span>
                                            <span>Gezahlt von <strong className="text-emerald-700">{exp.paidBy}</strong></span>
                                        </div>
                                        {exp.splitExact && Object.keys(exp.splitExact).length > 0 ? (
                                            <div className="text-[10px] text-blue-500 mt-1 bg-blue-50 px-2 py-0.5 rounded inline-block">Aufteilung: Exakt</div>
                                        ) : exp.splitAmong && exp.splitAmong.length > 0 ? (
                                            <div className="text-[10px] text-slate-400 mt-1 truncate">Für: {exp.splitAmong.join(', ')}</div>
                                        ) : null}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 314 Zeilen ---
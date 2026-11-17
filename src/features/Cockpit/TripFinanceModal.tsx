// [2026-11-17] [16:19] - UX: Displayed per-person split amounts directly on Historie cards, auto-expanded exact/weights split on edit, and added live per-person preview for equal splits.
// [2026-11-17] [13:23] - UX/FIX: Highlighted active filters in Warm-Amber with reset pill and synced Table footer totals with active filters, splitWeights, and settlement exclusions.
// [2026-11-17] [13:16] - UX: Unified filter controls across Historie and Tabelle with matching filtered/total counter (e.g. 22/28).
// [2026-11-17] [13:05] - UX: Implemented Option A progressive disclosure for default per-person weights via 'Anteile' toggle button.
// [2026-11-17] [12:58] - FEAT: Shared renderDefaultWeightControl and added per-person default weight controls directly in the empty-state onboarding card.
// [2026-11-17] [12:56] - FIX: Scoped identity storage per roomId/project.meta.id, validated against allNames, and exposed 'Ich bin' selector in empty state.
// [2026-11-17] [12:52] - FIX: Supported comma-separated person input, added chip removal in empty state, and gated new expenses until identity & at least 1 person are set.
// [2026-11-17] [12:48] - FEAT: Added search clear 'X' button, fixed default per-person weights ('defaultExpenseWeights'), and 'Who are you?' onboarding prompt.
// [2026-11-17] [12:15] - FEAT: Added QR code invite, weighted splits ('splitWeights') in edit/tables/CSV, search+person filter in feed/table, and shared calculateExpenseSharesInBase helper.
// [2026-11-17] [12:02] - FEAT: Added inline trip name/dates editor in header and quick-setup empty state for standalone cash register use.
// [2026-11-17] [11:52] - FEAT: Added direct WhatsApp share button (wa.me) alongside native Share and Copy Link.
// [2026-11-17] [11:22] - FEAT: Derived displayTripName from logistics (Region/Land -> Ort/Zielgebiet -> Startort) when meta.name is still 'Neue Reise'.
// [2026-11-17] [11:15] - UX: Consolidated Paid/Share/Balances into one 'Pro Person' table, moved 'Ich bin' into total card, removed top subbar, and fixed single-row transfer cards.
// [2026-11-17] [10:50] - FIX: Restored full visibility of Print and CSV Download buttons in header (removed invalid 'hidden xs:inline-flex').
// [2026-11-17] [10:35] - FEAT: Added tripDates display, 'Ich bin' identity selector, '+ Person' with duplicate/online guard, Cash-Only focus toggle, native share, room delete in list, sync error banner, and per-person cost share.
// [2026-11-16] [19:25] - FEAT: Added selectable list of available cash rooms (trip name + open/closed status) in share panel.
// [2026-11-16] [19:18] - FEAT: Always show trip name, added room close/reopen, delete room, and join room by link UI.
// [2026-11-16] [17:48] - FEAT: Added 'Beglichen' settlement button and 'Bereits beglichen' history in Abrechnung tab.
// [2026-11-16] [17:35] - FEAT: Disabled expense editing and hid delete button in isGuestMode.
// [2026-11-16] [17:10] - FEAT: Added Firebase live-share button, invite link banner, and isGuestMode support.
// 21.03.2026 19:45 - FIX: Removed unused variables (MapPinOff, isUpdatingGPS) to fix TypeScript build error TS6133.
// 21.03.2026 19:30 - FEAT: Added LocationPickerModal to manual Edit View allowing users to select accurate expense locations on map.
// src/features/Cockpit/TripFinanceModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  X, Wallet, ListFilter, Trash2, ArrowRightLeft, Banknote, Edit3, 
  Save, CheckCircle2, Users, MapPin, Landmark, Download, TableProperties,
  ChevronUp, ChevronDown, ChevronsUpDown, Sigma, Printer, Map as MapIcon,
  Share2, Copy, Check, Cloud, Lock, Unlock, LogIn, UserPlus, User, Maximize2, Minimize2, AlertTriangle, MessageCircle, QrCode, Search
} from 'lucide-react'; 
import { QRCodeSVG } from 'qrcode.react';
import type { Expense, LanguageCode, CurrencyConfig } from '../../core/types/shared';
import { calculateExpenseSharesInBase, computeWeightedAmounts } from '../../core/utils/finance';
import { ExpenseEntryButton } from './ExpenseEntryButton'; 
import { CurrencyConfigModal } from './CurrencyConfigModal';
import { LocationPickerModal } from './LocationPickerModal';
import {
  createCashRoom,
  isFirebaseConfigured,
  setCashRoomStatus,
  deleteCashRoom,
  listAvailableCashRooms,
  rememberCashRoom,
  addTravelerSafe,
  getStoredCashIdentity,
  setStoredCashIdentity,
  type CashRoomListItem
} from '../../services/firebaseCashService';

interface TripFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  setViewMode?: (mode: any) => void;
  isGuestMode?: boolean;
}

export const TripFinanceModal: React.FC<TripFinanceModalProps> = ({ isOpen, onClose, setViewMode, isGuestMode = false }) => {
  const { project, setProject, addExpense, deleteExpense, updateExpense, setUIState, uiState, setCashSync, cashSyncError, isCashRoomLoaded, setTravelers, setDefaultExpenseWeights } = useTripStore();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const [activeTab, setActiveTab] = useState<'feed' | 'settlement' | 'table'>('settlement');
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [availableRooms, setAvailableRooms] = useState<CashRoomListItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const identityScopeId = project.data.cashSync?.roomId || project.meta?.id;
  const [myIdentity, setMyIdentity] = useState<string>(() => getStoredCashIdentity(identityScopeId));
  const [identityDismissed, setIdentityDismissed] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonError, setNewPersonError] = useState<string | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isEditingTripMeta, setIsEditingTripMeta] = useState(false);
  const [draftTripName, setDraftTripName] = useState('');
  const [draftTripDates, setDraftTripDates] = useState('');
  const [isEditingDefaultWeights, setIsEditingDefaultWeights] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPersonFilter, setHistoryPersonFilter] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'timestamp', direction: 'desc' });
  const [showSubtotals, setShowSubtotals] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editDate, setEditDate] = useState(''); 
  const [editSplitMode, setEditSplitMode] = useState<'equal'|'weights'|'exact'>('equal');
  const [editSplitAmong, setEditSplitAmong] = useState<string[]>([]);
  const [editSplitWeights, setEditSplitWeights] = useState<Record<string, number>>({});
  const [editSplitExact, setEditSplitExact] = useState<Record<string, string>>({});
  const [showSplit, setShowSplit] = useState(false);

  const displayTripName = useMemo(() => {
    const rawNameMeta = project.meta?.name?.trim();
    if (rawNameMeta && rawNameMeta !== 'Neue Reise' && rawNameMeta !== 'New Trip') {
      return rawNameMeta;
    }
    const logistics = project.userInputs?.logistics;
    if (logistics?.mode === 'stationaer') {
      const region = logistics.stationary?.region?.trim();
      const dest = logistics.stationary?.destination?.trim();
      if (region) return region;
      if (dest) return dest;
    } else if (logistics) {
      const region = logistics.roundtrip?.region?.trim();
      const start = logistics.roundtrip?.startLocation?.trim();
      if (region) return region;
      if (start) return start;
    }
    return rawNameMeta || 'Reisekasse';
  }, [project.meta?.name, project.userInputs?.logistics]);
  
  const [editLocation, setEditLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
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

  const matchesHistoryFilter = (exp: Expense) => {
      if (historySearch.trim()) {
          const q = historySearch.trim().toLowerCase();
          if (!exp.title.toLowerCase().includes(q) && !exp.paidBy.toLowerCase().includes(q)) {
              return false;
          }
      }
      if (historyPersonFilter) {
          const involved =
              exp.paidBy === historyPersonFilter ||
              (exp.splitAmong?.includes(historyPersonFilter) ?? false) ||
              Boolean(exp.splitExact && (exp.splitExact[historyPersonFilter] || 0) > 0) ||
              Boolean(exp.splitWeights && (exp.splitWeights[historyPersonFilter] || 0) > 0);
          if (!involved) return false;
      }
      return true;
  };

  const filteredFeed = useMemo(
      () => sortedFeed.filter(matchesHistoryFilter),
      [sortedFeed, historySearch, historyPersonFilter]
  );

  const filteredTableData = useMemo(
      () => sortedTableData.filter(matchesHistoryFilter),
      [sortedTableData, historySearch, historyPersonFilter]
  );

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
      
      const defaultWeights: Record<string, number> = {};
      allNames.forEach((n: string) => { defaultWeights[n] = 1; });

      if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
          setEditSplitMode('exact');
          setShowSplit(true);
          setEditSplitAmong(allNames);
          setEditSplitWeights(defaultWeights);
          const strExact: Record<string, string> = {};
          Object.entries(exp.splitExact).forEach(([k,v]) => strExact[k] = v.toString());
          setEditSplitExact(strExact);
      } else if (exp.splitWeights && Object.keys(exp.splitWeights).length > 0) {
          setEditSplitMode('weights');
          setShowSplit(true);
          setEditSplitAmong(Object.keys(exp.splitWeights));
          const mergedWeights: Record<string, number> = {};
          allNames.forEach((n: string) => { mergedWeights[n] = exp.splitWeights?.[n] ?? 0; });
          setEditSplitWeights(mergedWeights);
          setEditSplitExact({});
      } else {
          setEditSplitMode('equal');
          setEditSplitAmong(exp.splitAmong || allNames);
          setEditSplitWeights(defaultWeights);
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
      let finalSplitWeights: Record<string, number> | undefined = undefined;
      let finalSplitAmong: string[] = editSplitMode === 'equal' ? editSplitAmong : [];
      
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
      } else if (editSplitMode === 'weights') {
          const weightData: Record<string, number> = {};
          let totalW = 0;
          for (const n of allNames) {
              const w = editSplitWeights[n] ?? 0;
              if (w > 0) {
                  weightData[n] = w;
                  totalW += w;
              }
          }
          if (totalW <= 0) return;
          finalSplitWeights = weightData;
          finalSplitAmong = Object.keys(weightData);
      }

      updateExpense(editingId, {
          title: editTitle,
          amount: numAmount,
          currency: editCurrency,
          paidBy: editPaidBy,
          splitAmong: finalSplitAmong,
          splitExact: finalSplitExact,
          splitWeights: finalSplitWeights,
          timestamp: editDate ? new Date(editDate).getTime() : Date.now(),
          location: editLocation || undefined
      });
      setEditingId(null);
  };

  const settlement = useMemo(() => {
      const balances: Record<string, number> = {};
      const paidTotals: Record<string, number> = {};
      const spentTotals: Record<string, number> = {};
      const totalsByCurrency: Record<string, number> = {};
      const settledPayments: Expense[] = [];

      allNames.forEach((n: string) => { 
          balances[n] = 0;
          paidTotals[n] = 0;
          spentTotals[n] = 0;
      });

      expenses.forEach(exp => {
          const cur = exp.currency || 'EUR';
          const rate = getRateForCurrency(cur);
          const amountInBase = exp.amount / rate;

          if (exp.isSettlement) {
              settledPayments.push(exp);
          } else {
              if (!totalsByCurrency[cur]) totalsByCurrency[cur] = 0;
              totalsByCurrency[cur] += exp.amount;

              if (!paidTotals[exp.paidBy]) paidTotals[exp.paidBy] = 0;
              paidTotals[exp.paidBy] += amountInBase;
          }

          if (!balances[exp.paidBy]) balances[exp.paidBy] = 0;
          balances[exp.paidBy] += amountInBase;

          const sharesInBase = calculateExpenseSharesInBase(exp, rate);
          Object.entries(sharesInBase).forEach(([person, shareAmt]) => {
              if (!balances[person]) balances[person] = 0;
              balances[person] -= shareAmt;
              if (!exp.isSettlement) {
                  spentTotals[person] = (spentTotals[person] || 0) + shareAmt;
              }
          });
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

      settledPayments.sort((a, b) => b.timestamp - a.timestamp);
      return { balances, paidTotals, spentTotals, transfers, totalsByCurrency, settledPayments };
  }, [expenses, allNames, currencyConfig, baseCurrency]);

  const handleMarkSettled = (from: string, to: string, amount: number) => {
      const formatted = amount.toFixed(2);
      if (!window.confirm(t('finance.confirm_settle', { defaultValue: `${from} hat ${formatted} ${baseCurrency} an ${to} bezahlt?`, from, to, amount: formatted, currency: baseCurrency }))) {
          return;
      }
      addExpense({
          id: crypto.randomUUID(),
          title: t('finance.settlement_title', { defaultValue: `Ausgleich: ${from} → ${to}`, from, to }),
          amount: Number(amount.toFixed(2)),
          currency: baseCurrency,
          paidBy: from,
          splitAmong: [to],
          timestamp: Date.now(),
          isSettlement: true
      });
  };

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

          const calculatedShares = calculateExpenseSharesInBase(exp, rate);
          Object.entries(calculatedShares).forEach(([person, amtBase]) => {
              shares[person] = amtBase;
              personTotals[person] = (personTotals[person] || 0) + amtBase;
          });

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
      link.setAttribute("download", `Reisekasse_${displayTripName.replace(/\s+/g, '_')}.csv`);
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

      filteredTableData.forEach((exp, idx) => {
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
          
          const calculatedShares = calculateExpenseSharesInBase(exp, rate);
          Object.entries(calculatedShares).forEach(([person, amtBase]) => {
              shares[person] = amtBase;
          });

          groupTotalBase += amountBase;
          allNames.forEach(n => groupShares[n] += shares[n]);

          rows.push(
              <tr key={exp.id} className={`hover:bg-slate-50 transition-colors group ${isGuestMode ? '' : 'cursor-pointer'}`} onClick={isGuestMode ? undefined : () => {setActiveTab('feed'); setTimeout(() => startEdit(exp), 50)}}>
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

          if (showSubtotals && idx === filteredTableData.length - 1) {
              pushSubtotal(currentGroupKey);
          }
      });

      return rows;
  };

  const cashSync = project.data.cashSync;
  const isRoomClosed = Boolean(cashSync?.enabled && cashSync?.roomStatus === 'closed');
  const computedTripDates = useMemo(() => {
    if (cashSync?.tripDates) return cashSync.tripDates;
    const d = project.userInputs?.dates;
    if (!d) return '';
    if (d.fixedDates?.trim()) return d.fixedDates.trim();
    const fmt = (iso?: string) => {
      if (!iso) return '';
      const dt = new Date(iso);
      return isNaN(dt.getTime()) ? iso : dt.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US');
    };
    if (d.start && d.end) return `${fmt(d.start)} – ${fmt(d.end)}`;
    if (d.start) return fmt(d.start);
    if (d.duration) return `${d.duration} ${t('wizard.days', { defaultValue: 'Tage' })}`;
    return '';
  }, [cashSync?.tripDates, project.userInputs?.dates, currentLang, t]);

  const openTripMetaEditor = () => {
    setDraftTripName(displayTripName === 'Neue Reise' || displayTripName === 'Reisekasse' ? '' : displayTripName);
    setDraftTripDates(computedTripDates);
    setIsEditingTripMeta(true);
  };

  const handleSaveTripMeta = () => {
    const cleanName = draftTripName.trim() || 'Neue Reise';
    const cleanDates = draftTripDates.trim();
    setProject({
      ...project,
      meta: {
        ...project.meta,
        name: cleanName,
        updatedAt: new Date().toISOString()
      },
      userInputs: {
        ...project.userInputs,
        dates: {
          ...project.userInputs.dates,
          fixedDates: cleanDates || undefined
        }
      },
      data: {
        ...project.data,
        ...(project.data.cashSync ? {
          cashSync: {
            ...project.data.cashSync,
            tripDates: cleanDates || undefined
          }
        } : {})
      }
    });
    setIsEditingTripMeta(false);
  };

  const inviteUrl = cashSync?.roomId && cashSync?.writeToken
    ? `${window.location.origin}${window.location.pathname}?cashRoom=${encodeURIComponent(cashSync.roomId)}&token=${encodeURIComponent(cashSync.writeToken)}`
    : '';

  useEffect(() => {
    setMyIdentity(getStoredCashIdentity(identityScopeId));
    setIdentityDismissed(false);
  }, [identityScopeId]);

  const handleIdentityChange = (name: string) => {
    setMyIdentity(name);
    setStoredCashIdentity(identityScopeId, name);
  };

  const activeIdentity = allNames.includes(myIdentity) ? myIdentity : '';

  const defaultExpenseWeights = project.data.defaultExpenseWeights || {};

  const handleStepDefaultWeight = (person: string, delta: number) => {
    const current = defaultExpenseWeights[person] ?? 1;
    const nextVal = Math.max(0, Number((current + delta).toFixed(1)));
    setDefaultExpenseWeights({
      ...defaultExpenseWeights,
      [person]: nextVal
    });
  };

  const renderDefaultWeightControl = (name: string) => {
    const defaultW = defaultExpenseWeights[name] ?? 1;
    if (isEditingDefaultWeights && !isGuestMode && !isRoomClosed) {
      return (
        <span
          className={`inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[10px] font-bold print:hidden ${defaultW !== 1 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
          title={t('finance.default_weight_tooltip', { defaultValue: 'Standard-Anteile bei neuen Ausgaben' })}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleStepDefaultWeight(name, -0.5); }}
            className="px-1 hover:text-slate-900"
          >
            -
          </button>
          <span className="min-w-[22px] text-center">{defaultW}×</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleStepDefaultWeight(name, 0.5); }}
            className="px-1 hover:text-slate-900"
          >
            +
          </button>
        </span>
      );
    }
    if (defaultW !== 1) {
      if (!isGuestMode && !isRoomClosed) {
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsEditingDefaultWeights(true); }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold transition-colors"
            title={t('finance.edit_weights', { defaultValue: 'Standard-Anteile anpassen' })}
          >
            {defaultW}×
          </button>
        );
      }
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
          {defaultW}×
        </span>
      );
    }
    return null;
  };

  const renderWeightsToggleButton = () => {
    if (isGuestMode || isRoomClosed || allNames.length === 0) return null;
    return (
      <button
        type="button"
        onClick={() => setIsEditingDefaultWeights((prev) => !prev)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors print:hidden ${isEditingDefaultWeights ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-200'}`}
        title={t('finance.edit_weights', { defaultValue: 'Standard-Anteile pro Person festlegen' })}
      >
        <Edit3 className="w-3 h-3" />
        {isEditingDefaultWeights ? t('actions.done', { defaultValue: 'Fertig' }) : t('finance.weights_short', { defaultValue: 'Anteile' })}
      </button>
    );
  };

  const isFilterActive = Boolean(historySearch.trim() || historyPersonFilter);

  const clearAllFilters = () => {
    setHistorySearch('');
    setHistoryPersonFilter('');
  };

  const renderFilterControls = (filteredCount: number, compact = false) => (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'w-full'}`}>
      {renderSearchInput(compact)}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={historyPersonFilter}
          onChange={(e) => setHistoryPersonFilter(e.target.value)}
          className={
            historyPersonFilter
              ? compact
                ? 'px-2 py-1 text-xs font-bold bg-amber-50/80 border border-amber-400 rounded-lg text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400'
                : 'px-2.5 py-1.5 text-xs font-bold bg-amber-50/80 border border-amber-400 rounded-lg text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400'
              : compact
                ? 'px-2 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400'
                : 'px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400'
          }
        >
          <option value="">{t('finance.all_persons', { defaultValue: 'Alle Personen' })}</option>
          {allNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        {isFilterActive ? (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-sm transition-colors tabular-nums"
            title={t('finance.clear_filters', { defaultValue: 'Alle Filter zurücksetzen' })}
          >
            <ListFilter className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('finance.filtered_count', { defaultValue: 'Gefiltert: {{filtered}} von {{total}}', filtered: filteredCount, total: expenses.length })}</span>
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400 tabular-nums">
            {filteredCount}/{expenses.length}
          </span>
        )}
      </div>
    </div>
  );

  const renderSearchInput = (compact = false) => {
    const hasSearch = Boolean(historySearch.trim());
    return (
      <div className={`relative ${compact ? '' : 'flex-1'}`}>
        <Search className={`w-3.5 h-3.5 ${hasSearch ? 'text-amber-600' : 'text-slate-400'} absolute ${compact ? 'left-2.5' : 'left-3'} top-1/2 -translate-y-1/2`} />
        <input
          type="text"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder={compact ? t('finance.search_placeholder', { defaultValue: 'Suchen...' }) : t('finance.search_placeholder', { defaultValue: 'Ausgabe suchen...' })}
          className={
            hasSearch
              ? compact
                ? 'pl-7 pr-7 py-1 text-xs font-semibold bg-amber-50/80 border border-amber-400 text-amber-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 w-36 sm:w-44'
                : 'w-full pl-8 pr-8 py-1.5 text-xs font-semibold bg-amber-50/80 border border-amber-400 text-amber-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400'
              : compact
                ? 'pl-7 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 w-36 sm:w-44'
                : 'w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400'
          }
        />
        {historySearch && (
          <button
            type="button"
            onClick={() => setHistorySearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/70 transition-colors"
            title={t('actions.clear', { defaultValue: 'Eingabe löschen' })}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  const handleAddPersonFromModal = async () => {
    setIsAddingPerson(true);
    setNewPersonError(null);
    try {
      const res = await addTravelerSafe({
        rawInputName: newPersonName,
        currentTravelerNames: rawNames,
        cashSync
      });
      if (!res.ok) {
        setNewPersonError(res.error);
      } else {
        setTravelers({ travelerNames: res.updatedTravelerNames });
        setNewPersonName('');
        setShowAddPerson(false);
        if (!myIdentity && res.addedNames.length === 1) {
          handleIdentityChange(res.addedNames[0]);
        } else if (!myIdentity && res.addedNames.length > 1) {
          setIdentityDismissed(false);
        }
      }
    } catch (err: any) {
      setNewPersonError(err?.message || 'Fehler beim Hinzufügen.');
    } finally {
      setIsAddingPerson(false);
    }
  };

  const handleRemovePersonInEmptyState = (nameToRemove: string) => {
    if (expenses.length > 0 || isGuestMode) return;
    const remaining = allNames.filter((n) => n !== nameToRemove);
    setTravelers({ travelerNames: remaining.join(', ') });
    if (myIdentity === nameToRemove) {
      handleIdentityChange('');
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!inviteUrl || !canNativeShare) return;
    try {
      await navigator.share({
        title: `${t('finance.title', { defaultValue: 'Reisekasse' })}: ${displayTripName}`,
        text: `Reisekasse ${displayTripName}${computedTripDates ? ` (${computedTripDates})` : ''}:`,
        url: inviteUrl
      });
    } catch {
      // user cancelled share sheet
    }
  };

  const handleDeleteRoomFromList = async (e: React.MouseEvent, room: CashRoomListItem) => {
    e.stopPropagation();
    if (!window.confirm(t('finance.delete_room_confirm', { defaultValue: `Live-Raum "${room.tripName}" in Firebase wirklich löschen? Alle Links werden ungültig.` }))) {
      return;
    }
    try {
      await deleteCashRoom(room.roomId);
      setAvailableRooms((prev) => prev.filter((r) => r.roomId !== room.roomId));
    } catch (err: any) {
      setShareError(err?.message || 'Raum konnte nicht gelöscht werden.');
    }
  };

  useEffect(() => {
    if (!showSharePanel || cashSync?.enabled || isGuestMode || !isFirebaseConfigured()) return;
    let active = true;
    setIsLoadingRooms(true);
    listAvailableCashRooms()
      .then((rooms) => {
        if (active) setAvailableRooms(rooms);
      })
      .catch(() => {
        if (active) setAvailableRooms([]);
      })
      .finally(() => {
        if (active) setIsLoadingRooms(false);
      });
    return () => { active = false; };
  }, [showSharePanel, cashSync?.enabled, isGuestMode]);

  const handleSelectAvailableRoom = (room: CashRoomListItem) => {
    if (expenses.length > 0 && !window.confirm(t('finance.join_overwrite_confirm', { defaultValue: 'Achtung: Deine aktuell geladenen Ausgaben werden durch die des Raums ersetzt. Fortfahren?' }))) {
      return;
    }
    rememberCashRoom({ roomId: room.roomId, writeToken: room.writeToken, tripName: room.tripName });
    setCashSync({ roomId: room.roomId, writeToken: room.writeToken, enabled: true, roomStatus: room.status });
  };

  const handleToggleShare = () => {
    setShareError(null);
    setShowSharePanel((prev) => !prev);
  };

  const handleCreateRoom = async () => {
    if (!isFirebaseConfigured()) {
      setShareError(t('finance.firebase_not_configured', { defaultValue: 'Firebase ist noch nicht konfiguriert (.env.local).' }));
      return;
    }
    setIsCreatingRoom(true);
    setShareError(null);
    try {
      const { roomId, writeToken } = await createCashRoom({
        tripName: displayTripName,
        tripDates: computedTripDates || undefined,
        travelerNames: rawNames,
        currencyConfig,
        defaultWeights: project.data.defaultExpenseWeights,
        initialExpenses: (project.data.expenses || {}) as Record<string, Expense>
      });
      setCashSync({ roomId, writeToken, enabled: true, roomStatus: 'open', tripDates: computedTripDates || undefined });
    } catch (err: any) {
      setShareError(err?.message || 'Fehler beim Erstellen der Live-Kasse.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoomByLink = () => {
    setShareError(null);
    const trimmed = joinLinkInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `${window.location.origin}/?${trimmed.replace(/^\?/, '')}`);
      const roomId = parsed.searchParams.get('cashRoom');
      const writeToken = parsed.searchParams.get('token');
      if (!roomId || !writeToken) {
        setShareError(t('finance.invalid_join_link', { defaultValue: 'Ungültiger Einladungslink (cashRoom/token fehlt).' }));
        return;
      }
      if (expenses.length > 0 && !window.confirm(t('finance.join_overwrite_confirm', { defaultValue: 'Achtung: Deine aktuell geladenen Ausgaben werden durch die des Raums ersetzt. Fortfahren?' }))) {
        return;
      }
      rememberCashRoom({ roomId, writeToken });
      setCashSync({ roomId, writeToken, enabled: true, roomStatus: 'open' });
      setJoinLinkInput('');
    } catch {
      setShareError(t('finance.invalid_join_link', { defaultValue: 'Ungültiger Einladungslink.' }));
    }
  };

  const handleToggleRoomStatus = async () => {
    if (!cashSync?.roomId || !cashSync?.writeToken) return;
    const nextStatus = isRoomClosed ? 'open' : 'closed';
    setIsCreatingRoom(true);
    setShareError(null);
    try {
      await setCashRoomStatus(cashSync.roomId, cashSync.writeToken, nextStatus);
      setCashSync({ ...cashSync, roomStatus: nextStatus });
    } catch (err: any) {
      setShareError(err?.message || 'Status konnte nicht geändert werden.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!cashSync?.roomId) return;
    if (!window.confirm(t('finance.delete_room_confirm', { defaultValue: 'Live-Raum in Firebase wirklich löschen? Alle Links werden ungültig (deine lokalen Ausgaben bleiben erhalten).' }))) {
      return;
    }
    setIsCreatingRoom(true);
    setShareError(null);
    try {
      await deleteCashRoom(cashSync.roomId);
      setCashSync(undefined);
      setShowSharePanel(false);
    } catch (err: any) {
      setShareError(err?.message || 'Raum konnte nicht gelöscht werden (nur der Ersteller darf löschen).');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const showIdentityPrompt =
    !activeIdentity &&
    !identityDismissed &&
    (isGuestMode
      ? isCashRoomLoaded
      : cashSync?.enabled
        ? isCashRoomLoaded && allNames.length > 0
        : allNames.length > 0);

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
        <div className="finance-print-container fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={isGuestMode ? undefined : onClose}>
          <div className={`finance-print-inner relative bg-slate-50 w-full ${isGuestMode ? 'max-w-4xl h-[94dvh]' : 'max-w-4xl max-h-[90dvh] h-full sm:h-[85vh]'} rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:rounded-none print:border-none`} onClick={e => e.stopPropagation()}>

            {showIdentityPrompt && (
              <div className="absolute inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-800 truncate">
                        {t('finance.who_are_you', { defaultValue: 'Wer bist du?' })}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {displayTripName}{computedTripDates ? ` · ${computedTripDates}` : ''}
                      </p>
                    </div>
                  </div>

                  {allNames.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        {t('finance.select_your_name', { defaultValue: 'Tippe auf deinen Namen (für Vorauswahl & Übersicht):' })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {allNames.map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleIdentityChange(n)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 text-sm font-bold transition-colors shadow-sm"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isRoomClosed && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        {allNames.length > 0
                          ? t('finance.or_new_name', { defaultValue: 'Noch nicht dabei? Eigenen Namen anlegen:' })
                          : t('finance.enter_your_name', { defaultValue: 'Gib deinen Namen ein, um zu starten:' })}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPersonName}
                          onChange={(e) => { setNewPersonName(e.target.value); setNewPersonError(null); }}
                          placeholder={t('finance.new_person_placeholder', { defaultValue: 'Dein Name...' })}
                          className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddPersonFromModal();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddPersonFromModal}
                          disabled={!newPersonName.trim() || isAddingPerson}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 transition-colors shrink-0"
                        >
                          <UserPlus className="w-4 h-4" />
                          {t('actions.save', { defaultValue: 'Weiter' })}
                        </button>
                      </div>
                      {newPersonError && (
                        <p className="text-xs font-medium text-red-600">{newPersonError}</p>
                      )}
                    </div>
                  )}

                  {!isGuestMode && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIdentityDismissed(true)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        {t('finance.choose_later', { defaultValue: 'Später wählen' })}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Screen Header */}
            <div className="relative z-50 bg-white border-b border-slate-200 px-3 sm:px-5 py-3 sm:py-4 flex justify-between items-center shrink-0 print:hidden">
              <div className="flex items-center gap-2 text-slate-800 min-w-0 mr-2">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 shrink-0"><Wallet className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-lg font-bold truncate">
                      {t('finance.title', { defaultValue: 'Reisekasse' })}
                      {displayTripName ? ` · ${displayTripName}` : ''}
                    </h2>
                    {!isGuestMode && (
                      <button
                        type="button"
                        onClick={openTripMetaEditor}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0"
                        title={t('finance.edit_trip_meta', { defaultValue: 'Reisename & Zeitraum ändern' })}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {cashSync?.enabled && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${isRoomClosed ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {isRoomClosed ? <Lock className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                        {isRoomClosed ? t('finance.room_closed_badge', { defaultValue: 'Geschlossen' }) : 'Live'}
                      </span>
                    )}
                  </div>
                  {computedTripDates && (
                    <p className="text-[11px] text-slate-400 font-medium truncate">{computedTripDates}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {allNames.length > 0 && Boolean(activeIdentity) && (!isRoomClosed || allNames.length >= 2) && (
                  <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={true} onlySettlement={isRoomClosed} />
                )}

                <button
                  onClick={handleToggleShare}
                  disabled={isCreatingRoom}
                  className={`p-2 rounded-lg transition-colors border shrink-0 ${cashSync?.enabled ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-slate-500 border-transparent hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100'}`}
                  title={t('finance.share_live', { defaultValue: 'Live-Kasse teilen (Einladungslink)' })}
                >
                  <Share2 className="w-5 h-5" />
                </button>
                
                <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.print_tooltip', { defaultValue: 'Ansicht drucken' })}>
                    <Printer className="w-5 h-5" />
                </button>

                <button onClick={handleExportCSV} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.export_csv', { defaultValue: 'Als CSV exportieren' })}>
                    <Download className="w-5 h-5" />
                </button>

                <button onClick={() => setIsCurrencyModalOpen(true)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shrink-0" title={t('finance.currency_config_title', { defaultValue: 'Währungen konfigurieren' })}>
                    <Landmark className="w-5 h-5" />
                </button>
                {!isGuestMode && (
                  uiState.isCashOnlyMode ? (
                    <>
                      <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                      <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition-colors shrink-0"
                        title={t('finance.back_to_planner', { defaultValue: 'Zurück zum Reiseplaner' })}
                      >
                        <Minimize2 className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('finance.planner_short', { defaultValue: 'Planer' })}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setUIState({ isCashOnlyMode: true })}
                        className="p-2 rounded-lg transition-colors border border-transparent text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 shrink-0"
                        title={t('finance.cash_only_mode', { defaultValue: 'Fokus-Modus: Nur Reisekasse anzeigen' })}
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                      <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                      <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
                        title={t('actions.close', { defaultValue: 'Schließen' })}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )
                )}
              </div>
            </div>

            {isEditingTripMeta && !isGuestMode && (
              <div className="bg-blue-50/70 border-b border-blue-200 px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center gap-2 shrink-0 print:hidden">
                <input
                  type="text"
                  value={draftTripName}
                  onChange={(e) => setDraftTripName(e.target.value)}
                  placeholder={t('finance.trip_name_placeholder', { defaultValue: 'Reisename (z.B. La Palma 2026)' })}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
                <input
                  type="text"
                  value={draftTripDates}
                  onChange={(e) => setDraftTripDates(e.target.value)}
                  placeholder={t('finance.trip_dates_placeholder', { defaultValue: 'Zeitraum (z.B. 8.11. – 15.11.2026)' })}
                  className="sm:w-56 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveTripMeta}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                  >
                    {t('actions.save', { defaultValue: 'Speichern' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTripMeta(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-medium transition-colors"
                  >
                    {t('actions.cancel', { defaultValue: 'Abbrechen' })}
                  </button>
                </div>
              </div>
            )}

            {cashSyncError && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 font-medium flex items-center gap-2 shrink-0 print:hidden">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {cashSyncError}
              </div>
            )}

            {showSharePanel && (
              <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 text-xs sm:text-sm space-y-2.5 shrink-0 print:hidden">
                {shareError && (
                  <div className="text-red-600 font-medium">{shareError}</div>
                )}

                {cashSync?.enabled ? (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-emerald-900">
                          {t('finance.share_title', { defaultValue: 'Einladungslink für Mitreisende (Live-Sync)' })}
                          <span className="ml-2 text-[11px] font-normal text-emerald-700">
                            ({displayTripName} · ID: {cashSync.roomId.slice(0, 8)})
                          </span>
                        </p>
                        <p className="text-emerald-700 truncate font-mono text-[11px] mt-0.5">{inviteUrl}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowQrCode((prev) => !prev)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border transition-colors shrink-0 ${showQrCode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100'}`}
                        >
                          <QrCode className="w-4 h-4" />
                          QR-Code
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Reisekasse ${displayTripName}${computedTripDates ? ` (${computedTripDates})` : ''}: ${inviteUrl}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#1ebe5d] transition-colors shrink-0"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </a>
                        {canNativeShare && (
                          <button
                            onClick={handleNativeShare}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shrink-0"
                          >
                            <Share2 className="w-4 h-4" />
                            {t('actions.share', { defaultValue: 'Teilen' })}
                          </button>
                        )}
                        <button
                          onClick={handleCopyInvite}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shrink-0"
                        >
                          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedLink ? t('finance.copied', { defaultValue: 'Kopiert!' }) : t('finance.copy_link', { defaultValue: 'Link kopieren' })}
                        </button>
                      </div>
                    </div>

                    {showQrCode && inviteUrl && (
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-emerald-200 w-fit">
                        <QRCodeSVG value={inviteUrl} size={136} level="M" />
                        <div className="text-xs text-slate-600 max-w-[200px]">
                          <p className="font-bold text-slate-800 mb-1">{t('finance.qr_scan_title', { defaultValue: 'Einfach abfotografieren' })}</p>
                          <p>{t('finance.qr_scan_desc', { defaultValue: 'Mitreisende können diesen QR-Code direkt mit der Handy-Kamera scannen, um der Reisekasse beizutreten.' })}</p>
                        </div>
                      </div>
                    )}

                    {!isGuestMode && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/70">
                        <button
                          onClick={handleToggleRoomStatus}
                          disabled={isCreatingRoom}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isRoomClosed ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'}`}
                        >
                          {isRoomClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {isRoomClosed ? t('finance.reopen_room', { defaultValue: 'Raum wieder öffnen' }) : t('finance.close_room', { defaultValue: 'Raum schließen (nur noch bezahlen)' })}
                        </button>
                        <button
                          onClick={() => {
                            rememberCashRoom({ roomId: cashSync.roomId, writeToken: cashSync.writeToken, tripName: displayTripName });
                            setCashSync({ ...cashSync, enabled: false });
                            setShowSharePanel(false);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 text-xs font-medium"
                        >
                          {t('finance.pause_sync', { defaultValue: 'Sync pausieren' })}
                        </button>
                        <button
                          onClick={handleDeleteRoom}
                          disabled={isCreatingRoom}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs font-semibold ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('finance.delete_room', { defaultValue: 'Raum löschen' })}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCreateRoom}
                          disabled={isCreatingRoom}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0"
                        >
                          <Share2 className="w-4 h-4" />
                          {t('finance.start_live_room', { defaultValue: 'Live-Kasse starten & Link erstellen' })}
                        </button>
                      </div>
                      {!isGuestMode && (
                        <div className="flex items-center gap-1.5 flex-1 max-w-md">
                          <input
                            type="text"
                            value={joinLinkInput}
                            onChange={(e) => setJoinLinkInput(e.target.value)}
                            placeholder={t('finance.join_link_placeholder', { defaultValue: 'Oder Einladungslink einfügen...' })}
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                          <button
                            onClick={handleJoinRoomByLink}
                            disabled={!joinLinkInput.trim()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold disabled:opacity-50 shrink-0"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            {t('finance.join_room', { defaultValue: 'Beitreten' })}
                          </button>
                        </div>
                      )}
                    </div>

                    {!isGuestMode && (isLoadingRooms || availableRooms.length > 0) && (
                      <div className="pt-2 border-t border-emerald-200/70">
                        <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide mb-1.5">
                          {t('finance.existing_rooms', { defaultValue: 'Vorhandene Live-Räume' })}
                        </p>
                        {isLoadingRooms ? (
                          <p className="text-xs text-emerald-700">{t('finance.loading_rooms', { defaultValue: 'Räume werden geladen...' })}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableRooms.map((room) => (
                              <div key={room.roomId} className="inline-flex items-center rounded-lg bg-white border border-emerald-200 hover:border-emerald-400 shadow-sm overflow-hidden">
                                <button
                                  onClick={() => handleSelectAvailableRoom(room)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50/50 text-xs transition-colors text-left"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800">{room.tripName}</span>
                                    {room.tripDates && (
                                      <span className="ml-1.5 text-[10px] text-slate-400">{room.tripDates}</span>
                                    )}
                                  </div>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${room.status === 'closed' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {room.status === 'closed' ? t('finance.status_closed', { defaultValue: 'Geschlossen' }) : t('finance.status_open', { defaultValue: 'Offen' })}
                                  </span>
                                </button>
                                {room.isHost && (
                                  <button
                                    onClick={(e) => handleDeleteRoomFromList(e, room)}
                                    className="px-2 py-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 border-l border-emerald-100 transition-colors"
                                    title={t('finance.delete_room', { defaultValue: 'Raum löschen' })}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isRoomClosed && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 font-medium flex items-center gap-2 shrink-0 print:hidden">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                {t('finance.room_closed_banner', { defaultValue: 'Dieser Kassen-Raum ist geschlossen – neue Ausgaben sind gesperrt, offene Schulden können noch als bezahlt markiert werden.' })}
              </div>
            )}

            {/* Print Header */}
            <div className="hidden print:block pb-2 mb-4 border-b border-slate-200">
                <h1 className="text-3xl font-black text-slate-900">{displayTripName || t('finance.title', { defaultValue: 'Reisekasse' })}</h1>
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
                    <div className="max-w-lg mx-auto py-6 sm:py-8 space-y-5 print:hidden">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                            <Wallet className="w-10 h-10 mx-auto text-emerald-500/40" />
                            <div>
                                <h3 className="text-base font-bold text-slate-800">{t('finance.empty_state', { defaultValue: 'Noch keine Ausgaben erfasst.' })}</h3>
                                {!isGuestMode && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {displayTripName}
                                        {computedTripDates ? ` · ${computedTripDates}` : ''}
                                        <button
                                            type="button"
                                            onClick={openTripMetaEditor}
                                            className="ml-2 text-blue-600 hover:underline font-semibold"
                                        >
                                            {t('actions.edit', { defaultValue: 'Bearbeiten' })}
                                        </button>
                                    </p>
                                )}
                            </div>

                            {!isRoomClosed && (
                                <div className="pt-3 border-t border-slate-100 text-left space-y-2.5">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5" />
                                            {t('finance.participants', { defaultValue: 'Mitreisende' })}
                                        </span>
                                        {allNames.length > 0 && (
                                            <div className="flex items-center gap-2 text-xs flex-wrap">
                                                {renderWeightsToggleButton()}
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span className="text-slate-500 font-semibold">{t('finance.i_am', { defaultValue: 'Ich bin:' })}</span>
                                                    <select
                                                        value={activeIdentity}
                                                        onChange={(e) => handleIdentityChange(e.target.value)}
                                                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                                    >
                                                        <option value="">{t('finance.choose_name', { defaultValue: '— Wählen —' })}</option>
                                                        {allNames.map((n) => (
                                                            <option key={n} value={n}>{n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {allNames.length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {allNames.map((n) => (
                                                    <span key={n} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span>{n}</span>
                                                        {renderDefaultWeightControl(n)}
                                                        {!isGuestMode && !isRoomClosed && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemovePersonInEmptyState(n)}
                                                                className="text-emerald-500 hover:text-red-600 rounded-full p-0.5 transition-colors"
                                                                title={t('actions.delete', { defaultValue: 'Entfernen' })}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                            {!isGuestMode && isEditingDefaultWeights && (
                                                <p className="text-[10px] text-indigo-600 font-medium">
                                                    {t('finance.default_weights_hint', { defaultValue: 'Lege hier Standard-Anteile fest (z. B. 2× für Paare/Familien) und klicke danach auf „Fertig“.' })}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newPersonName}
                                            onChange={(e) => { setNewPersonName(e.target.value); setNewPersonError(null); }}
                                            placeholder={t('finance.add_person_placeholder', { defaultValue: 'Person(en) mit Komma, z.B. Max, Lisa...' })}
                                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddPersonFromModal();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddPersonFromModal}
                                            disabled={!newPersonName.trim() || isAddingPerson}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold disabled:opacity-50 transition-colors shrink-0"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            {t('finance.add_person', { defaultValue: 'Person' })}
                                        </button>
                                    </div>
                                    {newPersonError && (
                                        <p className="text-[11px] font-medium text-red-600">{newPersonError}</p>
                                    )}
                                </div>
                            )}

                            {!isRoomClosed && (
                                <div className="pt-2 flex flex-col items-center gap-2">
                                    {allNames.length === 0 ? (
                                        <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                            {t('finance.need_person_first', { defaultValue: 'Bitte zuerst mindestens eine Person anlegen, bevor du eine Ausgabe erfasst.' })}
                                        </p>
                                    ) : !activeIdentity ? (
                                        <button
                                            type="button"
                                            onClick={() => setIdentityDismissed(false)}
                                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                                        >
                                            {t('finance.select_identity_first', { defaultValue: 'Zuerst auswählen, wer du bist' })}
                                        </button>
                                    ) : (
                                        <ExpenseEntryButton travelers={rawNames} mode="standalone" isMobile={false} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'settlement' ? (
                    <div className="space-y-5 animate-in fade-in max-w-2xl mx-auto print:max-w-none">
                        
                        {/* Gesamtkosten + Ich bin */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-1.5">{t('finance.total_costs', { defaultValue: 'Gesamtkosten' })}</h3>
                                    <div className="flex flex-wrap items-baseline gap-3">
                                        {Object.entries(settlement.totalsByCurrency).map(([cur, total]) => (
                                            <div key={cur} className="text-2xl font-black text-emerald-700 print:text-black">
                                                {total.toFixed(2)} <span className="text-sm">{cur}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {allNames.length > 0 && (
                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 print:hidden shrink-0 self-start sm:self-center">
                                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-500">{t('finance.i_am', { defaultValue: 'Ich bin:' })}</span>
                                        <select
                                            value={myIdentity}
                                            onChange={(e) => handleIdentityChange(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value="">{t('finance.choose_name', { defaultValue: '— Wählen —' })}</option>
                                            {allNames.map((n) => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {Object.keys(settlement.totalsByCurrency).length > 1 && (
                                <div className="mt-3 text-[11px] text-slate-400 font-medium bg-slate-50 p-2 rounded border border-slate-100 leading-tight print:bg-white print:border-none print:p-0">
                                    {t('finance.settlement_base_info', { defaultValue: 'Alle Abrechnungen unten erfolgen in der Hauptwährung:' })} <strong>{baseCurrency}</strong>
                                </div>
                            )}
                        </div>

                        {/* Wer schuldet wem? */}
                        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5"><ArrowRightLeft className="w-3.5 h-3.5" /> {t('finance.who_owes_who', { defaultValue: 'Wer schuldet wem?' })}</h3>
                            {settlement.transfers.length === 0 ? (
                                <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg print:bg-white print:border print:border-slate-200">{t('finance.perfectly_balanced', { defaultValue: 'Die Kasse ist perfekt ausgeglichen! 🎉' })}</div>
                            ) : (
                                <div className="space-y-2.5">
                                    {settlement.transfers.map((tr, idx) => {
                                        const involvesMe = Boolean(myIdentity && (tr.from === myIdentity || tr.to === myIdentity));
                                        return (
                                        <div key={idx} className={`flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 rounded-xl gap-2 print:bg-white print:border-slate-300 ${involvesMe ? 'bg-amber-50 border border-amber-300' : 'bg-amber-50/40 border border-amber-100'}`}>
                                            <div className="flex items-center gap-2 text-sm min-w-0">
                                                <span className="font-bold text-slate-800 print:text-black truncate">
                                                    {tr.from}
                                                    {myIdentity && tr.from === myIdentity && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Du</span>}
                                                </span>
                                                <span className="text-amber-500 font-bold shrink-0 print:text-slate-400">→</span>
                                                <span className="font-bold text-slate-800 print:text-black truncate">
                                                    {tr.to}
                                                    {myIdentity && tr.to === myIdentity && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Du</span>}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                                <div className="font-black text-amber-700 text-right print:text-black">
                                                    {tr.amount.toFixed(2)} <span className="text-xs font-bold text-amber-600/70 print:text-slate-500">{baseCurrency}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleMarkSettled(tr.from, tr.to, tr.amount)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-300 hover:border-blue-600 text-xs font-semibold shadow-sm transition-colors print:hidden shrink-0"
                                                    title={t('finance.mark_settled_tooltip', { defaultValue: 'Schuld als bezahlt markieren' })}
                                                >
                                                    {t('finance.mark_settled', { defaultValue: 'Als bezahlt markieren' })}
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}

                            {settlement.settledPayments.length > 0 && (
                                <div className="mt-4 pt-3.5 border-t border-slate-100">
                                    <h4 className="text-[11px] font-bold text-emerald-700 uppercase mb-2 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {t('finance.already_settled', { defaultValue: 'Bereits beglichen' })}
                                    </h4>
                                    <div className="space-y-1.5">
                                        {settlement.settledPayments.map((sp) => (
                                            <div key={sp.id} className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-emerald-50/60 border border-emerald-200/70 rounded-lg gap-1 text-sm print:bg-white print:border-slate-300">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="font-bold">{sp.paidBy}</span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className="font-bold">{sp.splitAmong?.[0] || ''}</span>
                                                    <span className="text-[11px] text-slate-400 ml-1">
                                                        ({new Date(sp.timestamp).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US')})
                                                    </span>
                                                </div>
                                                <div className="font-bold text-emerald-700 text-right print:text-black">
                                                    {sp.amount.toFixed(2)} <span className="text-xs font-bold text-emerald-600/80">{sp.currency}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Eine einzige kombinierte Pro-Person-Tabelle */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-slate-300">
                            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    {t('finance.per_person_overview', { defaultValue: 'Pro Person' })} ({baseCurrency})
                                </h3>
                                {!isRoomClosed && (
                                    <div className="flex items-center gap-1.5 print:hidden">
                                        {renderWeightsToggleButton()}
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddPerson(prev => !prev); setNewPersonError(null); }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-200 text-xs font-bold transition-colors"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            {t('finance.add_person', { defaultValue: 'Person' })}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {showAddPerson && !isRoomClosed && (
                                <div className="px-4 py-2.5 bg-emerald-50/50 border-b border-emerald-100 space-y-1 print:hidden">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={newPersonName}
                                            onChange={(e) => { setNewPersonName(e.target.value); setNewPersonError(null); }}
                                            placeholder={t('finance.add_person_placeholder', { defaultValue: 'Neuen Namen eingeben...' })}
                                            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddPersonFromModal();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddPersonFromModal}
                                            disabled={!newPersonName.trim() || isAddingPerson}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"
                                        >
                                            {t('actions.save', { defaultValue: 'Speichern' })}
                                        </button>
                                    </div>
                                    {newPersonError && (
                                        <p className="text-[11px] font-medium text-red-600">{newPersonError}</p>
                                    )}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                                            <th className="py-2.5 px-4">{t('finance.person', { defaultValue: 'Name' })}</th>
                                            <th className="py-2.5 px-3 text-right">{t('finance.col_paid', { defaultValue: 'Gezahlt' })}</th>
                                            <th className="py-2.5 px-3 text-right">{t('finance.col_share', { defaultValue: 'Anteil' })}</th>
                                            <th className="py-2.5 px-4 text-right">{t('finance.col_balance', { defaultValue: 'Bilanz' })}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.keys(settlement.balances).map((name) => {
                                            const paid = settlement.paidTotals[name] || 0;
                                            const spent = settlement.spentTotals[name] || 0;
                                            const bal = settlement.balances[name] || 0;
                                            const isMe = Boolean(myIdentity && name === myIdentity);
                                            return (
                                                <tr key={name} className={isMe ? 'bg-blue-50/30' : ''}>
                                                    <td className="py-2.5 px-4 font-bold text-slate-700 print:text-black">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span>{name}</span>
                                                            {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Du</span>}
                                                            {renderDefaultWeightControl(name)}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-slate-600 font-medium tabular-nums print:text-black">
                                                        {paid.toFixed(2)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-slate-600 font-medium tabular-nums print:text-black">
                                                        {spent.toFixed(2)}
                                                    </td>
                                                    <td className={`py-2.5 px-4 text-right font-bold tabular-nums print:text-black ${bal > 0.01 ? 'text-emerald-600' : bal < -0.01 ? 'text-red-500' : 'text-slate-400'}`}>
                                                        {bal > 0.01 ? '+' : ''}{bal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-700">
                                            <td className="py-2.5 px-4 uppercase">{t('finance.total', { defaultValue: 'Gesamt' })}</td>
                                            <td className="py-2.5 px-3 text-right tabular-nums">
                                                {Object.values(settlement.paidTotals).reduce((a, b) => a + b, 0).toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right tabular-nums">
                                                {Object.values(settlement.spentTotals).reduce((a, b) => a + b, 0).toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-slate-400 tabular-nums">0.00</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'feed' ? (
                    <div className="space-y-3 animate-in fade-in max-w-2xl mx-auto print:max-w-none">
                        <div className={`flex flex-col sm:flex-row gap-2 p-2.5 rounded-xl border shadow-sm print:hidden transition-colors ${isFilterActive ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-slate-200'}`}>
                            {renderFilterControls(filteredFeed.length, false)}
                        </div>
                        {filteredFeed.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                                {t('finance.no_filter_matches', { defaultValue: 'Keine passenden Einträge gefunden.' })}
                            </div>
                        ) : filteredFeed.map(exp => (
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
                                            {(() => {
                                                const numTotal = parseFloat(editAmount.replace(',', '.')) || 0;
                                                const perPerson = editSplitAmong.length > 0 && numTotal > 0 ? numTotal / editSplitAmong.length : 0;
                                                return (
                                                    <button onClick={(e) => { e.stopPropagation(); setShowSplit(!showSplit); }} className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-100/50 px-3 py-2 rounded-lg border border-emerald-200/50 hover:bg-emerald-100 transition-colors w-full">
                                                        <Users className="w-3.5 h-3.5 shrink-0" /> 
                                                        <span className="truncate">
                                                            {t('finance.split_among', { defaultValue: 'Aufgeteilt auf:' })} {editSplitMode === 'exact' ? t('finance.exact', { defaultValue: 'Exakt' }) : editSplitMode === 'weights' ? t('finance.weights', { defaultValue: 'Anteile (×)' }) : (editSplitAmong.length === allNames.length ? t('finance.everyone', { defaultValue: 'Alle' }) : `${editSplitAmong.length} ${t('finance.persons', { defaultValue: 'Personen' })}`)}
                                                            {editSplitMode === 'equal' && perPerson > 0 ? ` (${t('finance.each_short', { defaultValue: 'je' })} ${perPerson.toFixed(2)} ${editCurrency})` : ''} ✎
                                                        </span>
                                                    </button>
                                                );
                                            })()}

                                            {showSplit && (
                                                <div className="mt-2 p-3 bg-white rounded-xl border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex bg-emerald-50 border border-emerald-100 rounded-lg mb-3 p-1 gap-1">
                                                        <button onClick={() => setEditSplitMode('equal')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'equal' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.equal', { defaultValue: 'Gleichmäßig' })}</button>
                                                        <button onClick={() => setEditSplitMode('weights')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'weights' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.weights', { defaultValue: 'Anteile (×)' })}</button>
                                                        <button onClick={() => setEditSplitMode('exact')} className={`flex-1 text-[10px] py-1.5 rounded-md font-bold transition-colors ${editSplitMode === 'exact' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}>{t('finance.exact_amount', { defaultValue: 'Exakt' })}</button>
                                                    </div>

                                                    {editSplitMode === 'equal' ? (
                                                        <div className="space-y-2">
                                                            <div className="flex flex-wrap gap-1.5">
                                                            {allNames.map((n: string) => { 
                                                                const active = editSplitAmong.includes(n);
                                                                return <button key={n} onClick={() => setEditSplitAmong(active ? editSplitAmong.filter(x => x !== n) : [...editSplitAmong, n])} className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{n} {active && '✓'}</button>;
                                                            })}
                                                            </div>
                                                            {(() => {
                                                                const numTotal = parseFloat(editAmount.replace(',', '.')) || 0;
                                                                if (editSplitAmong.length <= 0 || numTotal <= 0) return null;
                                                                const perPerson = numTotal / editSplitAmong.length;
                                                                return (
                                                                    <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center justify-between">
                                                                        <span>{t('finance.per_person_count', { defaultValue: 'Pro Person ({{count}}):', count: editSplitAmong.length })}</span>
                                                                        <span className="font-bold tabular-nums">{perPerson.toFixed(2)} {editCurrency}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : editSplitMode === 'weights' ? (
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const numTotal = parseFloat(editAmount.replace(',', '.')) || 0;
                                                                const preview = computeWeightedAmounts(numTotal, editSplitWeights);
                                                                return allNames.map((n: string) => {
                                                                    const w = editSplitWeights[n] ?? 0;
                                                                    const shareAmt = preview[n] || 0;
                                                                    return (
                                                                        <div key={n} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                                                            <div className="min-w-0">
                                                                                <span className="text-xs font-bold text-slate-700">{n}</span>
                                                                                {numTotal > 0 && (
                                                                                    <span className="ml-2 text-[10px] font-medium text-emerald-700">
                                                                                        ({shareAmt.toFixed(2)} {editCurrency})
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditSplitWeights(prev => ({ ...prev, [n]: Math.max(0, Number(((prev[n] ?? 0) - 0.5).toFixed(1))) }))}
                                                                                    className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                                                                                >
                                                                                    -
                                                                                </button>
                                                                                <span className="w-9 text-center text-xs font-bold text-slate-800">{w}×</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditSplitWeights(prev => ({ ...prev, [n]: Number(((prev[n] ?? 0) + 0.5).toFixed(1)) }))}
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
                                                            {allNames.map((n: string) => ( 
                                                                <div key={n} className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                                                    <span className="text-xs font-bold text-slate-700 ml-1">{n}</span>
                                                                    <div className="relative w-24">
                                                                        <input type="number" step="0.01" value={editSplitExact[n] || ''} onChange={e => setEditSplitExact((prev: Record<string, string>) => ({...prev, [n]: e.target.value}))} className="w-full text-right text-sm pr-8 pl-2 py-1.5 border border-emerald-200 rounded-md focus:ring-emerald-500 bg-white" onClick={e => e.stopPropagation()}/>
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
                                        
                                        {/* MANUELLER LOCATION PICKER BUTTON */}
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

                                            <button onClick={handleSaveEdit} disabled={!editAmount || !editTitle.trim() || isNaN(parseFloat(editAmount)) || !editPaidBy || (editSplitMode==='equal' && editSplitAmong.length === 0) || (editSplitMode==='weights' && Object.values(editSplitWeights).reduce((s, w) => s + (w > 0 ? w : 0), 0) <= 0)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"><Save className="w-4 h-4"/> {t('finance.save', { defaultValue: 'Speichern' })}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 transition-colors group print:shadow-none print:border-slate-300 print:rounded-none ${isGuestMode ? '' : 'hover:border-blue-200 cursor-pointer'}`} onClick={isGuestMode ? undefined : () => startEdit(exp)}>
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
                                            {exp.isSettlement && (
                                                <span className="text-[10px] text-emerald-700 mt-1.5 mr-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block font-bold">
                                                    {t('finance.repayment_badge', { defaultValue: 'Rückzahlung' })}
                                                </span>
                                            )}
                                            {exp.splitExact && Object.keys(exp.splitExact).length > 0 ? (() => {
                                                const exactEntries = Object.entries(exp.splitExact).filter(([, v]) => v > 0);
                                                return (
                                                    <div className="text-[10px] text-blue-600 mt-1.5 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded inline-block max-w-full whitespace-normal leading-relaxed print:border print:border-slate-300 print:bg-white">
                                                        {exactEntries.length > 0 && exactEntries.length <= 5
                                                            ? `${t('finance.exact_short', { defaultValue: 'Exakt:' })} ${exactEntries.map(([p, v]) => `${p} ${v.toFixed(2)}`).join(', ')} ${exp.currency}`
                                                            : `${t('finance.split_exact_label', { defaultValue: 'Aufteilung: Exakt' })} (${exactEntries.length})`}
                                                    </div>
                                                );
                                            })() : exp.splitWeights && Object.keys(exp.splitWeights).length > 0 ? (() => {
                                                const activeWeights = Object.entries(exp.splitWeights).filter(([, w]) => w > 0);
                                                const weightedAmounts = computeWeightedAmounts(exp.amount, exp.splitWeights);
                                                return (
                                                    <div className="text-[10px] text-indigo-600 mt-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block max-w-full whitespace-normal leading-relaxed print:border print:border-slate-300 print:bg-white">
                                                        {t('finance.weights_label', { defaultValue: 'Anteile:' })}{' '}
                                                        {activeWeights.length <= 5
                                                            ? `${activeWeights.map(([p, w]) => `${p} ${w}× (${(weightedAmounts[p] || 0).toFixed(2)})`).join(', ')} ${exp.currency}`
                                                            : activeWeights.map(([p, w]) => `${p} ${w}×`).join(', ')}
                                                    </div>
                                                );
                                            })() : exp.splitAmong && exp.splitAmong.length > 0 ? (
                                                <div className="text-[10px] text-slate-500 mt-1.5 leading-relaxed print:text-slate-600">
                                                    {t('finance.for', { defaultValue: 'Für:' })} {exp.splitAmong.join(', ')}
                                                    {!exp.isSettlement && exp.splitAmong.length > 1 && exp.amount > 0 && (
                                                        <span className="ml-1.5 font-semibold text-emerald-700 tabular-nums print:text-black">
                                                            ({t('finance.each_short', { defaultValue: 'je' })} {(exp.amount / exp.splitAmong.length).toFixed(2)} {exp.currency})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                        {!isGuestMode && (
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
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 animate-in fade-in max-w-full">
                        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2 py-1.5 rounded-xl border transition-colors print:hidden ${isFilterActive ? 'bg-amber-50/60 border-amber-300' : 'border-transparent'}`}>
                            {renderFilterControls(filteredTableData.length, true)}
                            <button onClick={() => setShowSubtotals(!showSubtotals)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-sm self-start sm:self-auto ${showSubtotals ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
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
                                    {(() => {
                                        const footerExpenses = isFilterActive
                                            ? filteredTableData
                                            : sortedTableData.filter(exp => !exp.isSettlement);
                                        let totalBase = 0;
                                        const personShares: Record<string, number> = {};
                                        const personPaidFiltered: Record<string, number> = {};
                                        allNames.forEach(n => {
                                            personShares[n] = 0;
                                            personPaidFiltered[n] = 0;
                                        });
                                        footerExpenses.forEach(exp => {
                                            const rate = getRateForCurrency(exp.currency || 'EUR');
                                            totalBase += exp.amount / rate;
                                            if (exp.paidBy && personPaidFiltered[exp.paidBy] !== undefined) {
                                                personPaidFiltered[exp.paidBy] += exp.amount / rate;
                                            }
                                            const shares = calculateExpenseSharesInBase(exp, rate);
                                            Object.entries(shares).forEach(([person, amt]) => {
                                                if (personShares[person] !== undefined) {
                                                    personShares[person] += amt;
                                                }
                                            });
                                        });

                                        return (
                                            <>
                                                {/* ZEILE 1: ANTEILIGE KOSTEN */}
                                                <tr className={isFilterActive ? 'bg-amber-50/90 print:bg-white' : ''}>
                                                    <td colSpan={3} className={`p-3 text-right text-xs print:text-black ${isFilterActive ? 'text-amber-800' : 'text-slate-600'}`}>
                                                        {isFilterActive
                                                            ? t('finance.csv_total_filtered', {
                                                                defaultValue: 'SUMME (FILTER: {{filtered}} von {{total}})',
                                                                filtered: filteredTableData.length,
                                                                total: expenses.length
                                                            })
                                                            : t('finance.csv_total', { defaultValue: 'GESAMTKOSTEN (Anteil)' })}
                                                    </td>
                                                    <td className={`p-3 text-right text-base print:text-black ${isFilterActive ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                        {totalBase.toFixed(2)}
                                                    </td>
                                                    <td className="p-3"></td>
                                                    {allNames.map(n => (
                                                        <td key={`total-${n}`} className="p-3 text-right text-slate-800 border-l border-slate-200/50 print:border-slate-300 print:text-black">
                                                            {(personShares[n] || 0).toFixed(2)}
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* ZEILE 2: BEZAHLT VON */}
                                                <tr className={`${isFilterActive ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-100 border-slate-200'} print:bg-white border-t`}>
                                                    <td colSpan={3} className={`p-3 text-right text-xs print:text-black ${isFilterActive ? 'text-amber-800' : 'text-slate-600'}`}>
                                                        {isFilterActive
                                                            ? t('finance.csv_paid_filtered', { defaultValue: 'BEZAHLT VON (FILTER)' })
                                                            : t('finance.csv_paid', { defaultValue: 'BEZAHLT VON' })}
                                                    </td>
                                                    <td className="p-3"></td>
                                                    <td className="p-3"></td>
                                                    {allNames.map(n => (
                                                        <td key={`paid-${n}`} className="p-3 text-right text-slate-800 border-l border-slate-200/50 print:border-slate-300 print:text-black">
                                                            {(isFilterActive ? (personPaidFiltered[n] || 0) : (settlement.paidTotals[n] || 0)).toFixed(2)}
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* ZEILE 3: BILANZ */}
                                                <tr className="bg-slate-200 print:bg-white border-t border-slate-300">
                                                    <td colSpan={3} className="p-3 text-right text-slate-700 text-xs print:text-black">
                                                        {isFilterActive
                                                            ? t('finance.csv_balance_total_cash', { defaultValue: 'BILANZ (GESAMTE KASSE)' })
                                                            : t('finance.csv_balance', { defaultValue: 'BILANZ (+ Gutschrift / - Schuld)' })}
                                                    </td>
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
                                            </>
                                        );
                                    })()}
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
// --- END OF FILE 2234 Zeilen ---
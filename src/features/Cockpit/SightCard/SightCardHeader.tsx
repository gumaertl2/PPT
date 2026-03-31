// 21.02.2026 14:55 - REFACTOR: Merged custom check-in logic with centralized ExpenseEntryButton.
// 20.02.2026 19:15 - UX: Dimmed title color if the place is marked as a reserve item.
// 20.02.2026 13:10 - LAYOUT: Moved Check-In and Note buttons to the Header.
// src/features/Cockpit/SightCard/SightCardHeader.tsx

import React from 'react';
import { BedDouble, CheckCircle2, MapPin, PenLine } from 'lucide-react';
import { useTripStore } from '../../../store/useTripStore';
import { ExpenseEntryButton } from '../ExpenseEntryButton';

interface SightCardHeaderProps {
  placeId?: string; 
  name: string;
  isHotel: boolean;
  isSelected: boolean;
  highlightText: (text: string) => React.ReactNode;
  renderViewControls: () => React.ReactNode;
  scheduledInfo?: string | null; 
  isVisited?: boolean;
  visitedAt?: string;
  onToggleVisited?: (e: React.MouseEvent) => void;
  showNoteInput?: boolean;
  hasNote?: boolean;
  onToggleNote?: (e: React.MouseEvent) => void;
  isReserve?: boolean; 
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({
  placeId,
  name,
  isHotel,
  isSelected,
  highlightText,
  renderViewControls,
  scheduledInfo,
  isVisited,
  visitedAt,
  onToggleVisited,
  showNoteInput,
  hasNote,
  onToggleNote,
  isReserve
}) => {
  const { project } = useTripStore();
  const travelerNames = project.userInputs.travelers.travelerNames || '';

  const renderVisitedBadge = () => {
    if (!onToggleVisited) return null;

    if (isVisited) {
        let dateStr = '';
        if (visitedAt) {
            const d = new Date(visitedAt);
            dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + 
                      d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        }
        return (
            <button
                onClick={onToggleVisited}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-1 rounded shadow-sm hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all group shrink-0 no-print"
                title="Check-in rückgängig machen"
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                <span className="hidden sm:inline group-hover:hidden">Besucht {dateStr && `(${dateStr})`}</span>
                <span className="inline sm:hidden group-hover:hidden">Besucht</span>
                <span className="hidden group-hover:inline">✖ Undo</span>
            </button>
        );
    }

    return (
        <button
            onClick={onToggleVisited}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-1 rounded hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shrink-0 no-print shadow-sm"
            title="Hier einchecken (für Reisetagebuch)"
        >
            <MapPin className="w-3 h-3" /> <span className="hidden sm:inline">Check-in</span>
        </button>
    );
  };

  const renderNoteButton = () => {
     if (!onToggleNote) return null;
     const isActive = showNoteInput || hasNote;
     
     return (
         <button
            onClick={onToggleNote}
            className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-1 rounded transition-all shrink-0 no-print border shadow-sm ${isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'}`}
            title="Eigene Notiz hinzufügen"
         >
             <PenLine className="w-3 h-3" /> <span className="hidden sm:inline">Notiz</span>
         </button>
     );
  };

  return (
    <div className="flex justify-between items-start mb-1 gap-2 relative">
      <h3 className={`font-bold text-base leading-tight flex items-center flex-wrap gap-2 min-w-0 ${isReserve ? 'text-slate-400' : 'text-gray-900'}`}>
        {isHotel && <BedDouble className={`w-4 h-4 shrink-0 ${isReserve ? 'text-slate-400' : 'text-emerald-600'}`} />}
        <span className="break-words">{highlightText(name)}</span>

        {scheduledInfo && !isVisited && (
           <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0 shadow-sm print:border-none print:shadow-none print:bg-transparent">
             {scheduledInfo}
           </span>
        )}

        {isSelected && isHotel && <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />}
      </h3>
      
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {renderVisitedBadge()}
          <ExpenseEntryButton placeId={placeId} defaultTitle={name} travelers={travelerNames} mode="sight" />
          {renderNoteButton()}
          {renderViewControls()}
      </div>
    </div>
  );
};
// --- END OF FILE 108 Zeilen ---
// 19.02.2026 22:15 - FEAT: Added 'Check-in' / 'Visited' Badge for Live-Tracking.
// 19.02.2026 16:30 - FEAT: Added 'scheduledInfo' indicator for Day Planner integration.
// src/features/Cockpit/SightCard/SightCardHeader.tsx

import React from 'react';
import { BedDouble, CheckCircle2, MapPin } from 'lucide-react';

interface SightCardHeaderProps {
  name: string;
  isHotel: boolean;
  isSelected: boolean;
  highlightText: (text: string) => React.ReactNode;
  renderViewControls: () => React.ReactNode;
  scheduledInfo?: string | null;
  isVisited?: boolean; // NEW
  visitedAt?: string; // NEW
  onToggleVisited?: (e: React.MouseEvent) => void; // NEW
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({
  name,
  isHotel,
  isSelected,
  highlightText,
  renderViewControls,
  scheduledInfo,
  isVisited, // NEW
  visitedAt, // NEW
  onToggleVisited // NEW
}) => {

  const renderVisitedBadge = () => {
    if (!onToggleVisited) return null;

    // Zustand 1: Bereits besucht (Grüner Stempel mit Hover-Undo)
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
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shadow-sm hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all group shrink-0 no-print"
                title="Check-in rückgängig machen"
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                <span className="group-hover:hidden">Besucht {dateStr && `(${dateStr})`}</span>
                <span className="hidden group-hover:inline">✖ Rückgängig</span>
            </button>
        );
    }

    // Zustand 2: Noch nicht besucht (Dezenter Check-in Button)
    return (
        <button
            onClick={onToggleVisited}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all shrink-0 no-print"
            title="Hier einchecken (für Reisetagebuch)"
        >
            <MapPin className="w-3 h-3" /> Check-in
        </button>
    );
  };

  return (
    <div className="flex justify-between items-start mb-1">
      <h3 className="font-bold text-gray-900 text-base leading-tight flex items-center flex-wrap gap-2">
        {isHotel && <BedDouble className="w-4 h-4 text-emerald-600 shrink-0" />}
        <span>{highlightText(name)}</span>

        {/* Tagesplan-Info (nur anzeigen, wenn noch nicht besucht) */}
        {scheduledInfo && !isVisited && (
           <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0 shadow-sm print:border-none print:shadow-none print:bg-transparent">
             {scheduledInfo}
           </span>
        )}

        {/* CHECK-IN BUTTON */}
        {renderVisitedBadge()}

        {isSelected && isHotel && <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />}
      </h3>
      {renderViewControls()}
    </div>
  );
};
// --- END OF FILE 87 Zeilen ---
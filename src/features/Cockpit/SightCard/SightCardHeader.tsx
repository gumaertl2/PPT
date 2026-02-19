// 19.02.2026 16:30 - FEAT: Added 'scheduledInfo' indicator for Day Planner integration.
// 06.02.2026 17:15 - FIX: RESTORED ORIGINAL LAYOUT (User Upload).
// - Reverted to the simple, original 29-line component to fix layout/crash.
// 29.01.2026 19:55 - REFACTOR: Sub-component extraction (Header).
// src/features/Cockpit/SightCard/SightCardHeader.tsx

import React from 'react';
import { BedDouble, CheckCircle2 } from 'lucide-react';

interface SightCardHeaderProps {
  name: string;
  isHotel: boolean;
  isSelected: boolean;
  highlightText: (text: string) => React.ReactNode;
  renderViewControls: () => React.ReactNode;
  scheduledInfo?: string | null; // NEW
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({
  name,
  isHotel,
  isSelected,
  highlightText,
  renderViewControls,
  scheduledInfo // NEW
}) => {
  return (
    <div className="flex justify-between items-start mb-1">
      <h3 className="font-bold text-gray-900 text-base leading-tight flex items-center flex-wrap gap-2">
        {isHotel && <BedDouble className="w-4 h-4 text-emerald-600 shrink-0" />}
        <span>{highlightText(name)}</span>
        
        {/* NEW: Itinerary Badge */}
        {scheduledInfo && (
           <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded shrink-0 shadow-sm">
             {scheduledInfo}
           </span>
        )}
        
        {isSelected && isHotel && <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100 shrink-0" />}
      </h3>
      {renderViewControls()}
    </div>
  );
};
// --- END OF FILE 39 Zeilen ---
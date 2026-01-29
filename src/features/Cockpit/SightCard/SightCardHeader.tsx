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
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({
  name,
  isHotel,
  isSelected,
  highlightText,
  renderViewControls
}) => {
  return (
    <div className="flex justify-between items-start mb-1">
      <h3 className="font-bold text-gray-900 text-base leading-tight flex items-center gap-2">
        {isHotel && <BedDouble className="w-4 h-4 text-emerald-600" />}
        {highlightText(name)}
        {isSelected && isHotel && <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />}
      </h3>
      {renderViewControls()}
    </div>
  );
};
// --- END OF FILE 29 Zeilen ---
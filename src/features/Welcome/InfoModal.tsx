// 24.02.2026 12:15 - FIX: Enhanced Icon-Parser to support nested icons inside bold text (e.g., **[Home]**).
// 24.02.2026 11:25 - FEAT: Added Icon-Parser to render [IconName] tags as Lucide components for the Quick Guide.
// src/features/Welcome/InfoModal.tsx

import React from 'react';
import { 
  X, Database, Home, Edit3, BookOpen, Map as MapIcon, Info, Filter, 
  Menu, Wallet, Sparkles, Zap, Printer, Save, Upload, 
  MapPin, PenLine, Plus, Minus, CalendarClock 
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Edit3, BookOpen, Map: MapIcon, Info, Filter, Menu, Wallet, 
  Sparkles, Zap, Printer, Save, Upload, MapPin, PenLine, 
  Plus, Minus, CalendarClock
};

interface InfoModalProps {
  title: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenCatalog?: () => void; // Optional callback for the catalog button
}

export const InfoModal = ({ title, content, isOpen, onClose, onOpenCatalog }: InfoModalProps) => {
  if (!isOpen) return null;

  const handleCatalogClick = () => {
    onClose();
    if (onOpenCatalog) {
      onOpenCatalog();
    } else {
      // Fallback: Dispatches a global event if the modal is called deeply nested without the prop
      window.dispatchEvent(new CustomEvent('openCatalog'));
    }
  };

  // Interne Hilfsfunktion zur reinen Icon-Erkennung
  const renderIconsOnly = (text: string) => {
    const iconParts = text.split(/(\[.*?\])/g);
    return iconParts.map((subPart, j) => {
      if (subPart.startsWith('[') && subPart.endsWith(']')) {
        const iconName = subPart.slice(1, -1);
        const IconComp = ICON_MAP[iconName];
        if (IconComp) {
          return <IconComp key={j} className="inline-block w-4 h-4 mx-1 mb-1 text-blue-600" />;
        }
      }
      return subPart;
    });
  };

  // Hilfsfunktion zum Rendern von Text mit verschachtelten Icons und Fett-Formatierung
  const parseTextWithIcons = (text: string) => {
    // 1. Erst nach Bold Text splitten (**text**)
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Inhalt innerhalb von ** auch nach Icons durchsuchen
        return <strong key={i}>{renderIconsOnly(part.slice(2, -2))}</strong>;
      }
      // Normalen Text nach Icons durchsuchen
      return <React.Fragment key={i}>{renderIconsOnly(part)}</React.Fragment>;
    });
  };

  // Parser für Markdown-ähnliche Syntax
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      // Parser für den interaktiven Catalog Button
      if (line.includes('[CATALOG_BUTTON]')) {
         const parts = line.split('[CATALOG_BUTTON]');
         return (
           <div key={index} className="my-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col items-start gap-3 shadow-sm">
             {parts[0] && <p className="text-sm text-slate-700">{parseTextWithIcons(parts[0])}</p>}
             <button 
               onClick={handleCatalogClick}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-sm"
             >
               <Database className="w-4 h-4" /> System-Katalog öffnen
             </button>
             {parts[1] && <p className="text-sm text-slate-700 mt-1">{parseTextWithIcons(parts[1])}</p>}
           </div>
         );
      }

      // Überschriften (###)
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-blue-900 mt-6 mb-3 border-b border-slate-100 pb-1">{parseTextWithIcons(line.replace('### ', ''))}</h3>;
      }

      // Listenpunkte (*)
      if (line.trim().startsWith('* ')) {
        return (
          <div key={index} className="ml-4 pl-2 -indent-2 mb-1.5 flex items-start gap-2">
             <span className="font-bold text-blue-500 shrink-0">•</span>
             <span className="leading-relaxed">{parseTextWithIcons(line.replace('* ', ''))}</span>
          </div>
        );
      }

      // Leere Zeilen als Abstand
      if (!line.trim()) {
        return <div key={index} className="h-3"></div>;
      }

      return (
        <p key={index} className="mb-1.5 leading-relaxed">{parseTextWithIcons(line)}</p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-200"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto leading-relaxed text-slate-600 text-left text-sm md:text-base custom-scrollbar">
          {renderMarkdown(content)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium shadow-sm"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- END OF FILE 149 Zeilen ---
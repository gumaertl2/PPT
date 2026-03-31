// 24.02.2026 20:00 - FIX: Replaced fragile CSS print hack with robust iframe/window.open print logic for multi-page rendering.
// 24.02.2026 19:40 - FEAT: Added Print button to InfoModal header.
// 24.02.2026 12:15 - FIX: Enhanced Icon-Parser to support nested icons inside bold text.
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
  onOpenCatalog?: () => void;
}

export const InfoModal = ({ title, content, isOpen, onClose, onOpenCatalog }: InfoModalProps) => {
  if (!isOpen) return null;

  const handleCatalogClick = () => {
    onClose();
    if (onOpenCatalog) {
      onOpenCatalog();
    } else {
      window.dispatchEvent(new CustomEvent('openCatalog'));
    }
  };

  const handlePrint = () => {
    // Holt sich das gerenderte HTML inkl. der SVG Icons aus dem Container
    const printContent = document.getElementById('printable-modal-content')?.innerHTML;
    if (!printContent) return;

    // Öffnet ein neues Fenster für den Druck (umgeht alle Scroll/Modal-Einschränkungen der Haupt-App)
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Bitte Pop-ups zulassen, um das Dokument zu drucken.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              line-height: 1.6; 
              padding: 30px; 
              color: #334155; 
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 24px; margin-bottom: 16px; }
            h3 { font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 32px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            h4 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 24px; margin-bottom: 8px; }
            p { margin-bottom: 12px; }
            strong { font-weight: bold; }
            blockquote { 
              border-left: 4px solid #fcd34d; 
              background-color: #fef3c7; 
              padding: 8px 16px; 
              font-style: italic; 
              margin: 16px 0; 
              border-radius: 0 8px 8px 0; 
            }
            ul { margin-top: 8px; margin-bottom: 16px; padding-left: 20px; }
            li { margin-bottom: 6px; }
            /* Tailwind Grid Replacements for Table */
            .grid { display: flex; width: 100%; border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
            .grid > div { flex: 1; padding-right: 8px; font-size: 14px; }
            .grid > div:last-child { font-weight: bold; color: #1d4ed8; }
            .h-px { height: 1px; background-color: #cbd5e1; width: 100%; margin: 24px 0; }
            .h-3 { height: 12px; }
            /* Hide interactive UI elements */
            button { display: none !important; }
            /* SVG Icons */
            svg { display: inline-block; width: 16px; height: 16px; vertical-align: middle; margin-right: 6px; margin-bottom: 2px; }
            /* Print settings */
            @page { margin: 15mm; }
            h1, h2, h3, h4 { page-break-after: avoid; }
            p, div, li { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Kurze Verzögerung, damit der Browser die SVGs rendern kann
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

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

  const parseTextWithIcons = (text: string) => {
    const boldParts = text.split(/(\*\*.*?\*\*)/g);
    
    return boldParts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{renderIconsOnly(part.slice(2, -2))}</strong>;
      }
      return <React.Fragment key={i}>{renderIconsOnly(part)}</React.Fragment>;
    });
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
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

      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-extrabold text-slate-900 mt-6 mb-4">{parseTextWithIcons(line.replace('# ', ''))}</h1>;
      }

      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-bold text-blue-900 mt-8 mb-4 border-b border-slate-100 pb-2">{parseTextWithIcons(line.replace('### ', ''))}</h3>;
      }

      if (line.startsWith('#### ')) {
        return <h4 key={index} className="text-lg font-bold text-slate-800 mt-6 mb-2">{parseTextWithIcons(line.replace('#### ', ''))}</h4>;
      }

      if (line.startsWith('> ')) {
        return <blockquote key={index} className="pl-4 border-l-4 border-amber-300 italic text-slate-600 my-4 bg-amber-50/50 py-2 rounded-r-lg">{parseTextWithIcons(line.replace('> ', ''))}</blockquote>;
      }

      if (line.startsWith('|') && !line.includes('---')) {
        const cells = line.split('|').filter(c => c.trim() !== '');
        return (
          <div key={index} className="grid grid-cols-4 gap-2 text-sm border-b border-slate-100 py-2">
            {cells.map((cell, i) => (
               <div key={i} className={i === 3 ? "font-bold text-blue-700" : "text-slate-600"}>{parseTextWithIcons(cell.trim())}</div>
            ))}
          </div>
        );
      }
      
      if (line.startsWith('|') && line.includes('---')) {
        return null;
      }

      if (line.trim().startsWith('* ')) {
        return (
          <div key={index} className="ml-4 pl-2 -indent-2 mb-2 flex items-start gap-2">
             <span className="font-bold text-blue-500 shrink-0 mt-0.5">•</span>
             <span className="leading-relaxed">{parseTextWithIcons(line.replace('* ', ''))}</span>
          </div>
        );
      }

      if (line.trim() === '---') {
        return <div key={index} className="h-px bg-slate-200 w-full my-8"></div>;
      }

      if (!line.trim()) {
        return <div key={index} className="h-3"></div>;
      }

      return (
        <p key={index} className="mb-2 leading-relaxed">{parseTextWithIcons(line)}</p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm border border-slate-200 text-sm font-medium text-slate-600"
              title="Dieses Dokument drucken / als PDF speichern"
            >
              <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Drucken</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-200"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content - Mit ID für den HTML-Export versehen */}
        <div id="printable-modal-content" className="p-8 overflow-y-auto leading-relaxed text-slate-600 text-left text-sm md:text-base custom-scrollbar">
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

// --- END OF FILE 216 Zeilen ---
// 20.02.2026 23:35 - UX: Added parser for [CATALOG_BUTTON] to render a clickable action button inside markdown.
// src/features/Welcome/InfoModal.tsx

import { X, Database } from 'lucide-react'; // FIX: Added Database icon

interface InfoModalProps {
  title: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenCatalog?: () => void; // NEW: Optional callback for the catalog button
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

  // Einfacher Parser für Markdown-ähnliche Syntax
  // Unterstützt: **Fett**, *Kursiv*, Überschriften (#) und Listen (*)
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      let formattedLine = line;

      // NEW: Parser for the interactive Catalog Button
      if (line.includes('[CATALOG_BUTTON]')) {
         const parts = line.split('[CATALOG_BUTTON]');
         return (
           <div key={index} className="my-5 p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col items-start gap-3 shadow-sm">
             {parts[0] && <p className="text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: parts[0].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
             <button 
               onClick={handleCatalogClick}
               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md text-sm"
             >
               <Database className="w-4 h-4" /> System-Katalog öffnen
             </button>
             {parts[1] && <p className="text-sm text-slate-700 mt-1" dangerouslySetInnerHTML={{ __html: parts[1].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
           </div>
         );
      }

      // Überschriften (###)
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-blue-900 mt-6 mb-3 border-b border-slate-100 pb-1">{line.replace('### ', '')}</h3>;
      }

      // Listenpunkte (*)
      if (line.trim().startsWith('* ')) {
        formattedLine = line.replace('* ', '• ');
        return (
          <div key={index} className="ml-4 pl-2 -indent-2 mb-1.5">
             <span className="font-bold text-blue-500 mr-2">•</span>
             <span dangerouslySetInnerHTML={{ 
               __html: line.replace('* ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
             }} />
          </div>
        );
      }

      const htmlContent = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Leere Zeilen als Abstand
      if (!line.trim()) {
        return <div key={index} className="h-3"></div>;
      }

      return (
        <p key={index} className="mb-1.5" dangerouslySetInnerHTML={{ __html: htmlContent }} />
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
// --- END OF FILE 98 Zeilen ---
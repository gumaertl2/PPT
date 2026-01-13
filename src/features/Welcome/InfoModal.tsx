/**
 * src/features/Welcome/InfoModal.tsx
 *
 * DAS INFO-POPUP
 * Zeigt Texte (Hilfe, Terms, etc.) in einem Overlay an.
 * Update: Linksbündiger Text & einfacher Markdown-Support.
 */

import { X } from 'lucide-react';

interface InfoModalProps {
  title: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal = ({ title, content, isOpen, onClose }: InfoModalProps) => {
  if (!isOpen) return null;

  // Einfacher Parser für Markdown-ähnliche Syntax
  // Unterstützt: **Fett**, *Kursiv*, Überschriften (#) und Listen (*)
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      let formattedLine = line;

      // Überschriften (###)
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-bold text-blue-900 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && !line.includes('**', 2)) { 
        // Zeile beginnt mit ** -> Als Überschrift behandeln (optional, falls keine ### genutzt wurden)
        // Hier lassen wir es als normalen fetten Text, falls es im Fließtext ist.
      }

      // Listenpunkte (*)
      if (line.trim().startsWith('* ')) {
        formattedLine = line.replace('* ', '• ');
        return (
          <div key={index} className="ml-4 pl-2 -indent-2 mb-1">
             <span className="font-bold text-blue-500 mr-2">•</span>
             <span dangerouslySetInnerHTML={{ 
               __html: line.replace('* ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
             }} />
          </div>
        );
      }

      // Fettgedrucktes im Fließtext (**...**)
      // Wir nutzen dangerouslySetInnerHTML für einfache Tags, da wir keine externe Lib nutzen wollen.
      // Sicherheitshinweis: Da der Content aus unseren eigenen Dateien kommt, ist XSS-Risiko gering.
      const htmlContent = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Leere Zeilen als Abstand
      if (!line.trim()) {
        return <div key={index} className="h-2"></div>;
      }

      return (
        <p key={index} className="mb-1" dangerouslySetInnerHTML={{ __html: htmlContent }} />
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-100"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 overflow-y-auto leading-relaxed text-slate-600 text-left text-sm md:text-base">
          {renderMarkdown(content)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-right flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
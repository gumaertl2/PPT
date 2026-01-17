// src/features/info/InfoView.tsx
// 17.01.2026 19:40 - FEAT: Initial creation. Renders 'InfoAutor' results.
// Moved to features folder to match project structure (like SightCard).

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTripStore } from '../../store/useTripStore';

export const InfoView: React.FC = () => {
  const project = useTripStore(state => state.project);
  
  // Wir holen die Daten aus dem Content-Bereich, wo der InfoAutor sie ablegt
  const infoKapitel = (project.data.content as any)?.info_kapitel || [];

  if (!infoKapitel || infoKapitel.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-4xl mb-4">ℹ️</div>
        <h2 className="text-xl font-bold mb-2">Keine Reiseinformationen verfügbar</h2>
        <p>Der Info-Autor hat noch keine Inhalte für diese Reise erstellt.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">🛈</span> 
          Reise-Informationen & Logistik
        </h1>
        <p className="text-blue-100 mt-2 opacity-90">
          Wichtige Hinweise zu Maut, Sicherheit, Einreise und lokalen Besonderheiten.
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid gap-6">
        {infoKapitel.map((kapitel: any, index: number) => (
          <div key={kapitel.id || index} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            {/* Card Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">
                {kapitel.typ || 'Information'}
              </h3>
              {kapitel.id && (
                <span className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded border">
                  {kapitel.id}
                </span>
              )}
            </div>

            {/* Card Content (Markdown) */}
            <div className="p-6 prose prose-blue max-w-none text-gray-700 leading-relaxed">
              <ReactMarkdown>
                {kapitel.inhalt || 'Kein Inhalt verfügbar.'}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
// --- END OF FILE 65 Zeilen ---
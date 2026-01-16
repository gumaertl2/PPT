// src/core/prompts/templates/durationEstimator.ts
// 16.01.2026 21:00 - FEAT: Initial creation. Logic based on V30 workflow requirements.

import type { TripProject } from '../../types';

export const buildDurationEstimatorPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics, pace, selectedInterests } = userInputs;

  // 1. Kontext-Analyse: Was planen wir?
  const isRoundTrip = logistics.mode === 'roundtrip' || logistics.mode === 'mobil';
  let stationsList = '';

  if (isRoundTrip && logistics.roundtrip?.stops) {
    stationsList = logistics.roundtrip.stops.map(s => `- ${s.location}`).join('\n');
  } else if (logistics.mode === 'stationaer') {
    stationsList = `- ${logistics.stationary.destination} (Region: ${logistics.stationary.region})`;
  } else {
    // Fallback: Versuche generische Daten
    stationsList = `- ${project.meta.name || 'Unbekanntes Reiseziel'}`;
  }

  // 2. Sprache
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  // 3. Prompt Construction
  return `
DU BIST EIN ERFAHRENER REISE-LOGISTIKER UND ZEIT-STRATEGE.
Deine Aufgabe ist es, für eine gegebene Reiseroute die optimale Aufenthaltsdauer pro Station zu berechnen.

### REISE-PARAMTER
- Reisetempo: ${pace || 'Ausgewogen'} (Beeinflusst die Aufenthaltsdauer maßgeblich!)
- Interessen: ${selectedInterests.join(', ') || 'Allgemein'}
- Reisende: ${userInputs.travelers.adults} Erwachsene, ${userInputs.travelers.children} Kinder

### GEPLANTE STATIONEN
${stationsList}

### AUFGABE
Analysiere jede Station basierend auf ihrer touristischen Relevanz, den Interessen der Reisenden und dem Reisetempo.
Schätze die *empfohlene Anzahl an Übernachtungen* (Nights), um die wichtigsten Highlights stressfrei zu sehen.

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Markdown, kein Text davor/danach.

{
  "stationen_planung": [
    {
      "station": "Name der Station aus der Liste",
      "empfohlene_naechte": 3,
      "begruendung": "Kurze Erklärung warum (z.B. 'Viel Kultur, benötigt Zeit' oder 'Nur Zwischenstopp'). Maximal 1 Satz."
    }
  ],
  "gesamt_fazit": "Kurzes Fazit zur Gesamtdauer und Machbarkeit."
}

### REGELN
1. 'empfohlene_naechte' muss eine Ganzzahl (Integer) sein.
2. Minimum ist 1 Nacht (außer bei reinen Durchreise-Orten, die explizit 0 sein sollen).
3. Berücksichtige das Reisetempo: '${pace}'. Bei 'Entspannt' addiere Puffer, bei 'Sportlich' straffe den Plan.
4. Antworte in der Sprache: ${lang}.
`;
};
// --- END OF FILE 59 Zeilen ---
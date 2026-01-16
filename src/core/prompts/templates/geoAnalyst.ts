// src/core/prompts/templates/geoAnalyst.ts
// 16.01.2026 22:00 - FEAT: Initial creation. Strategic location analysis for accommodation planning.
// 17.01.2026 12:00 - FIX: Used 'lang' variable to satisfy linter and control output language.

import type { TripProject } from '../../types';

export const buildGeoAnalystPrompt = (project: TripProject): string => {
  const { userInputs } = project;
  const { logistics, vibe, selectedInterests } = userInputs;

  // 1. Logistik-Kontext
  let travelContext = "";
  if (logistics.mode === 'roundtrip') {
      const stops = logistics.roundtrip.stops.map(s => s.location).join(' -> ');
      travelContext = `Rundreise mit folgenden Wegpunkten: ${stops}.
      Constraint: Max. ${logistics.roundtrip.constraints.maxHotelChanges || 'unbegrenzt'} Hotelwechsel erwünscht.`;
  } else {
      travelContext = `Stationärer Aufenthalt in: ${logistics.stationary.destination} (Region: ${logistics.stationary.region}).`;
  }

  // 2. Sprache
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  return `
DU BIST EIN GEOGRAFISCHER STRATEGE FÜR REISEPLANUNG.
Deine Aufgabe ist es, die optimalen *Standorte* (Basis-Lager) für Übernachtungen zu bestimmen, bevor nach konkreten Hotels gesucht wird.

### REISE-PROFIL
- Modus: ${logistics.mode}
- Route/Ziel: ${travelContext}
- Reisestil (Vibe): ${vibe}
- Interessen: ${selectedInterests.join(', ')}
- Gruppe: ${userInputs.travelers.adults} Erw., ${userInputs.travelers.children} Kinder

### AUFGABE
Analysiere die geografische Lage.
Definiere die strategisch besten Orte für Übernachtungen, um:
1. Fahrzeiten zu minimieren.
2. Hotelwechsel gering zu halten (Hub-and-Spoke Strategie).
3. Den gewünschten Vibe zu treffen (z.B. "Zentrumsnah" vs. "Ländliche Ruhe").

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.

{
  "strategische_standorte": [
    {
      "ort_name": "Name der Stadt/Region",
      "such_radius_km": 10,
      "fokus": "Zentrum" | "Umland" | "Strandnähe",
      "begruendung": "Warum dieser Ort? (z.B. 'Zentraler Hub für Ausflüge nach A und B')",
      "aufenthaltsdauer_empfehlung": "ca. 3 Nächte"
    }
  ],
  "analyse_fazit": "Kurze Zusammenfassung der Strategie (max 2 Sätze)."
}

### WICHTIG
- Bei Rundreisen: Fasse nahegelegene Ziele zusammen, wenn es Sinn macht.
- Bei Stationär: Empfiehl konkrete Stadtteile oder Regionen (z.B. "Marais" in Paris statt nur "Paris").
- Berücksichtige, dass wir mit Kindern reisen (vermeide unsichere oder zu laute Gegenden, wenn nicht gewünscht).

Antworte auf ${lang}.
`;
};
// --- END OF FILE 53 Zeilen ---
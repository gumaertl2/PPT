// src/core/prompts/templates/hotelScout.ts
// 16.01.2026 22:15 - FEAT: Initial creation. Accommodation search logic.
// 16.01.2026 22:30 - FEAT: Added 'Itinerary Awareness'.
// 16.01.2026 23:45 - FEAT: Added 'GeoAnalyst Integration' for strategic search locations (V30 Parity).

import type { TripProject } from '../../types';

export const buildHotelScoutPrompt = (project: TripProject): string => {
  const { userInputs, itinerary, analysis } = project;
  const { logistics, budget, vibe, travelers } = userInputs;

  // 1. Kontext-Analyse: Prioritäten-Kette
  const hasItinerary = itinerary?.days && itinerary.days.length > 0;
  const hasGeoStrategy = !!analysis?.geoAnalyst;

  let searchContext = "";
  let optimizationInstruction = "";

  if (hasItinerary) {
      // PRIO 1: Tagesplan existiert -> Wir optimieren Laufwege
      const scheduleSummary = itinerary.days.map((d: any) => {
          const activities = d.aktivitaeten?.map((a: any) => a.titel).join(', ') || 'Freizeit';
          return `- Tag ${d.tag_nr} (${d.ort}): ${activities}`;
      }).join('\n');

      searchContext = `
EXISTIERENDER TAGESPLAN (Optimierungsgrundlage):
${scheduleSummary}

HINWEIS: Der User hat bereits Aktivitäten geplant. Suche Unterkünfte, die verkehrsgünstig zu diesen Aktivitäten liegen (Zeit- & Wegeoptimierung).
`;
      optimizationInstruction = "WICHTIG: Plane PRO STADT nur EIN Hotel (Basis-Lager), auch wenn der Aufenthalt mehrere Tage dauert.";
      
  } else if (hasGeoStrategy && analysis?.geoAnalyst) {
      // PRIO 2: Geo-Strategie existiert (aber kein Tagesplan) -> Wir nutzen die Hubs
      const strategySummary = analysis.geoAnalyst.strategische_standorte.map(s => {
          return `- ${s.ort_name} (Radius: ${s.such_radius_km}km): Fokus auf ${s.fokus}. Grund: ${s.begruendung}`;
      }).join('\n');

      searchContext = `
STRATEGISCHE STANDORT-ANALYSE (Vorgabe):
Der Geo-Analyst hat folgende ideale Übernachtungsorte ermittelt:
${strategySummary}

HINWEIS: Halte dich strikt an diese Standort-Empfehlungen.
`;
      optimizationInstruction = "Suche Unterkünfte exakt in den definierten Zonen/Vierteln, um den Vibe zu treffen.";

  } else {
      // PRIO 3: Fallback (Nur Logistik) -> Wir suchen grob
      if (logistics.mode === 'roundtrip') {
        const stops = logistics.roundtrip.stops.map(s => s.location).join(', ');
        searchContext = `Rundreise entlang dieser Stationen: ${stops}. Suche passende Unterkünfte an den Etappenzielen.`;
      } else {
        searchContext = `Stationärer Aufenthalt in: ${logistics.stationary.destination} (Region: ${logistics.stationary.region}).`;
      }
      optimizationInstruction = "Orientiere dich an strategisch günstigen Lagen (Zentrum oder verkehrsgünstig).";
  }

  // 2. Spezifische Wünsche
  const specialRequests = userInputs.notes ? `User Notizen: "${userInputs.notes}"` : "Keine speziellen Sonderwünsche.";

  // 3. Sprache
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  return `
DU BIST EIN HOTEL-SCOUT UND UNTERKUNFTS-EXPERTE.
Deine Aufgabe ist es, die perfekten Unterkünfte für diese Reise zu finden.

### REISE-PROFIL
- Budget: ${budget} (Halte dich strikt daran!)
- Vibe: ${vibe}
- Reisende: ${travelers.adults} Erw., ${travelers.children} Kinder
- Extras: ${specialRequests}

${searchContext}

### AUFGABE
Suche konkrete Unterkünfte (Hotels, B&Bs, Resorts oder Apartments), die zum Profil passen.
${optimizationInstruction}

### KRITERIEN
1. **Budget-Treue:** Schlage nichts vor, was das Budget sprengt.
2. **Lage-Effizienz:** Nutze die Vorgaben (Tagesplan oder Geo-Analyse) für die Standortwahl.
3. **Stabilität:** Ein Basecamp pro Stadt/Region. Kein unnötiges Kofferpacken.

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.

{
  "unterkuenfte": [
    {
      "name": "Name des Hotels",
      "ort": "Stadt/Region",
      "art": "Hotel" | "Apartment" | "Resort" | "B&B",
      "preis_niveau": "€€",
      "match_grund": "Warum passt das? (z.B. 'Liegt im vom Geo-Analysten empfohlenen Marais-Viertel')",
      "lage_vorteil": "Kurze Beschreibung der Lage",
      "booking_keyword": "Suchbegriff für Booking.com"
    }
  ],
  "budget_einschaetzung": "Kurzer Kommentar, ob das Budget realistisch ist."
}

Antworte auf ${lang}.
`;
};
// --- END OF FILE 105 Zeilen ---
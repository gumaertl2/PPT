// src/core/prompts/templates/foodEnricher.ts
// 16.01.2026 19:00 - FEAT: Initial creation. Describes pre-selected restaurants (V30 Parity).

import type { TripProject } from '../../types';

export const buildFoodEnricherPrompt = (
    project: TripProject, 
    candidates: any[] // Die mathematisch gefilterte Liste aus dem PayloadBuilder
): string => {
  
  const { userInputs } = project;
  const { budget, vibe } = userInputs;
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  // 1. Kandidaten aufbereiten
  // Wir wandeln das Array in einen lesbaren String um
  const candidatesList = candidates.map((c, index) => {
      const dist = c.distance ? `(Entfernung: ${c.distance}km)` : '';
      const guides = c.guides ? `[Gelistet in: ${c.guides.join(', ')}]` : '';
      const price = c.priceLevel || 'Preis unbekannt';
      
      return `
KANDIDAT ${index + 1}:
- Name: ${c.name}
- Adresse: ${c.address || c.vicinity || 'k.A.'} ${dist}
- Typ: ${c.cuisine || 'International'}
- Preis: ${price}
- Status: ${guides}
- Info: ${c.description || 'Keine Details'}
`;
  }).join('\n');

  return `
DU BIST EIN RESTAURANT-KRITIKER UND GOURMET-GUIDE.
Du erhältst eine Liste von Restaurants, die bereits algorithmisch basierend auf Standort und Qualität ausgewählt wurden.

### DEINE AUFGABE
Verfasse für jeden Kandidaten eine kurze, appetitanregende Beschreibung ("Appetizer-Text").
Der User hat bereits Hunger, also komm zum Punkt!

### USER PRÄFERENZEN
- Budget-Rahmen: ${budget}
- Gewünschter Vibe: ${vibe}
- Sprache: ${lang}

### DIE AUSGEWÄHLTEN KANDIDATEN
${candidatesList}

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt.

{
  "restaurant_empfehlungen": [
    {
      "name": "Name aus der Liste",
      "headline": "Kurze, knackige Schlagzeile (z.B. 'Beste Pizza im Viertel')",
      "beschreibung": "2-3 Sätze über Ambiente, Küche und warum es sich lohnt. Erwähne explizit, wenn es in einem Guide (z.B. Michelin) steht.",
      "preis_tendenz": "€€",
      "gerichte_tipp": "Was sollte man hier probieren? (Erfinde nichts, leite es aus dem Küchentyp ab)",
      "geignet_fuer": "Lunch" | "Dinner" | "Snack"
    }
  ]
}

### REGELN
1. Halte dich strikt an die Fakten der Kandidaten-Liste (Erfinde keine Sterne, wo keine sind).
2. Der Stil soll zum Vibe '${vibe}' passen (z.B. locker für 'Hipster', elegant für 'Luxus').
3. Ignoriere Kandidaten, die absolut nicht zum Budget passen, es sei denn, sie sind ein "Must-Visit".
`;
};
// --- END OF FILE 62 Zeilen ---
// src/core/prompts/templates/transferPlanner.ts
// 16.01.2026 21:15 - FEAT: Initial creation. Logistics & Transfer Logic.
// 17.01.2026 09:00 - FIX: Added 'previousLocation' context for seamless chunk transitions (V30 Parity).

import type { TripProject } from '../../types';

export const buildTransferPlannerPrompt = (
    project: TripProject, 
    chunkData?: any, // Optional: Array von Tagen (V30 Logic)
    previousLocation?: string // NEU: Kontext aus vorherigem Chunk
): string => {
  
  const { userInputs } = project;
  const { logistics } = userInputs;
  
  // 1. Transportmittel bestimmen
  let transportMode = "Auto/Mietwagen";
  if (logistics.mode === 'roundtrip') {
      if (userInputs.dates?.arrival?.type === 'train') transportMode = "Zug / Öffentliche Verkehrsmittel";
      if (userInputs.dates?.arrival?.type === 'camper') transportMode = "Wohnmobil / Camper";
  } else if (logistics.mode === 'stationaer') {
      transportMode = "Mix aus ÖPNV, zu Fuß und Taxi/Mietwagen";
  }

  // 2. Datenaufbereitung (Was soll berechnet werden?)
  let daysToAnalyze = [];
  
  if (chunkData && Array.isArray(chunkData)) {
      daysToAnalyze = chunkData;
  } else if (project.itinerary?.days) {
      daysToAnalyze = project.itinerary.days;
  }

  const daysJson = JSON.stringify(daysToAnalyze, null, 2);

  // 3. Start-Kontext (Chunking Übergang)
  const startContext = previousLocation 
    ? `\n### START-SITUATION (ÜBERGANG)\nDer User befindet sich zu Beginn dieses Abschnitts (vor der ersten Aktivität) in: "${previousLocation}".\nBitte berechne den Transfer von dort zum ersten Programmpunkt.`
    : "";

  // 4. Sprache
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  return `
DU BIST EIN LOGISTIK-EXPERTE FÜR REISEN.
Deine Aufgabe ist es, die Transferzeiten und Routen für den folgenden Reiseplan zu berechnen.

### PARAMETER
- Verkehrsmittel: ${transportMode}
- Sprache: ${lang}

### INPUT DATEN (REISEPLAN)
${daysJson}
${startContext}

### AUFGABE
1. Analysiere die geografische Abfolge der Aktivitäten und Orte pro Tag.
2. Identifiziere notwendige Transfers (z.B. Hotel -> Sight A, Sight A -> Sight B).
3. Berechne realistische Reisezeiten und Distanzen für das gewählte Verkehrsmittel.
4. Füge 'transfer'-Informationen in die Aktivitäten oder als eigene Slots ein, wo nötig.
5. Wenn ein Tag einen Ortswechsel (Station A -> Station B) beinhaltet, erstelle detaillierte Angaben zur Hauptstrecke.

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit dem aktualisierten JSON der Tage.
Behalte die Struktur bei, ergänze aber Felder in den Aktivitäten oder auf Tagesebene:

{
  "tage": [
    {
       // ... bestehende Felder (tag_nr, datum, etc.) behalten ...
       "aktivitaeten": [
          {
             // ... bestehende Aktivitäts-Daten behalten ...
             "transfer_hinweis": "Ca. 20 min Fahrt (15km)",
             "transport_mittel": "Mietwagen"
          }
       ],
       "logistik_notiz": "Tagesstrecke gesamt: ca. 120km (2h reine Fahrtzeit)"
    }
  ]
}

### WICHTIG
- Sei realistisch (Stau, Parkplatzsuche, Fußwege).
- Bei "Öffis": Gib Linien oder Verbindungsarten an (z.B. "S-Bahn S8").
- Verändere NICHT die Inhalte (Titel/Beschreibung) der Aktivitäten, nur die logistischen Metadaten.
`;
};
// --- END OF FILE 91 Zeilen ---
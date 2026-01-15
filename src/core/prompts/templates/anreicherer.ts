// src/core/prompts/templates/anreicherer.ts
// 14.01.2026 13:00 - FIX: Added type cast for LanguageCode to satisfy PromptBuilder.
// 15.01.2026 14:50 - UPDATE: Hardening (V30 Parity) - Whitelist Categories & Extra Fields.

import type { TripProject, LanguageCode } from '../../types';
import { PromptBuilder } from '../PromptBuilder';
// NEW: Import Data for Whitelist
import { INTEREST_DATA } from '../../../data/interests';

/**
 * Das Ziel-Schema für einen Ort in V40.
 * UPDATE: Enthält nun zwingend die 'id', Website & Google-Daten.
 */
const SIGHT_SCHEMA = {
  "id": "String (MUSS exakt die ID aus der Eingabe-Liste sein!)",
  "name": "String (Offizieller Name)",
  "stadt": "String (Nur Ortsname, ohne PLZ)",
  "land": "String (Landesname)",
  "kategorie": "String (MUSS exakt einer der erlaubten Werte aus der Whitelist sein)",
  "kurzbeschreibung": "String (1-2 Sätze, inspirierend)",
  "geo_koordinaten": {
    "lat": "Number (Breitengrad)",
    "lng": "Number (Längengrad)"
  },
  "adresse": "String (Navigierbare Adresse, ohne Ortsname am Anfang)",
  "oeffnungszeiten": "String (Zusammenfassung für den Reisezeitraum)",
  "website": "String (Offizielle Webseite oder leer)",
  "google_rating": "Number (z.B. 4.7)",
  "google_ratings_count": "Number (Anzahl der Bewertungen)",
  "dauer_min": "Number (Empfohlene Besuchsdauer in Minuten)",
  "preis_tendenz": "String (Kostenlos, Günstig, Mittel, Teuer)",
  "logistics_info": "String (Parken, ÖPNV Anbindung)"
};

export const buildAnreichererPrompt = (project: TripProject): string => {
    const { userInputs, meta } = project;
    
    // UI Sprache für den Output bestimmen
    const outputLang = userInputs.aiOutputLanguage || meta.language;

    // 1. KATEGORIEN WHITELIST GENERIEREN
    // Wir nehmen nur Kategorien, die keine reinen System-Steuerungen sind
    const validCategories = Object.values(INTEREST_DATA)
        .filter(cat => !cat.isSystem) // Filtert 'Puffer', 'Reisetempo' etc.
        .map(cat => cat.id)
        .join(', ');

    // 2. DATEN-QUELLEN
    // Wir holen uns alle Orte aus dem State (die vom Sammler angelegt wurden).
    // WICHTIG: Wir übergeben ID und NAME, damit die KI die ID zurückgeben kann.
    
    const rawCandidates = Object.values(project.data.places || {}).map((p: any) => ({
        id: p.id,
        name: p.name || "Unbekannter Ort"
    }));

    // Fallback, falls leer (damit Prompt nicht crasht)
    const candidatesList = rawCandidates.length > 0 
        ? rawCandidates 
        : [{ id: "dummy-example-id", name: "Beispiel Sehenswürdigkeit" }];

    const dates = `${userInputs.dates.start} bis ${userInputs.dates.end}`;
    const fixedEvents = userInputs.dates.fixedEvents || [];

    // 3. PROMPT CONSTRUCTION
    const prompt = `
# ROLE & MISSION
You are a high-precision Data Enricher. Your **sole mission** is to enrich a given list of **CANDIDATES** (IDs & Names) with hard, verifiable facts.

# MANDATORY RULES & WORKFLOW
- **Rule 1 (Pass-Through ID):** The input list contains objects with \`id\` and \`name\`. You MUST return the EXACT \`id\` for each object in your output. This is used for matching.
- **Rule 2 (Completeness):** Your final output MUST contain **exactly as many objects** as the input list. No item may be missing.
- **Rule 3 (Live Research):** Research **live** for every name to find the most current data.
- **Rule 4 (Structure Discipline):** Fill the fields \`stadt\` (city) and \`land\` (country) separately and cleanly.
- **Rule 5 (Availability):** Check opening hours explicitly for the travel period: **${dates}**.
- **Rule 6 (Coordinates - PRIO A):** You MUST find exact Geo-Coordinates (lat/lng). This is critical for the map.
- **Rule 7 (Address Hygiene):** The \`adresse\` field must be navigable (e.g., "Rue de Rivoli, 75001 Paris").
- **Rule 8 (Google Data):** You MUST research the current Google Maps Rating (\`google_rating\`) and the Count (\`google_ratings_count\`).

# CATEGORY PROTOCOL (STRICT)
You are NOT allowed to invent categories. You MUST assign exactly ONE category from this whitelist to each place.
Choose the most fitting one.

**WHITELIST:**
[${validCategories}]

If a place does not fit perfectly, choose the closest match (e.g. 'Natur' for a Cave, 'Kultur' for a Monument).

# DATA BASIS

### Travel Period
"${dates}"

### Fixed Appointments (for Identification)
\`\`\`json
${JSON.stringify(fixedEvents, null, 2)}
\`\`\`

### List of Candidates to Enrich (ID & Name)
\`\`\`json
${JSON.stringify(candidatesList, null, 2)}
\`\`\`

# MANDATORY TARGET FORMAT
Your response MUST be a valid JSON Array. Every object must follow this schema exactly.
Generate the content (descriptions) in **${outputLang === 'de' ? 'German' : 'English'}**.

\`\`\`json
${JSON.stringify(SIGHT_SCHEMA, null, 2)}
\`\`\`

Response in valid JSON only. Start directly with \`\`\`json.
`;

    // FIX: Cast outputLang to LanguageCode
    return PromptBuilder.build(prompt, "", outputLang as LanguageCode);
};
// --- END OF FILE 124 Zeilen ---
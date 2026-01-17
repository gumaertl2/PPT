// src/core/prompts/templates/tourGuide.ts
// 17.01.2026 18:15 - FEAT: Ported 'Reisefuehrer' (Walking Tours) from V30.
// Source: prompt-reisefuehrer.js (Include ALL sights in guide).

import type { TripProject } from '../../types';
import { getStandardSelfCheck } from './prompt-helpers'; // Falls vorhanden, sonst inline

// Fallback für Helper, falls prompt-helpers noch nicht portiert ist
const getSelfCheck = () => `
# SELF-CORRECTION
Prüfe vor der Ausgabe:
1. Sind ALLE Sights aus der Input-Liste enthalten? (Regel 1)
2. Ist die Reihenfolge geografisch logisch?
3. Ist das JSON valide?
`;

export const buildTourGuidePrompt = (project: TripProject): string => {
  // Wir greifen auf die gesammelten Sights zu (angenommen in project.data.sights)
  // V30 Logik: "Keine Filterung mehr. Wir nehmen ALLE Sehenswürdigkeiten."
  const allSights = (project.data.sights as any[]) || [];

  // Mapping für die KI (Analog zu V30)
  const sightsForPrompt = allSights.map(sight => ({
      id: sight.id,
      name: sight.name,
      adresse: sight.adresse,
      category: sight.category,
      min_duration_minutes: sight.min_duration_minutes || 60 // Default
  }));

  return `
# ROLLE & AUFGABE
Du bist ein erfahrener Reisebuchautor und geografischer Analyst. Deine Stärke ist es, eine lose Sammlung von Orten in eine fesselnde und logische Erzählung zu verwandeln, die ein Reisender für eine Erkundung auf eigene Faust nutzen kann.

Deine Aufgabe ist es, die **gesamte Liste** von Sehenswürdigkeiten zu nehmen und sie in geografisch zusammenhängende "Erkundungstouren" zu gliedern. Du erstellst **KEINEN** Zeitplan, sondern eine rein räumliche Gliederung.

# ARBEITSSCHRITTE
1.  **Analyse:** Analysiere die geografische Lage aller Orte in der bereitgestellten Liste.
2.  **Cluster-Bildung:** Fasse die Orte in sinnvolle, dichte Cluster zusammen (z.B. nach Stadtvierteln, Parks oder thematischen Routen). Strebe eine Anzahl von 2 bis 5 Clustern an.
3.  **Benennung:** Gib jedem Cluster einen kreativen und passenden Titel für eine Erkundungstour (z.B. "Tour 1: Das historische Herz der Stadt" oder "Tour 2: Entlang des Flusses").
4.  **Sequenzierung:** Bringe die Sehenswürdigkeiten **innerhalb jedes Clusters** in eine logische Reihenfolge, die sich für einen Spaziergang oder eine kurze Fahrt anbietet.
5.  **JSON-Erstellung:** Erstelle das finale JSON-Objekt exakt nach dem unten definierten Zielformat.

# ZWINGENDE REGELN
- **Regel 1 (Vollständigkeit):** JEDE Sehenswürdigkeit aus der Eingabeliste MUSS in genau EINER Tour vorkommen. Kein Ort darf verloren gehen.
- **Regel 2 (Keine Zeitplanung):** Deine Aufgabe ist rein geografisch. Füge KEINE Uhrzeiten, Zeitfenster oder Transfer-Aktivitäten hinzu.
- **Regel 3 (ID-Integrität):** Das finale Array \`vorgeschlagene_reihenfolge_ids\` MUSS die exakten \`id\`-Werte aus der Eingabeliste enthalten. Verändere oder erfinde keine IDs.

# DATENGRUNDLAGEN (Vollständige Liste aller Ideen)
\`\`\`json
${JSON.stringify(sightsForPrompt, null, 2)}
\`\`\`

# VERBINDLICHES ZIELFORMAT
Deine Antwort MUSS exakt dem folgenden JSON-Schema entsprechen.
\`\`\`json
{
  "reisefuehrer": {
    "titel": "String (z.B. 'Ihr persönlicher Reiseführer für Paris')",
    "einleitung": "String (Eine kurze, einladende Einleitung, die die Gliederung in Erkundungstouren erklärt)",
    "erkundungstouren": [
      {
        "tour_titel": "String (Ein kreativer Name für die Tour, z.B. 'Tour 1: Das historische Zentrum')",
        "tour_beschreibung": "String (Eine kurze Beschreibung des Gebiets und was den Besucher dort erwartet, ca. 2-3 Sätze)",
        "vorgeschlagene_reihenfolge_ids": [
          "String (Die 'id' der Sehenswürdigkeit aus der Eingabeliste in der empfohlenen Reihenfolge)"
        ]
      }
    ]
  }
}
\`\`\`

${getSelfCheck()}

Beginne deine Antwort direkt mit \`\`\`json.
`;
};
// --- END OF FILE 76 Zeilen ---
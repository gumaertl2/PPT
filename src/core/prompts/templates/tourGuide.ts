// src/core/prompts/templates/tourGuide.ts
// 17.01.2026 23:10 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).
// 17.01.2026 22:15 - FIX: Updated data access (places instead of sights).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildTourGuidePrompt = (project: TripProject): string => {
  // Wir greifen auf die gesammelten Sights zu (V40: project.data.places)
  const allSights = Object.values(project.data.places || {});

  // Mapping für die KI
  const sightsForPrompt = allSights.map(sight => ({
      id: sight.id,
      name: sight.name,
      adresse: sight.adresse,
      category: sight.category,
      min_duration_minutes: sight.min_duration_minutes || 60 
  }));

  const role = `Du bist ein erfahrener Reisebuchautor und geografischer Analyst. Deine Stärke ist es, eine lose Sammlung von Orten in eine fesselnde und logische Erzählung zu verwandeln, die ein Reisender für eine Erkundung auf eigene Faust nutzen kann.

Deine Aufgabe ist es, die **gesamte Liste** von Sehenswürdigkeiten zu nehmen und sie in geografisch zusammenhängende "Erkundungstouren" zu gliedern. Du erstellst **KEINEN** Zeitplan, sondern eine rein räumliche Gliederung.`;

  const instructions = `# ARBEITSSCHRITTE
1.  **Analyse:** Analysiere die geografische Lage aller Orte in der bereitgestellten Liste.
2.  **Cluster-Bildung:** Fasse die Orte in sinnvolle, dichte Cluster zusammen (z.B. nach Stadtvierteln). Strebe 2-5 Cluster an.
3.  **Benennung:** Gib jedem Cluster einen kreativen Titel (z.B. "Tour 1: Das historische Herz").
4.  **Sequenzierung:** Bringe die Sehenswürdigkeiten **innerhalb jedes Clusters** in eine logische Reihenfolge für einen Spaziergang.
5.  **JSON-Erstellung:** Erstelle das finale JSON-Objekt.

# ZWINGENDE REGELN
- **Regel 1 (Vollständigkeit):** JEDE Sehenswürdigkeit aus der Eingabeliste MUSS in genau EINER Tour vorkommen.
- **Regel 2 (Keine Zeitplanung):** Füge KEINE Uhrzeiten oder Zeitfenster hinzu.
- **Regel 3 (ID-Integrität):** Nutze die exakten \`id\`-Werte aus der Eingabeliste.`;

  const outputSchema = {
    "reisefuehrer": {
      "titel": "String (z.B. 'Ihr persönlicher Reiseführer für Paris')",
      "einleitung": "String (Kurze, einladende Einleitung)",
      "erkundungstouren": [
        {
          "tour_titel": "String",
          "tour_beschreibung": "String (2-3 Sätze zum Gebiet)",
          "vorgeschlagene_reihenfolge_ids": ["String (ID der Sehenswürdigkeit)"]
        }
      ]
    }
  };

  return new PromptBuilder()
    .withOS()
    .withRole(role)
    .withContext(sightsForPrompt, "DATENGRUNDLAGEN (Vollständige Liste aller Ideen)")
    .withInstruction(instructions)
    .withOutputSchema(outputSchema)
    .withSelfCheck(['basic', 'planning'])
    .build();
};
// --- END OF FILE 62 Zeilen ---
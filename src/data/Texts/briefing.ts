// src/data/Texts/briefing.ts
// 13.01.2026 18:00 - UPDATE: Added Sec 7 (Business Rules) & Sec 8 (Workflows/Chunking)
// --- END OF FILE 280 Zeilen ---

export const briefing = {
  de: {
    title: "Projekt Briefing V40",
    content: `# PROJECT BRIEFING: Papatours V40 (Modern Architecture)

### 1. Projektübersicht
Der "Papa-Tours Reiseplan-Generator V40" ist eine moderne **Progressive Web Application (PWA)**, entwickelt mit **React, TypeScript und Vite**.
Wie der Vorgänger ist es eine clientseitige Anwendung, die keine eigene Server-Infrastruktur benötigt. Sie nutzt die **Google Gemini API** (Pro & Flash Modelle), um hochkomplexe, logistisch validierte Reisepläne zu generieren.

**Kern-Philosophie V40:**
Das System behält die Logik der "Orchestrierte Intelligenz" (The Magic Chain) bei, setzt sie aber auf ein **typsicheres, reaktives Fundament**.
* **Stateless UI:** Die Oberfläche reagiert nur noch auf Zustandsänderungen im Store.
* **Single Source of Truth:** Es gibt keine versteckten Datenflüsse mehr.

### 1b. Tech-Stack & Libraries
Damit generierter Code sofort kompilierbar ist, nutze ausschließlich diesen Stack:
* **Core:** React 18, TypeScript 5, Vite (PWA Mode).
* **State Management:** Zustand (mit Slice-Pattern).
* **Styling:** Tailwind CSS (Utility First).
* **Icons:** Lucide React.
* **Date Handling:** Native Date API (oder date-fns wenn nötig).

---

### 2. Architektur & Dateistruktur (Slices Edition)

Das Herzstück der V40 ist der **modulare Zustand Store**. Um das "God Object" Problem zu vermeiden, wurde der Store in thematische "Slices" zerlegt.

#### A. STATE MANAGEMENT (Zustand Slices)
Der Store (\`useTripStore\`) ist ein Assembler, der folgende Slices zusammenfügt:
1.  **ProjectSlice** (\`src/store/slices/createProjectSlice.ts\`):
    * Hält das \`project\`-Objekt (UserInputs, Daten).
    * Verwaltet Laden (Hybrid: JSON/File) und Speichern.
2.  **UISlice** (\`src/store/slices/createUISlice.ts\`):
    * Steuert Views (\`welcome\`, \`wizard\`, \`analysis\`).
    * Steuert die **Anreicherer-UI** (Filter, Listenansicht).
3.  **SystemSlice** (\`src/store/slices/createSystemSlice.ts\`):
    * Infrastruktur: API-Key, AI-Settings.
    * Logging: **Flight Recorder** (Auto-Logging aller KI-Calls).
4.  **AnalysisSlice** (\`src/store/slices/createAnalysisSlice.ts\`):
    * Speichert Ergebnisse der KI-Tasks (z.B. ChefPlaner).

#### B. WORKFLOWS (Datenfluss & SSOT)
**Grundprinzip: Single Source of Truth (SSOT)**
Der \`project.data.places\` Store ist die einzige Wahrheit. Es gibt keine temporären Listen, die zwischen Komponenten herumgereicht werden.

**Der ID-basierte Datenfluss:**
Die Kommunikation zwischen Workflow-Schritten erfolgt **ausschließlich** über persistente UUIDs.
1.  **Basis (Sammler):** Generiert Namen -> Erzeugt UUIDs im Store.
2.  **Anreicherer:** Liest IDs -> Holt Details -> Merged Details zurück in die *gleiche* ID.

---

### 3. Zentrale Datenstrukturen (Core Types)

Alles basiert auf dem Interface \`TripProject\` (in \`src/core/types.ts\`):

\`\`\`typescript
interface TripProject {
  meta: { id, version, created... };
  userInputs: { ... }; // Travelers, Dates, Logistics
  analysis: {
     chefPlaner: ChefPlanerResult;   // Fundamentalanalyse
  };
  data: {
     places: Record<string, Place>;  // POIs (durch Basis/Anreicherer gefüllt)
     routes: Record<string, Route>;
     content: Record<string, Content>; // Lange Texte, Infos
  };
  itinerary: { days: DayPlan[] };    // Der finale Plan
}
\`\`\`

---

### 4. Prompt-Engineering 2.0 (The Builder Pattern)

Wir senden keine rohen Strings mehr an die KI.
1.  **PayloadBuilder:** Extrahiert nur relevante Daten aus dem Store.
2.  **Template:** Typsichere Textbausteine.
3.  **PromptBuilder:** Kombiniert Template + Payload + System-Instruktionen.
**Wichtig:** Der Output der KI ist immer **JSON** ("JSON Mode").

---

### 5. Sicherheits- & Qualitäts-Protokolle

1.  **Type Safety First:** \`any\` ist verboten.
2.  **Strict Separation:** Keine Logik im UI, kein UI-String-Building im Service.
3.  **Validation:** Zod Schemas für alle KI-Antworten.

---

### 6. Migration Guide (Alt -> Neu)

| Konzept V30 | Konzept V40 |
| :--- | :--- |
| \`app-state.js\` | \`useTripStore.ts\` (Slices) |
| \`render-*-view.js\` | React Components (\`.tsx\`) |
| \`workflow-orchestrator.js\` | \`useTripGeneration.ts\` Hook |

---

### 7. Business Rules & UI Standards (Update 13.01.2026)

**A. Die "Reserve"-Logik (SightsView)**
Die Filterung der Hauptliste ist strikt ("Exclusive OR"). Ein Ort kommt in die Reserve, wenn:
1. User-Prio ist explizit -1.
2. Dauer < \`minDuration\`.
3. Rating > 0 UND Rating < \`minRating\`.
*Wichtig:* Orte ohne Rating (0) bleiben in der Hauptliste (Benefit of the Doubt).

**B. Workflow-Status & "User Sovereignty"**
Der Status eines Schritts im \`WorkflowSelectionModal\`:
1. **Accommodation:** Grün, wenn AI-Hotels existieren **ODER** der User manuell ein Hotel eingetragen hat.
2. **Anreicherer:** Grün, wenn Orte im Store substantielle Daten haben (z.B. \`kurzbeschreibung\` > 20 Zeichen). Leeres \`content\`-Objekt ist kein Indikator mehr.
3. **Re-Runs:** Erledigte Schritte dürfen wiederholt werden (mit Warnhinweis).

**C. Flight Recorder Architektur**
Jeder KI-Aufruf **MUSS** über \`src/services/gemini.ts\` laufen. Dieser Service loggt Request/Response automatisch in den Store. Direkte \`fetch\`-Calls in Komponenten sind verboten.

**D. UX-Modi (Planen vs. Konsumieren)**
* **Guide Mode (Default):** Reine Lese-Ansicht.
* **Planning Mode:** Zeigt Budget-Alerts und Prio-Buttons (via Filter-Modal aktivierbar).
* **Reserveliste:** Ist unabhängig vom Modus immer sichtbar, wenn gefüllt.

**E. Zeit-Budget & Pace**
Verfügbare Zeit pro Tag (netto ohne Pausen):
* **Fast:** 10 Std. (08:00 - 19:00, 1h Pause)
* **Balanced:** 6 Std. (09:30 - 17:00, 1.5h Pause)
* **Relaxed:** 4.5 Std. (10:00 - 16:00, 1.5h Pause)

---

### 8. Workflow Inventory & Prompt Architecture

**A. Die Workflow-Bibliothek (V30 -> V40 Portierung)**

| ID | Name | Funktion |
| :--- | :--- | :--- |
| \`chefPlaner\` | Der Stratege | Validiert Logistik & Hotel. Erstellt Meta-Strategie. |
| \`basis\` | Der Sammler | Generiert POI-Namen (Strings). |
| \`anreicherer\` | Der Rechercheur | **[Chunked]** Sucht Details (Coords, Dauer, Rating). |
| \`food\` | Der Food-Scout | Sucht Restaurants. |
| \`guide\` | Der Routen-Architekt | Gruppiert Orte zu Touren (Clustering). |
| \`dayplan\` | Der Tagesplaner | **[Iterativ]** Erstellt Zeitpläne. |
| \`details\` | Der Texter | **[Chunked]** Schreibt lange Beschreibungen. |
| \`infos\` | Der Info-Autor | Erstellt Tipps & Tricks. |
| \`sondertage\` | Der Spezialist | Schlechtwetter & Events. |

**B. Prompt Logik & Chunking Strategy**

Wir nutzen eine strikte **Chunking-Strategie**, da die KI bei großen Datenmengen zu Timeouts, Halluzinationen oder invalidem JSON neigt.

1. **Trial & Error Historie:**
   Die aktuellen Chunk-Größen (z.B. 5-10 Orte pro Request) sind empirisch ermittelt. Größere Pakete führten in der V30 regelmäßig zu Abbrüchen. Diese Limits sind hardcodiert zu respektieren.

2. **Die "Slice & Map" Taktik:**
   Der Service zerteilt Listen (z.B. 50 Orte) in Blöcke, sendet sie sequenziell/parallel und merged die Ergebnisse.

3. **Das "Merge" Protokoll (Idempotenz):**
   Die KI muss zwingend die **ID** des Objekts zurückgeben ("Pass-Through"). Nur so können die angereicherten Daten dem korrekten Original-Objekt im Store zugeordnet werden.
`
  }
};
// --- END OF FILE 280 Zeilen ---
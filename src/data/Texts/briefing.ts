// src/data/Texts/briefing.ts
// 16.01.2026 16:30 - UPDATE: Completed Workflow Inventory.
// 17.01.2026 20:30 - FIX: Restored Sections 7D/E & Merged Functional + Technical Descriptions in Section 8.
// 17.01.2026 21:15 - DOCS: Defined "PromptBuilder Pattern" & V40 Prompting Principles (Section 4).

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
* **Deployment:** Wir verwenden Vercel.com.

---

### 2. Architektur & Dateistruktur (Slices Edition)

Das Herzstück der V40 ist der **modulare Zustand Store**. Um das "God Object" Problem zu vermeiden, wurde der Store in thematische "Slices" zerlegt.
Die UI ist in **Feature-Ordnern** organisiert (\`src/features/...\`).

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
      routeArchitect?: RouteArchitectResult; // Rundreise-Optionen
      geoAnalyst?: GeoAnalystResult; // Hotel-Strategie
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

In V40 ist das manuelle Zusammenbauen von Strings ("String Soup") streng verboten. Wir nutzen ausschließlich die Klasse \`PromptBuilder\`.

#### Die 5 Säulen des Promptings:

1.  **Die Builder-Klasse:**
    Jedes Template (\`src/core/prompts/templates/*.ts\`) exportiert eine Funktion, die \`new PromptBuilder()\` instanziiert.
    \`\`\`typescript
    const builder = new PromptBuilder("SYSTEM-ROLLE: Du bist ein...");
    \`\`\`

2.  **Context Injection (Daten statt Prosa):**
    Wir erzählen der KI keine Geschichten, wir geben ihr Daten.
    Nutze \`builder.addContext(label, data)\`. Der Builder kümmert sich um die Formatierung.
    *Falsch:* \`"Der User reist mit " + adults + " Erwachsenen."\`
    *Richtig:* \`builder.addContext("Reisegruppe", { adults, children })\`

3.  **Instruction & Constraints (Logik):**
    Nutze \`builder.addInstruction(...)\` für das "Was" und \`builder.addConstraint(...)\` für das "Was nicht".
    Hier findet auch Logik wie **Chunking** statt:
    *Beispiel:* Wenn \`visitedSightIds\` existieren, wird dynamisch ein Constraint ("Keine Doppelungen!") hinzugefügt.

4.  **Strict Output Schema (JSON Mode):**
    Jeder Prompt endet zwingend mit \`builder.setOutputFormat(schemaString)\`.
    Der Output darf **kein Markdown** (\`\`\`json) enthalten, nur reines JSON.
    Die Struktur muss 1:1 kompatibel mit den TypeScript-Interfaces im Frontend sein.

5.  **ID-Pass-Through (Mapping):**
    Das wichtigste Gesetz: Wenn die KI Daten verarbeitet, **MUSS** sie die originale \`id\` (als \`original_sight_id\`) zurückgeben. Nur so können wir den generierten Text wieder mit dem Datenbank-Objekt (Bilder, Geo-Daten) verknüpfen.

---

### 5. Sicherheits- & Qualitäts-Protokolle

1.  **Type Safety First:** \`any\` ist verboten.
2.  **Strict Separation:** Keine Logik im UI, kein UI-String-Building im Service.
3.  **Validation:** Zod Schemas für alle KI-Antworten.
4.  **Internationalisierung (i18n):**
    * Daten-Objekte nutzen \`LocalizedContent\` (z.B. \`label: { de: "...", en: "...", es: "..." }\`).
    * Zugriff nie direkt (z.B. \`.de\`), sondern immer über Helper (z.B. \`resolveLabel\`) oder Fallbacks, da Felder optional sind (siehe \`src/core/types.ts\`).

---

### 6. Migration Guide (Alt -> Neu)

| Konzept V30 | Konzept V40 |
| :--- | :--- |
| \`app-state.js\` | \`useTripStore.ts\` (Slices) |
| \`render-*-view.js\` | Feature Components (\`src/features/...\`) |
| \`workflow-orchestrator.js\` | \`useTripGeneration.ts\` Hook |
| \`prompt-*.js\` | \`src/core/prompts/templates/*.ts\` (via PromptBuilder) |

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
* Custom Errors (\`UserAbortError\`, \`ApiError\`) müssen konstruktorseitig Nachrichten akzeptieren, um spezifische Abbruchgründe (z.B. "Rate Limit") an die UI durchzureichen.

**D. UX-Modi (Planen vs. Konsumieren)**
* **Guide Mode (Default):** Reine Lese-Ansicht.
* **Planning Mode:** Zeigt Budget-Alerts und Prio-Buttons (via Filter-Modal aktivierbar).
* **Reserveliste:** Ist unabhängig vom Modus immer sichtbar, wenn gefüllt.

**E. Zeit-Budget & Pace**
Verfügbare Zeit pro Tag (netto ohne Pausen):
* **Fast:** 10 Std. (08:00 - 19:00, 1h Pause)
* **Balanced:** 6 Std. (09:30 - 17:00, 1.5h Pause)
* **Relaxed:** 4.5 Std. (10:00 - 16:00, 1.5h Pause)
* *Hinweis:* Die Budget-Logik im Store (\`userInputs.dates\`) steuert Warnhinweise in der SightsView. Zeiten werden aus den User-Präferenzen oder Defaults berechnet.

---

### 8. Workflow Inventory & Prompt Architecture

**A. Die Wiring-Matrix (Single Source of Truth)**
Diese Tabelle definiert die exakte Verdrahtung zwischen ID, V30-Original, UI-Labels und Funktion.

| V40 TaskKey (ID) | Labels (Settings / Workflow) | V30 Source File | Funktion (Beschreibung) |
| :--- | :--- | :--- | :--- |
| \`chefPlaner\` | ChefPlaner / 0. Fundamentalanalyse | \`prompt-chef-planer.js\` | Der Stratege: Validiert Logistik & Hotel. Erstellt Meta-Strategie. |
| \`routeArchitect\`| RouteArchitect / 0b. Routen-Architekt | \`prompt-routen-architekt.js\` | Der Routen-Planer: Erstellt 3 Rundreise-Optionen (nur Mobil). |
| \`basis\` | Basis / 1. Basis: Kandidaten | \`prompt-sammler.js\` | Der Sammler: Generiert POI-Namen (Strings). |
| \`anreicherer\` | Anreicherer / 2. Daten-Anreicherer | \`prompt-anreicherer.js\` | Der Rechercheur: Sucht Details (Coords, Dauer, Rating). |
| \`guide\` | Guide / 3. Reiseführer | \`prompt-reisefuehrer.js\` | Der Reiseführer: Erstellt geografische Walking-Tours (Cluster). |
| \`details\` | Details / 4. Detail-Texte | \`prompt-chefredakteur.js\` | Der Texter: Schreibt lange, narrative Beschreibungen. |
| \`dayplan\` | Dayplan / 5. Tagesplan | \`prompt-tagesplaner.js\` | Der Tagesplaner: Erstellt iterativ Zeitpläne. |
| \`infos\` | Infos / 6. Reise-Infos | \`prompt-info-autor.js\` | Der Info-Autor: Erstellt Tipps & Tricks (Logistik, Maut). |
| \`food\` | Food / 7. Restaurants | \`prompt-food-scout.js\` | Der Food-Scout: Sucht Restaurants & Cafés. |
| \`accommodation\` | Accommodation / 8. Unterkunft | \`prompt-hotel-scout.js\` | Der Hotel-Scout: Sucht Unterkünfte (inkl. Geo-Analyse). |
| \`sondertage\` | Sondertage / 9. Flexibilität | \`prompt-ideen-scout.js\` | Der Spezialist: Schlechtwetter & Sonnenschein-Alternativen. |
| \`transfers\` | Transfers / 10. Transfers | \`prompt-transfer-planer.js\` | Der Logistiker: Berechnet Wege & Fahrzeiten (benötigt Dayplan). |

**B. Hintergrund-Agenten (Settings Matrix)**
Diese Spezialisten tauchen nicht im Workflow-Menü auf, sind aber via Settings konfigurierbar (Modell-Wahl).

| V40 TaskKey | V30 Source File | Funktion |
| :--- | :--- | :--- |
| \`geoAnalyst\` | (Neu in V40) | Strategische Analyse für Hotel-Standorte (Hub-Suche). |
| \`durationEstimator\`| \`prompt-duration-estimator.js\` | Der Zeit-Stratege: Schätzt Besuchszeiten für Rundreisen. |
| \`foodEnricher\` | \`prompt-food-enricher.js\` | Lädt Speisekarten/Details zu Restaurants. |
| \`countryScout\` | \`prompt-country-scout.js\` | Lädt Basis-Infos zu Ländern. |

**C. Prompt Logik & Chunking Strategy**

Wir nutzen eine strikte **Chunking-Strategie**, da die KI bei großen Datenmengen zu Timeouts, Halluzinationen oder invalidem JSON neigt.
1. **Trial & Error Historie:** Limits (z.B. 5-10 Orte) sind empirisch ermittelt und in \`config.ts\` hinterlegt.
2. **Die "Slice & Map" Taktik:** Listen werden zerteilt, sequenziell verarbeitet und gemerged.
3. **Das "Merge" Protokoll:** Die KI muss zwingend die **ID** zurückgeben ("Pass-Through"), um Daten korrekt zuzuordnen.
`
  }
};
// --- END OF FILE 332 Zeilen ---
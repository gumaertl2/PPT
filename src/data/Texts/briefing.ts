// 21.01.2026 05:00 - DOCS: Explicitly added "English Keys / Localized Values" Rule to Section 4.
// src/data/Texts/briefing.ts
// 21.01.2026 04:30 - DOCS: Integrated "Anti-Chatty" Protocol, Payload Filtering & SightsView Refactoring.

export const briefing = {
  de: {
    title: "Projekt Briefing V40",
    content: `# PROJECT BRIEFING: Papatours V40 (Modern Architecture)

### 1. Projektübersicht
Der "Papa-Tours Reiseplan-Generator V40" ist eine moderne **Progressive Web Application (PWA)**, entwickelt mit **React, TypeScript und Vite**.
Wie der Vorgänger ist es eine clientseitige Anwendung, die keine eigene Server-Infrastruktur benötigt. Sie nutzt die **Google Gemini API** (Version 1.5 Pro & Flash), um hochkomplexe, logistisch validierte Reisepläne zu generieren.

**Kern-Philosophie V40:**
Das System behält die Logik der "Orchestrierte Intelligenz" (The Magic Chain) bei, setzt sie aber auf ein **typsicheres, reaktives Fundament**.
* **Stateless UI:** Die Oberfläche reagiert nur noch auf Zustandsänderungen im Store.
* **Configurable AI Matrix:** Modelle und Limits sind zur Laufzeit konfigurierbar (Settings Modal).
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
    * Infrastruktur: API-Key, AI-Settings (Modell-Matrix, Chunk-Limits).
    * Logging: **Flight Recorder** (Auto-Logging aller KI-Calls).
4.  **AnalysisSlice** (\`src/store/slices/createAnalysisSlice.ts\`):
    * Speichert Ergebnisse der KI-Tasks (z.B. ChefPlaner).

#### B. COMPONENT ARCHITECTURE (UI Refactoring)
Wir vermeiden "Blob-Komponenten" (>500 Zeilen).
* **SightsView:** Die Hauptansicht (\`SightsView.tsx\`) delegiert komplexe UI-Logik an Sub-Komponenten.
* **SightFilterModal:** Die Filter-Logik ist komplett in \`SightFilterModal.tsx\` ausgelagert.
* **SightCard:** Verwaltet ihren eigenen lokalen Darstellungszustand (Detail-Level).

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
      // NEU V40.2:
      tourGuide?: TourGuideResult;   // Touren-Definitionen
      ideenScout?: IdeenScoutResult; // Flex-Optionen
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

### 4. Prompt-Engineering 2.1 (The "Silence Protocol")

In V40 nutzen wir das Builder Pattern (\`PromptBuilder\`). Aufgrund von "Chatty AI" Problemen (besonders bei Flash) gilt ein verschärftes Protokoll.

#### A. The Anti-Chatty Protocol (System Guard)
Die API-Einstellung \`response_mime_type: 'application/json'\` allein reicht für kleinere Modelle oft nicht aus.
Wir erzwingen JSON-Konformität durch **In-Prompt-Constraints**:

1.  **System OS Update:**
    \`"NO PREAMBLE. NO MARKDOWN. START WITH '{'."\`
    Die KI darf keinen Text vor dem JSON generieren ("Here is your JSON...").
2.  **Thinking Container:**
    Der "Thought Process" (CoT) ist essenziell für Qualität, darf aber das JSON nicht brechen.
    **Regel:** Denken findet **innerhalb** des JSON-Keys \`_thought_process\` statt.
    \`"Principle: Thinking MUST happen INSIDE the JSON key '_thought_process'."\`
3.  **Language & Structure Separation:**
    * **KEYS sind Code:** JSON-Keys müssen strikt **Englisch** bleiben (passend zu TypeScript).
        * *Richtig:* \`{ "description": "Eine schöne Aussicht" }\`
        * *Falsch:* \`{ "beschreibung": "Eine schöne Aussicht" }\`
    * **VALUES sind Content:** Der Inhalt (Values) muss in der vom User gewählten Sprache sein (meist Deutsch).
    * *System Guard:* "You must NEVER translate JSON KEYS."

#### B. Context Injection & Builder
1.  **Builder-Klasse:** Instanziierung via \`PromptBuilder\`.
2.  **Context Injection:** Daten werden strukturiert via \`builder.addContext()\` übergeben, nie als Prosatext.
3.  **Strict Schema:** Jeder Prompt endet mit einem Zod-kompatiblen JSON-Schema.

---

### 5. Sicherheits- & Qualitäts-Protokolle

1.  **Type Safety First:** \`any\` ist verboten (außer bei expliziten Casts für gemischte Datenstrukturen wie Touren).
2.  **Strict Separation:** Keine Logik im UI, kein UI-String-Building im Service.
3.  **Validation:** Zod Schemas für alle KI-Antworten.
4.  **Internationalisierung (i18n):** Daten-Objekte nutzen \`LocalizedContent\`.
5.  **Zero Error Policy:** JSON-Validierung im Orchestrator verhindert UI-Abstürze.

---

### 7. Business Rules & UI Standards (Update 21.01.2026)

**A. Die "Reserve"-Logik (SightsView)**
Ein Ort kommt in die Reserve, wenn: Prio -1, Dauer < min, oder Rating < min.
Orte ohne Rating bleiben in der Hauptliste.

**B. UI-Konzept: View Switcher (SightsView)**
Statt einfacher Filter nutzen wir "Sichten" (Views), die die Liste grundlegend neu gruppieren:
1.  **Kategorie:** Gruppierung nach Typ (Kultur, Natur...).
2.  **Tour:** Gruppierung nach Touren (vom \`tourGuide\` definiert).
3.  **Tag:** Gruppierung nach Reisetagen (vom \`dayplan\` definiert).
4.  **A-Z:** Flache alphabetische Liste.

**C. UI-Konzept: Progressive Disclosure (SightCard)**
Details werden stufenweise enthüllt, um die UI ruhig zu halten:
* **Kompakt:** Nur Titel & Icons.
* **Standard:** + Kurzbeschreibung & KPIs.
* **Details:** + Volltext & Reasoning.
* **Steuerung:** Über **+/- Buttons** kann jede Karte individuell "aufgeklappt" werden.

---

### 8. Workflow Inventory & Prompt Architecture

**A. Die Wiring-Matrix (Auszug)**

| V40 TaskKey (ID) | Labels | Funktion & Besonderheiten |
| :--- | :--- | :--- |
| \`chefPlaner\` | ChefPlaner | Fundamentalanalyse. |
| \`basis\` | Sammler | **WICHTIG:** Payload-Filter aktiv! Service-Interessen (Hotel/Food) werden hier ausgeblendet ("Double Bind"-Prävention), damit er nur POIs sucht. |
| \`anreicherer\` | Anreicherer | Sucht Details. Nutzt Batching (Default: 5-10 Items). |
| \`guide\` | Guide | Erstellt Cluster/Touren für den View-Switcher. |
| \`details\` | Details | Schreibt lange Texte für "Detail"-View. |
| \`tourGuide\` | Tour Guide | (Neu) Definiert Touren-Logik. |

**B. Payload Filtering (Double Bind Fix)**
Der \`PayloadBuilder\` filtert für den Task \`basis\` (Sammler) aktiv alle Interessen heraus, die Services betreffen (Food, Hotel).
*Grund:* Der Prompt verbietet Restaurants ("ABSOLUTELY FORBIDDEN"), aber das User-Profil enthält sie. Dies führt zu Halluzinationen. Der Filter löst diesen Konflikt an der Wurzel.

**C. Hintergrund-Agenten**
Modell-Wahl via Matrix. \`geoAnalyst\`, \`durationEstimator\`, \`foodEnricher\`, \`countryScout\`.

**D. The Orchestrator**
Kapselt \`Select -> Resolve -> Execute -> Validate\`.
Stellt sicher, dass das "Silence Protocol" (Prompt) und der "Native JSON Mode" (API) Hand in Hand arbeiten.
`
  }
};
// --- END OF FILE 380 Zeilen ---
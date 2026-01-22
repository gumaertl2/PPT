// 22.01.2026 16:00 - DOCS: Added "ResultProcessor" & "Strict Data Architecture" (ID Factory).
// src/data/Texts/briefing.ts
// 21.01.2026 05:00 - DOCS: Explicitly added "English Keys / Localized Values" Rule to Section 4.

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
* **Separation of Concerns:** Strikte Trennung von UI (Hooks) und Datenlogik (Services).
* **Single Source of Truth:** Es gibt keine versteckten Datenflüsse mehr.

### 1b. Tech-Stack & Libraries
Damit generierter Code sofort kompilierbar ist, nutze ausschließlich diesen Stack:
* **Core:** React 18, TypeScript 5, Vite (PWA Mode).
* **State Management:** Zustand (mit Slice-Pattern).
* **Data Processing:** ResultProcessor (Service Pattern).
* **Styling:** Tailwind CSS (Utility First).
* **Icons:** Lucide React.
* **Deployment:** Wir verwenden Vercel.com.

---

### 2. Architektur & Dateistruktur (Slices Edition)

Das Herzstück der V40 ist der **modulare Zustand Store** und der entkoppelte **ResultProcessor**.

#### A. STATE MANAGEMENT (Zustand Slices)
Der Store (\`useTripStore\`) ist ein Assembler, der folgende Slices zusammenfügt:
1.  **ProjectSlice** (\`src/store/slices/createProjectSlice.ts\`): Hält das \`project\`-Objekt.
2.  **UISlice** (\`src/store/slices/createUISlice.ts\`): Steuert Views & Modals.
3.  **SystemSlice** (\`src/store/slices/createSystemSlice.ts\`): API-Key, Settings, Logging.
4.  **AnalysisSlice** (\`src/store/slices/createAnalysisSlice.ts\`): KI-Ergebnisse.

#### B. DATA PROCESSING LAYER (Neu seit V40.3)
Um "God Objects" zu vermeiden, wurde die Datenverarbeitung aus der UI entfernt.
* **ResultProcessor** (\`src/services/ResultProcessor.ts\`):
    * Zentraler Service für alle KI-Antworten.
    * Beinhaltet die **"ID Factory"** (Strict Type Conversion): Wandelt Strings sofort in Objekte um.
    * Manipuliert den Store direkt via \`useTripStore.getState()\`.
* **useTripGeneration** (\`src/hooks/useTripGeneration.ts\`):
    * Reiner UI-Hook (Queue, Status, Notifications).
    * Delegiert Datenlogik an \`ResultProcessor\`.

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
      // ...
  };
  data: {
      places: Record<string, Place>;  // POIs (durch Basis/Anreicherer gefüllt)
      // WICHTIG: Places haben IMMER eine ID (UUID v4).
  };
  itinerary: { days: DayPlan[] };    // Der finale Plan
}
\`\`\`

---

### 4. Prompt-Engineering 2.1 (The "Silence Protocol")

In V40 nutzen wir das Builder Pattern (\`PromptBuilder\`).

#### A. The Anti-Chatty Protocol
Wir erzwingen JSON-Konformität durch **In-Prompt-Constraints**:
1.  **System OS Update:** \`"NO PREAMBLE. START WITH '{'."\`
2.  **Thinking Container:** Denken findet **innerhalb** des JSON-Keys \`_thought_process\` statt.
3.  **Language Separation:** Keys = Englisch (Code), Values = Deutsch (Content).

#### B. Context Injection
Daten werden strukturiert via \`builder.addContext()\` übergeben.

---

### 5. Sicherheits- & Qualitäts-Protokolle

1.  **Strict Data Integrity (ID Factory):**
    * Strings aus KI-Antworten werden im \`ResultProcessor\` sofort in Objekte \`{id: uuid(), name: ...}\` umgewandelt.
    * Es gelangen niemals "nackte" Strings in den Store.
2.  **Strict Output Filter (PayloadBuilder):**
    * Bevor Daten an den "Anreicherer" gehen, filtert \`sliceData\` alle Objekte ohne ID heraus.
    * Verhindert "Garbage In, Garbage Out".
3.  **Type Safety First:** \`any\` ist verboten.
4.  **Zero Error Policy:** Validation Service prüft Schema vor Verarbeitung.

---

### 8. Workflow Inventory & Prompt Architecture

**A. Die Wiring-Matrix (Auszug)**

| V40 TaskKey (ID) | Labels | Funktion & Besonderheiten |
| :--- | :--- | :--- |
| \`chefPlaner\` | ChefPlaner | Fundamentalanalyse. |
| \`basis\` | Sammler | Liefert Kandidaten (Strings/Objekte). Wird vom Processor normalisiert. |
| \`anreicherer\` | Anreicherer | Bekommt nur valide IDs. Sucht Details. |
| \`guide\` | Guide | Erstellt Cluster/Touren. |

**B. Payload Filtering**
Der \`PayloadBuilder\` filtert aktiv Service-Interessen und ungültige Datenobjekte heraus.

**D. The Orchestrator**
Kapselt \`Select -> Resolve -> Execute -> Validate\`.
Stellt sicher, dass das "Silence Protocol" (Prompt) und der "Native JSON Mode" (API) Hand in Hand arbeiten.
`
  }
};
// --- END OF FILE 400 Zeilen ---
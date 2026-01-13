/**
 * src/data/infoTexts.ts
 *
 * ZENTRALE TEXT-BIBLIOTHEK
 * Enthält die statischen Informationstexte für das Hilfe-System.
 * Struktur unterstützt Mehrsprachigkeit (DE/EN).
 * Inhalte basieren auf den Original-Dateien von Papatours.
 */

import type { LanguageCode } from '../core/types';

export interface InfoContent {
  title: string;
  content: string;
}

export type InfoCategory = 'briefing' | 'description' | 'catalog' | 'help' | 'terms' | 'setup';

// Hilfsfunktion für den Zugriff
export const getInfoText = (category: InfoCategory, lang: LanguageCode = 'de'): InfoContent => {
  const data = INFO_TEXTS[category];
  // Fallback auf Deutsch, falls Englisch nicht existiert, oder Englisch falls Sprache 'en'
  if (lang === 'de') return data.de;
  return data.en || data.de; // Fallback auf DE
};

export const INFO_TEXTS: Record<InfoCategory, { de: InfoContent; en?: InfoContent }> = {
  
  briefing: {
    de: {
      title: "Projekt Briefing",
      content: `**1. Projektübersicht**

Der "Papa-Tours Reiseplan-Generator" (Version 30.3) ist eine clientseitige Single-Page-Application (SPA), geschrieben in modularem JavaScript.
Seine Kernfunktion ist die Generierung hochspezifischer Anweisungen (Prompts) für eine externe KI (Google Gemini Pro 2.5 / Flash 2.5 API), um datenreiche, logistisch optimierte Reisepläne im JSON-Format zu erstellen.
Die Anwendung operiert vollständig im Browser des Nutzers und erfordert keine serverseitige Komponente.

**Kern-Philosophie (V30.3):**
Das System agiert als **"Orchestrierte Intelligenz"**.
Es verlässt sich nicht auf einen einzelnen KI-Aufruf, sondern zerlegt die komplexe Aufgabe der Reiseplanung in viele kleine, spezialisierte Arbeitsschritte (Agents), die nacheinander ausgeführt werden ("The Magic Chain").

**2. Der Redaktions-Workflow (Architektur V30.3)**

Der Prozess ist als mehrstufiger Workflow konzipiert.
Der workflow-orchestrator.js steuert die Interaktion und nutzt das **"Smart Model Routing"**, um je nach Aufgabe das optimale KI-Modell (Pro 2.5 vs. Flash 2.5) zu wählen.

* **Phase 0: Das Fundament (Strategie & Validierung)**
    * **Rolle:** Chef-Planer (Strategischer Analyst).
    * **Modell:** Gemini Pro 2.5 (Intelligenz).
    * **Aufgabe:** Prüft die initialen Nutzerdaten auf Plausibilität, validiert feste Termine und Hotelvorgaben durch externe Recherche und formuliert das strategische Briefing.
    * **Feature (Smart Override):** Berechnet dynamisch die ideale Anzahl an Vorschlägen (candidateListSize) basierend auf der Reisedauer, um Überforderung zu vermeiden.

* **Phase 1: Ideenfindung & Anreicherung (Discovery)**
    * **1a. Der Routen-Architekt (Nur bei Rundreisen):**
        * **Rolle:** Geo-Stratege.
        * **Modell:** Gemini Pro 2.5.
        * **Aufgabe:** Entwirft 2-3 logische Routenoptionen.
        * **Feature (Smart Time Constraints):** Unterscheidet zwischen "Max. Fahrzeit pro Etappe" (Komfort) und "Max. Gesamtfahrzeit" (Urlaubs-Budget).
        Erlaubt intelligente Überschreitungen für Top-Ziele ("Soft Limits").
    * **1b. Der Sammler:**
        * **Rolle:** Kreativer Kurator.
        * **Modell:** Gemini Flash 2.5 (Masse/Geschwindigkeit).
        * **Aufgabe:** Erstellt eine große Liste mit **Namen** von passenden Sehenswürdigkeiten.
        * **Logik:** Berücksichtigt strikte technische Constraints aus den Interessen (z.B. "Keine Wanderung > 15km").
    * **1c. Der Anreicherer:**
        * **Rolle:** Faktenchecker & Geocoder.
        * **Modell:** Gemini Flash 2.5.
        * **Aufgabe:** Reichert jeden Namen durch Live-Recherche mit Fakten an (Adresse, Öffnungszeiten, Koordinaten).
        * **Technik:** Trennt sauber zwischen Stadt und Land für korrekte Zuordnung.

* **Phase 2: Planung & Logistik**
    * **Der Reiseführer-Architekt:** Gliedert alle Orte in geografische Cluster ("Touren").
    * **Der Tagesplaner:** Erstellt den zeitlichen Ablauf.
        * **Feature (Context-Sensitive Logistics):** Unterscheidet zwischen "Transfer-Tagen" (große Distanzen erlaubt) und "Stationären Tagen" (lokaler Radius).
    * **Der Transfer-Planer:** Berechnet detaillierte Wegezeiten zwischen den Aktivitäten.

* **Phase 3: Content & Veredelung**
    * **Der Chefredakteur:** Schreibt detaillierte Sachtexte für Sehenswürdigkeiten.
    * **Der Info-Autor:** Verfasst allgemeine Kapitel (z.B. "Sicherheit", "Maut").
        * **Feature:** Nutzt eine lokale Datenbank (countries.js), um länderspezifische Quellen zu wählen.
    * **Der Country-Scout:**
        * **Aufgabe:** Erkennt unbekannte Reiseländer und recherchiert live die besten lokalen Restaurant-Guides, um die Datenbank (countries.js) zu erweitern.
    * **Der Food-Scout (3-Stufen-Prozess):**
        * **1. Collector:** Scannt Guides (Michelin, Gault&Millau etc.) im weiten Umkreis.
        * **2. Geo-Filter:** Berechnet präzise Distanzen und filtert irrelevante Treffer (JavaScript-Logik).
        * **3. Enricher:** Recherchiert Details nur für die Shortlist. Nutzt die Strategie der "Konzentrischen Kreise" (Nah=Gut/Bodenständig, Fern=Exzellent/Sterne).

**2a. Der 2-Stufen-Workflow (UI-Logik)**

Um dem Nutzer maximale Kontrolle zu geben, ist der Prozess in zwei Hauptaktionen unterteilt:

* **1. Guide (Zauberstab):**
    * Startet die Phasen 0 und 1.
    * Erstellt das Fundament, findet Sehenswürdigkeiten und strukturiert diese in Touren.
    * **Ergebnis:** Ein fertiger "Reiseführer" ohne festes Zeitkorsett.
* **2. Tagesplan:**
    * Startet Phase 2.
    * Nimmt den Reiseführer und gießt ihn in einen konkreten Kalender.
    * **Ergebnis:** Ein detaillierter Ablaufplan mit Uhrzeiten und Transfers.

**2b. Interaktive Power-Tools**

* **Ad-Hoc Suche (Spontan-Modus):**
    * Ermöglicht die isolierte Nutzung des Food-Scouts für einen beliebigen Ort, ohne einen Reiseplan anzulegen.
* **Intelligente Reise-Fusion (Merge-Engine):**
    * Ermöglicht das Zusammenführen von mehreren .json-Dateien. Dubletten werden erkannt.
* **Viewer-App Generator:**
    * Erstellt eine autarke HTML-Datei (Reise_Viewer.html), die den Plan und den Code enthält und offline auf Smartphones läuft.
* **Smart Model Routing (Auto-Pilot):**
    * Das System entscheidet automatisch, ob eine Aufgabe "Intelligenz" (Pro 2.5) oder "Geschwindigkeit" (Flash 2.5) benötigt.
    Der Experte kann dies manuell übersteuern.

**3. Systemarchitektur & Sicherheit**

* **Modulare Architektur:** Aufteilung in workflow-*.js Module, api-service.js und ui-*.js Komponenten.
* **API-Service:**
    * **Split Rate Limiting:** Führt getrennte Zähler für Pro- und Flash-Modelle, um die unterschiedlichen Google-Limits (z.B. 2 RPM vs. 15 RPM) optimal zu nutzen.
    * **Auto-Recovery:** Fängt 429-Fehler (Rate Limit) ab und pausiert intelligent (60s Wartezeit), bevor der Request wiederholt wird.

**4. Die vierstufige Präferenz-Logik**

1.  **Reise-Logistik:** Stationär vs. Mobil.
2.  **Charakter (Oberste Direktive):** Strategischer Filter (z.B. "Familienurlaub").
3.  **Tagesplan-Interessen:** Konkrete Inhalte (z.B. "Museum").
4.  **Anhang-Interessen:** Reine Infos (z.B. "Reiseinformationen").

---

**6. Anhang: Die Goldenen Regeln für robustes Prompt-Engineering**

Dieses Protokoll ist die Basis für alle Prompts im System (prompt-*.js).
* **Eine Aufgabe pro Prompt (Task Decomposition):**
    * Jeder Prompt darf nur eine einzige, klar definierte Kernaufgabe enthalten.
    * Zerlege komplexe Ziele in mehrere aufeinanderfolgende Prompts (z.B. erst sammeln, dann anreichern).
* **Klare Persona Zuweisung:**
    * Beginne jeden Prompt mit der Definition einer spezifischen Rolle (z. B. "Du bist ein Experte für nachhaltiges Reisen in Südostasien").
    * Dies lenkt den Stil, den Ton und das Fachwissen der KI.
* **Logische Strukturierung:**
    * Gliedere den Prompt visuell und inhaltlich.
    * Nutze Markdown-Überschriften (###), Listen und abgegrenzte Blöcke, um Kontext, Anweisungen, Beispiele und Formatvorgaben klar voneinander zu trennen.
* **Präziser und relevanter Kontext:**
    * Gib nur die Informationen, die zur Lösung der Aufgabe zwingend notwendig sind.
    * Sei spezifisch und vermeide mehrdeutige oder überflüssige Details (Noise Reduction).
* **Unmissverständliche Anweisungen (Instruction Hardening):**
    * **Sei direkt:** Nutze klare Verben im Imperativ.
    * **Setze Leitplanken:** Formuliere explizite Verbote ("Was du vermeiden sollst") und positive Gebote ("Was du tun sollst").
    * **Erkläre das "Warum":** Begründe kurz die wichtigsten Anweisungen, damit die KI die Absicht dahinter versteht.
* **Gib Beispiele (Few-Shot Prompting):**
    * Zeige mit 1-2 guten Beispielen, wie die gewünschte Ausgabe aussehen soll (Input -> Output Pattern).
* **Geforderte Selbstreflexion (Chain-of-Thought):**
    * Beende den Prompt mit einer klaren Anweisung an die KI, ihre eigene Antwort anhand der wichtigsten Regeln des Prompts zu überprüfen, bevor sie das endgültige Ergebnis liefert.
    * Nutze Felder wie _gedankenschritte im JSON-Output, um diesen Denkprozess sichtbar zu machen und vom eigentlichen Daten-Inhalt zu trennen.


**7. Codebase-Struktur & Architektur-Map (V30.3)**

Das Projekt ist modular aufgebaut, um Wartbarkeit und Erweiterbarkeit zu gewährleisten.
Hier ist die Übersicht aller relevanten Dateien und ihrer Aufgaben:

### A. Core & Konfiguration (Das Rückgrat)
* **index.html**: Der Einstiegspunkt.
Enthält das Grundgerüst der SPA, alle Modals und die Container für die dynamischen Views.
* **main.js**: Der Bootloader.
Initialisiert Event-Listener, lädt den State und startet die App.
* **app-state.js**: Hält den globalen Status der Anwendung (Reisedaten, UI-Status, User-Settings).
Die "Single Source of Truth".
* **app-data.js**: Statische Definitionen (Interessen-Kategorien, Dropdown-Optionen, Hilfetexte).
* **config.js**: Technische Konfiguration (API-Limits für Pro/Flash, Timeouts, Standardwerte).
* **constants.js**: Systemweite Konstanten (View-Namen, Action-IDs) zur Vermeidung von Tippfehlern.
### B. Workflow-Orchestrierung (Das Gehirn)
Diese Module steuern die "Magic Chain" und rufen die KI auf.
* **workflow-orchestrator.js**: Der Haupt-Manager.
Steuert den Ablauf der Phasen, entscheidet über das KI-Modell (Smart Routing) und behandelt Fehler.
* **workflow-foundation.js**: Logik für Phase 0 (Strategie, Validierung der Eingaben).
* **workflow-discovery.js**: Logik für Phase 1 (Routen-Architektur, Sehenswürdigkeiten sammeln & anreichern).
* **workflow-planning.js**: Logik für Phase 2 (Reiseführer-Strukturierung, Tagesplanung, Transfers).
* **workflow-content.js**: Logik für Phase 3 (Texte schreiben, Anhänge generieren).
* **workflow-shared.js**: Gemeinsam genutzte Hilfsfunktionen für alle Workflows (z.B. JSON-Cleaning).
* **workflow-actions.js**: Brücke zwischen UI-Aktionen und Workflow-Logik (z.B. "Button geklickt -> Workflow starten").
### C. Prompt-Engineering (Die KI-Agenten)
Jede Datei repräsentiert einen spezialisierten KI-Agenten.
* **prompt-service.js**: Der Kommunikator.
Sendet die Prompts an die Google Gemini API und empfängt die Antworten.
* **prompt-helpers.js**: Baukasten für Prompts (Standard-Header, JSON-Schemata, Sicherheitsregeln).
* **prompt-chef-planer.js**: Agent: Strategischer Analyst (Phase 0).
* **prompt-routen-architekt.js**: Agent: Routenplaner für Rundreisen.
* **prompt-sammler.js**: Agent: Findet Sehenswürdigkeiten (Namen).
* **prompt-anreicherer.js**: Agent: Recherche von Details (Adressen, Öffnungszeiten).
* **prompt-reisefuehrer.js**: Agent: Gruppiert Orte in Cluster/Touren.
* **prompt-tagesplaner.js**: Agent: Erstellt den zeitlichen Ablaufplan.
* **prompt-transfer-planer.js**: Agent: Berechnet Wegzeiten.
* **prompt-chefredakteur.js**: Agent: Schreibt Sachtexte zu Orten.
* **prompt-info-autor.js**: Agent: Schreibt allgemeine Länder-Infos.
* **prompt-food-collector.js**: Agent: Sammelt Restaurant-Kandidaten.
* **prompt-food-enricher.js**: Agent: Recherchiert Restaurant-Details.
* **prompt-country-scout.js**: Agent: Findet lokale Quellen für unbekannte Länder.
* **prompt-hotel-scout.js**: Agent: Sucht passende Hotels.
* **prompt-ideen-scout.js**: Agent: Entwickelt Schlechtwetter-Alternativen.
* **prompt-zeit-optimierer.js**: Agent: Optimiert bestehende Zeitpläne.

### D. UI & Rendering (Das Gesicht)
* **ui-updates.js**: Allgemeine DOM-Manipulationen (Sichtbarkeiten, Progress-Bars, Toasts).
* **ui-actions.js**: Reagiert auf UI-Events (Modals öffnen, Tabs wechseln).
* **interactive-controller.js**: Steuert die interaktiven Elemente (Suchleiste, Filter) in der Ergebnisansicht.
* **interactive-renderer.js**: Der Haupt-Renderer für den Reiseplan (Kartenansicht vs. Listenansicht).
* **render-sights-view.js**: Spezialansicht: Auswahl der Sehenswürdigkeiten (Kandidaten-Liste).
* **render-routen-auswahl-view.js**: Spezialansicht: Auswahl der Route (bei Rundreisen).
* **render-chef-planer-view.js**: Spezialansicht: Strategie-Freigabe.
* **render-hotel-view.js**: Spezialansicht: Hotelauswahl.
* **render-map-export.js**: Export-Funktion für Google My Maps.
* **interactive-view.css**: Styling für die dynamisch generierten Inhalte.
### E. Actions & Business Logic (Die Muskeln)
* **actions.js**: Zentrale Registratur für alle Buttons und Klick-Events.
* **event-listeners.js**: Bindet die Aktionen an die HTML-Elemente.
* **data-handler.js**: Liest und schreibt Formulardaten in den State.
* **file-actions.js**: Speichern, Laden und Mergen von JSON-Dateien.
* **report-actions.js**: Generierung von PDF, Markdown und Kalender-Exporten.
* **wizard-actions.js**: Steuerung des Eingabe-Assistenten (Wizard Steps).
* **itinerary-manager.js**: Hilfsfunktionen zur Verwaltung der Reiseroute (Tage hinzufügen/löschen).
* **validation.js**: Validiert JSON-Strukturen (Sicherheitsnetz).

### F. Services & Utilities (Die Werkzeuge)
* **api-service.js**: Low-Level API-Handling (Rate Limiting, Fetch-Calls, Verschlüsselung).
* **map-service.js**: Verwaltung der Leaflet-Karte (Marker, Popups).
* **dom-cache.js**: Caching von DOM-Elementen für Performance.
* **utilities.js**: Allgemeine Helfer (Datumsformatierung, String-Cleaning).
* **countries.js**: Lokale Datenbank für Länder-Infos und Quellen.

### G. Tools & Deployment
* **app-builder.js**: Generiert die "Viewer-App" (HTML-Injektion).
* **build_viewer.py**: Python-Script (Legacy/Alternative) zum Bauen des Viewers.`
    },
    en: {
      title: "Project Briefing",
      content: "Development of an AI-powered travel planning assistant (V30.3)... [Content not fully translated]"
    }
  },

  description: {
    de: {
      title: "Programm Information",
      content: `**Willkommen beim Papa-Tours Reiseplan-Generator (V30.3) – Ihr persönlicher Reise-Architekt!**

Haben Sie sich jemals gewünscht, einen Reise-Experten an Ihrer Seite zu haben, der einen perfekten, auf Sie zugeschnittenen Urlaub plant?
Genau das ist die Mission dieses Programms.

Vergessen Sie stundenlange Recherche und die Unsicherheit, ob Sie die richtigen Orte ausgewählt haben.
Dieser Assistent nimmt Ihre Wünsche und verwandelt sie in einen professionellen, logisch optimierten und verlässlichen Reiseplan.
---

**Leistungsmerkmale der Version 30.3:**

* ✨ **Die Magic Chain & Orchestrator:** Ein intelligenter Workflow steuert die KI.
Nach der initialen Strategie-Freigabe erstellt das System Sehenswürdigkeiten, Texte, Restaurant-Tipps und den Reiseführer vollautomatisch – jetzt mit verbessertem "Smart Chunking" für höchste Stabilität auch bei langen Reisen.
* 🛡️ **Sicherheit & Stabilität:** Der integrierte API-Service bietet clientseitige Verschlüsselung Ihrer Schlüssel und schützt durch intelligentes Rate-Limiting (getrennt für Pro 2.5/Flash 2.5 Modelle) vor Fehlern.
* 💡 **Spezialisierte KI-Experten:**
    * **Der Ideen-Scout:** Entwickelt flexible Pläne für "Sondertage" (z.B. Schlechtwetter-Optionen).
Bei kleinen Orten erweitert er automatisch den Suchradius auf die Region.
    * **Der Info-Autor:** Erstellt automatisch recherchierte Kapitel.
Er erkennt intelligent alle Länder Ihrer Route und liefert spezifische Infos (Maut, Regeln) für jedes einzelne Land.
    * **Der Food-Scout (Upgrade):** Nutzt nun einen **3-Stufen-Prozess** (Sammeln -> Filtern -> Veredeln), um Restaurants mit höchster Präzision zu finden und Halluzinationen auszuschließen.
    * **Der Country-Scout:** Ein spezialisierter Agent, der bei unbekannten Reisezielen automatisch die besten lokalen Quellen (Guides, Portale) recherchiert und die interne Datenbank aktualisiert.
* 🗺️ **Integrierte Karte:** Sehen Sie jederzeit, wo Ihre geplanten Aktivitäten liegen.
Mit einem Klick wechseln Sie zwischen Text und Karte.

* 📱 **Viewer-App Generator:** Erstellen Sie mit einem Klick eine eigenständige "Reise-Viewer"-Datei.
Diese HTML-Datei enthält Ihren kompletten Plan und den Programmcode, läuft offline auf jedem Smartphone und benötigt keinen Server mehr.
**Der neue 2-Stufen-Workflow (UI-Logik)**

Um Ihnen maximale Kontrolle zu geben, ist der Prozess in zwei Hauptaktionen unterteilt:

* **1. Guide (Zauberstab):**
    Startet die Recherche und Erstellung der Inhalte.
Erstellt das Fundament, findet Sehenswürdigkeiten und strukturiert diese in Touren.
    **Ergebnis:** Ein fertiger "Reiseführer" zum Stöbern, noch ohne festes Zeitkorsett.
* **2. Tagesplan:**
    Startet die logistische Planung.
    Nimmt den Reiseführer und gießt ihn in einen konkreten Kalender.
**Ergebnis:** Ein detaillierter Ablaufplan mit Uhrzeiten und Transfers.

**Die Power-Tools für maximale Kontrolle**

* 🍽️ **Ad-Hoc Suche:** Sie sind unterwegs und brauchen spontan ein Restaurant?
Nutzen Sie die neue Ad-Hoc Suche, um unabhängig von einem Reiseplan sofortige Empfehlungen für Ihren aktuellen Standort zu erhalten.
* 🔧 **Experten-Modus:** Schalten Sie die Oberfläche um. Der "User-Modus" bietet eine aufgeräumte Bedienung, während der "Experten-Modus" Zugriff auf JSON-Editoren, Debug-Logs und manuelle Parameter (z.B. Anzahl der Vorschläge) gewährt.
* 🔀 **Intelligente Reise-Fusion (Merge):** Planen Sie gemeinsam? Führen Sie jetzt mehrere Reise-Dateien intelligent zusammen.
Das System kombiniert Ihre Pläne und filtert dabei automatisch doppelte Orte heraus.
* ✏️ **Der "Open-Heart" Editor:** Öffnen Sie jeden Eintrag und bearbeiten Sie die Rohdaten (JSON) direkt.
Korrigieren Sie Öffnungszeiten oder fügen Sie eigene Notizen hinzu – ohne KI-Neustart.
**Ihre Vorteile auf einen Blick:**

* ✅ **Die Matrix-Intelligenz:** Kombinieren Sie jede Logistik mit jedem Thema.
Planen Sie einen Wanderurlaub von einem festen Hotel aus (Sternfahrt) oder eine Kulturreise als Roadtrip.
* ✅ **Relevanz statt Füllmaterial:** Der Plan konzentriert sich auf Erlebnisse mit echtem Mehrwert.
* ✅ **Effizienz in Zeit und Weg:** Ihre Routen sind so optimiert, dass Sie unnötige Fahrten vermeiden.
* ✅ **Verlässlichkeit als Fundament:** Jede Information wird durch spezialisierte KI-Agenten geprüft.

---

**Wie funktioniert das?
Unser einzigartiger Redaktions-Prozess**

Stellen Sie sich vor, Ihr Reiseplan wird wie ein hochwertiges Magazin von einem Team aus Spezialisten erstellt – und **Sie sind der Chefredakteur**.
* **Schritt 1: Der Stratege prüft Ihre Idee (Human-in-the-Loop)**
    Zuerst analysiert der **Chef-Planer** Ihre Wünsche.
Er prüft Machbarkeit, korrigiert Tippfehler und schlägt eine optimale Anzahl an Zielen vor (Smart Override).
* **Schritt 2: Die Weichenstellung**
    Bei Rundreisen schlägt Ihnen der **Routen-Architekt** verschiedene Optionen vor. Sie entscheiden manuell.
* **Schritt 3: Die Magie (Der Orchestrator)**
    Ab hier können Sie sich zurücklehnen.
Die "Magic Chain" koordiniert das Team:
    * **Sammler & Anreicherer:** Finden die besten Orte und prüfen alle Fakten.
    * **Reiseführer-Architekt:** Baut logische Touren für jeden Ort.
    * **Die Redaktion:** Ein Team aus KI-Autoren schreibt Texte, sucht Restaurants und plant Alternativen.
* **Schritt 4: Ihr maßgeschneidertes Ergebnis**
    Sie erhalten einen vollständigen Reiseführer oder einen strikten Tagesplan – ganz nach Wahl.
---

**Mächtige Werkzeuge für Ihre fertige Reise**

Sobald Ihr Plan fertig ist, können Sie ihn mit nützlichen Werkzeugen weiter nutzen:

* **Viewer-App:** Exportieren Sie die Reise als App für Ihr Handy.
* **Interaktive Karte:** Nutzen Sie die eingebaute Karte oder exportieren Sie zu Google My Maps.
* **PDF & Druck:** Erstellen Sie eine druckfreundliche Version.
* **Kalender-Export:** Übertragen Sie Termine in Ihren Kalender (.ics).
* **Speichern & Laden:** Sichern Sie Ihren Arbeitsstand jederzeit.

Bereit, Ihre Traumreise zu planen?`
    },
    en: {
      title: "Program Information",
      content: "Welcome to Papa-Tours Travel Plan Generator (V30.3)... [Content not fully translated]"
    }
  },

  catalog: {
    de: {
      title: "Reise-Katalog",
      content: `### Inspirations-Katalog

Hier finden Sie in Kürze eine Auswahl an vordefinierten Reiserouten und beliebten Zielen, die Sie als Basis für Ihre eigene Planung nutzen können.

*Funktion in Entwicklung für V40.1*`
    },
    en: {
      title: "Travel Catalog",
      content: "Coming soon: Curated travel itineraries."
    }
  },

  help: {
    de: {
      title: "Hilfe & API Key",
      content: `### So erhalten Sie Ihren kostenlosen Google Gemini API-Key

Um "Papa-Tours Reiseplaner" nutzen zu können, benötigen Sie einen eigenen API-Schlüssel von Google.
Das klingt technisch, ist aber in wenigen Minuten erledigt und für die private Nutzung komplett kostenlos.

---

**1. Warum brauche ich einen eigenen Schlüssel?**
Dieses Programm läuft zu 100% auf Ihrem Gerät (in Ihrem Browser).
Es gibt keinen "Server" von uns, der Ihre Anfragen weiterleitet.
Damit Sie direkt mit der künstlichen Intelligenz (Google Gemini) kommunizieren können, müssen Sie sich bei Google authentifizieren.
Das hat für Sie zwei Vorteile:
* **Datenschutz:** Ihre Reisepläne bleiben privat zwischen Ihnen und Google. Niemand sonst liest mit.
* **Kostenlos:** Google bietet jedem Nutzer ein großzügiges kostenloses Kontingent, das für private Reiseplanungen mehr als ausreicht.

**2. Schritt-für-Schritt Anleitung**

* **Schritt A:** Gehen Sie auf die offizielle Google AI Studio Seite:
  👉 https://aistudio.google.com/app/apikey

* **Schritt B:** Melden Sie sich mit Ihrem normalen Google-Konto (Gmail) an.
(Falls Sie noch keines haben, können Sie dort eines erstellen).
* **Schritt C:** Klicken Sie auf den blauen Button **"Create API Key"**.
  Es öffnet sich ein Fenster.
Wählen Sie "Create API Key in new project" (oder ein bestehendes Projekt, falls vorhanden).
* **Schritt D:** Kopieren Sie den Schlüssel.
  Google zeigt Ihnen eine lange Zeichenkette (beginnt meist mit "AIza...").
Klicken Sie auf "Copy", um den Schlüssel in die Zwischenablage zu kopieren.

**3. Schlüssel im Programm eingeben**
Kehren Sie zu diesem Programm zurück und fügen Sie den Schlüssel in das Eingabefeld ein.
Klicken Sie auf "Speichern". Fertig!

---

**Häufige Fragen (FAQ)**

* **Kostet das wirklich nichts?**
  Ja.
Der "Free Tier" von Google Gemini ist kostenlos. Er hat gewisse Limits (z.B. eine bestimmte Anzahl von Anfragen pro Minute), die für dieses Programm aber meist ausreichen.
Sollten Sie das Limit erreichen, warten Sie einfach kurz oder wechseln Sie im Menü auf das Modell "Flash" (schneller & höhere Limits).
* **Ist mein Schlüssel sicher?**
  Dieses Programm speichert Ihren Schlüssel nur lokal in Ihrem Browser (verschlüsselt).
Er wird niemals an uns oder andere Server gesendet, sondern nur direkt an Google, wenn Sie eine Anfrage stellen.
* **Kann ich den Schlüssel später löschen?**
  Ja. Sie können den Schlüssel jederzeit in Ihrem Google-Konto (AI Studio) widerrufen oder löschen.`
    },
    en: {
      title: "Help & API Key",
      content: "To use Papa-Tours, you need a free Google Gemini API Key... [Content not fully translated]"
    }
  },

  terms: {
    de: {
      title: "Nutzungsbedingungen",
      content: `### Allgemeine Nutzungsbedingungen für Papa-Tours

**I. Einleitung und Geltungsbereich**

Das Programm „Papa-Tours V51“ stellt eine innovative Softwareanwendung dar, die darauf abzielt, Nutzern bei der Erstellung individueller Reisepläne zu assistieren.
Es verarbeitet hierfür Nutzereingaben mittels künstlicher Intelligenz, insbesondere durch die Integration der Google Gemini Pro API.
Die Funktion des Programms ist es, als unterstützendes Werkzeug und Assistent für die Reiseplanung zu dienen, indem es auf Basis der bereitgestellten Informationen maßgeschneiderte Vorschläge generiert.
Diese Beschreibung des Vertragsgegenstandes bildet die Grundlage für das Verständnis der nachfolgenden Allgemeinen Nutzungsbedingungen (AGB).
Diese Allgemeinen Nutzungsbedingungen (im Folgenden „AGB“) regeln die Nutzung des von Max Ertl, max.ertl@web.de (im Folgenden „Anbieter“) angebotenen Programms „Papa-Tours“ (im Folgenden „Programm“).
Sie definieren die Rechte und Pflichten zwischen dem Nutzer und dem Anbieter für alle Interaktionen, die über das Programm erfolgen.
**II. Nutzung des Programms und des API-Keys**

**2.1. Akzeptanz der Google Gemini Pro API-Bedingungen**
Die Nutzung des Programms setzt die Akzeptanz und Einhaltung der Nutzungsbedingungen (AGBs) der Google Gemini Pro API voraus.
Diese sind unter https://ai.google.dev/gemini-api/terms einsehbar und vom Nutzer eigenverantwortlich zu beachten.
Der Anbieter hat keinen Einfluss auf die AGBs von Google und ist für deren Einhaltung durch den Nutzer nicht verantwortlich.
**2.2. Verantwortung für den API-Key**
Der Nutzer ist für die Beschaffung, Aktivierung und sichere Aufbewahrung seines persönlichen API-Keys für die Google Gemini Pro API selbst verantwortlich.
Jegliche Nutzung des API-Keys, ob durch den Nutzer oder Dritte, liegt in der alleinigen Verantwortung des Nutzers.

**2.3. Zulässige Nutzung und Altersanforderungen**
Der Nutzer verpflichtet sich, das Programm nur im Rahmen der geltenden Gesetze und der Nutzungsbedingungen der Google Gemini Pro API zu verwenden.
Nutzer müssen mindestens 18 Jahre alt sein, um die Google Gemini Pro API über das Programm zu nutzen.
Die Nutzung für medizinische Beratung, klinische Praxis oder in irgendeiner Weise, die von einer Medizinprodukte-Regulierungsbehörde überwacht wird oder deren Genehmigung erfordert, ist ebenfalls untersagt.
Zudem ist die Nutzung der Dienste zur Entwicklung von Modellen, die mit den Google-Diensten konkurrieren, untersagt.

**III. Haftung**

**3.1. Allgemeine Haftungsbegrenzung des Anbieters**
Das Programm wird dem Nutzer „wie besehen“ (as is) zur Verfügung gestellt.
Der Anbieter übernimmt keine Gewährleistung für die ständige Verfügbarkeit, Richtigkeit, Vollständigkeit oder Aktualität der durch das Programm generierten Inhalte oder für die fehlerfreie Funktion des Programms.
Der Anbieter haftet nicht für Schäden jedweder Art, die aus der Nutzung oder Nichtnutzung des Programms entstehen, mit Ausnahme von Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, sowie Schäden, die auf einer vorsätzlichen oder grob fahrlässigen Pflichtverletzung des Anbieters beruhen.
**3.2. Haftung für KI-generierte Inhalte und Nutzerverantwortung**
Der Nutzer ist für die Überprüfung der von dem Programm generierten Inhalte auf Richtigkeit, Vollständigkeit und Angemessenheit selbst verantwortlich.
Eine Haftung für Schäden, die durch das Vertrauen auf solche Inhalte entstehen, ist ausgeschlossen.
Die generierten Inhalte sind experimenteller Natur, können unzutreffend sein und stellen keine professionelle Beratung dar.

**3.3. Haftung für Drittanbieter-API (Google Gemini Pro API)**
Die Haftung des Anbieters ist ausgeschlossen für Probleme oder Schäden, die direkt oder indirekt auf die Funktionsweise, Verfügbarkeit oder Änderungen der Google Gemini Pro API zurückzuführen sind.
**IV. Datenschutz**

**4.1. Datenverarbeitung durch den Anbieter**
Der Anbieter erhebt und verarbeitet die vom Nutzer in den Wizard eingegebenen Informationen (z.B. Reiseziele, Daten, Interessen) ausschließlich zum Zweck der Erstellung des Reiseplans.
Diese Daten werden nicht dauerhaft gespeichert oder für andere Zwecke verwendet.

**4.2. Datenverarbeitung durch Google Gemini Pro API**
Das Programm übermittelt die vom Nutzer eingegebenen Daten (Prompts) an die Google Gemini Pro API.
Google verarbeitet diese Daten gemäß seinen eigenen Datenschutzbestimmungen (Google Privacy Policy und Gemini API Additional Terms of Service).
Nutzer sollten keine vertraulichen oder sensiblen personenbezogenen Informationen in das Programm eingeben.

**4.3. Betroffenenrechte**
Nutzer haben im Hinblick auf ihre personenbezogenen Daten die Rechte gemäß der DSGVO (Auskunft, Berichtigung, Löschung, etc.).
Zur Ausübung dieser Rechte können sich Nutzer an den Anbieter wenden.

**V. Geistiges Eigentum und Nutzungsrechte**

**5.1. Urheberschaft an KI-generierten Inhalten**
Nach deutschem Recht entsteht an rein maschinell erstellten Inhalten kein Urheberrecht.
Inhalte, die ohne wesentliche kreative Eingriffe des Nutzers erzeugt werden, gelten als gemeinfrei.
Greift der Nutzer durch gezielte und kreative Prompts in den Entstehungsprozess ein, kann er als Urheber der so geschaffenen Werke gelten.
**5.2. Nutzungsrechte des Anbieters**
Der Nutzer räumt dem Anbieter ein nicht-exklusives, gebührenfreies Recht ein, die eingegebenen Daten und generierten Inhalte zur Bereitstellung, Wartung und Verbesserung des Programms zu nutzen.
**5.3. Haftung für Urheberrechtsverletzungen durch Nutzer**
Der Nutzer ist allein dafür verantwortlich, dass die von ihm eingegebenen Daten keine Rechte Dritter verletzen und stellt den Anbieter von sämtlichen Ansprüchen Dritter frei.
**VI. Änderungen der Nutzungsbedingungen**

Der Anbieter behält sich vor, diese AGB jederzeit mit Wirkung für die Zukunft zu ändern.

**VII. Vertragslaufzeit und Kündigung**

Der Nutzer kann die Nutzung des Programms jederzeit beenden.
Der Anbieter kann die Bereitstellung des Programms ebenfalls jederzeit einstellen.

**VIII. Schlussbestimmungen**

Es gilt das Recht der Bundesrepublik Deutschland.
Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.`
    },
    en: {
      title: "Terms of Service",
      content: "General Terms of Service for Papa-Tours... [Content not fully translated]"
    }
  },
  
  setup: {
    de: {
      title: "System-Setup",
      content: `### System-Einstellungen
      
Hier können Sie lokale Daten verwalten.

* **Cache leeren:** Löscht temporäre Daten.
* **Reset:** Setzt die App auf Werkseinstellungen zurück (Achtung: API-Key muss neu eingegeben werden).
      
*(Funktionen werden im Einstellungs-Menü implementiert)*`
    },
    en: {
      title: "System Setup",
      content: "Manage local data and settings."
    }
  }
};
/**
 * src/data/texts/description.ts
 * Inhalt: Programm-Beschreibung / Info
 */

export const description = {
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

**Wie funktioniert das?**
**Unser einzigartiger Redaktions-Prozess**

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
    content: "Content available in German."
  }
};
// [2026-11-18] [20:22] - DOCS: Added Live Trip Finance / Smartphone Wallet guides (iPhone Apple Pay & Android Google Wallet/Homescreen shortcuts + Option-A Edit PIN) in DE & EN.
// 26.02.2026 10:45 - DOCS: Converted API Key Help guide to informal "Du" personal pronoun.
/**
 * src/data/texts/help.ts
 * Inhalt: Hilfe & API Key Guide
 */

export const help = {
  de: {
    title: "Hilfe & API Key",
    content: `### So erhältst du deinen kostenlosen Google Gemini API-Key

Um "Papa-Tours Reiseplaner" nutzen zu können, benötigst du einen eigenen API-Schlüssel von Google.
Das klingt technisch, ist aber in wenigen Minuten erledigt und für die private Nutzung komplett kostenlos.

---

**1. Warum brauche ich einen eigenen Schlüssel?**
Dieses Programm läuft zu 100% auf deinem Gerät (in deinem Browser).
Es gibt keinen "Server" von uns, der deine Anfragen weiterleitet.
Damit du direkt mit der künstlichen Intelligenz (Google Gemini) kommunizieren kannst, musst du dich bei Google authentifizieren.
Das hat für dich zwei Vorteile:
* **Datenschutz:** Deine Reisepläne bleiben privat zwischen dir und Google. Niemand sonst liest mit.
* **Kostenlos:** Google bietet jedem Nutzer ein großzügiges kostenloses Kontingent, das für private Reiseplanungen mehr als ausreicht.

**2. Schritt-für-Schritt Anleitung**

* **Schritt A:** Gehe auf die offizielle Google AI Studio Seite:
  👉 https://aistudio.google.com/app/apikey

* **Schritt B:** Melde dich mit deinem normalen Google-Konto (Gmail) an.
(Falls du noch keines hast, kannst du dort eines erstellen).
* **Schritt C:** Klicke auf den blauen Button **"Create API Key"**.
  Es öffnet sich ein Fenster.
Wähle "Create API Key in new project" (oder ein bestehendes Projekt, falls vorhanden).
* **Schritt D:** Kopiere den Schlüssel.
  Google zeigt dir eine lange Zeichenkette (beginnt meist mit "AIza...").
Klicke auf "Copy", um den Schlüssel in die Zwischenablage zu kopieren.

**3. Schlüssel im Programm eingeben**
Kehre zu diesem Programm zurück und füge den Schlüssel in das Eingabefeld ein.
Klicke auf "Speichern". Fertig!

---

**Häufige Fragen (FAQ)**

* **Kostet das wirklich nichts?**
  Ja.
Der "Free Tier" von Google Gemini ist kostenlos. Er hat gewisse Limits (z.B. eine bestimmte Anzahl von Anfragen pro Minute), die für dieses Programm aber meist ausreichen.
Solltest du das Limit erreichen, warte einfach kurz oder wechsle im Menü auf das Modell "Flash" (schneller & höhere Limits).
* **Ist mein Schlüssel sicher?**
  Dieses Programm speichert deinen Schlüssel nur lokal in deinem Browser (verschlüsselt).
Er wird niemals an uns oder andere Server gesendet, sondern nur direkt an Google, wenn du eine Anfrage stellst.
* **Kann ich den Schlüssel später löschen?**
  Ja. Du kannst den Schlüssel jederzeit in deinem Google-Konto (AI Studio) widerrufen oder löschen.

---

### 📱 Live-Reisekasse: Schnellerfassung beim Bezahlen (iPhone & Android)

Mit der **Kurzbefehl-URL** erfasst du Kartenzahlungen unterwegs in Sekunden – direkt in eurer Live-Reisekasse (inkl. automatischem GPS-Standort).

#### 1. Kurzbefehl-URL in Papatours kopieren
1. Öffne deine **Reisekasse** und tippe oben rechts auf das **Zahnrad (⚙) → Live-Kasse & Teilen**.
2. Falls noch kein Live-Raum aktiv ist, starte einen mit **„Live-Kasse starten & Link erstellen“** *(optional kannst du dort gleich eine **Bearbeitungs-PIN** festlegen, falls du auch von weiteren Geräten aus Ausgaben ändern oder löschen möchtest)*.
3. Tippe auf den Button **„Kurzbefehl-URL“** – deine persönliche URL (inkl. \`?quickAdd=1\`) liegt jetzt in der Zwischenablage.

#### 2. Einrichtung auf dem iPhone (Apple Pay Automation)
1. Öffne auf dem iPhone die vorinstallierte App **Kurzbefehle** → Tab **Automation** → **+** *(Persönliche Automation erstellen)*.
2. Wähle als Auslöser **Transaktion** *(deine gewünschte Karte bzw. alle Apple-Pay-Karten → „Sofort ausführen“ aktivieren)*.
3. Füge als Aktion **„Webseite einblenden“** *(empfohlen, öffnet sauber als Overlay ohne neue Safari-Tabs)* – alternativ *„URL öffnen“* – ein und füge dort deine kopierte **Kurzbefehl-URL** ein.
4. *(Optional für Fortgeschrittene)*: Hänge Parameter wie \`&amount=[Betrag]&title=[Händler]\` an die URL an, wenn du Variablen der Transaktion direkt übernehmen willst.
*Hinweis zu iOS:* Apple erlaubt Home-Screen-Web-Apps technisch kein Abfangen externer Links – daher öffnet der Kurzbefehl Safari bzw. das Overlay. Die gespeicherte Ausgabe synchronisiert jedoch **sofort per Firebase live** auch in deine installierte Home-Screen-App. Beim allerersten Aufruf dort einmalig kurz **„Ich bin“** wählen.

#### 3. Einrichtung auf Android (Startbildschirm & Google Wallet)
* **Schnellstart vom Startbildschirm (ohne Zusatz-App):**
  1. Öffne deine kopierte **Kurzbefehl-URL** in **Chrome** und wähle beim ersten Aufruf kurz **„Ich bin“**.
  2. Tippe im Chrome-Menü (\`⋮\`) auf **„Zum Startbildschirm hinzufügen“** – ein Tipp auf dieses Icon öffnet sofort die Eingabemaske **„Ausgabe erfassen“** *(installierte Android-PWAs übernehmen Links meist direkt in die App)*.
* **Automatisch bei Google Wallet (per Automation-App):**
  Android besitzt keine eingebaute Wallet-Automation wie iOS. Mit kostenlosen Apps wie **MacroDroid** oder **Tasker** geht es trotzdem automatisch:
  1. **Auslöser:** *Benachrichtigung erhalten* von **Google Wallet** *(oder deiner Banking-App)*.
  2. **Aktion:** *Website / URL öffnen* mit deiner kopierten **Kurzbefehl-URL** *(optional mit Betrag aus dem Benachrichtigungstext über \`&amount=...\`)*.

#### 4. Bearbeitungs-PIN für mehrere Geräte
* Standardmäßig darf aus Sicherheitsgründen **nur das Ersteller-Gerät** Ausgaben bearbeiten/löschen und den Raum schließen oder löschen.
* Hat der Ersteller eine **Bearbeitungs-PIN** vergeben, können weitere Geräte (z. B. iPhone, iPad, Zweithandy) diese im Teilen-Panel über **„Mit PIN freischalten (Bearbeiten & Löschen)“** einmalig eingeben und danach dauerhaft bearbeiten & löschen. Ohne gesetzte PIN erscheint bei anderen Geräten nichts.`
  },
  en: {
    title: "Help & API Key",
    content: `### How to get your free Google Gemini API Key

To use "Papa-Tours Travel Planner", you need your own API key from Google.
It sounds technical, but it's done in a few minutes and is completely free for private use.

---

**1. Why do I need my own key?**
This program runs 100% on your device (in your browser).
There is no "server" from us that forwards your requests.
To communicate directly with the artificial intelligence (Google Gemini), you must authenticate yourself with Google.
This has two advantages for you:
* **Privacy:** Your travel plans remain private between you and Google. No one else reads them.
* **Free:** Google offers every user a generous free quota that is more than sufficient for private travel planning.

**2. Step-by-Step Instructions**

* **Step A:** Go to the official Google AI Studio page:
  👉 https://aistudio.google.com/app/apikey

* **Step B:** Log in with your normal Google account (Gmail).
(If you don't have one yet, you can create one there).
* **Step C:** Click on the blue button **"Create API Key"**.
  A window opens.
Choose "Create API Key in new project" (or an existing project if available).
* **Step D:** Copy the key.
  Google shows you a long string (usually starting with "AIza...").
Click "Copy" to copy the key to the clipboard.

**3. Enter key in the program**
Return to this program and paste the key into the input field.
Click "Save". Done!

---

**Frequently Asked Questions (FAQ)**

* **Is this really free?**
  Yes.
The "Free Tier" of Google Gemini is free. It has certain limits (e.g. a certain number of requests per minute), which are usually sufficient for this program.
If you reach the limit, just wait a moment or switch to the "Flash" model in the menu (faster & higher limits).
* **Is my key safe?**
  This program saves your key only locally in your browser (encrypted).
It is never sent to us or other servers, only directly to Google when you make a request.
* **Can I delete the key later?**
  Yes. You can revoke or delete the key at any time in your Google account (AI Studio).

---

### 📱 Live Trip Finance: Quick Expense Entry When Paying (iPhone & Android)

Using the **Shortcut URL**, you can log card payments on the go in seconds directly into your shared Live Trip Finance room (including automatic GPS tagging).

#### 1. Copy the Shortcut URL in Papatours
1. Open **Trip Finance** and tap the **Gear icon (⚙) → Live Wallet & Share**.
2. If no live room is active yet, start one via **"Start Live Wallet & Create Link"** *(optionally set an **Edit PIN** if you also want to edit or delete expenses from other devices)*.
3. Tap **"Shortcut URL"** – your personal quick-add URL (including \`?quickAdd=1\`) is copied to your clipboard.

#### 2. Setup on iPhone (Apple Pay Automation)
1. Open Apple's built-in **Shortcuts** app → **Automation** tab → **+** *(New Personal Automation)*.
2. Select **Transaction** *(choose your Apple Pay cards and enable "Run Immediately")*.
3. Add the action **"Show Web Page"** *(recommended – opens as a clean overlay without piling up Safari tabs; alternatively use "Open URL")* and paste your **Shortcut URL**.
4. *(Optional)*: Append parameters like \`&amount=[Amount]&title=[Merchant]\` using shortcut transaction variables.
*iOS Note:* Due to Apple platform rules, Home Screen PWAs cannot intercept external web links, so iOS opens the overlay/Safari. Everything you save still syncs **live via Firebase** straight into your installed Home Screen app (just pick your **"I am"** name once on first use).

#### 3. Setup on Android (Home Screen & Google Wallet)
* **1-Tap Home Screen Shortcut (no extra app needed):**
  1. Open the copied **Shortcut URL** in **Chrome** and pick your **"I am"** identity once.
  2. Tap Chrome's menu (\`⋮\`) → **"Add to Home screen"** – tapping that icon opens **"Add Expense"** directly *(and on Android, installed PWAs usually open matching links inside the app)*.
* **Automatic trigger on Google Wallet (via automation app):**
  Android does not include a native Wallet trigger out of the box, but apps like **MacroDroid** or **Tasker** make it automatic:
  1. **Trigger:** *Notification Received* from **Google Wallet** *(or your banking app)*.
  2. **Action:** *Open Website / URL* with your copied **Shortcut URL** *(optionally appending \`&amount=...\`)*.

#### 4. Edit PIN for Multiple Devices
* By default, **only the creator device** can edit/delete expenses, close or delete the room, or manage the PIN.
* If the creator sets an **Edit PIN**, other devices can unlock permanently via **"Unlock with PIN (Edit & Delete)"** inside the Share panel. Without a PIN set, no PIN UI is shown on other devices.`
  }
};
// --- END OF FILE 170 Zeilen ---
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
  Ja. Du kannst den Schlüssel jederzeit in deinem Google-Konto (AI Studio) widerrufen oder löschen.`
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
  Yes. You can revoke or delete the key at any time in your Google account (AI Studio).`
  }
};
// --- END OF FILE 86 Zeilen ---
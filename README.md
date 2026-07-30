# Wahl des Kapitäns – anonyme Abstimmung

Eine kleine Abstimmungsseite ohne Framework, ohne Build-Schritt und ohne
Installation. Kandidaten: David, Tim, Patrick, Alex, Perparim, Lukas F, Moritz.

- Zugangscode zum Öffnen: **TSV1952** (änderbar in `config.js`)
- Anonym: gespeichert wird nur der gewählte Name und ein Zufalls-Token,
  keine Namen, E-Mails oder IP-Adressen
- Doppelvoting-Schutz über einen eindeutigen Token pro Browser
- Ergebnisse als Balkendiagramm, Aktualisierung alle 10 Sekunden

## Dateien

| Datei        | Zweck                                              |
| ------------ | -------------------------------------------------- |
| `index.html` | Die Seite                                          |
| `style.css`  | Design                                             |
| `app.js`     | Logik, Speicher-Adapter (lokal / Supabase)         |
| `config.js`  | **Die einzige Datei, die du anpassen musst**       |
| `schema.sql` | Datenbank-Schema für PostgreSQL / Supabase         |

## Schritt 1: lokal testen

`index.html` doppelklicken. `MODE` steht auf `"local"`, die Stimmen landen nur
im eigenen Browser. Zum Zurücksetzen die Entwicklertools öffnen (F12) und in der
Konsole eingeben:

```js
localStorage.clear(); location.reload();
```

## Schritt 2: Datenbank in Supabase anlegen

1. Auf [supabase.com](https://supabase.com) einloggen → **New project**
   - Name: z. B. `kapitaenswahl`
   - Region: **Frankfurt (eu-central-1)**, damit die Daten in der EU bleiben
   - Datenbank-Passwort notieren (brauchst du nur für direkten SQL-Zugriff)
2. Links **SQL Editor** → **New query** → kompletten Inhalt von `schema.sql`
   einfügen → **Run**. Es müssen Tabelle `votes` und View `results` entstehen.
3. Links unten **Project Settings → API**, dort zwei Werte kopieren:
   - **Project URL** (z. B. `https://abcdefgh.supabase.co`)
   - **anon public** Key (langer Text, beginnt mit `eyJ…`)

Der `anon`-Key ist dafür gedacht, öffentlich im Browser zu stehen. Was mit ihm
erlaubt ist, legt allein die Row Level Security aus `schema.sql` fest: Stimme
einfügen ja, Stimmen lesen oder löschen nein. Der `service_role`-Key darf
niemals in diese Dateien.

## Schritt 3: `config.js` ausfüllen

```js
MODE: "supabase",
SUPABASE_URL: "https://abcdefgh.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
```

Nochmal `index.html` öffnen und eine Teststimme abgeben. Im Supabase-Dashboard
unter **Table Editor → votes** muss eine Zeile auftauchen. Danach diese
Teststimmen löschen:

```sql
truncate public.votes;
```

## Schritt 4: öffentlich stellen mit GitHub Pages

1. Auf GitHub ein neues Repository anlegen, z. B. `kapitaenswahl`, **Public**
2. **Add file → Upload files**: `index.html`, `style.css`, `app.js`,
   `config.js` hochladen und committen (`schema.sql` und `README.md` optional)
3. Im Repository **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main`, Ordner `/ (root)` → **Save**
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://<dein-benutzername>.github.io/kapitaenswahl/`

Diesen Link plus den Code `TSV1952` an die Mitstimmenden schicken. Die Seite
funktioniert auf dem Handy genauso wie am Rechner.

## Ergebnisse ansehen und Wahl beenden

Der Stand ist direkt auf der Seite sichtbar (nach der eigenen Stimmabgabe).
Vollständig inklusive Kandidaten ohne Stimme im Supabase SQL Editor:

```sql
select c.candidate, coalesce(r.stimmen, 0) as stimmen
from (values ('David'),('Tim'),('Patrick'),('Alex'),
             ('Perparim'),('Lukas F'),('Moritz')) as c(candidate)
left join public.results r on r.candidate = c.candidate
order by stimmen desc, c.candidate;
```

Abstimmung schließen:

```sql
drop policy "stimme abgeben" on public.votes;
```

## Grenzen, die du kennen solltest

- **Der Zugangscode ist eine Hürde, kein Schutz.** Er steht in `config.js`, also
  im Quelltext der Seite, und ist für technisch versierte Leute lesbar. Gegen
  „falscher Link geteilt" hilft er, gegen gezielte Manipulation nicht.
- **Der Doppelvoting-Schutz hängt am Browser.** Wer den privaten Modus nutzt
  oder ein zweites Gerät nimmt, kann erneut abstimmen. Für eine
  manipulationssichere Wahl bräuchte es Logins – und damit wäre die
  Anonymität weg. Genau dieser Kompromiss ist hier bewusst gewählt.
- **Anonymität ist echt.** Selbst du als Projekt-Eigentümer siehst in der
  Datenbank nur `candidate`, einen Zufalls-Token und einen Zeitstempel.

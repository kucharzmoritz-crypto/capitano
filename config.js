/*
 * Konfiguration der Kapitaenswahl.
 * Diese Datei ist die einzige, die du anpassen musst.
 */
window.WAHL_CONFIG = {
  /*
   * "local"    = Stimmen werden nur im eigenen Browser gespeichert (zum Testen).
   * "supabase" = Stimmen werden in der PostgreSQL-Datenbank gespeichert (echte Wahl).
   */
  MODE: "local",

  // Aus dem Supabase-Dashboard: Project Settings -> API
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  // Titel und Untertitel der Seite
  TITLE: "Wahl des Kapitäns",
  SUBTITLE: "Drei Stimmen pro Person. Die Abstimmung ist anonym.",

  // Wie viele Kandidaten darf jede Person waehlen?
  // Achtung: dieselbe Zahl muss auch in schema.sql stehen (max_votes).
  VOTES_PER_PERSON: 3,

  // Wer zur Wahl steht
  CANDIDATES: [
    "David",
    "Tim",
    "Patrick",
    "Alex",
    "Perparim",
    "Lukas F",
    "Moritz",
  ],

  // Zugangscode zum Öffnen der Umfrage. Leer lassen = kein Code nötig.
  ACCESS_CODE: "TSV1952",

  // true  = Ergebnisse sind sofort fuer alle sichtbar
  // false = Ergebnisse erst nach der eigenen Stimmabgabe
  SHOW_RESULTS_BEFORE_VOTE: false,

  // Ergebnisse automatisch aktualisieren (Sekunden, 0 = aus)
  REFRESH_SECONDS: 10,

  // Sperrzeitpunkt: Samstag 02.08.2024, 19:00 Uhr (Berlin-Zeit)
  // Nach dieser Zeit können keine neuen Stimmen mehr abgegeben werden.
  DEADLINE: "2024-08-02T19:00:00+02:00",
};

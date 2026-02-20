

## Disclaimer-Footer und noindex-Absicherung

Da es sich um ein internes Tool handelt (kein oeffentliches Angebot, kein Verkauf, keine Nutzerregistrierung, keine Datenverarbeitung), braucht ihr kein vollstaendiges Impressum nach TMG/DDG und keine Datenschutzerklaerung nach DSGVO im klassischen Sinne. Trotzdem ist ein Minimum-Disclaimer sinnvoll fuer die rechtliche Absicherung.

### Was geaendert wird

**1. `index.html` -- noindex Meta-Tags und Aufraumen**

- `<meta name="robots" content="noindex, nofollow">` hinzufuegen -- verhindert Indexierung durch alle Suchmaschinen
- `lang="en"` zu `lang="de"` aendern (deutsche Seite)
- Open-Graph- und Twitter-Card-Tags entfernen (internes Tool, soll nicht geteilt/gepreviewt werden)
- `<meta name="author">` auf den Verein aendern

**2. `public/robots.txt` -- Crawling komplett blockieren**

Aktuell steht dort `Allow: /` fuer alle Bots. Das wird ersetzt durch:

```
User-agent: *
Disallow: /
```

Zusammen mit dem noindex-Meta-Tag ist das doppelte Absicherung.

**3. `src/pages/Index.tsx` -- Disclaimer-Footer**

Am Ende der Seite wird ein dezenter Footer-Bereich ergaenzt mit:

- Hinweis: "Internes Tool -- Bestandteil des Gruppe M Oekosystems"
- Keine Datenverarbeitung, keine Cookies, keine Indexierung
- Impressum-Angaben (Vereinsname, Adresse, E-Mail)

Der Footer wird visuell zurueckhaltend gestaltet (kleine Schrift, gedaempfte Farbe, Trennlinie), damit er nicht vom eigentlichen Tool ablenkt.

### Was ihr NICHT braucht (und warum)

- **Datenschutzerklaerung**: Keine personenbezogenen Daten werden verarbeitet. Alles laeuft lokal im Browser. Kein Tracking, keine Cookies, kein Server-Upload.
- **Cookie-Banner**: Keine Cookies vorhanden.
- **AGB**: Kein Verkauf, kein Angebot an Dritte.
- **Vollstaendiges Impressum nach DDG**: Das DDG (frueher TMG) gilt fuer "geschaeftsmaessige Telemedien". Ein rein internes, nicht-oeffentliches Tool faellt nicht darunter. Trotzdem schadet eine Mindest-Angabe (Betreiber, Adresse, Kontakt) nicht.

### Technische Details

Aenderungen in 3 Dateien:

- `index.html`: 4 Zeilen aendern/hinzufuegen (Meta-Tags)
- `public/robots.txt`: Komplett ersetzen (2 Zeilen)
- `src/pages/Index.tsx`: Footer-Abschnitt am Ende der Seite ergaenzen (ca. 20 Zeilen)


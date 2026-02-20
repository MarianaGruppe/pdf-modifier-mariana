
## Bild zu PDF -- neue Funktion

Bilder (JPG, PNG) koennen mit der bereits installierten `pdf-lib` Bibliothek komplett lokal im Browser in PDFs umgewandelt werden. Kein Server, kein Upload -- alles client-seitig.

### Funktionsumfang

- Mehrere Bilder gleichzeitig hochladen (Drag & Drop oder Dateiauswahl)
- Jedes Bild wird auf eine eigene PDF-Seite gesetzt
- Seitengroesse passt sich automatisch an die Bildgroesse an (kein Zuschneiden, kein Verzerren)
- Reihenfolge per Drag or einfacher Nummerierung anzeigen
- Download als einzelne PDF-Datei
- Unterstuetzte Formate: JPG/JPEG und PNG

### Aenderungen

**1. Neue Komponente `src/components/ImageToPDF.tsx`**

- Datei-Upload fuer mehrere Bilder (accept: image/jpeg, image/png)
- Vorschau der hochgeladenen Bilder als Thumbnail-Grid
- Bilder entfernen / Reihenfolge aendern
- "PDF erstellen"-Button
- Konvertierungslogik mit pdf-lib:
  - `PDFDocument.create()`
  - Fuer jedes Bild: `embedJpg()` oder `embedPng()` je nach Typ
  - Seitengroesse = Bildgroesse (damit nichts verzerrt wird)
  - `addPage([width, height])` und `drawImage()`
  - `save()` und als Blob downloaden

**2. `src/pages/Index.tsx` anpassen**

- Neuen Tab "Bild zu PDF" hinzufuegen (neben "Teilen" und "Zusammenfuegen")
- Untertitel aktualisieren: "Dokumente teilen, zusammenfuegen und aus Bildern erstellen"
- Import der neuen Komponente

### Technische Details

- Keine neuen Abhaengigkeiten noetig -- `pdf-lib` kann JPG und PNG nativ einbetten
- Bilder werden per `FileReader.readAsArrayBuffer()` gelesen
- Vorschau ueber `URL.createObjectURL()`
- Alles bleibt 100% client-seitig (konsistent mit dem bestehenden Datenschutz-Konzept)

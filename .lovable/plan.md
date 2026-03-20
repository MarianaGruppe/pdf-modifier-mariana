

## PDF Komprimierung -- Dateigröße verringern

### Machbarkeit

Ja, das ist machbar -- komplett client-seitig im Browser. Der Hauptgrund für große PDFs sind eingebettete Bilder (Scans). Die Strategie: Bilder im PDF finden, per Canvas API verkleinern/komprimieren, und zurückschreiben. Das ist ein bewährter Ansatz mit `pdf-lib`.

### Funktionsumfang

- Neuer Tab "Größe verringern" in der Navigation
- PDF hochladen, Originalgröße anzeigen
- Qualitätsstufe wählbar (z.B. Slider oder drei Stufen: Hoch / Mittel / Niedrig)
- Komprimierung starten, Fortschrittsanzeige
- Ergebnisgröße anzeigen (vorher → nachher) mit prozentualem Unterschied
- Komprimierte PDF herunterladen

### Technischer Ansatz

Die Komprimierung funktioniert so:

1. PDF mit `pdf-lib` laden (`PDFDocument.load`)
2. Alle eingebetteten Bilder finden via `pdfDoc.context.enumerateIndirectObjects()` -- Objekte vom Subtype `Image` identifizieren
3. Für jedes Bild:
   - Raw-Bytes extrahieren
   - In ein `HTMLCanvasElement` rendern
   - Canvas auf gewünschte Größe skalieren (z.B. max 1500px Breite bei "Mittel")
   - Als JPEG mit reduzierter Qualität exportieren (`canvas.toBlob` / `toDataURL` mit quality-Parameter)
   - Komprimiertes Bild zurück in den PDF-Stream schreiben (Bytes + Dictionary-Einträge für Width/Height/Filter aktualisieren)
4. PDF speichern und Download anbieten

### Aenderungen

**1. Neue Komponente `src/components/PDFCompressor.tsx`**

- Upload-Bereich (gleicher Stil wie andere Tabs)
- Qualitäts-Slider (nutzt vorhandene Slider-Komponente)
- Komprimierungslogik mit pdf-lib + Canvas API
- Fortschrittsanzeige (vorhandene Progress-Komponente)
- Ergebnis-Anzeige: Originalgröße, neue Größe, Einsparung in Prozent
- Download-Button

**2. `src/pages/Index.tsx` anpassen**

- Neuen Tab "Größe verringern" hinzufügen
- Import der neuen Komponente
- Untertitel erweitern

### Einschränkungen

- Funktioniert am besten bei bildlastigen PDFs (Scans) -- bei reinen Text-PDFs ist die Einsparung minimal
- Sehr große PDFs (100+ MB) können den Browser-Speicher belasten
- Die Bildqualität wird reduziert -- daher der Qualitäts-Slider zur Kontrolle

### Keine neuen Abhängigkeiten

Alles mit vorhandenen Tools: `pdf-lib` (PDF-Struktur), Canvas API (Bildkomprimierung), vorhandene UI-Komponenten (Slider, Progress).


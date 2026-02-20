

## Drag & Drop und Copy & Paste fuer Bilder

Die Upload-Box wird um zwei Eingabemethoden erweitert, damit Bilder nicht nur ueber den Datei-Dialog, sondern auch direkt per Drag & Drop aus dem Dateimanager und per Strg+V aus der Zwischenablage hinzugefuegt werden koennen.

### Was sich aendert

**Datei: `src/components/ImageToPDF.tsx`**

**1. Gemeinsame Hilfsfunktion `addFiles`**

Eine zentrale Funktion, die aus einer `File[]`-Liste die gueltigen Bilder (JPG/PNG) filtert, Vorschau-URLs erzeugt und zum State hinzufuegt. Wird von allen drei Eingabewegen genutzt (Datei-Dialog, Drag & Drop, Paste).

**2. Drag & Drop aus dem Dateisystem**

Die Upload-Box (der gestrichelte Button-Bereich) bekommt `onDragOver`, `onDragEnter`, `onDragLeave` und `onDrop` Event-Handler:

- `onDragOver` / `onDragEnter`: `e.preventDefault()` und visueller Hinweis (z.B. Rahmenfarbe aendern, Text aendern zu "Bilder hier ablegen")
- `onDragLeave`: Visuellen Hinweis zuruecksetzen
- `onDrop`: Dateien aus `e.dataTransfer.files` lesen und ueber `addFiles` hinzufuegen

Ein neuer State `isDraggingOver` steuert die visuelle Hervorhebung.

**3. Einfuegen aus der Zwischenablage (Strg+V)**

Ein `onPaste`-Event-Listener auf der gesamten Komponente (oder dem Upload-Bereich):

- Liest `e.clipboardData.items` aus
- Filtert nach `type.startsWith("image/")` (deckt Screenshots und kopierte Bilder ab)
- Wandelt Items per `getAsFile()` in File-Objekte um
- Fuegt sie ueber `addFiles` hinzu
- Funktioniert automatisch mit Screenshots (Windows Snipping Tool, macOS Screenshot, etc.)

Da die Zwischenablage keine Dateinamen hat, bekommen eingefuegte Bilder einen automatischen Namen wie "Eingefuegt-1.png".

**4. Angepasster Upload-Text**

Der Text in der Upload-Box wird erweitert zu:
"Bilder hierher ziehen, einfuegen (Strg+V) oder klicken zum Auswaehlen"

### Keine neuen Abhaengigkeiten

Alles funktioniert mit nativen Browser-APIs (`DragEvent`, `ClipboardEvent`). Kein zusaetzliches Paket noetig.

### Technische Details

- `onDrop` verwendet `e.dataTransfer.files` -- funktioniert mit Dateien aus dem Explorer/Finder
- `onPaste` verwendet `e.clipboardData.items` mit `getAsFile()` -- funktioniert mit Screenshots und kopierten Bildern
- Die Komponente bekommt `tabIndex={0}` damit sie fokussierbar ist und Paste-Events empfangen kann
- `useEffect` mit globalem `paste`-Listener auf `document`, damit Strg+V auch ohne expliziten Fokus auf der Box funktioniert (wird beim Tab-Wechsel weg von "Bild zu PDF" aufgeraeumt)

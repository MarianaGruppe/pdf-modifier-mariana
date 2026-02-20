

## Fix: "Buffer is already detached" -- Echte Ursache gefunden

### Ursache
`PDFSplitView` bekommt `pdfArrayBuffer` direkt und gibt ihn an `pdfjsLib.getDocument({ data: pdfArrayBuffer })` weiter. pdfjs-dist **transferiert** den ArrayBuffer intern an einen Web Worker, wodurch er im Hauptthread **detached** wird. Danach kann kein `copyArrayBuffer()` mehr darauf zugreifen.

### Loesung: Uint8Array statt ArrayBuffer verwenden

`Uint8Array` wird von pdfjs-dist **kopiert** statt transferiert. Sowohl `pdf-lib` als auch `pdfjs-dist` akzeptieren `Uint8Array`.

### Aenderungen

**1. `src/components/PDFSplitter.tsx`**

- State-Typ aendern: `pdfArrayBuffer` wird zu `pdfData` vom Typ `Uint8Array | null`
- `handleFileSelect`: Statt `ArrayBuffer` eine `Uint8Array` speichern
- `downloadSegment` und `downloadAllAsZip`: `PDFDocument.load()` direkt mit der `Uint8Array` aufrufen (pdf-lib kopiert intern, kein manuelles Klonen noetig)
- `copyArrayBuffer` Hilfsfunktion entfernen (nicht mehr noetig)
- Props an `PDFSplitView` anpassen: `pdfData` statt `pdfArrayBuffer` uebergeben

**2. `src/components/PDFSplitView.tsx`**

- Props-Interface aendern: `pdfArrayBuffer: ArrayBuffer` wird zu `pdfData: Uint8Array`
- `pdfjsLib.getDocument({ data: pdfData })` -- pdfjs-dist kopiert Uint8Array automatisch, kein Transfer

### Warum das funktioniert

- `ArrayBuffer` kann von Web Workern **transferiert** werden (Ownership wechselt, Original wird unbrauchbar)
- `Uint8Array` wird stattdessen **kopiert** -- das Original bleibt intakt
- Beide Libraries (pdf-lib und pdfjs-dist) unterstuetzen `Uint8Array` als Input
- Kein manuelles Klonen mehr noetig

### Technische Details

```text
Vorher:
  File -> ArrayBuffer (State) -> pdfjsLib transferiert -> DETACHED!
                               -> pdf-lib load -> FEHLER

Nachher:
  File -> Uint8Array (State) -> pdfjsLib kopiert -> OK, Original bleibt
                              -> pdf-lib load -> OK
```


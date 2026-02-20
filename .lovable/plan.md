

## Robuster Fix: File-Objekt statt gecachten Buffer fuer Downloads

### Problem
Auch mit `.slice()` in PDFSplitView kann der zugrunde liegende ArrayBuffer durch pdfjs-dist v5 detached werden. Die `Uint8Array` im State (`pdfData`) wird dann fuer pdf-lib unbrauchbar.

### Loesung
Statt den gecachten `pdfData`-Buffer fuer Downloads zu verwenden, wird bei jedem Download frisch aus dem `File`-Objekt gelesen -- genau wie der funktionierende PDFMerger es bereits macht. `file.arrayBuffer()` liefert jedes Mal einen neuen, unabhaengigen Buffer.

`pdfData` bleibt weiterhin im State fuer die Thumbnail-Generierung in PDFSplitView (dort wird `.slice()` verwendet).

### Aenderungen

**`src/components/PDFSplitter.tsx`**

1. `downloadSegment` (Zeile 116): Statt `PDFDocument.load(pdfData)` wird `PDFDocument.load(await pdfFile.arrayBuffer())` verwendet
2. `downloadAllAsZip` (Zeile 154): Gleiche Aenderung -- frischer Buffer aus dem File-Objekt

### Warum das funktioniert

- `File.arrayBuffer()` erstellt bei jedem Aufruf einen komplett neuen, unabhaengigen ArrayBuffer
- Kein Zusammenhang mit dem pdfjs-Worker-Transfer
- Genau dieses Muster wird bereits erfolgreich im PDFMerger verwendet
- Der `pdfData`-State wird nur noch fuer Thumbnails gebraucht (dort mit `.slice()` geschuetzt)

### Betroffene Zeilen
- Zeile 116: `PDFDocument.load(pdfData)` wird zu `PDFDocument.load(await pdfFile!.arrayBuffer())`
- Zeile 154: `PDFDocument.load(pdfData)` wird zu `PDFDocument.load(await pdfFile!.arrayBuffer())`

import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { PDFUpload } from "./PDFUpload";
import { PDFSplitView } from "./PDFSplitView";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";

export const PDFSplitter = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [splitPositions, setSplitPositions] = useState<number[]>([]);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());

  const handleFileSelect = useCallback(async (file: File) => {
    setPdfFile(file);
    const arrayBuffer = await file.arrayBuffer();
    setPdfArrayBuffer(arrayBuffer);
    
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    setPageCount(pdfDoc.getPageCount());
    setSplitPositions([]);
    setDeletedPages(new Set());
  }, []);

  const addSplitLine = useCallback((afterPageIndex: number) => {
    setSplitPositions((prev) => [...prev, afterPageIndex].sort((a, b) => a - b));
  }, []);

  const removeSplitLine = useCallback((position: number) => {
    setSplitPositions((prev) => prev.filter((p) => p !== position));
  }, []);

  const deletePage = useCallback((pageIndex: number) => {
    setDeletedPages((prev) => new Set(prev).add(pageIndex));
  }, []);

  const undeletePage = useCallback((pageIndex: number) => {
    setDeletedPages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pageIndex);
      return newSet;
    });
  }, []);

  const clearAllSplits = useCallback(() => {
    setSplitPositions([]);
  }, []);

  const restoreAllDeleted = useCallback(() => {
    setDeletedPages(new Set());
  }, []);

  // Berechne Segmente basierend auf Split-Positionen und gelöschten Seiten
  const getSegments = useCallback((): number[][] => {
    console.log('[GET-SEGMENTS] Called with:', {
      pageCount,
      splitPositions,
      deletedPages: Array.from(deletedPages)
    });

    const activePages = Array.from({ length: pageCount }, (_, i) => i).filter(
      (i) => !deletedPages.has(i)
    );
    console.log('[GET-SEGMENTS] Active pages:', activePages);

    if (activePages.length === 0) {
      console.log('[GET-SEGMENTS] No active pages, returning empty array');
      return [];
    }

    if (splitPositions.length === 0) {
      console.log('[GET-SEGMENTS] No split positions, returning all active pages');
      return [activePages];
    }

    const segments: number[][] = [];
    let currentSegment: number[] = [];

    activePages.forEach((pageIndex) => {
      currentSegment.push(pageIndex);
      // Wenn diese Seite eine Split-Position ist, segment beenden
      if (splitPositions.includes(pageIndex)) {
        console.log(`[GET-SEGMENTS] Split at page ${pageIndex}, segment:`, currentSegment);
        segments.push(currentSegment);
        currentSegment = [];
      }
    });

    // Letztes Segment hinzufügen falls nicht leer
    if (currentSegment.length > 0) {
      console.log('[GET-SEGMENTS] Final segment:', currentSegment);
      segments.push(currentSegment);
    }

    console.log('[GET-SEGMENTS] Returning segments:', segments);
    return segments;
  }, [pageCount, splitPositions, deletedPages]);

  const handleDownload = useCallback(async () => {
    if (!pdfArrayBuffer) return;

    try {
      const segments = getSegments();

      if (segments.length === 0) {
        toast.error("Keine Seiten zum Download vorhanden");
        return;
      }

      const originalFileName = pdfFile?.name.replace(".pdf", "") || "dokument";

      // Für einzelne PDF: Direkter Download (kein ZIP)
      if (segments.length === 1) {
        const segment = segments[0];
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, segment);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        
        const blob = new Blob([pdfBytes as BufferSource], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${originalFileName}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success("PDF erfolgreich erstellt");
        return;
      }

      // Für mehrere PDFs: ZIP-Archiv erstellen
      toast.info(`ZIP-Archiv mit ${segments.length} PDFs wird erstellt...`);
      
      const zip = new JSZip();

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, segment);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        
        zip.file(`${originalFileName}_teil-${i + 1}.pdf`, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${originalFileName}_geteilt.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`ZIP mit ${segments.length} PDFs erfolgreich heruntergeladen`);
    } catch (error) {
      console.error('[SPLIT-DOWNLOAD ERROR]', error);
      toast.error("Fehler beim Erstellen der PDFs");
    }
  }, [pdfArrayBuffer, pdfFile, getSegments]);

  const segments = getSegments();
  const activePages = pageCount - deletedPages.size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-3">PDF teilen</h2>
        <PDFUpload onFileSelect={handleFileSelect} label="Quelldokument" />
      </div>

      {pdfFile && pdfArrayBuffer && (
        <>
          {/* Statistiken */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="text-muted-foreground">
              {pageCount} Seiten · {segments.length} Segment{segments.length !== 1 ? "e" : ""}
              {deletedPages.size > 0 && ` · ${deletedPages.size} gelöscht`}
            </span>
            {splitPositions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSplits}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Alle Schnitte entfernen
              </Button>
            )}
            {deletedPages.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={restoreAllDeleted}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Gelöschte wiederherstellen
              </Button>
            )}
          </div>

          {/* PDF Split View */}
          <PDFSplitView
            pdfArrayBuffer={pdfArrayBuffer}
            pageCount={pageCount}
            splitPositions={splitPositions}
            deletedPages={deletedPages}
            onAddSplit={addSplitLine}
            onRemoveSplit={removeSplitLine}
            onDeletePage={deletePage}
            onUndeletePage={undeletePage}
          />

          {/* Info & Download */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-3 rounded">
              💡 Klicke zwischen Seiten, um Schnittlinien zu setzen. Jedes Segment wird als separate
              PDF heruntergeladen.
            </div>

            <Button
              onClick={handleDownload}
              disabled={activePages === 0}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {segments.length > 1
                ? `${segments.length} PDFs herunterladen`
                : "PDF herunterladen"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

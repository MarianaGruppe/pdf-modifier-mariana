import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
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
      console.log('[SPLIT-DOWNLOAD] Starting download process');
      const segments = getSegments();
      console.log('[SPLIT-DOWNLOAD] Calculated segments:', segments);
      console.log('[SPLIT-DOWNLOAD] Segments count:', segments.length);

      if (segments.length === 0) {
        toast.error("Keine Seiten zum Download vorhanden");
        return;
      }

      const originalFileName = pdfFile?.name.replace(".pdf", "") || "dokument";
      console.log('[SPLIT-DOWNLOAD] Original filename:', originalFileName);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`[SPLIT-DOWNLOAD] Processing segment ${i + 1}:`, segment);
        
        console.log('[SPLIT-DOWNLOAD] Loading original PDF...');
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
        console.log('[SPLIT-DOWNLOAD] PDF loaded, total pages:', pdfDoc.getPageCount());
        
        console.log('[SPLIT-DOWNLOAD] Creating new PDF...');
        const newPdf = await PDFDocument.create();
        
        console.log('[SPLIT-DOWNLOAD] Copying pages:', segment);
        const copiedPages = await newPdf.copyPages(pdfDoc, segment);
        console.log('[SPLIT-DOWNLOAD] Pages copied:', copiedPages.length);
        
        copiedPages.forEach((page) => newPdf.addPage(page));
        console.log('[SPLIT-DOWNLOAD] Pages added to new PDF');

        console.log('[SPLIT-DOWNLOAD] Saving PDF...');
        const pdfBytes = await newPdf.save();
      console.log('[SPLIT-DOWNLOAD] PDF saved, size:', pdfBytes.length, 'bytes');
      
      const blob = new Blob([pdfBytes as BufferSource], { type: "application/pdf" });
      console.log('[SPLIT-DOWNLOAD] Blob created');
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${originalFileName}_teil-${i + 1}.pdf`;
        link.click();
        console.log(`[SPLIT-DOWNLOAD] Download triggered: ${link.download}`);

        URL.revokeObjectURL(url);

        // Kurze Verzögerung zwischen Downloads für Browser-Kompatibilität
        if (i < segments.length - 1) {
          console.log('[SPLIT-DOWNLOAD] Waiting 300ms before next download...');
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      console.log('[SPLIT-DOWNLOAD] All downloads complete');
      toast.success(
        `${segments.length} PDF${segments.length > 1 ? "s" : ""} erfolgreich erstellt`
      );
    } catch (error) {
      console.error('[SPLIT-DOWNLOAD ERROR]', error);
      console.error('[SPLIT-DOWNLOAD ERROR DETAILS]', {
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        segments: getSegments(),
        pageCount,
        deletedPages: Array.from(deletedPages),
        splitPositions
      });
      toast.error("Fehler beim Erstellen der PDFs");
    }
  }, [pdfArrayBuffer, pdfFile, getSegments, pageCount, deletedPages, splitPositions]);

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

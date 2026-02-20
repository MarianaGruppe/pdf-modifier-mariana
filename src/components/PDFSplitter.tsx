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
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [splitPositions, setSplitPositions] = useState<number[]>([]);
  const [deletedPages, setDeletedPages] = useState<Set<number>>(new Set());

  const handleFileSelect = useCallback(async (file: File) => {
    setPdfFile(file);
    const data = new Uint8Array(await file.arrayBuffer());
    setPdfData(data);
    
    const pdfDoc = await PDFDocument.load(data);
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

  // Download einzelnes Segment
  const downloadSegment = useCallback(async (segmentIndex: number) => {
    if (!pdfData) return;

    try {
      const segments = getSegments();
      const segment = segments[segmentIndex];
      
      if (!segment || segment.length === 0) {
        toast.error("Ungültiges Segment");
        return;
      }

      const originalFileName = pdfFile?.name.replace(".pdf", "") || "dokument";
      const pdfDoc = await PDFDocument.load(pdfData);
      
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, segment);
      copiedPages.forEach((page) => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();
      
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${originalFileName}_teil-${segmentIndex + 1}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(`PDF Teil ${segmentIndex + 1} heruntergeladen`);
    } catch (error) {
      console.error('[SEGMENT-DOWNLOAD ERROR]', error);
      toast.error("Fehler beim Erstellen der PDF");
    }
  }, [pdfData, pdfFile, getSegments]);

  // Download alle Segmente als ZIP
  const downloadAllAsZip = useCallback(async () => {
    if (!pdfData) return;

    try {
      const segments = getSegments();

      if (segments.length === 0) {
        toast.error("Keine Seiten zum Download vorhanden");
        return;
      }

      const originalFileName = pdfFile?.name.replace(".pdf", "") || "dokument";
      
      toast.info(`ZIP-Archiv mit ${segments.length} PDFs wird erstellt...`);
      
      const pdfDoc = await PDFDocument.load(pdfData);
      const zip = new JSZip();

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
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
      console.error('[ZIP-DOWNLOAD ERROR]', error);
      toast.error("Fehler beim Erstellen des ZIP-Archivs");
    }
  }, [pdfData, pdfFile, getSegments]);

  const segments = getSegments();
  const activePages = pageCount - deletedPages.size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-3">PDF teilen</h2>
        <PDFUpload onFileSelect={handleFileSelect} label="Quelldokument" />
      </div>

      {pdfFile && pdfData && (
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
            pdfData={pdfData}
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
              💡 Klicke zwischen Seiten, um Schnittlinien zu setzen. Du kannst jedes Segment einzeln
              oder alle zusammen als ZIP herunterladen.
            </div>

            {/* Segment-Liste mit individuellen Downloads */}
            {segments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Segmente ({segments.length})</h3>
                <div className="space-y-2">
                  {segments.map((segment, index) => {
                    const firstPage = segment[0] + 1;
                    const lastPage = segment[segment.length - 1] + 1;
                    const pageRange = firstPage === lastPage 
                      ? `Seite ${firstPage}` 
                      : `Seiten ${firstPage}-${lastPage}`;
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">PDF Teil {index + 1}</div>
                          <div className="text-xs text-muted-foreground">{pageRange}</div>
                        </div>
                        <Button
                          onClick={() => downloadSegment(index)}
                          size="sm"
                          variant="outline"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Alle als ZIP Button */}
                {segments.length > 1 && (
                  <Button
                    onClick={downloadAllAsZip}
                    className="w-full"
                    variant="default"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Alle als ZIP herunterladen ({segments.length} PDFs)
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

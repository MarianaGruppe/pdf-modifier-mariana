import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { PDFUpload } from "./PDFUpload";
import { PDFPageGrid } from "./PDFPageGrid";
import { Button } from "./ui/button";
import { toast } from "sonner";

export const PDFSplitter = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setPdfFile(file);
    const arrayBuffer = await file.arrayBuffer();
    setPdfArrayBuffer(arrayBuffer);
    
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    setPageCount(pdfDoc.getPageCount());
    setSelectedPages(new Set());
  }, []);

  const togglePage = useCallback((pageIndex: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageIndex)) {
        newSet.delete(pageIndex);
      } else {
        newSet.add(pageIndex);
      }
      return newSet;
    });
  }, []);

  const handleSplit = useCallback(async () => {
    if (!pdfArrayBuffer || selectedPages.size === 0) return;

    try {
      const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
      const selectedPagesArray = Array.from(selectedPages).sort((a, b) => a - b);
      
      // Create PDF with selected pages
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, selectedPagesArray);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `ausgewählte-seiten.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success(`PDF mit ${selectedPages.size} Seiten erstellt`);
    } catch (error) {
      toast.error("Fehler beim Teilen der PDF");
      console.error(error);
    }
  }, [pdfArrayBuffer, selectedPages]);

  const selectAll = useCallback(() => {
    setSelectedPages(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }, [pageCount]);

  const clearSelection = useCallback(() => {
    setSelectedPages(new Set());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-3">PDF teilen</h2>
        <PDFUpload onFileSelect={handleFileSelect} label="Quelldokument" />
      </div>

      {pdfFile && pdfArrayBuffer && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {pageCount} Seiten · {selectedPages.size} ausgewählt
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="h-7 px-2 text-xs"
            >
              Alle auswählen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-7 px-2 text-xs"
            >
              Auswahl aufheben
            </Button>
          </div>

          <PDFPageGrid
            pdfArrayBuffer={pdfArrayBuffer}
            pageCount={pageCount}
            selectedPages={selectedPages}
            onTogglePage={togglePage}
          />

          <Button
            onClick={handleSplit}
            disabled={selectedPages.size === 0}
            className="w-full"
          >
            Ausgewählte Seiten extrahieren
          </Button>
        </>
      )}
    </div>
  );
};

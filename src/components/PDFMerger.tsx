import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { PDFMergerItem } from "./PDFMergerItem";

interface PDFFileData {
  id: string;
  file: File;
  thumbnail: string | null;
  pageCount: number;
}

export const PDFMerger = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFileData[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const pdfFilesArray = files.filter((file) => file.type === "application/pdf");
      const newPdfFiles = pdfFilesArray.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        thumbnail: null,
        pageCount: 0,
      }));
      setPdfFiles((prev) => [...prev, ...newPdfFiles]);
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleThumbnailGenerated = useCallback(
    (index: number, thumbnail: string, pageCount: number) => {
      setPdfFiles((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, thumbnail, pageCount } : item
        )
      );
    },
    []
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    setPdfFiles((prev) => {
      const newFiles = [...prev];
      const draggedItem = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(index, 0, draggedItem);
      return newFiles;
    });
    setDraggedIndex(index);
  }, [draggedIndex]);

  const handleDrop = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleMerge = useCallback(async () => {
    if (pdfFiles.length < 2) return;

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfData of pdfFiles) {
        const arrayBuffer = await pdfData.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "zusammengefügt.pdf";
      link.click();

      URL.revokeObjectURL(url);
      toast.success(`${pdfFiles.length} PDFs zusammengefügt`);
    } catch (error) {
      toast.error("Fehler beim Zusammenfügen");
      console.error(error);
    }
  }, [pdfFiles]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-3">PDFs zusammenfügen</h2>
        <div className="relative">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-merge-upload"
          />
          <label htmlFor="pdf-merge-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full h-auto py-8 border-dashed hover:bg-accent/50 transition-colors cursor-pointer"
              asChild
            >
              <span className="text-sm text-muted-foreground">
                PDFs auswählen (mehrere möglich)
              </span>
            </Button>
          </label>
        </div>
      </div>

      {pdfFiles.length > 0 && (
        <>
          <div>
            <div className="text-sm text-muted-foreground mb-3">
              {pdfFiles.length} Dokumente
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pdfFiles.map((pdfData, index) => (
                <PDFMergerItem
                  key={pdfData.id}
                  file={pdfData.file}
                  index={index}
                  pageCount={pdfData.pageCount}
                  thumbnail={pdfData.thumbnail}
                  onRemove={removeFile}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onThumbnailGenerated={handleThumbnailGenerated}
                />
              ))}
            </div>
          </div>

          <Button
            onClick={handleMerge}
            disabled={pdfFiles.length < 2}
            className="w-full"
          >
            Zusammenfügen
          </Button>
        </>
      )}
    </div>
  );
};

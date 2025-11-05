import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "./ui/button";
import { toast } from "sonner";

export const PDFMerger = () => {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const pdfFiles = files.filter((file) => file.type === "application/pdf");
      setPdfFiles((prev) => [...prev, ...pdfFiles]);
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMerge = useCallback(async () => {
    if (pdfFiles.length < 2) return;

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
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
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              {pdfFiles.length} Dokumente
            </div>
            {pdfFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-card border border-border text-sm"
              >
                <span className="truncate flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-7 px-2 text-xs ml-2"
                >
                  Entfernen
                </Button>
              </div>
            ))}
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

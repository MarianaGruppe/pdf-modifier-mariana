import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface ImageData {
  id: string;
  file: File;
  previewUrl: string;
}

export const ImageToPDF = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      const imageFiles = files.filter(
        (f) => f.type === "image/jpeg" || f.type === "image/png"
      );
      const newImages: ImageData[] = imageFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImages]);
      // Reset input so same file can be added again
      event.target.value = "";
    },
    []
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (index: number) => {
      if (draggedIndex === null || draggedIndex === index) return;
      setImages((prev) => {
        const next = [...prev];
        const item = next[draggedIndex];
        next.splice(draggedIndex, 1);
        next.splice(index, 0, item);
        return next;
      });
      setDraggedIndex(index);
    },
    [draggedIndex]
  );

  const handleDrop = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return;
    setIsConverting(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const img of images) {
        const arrayBuffer = await img.file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        const embedded =
          img.file.type === "image/png"
            ? await pdfDoc.embedPng(uint8)
            : await pdfDoc.embedJpg(uint8);

        const { width, height } = embedded.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "bilder.pdf";
      link.click();
      URL.revokeObjectURL(url);

      toast.success(
        `${images.length} ${images.length === 1 ? "Bild" : "Bilder"} als PDF gespeichert`
      );
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Erstellen der PDF");
    } finally {
      setIsConverting(false);
    }
  }, [images]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium mb-3">Bilder zu PDF</h2>
        <div className="relative">
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-to-pdf-upload"
          />
          <label htmlFor="image-to-pdf-upload">
            <Button
              type="button"
              variant="outline"
              className="w-full h-auto py-8 border-dashed hover:bg-accent/50 transition-colors cursor-pointer"
              asChild
            >
              <span className="text-sm text-muted-foreground">
                Bilder auswählen (JPG, PNG – mehrere möglich)
              </span>
            </Button>
          </label>
        </div>
      </div>

      {images.length > 0 && (
        <>
          <div>
            <div className="text-sm text-muted-foreground mb-3">
              {images.length} {images.length === 1 ? "Bild" : "Bilder"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOver(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop();
                  }}
                  className="group relative border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-colors"
                >
                  <div className="space-y-2">
                    <img
                      src={img.previewUrl}
                      alt={img.file.name}
                      className="w-full h-auto border border-border"
                    />
                    <p className="text-xs truncate" title={img.file.name}>
                      {img.file.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Entfernen
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleConvert}
            disabled={isConverting}
            className="w-full"
          >
            {isConverting ? "Wird erstellt…" : "PDF erstellen"}
          </Button>
        </>
      )}
    </div>
  );
};

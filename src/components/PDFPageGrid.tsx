import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFPageGridProps {
  pdfArrayBuffer: ArrayBuffer;
  pageCount: number;
  selectedPages: Set<number>;
  onTogglePage: (pageIndex: number) => void;
}

export const PDFPageGrid = ({
  pdfArrayBuffer,
  pageCount,
  selectedPages,
  onTogglePage,
}: PDFPageGridProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    const generateThumbnails = async () => {
      const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
      const thumbs: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;
          thumbs.push(canvas.toDataURL());
        }
      }

      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [pdfArrayBuffer, pageCount]);

  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          onClick={() => onTogglePage(i)}
          className={`relative border transition-all ${
            selectedPages.has(i)
              ? "border-primary bg-accent"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          {thumbnails[i] && (
            <img
              src={thumbnails[i]}
              alt={`Seite ${i + 1}`}
              className="w-full h-auto"
            />
          )}
          <div className="absolute top-1 right-1 bg-background/90 px-1.5 py-0.5 text-xs">
            {i + 1}
          </div>
        </button>
      ))}
    </div>
  );
};

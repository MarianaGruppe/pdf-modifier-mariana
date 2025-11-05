import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFMergerItemProps {
  file: File;
  index: number;
  pageCount: number;
  thumbnail: string | null;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  onThumbnailGenerated: (index: number, thumbnail: string, pageCount: number) => void;
}

export const PDFMergerItem = ({
  file,
  index,
  pageCount,
  thumbnail,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onThumbnailGenerated,
}: PDFMergerItemProps) => {
  const [isGenerating, setIsGenerating] = useState(!thumbnail);

  useEffect(() => {
    if (thumbnail) return;

    const generateThumbnail = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const thumbnailUrl = canvas.toDataURL();
        onThumbnailGenerated(index, thumbnailUrl, pdf.numPages);
      } catch (error) {
        console.error("Error generating thumbnail:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateThumbnail();
  }, [file, index, onThumbnailGenerated, thumbnail]);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      className="group relative border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-colors"
    >
      <div className="space-y-2">
        {isGenerating ? (
          <Skeleton className="w-full aspect-[1/1.4]" />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={file.name}
            className="w-full h-auto border border-border"
          />
        ) : (
          <div className="w-full aspect-[1/1.4] bg-muted flex items-center justify-center text-xs text-muted-foreground">
            Vorschau nicht verfügbar
          </div>
        )}
        
        <div className="space-y-1">
          <p className="text-xs truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {pageCount > 0 ? `${pageCount} Seiten` : "..."}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Entfernen
      </Button>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (thumbnail) {
      setIsGenerating(false);
      return;
    }

    const generateThumbnail = async () => {
      setIsGenerating(true);
      setError(null);
      
      try {
        console.log('Generating thumbnail for:', file.name);
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (!context) {
          throw new Error('Canvas context nicht verfügbar');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Thumbnail generated successfully for:', file.name);
        onThumbnailGenerated(index, thumbnailUrl, pdf.numPages);
      } catch (error) {
        console.error('Thumbnail generation failed for:', file.name, error);
        setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        setIsGenerating(false);
      }
    };

    generateThumbnail();
  }, [file, index, onThumbnailGenerated]);

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
        ) : error ? (
          <div className="w-full aspect-[1/1.4] bg-muted flex flex-col items-center justify-center p-4 text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-xs text-muted-foreground">Vorschau nicht verfügbar</p>
          </div>
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={file.name}
            className="w-full h-auto border border-border"
          />
        ) : null}
        
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

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { pdfjsLib } from "@/lib/pdf-worker";

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
        console.log('[THUMBNAIL START]', file.name);
        
        const arrayBuffer = await file.arrayBuffer();
        console.log('[THUMBNAIL] ArrayBuffer loaded, size:', arrayBuffer.byteLength);
        
        // TIMEOUT: Max 30 Sekunden warten auf PDF-Worker
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PDF-Laden dauerte zu lange (Timeout nach 30s)')), 30000);
        });
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        console.log('[THUMBNAIL] Loading task created, waiting for PDF...');
        
        const pdf = await Promise.race([
          loadingTask.promise,
          timeoutPromise
        ]) as any;
        console.log('[THUMBNAIL] PDF loaded, pages:', pdf.numPages);
        
        const page = await pdf.getPage(1);
        console.log('[THUMBNAIL] First page loaded');
        
        const viewport = page.getViewport({ scale: 0.5 });
        console.log('[THUMBNAIL] Viewport created:', viewport.width, 'x', viewport.height);
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        
        if (!context) {
          throw new Error('Canvas context nicht verfügbar');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        console.log('[THUMBNAIL] Canvas configured');

        console.log('[THUMBNAIL] Starting render...');
        await page.render({
          canvasContext: context,
          viewport: viewport,
        } as any).promise;
        console.log('[THUMBNAIL] Render complete');

        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('[THUMBNAIL SUCCESS]', file.name, 'DataURL length:', thumbnailUrl.length);
        
        onThumbnailGenerated(index, thumbnailUrl, pdf.numPages);
      } catch (error) {
        console.error('[THUMBNAIL ERROR]', file.name, error);
        console.error('[THUMBNAIL ERROR DETAILS]', {
          message: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
        setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      } finally {
        console.log('[THUMBNAIL FINALLY]', file.name);
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

import { useEffect, useState } from "react";
import { pdfjsLib } from "@/lib/pdf-worker";
import { Button } from "./ui/button";
import { X, Scissors, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFSplitViewProps {
  pdfData: Uint8Array;
  pageCount: number;
  splitPositions: number[];
  deletedPages: Set<number>;
  onAddSplit: (afterPageIndex: number) => void;
  onRemoveSplit: (position: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onUndeletePage: (pageIndex: number) => void;
}

export const PDFSplitView = ({
  pdfData,
  pageCount,
  splitPositions,
  deletedPages,
  onAddSplit,
  onRemoveSplit,
  onDeletePage,
  onUndeletePage,
}: PDFSplitViewProps) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  useEffect(() => {
    const generateThumbnails = async () => {
      const pdf = await pdfjsLib.getDocument({ data: pdfData.slice() }).promise;
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
          } as any).promise;
          thumbs.push(canvas.toDataURL());
        }
      }

      setThumbnails(thumbs);
    };

    generateThumbnails();
  }, [pdfData, pageCount]);

  // Berechne Segment-Nummern für Split-Marker
  const getSegmentNumber = (afterPageIndex: number): number => {
    return splitPositions.filter(pos => pos <= afterPageIndex).length + 1;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start gap-2 pb-4">
        {Array.from({ length: pageCount }, (_, i) => (
          <div key={i} className="flex items-center flex-shrink-0">
            {/* Page Thumbnail */}
            <div className="relative group">
              <div
                className={cn(
                  "w-32 border rounded transition-all",
                  deletedPages.has(i)
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                {thumbnails[i] && (
                  <img
                    src={thumbnails[i]}
                    alt={`Seite ${i + 1}`}
                    className={cn(
                      "w-full h-auto rounded",
                      deletedPages.has(i) && "opacity-30"
                    )}
                  />
                )}

                {/* Seitennummer */}
                <div className="absolute top-1 right-1 bg-background/90 px-1.5 py-0.5 text-xs rounded">
                  {i + 1}
                </div>

                {/* Löschen-Button */}
                {!deletedPages.has(i) && (
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => onDeletePage(i)}
                    className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}

                {/* Gelöscht-Overlay */}
                {deletedPages.has(i) && (
                  <button
                    onClick={() => onUndeletePage(i)}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded hover:bg-background/90 transition-colors"
                  >
                    <Trash2 className="w-8 h-8 text-destructive mb-1" />
                    <span className="text-xs text-destructive font-medium">
                      Gelöscht
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Klick zum Wiederherstellen
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Split-Marker (nach jeder Seite außer der letzten) */}
            {i < pageCount - 1 && (
              <div className="flex items-center justify-center w-12 flex-shrink-0 h-full">
                {splitPositions.includes(i) ? (
                  // Aktive Schnittlinie
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <Scissors className="w-4 h-4 text-primary" />
                      <div className="w-px h-20 bg-primary border-l-2 border-dashed" />
                      <div className="text-xs font-medium text-primary">
                        PDF {getSegmentNumber(i + 1)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveSplit(i)}
                      className="h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  // Platzhalter zum Hinzufügen
                  <button
                    onClick={() => onAddSplit(i)}
                    className="group/split flex flex-col items-center gap-1 py-4 hover:bg-accent/50 rounded px-2 transition-colors"
                  >
                    <Scissors className="w-3 h-3 text-muted-foreground opacity-0 group-hover/split:opacity-50 transition-opacity" />
                    <div className="w-px h-20 bg-border opacity-30 group-hover/split:opacity-100 transition-opacity" />
                    <div className="text-xs text-muted-foreground opacity-0 group-hover/split:opacity-50 transition-opacity">
                      Teilen
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

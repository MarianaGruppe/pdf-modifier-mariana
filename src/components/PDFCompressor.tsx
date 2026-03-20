import { useState, useCallback, useRef } from "react";
import { PDFDocument, PDFName, PDFRawStream, PDFRef } from "pdf-lib";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Slider } from "./ui/slider";

type CompressionQuality = number; // 0.1 to 1.0

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressedBytes: Uint8Array;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function decodeImageToCanvas(
  imageBytes: Uint8Array,
  width: number,
  height: number,
  colorSpace: string,
  bitsPerComponent: number,
  filter: string | undefined,
  maxDimension: number
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Try decoding via blob (works for JPEG/PNG encoded streams)
  if (filter === "DCTDecode" || filter === "FlateDecode") {
    try {
      let mimeType = "image/jpeg";
      if (filter === "FlateDecode") {
        // For FlateDecode, we need to draw raw pixels
        // Try raw pixel approach below
      } else {
        const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        try {
          const img = await loadImage(url);
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas;
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    } catch {
      // Fall through to raw pixel approach
    }
  }

  // Raw pixel approach for uncompressed or FlateDecode RGB images
  try {
    const channels = colorSpace === "DeviceGray" ? 1 : colorSpace === "DeviceCMYK" ? 4 : 3;
    const expectedLength = width * height * channels * (bitsPerComponent / 8);

    if (imageBytes.length < expectedLength) return null;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return null;

    const imageData = srcCtx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < width * height; i++) {
      if (channels === 3) {
        data[i * 4] = imageBytes[i * 3];
        data[i * 4 + 1] = imageBytes[i * 3 + 1];
        data[i * 4 + 2] = imageBytes[i * 3 + 2];
      } else if (channels === 1) {
        data[i * 4] = imageBytes[i];
        data[i * 4 + 1] = imageBytes[i];
        data[i * 4 + 2] = imageBytes[i];
      } else {
        // CMYK - rough conversion
        const c = imageBytes[i * 4] / 255;
        const m = imageBytes[i * 4 + 1] / 255;
        const y = imageBytes[i * 4 + 2] / 255;
        const k = imageBytes[i * 4 + 3] / 255;
        data[i * 4] = 255 * (1 - c) * (1 - k);
        data[i * 4 + 1] = 255 * (1 - m) * (1 - k);
        data[i * 4 + 2] = 255 * (1 - y) * (1 - k);
      }
      data[i * 4 + 3] = 255;
    }

    srcCtx.putImageData(imageData, 0, 0);

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(srcCanvas, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas to blob failed"));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      "image/jpeg",
      quality
    );
  });
}

async function compressPDF(
  fileBytes: Uint8Array,
  quality: CompressionQuality,
  maxDimension: number,
  onProgress: (progress: number) => void
): Promise<CompressionResult> {
  const originalSize = fileBytes.length;
  const pdfDoc = await PDFDocument.load(fileBytes.slice(), { ignoreEncryption: true });
  const context = pdfDoc.context;

  // Find all image XObjects
  const imageRefs: { ref: PDFRef; stream: PDFRawStream; width: number; height: number; colorSpace: string; bitsPerComponent: number; filter: string | undefined }[] = [];

  context.enumerateIndirectObjects().forEach(([ref, obj]) => {
    if (obj instanceof PDFRawStream) {
      const dict = obj.dict;
      const subtype = dict.get(PDFName.of("Subtype"));
      if (subtype === PDFName.of("Image")) {
        const width = dict.get(PDFName.of("Width"));
        const height = dict.get(PDFName.of("Height"));
        const bpc = dict.get(PDFName.of("BitsPerComponent"));
        const cs = dict.get(PDFName.of("ColorSpace"));
        const filterVal = dict.get(PDFName.of("Filter"));

        const w = typeof width === "object" && "numberValue" in width ? (width as any).numberValue() : 0;
        const h = typeof height === "object" && "numberValue" in height ? (height as any).numberValue() : 0;
        const b = typeof bpc === "object" && "numberValue" in bpc ? (bpc as any).numberValue() : 8;

        let csName = "DeviceRGB";
        if (cs === PDFName.of("DeviceGray")) csName = "DeviceGray";
        else if (cs === PDFName.of("DeviceCMYK")) csName = "DeviceCMYK";

        let filterName: string | undefined;
        if (filterVal === PDFName.of("DCTDecode")) filterName = "DCTDecode";
        else if (filterVal === PDFName.of("FlateDecode")) filterName = "FlateDecode";

        if (w > 0 && h > 0) {
          imageRefs.push({ ref, stream: obj, width: w, height: h, colorSpace: csName, bitsPerComponent: b, filter: filterName });
        }
      }
    }
  });

  if (imageRefs.length === 0) {
    // No images found, just save as-is
    const saved = await pdfDoc.save();
    return { originalSize, compressedSize: saved.length, compressedBytes: saved };
  }

  let processed = 0;
  for (const img of imageRefs) {
    try {
      const rawBytes = img.stream.contents;
      const canvas = await decodeImageToCanvas(
        rawBytes, img.width, img.height, img.colorSpace, img.bitsPerComponent, img.filter, maxDimension
      );

      if (canvas) {
        const jpegBytes = await canvasToJpegBytes(canvas, quality);

        // Only replace if compressed version is smaller
        if (jpegBytes.length < rawBytes.length) {
          const newStream = context.stream(jpegBytes, {
            [PDFName.of("Type").toString()]: PDFName.of("XObject"),
            [PDFName.of("Subtype").toString()]: PDFName.of("Image"),
            [PDFName.of("Width").toString()]: canvas.width,
            [PDFName.of("Height").toString()]: canvas.height,
            [PDFName.of("ColorSpace").toString()]: PDFName.of("DeviceRGB"),
            [PDFName.of("BitsPerComponent").toString()]: 8,
            [PDFName.of("Filter").toString()]: PDFName.of("DCTDecode"),
            [PDFName.of("Length").toString()]: jpegBytes.length,
          });
          context.assign(img.ref, newStream);
        }
      }
    } catch {
      // Skip images that can't be processed
    }

    processed++;
    onProgress(Math.round((processed / imageRefs.length) * 100));
  }

  const compressedBytes = await pdfDoc.save();
  return { originalSize, compressedSize: compressedBytes.length, compressedBytes };
}

const QUALITY_PRESETS = [
  { label: "Hoch", description: "Beste Qualität, moderate Komprimierung", quality: 0.8, maxDim: 2400 },
  { label: "Mittel", description: "Guter Kompromiss aus Qualität und Größe", quality: 0.5, maxDim: 1500 },
  { label: "Niedrig", description: "Maximale Komprimierung, geringere Qualität", quality: 0.3, maxDim: 1200 },
];

export const PDFCompressor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [qualityIndex, setQualityIndex] = useState(1); // Default: Mittel
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setResult(null);
      setError(null);
    }
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setIsCompressing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const preset = QUALITY_PRESETS[qualityIndex];
      const res = await compressPDF(bytes, preset.quality, preset.maxDim, setProgress);
      setResult(res);
    } catch (e) {
      setError("Fehler bei der Komprimierung. Möglicherweise ist die PDF-Datei beschädigt oder verschlüsselt.");
      console.error(e);
    } finally {
      setIsCompressing(false);
    }
  }, [file, qualityIndex]);

  const handleDownload = useCallback(() => {
    if (!result || !file) return;
    const blob = new Blob([result.compressedBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.download = `${baseName}_komprimiert.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const preset = QUALITY_PRESETS[qualityIndex];
  const savings = result ? Math.round((1 - result.compressedSize / result.originalSize) * 100) : 0;

  return (
    <div className="space-y-6">
      {!file ? (
        <div className="space-y-3">
          <label className="block text-sm text-foreground">PDF zum Komprimieren auswählen</label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-compress-upload"
            />
            <label htmlFor="pdf-compress-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full h-auto py-8 border-dashed hover:bg-accent/50 transition-colors cursor-pointer"
                asChild
              >
                <span className="text-sm text-muted-foreground">
                  PDF auswählen
                </span>
              </Button>
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File info */}
          <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">Originalgröße: {formatFileSize(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={isCompressing}>
              Andere Datei
            </Button>
          </div>

          {/* Quality selector */}
          {!result && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-3">Qualitätsstufe: {preset.label}</label>
                <Slider
                  value={[qualityIndex]}
                  onValueChange={(v) => setQualityIndex(v[0])}
                  min={0}
                  max={2}
                  step={1}
                  disabled={isCompressing}
                  className="w-full"
                />
                <div className="flex justify-between mt-1">
                  {QUALITY_PRESETS.map((p, i) => (
                    <span key={i} className={`text-xs ${i === qualityIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{preset.description}</p>

              <Button onClick={handleCompress} disabled={isCompressing} className="w-full">
                {isCompressing ? "Komprimiere…" : "Komprimierung starten"}
              </Button>
            </div>
          )}

          {/* Progress */}
          {isCompressing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{progress}% – Bilder werden optimiert…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-border bg-muted/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vorher</span>
                  <span className="font-medium">{formatFileSize(result.originalSize)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nachher</span>
                  <span className="font-medium">{formatFileSize(result.compressedSize)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Einsparung</span>
                  <span className={`font-medium ${savings > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                    {savings > 0 ? `${savings}% kleiner` : "Keine Verkleinerung möglich"}
                  </span>
                </div>
              </div>

              {savings > 0 ? (
                <Button onClick={handleDownload} className="w-full">
                  Komprimierte PDF herunterladen
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Die Datei enthält wenig oder keine komprimierbaren Bilder.
                </p>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full">
                Neue Datei komprimieren
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

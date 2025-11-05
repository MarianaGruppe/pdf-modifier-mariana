import { useCallback } from "react";
import { Button } from "./ui/button";

interface PDFUploadProps {
  onFileSelect: (file: File) => void;
  label: string;
}

export const PDFUpload = ({ onFileSelect, label }: PDFUploadProps) => {
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm text-foreground">{label}</label>
      <div className="relative">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id={`pdf-upload-${label}`}
        />
        <label htmlFor={`pdf-upload-${label}`}>
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
  );
};

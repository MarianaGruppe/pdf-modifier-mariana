import * as pdfjsLib from 'pdfjs-dist';

// WICHTIG: Für Vite/ESM - Worker aus node_modules laden
if (typeof window !== 'undefined') {
  // Verwende die .mjs Version für ESM-Kompatibilität mit Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  
  console.log('[PDF.js] Worker configured (Vite):', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

export { pdfjsLib };

import * as pdfjsLib from 'pdfjs-dist';

// Worker nur einmal global konfigurieren
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  console.log('[PDF.js] Worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

export { pdfjsLib };

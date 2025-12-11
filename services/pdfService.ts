import * as pdfjsLib from 'pdfjs-dist';

// Define worker path relative to the imported version
const WORKER_URL = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// Handle potential default export structure from esm.sh which causes GlobalWorkerOptions to be undefined on the namespace
// @ts-ignore
const pdfjs = pdfjsLib.default ?? pdfjsLib;

// Set worker options
if (typeof window !== 'undefined' && 'Worker' in window) {
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
  } else {
    // Fallback or warning if structure is unexpected
    console.warn("PDF.js GlobalWorkerOptions not found on imported module. PDF analysis might fail.");
  }
}

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Ensure getDocument is available
    if (!pdfjs.getDocument) {
        throw new Error("PDF.js getDocument function not found. The library might not have loaded correctly.");
    }

    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://esm.sh/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    // Limit to first 10 pages to avoid performance issues/token limits on huge docs
    const maxPages = Math.min(pdf.numPages, 10);

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-ignore - item.str exists on TextItem
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `[Page ${i}] ${pageText}\n`;
    }

    if (pdf.numPages > maxPages) {
        fullText += `\n[...Truncated. Analysis limited to first ${maxPages} pages...]`;
    }

    if (!fullText.trim()) {
        throw new Error("No text content found in PDF. It might be an image-only scan.");
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error(error.message || "Failed to parse PDF file. Ensure the file is a valid PDF.");
  }
};
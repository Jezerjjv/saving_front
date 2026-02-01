/**
 * Convierte la primera página de un PDF a imagen (PNG) para OCR.
 * Usa pdfjs-dist para renderizar a canvas y exportar como blob.
 */

import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

/**
 * @param {File|Blob} pdfFile
 * @returns {Promise<{ blob: Blob, dataUrl: string }>} blob PNG y dataUrl para vista previa
 */
export async function pdfFirstPageToImage(pdfFile) {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
  const { getDocument } = pdfjs;
  const arrayBuffer = await pdfFile.arrayBuffer();
  const doc = await getDocument({ data: arrayBuffer }).promise;
  const page = await doc.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png', 1);
  });
  return { blob, dataUrl };
}

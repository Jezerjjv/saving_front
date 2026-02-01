/**
 * Extracción de datos desde imágenes de facturas, tickets y recortes.
 * Usa Tesseract.js (OCR) y patrones regex para montos, fechas y comercio.
 * Funciona con cualquier tipo de documento: factura, ticket, recorte, etc.
 */

// Patrones para montos (total, importe, etc.) — español e inglés, con , o . (g obligatorio para matchAll)
const AMOUNT_PATTERNS = [
  // TOTAL 12,34 € / Total: 12.34 / Importe total 12,34
  /(?:total|importe\s*total|amount|suma)\s*[:\s]*([0-9]+[.,][0-9]{2})\s*(?:€|eur|euros?)?/gi,
  // € 12,34 / 12,34 € / 12.34 EUR
  /(?:€|eur|euros?)\s*([0-9]+[.,][0-9]{2})|([0-9]+[.,][0-9]{2})\s*(?:€|eur|euros?)/gi,
  // Total a pagar: 12,34
  /(?:total\s*a\s*pagar|a\s*pagar|pagado)\s*[:\s]*([0-9]+[.,][0-9]{2})/gi,
  // Número suelto al final de línea (último número con decimales en el texto suele ser el total)
  /([0-9]+[.,][0-9]{2})\s*$/gm,
];

// Patrones para fechas — DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, etc.
const DATE_PATTERNS = [
  /(?:fecha|date)\s*[:\s]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
];

/**
 * Parsea un string de monto (ej. "12,34" o "12.34") a número.
 */
function parseAmount(str) {
  if (!str || typeof str !== 'string') return null;
  const normalized = str.trim().replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Parsea día, mes, año a YYYY-MM-DD.
 */
function toIsoDate(day, month, year) {
  const d = parseInt(day, 10);
  let m = parseInt(month, 10);
  let y = parseInt(year, 10);
  if (y < 100) y += 2000;
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${date.getFullYear()}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Extrae el monto total del texto OCR.
 * Prioriza líneas que contengan "total" / "importe" y devuelve el mayor si hay varios candidatos.
 */
function extractAmount(text) {
  if (!text || typeof text !== 'string') return null;
  let best = null;
  for (const re of AMOUNT_PATTERNS) {
    const matches = text.matchAll(re);
    for (const m of matches) {
      const raw = (m[1] || m[2] || m[0]).replace(/\s/g, '');
      const num = parseAmount(raw);
      if (num != null) {
        if (best == null || num > best) best = num;
      }
    }
  }
  return best;
}

/**
 * Extrae la primera fecha válida del texto.
 */
function extractDate(text) {
  if (!text || typeof text !== 'string') return null;
  for (const re of DATE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    if (m[1] && m[2] && m[3]) {
      const iso = toIsoDate(m[1], m[2], m[3]);
      if (iso) return iso;
    }
  }
  return null;
}

/**
 * Extrae el comercio/origen: "Recibo de compra de Vinted", "Factura de X", "Ticket de X", etc.
 */
function extractMerchant(text) {
  if (!text || typeof text !== 'string') return null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Recibo de compra de Vinted / Recibo de compra de Vinted:
  const reciboMatch = text.match(/recibo\s+de\s+compra\s+de\s*[:\s]*([^\n:,]+)/i);
  if (reciboMatch && reciboMatch[1]) {
    const name = reciboMatch[1].trim().slice(0, 60);
    if (name.length >= 2) return name;
  }
  // Factura de X, Ticket de X, Establecimiento: X
  const afterLabel = /(?:factura\s+de|ticket\s+de|establecimiento|comercio)\s*[:\s]*([^\n]+)/i;
  for (const line of lines) {
    const after = line.match(afterLabel);
    if (after && after[1]) {
      const name = after[1].trim().slice(0, 60);
      if (name.length >= 2) return name;
    }
  }
  const skipWords = /^(ticket|factura|recibo|fecha|total|importe|€|eur|\d|#|nº|numero)$/i;
  for (const line of lines.slice(0, 8)) {
    if (line.length < 2 || line.length > 80) continue;
    if (skipWords.test(line)) continue;
    if (/^[\d\s.,€$]+$/.test(line)) continue;
    return line.slice(0, 80);
  }
  return null;
}

/**
 * Extrae el concepto del pedido/artículo: "Pedido: Jeans Zara Coupe Cropped", "Artículo: X", etc.
 */
function extractItemDescription(text) {
  if (!text || typeof text !== 'string') return null;
  // Pedido: Jeans Zara Coupe Cropped (misma línea)
  const pedidoSame = text.match(/pedido\s*[:\s]*([^\n]+)/i);
  if (pedidoSame && pedidoSame[1]) {
    const name = pedidoSame[1].trim().replace(/\s+/g, ' ').slice(0, 60);
    if (name.length >= 2 && !/^[\d\s.,€$]+$/.test(name)) return name;
  }
  // Artículo: X (a veces el nombre está en la misma línea)
  const articulo = text.match(/art[ií]culo\s*[:\s]*([^\n]+?)(?:\s+[\d,]+\s*€|\s*$)/i);
  if (articulo && articulo[1]) {
    const name = articulo[1].trim().replace(/\s+/g, ' ').slice(0, 60);
    if (name.length >= 2) return name;
  }
  // Buscar línea tras "Pedido" (siguiente línea en OCR)
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^pedido\s*[:\s]*$/i.test(lines[i]) || /^pedido$/i.test(lines[i])) {
      const next = lines[i + 1].trim();
      if (next.length >= 3 && next.length <= 80 && !/^[\d\s.,€$]+$/.test(next)) return next.slice(0, 60);
    }
  }
  return null;
}

/**
 * Sugiere una categoría por palabras clave (comercio, artículo, texto).
 * Devuelve un nombre de categoría para que el frontend busque la que coincida (p. ej. "Ropa", "Alimentación").
 */
function extractCategorySuggestion(text, merchant, item) {
  const combined = [text, merchant, item].filter(Boolean).join(' ').toLowerCase();
  if (!combined) return null;
  // Ropa / moda: Vinted, Zara, jeans, pantalón, camiseta, vestido, moda, ropa
  if (/\b(vinted|zara|jeans|pantal[oó]n|pantalones|camiseta|vestido|moda|ropa|calzado|zapatos|chaqueta|sudadera)\b/i.test(combined)) return 'Ropa';
  // Comida / alimentación / supermercado
  if (/\b(mercadona|carrefour|lidl|aldi|supermercado|super\s*mercado|alimentaci[oó]n|comida|super)\b/i.test(combined)) return 'Comida';
  // Restaurante / ocio
  if (/\b(restaurante|bar|caf[eé]|pizza|hamburguesa|comer\s*fuera)\b/i.test(combined)) return 'Restaurante';
  // Transporte / gasolina
  if (/\b(gasolina|gasolinera|repostar|uber|taxi|transporte|parking|peaje)\b/i.test(combined)) return 'Transporte';
  // Farmacia / salud
  if (/\b(farmacia|medicamento|parafarmacia)\b/i.test(combined)) return 'Farmacia';
  // Tecnología / electrónica
  if (/\b(amazon|electr[oó]nica|tecnolog[ií]a|m[oó]vil|ordenador|pc)\b/i.test(combined)) return 'Tecnología';
  // Hogar
  if (/\b(ikea|hogar|muebles|decoraci[oó]n)\b/i.test(combined)) return 'Hogar';
  return null;
}

/**
 * Ejecuta OCR sobre una imagen (File o Blob) y extrae { name, amount, date, categorySuggestion }.
 * @param {File|Blob} imageFile
 * @param {object} opts - { onProgress?: (p) => void }
 * @returns {Promise<{ name?: string, amount?: number, date?: string }>}
 */
export async function extractFromReceiptImage(imageFile, opts = {}) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa+eng', undefined, {
    logger: opts.onProgress ? (m) => { if (m.status === 'recognizing text') opts.onProgress(m.progress); } : undefined,
  });
  try {
    const { data } = await worker.recognize(imageFile);
    const text = data?.text || '';
    const amount = extractAmount(text);
    const date = extractDate(text);
    const merchant = extractMerchant(text);
    const item = extractItemDescription(text);
    const name = merchant && item ? `${merchant} - ${item}` : (merchant || item);
    const categorySuggestion = extractCategorySuggestion(text, merchant, item);
    return {
      name: name || undefined,
      amount: amount ?? undefined,
      date: date || undefined,
      categorySuggestion: categorySuggestion || undefined,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Comprueba si el OCR está disponible (navegador con soporte).
 */
export function isReceiptOcrAvailable() {
  return typeof window !== 'undefined' && typeof import('tesseract.js') !== 'undefined';
}

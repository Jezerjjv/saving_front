import { useState, useRef, useEffect } from 'react';
import { extractFromReceiptImage } from '../utils/receiptOcr';
import { pdfFirstPageToImage } from '../utils/pdfToImage';
import { IconCamera, IconImageUpload } from './Icons.jsx';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    maxWidth: 420,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
  title: { margin: 0, fontSize: '1.1rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.2rem', cursor: 'pointer', borderRadius: 8 },
  body: { padding: '1.25rem' },
  hint: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' },
  actions: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
  btnPrimary: { background: 'var(--expense)', color: '#fff', border: 'none' },
  preview: { marginTop: '1rem', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 200, objectFit: 'contain', width: '100%', background: 'var(--bg)' },
  progress: { marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' },
  error: { marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--expense)' },
  inputFile: { display: 'none' },
  dropZone: {
    borderRadius: 'var(--radius)',
    transition: 'background 0.15s, border-color 0.15s',
  },
  dropZoneActive: {
    background: 'var(--surface-hover)',
    border: '2px dashed var(--accent)',
  },
  // Estilo recibo: tarjetas claras, monto destacado
  receiptCard: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '1rem 1.25rem',
    marginBottom: '0.75rem',
  },
  receiptTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  receiptAmount: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    marginTop: '0.35rem',
  },
  receiptLabel: { fontWeight: 500 },
  receiptValue: { color: 'var(--text)', fontWeight: 500 },
  receiptInput: {
    width: '100%',
    maxWidth: 220,
    padding: '0.4rem 0.5rem',
    fontSize: '0.9rem',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--surface)',
    color: 'var(--text)',
    boxSizing: 'border-box',
  },
  receiptInputAmount: {
    fontSize: '1.25rem',
    fontWeight: 700,
    maxWidth: 140,
    textAlign: 'right',
  },
  receiptSelect: {
    padding: '0.4rem 0.5rem',
    fontSize: '0.9rem',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--surface)',
    color: 'var(--text)',
    minWidth: 140,
    maxWidth: 220,
  },
};

export default function CaptureExpenseModal({ categories = [], onExtracted, onClose }) {
  const [step, setStep] = useState('choose'); // choose | preview | processing | extracted
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editableData, setEditableData] = useState({ name: '', amount: '', date: '', categoryId: '' });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
  };

  const handleClose = () => {
    clearPreview();
    setExtractedData(null);
    setStep('choose');
    setError('');
    onClose();
  };

  const setImageFromFileOrBlob = (fileOrBlob) => {
    const f = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], 'imagen.png', { type: fileOrBlob.type || 'image/png' });
    clearPreview();
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep('preview');
    setError('');
  };

  const processFile = async (f) => {
    if (!f) return;
    if (f.type === 'application/pdf') {
      setError('');
      setConvertingPdf(true);
      try {
        const { blob } = await pdfFirstPageToImage(f);
        const fileFromPdf = new File([blob], 'factura-pagina1.png', { type: 'image/png' });
        setImageFromFileOrBlob(fileFromPdf);
      } catch (err) {
        setError(err?.message || 'No se pudo leer el PDF. Prueba con una imagen.');
      } finally {
        setConvertingPdf(false);
      }
      return;
    }
    if (f.type.startsWith('image/')) {
      setImageFromFileOrBlob(f);
      return;
    }
    setError('Suelta una imagen (JPG, PNG, etc.) o un PDF.');
  };

  const handleFileSelect = async (e) => {
    const f = e.target?.files?.[0];
    if (!f) return;
    e.target.value = '';
    await processFile(f);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    await processFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };

  const handleCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('processing');
    setError('');
    setProgress(0);
    try {
      const result = await extractFromReceiptImage(file, {
        onProgress: (p) => setProgress(Math.round(p * 100)),
      });
      setExtractedData(result);
      const suggestedId = result.categorySuggestion && Array.isArray(categories) && categories.length
        ? (categories.find((c) => (c.name || '').toLowerCase().includes(result.categorySuggestion.toLowerCase()))?.id ?? categories[0]?.id)
        : null;
      setEditableData({
        name: result.name ?? '',
        amount: result.amount != null ? String(result.amount) : '',
        date: result.date ?? '',
        categoryId: suggestedId ?? (categories?.[0]?.id ?? ''),
      });
      setStep('extracted');
    } catch (err) {
      setError(err?.message || 'No se pudo leer la imagen. Prueba con otra foto o escribe el gasto a mano.');
      setStep('preview');
    }
  };

  const handleCreateExpense = () => {
    const name = String(editableData.name).trim() || undefined;
    const amountStr = String(editableData.amount).trim().replace(',', '.');
    const amount = amountStr === '' ? undefined : (parseFloat(amountStr) || undefined);
    const date = String(editableData.date).trim() || undefined;
    const selectedCategory = categories.find((c) => c.id === editableData.categoryId);
    const categorySuggestion = selectedCategory?.name ?? undefined;
    const payload = { name, amount: Number.isFinite(amount) ? amount : undefined, date, categorySuggestion };
    clearPreview();
    setExtractedData(null);
    setEditableData({ name: '', amount: '', date: '', categoryId: '' });
    setStep('choose');
    onExtracted(payload);
    onClose();
  };

  const handleBackToPreview = () => {
    setExtractedData(null);
    setEditableData({ name: '', amount: '', date: '', categoryId: '' });
    setStep('preview');
  };

  const setEditable = (field, value) => {
    setEditableData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseImage = () => {
    fileInputRef.current?.click();
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            if (blob) setImageFromFileOrBlob(blob);
            return;
          }
        }
      }
      setError('No hay ninguna imagen en el portapapeles.');
    } catch {
      setError('No se pudo acceder al portapapeles. Prueba con Ctrl+V.');
    }
  };

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            setImageFromFileOrBlob(blob);
          }
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  return (
    <div style={styles.overlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...styles.modal,
          ...(isDragging ? { outline: '2px dashed var(--accent)', outlineOffset: 2 } : {}),
        }}
      >
        <div style={styles.header}>
          <h2 id="capture-title" style={styles.title}>Capturar factura o ticket</h2>
          <button type="button" onClick={handleClose} style={styles.closeBtn} aria-label="Cerrar">✕</button>
        </div>
        <div
          style={{
            ...styles.body,
            ...(isDragging ? styles.dropZoneActive : {}),
            ...styles.dropZone,
          }}
        >
          <p style={styles.hint}>
            Usa una foto del ticket, factura o recorte, o sube un PDF. También puedes arrastrar aquí, o pegar con Ctrl+V. Se intentará extraer el total, la fecha y el nombre del comercio.
          </p>

          {step === 'choose' && (
            <div style={styles.actions}>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={styles.inputFile}
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={styles.inputFile}
                onChange={handleFileSelect}
              />
              <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCapture}>
                <IconCamera size={22} />
                Tomar foto
              </button>
              <button type="button" style={styles.btn} onClick={handleUseImage} disabled={convertingPdf}>
                <IconImageUpload size={22} />
                {convertingPdf ? 'Convirtiendo PDF…' : 'Elegir imagen o PDF'}
              </button>
              <button type="button" style={styles.btn} onClick={handlePaste} title="Pegar desde el portapapeles (Ctrl+V)">
                📋 Pegar imagen (Ctrl+V)
              </button>
            </div>
          )}

          {step === 'preview' && file && (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
              >
                <img src={previewUrl} alt="Vista previa" style={styles.preview} />
              </div>
              <div style={styles.actions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleAnalyze}>
                  Extraer datos y crear gasto
                </button>
                <button type="button" style={styles.btn} onClick={() => { clearPreview(); setStep('choose'); }}>
                  Cambiar imagen
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <p style={styles.progress}>Leyendo imagen… {progress}%</p>
          )}

          {step === 'extracted' && (
            <>
              <p style={{ ...styles.hint, marginBottom: '0.75rem' }}>Revisa y corrige los datos si el OCR no fue preciso.</p>
              <div style={styles.receiptCard}>
                <div style={styles.receiptTitle}>
                  {editableData.name ? `Recibo de ${editableData.name}` : 'Recibo de'}
                </div>
                <input
                  type="text"
                  value={editableData.name}
                  onChange={(e) => setEditable('name', e.target.value)}
                  placeholder="Nombre del comercio o concepto"
                  style={{ ...styles.receiptInput, marginBottom: '0.5rem' }}
                  aria-label="Concepto o nombre del comercio"
                />
                <div style={{ ...styles.receiptAmount, marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editableData.amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setEditable('amount', e.target.value);
                    }}
                    placeholder="0,00 €"
                    style={{ ...styles.receiptInput, ...styles.receiptInputAmount, border: 'none', background: 'transparent', paddingLeft: 0 }}
                    aria-label="Importe"
                  />
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Fecha de pago</span>
                  <input
                    type="date"
                    value={editableData.date || ''}
                    onChange={(e) => setEditable('date', e.target.value)}
                    style={styles.receiptInput}
                    aria-label="Fecha de pago"
                  />
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Categoría</span>
                  <select
                    value={editableData.categoryId ?? ''}
                    onChange={(e) => setEditable('categoryId', e.target.value)}
                    style={styles.receiptSelect}
                    aria-label="Categoría"
                  >
                    <option value="">Elige categoría</option>
                    {Array.isArray(categories) && categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || 'Sin nombre'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.receiptCard}>
                <div style={{ ...styles.receiptTitle, marginBottom: '0.5rem' }}>Detalle</div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Concepto</span>
                  <input
                    type="text"
                    value={editableData.name}
                    onChange={(e) => setEditable('name', e.target.value)}
                    placeholder="—"
                    style={{ ...styles.receiptInput, textAlign: 'right', maxWidth: '60%' }}
                    aria-label="Concepto"
                  />
                </div>
                <div style={{ ...styles.receiptRow, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={styles.receiptLabel}>Total</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editableData.amount}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '' || /^\d*\.?\d{0,2}$/.test(v)) setEditable('amount', e.target.value);
                    }}
                    placeholder="0,00"
                    style={{ ...styles.receiptInput, ...styles.receiptInputAmount, maxWidth: 120 }}
                    aria-label="Total"
                  />
                </div>
              </div>
              <div style={styles.actions}>
                <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCreateExpense}>
                  Crear gasto
                </button>
                <button type="button" style={styles.btn} onClick={handleBackToPreview}>
                  Volver a la imagen
                </button>
              </div>
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

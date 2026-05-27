import { useState } from 'react';
import { useLayoutHeader } from '../context/LayoutHeaderContext';

const styles = {
  hint: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' },
  card: {
    maxWidth: 420,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem' },
  input: { width: '100%', padding: '0.5rem 0.75rem', fontSize: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)' },
  btnCalc: {
    width: '100%',
    padding: '0.65rem 1rem',
    fontSize: '1rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: 'var(--radius)',
    background: 'var(--accent)',
    color: '#fff',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  btnCalcDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  error: { fontSize: '0.85rem', color: 'var(--expense)', marginTop: '0.5rem', marginBottom: 0 },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0',
    borderBottom: '1px solid var(--border)',
  },
  resultRowLast: { borderBottom: 'none' },
  resultLabel: { fontSize: '0.9rem', color: 'var(--text-muted)' },
  resultValue: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--income)' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  checkbox: { width: 18, height: 18, accentColor: 'var(--accent)' },
};

const RETENCION_POR_DEFECTO = 19;

function parseNum(value) {
  const n = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(n) ? n : NaN;
}

export default function Calculadora() {
  useLayoutHeader('Calculadora de intereses');
  const [importe, setImporte] = useState('');
  const [interes, setInteres] = useState('');
  const [moneda, setMoneda] = useState('EUR');
  const [incluirRetenciones, setIncluirRetenciones] = useState(false);
  const [porcentajeRetencion, setPorcentajeRetencion] = useState(String(RETENCION_POR_DEFECTO));
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  const amount = parseNum(importe);
  const rate = parseNum(interes);
  const retencionPct = Math.min(100, Math.max(0, parseNum(porcentajeRetencion) || 0));
  const factorNeto = incluirRetenciones ? (100 - retencionPct) / 100 : 1;

  const gananciaAnualBruta = amount * (rate / 100);
  const gananciaMensualBruta = gananciaAnualBruta / 12;
  const gananciaDiariaBruta = gananciaAnualBruta / 365;

  const gananciaAnual = gananciaAnualBruta * factorNeto;
  const gananciaMensual = gananciaMensualBruta * factorNeto;
  const gananciaDiaria = gananciaDiariaBruta * factorNeto;

  const fmt = (n) =>
    new Intl.NumberFormat('es', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n ?? 0);

  const handleCalculate = (e) => {
    e?.preventDefault?.();
    setError('');
    if (!Number.isFinite(amount) || amount <= 0) {
      setShowResults(false);
      setError('Introduce un importe mayor que 0.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setShowResults(false);
      setError('Introduce un interés anual válido (0 o más).');
      return;
    }
    if (incluirRetenciones && (!Number.isFinite(retencionPct) || retencionPct < 0 || retencionPct > 100)) {
      setShowResults(false);
      setError('El porcentaje de retención debe estar entre 0 y 100.');
      return;
    }
    setShowResults(true);
  };

  return (
    <div className="page-calculadora">
      <p style={styles.hint}>
        Introduce un importe y un interés anual (%). Pulsa Calcular para ver la ganancia al día, mes y año. Opcionalmente puedes aplicar una retención.
      </p>
      <form style={styles.card} onSubmit={handleCalculate}>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="calc-moneda">Moneda</label>
          <select
            id="calc-moneda"
            value={moneda}
            onChange={(e) => {
              setMoneda(e.target.value);
              setShowResults(false);
            }}
            style={styles.input}
            className="select-modern"
          >
            <option value="EUR">Euro (€)</option>
            <option value="USD">Dólar (USD)</option>
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="calc-importe">Importe</label>
          <input
            id="calc-importe"
            type="text"
            inputMode="decimal"
            placeholder="Ej. 10000"
            value={importe}
            onChange={(e) => {
              setImporte(e.target.value);
              setShowResults(false);
              setError('');
            }}
            style={styles.input}
            className="input-modern"
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label} htmlFor="calc-interes">Interés anual (%)</label>
          <input
            id="calc-interes"
            type="text"
            inputMode="decimal"
            placeholder="Ej. 3,5"
            value={interes}
            onChange={(e) => {
              setInteres(e.target.value);
              setShowResults(false);
              setError('');
            }}
            style={styles.input}
            className="input-modern"
            required
          />
        </div>
        <div style={styles.checkboxRow}>
          <input
            id="calc-retenciones"
            type="checkbox"
            checked={incluirRetenciones}
            onChange={(e) => {
              setIncluirRetenciones(e.target.checked);
              setShowResults(false);
            }}
            style={styles.checkbox}
            aria-describedby="calc-retenciones-desc"
          />
          <label htmlFor="calc-retenciones" style={{ ...styles.label, marginBottom: 0, cursor: 'pointer' }}>
            Incluir retenciones
          </label>
        </div>
        {incluirRetenciones && (
          <div style={styles.field}>
            <label style={styles.label} htmlFor="calc-retencion-pct">Porcentaje de retención (%)</label>
            <input
              id="calc-retencion-pct"
              type="text"
              inputMode="decimal"
              placeholder="19"
              value={porcentajeRetencion}
              onChange={(e) => {
                setPorcentajeRetencion(e.target.value);
                setShowResults(false);
              }}
              style={{ ...styles.input, maxWidth: 120 }}
              className="input-modern"
            />
            <span id="calc-retenciones-desc" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              (ej. 19% España)
            </span>
          </div>
        )}

        <button
          type="submit"
          style={{
            ...styles.btnCalc,
            ...(!importe.trim() || !interes.trim() ? styles.btnCalcDisabled : {}),
          }}
          disabled={!importe.trim() || !interes.trim()}
        >
          Calcular
        </button>
        {error ? <p style={styles.error} role="alert">{error}</p> : null}

        {showResults && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            {incluirRetenciones && retencionPct > 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Resultados tras retención del {retencionPct}%
              </p>
            )}
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Ganancia al día</span>
              <span style={styles.resultValue}>{fmt(gananciaDiaria)}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>Ganancia al mes</span>
              <span style={styles.resultValue}>{fmt(gananciaMensual)}</span>
            </div>
            <div style={{ ...styles.resultRow, ...styles.resultRowLast }}>
              <span style={styles.resultLabel}>Ganancia al año</span>
              <span style={styles.resultValue}>{fmt(gananciaAnual)}</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

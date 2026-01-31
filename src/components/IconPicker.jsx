import { useState, useRef, useEffect } from 'react';

/** Combo de iconos que se despliega hacia abajo con buscador. value/onChange en símbolo (string). */
export default function IconPicker({ icons = [], value, onChange, placeholder = 'Elegir icono', style, id }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const filtered = (Array.isArray(icons) ? icons : []).filter((i) => {
    const s = (search || '').trim().toLowerCase();
    if (!s) return true;
    const sym = (i.symbol || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return sym.includes(s) || name.includes(s);
  });

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  const displayValue = value || (icons.length > 0 ? icons[0].symbol : '📁');
  const selectedName = icons.find((i) => i.symbol === displayValue)?.name;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }} id={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={triggerStyle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={placeholder}
      >
        <span style={{ fontSize: '1.25rem' }}>{displayValue}</span>
        {selectedName && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedName}</span>}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>▼</span>
      </button>
      {open && (
        <div style={dropdownStyle}>
          <input
            type="text"
            placeholder="Buscar icono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchStyle}
            autoFocus
            aria-label="Buscar icono"
          />
          <div style={listStyle} role="listbox">
            {filtered.length === 0 ? (
              <div style={emptyStyle}>No hay coincidencias</div>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="option"
                  aria-selected={value === i.symbol}
                  onClick={() => {
                    onChange(i.symbol);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={{ ...optionStyle, ...(value === i.symbol ? optionActiveStyle : {}) }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{i.symbol}</span>
                  {i.name && <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{i.name}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const triggerStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: '0.55rem 0.85rem',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '1rem',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  zIndex: 1100,
  overflow: 'hidden',
};

const searchStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: '1rem',
  outline: 'none',
};

const listStyle = {
  maxHeight: 220,
  overflowY: 'auto',
  padding: '0.25rem 0',
};

const optionStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: '0.4rem 0.75rem',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: '1rem',
  cursor: 'pointer',
  textAlign: 'left',
};

const optionActiveStyle = {
  background: 'var(--surface-hover)',
};

const emptyStyle = {
  padding: '0.75rem',
  color: 'var(--text-muted)',
  fontSize: '0.9rem',
};

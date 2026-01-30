import { useState } from 'react';
import { IconEdit, IconTrash, IconChevronDown, IconChevronRight } from './Icons.jsx';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
}

function dayTotal(dayGroup) {
  let income = 0;
  let expense = 0;
  for (const cat of dayGroup.categories) {
    for (const tx of cat.items) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
  }
  return { income, expense, balance: income - expense };
}

function categoryTotal(items) {
  let income = 0;
  let expense = 0;
  for (const tx of items) {
    if (tx.type === 'income') income += tx.amount;
    else expense += tx.amount;
  }
  return { income, expense, balance: income - expense };
}

export default function TransactionAccordion({ dayGroup, filterType, onEdit, onDelete }) {
  const [openDay, setOpenDay] = useState(true);
  const [openCats, setOpenCats] = useState({});

  const toggleCat = (catId) => {
    setOpenCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const formatEur = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n);

  const filteredCategories = dayGroup.categories.map((cat) => {
    let items = cat.items;
    if (filterType === 'expense') items = items.filter((t) => t.type === 'expense');
    if (filterType === 'income') items = items.filter((t) => t.type === 'income');
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  const daySum = filteredCategories.length
    ? filteredCategories.reduce(
        (acc, cat) => {
          const t = categoryTotal(cat.items);
          acc.income += t.income;
          acc.expense += t.expense;
          acc.balance += t.balance;
          return acc;
        },
        { income: 0, expense: 0, balance: 0 }
      )
    : { income: 0, expense: 0, balance: 0 };

  return (
    <div style={styles.dayBlock}>
      <button
        type="button"
        onClick={() => setOpenDay(!openDay)}
        style={styles.dayHeader}
      >
        <span>{formatDate(dayGroup.date)}</span>
        <span style={{ ...styles.dayTotal, color: daySum.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
          {daySum.balance >= 0 ? '+' : ''}{formatEur(daySum.balance)}
        </span>
        <span style={styles.chevron}>{openDay ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}</span>
      </button>
      {openDay && (
        <div style={styles.dayContent}>
          {filteredCategories.map((cat) => {
            const isOpen = openCats[cat.categoryId] !== false;
            const catSum = categoryTotal(cat.items);
            return (
              <div key={`${dayGroup.date}-${cat.categoryId}`} style={styles.catBlock}>
                <button
                  type="button"
                  onClick={() => toggleCat(cat.categoryId)}
                  style={styles.catHeader}
                >
                  <span style={styles.catIcon}>{cat.categoryIcon}</span>
                  <span>{cat.categoryName}</span>
                  <span style={{ ...styles.catTotal, color: catSum.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {catSum.balance >= 0 ? '+' : ''}{formatEur(catSum.balance)}
                  </span>
                  <span style={styles.chevron}>{isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
                </button>
                {isOpen && (
                  <ul style={styles.items}>
                    {cat.items.map((tx) => (
                      <li key={tx.id} style={styles.item}>
                        <div style={styles.itemMain}>
                          <span>{tx.name}</span>
                          <span className={tx.type === 'expense' ? 'expense' : 'income'} style={styles.amount}>
                            {tx.type === 'expense' ? '-' : '+'}
                            {formatEur(tx.amount)}
                          </span>
                        </div>
                        <div style={styles.itemActions}>
                          <button type="button" className="btn-icon-action" onClick={() => onEdit(tx)} style={styles.btnIcon} title="Editar" aria-label="Editar">
                            <IconEdit size={18} />
                          </button>
                          <button type="button" className="btn-icon-action" onClick={() => onDelete(tx.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar">
                            <IconTrash size={18} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  dayBlock: { marginBottom: '0.5rem' },
  dayHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
  },
  dayTotal: { fontWeight: 700, fontSize: '0.95rem' },
  chevron: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  dayContent: { marginTop: '0.25rem', marginLeft: '0.5rem', borderLeft: '2px solid var(--border)', paddingLeft: '0.75rem' },
  catBlock: { marginBottom: '0.5rem' },
  catHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
  },
  catIcon: { fontSize: '1.1rem' },
  catTotal: { marginLeft: 'auto', fontWeight: 600, fontSize: '0.85rem' },
  items: { listStyle: 'none', padding: 0, margin: '0.25rem 0 0 0.5rem' },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginTop: '0.25rem',
  },
  itemMain: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  amount: { fontWeight: 600 },
  itemActions: { display: 'flex', gap: '0.25rem' },
  btnIcon: { padding: 0, fontSize: '1rem', background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  btnIconDanger: { padding: 0, fontSize: '1rem', background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};

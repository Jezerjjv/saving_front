import { useState } from 'react';
import { IconEdit, IconTrash, IconChevronDown, IconChevronRight } from './Icons.jsx';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TransactionAccordion({ dayGroup, filterType, onEdit, onDelete }) {
  const isToday = dayGroup.date === todayStr();
  const [openDay, setOpenDay] = useState(isToday);
  const [openCats, setOpenCats] = useState(() => {
    if (!isToday) return {};
    const o = {};
    (dayGroup.categories || []).forEach((cat) => { o[cat.categoryId] = false; });
    return o;
  });

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

  const allCatsOpen = filteredCategories.every((cat) => openCats[cat.categoryId] !== false);
  const collapseOrExpandAll = (e) => {
    e.stopPropagation();
    const next = allCatsOpen ? false : true;
    setOpenCats((prev) => {
      const nextState = { ...prev };
      filteredCategories.forEach((cat) => {
        nextState[cat.categoryId] = next;
      });
      return nextState;
    });
  };

  return (
    <div style={styles.dayBlock}>
      <div style={styles.dayHeader}>
        <button
          type="button"
          onClick={() => setOpenDay(!openDay)}
          style={styles.dayHeaderToggle}
        >
          <span style={styles.dayDate}>{formatDate(dayGroup.date)}</span>
          <span style={{ ...styles.dayTotal, color: daySum.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {daySum.balance >= 0 ? '+' : ''}{formatEur(daySum.balance)}
          </span>
          <span style={styles.chevron}>{openDay ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}</span>
        </button>
        {openDay && filteredCategories.length > 0 && (
          <button
            type="button"
            onClick={collapseOrExpandAll}
            style={styles.collapseAllBtn}
            title={allCatsOpen ? 'Comprimir todas las categorías' : 'Expandir todas las categorías'}
            aria-label={allCatsOpen ? 'Comprimir categorías' : 'Expandir categorías'}
          >
            {allCatsOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          </button>
        )}
      </div>
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
                  <span style={styles.chevron}>{isOpen ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}</span>
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
                            <IconEdit size={16} />
                          </button>
                          <button type="button" className="btn-icon-action" onClick={() => onDelete(tx.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar">
                            <IconTrash size={16} />
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
  dayBlock: { marginBottom: '0.35rem' },
  dayHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.5rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  dayHeaderToggle: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    padding: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  dayDate: { minWidth: '7rem', textAlign: 'center' },
  dayTotal: { fontWeight: 700, fontSize: '0.85rem' },
  chevron: { color: 'var(--text-muted)', flexShrink: 0 },
  collapseAllBtn: {
    flexShrink: 0,
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  dayContent: { marginTop: '0.2rem', marginLeft: '0.4rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' },
  catBlock: { marginBottom: '0.35rem' },
  catHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.5rem',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    textAlign: 'left',
    cursor: 'pointer',
  },
  catIcon: { fontSize: '1rem' },
  catTotal: { marginLeft: 'auto', fontWeight: 600, fontSize: '0.8rem' },
  items: { listStyle: 'none', padding: 0, margin: '0.2rem 0 0 0.35rem' },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.35rem 0.5rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginTop: '0.2rem',
  },
  itemMain: { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  amount: { fontWeight: 600, fontSize: '0.85rem' },
  itemActions: { display: 'flex', gap: '0.2rem' },
  btnIcon: { padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', width: 28, height: 28, minWidth: 28, minHeight: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  btnIconDanger: { padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', width: 28, height: 28, minWidth: 28, minHeight: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
};

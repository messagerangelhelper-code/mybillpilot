import Icon from "./icons.jsx";
import {
  CATEGORIES, money, dueText, needsApproval, sameMonth, todayISO,
} from "./storage.js";

export default function Home({ data, onApprove, onAdd, onSeeAll, onPremium }) {
  const today = todayISO();
  const monthName = new Date().toLocaleDateString(undefined, { month: "long" });

  const unpaidThisMonth = data.bills.filter((b) => b.nextDue && (sameMonth(b.nextDue) || b.nextDue < today));
  const paidThisMonth = data.payments.filter((p) => sameMonth(p.date));
  const owed = unpaidThisMonth.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const paid = paidThisMonth.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const total = owed + paid;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  const waiting = data.bills
    .filter(needsApproval)
    .sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1));

  const byCategory = CATEGORIES.map((c) => {
    const bills = data.bills.filter((b) => b.category === c.id);
    return { ...c, count: bills.length, sum: bills.reduce((s, b) => s + (Number(b.amount) || 0), 0) };
  }).filter((c) => c.count > 0);

  return (
    <div className="stack">
      <header className="topbar">
        <div>
          <button type="button" className={data.premium ? "plan-chip on" : "plan-chip"} onClick={onPremium}>
            {data.premium ? "Premium" : "Free plan · Upgrade"}
          </button>
          <div className="wordmark">MyBill<span>Pilot</span></div>
        </div>
        <button type="button" className="round-btn" aria-label="Add a bill" onClick={onAdd}>
          <Icon name="plus" />
        </button>
      </header>

      <section className="hero-card">
        <div className="hero-row">
          <span className="eyebrow">Due this month</span>
          <span className="hero-sub">{monthName}</span>
        </div>
        <div className="hero-amount">{money(total)}</div>
        <div className="bar"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="hero-row hero-sub">
          <span>{money(paid)} paid</span>
          <span>{waiting.length} waiting for you</span>
        </div>
      </section>

      {data.bills.length === 0 && (
        <section className="empty">
          <h2>Add your first bill</h2>
          <p>Electric, rent, subscriptions, insurance — add each one once. MyBillPilot reminds you when it's due and asks before you pay.</p>
          <button type="button" className="btn-primary" onClick={onAdd}>Add a bill</button>
        </section>
      )}

      {waiting.map((b) => (
        <button key={b.id} type="button" className="alert-row" onClick={() => onApprove(b.id)}>
          <span className="alert-icon"><Icon name={b.category} size={20} /></span>
          <span className="alert-text">
            <strong>{b.name} — {money(b.amount)}</strong>
            <span>{dueText(b.nextDue)} · Tap to approve</span>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      ))}

      {byCategory.length > 0 && (
        <>
          <div className="section-head">
            <h2>Your bills</h2>
            <button type="button" className="link-btn" onClick={onSeeAll}>See all</button>
          </div>
          <div className="cat-grid">
            {byCategory.map((c) => (
              <div key={c.id} className="cat-tile">
                <Icon name={c.id} />
                <div className="cat-name">{c.label}</div>
                <div className="cat-meta">{money(c.sum)} · {c.count}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

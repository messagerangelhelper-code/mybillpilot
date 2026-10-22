import Icon from "./icons.jsx";
import { billTypeLabel, money, dueText, sameMonth } from "./storage.js";

export default function Bills({ data, onOpen, onAdd }) {
  const bills = [...data.bills].sort((a, b) => (a.nextDue < b.nextDue ? -1 : 1));
  const recent = [...data.payments].filter((p) => sameMonth(p.date)).reverse();

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Bills</h1>
        <button type="button" className="pill-btn" onClick={onAdd}>
          <Icon name="plus" size={18} /> Add bill
        </button>
      </header>

      {bills.length === 0 ? (
        <section className="empty">
          <h2>No bills yet</h2>
          <p>Add a bill and MyBillPilot will keep track of when it's due.</p>
          <button type="button" className="btn-primary" onClick={onAdd}>Add a bill</button>
        </section>
      ) : (
        <ul className="list">
          {bills.map((b) => (
            <li key={b.id}>
              <button type="button" className="list-row" onClick={() => onOpen(b.id)}>
                <span className="list-icon"><Icon name={b.category} size={20} /></span>
                <span className="list-text">
                  <strong>{b.name}{b.autopay && <span className="tag">Autopay</span>}</strong>
                  <span>{billTypeLabel(b)} · {b.autopay ? dueText(b.nextDue).replace(/^Due/, "Charges") : dueText(b.nextDue)}</span>
                </span>
                <span className="list-amount">{money(b.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-head"><h2>Paid this month</h2></div>
          <ul className="list">
            {recent.map((p) => (
              <li key={p.id} className="list-row static">
                <span className="list-icon paid"><Icon name={p.category} size={20} /></span>
                <span className="list-text">
                  <strong>{p.name}</strong>
                  <span>{p.autopay ? "Autopay" : "Paid"} {new Date(p.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </span>
                <span className="list-amount">{money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

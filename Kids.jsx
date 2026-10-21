import { useState } from "react";
import Icon from "./icons.jsx";
import { money, newId, todayISO } from "./storage.js";

function KidForm({ kid, onSave, onCancel, onDelete }) {
  const [f, setF] = useState(kid || { name: "", allowance: "", goalName: "", goalAmount: "" });
  const [error, setError] = useState("");
  function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Enter your child's name.");
    onSave({
      ...f,
      name: f.name.trim(),
      allowance: Number(f.allowance) || 0,
      goalName: f.goalName.trim(),
      goalAmount: Number(f.goalAmount) || 0,
    });
  }
  return (
    <form className="stack" onSubmit={submit}>
      <header className="topbar left">
        <button type="button" className="round-btn" aria-label="Back" onClick={onCancel}><Icon name="back" /></button>
        <h1>{kid ? `Edit ${kid.name}` : "Add a child"}</h1>
      </header>
      <label className="field"><span>Name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={30} /></label>
      <label className="field"><span>Weekly allowance ($)</span><input type="number" min="0" step="0.5" inputMode="decimal" value={f.allowance} onChange={(e) => setF({ ...f, allowance: e.target.value })} placeholder="0" /></label>
      <div className="two-col">
        <label className="field"><span>Saving for (optional)</span><input value={f.goalName} onChange={(e) => setF({ ...f, goalName: e.target.value })} placeholder="e.g. new bike" maxLength={40} /></label>
        <label className="field"><span>Goal ($)</span><input type="number" min="0" step="1" inputMode="decimal" value={f.goalAmount} onChange={(e) => setF({ ...f, goalAmount: e.target.value })} placeholder="0" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary">{kid ? "Save" : "Add child"}</button>
      {kid && <button type="button" className="btn-danger" onClick={() => { if (window.confirm(`Remove ${kid.name}?`)) onDelete(kid.id); }}><Icon name="trash" size={18} /> Remove {kid.name}</button>}
    </form>
  );
}

export default function Kids({ kids, onChange, canAddKid }) {
  const [selectedId, setSelectedId] = useState(kids[0]?.id || null);
  const [editing, setEditing] = useState(null); // null | "new" | kid
  const [chore, setChore] = useState({ name: "", value: "" });
  const [spend, setSpend] = useState("");

  const kid = kids.find((k) => k.id === selectedId) || kids[0];

  function updateKid(id, fn) {
    onChange(kids.map((k) => (k.id === id ? fn(k) : k)));
  }

  function saveKid(k) {
    if (editing === "new") {
      const created = { ...k, id: newId(), balance: 0, chores: [], history: [] };
      onChange([...kids, created]);
      setSelectedId(created.id);
    } else {
      updateKid(k.id, (old) => ({ ...old, ...k }));
    }
    setEditing(null);
  }

  function deleteKid(id) {
    const rest = kids.filter((k) => k.id !== id);
    onChange(rest);
    setSelectedId(rest[0]?.id || null);
    setEditing(null);
  }

  function addEntry(k, amount, note) {
    return { ...k, balance: Math.round((k.balance + amount) * 100) / 100, history: [{ id: newId(), date: todayISO(), amount, note }, ...k.history].slice(0, 50) };
  }

  if (editing) {
    return <KidForm kid={editing === "new" ? null : editing} onSave={saveKid} onCancel={() => setEditing(null)} onDelete={deleteKid} />;
  }

  if (!kid) {
    return (
      <div className="stack">
        <header className="topbar"><h1>Kids allowance</h1></header>
        <section className="empty">
          <h2>Track allowance and chores</h2>
          <p>Add your child, set a weekly allowance, and pay them for chores. Their balance and savings goal stay up to date.</p>
          <button type="button" className="btn-primary" onClick={() => canAddKid() && setEditing("new")}>Add a child</button>
        </section>
      </div>
    );
  }

  const choreTotal = kid.chores.filter((c) => c.done).reduce((s, c) => s + c.value, 0);
  const goalPct = kid.goalAmount > 0 ? Math.min(100, Math.round((kid.balance / kid.goalAmount) * 100)) : 0;

  return (
    <div className="stack">
      <header className="topbar">
        <h1>Kids allowance</h1>
        <button type="button" className="pill-btn" onClick={() => canAddKid() && setEditing("new")}><Icon name="plus" size={18} /> Add child</button>
      </header>

      {kids.length > 1 && (
        <div className="segmented">
          {kids.map((k) => (
            <button key={k.id} type="button" className={k.id === kid.id ? "seg active" : "seg"} onClick={() => setSelectedId(k.id)}>{k.name}</button>
          ))}
        </div>
      )}

      <section className="hero-card">
        <div className="hero-row">
          <span className="eyebrow">{kid.name}'s balance</span>
          <button type="button" className="link-btn light" onClick={() => setEditing(kid)}>Edit</button>
        </div>
        <div className="hero-amount">{money(kid.balance)}</div>
        {kid.goalAmount > 0 && (
          <>
            <div className="hero-row hero-sub"><span>Saving for: {kid.goalName || "a goal"}</span><span>{money(kid.balance)} of {money(kid.goalAmount)}</span></div>
            <div className="bar"><div className="bar-fill" style={{ width: `${goalPct}%` }} /></div>
          </>
        )}
        {kid.allowance > 0 && (
          <button type="button" className="btn-hero" onClick={() => updateKid(kid.id, (k) => addEntry(k, k.allowance, "Weekly allowance"))}>
            Pay weekly allowance ({money(kid.allowance)})
          </button>
        )}
      </section>

      <section className="panel">
        <h2>Chores</h2>
        {kid.chores.length === 0 && <p className="muted">Add chores with a dollar value. Tick them off as they're done.</p>}
        {kid.chores.map((c) => (
          <div key={c.id} className="chore-row">
            <label className="chore-label">
              <input type="checkbox" checked={c.done} onChange={() => updateKid(kid.id, (k) => ({ ...k, chores: k.chores.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) }))} />
              <span>{c.name}</span>
            </label>
            <span className="chore-value">{money(c.value)}</span>
            <button type="button" className="icon-btn" aria-label={`Remove ${c.name}`} onClick={() => updateKid(kid.id, (k) => ({ ...k, chores: k.chores.filter((x) => x.id !== c.id) }))}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <form className="add-row" onSubmit={(e) => {
          e.preventDefault();
          if (!chore.name.trim()) return;
          updateKid(kid.id, (k) => ({ ...k, chores: [...k.chores, { id: newId(), name: chore.name.trim(), value: Number(chore.value) || 0, done: false }] }));
          setChore({ name: "", value: "" });
        }}>
          <label className="sr-only" htmlFor="chore-name">Chore</label>
          <input id="chore-name" value={chore.name} onChange={(e) => setChore({ ...chore, name: e.target.value })} placeholder="New chore" maxLength={40} />
          <label className="sr-only" htmlFor="chore-value">Value in dollars</label>
          <input id="chore-value" type="number" min="0" step="0.5" inputMode="decimal" value={chore.value} onChange={(e) => setChore({ ...chore, value: e.target.value })} placeholder="$" className="narrow" />
          <button type="submit" className="pill-btn">Add</button>
        </form>
        {choreTotal > 0 && (
          <button type="button" className="btn-primary" onClick={() => updateKid(kid.id, (k) => ({
            ...addEntry(k, choreTotal, "Chores"),
            chores: k.chores.map((x) => ({ ...x, done: false })),
          }))}>
            Pay {kid.name} {money(choreTotal)} for chores done
          </button>
        )}
      </section>

      <section className="panel">
        <h2>Spending &amp; history</h2>
        <form className="add-row" onSubmit={(e) => {
          e.preventDefault();
          const amt = Number(spend);
          if (!(amt > 0)) return;
          updateKid(kid.id, (k) => addEntry(k, -amt, "Spent"));
          setSpend("");
        }}>
          <label className="sr-only" htmlFor="spend">Amount spent</label>
          <input id="spend" type="number" min="0" step="0.01" inputMode="decimal" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="Amount spent ($)" />
          <button type="submit" className="pill-btn">Subtract</button>
        </form>
        {kid.history.length > 0 && (
          <ul className="history">
            {kid.history.slice(0, 8).map((h) => (
              <li key={h.id}><span>{h.note}</span><span className={h.amount < 0 ? "neg" : "pos"}>{h.amount < 0 ? "−" : "+"}{money(Math.abs(h.amount))}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

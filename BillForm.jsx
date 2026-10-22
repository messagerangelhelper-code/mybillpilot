import { useState } from "react";
import Icon from "./icons.jsx";
import { CATEGORIES, OTHER_TYPES, todayISO } from "./storage.js";

export default function BillForm({ bill, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(
    bill || { name: "", category: "electric", amount: "", frequency: "monthly", nextDue: todayISO(), payUrl: "", otherType: "" }
  );
  // "custom" = they're typing their own type instead of picking from the list.
  const [otherChoice, setOtherChoice] = useState(
    !bill?.otherType ? "" : OTHER_TYPES.includes(bill.otherType) ? bill.otherType : "custom"
  );
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Give the bill a name, like \"Electric\" or \"Netflix\".");
    if (!(Number(form.amount) > 0)) return setError("Enter the amount you usually pay.");
    if (!form.nextDue) return setError("Pick the next due date.");
    const otherType = form.category === "other"
      ? (otherChoice === "custom" ? (form.otherType || "").trim() : otherChoice)
      : "";
    if (form.category === "other" && !otherType) return setError("Pick what type of bill this is, or type your own.");
    let payUrl = form.payUrl.trim();
    if (payUrl && !/^https?:\/\//i.test(payUrl)) payUrl = "https://" + payUrl;
    onSave({ ...form, name: form.name.trim(), amount: Number(form.amount), payUrl, otherType, autopay: !!form.autopay, snoozedUntil: null });
  }

  return (
    <form className="stack" onSubmit={submit}>
      <header className="topbar left">
        <button type="button" className="round-btn" aria-label="Back" onClick={onCancel}><Icon name="back" /></button>
        <h1>{bill ? "Edit bill" : "Add a bill"}</h1>
      </header>

      <label className="field">
        <span>Name</span>
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Electric, Netflix, Car loan" maxLength={60} />
      </label>

      <label className="field">
        <span>Category</span>
        <select value={form.category} onChange={(e) => set("category", e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      {form.category === "other" && (
        <label className="field">
          <span>Type of bill</span>
          <select value={otherChoice} onChange={(e) => setOtherChoice(e.target.value)}>
            <option value="">Choose a type…</option>
            {OTHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="custom">Something else (type it)</option>
          </select>
        </label>
      )}
      {form.category === "other" && otherChoice === "custom" && (
        <label className="field">
          <span>Your bill type</span>
          <input value={form.otherType || ""} onChange={(e) => set("otherType", e.target.value)} placeholder="e.g. Lawn care, Pet insurance" maxLength={30} />
        </label>
      )}

      <div className="two-col">
        <label className="field">
          <span>Amount ($)</span>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
        </label>
        <label className="field">
          <span>How often</span>
          <select value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
            <option value="once">One time</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Next due date</span>
        <input type="date" value={form.nextDue} onChange={(e) => set("nextDue", e.target.value)} />
      </label>

      <label className="field">
        <span>Payment website (optional)</span>
        <input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" value={form.payUrl} onChange={(e) => set("payUrl", e.target.value)} placeholder="The company's real payment page" />
        <small>Copy it from your bill or the company's official site — not from a text or email link. ScamShield checks it every time you pay.</small>
      </label>

      <label className="check-field">
        <input type="checkbox" checked={!!form.autopay} onChange={(e) => set("autopay", e.target.checked)} />
        <span>
          <strong>Autopay is on with this company</strong>
          <small>Turn on autopay on the company's website first. MyBillPilot won't ask you to approve this bill — it gives you a heads-up before the charge and marks it paid on the due date.</small>
        </span>
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn-primary">{bill ? "Save changes" : "Add bill"}</button>
      {bill && (
        <button type="button" className="btn-danger" onClick={() => { if (window.confirm(`Delete ${bill.name}?`)) onDelete(bill.id); }}>
          <Icon name="trash" size={18} /> Delete this bill
        </button>
      )}
    </form>
  );
}

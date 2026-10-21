// Everything MyBillPilot knows is saved on this device only (localStorage).
// No account, no server copy of anyone's bills.

const KEY = "mybillpilot_v1";

export const FREE_BILL_LIMIT = 5;
export const FREE_KID_LIMIT = 1;

export const CATEGORIES = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "electric", label: "Electric" },
  { id: "gas", label: "Gas" },
  { id: "water", label: "Water" },
  { id: "sewer", label: "Sewer" },
  { id: "charity", label: "Charity" },
  { id: "car", label: "Car payment" },
  { id: "home", label: "Home loan / rent" },
  { id: "insurance", label: "Insurance" },
  { id: "other", label: "Other" },
];

export function categoryLabel(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.label : "Other";
}

const EMPTY = { bills: [], payments: [], kids: [], premium: false };

export function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw === "object") return { ...EMPTY, ...raw };
  } catch {
    /* ignore and start fresh */
  }
  return { ...EMPTY };
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage blocked (private mode) — the app still works for this visit */
  }
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- dates (all as local "YYYY-MM-DD" strings) ----------

export function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISO(new Date());
}

export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Next month, keeping the same day where possible (Jan 31 -> Feb 28).
export function addMonths(iso, n) {
  const d = fromISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, last));
  return toISO(target);
}

export function daysUntil(iso) {
  const ms = fromISO(iso) - fromISO(todayISO());
  return Math.round(ms / 86400000);
}

export function sameMonth(iso, ref = todayISO()) {
  return iso.slice(0, 7) === ref.slice(0, 7);
}

export function prettyDate(iso) {
  return fromISO(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function dueText(iso) {
  const n = daysUntil(iso);
  if (n < 0) return `Overdue by ${-n} day${n === -1 ? "" : "s"}`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n <= 6) return `Due ${fromISO(iso).toLocaleDateString(undefined, { weekday: "long" })}`;
  return `Due ${prettyDate(iso)}`;
}

export function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// When a bill is paid, roll it forward to its next due date.
export function nextDueAfterPayment(bill) {
  if (bill.frequency === "monthly") return addMonths(bill.nextDue, 1);
  if (bill.frequency === "yearly") return addMonths(bill.nextDue, 12);
  if (bill.frequency === "weekly") return addDays(bill.nextDue, 7);
  return null; // one-time bill: done
}

// A bill "needs you" when it's due within a week (or overdue) and not snoozed.
export function needsApproval(bill) {
  if (!bill.nextDue) return false;
  if (bill.snoozedUntil && bill.snoozedUntil > todayISO()) return false;
  return daysUntil(bill.nextDue) <= 7;
}

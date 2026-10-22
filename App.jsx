import { useEffect, useState } from "react";
import Icon from "./icons.jsx";
import Home from "./Home.jsx";
import Bills from "./Bills.jsx";
import BillForm from "./BillForm.jsx";
import Approve from "./Approve.jsx";
import Cards from "./Cards.jsx";
import Kids from "./Kids.jsx";
import Premium from "./Premium.jsx";
import { checkPremium } from "./premium.js";
import {
  loadData, saveData, newId, settleAutopay, todayISO, addDays, nextDueAfterPayment,
  FREE_BILL_LIMIT, FREE_KID_LIMIT,
} from "./storage.js";

const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "bills", label: "Bills", icon: "bills" },
  { id: "cards", label: "Cards", icon: "card" },
  { id: "kids", label: "Kids", icon: "kids" },
];

export default function App() {
  const [data, setData] = useState(() => settleAutopay(loadData()));
  const [tab, setTab] = useState("home");
  const [editing, setEditing] = useState(null); // null | "new" | bill
  const [approvingId, setApprovingId] = useState(null);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => saveData(data), [data]);

  const [notice, setNotice] = useState("");

  // Confirm a Premium purchase after Stripe checkout, and re-check it now and then.
  useEffect(() => {
    let cancelled = false;
    checkPremium(data).then((changes) => {
      if (cancelled || !changes) return;
      const { justUpgraded, premiumError, ...rest } = changes;
      if (premiumError) setNotice(premiumError);
      if (Object.keys(rest).length) setData((d) => ({ ...d, ...rest }));
      if (justUpgraded) setShowPremium(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- bills ----------
  function startNewBill() {
    if (!data.premium && data.bills.length >= FREE_BILL_LIMIT) {
      setShowPremium(true);
      return;
    }
    setEditing("new");
  }

  function saveBill(bill) {
    setData((d) => {
      const exists = d.bills.some((b) => b.id === bill.id);
      const bills = exists
        ? d.bills.map((b) => (b.id === bill.id ? bill : b))
        : [...d.bills, { ...bill, id: newId() }];
      return { ...d, bills };
    });
    setEditing(null);
  }

  function deleteBill(id) {
    setData((d) => ({ ...d, bills: d.bills.filter((b) => b.id !== id) }));
    setEditing(null);
    setApprovingId(null);
  }

  function markPaid(bill) {
    setData((d) => {
      const payment = {
        id: newId(), billId: bill.id, name: bill.name, category: bill.category,
        amount: Number(bill.amount) || 0, date: todayISO(),
      };
      const next = nextDueAfterPayment(bill);
      const bills = next
        ? d.bills.map((b) => (b.id === bill.id ? { ...b, nextDue: next, snoozedUntil: null } : b))
        : d.bills.filter((b) => b.id !== bill.id);
      return { ...d, bills, payments: [...d.payments, payment] };
    });
    setApprovingId(null);
  }

  function snooze(bill) {
    setData((d) => ({
      ...d,
      bills: d.bills.map((b) => (b.id === bill.id ? { ...b, snoozedUntil: addDays(todayISO(), 1) } : b)),
    }));
    setApprovingId(null);
  }

  // ---------- kids ----------
  function updateKids(kids) {
    setData((d) => ({ ...d, kids }));
  }

  function canAddKid() {
    if (!data.premium && data.kids.length >= FREE_KID_LIMIT) {
      setShowPremium(true);
      return false;
    }
    return true;
  }

  const approving = data.bills.find((b) => b.id === approvingId);

  let screen;
  if (editing) {
    screen = (
      <BillForm
        bill={editing === "new" ? null : editing}
        onSave={saveBill}
        onCancel={() => setEditing(null)}
        onDelete={deleteBill}
      />
    );
  } else if (approving) {
    screen = (
      <Approve
        bill={approving}
        onBack={() => setApprovingId(null)}
        onPaid={markPaid}
        onSnooze={snooze}
        onEdit={() => { setEditing(approving); setApprovingId(null); }}
      />
    );
  } else if (tab === "home") {
    screen = <Home data={data} onApprove={setApprovingId} onAdd={startNewBill} onSeeAll={() => setTab("bills")} onPremium={() => setShowPremium(true)} />;
  } else if (tab === "bills") {
    screen = <Bills data={data} onOpen={setApprovingId} onAdd={startNewBill} />;
  } else if (tab === "cards") {
    screen = <Cards />;
  } else {
    screen = <Kids kids={data.kids} onChange={updateKids} canAddKid={canAddKid} />;
  }

  const fullScreen = editing || approving;

  return (
    <div className="app">
      <main className="screen">
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button type="button" className="link-btn" onClick={() => setNotice("")}>OK</button>
          </div>
        )}
        {screen}
      </main>

      {!fullScreen && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "tab active" : "tab"}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>
      )}

      {showPremium && (
        <Premium
          premium={data.premium}
          plan={data.premiumPlan}
          onClose={() => setShowPremium(false)}
        />
      )}
    </div>
  );
}

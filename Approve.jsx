import { useEffect, useState } from "react";
import Icon from "./icons.jsx";
import { categoryLabel, money, dueText } from "./storage.js";

const SCAMSHIELD_API = import.meta.env.VITE_SCAMSHIELD_API || "https://scamshield-api-ww2t.onrender.com";

export default function Approve({ bill, onBack, onPaid, onSnooze, onEdit }) {
  const [check, setCheck] = useState({ status: bill.payUrl ? "loading" : "none" });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!bill.payUrl) return;
    let cancelled = false;
    fetch(`${SCAMSHIELD_API}/api/url-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [bill.payUrl] }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const flagged = Array.isArray(d.flagged_urls) && d.flagged_urls.length > 0;
        setCheck({
          status: flagged ? "flagged" : "clean",
          reasons: d.details?.heuristics?.reasons || [],
          newSite: d.details?.domain_age?.is_new_domain ? d.details.domain_age.age_days : null,
          sources: d.sources_checked || [],
        });
      })
      .catch(() => !cancelled && setCheck({ status: "error" }));
    return () => { cancelled = true; };
  }, [bill.payUrl]);

  function openPayment() {
    window.open(bill.payUrl, "_blank", "noopener,noreferrer");
    setConfirming(true);
  }

  let host = "";
  try { host = bill.payUrl ? new URL(bill.payUrl).hostname : ""; } catch { host = bill.payUrl; }

  return (
    <div className="stack approve">
      <header className="topbar left">
        <button type="button" className="round-btn" aria-label="Back" onClick={onBack}><Icon name="back" /></button>
        <h1>Approve this payment?</h1>
      </header>

      <section className="bill-card">
        <span className="bill-icon"><Icon name={bill.category} size={28} /></span>
        <div className="muted">{bill.name.toLowerCase() === categoryLabel(bill.category).toLowerCase() ? bill.name : `${categoryLabel(bill.category)} · ${bill.name}`}</div>
        <div className="bill-amount">{money(bill.amount)}</div>
        <div className="due-text">{dueText(bill.nextDue)}</div>
        {host && <div className="muted small">Pays at {host}</div>}
      </section>

      {check.status === "loading" && (
        <section className="check-card"><div className="check-head"><Icon name="shield" /> Checking the payment page with ScamShield…</div></section>
      )}
      {check.status === "clean" && (
        <section className="check-card">
          <div className="check-head"><Icon name="shield" /> Checked by ScamShield</div>
          <p>No warning signs found on this payment page.</p>
          {check.sources.length > 0 && <p className="check-sub">Checked: {check.sources.join(", ")}</p>}
        </section>
      )}
      {check.status === "flagged" && (
        <section className="check-card danger">
          <div className="check-head"><Icon name="shield" /> ScamShield warning</div>
          <p><strong>Don't pay through this link.</strong> Go to the company's official website or the number on your paper bill instead.</p>
          <ul>
            {check.reasons.map((r) => <li key={r}>{r}</li>)}
            {check.newSite !== null && <li>This website is only {check.newSite} days old.</li>}
          </ul>
        </section>
      )}
      {check.status === "error" && (
        <section className="check-card muted-card">
          <div className="check-head"><Icon name="shield" /> Couldn't check the link right now</div>
          <p>Make sure the address matches the one on your paper bill before you pay.</p>
        </section>
      )}

      {confirming ? (
        <section className="confirm">
          <h2>Did you finish paying?</h2>
          <button type="button" className="btn-primary" onClick={() => onPaid(bill)}>Yes, mark it paid</button>
          <button type="button" className="btn-secondary" onClick={() => setConfirming(false)}>Not yet</button>
        </section>
      ) : (
        <div className="actions">
          {bill.payUrl && check.status !== "flagged" && (
            <button type="button" className="btn-primary" onClick={openPayment}>Approve &amp; open payment page</button>
          )}
          <button type="button" className={bill.payUrl && check.status !== "flagged" ? "btn-secondary" : "btn-primary"} onClick={() => onPaid(bill)}>
            Already paid — mark as paid
          </button>
          <div className="two-col">
            <button type="button" className="btn-secondary" onClick={() => onSnooze(bill)}>Remind me tomorrow</button>
            <button type="button" className="btn-secondary" onClick={onEdit}>Edit bill</button>
          </div>
          <p className="fine">You always pay on the company's own website. MyBillPilot never asks for your bank password.</p>
        </div>
      )}
    </div>
  );
}

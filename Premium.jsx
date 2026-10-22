import { useState } from "react";
import { startCheckout } from "./premium.js";

export default function Premium({ premium, plan, onClose }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function buy(which) {
    setBusy(which);
    setError("");
    try {
      await startCheckout(which);
    } catch (e) {
      setError(e.message);
      setBusy(null);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="premium-title">
      <div className="modal">
        <h2 id="premium-title">{premium ? "You're on Premium" : "Upgrade to Premium"}</h2>
        {premium ? (
          <p>Unlimited bills and kids{plan === "mbp_yearly" ? " on the yearly plan" : plan === "mbp_monthly" ? " on the monthly plan" : ""}. Thanks for supporting MyBillPilot.</p>
        ) : (
          <>
            <p>The free plan covers up to 5 bills and 1 child. Premium removes the limits:</p>
            <ul className="ticks plain">
              <li>Unlimited bills in every category</li>
              <li>Allowance tracking for every child</li>
            </ul>
            <div className="plan-grid">
              <button type="button" className="plan-btn" onClick={() => buy("mbp_monthly")} disabled={!!busy}>
                <span className="plan-price">$4.99</span>
                <span className="plan-per">per month</span>
                {busy === "mbp_monthly" && <span className="plan-per">Opening checkout…</span>}
              </button>
              <button type="button" className="plan-btn best" onClick={() => buy("mbp_yearly")} disabled={!!busy}>
                <span className="plan-tag">Save 18%</span>
                <span className="plan-price">$49</span>
                <span className="plan-per">per year</span>
                {busy === "mbp_yearly" && <span className="plan-per">Opening checkout…</span>}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            <p className="fine">Secure checkout by Stripe through CashCow. Cancel anytime. Premium is unlocked on the device you buy it on.</p>
          </>
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>{premium ? "Close" : "Not now"}</button>
      </div>
    </div>
  );
}

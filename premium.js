// Premium is bought through CashCow's Stripe checkout, then confirmed here.
const CASHCOW_API = import.meta.env.VITE_CASHCOW_API || "https://cashcow-reviews-api.onrender.com";
const RECHECK_DAYS = 7;

export async function startCheckout(plan) {
  const res = await fetch(`${CASHCOW_API}/api/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.detail || "Couldn't start checkout. Please try again.");
  }
  window.location.href = data.url;
}

async function verify(sessionId) {
  const res = await fetch(`${CASHCOW_API}/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error("verify failed");
  return res.json(); // { premium: true|false, plan }
}

// Runs when the app opens. Returns changes to apply to the saved data, or null.
export async function checkPremium(data) {
  const params = new URLSearchParams(window.location.search);
  const fromCheckout = params.get("session_id");

  if (fromCheckout) {
    // Clean the address bar so a refresh doesn't re-run this.
    window.history.replaceState({}, "", window.location.pathname);
    try {
      const r = await verify(fromCheckout);
      return r.premium
        ? { premium: true, premiumSession: fromCheckout, premiumPlan: r.plan, premiumCheckedAt: Date.now(), justUpgraded: true }
        : { premiumError: "We couldn't confirm that payment yet. If you were charged, reopen the app in a minute." };
    } catch {
      return { premiumError: "We couldn't confirm your payment right now. Please reopen the app shortly." };
    }
  }

  // Re-check an existing subscription every few days (catches cancellations).
  if (data.premium && data.premiumSession) {
    const age = Date.now() - (data.premiumCheckedAt || 0);
    if (age > RECHECK_DAYS * 86400000) {
      try {
        const r = await verify(data.premiumSession);
        return r.premium ? { premiumCheckedAt: Date.now() } : { premium: false, premiumSession: null, premiumPlan: null };
      } catch {
        return null; // offline or server asleep: keep Premium, try again next time
      }
    }
  }
  return null;
}

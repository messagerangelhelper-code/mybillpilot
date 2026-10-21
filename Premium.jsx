const CASHCOW_URL = "https://cashcowai.online/";

export default function Premium({ premium, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="premium-title">
      <div className="modal">
        <h2 id="premium-title">{premium ? "You're on Premium" : "Upgrade to Premium"}</h2>
        {premium ? (
          <p>Unlimited bills and kids. Thanks for supporting MyBillPilot.</p>
        ) : (
          <>
            <p>The free plan covers up to 5 bills and 1 child. Premium removes the limits:</p>
            <ul className="ticks plain">
              <li>Unlimited bills in every category</li>
              <li>Allowance tracking for every child</li>
            </ul>
            <a className="btn-primary as-link" href={CASHCOW_URL} target="_blank" rel="noopener noreferrer">Get Premium on CashCow</a>
          </>
        )}
        <button type="button" className="btn-secondary" onClick={onClose}>{premium ? "Close" : "Not now"}</button>
      </div>
    </div>
  );
}

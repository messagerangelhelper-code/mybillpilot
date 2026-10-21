import Icon from "./icons.jsx";

export default function Cards() {
  return (
    <div className="stack">
      <header className="topbar"><h1>Card controls</h1></header>

      <section className="hero-card card-preview" aria-label="Card preview">
        <div className="hero-row">
          <div className="wordmark small">MyBill<span>Pilot</span></div>
          <span className="badge">COMING SOON</span>
        </div>
        <div className="card-number">•••• •••• •••• ••••</div>
      </section>

      <section className="empty left">
        <h2>Your own MyBillPilot card is on the way</h2>
        <p>Soon you'll be able to:</p>
        <ul className="ticks">
          <li><Icon name="lock" size={18} /> Lock your card instantly if it's lost or misused</li>
          <li><Icon name="card" size={18} /> Set monthly spending limits</li>
          <li><Icon name="kids" size={18} /> Give kids their own card with limits you control</li>
        </ul>
        <p className="fine">Until then, MyBillPilot tracks your bills and kids' allowances, and checks every payment page with ScamShield.</p>
      </section>
    </div>
  );
}

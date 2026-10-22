import { useState } from "react";
import Icon from "./icons.jsx";
import { scanBill } from "./billReader.js";

// "Scan a bill" box at the top of the Add a bill form.
export default function ScanBill({ onResult }) {
  const [status, setStatus] = useState("idle"); // idle | working | done | empty | error
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let them pick the same picture again
    if (!file) return;
    setStatus("working");
    setMessage("Opening the picture…");
    try {
      const r = await scanBill(file, setMessage);
      setResult(r);
      if (r.found.length === 0) {
        setStatus("empty");
      } else {
        onResult(r);
        setStatus("done");
      }
    } catch {
      setStatus("error");
    }
  }

  const working = status === "working";

  return (
    <section className="scan-card" aria-busy={working}>
      <div className="scan-head">
        <span className="scan-icon"><Icon name="scan" size={20} /></span>
        <strong>Scan a bill</strong>
      </div>
      <p>Take a photo of a paper bill or pick a screenshot of an e-bill. We'll fill in what we can read. The picture stays on your phone.</p>

      <div className="two-col">
        <label className={working ? "btn-secondary file-btn disabled" : "btn-secondary file-btn"}>
          <Icon name="camera" size={18} /> Camera
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleFile} disabled={working} />
        </label>
        <label className={working ? "btn-secondary file-btn disabled" : "btn-secondary file-btn"}>
          <Icon name="image" size={18} /> Screenshot
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={working} />
        </label>
      </div>

      {working && (
        <div className="scan-status" role="status">
          <span className="spinner" aria-hidden="true" /> {message}
        </div>
      )}

      {status === "done" && result && (
        <div className="scan-result" role="status">
          <p><strong>Filled in:</strong> {result.found.join(", ")}.</p>
          {result.missing.length > 0 && <p>Couldn't find the {result.missing.join(", ")} — type {result.missing.length > 1 ? "them" : "it"} in below.</p>}
          {result.pastDue && <p>The due date we read has already passed. Change it to the next due date if this bill is paid.</p>}
          <p className="scan-check">Check everything before you save. The scanner can misread blurry text.</p>
        </div>
      )}

      {status === "empty" && (
        <div className="scan-result warn" role="status">
          <p>We couldn't read this bill. Try a closer, brighter photo with the whole bill flat in the frame, or type it in below.</p>
        </div>
      )}

      {status === "error" && (
        <div className="scan-result warn" role="status">
          <p>The scanner couldn't start. Check your internet connection (it needs it the first time) and try again, or type the bill in below.</p>
        </div>
      )}
    </section>
  );
}

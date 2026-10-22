// Reads a photo or screenshot of a bill and pulls out what it can:
// company name, amount due, due date, payment website and a category guess.
// Everything runs on the phone — the picture is never uploaded anywhere.

import { OTHER_TYPES, todayISO } from "./storage.js";

// ---------- image helpers ----------

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That picture couldn't be opened.")); };
    img.src = url;
  });
}

function drawScaled(img, { maxSide, minSide = 0, gray = false }) {
  const longSide = Math.max(img.naturalWidth, img.naturalHeight);
  let scale = 1;
  if (longSide > maxSide) scale = maxSide / longSide;
  else if (minSide && longSide < minSide) scale = Math.min(2, minSide / longSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (gray) ctx.filter = "grayscale(1) contrast(1.2)";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function readQR(img) {
  try {
    const { default: jsQR } = await import("jsqr");
    const canvas = drawScaled(img, { maxSide: 1600 });
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
    return code?.data || "";
  } catch {
    return "";
  }
}

// One text reader is reused for every scan in this visit.
let workerPromise = null;
let progressListener = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js")
      .then(({ createWorker }) => createWorker("eng", 1, {
        logger: (m) => progressListener && progressListener(m),
      }));
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

// onProgress gets a short message to show while it works.
export async function scanBill(file, onProgress = () => {}) {
  onProgress("Opening the picture…");
  const img = await loadImage(file);

  const qr = await readQR(img);

  progressListener = (m) => {
    if (m.status === "recognizing text") onProgress(`Reading your bill… ${Math.round((m.progress || 0) * 100)}%`);
    else onProgress("Getting the scanner ready…");
  };
  onProgress("Getting the scanner ready…");
  let text = "";
  try {
    const worker = await getWorker();
    const canvas = drawScaled(img, { maxSide: 2200, minSide: 1400, gray: true });
    const { data } = await worker.recognize(canvas);
    text = data?.text || "";
  } finally {
    progressListener = null;
  }

  return parseBillText(text, qr);
}

// ---------- reading the text ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONEY_RE = /\$?\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;

function pad(n) { return String(n).padStart(2, "0"); }

function validISO(y, m, d) {
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

// A date with no year: use this year, or next year if that's well in the past.
function withYear(m, d) {
  const now = new Date();
  let y = now.getFullYear();
  const iso = validISO(y, m, d);
  if (!iso) return null;
  const ageDays = (now - new Date(y, m - 1, d)) / 86400000;
  if (ageDays > 60) y += 1;
  return validISO(y, m, d);
}

function fixYear(y) {
  y = Number(y);
  return y < 100 ? 2000 + y : y;
}

// Finds the first date in a piece of text. Returns "YYYY-MM-DD" or null.
export function findDate(str) {
  const s = str.replace(/[|]/g, " ");
  const hits = [];
  let m;
  const numeric = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/g;
  while ((m = numeric.exec(s))) hits.push({ at: m.index, iso: validISO(fixYear(m[3]), Number(m[1]), Number(m[2])) });
  const isoRe = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = isoRe.exec(s))) hits.push({ at: m.index, iso: validISO(Number(m[1]), Number(m[2]), Number(m[3])) });
  const monthFirst = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b,?\s*(\d{4})?/gi;
  while ((m = monthFirst.exec(s))) {
    const mon = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    hits.push({ at: m.index, iso: m[3] ? validISO(Number(m[3]), mon, Number(m[2])) : withYear(mon, Number(m[2])) });
  }
  const dayFirst = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(\d{4})?/gi;
  while ((m = dayFirst.exec(s))) {
    const mon = MONTHS.indexOf(m[2].toLowerCase()) + 1;
    hits.push({ at: m.index, iso: m[3] ? validISO(Number(m[3]), mon, Number(m[1])) : withYear(mon, Number(m[1])) });
  }
  const good = hits.filter((h) => h.iso).sort((a, b) => a.at - b.at);
  return good.length ? good[0].iso : null;
}

// Finds the first non-zero dollar amount in a piece of text.
export function findMoney(str) {
  const s = str.replace(/(\d)\s*[,]\s*(\d{2})(?!\d)/g, "$1.$2"); // "45,20" read as "45.20"
  for (const m of s.matchAll(MONEY_RE)) {
    const value = Number(m[1].replace(/,/g, "") + "." + m[2]);
    if (value > 0 && value < 1000000) return value.toFixed(2);
  }
  return null;
}

// Look for a keyword, then a value on the same line (after the keyword) or the next two lines.
function findNear(lines, patterns, finder) {
  for (const re of patterns) {
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].match(re);
      if (!m) continue;
      const after = lines[i].slice(m.index + m[0].length);
      const found = finder(after) || finder(lines[i + 1] || "") || finder(lines[i + 2] || "");
      if (found) return found;
    }
  }
  return null;
}

const AMOUNT_PATTERNS = [
  /(total\s+)?amount\s+(now\s+)?due|total\s+(now\s+)?due|balance\s+due|amount\s+(you\s+)?owe|please\s+pay|pay\s+this\s+amount|amount\s+to\s+pay|current\s+(amount|balance)\s+due|amount\s+enclosed/i,
  /new\s+balance|statement\s+balance|total\s+balance|total\s+current\s+charges|current\s+charges|premium\s+due|total\s+charges/i,
  /minimum\s+(payment\s+)?due|payment\s+due|\bdue\b/i,
];

const DATE_PATTERNS = [
  /due\s+date|pay(ment)?\s+by|due\s+by|due\s+on|please\s+pay\s+by|must\s+be\s+received\s+by|payment\s+due/i,
  /auto\s*-?pay(ment)?\s+(date|on|scheduled)|draft\s+date|renews?\s+on|next\s+(billing|payment|charge)|will\s+be\s+charged\s+on|billing\s+date|\bdue\b/i,
];

const TLD = "com|net|org|gov|us|biz|info|co|io|coop|bank|edu";
const URL_RE = new RegExp(
  `(?:https?:\\/\\/)?(?:www\\.)?[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9-]+)*\\.(?:${TLD})(?![a-z0-9-])(?:\\/[^\\s,;)"']*)?`,
  "gi"
);

export function findWebsite(lines) {
  let best = null;
  lines.forEach((line) => {
    for (const m of line.matchAll(URL_RE)) {
      const before = line[m.index - 1];
      if (before === "@" || /[a-z0-9]/i.test(before || "")) continue; // email address or part of a word
      let url = m[0].replace(/[.,:;]+$/, "");
      if (!/[a-z]{2,}\./i.test(url.replace(/^https?:\/\/(www\.)?/i, "") + ".")) continue;
      let score = 1;
      if (/pay|online|visit|go to|website|web:|manage/i.test(line)) score += 3;
      if (/\/.*pay/i.test(url)) score += 2;
      if (/^(https?:\/\/)?www\./i.test(url)) score += 1;
      if (!best || score > best.score) best = { url, score };
    }
  });
  if (!best) return null;
  return /^https?:\/\//i.test(best.url) ? best.url : "https://" + best.url.toLowerCase();
}

// Well-known companies: if one shows up, we know the name and the type.
const BRANDS = [
  ["Netflix", "subscriptions"], ["Spotify", "subscriptions"], ["Hulu", "subscriptions"], ["Disney+", "subscriptions", /disney\s*\+|disney\s*plus/i],
  ["YouTube TV", "subscriptions", /youtube\s*tv/i], ["Amazon Prime", "subscriptions", /amazon\s*prime/i], ["Apple", "subscriptions", /apple\.com\/bill|apple\s+one|icloud/i],
  ["Max", "subscriptions", /\bhbo\s*max\b/i], ["Paramount+", "subscriptions", /paramount\s*\+|paramount\s*plus/i], ["Peacock", "subscriptions"],
  ["Verizon", "other", null, "Phone"], ["AT&T", "other", /\bat\s*&\s*t\b/i, "Phone"], ["T-Mobile", "other", /t\s*-\s*mobile/i, "Phone"],
  ["Cricket Wireless", "other", /cricket\s+wireless/i, "Phone"], ["Boost Mobile", "other", /boost\s+mobile/i, "Phone"],
  ["Xfinity", "other", null, "Internet"], ["Comcast", "other", null, "Internet"], ["Spectrum", "other", null, "Internet"],
  ["Cox", "other", /\bcox\s+communications\b/i, "Internet"], ["Frontier", "other", /frontier\s+communications/i, "Internet"],
  ["DIRECTV", "other", /direc\s*tv/i, "Cable / TV"], ["DISH", "other", /\bdish\s+network\b/i, "Cable / TV"],
  ["GEICO", "insurance"], ["Progressive", "insurance", /progressive\s+(insurance|casualty|direct)/i], ["State Farm", "insurance", /state\s+farm/i],
  ["Allstate", "insurance"], ["Liberty Mutual", "insurance", /liberty\s+mutual/i], ["USAA", "insurance"], ["Nationwide", "insurance", /nationwide\s+(insurance|mutual)/i],
  ["Farmers Insurance", "insurance", /farmers\s+insurance/i],
  ["Waste Management", "other", /waste\s+management/i, "Trash"], ["Republic Services", "other", /republic\s+services/i, "Trash"],
  ["Nelnet", "other", null, "Student loan"], ["MOHELA", "other", null, "Student loan"], ["Aidvantage", "other", null, "Student loan"],
  ["Planet Fitness", "other", /planet\s+fitness/i, "Gym / fitness"],
];

function findBrand(text) {
  for (const [name, category, re, otherType] of BRANDS) {
    const pattern = re || new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(text)) return { name, category, otherType: otherType || "" };
  }
  return null;
}

// Words that tell us what kind of bill it is. More hits = better guess.
const CATEGORY_WORDS = [
  ["electric", "", /\bkwh\b|kilowatt|electric(ity)?\b|\bpower\s+(company|co|bill)/gi],
  ["gas", "", /\btherms?\b|natural\s+gas|gas\s+(service|usage|charges|bill)/gi],
  ["water", "", /\bwater\b|\bgallons\b/gi],
  ["sewer", "", /\bsewer\b|wastewater/gi],
  ["insurance", "", /insurance|\bpolicy\b|\binsured\b|coverage|premium/gi],
  ["home", "", /mortgage|escrow|\bprincipal\b|\brent\b|\blease\b|landlord|property\s+management/gi],
  ["car", "", /auto\s+loan|vehicle|\bvin\b|car\s+payment|auto\s+financ|motor\s+credit/gi],
  ["charity", "", /donation|pledge|tithe|charitable|ministr(y|ies)/gi],
  ["subscriptions", "", /subscription|membership|renews?\b|streaming/gi],
  ["other", "Credit card", /credit\s+card|minimum\s+payment|credit\s+limit|\bapr\b|purchases/gi],
  ["other", "Phone", /wireless|cellular|mobile\s+(service|plan)|talk\s*&\s*text|\blines?\s+on\s+account/gi],
  ["other", "Internet", /internet|broadband|\bmbps\b|\bgbps\b|\bwi-?fi\b|fiber/gi],
  ["other", "Cable / TV", /\bcable\b|\btv\b|channels|\bdvr\b/gi],
  ["other", "Trash", /\btrash\b|garbage|refuse|sanitation|recycling/gi],
  ["other", "Student loan", /student\s+loan/gi],
  ["other", "Personal loan", /personal\s+loan|installment\s+loan/gi],
  ["other", "Medical", /\bpatient\b|hospital|clinic|physician|medical|date\s+of\s+service/gi],
  ["other", "Gym / fitness", /\bgym\b|fitness/gi],
  ["other", "Taxes", /property\s+tax|tax\s+bill|assessor|tax\s+collector/gi],
  ["other", "HOA fees", /\bhoa\b|homeowners?\s+association/gi],
  ["other", "Childcare", /daycare|child\s*care|preschool/gi],
  ["other", "Storage unit", /storage\s+unit|self\s+storage/gi],
];

export function guessCategory(text) {
  let best = null;
  for (const [category, otherType, re] of CATEGORY_WORDS) {
    const hits = (text.match(re) || []).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { category, otherType, hits };
  }
  return best ? { category: best.category, otherType: best.otherType } : null;
}

const COMPANY_WORDS = /\b(energy|electric|power|light|gas|water|utilit(y|ies)|insurance|bank|mortgage|wireless|mobile|telecom|communications|cable|broadband|financial|finance|credit\s+union|motors|services|company|inc|llc|corp(oration)?|authority|district|city\s+of|county|town\s+of|village\s+of|hospital|health|medical|clinic|lending|loans?|servicing|association)\b/i;
const NOT_A_NAME = /statement|account|invoice|page\s+\d|date|amount|total|balance|customer\s+(number|no|id)|service\s+address|bill\s+to|p\.?\s*o\.?\s*box|remit|return\s+service|thank\s+you|questions|www\.|\.com|@/i;

function tidyName(line) {
  let s = line.replace(/[^a-z0-9&'.,\- ]/gi, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/[,.\- ]+(inc|llc|corp|co)\.?$/i, "").replace(/[,.\- ]+$/, "");
  if (s === s.toUpperCase()) s = s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  return s;
}

function nameFromWebsite(url) {
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    let label = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2];
    label = label.replace(/-/g, " ").replace(/(energy|power|electric|gas|water|insurance|bank|mobile|wireless|utilities|services|financial)$/i, " $1");
    return label.trim().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  } catch {
    return null;
  }
}

export function findCompany(lines) {
  const top = lines.slice(0, 20);
  for (const raw of top) {
    const line = raw.trim();
    if (line.length < 3 || line.length > 50) continue;
    if (NOT_A_NAME.test(line) || /\d{3,}/.test(line)) continue;
    const letters = (line.match(/[a-z]/gi) || []).length;
    if (letters / line.length < 0.6) continue;
    if (COMPANY_WORDS.test(line)) return tidyName(line);
  }
  return null;
}

// Turns the text from a bill (and its QR code, if any) into form fields.
export function parseBillText(text, qr = "") {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const fields = {};
  const found = [];

  const brand = findBrand(text);
  const qrUrl = /^https?:\/\/\S+$/i.test(qr.trim()) ? qr.trim() : "";
  const website = qrUrl || findWebsite(lines);

  const name = brand?.name || findCompany(lines) || (website ? nameFromWebsite(website) : null);
  if (name) { fields.name = name.slice(0, 60); found.push("name"); }

  let amount = findNear(lines, AMOUNT_PATTERNS, findMoney);
  if (!amount) {
    // Simple receipts (like a streaming plan) often show just one price.
    const prices = new Set(lines.map(findMoney).filter(Boolean));
    if (prices.size === 1) amount = [...prices][0];
  }
  if (amount) { fields.amount = amount; found.push("amount"); }

  const due = findNear(lines, DATE_PATTERNS, findDate);
  if (due) { fields.nextDue = due; found.push("due date"); }

  if (website) { fields.payUrl = website; found.push(qrUrl ? "payment website (from the QR code)" : "payment website"); }

  const guess = brand ? { category: brand.category, otherType: brand.otherType } : guessCategory(text);
  if (guess) {
    fields.category = guess.category;
    fields.otherType = guess.category === "other" ? guess.otherType : "";
    found.push("type of bill");
  }

  const missing = ["name", "amount", "due date", "payment website"].filter(
    (f) => !found.some((x) => x.startsWith(f))
  );
  const pastDue = due && due < todayISO();
  return { fields, found, missing, pastDue, textLength: text.trim().length, otherTypeKnown: OTHER_TYPES.includes(fields.otherType) };
}

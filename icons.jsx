// Simple stroke icons (no icon library needed).
const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const PATHS = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /></>,
  bills: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  kids: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M15 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5" /></>,
  subscriptions: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3z" /></>,
  electric: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  gas: <path d="M12 22c4 0 7-3 7-7 0-4-4-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z" />,
  water: <path d="M12 2.7s6 6.3 6 11.3a6 6 0 0 1-12 0c0-5 6-11.3 6-11.3z" />,
  sewer: <><path d="M4 4h16v4H4z" /><path d="M8 8v12" /><path d="M16 8v12" /><path d="M4 20h16" /></>,
  charity: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />,
  car: <><path d="M5 17h14v-5l-2-5H7l-2 5z" /><circle cx="8" cy="17" r="2" /><circle cx="16" cy="17" r="2" /></>,
  insurance: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  other: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></>,
};

export default function Icon({ name, size = 22 }) {
  const key = name === "home" || PATHS[name] ? name : "other";
  return (
    <svg {...base} width={size} height={size}>
      {PATHS[key]}
    </svg>
  );
}

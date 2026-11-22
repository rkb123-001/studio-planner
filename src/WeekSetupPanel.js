import { useState } from "react";
import GridImportPanel from "./GridImportPanel";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const RED = "#b01904";
const small = { fontFamily: TNR, fontSize: "12px", color: "#888" };
const btn = (on) => ({
  display: "inline-block", padding: "5px 14px", border: `1px solid ${on ? LINK_BLUE : "#1a1a1a"}`, background: "#fff",
  color: on ? LINK_BLUE : "#1a1a1a", fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none",
});
const fmt = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const MODE_WORD = { making: "making", comms: "comms", growth: "growth", content: "content", systems: "systems", health: "health", social: "social" };

function Row({ x, modes }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid #f3f3f3" }}>
      <span style={{ ...small, width: "84px", flex: "none", color: x.overdue ? RED : "#888" }}>{x.overdue ? "overdue" : fmt(x.due)}</span>
      <span style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", flex: 1, minWidth: 0 }}>
        {x.title} <span style={small}>· {x.where}</span>
        {x.gap && <span style={{ display: "block", fontSize: "12px", color: RED }}>No {x.modes.map((m) => (modes[m] ? modes[m].label : MODE_WORD[m] || m)).join(" or ")} time on the grid this week yet</span>}
      </span>
    </div>
  );
}

/** "Due in the next two weeks", with a red line under anything due within a week that has no matching time on the grid. */
export function DueSoon({ list, modes, limit = 8 }) {
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, limit);
  const gaps = list.filter((x) => x.gap).length;
  return (
    <div style={{ marginBottom: "36px" }}>
      <p style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
        Due in the next two weeks ({list.length}){gaps ? <span style={{ color: RED, textTransform: "none", letterSpacing: 0 }}> · {gaps} without time this week</span> : null}
      </p>
      {shown.map((x) => <Row key={x.title + x.due} x={x} modes={modes} />)}
      {list.length > limit && <span role="button" onClick={() => setAll(!all)} style={{ ...small, cursor: "pointer", textDecoration: "underline" }}>{all ? "Show fewer" : `Show all ${list.length}`}</span>}
    </div>
  );
}

/** Monday flow: see what's due, block in fixed time, then fill the rest with Claude. */
export default function WeekSetupPanel({ list, days, slots, modes, schedule, weekNote, onApply, onClose }) {
  const [step, setStep] = useState(0);
  const office = Object.values(schedule || {}).reduce((n, d) => n + Object.values(d || {}).filter((m) => m === "office").length, 0);
  const steps = ["What's due", "Fixed time", "Fill the week"];
  return (
    <div style={{ maxWidth: "560px", margin: "0 auto 36px", border: "1px solid #e6e6e6", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <span style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Set up this week · {steps.map((s, i) => <span key={s} onClick={() => setStep(i)} role="button" style={{ cursor: "pointer", color: i === step ? LINK_BLUE : "#bbb", marginLeft: i ? "8px" : "4px" }}>{i + 1}. {s}</span>)}
        </span>
        <span role="button" aria-label="Close" onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: "18px", lineHeight: 1 }}>×</span>
      </div>

      {step === 0 && (
        <div>
          {list.length ? <DueSoon list={list} modes={modes} limit={12} /> : <p style={{ ...small, margin: "0 0 14px" }}>Nothing with a date in the next two weeks. Check the Timeline for anything that should have one.</p>}
          <span role="button" onClick={() => setStep(1)} style={btn(false)}>Next</span>
        </div>
      )}

      {step === 1 && (
        <div>
          <p style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", lineHeight: 1.5, margin: "0 0 8px" }}>
            Mark Hello Vet shifts and appointments on the grid below first (Office Work and Health), so the rest is planned around them.
          </p>
          <p style={{ ...small, margin: "0 0 14px" }}>{office ? `${office} office block${office === 1 ? "" : "s"} marked so far.` : "No office blocks marked yet."}</p>
          <span role="button" onClick={() => setStep(0)} style={{ ...btn(false), marginRight: "8px" }}>Back</span>
          <span role="button" onClick={() => setStep(2)} style={btn(false)}>Next</span>
        </div>
      )}

      {step === 2 && (
        <GridImportPanel embedded title="" days={days} slots={slots} modes={modes} schedule={schedule} weekNote={weekNote}
          deadlines={list.filter((x) => x.due <= new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10))} onApply={onApply} onClose={onClose} />
      )}
    </div>
  );
}

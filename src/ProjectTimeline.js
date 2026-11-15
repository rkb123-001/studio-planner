import { useMemo, useState } from "react";
import { buildTimeline, ymOf, addMonthsYM, labelYM } from "./timelineEngine";

// ─────────────────────────────────────────────────────────────────────────────
// ProjectTimeline — a visual calendar of where every project is at.
// Lanes: Art projects, one lane per Quarterly category, and the Study path.
// Columns: Done so far | the next N months. Click a pill to set its dates.
// ─────────────────────────────────────────────────────────────────────────────

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const INK = "#1a1a1a";
const MUTED = "#888";
const LINE = "#e6e6e6";
const NOW_BG = "#fff8d6";

const btn = (active) => ({
  display: "inline-block", padding: "5px 14px", border: `1px solid ${active ? LINK_BLUE : INK}`, background: "#fff",
  color: active ? LINK_BLUE : INK, fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
});
const small = { fontFamily: TNR, fontSize: "12px", color: MUTED };
const input = { fontFamily: TNR, fontSize: "14px", padding: "5px 8px", border: "1px solid #ccc", background: "#fff", width: "100%", boxSizing: "border-box" };

function Pill({ item, color, selected, onSelect }) {
  const done = item.zone === "done";
  const style = {
    display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px",
    padding: item.span > 1 ? "7px 12px" : "6px 12px", borderRadius: item.span > 1 ? "10px" : "999px",
    fontFamily: TNR, fontSize: "13px", lineHeight: 1.25, color: INK, cursor: "pointer", textAlign: "left",
    background: done ? "transparent" : item.ghost ? "transparent" : color,
    border: done ? `1.5px solid ${color}` : item.ghost ? `1.5px dashed ${color}` : "1.5px solid transparent",
    outline: selected ? `2px solid ${INK}` : "none", outlineOffset: "1px",
    width: "100%", boxSizing: "border-box", minWidth: 0,
  };
  if (item.overdue) { style.border = "1.5px solid #b01904"; style.background = "#fff"; }
  if (item.paused) style.opacity = 0.7;
  const label = (done ? "✓ " : "") + item.title + (item.clippedStart ? "" : "");
  return (
    <button type="button" onClick={() => onSelect(item)} title={[item.title, item.note].filter(Boolean).join(" — ")}
      aria-pressed={selected} style={{ ...style, appearance: "none" }}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: item.span > 1 ? "normal" : "nowrap", fontWeight: done ? 400 : 600 }}>
        {item.clippedStart ? "← " : ""}{label}{item.clippedEnd ? " →" : ""}
      </span>
      {(item.overdue || item.who) && (
        <span style={{ fontSize: "11px", opacity: 0.8, whiteSpace: "nowrap", color: item.overdue ? "#b01904" : INK }}>
          {item.overdue ? "overdue" : item.who}
        </span>
      )}
    </button>
  );
}

export default function ProjectTimeline({
  artProjects, projects, steps, artStatuses, goalStatuses,
  onUpdateArt, onUpdateGoal, onOpenArt, onOpenGoal, onOpenPath, today,
}) {
  const now = today || new Date();
  const [months, setMonths] = useState(6);
  const [startYM, setStartYM] = useState(ymOf(now));
  const [sel, setSel] = useState(null); // item id
  const model = useMemo(
    () => buildTimeline({ artProjects, projects, steps }, { startYM, months }, now),
    [artProjects, projects, steps, startYM, months] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const allItems = useMemo(() => {
    const out = [...model.unscheduled, ...model.later];
    model.lanes.forEach((l) => { l.done.forEach((i) => out.push(i)); l.rows.forEach((r) => r.forEach((i) => out.push(i))); });
    return out;
  }, [model]);
  const selected = sel ? allItems.find((i) => i.id === sel) : null;
  const art = selected && selected.kind === "art" ? artProjects.find((p) => p.id === selected.refId) : null;
  const goal = selected && selected.kind === "goal" ? projects.find((p) => p.id === selected.refId) : null;

  const cols = `150px minmax(130px,1.1fr) repeat(${months}, minmax(0,1fr))`;
  const select = (item) => setSel((cur) => (cur === item.id ? null : item.id));
  const shift = (n) => setStartYM((s) => addMonthsYM(s, n));
  const atToday = startYM === ymOf(now);
  const hasAnything = model.lanes.length || model.unscheduled.length || model.later.length;

  const setField = (field, value) => {
    if (art) onUpdateArt(art.id, field, value);
    if (goal) onUpdateGoal(goal.id, field, value);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
        <span onClick={() => shift(-3)} style={btn(false)} role="button" aria-label="Earlier">←</span>
        <span onClick={() => setStartYM(ymOf(now))} style={btn(atToday)} role="button">This month</span>
        <span onClick={() => shift(3)} style={btn(false)} role="button" aria-label="Later">→</span>
        <span style={{ width: "12px" }} />
        <span onClick={() => setMonths(6)} style={btn(months === 6)} role="button">6 months</span>
        <span onClick={() => setMonths(12)} style={btn(months === 12)} role="button">12 months</span>
        <span style={{ ...small, marginLeft: "auto" }}>Click any project to set its dates. Dashed means no dates set yet, so its place is a guess.</span>
      </div>

      {!hasAnything && (
        <p style={{ fontFamily: TNR, fontSize: "15px", color: MUTED }}>
          Nothing to show yet. Add an Art project with a key date, or a Quarterly goal with a due month, and it will appear here.
        </p>
      )}

      {hasAnything ? (
        <div style={{ overflowX: "auto", paddingTop: "26px" }}>
          <div style={{ position: "relative", minWidth: months === 12 ? "1250px" : "860px" }}>
            {/* bands */}
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: cols, columnGap: "6px", pointerEvents: "none" }}>
              <div />
              <div style={{ border: `2px dashed ${LINE}`, borderRadius: "12px" }} />
              {model.months.map((m) => (
                <div key={m.ym} style={{
                  position: "relative", borderRadius: "12px", background: m.index === model.nowIndex ? NOW_BG : "#fafafa",
                  boxShadow: m.index === model.nowIndex ? "inset 0 0 0 2px #fde25e" : "none",
                }}>
                  {m.index === model.nowIndex && (
                    <span style={{ position: "absolute", top: "-26px", left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff", fontFamily: TNR, fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>We are here</span>
                  )}
                </div>
              ))}
            </div>

            {/* header */}
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, columnGap: "6px", padding: "14px 0 10px" }}>
              <div />
              <div style={{ padding: "0 12px" }}><b style={{ fontFamily: TNR, fontSize: "15px" }}>Done so far</b></div>
              {model.months.map((m) => (
                <div key={m.ym} style={{ padding: "0 12px" }}>
                  <b style={{ fontFamily: TNR, fontSize: "15px" }}>{m.label.split(" ")[0]}</b>
                  <div style={small}>{m.label.split(" ")[1]}</div>
                </div>
              ))}
            </div>

            {/* lanes */}
            {model.lanes.map((L) => {
              const rowCount = Math.max(1, L.rows.length);
              return (
                <div key={L.key} style={{ position: "relative", display: "grid", gridTemplateColumns: cols, columnGap: "6px", rowGap: "6px", borderTop: `1px solid ${LINE}`, padding: "10px 0", alignItems: "start" }}>
                  <div style={{ gridColumn: 1, gridRow: `1 / span ${rowCount}`, display: "flex", alignItems: "center", gap: "8px", fontFamily: TNR, fontSize: "14px", fontWeight: 700, padding: "6px 4px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: L.color, flex: "none" }} />
                    {L.label}
                  </div>
                  <div style={{ gridColumn: 2, gridRow: `1 / span ${rowCount}`, padding: "0 8px" }}>
                    {L.done.length > 3 ? (
                      <details>
                        <summary style={{ cursor: "pointer", fontFamily: TNR, fontSize: "13px", border: `1.5px solid ${L.color}`, borderRadius: "999px", padding: "6px 12px" }}>✓ Finished ({L.done.length})</summary>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                          {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} selected={sel === i.id} onSelect={select} />)}
                        </div>
                      </details>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} selected={sel === i.id} onSelect={select} />)}
                      </div>
                    )}
                  </div>
                  {L.rows.map((row, r) => row.map((i) => (
                    <div key={i.id} style={{ gridColumn: `${3 + i.col} / span ${i.span}`, gridRow: r + 1, minWidth: 0, padding: "0 6px" }}>
                      <Pill item={i} color={L.color} selected={sel === i.id} onSelect={(it) => (it.kind === "step" ? onOpenPath() : select(it))} />
                    </div>
                  )))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* edit panel */}
      {selected && (art || goal) && (
        <div style={{ marginTop: "20px", padding: "16px 18px", border: `1px solid ${INK}`, maxWidth: "720px" }}>
          <p style={{ fontFamily: TNR, fontSize: "17px", margin: "0 0 4px" }}>{selected.title}</p>
          <p style={{ ...small, margin: "0 0 12px" }}>
            {selected.from ? `Showing ${labelYM(selected.from)}${selected.to && selected.to !== selected.from ? ` to ${labelYM(selected.to)}` : ""}` : "No dates yet"}
            {selected.ghost ? ", a guess until you set dates" : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
            <label style={small}>Start
              <input type="date" aria-label="Start date" style={input} value={(art || goal).startDate || ""} onChange={(e) => setField("startDate", e.target.value)} />
            </label>
            <label style={small}>{art ? "End" : "Due"}
              <input type="date" aria-label="End date" style={input} value={(art || goal).endDate || ""} onChange={(e) => setField("endDate", e.target.value)} />
            </label>
            <label style={small}>Status
              <select aria-label="Status" style={input} value={(art || goal).status} onChange={(e) => setField("status", e.target.value)}>
                {(art ? artStatuses : goalStatuses).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "16px" }}>
            <span style={{ fontFamily: TNR, fontSize: "14px", color: LINK_BLUE, textDecoration: "underline", cursor: "pointer" }}
              onClick={() => (art ? onOpenArt(art.id) : onOpenGoal(goal.id))}>
              Open in {art ? "Art Projects" : "Quarterly"} →
            </span>
            <span style={{ fontFamily: TNR, fontSize: "14px", color: MUTED, textDecoration: "underline", cursor: "pointer" }} onClick={() => setSel(null)}>Close</span>
          </div>
        </div>
      )}

      {(model.unscheduled.length > 0 || model.later.length > 0) && (
        <div style={{ marginTop: "22px", maxWidth: "720px" }}>
          {model.unscheduled.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ ...small, margin: "0 0 6px" }}>Needs a date ({model.unscheduled.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {model.unscheduled.map((i) => (
                  <span key={i.id} onClick={() => select(i)} style={{ ...btn(sel === i.id), fontSize: "12px", padding: "3px 10px" }} role="button">{i.title}</span>
                ))}
              </div>
            </div>
          )}
          {model.later.length > 0 && (
            <div>
              <p style={{ ...small, margin: "0 0 6px" }}>After this window ({model.later.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {model.later.map((i) => (
                  <span key={i.id} onClick={() => (i.kind === "step" ? onOpenPath() : select(i))} style={{ ...btn(sel === i.id), fontSize: "12px", padding: "3px 10px" }} role="button">
                    {i.title} · {labelYM(i.from)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

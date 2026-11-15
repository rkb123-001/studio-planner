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
const NOW_BG = "#f1f0fc";

const btn = (active) => ({
  display: "inline-block", padding: "5px 14px", border: `1px solid ${active ? LINK_BLUE : INK}`, background: "#fff",
  color: active ? LINK_BLUE : INK, fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
});
const small = { fontFamily: TNR, fontSize: "12px", color: MUTED };

function Pill({ item, color, onSelect }) {
  const done = item.zone === "done";
  const plain = done || item.ghost || item.overdue;
  const style = {
    display: "block", padding: "4px 9px", borderRadius: item.span > 1 ? "8px" : "999px",
    fontFamily: TNR, fontSize: "11px", lineHeight: 1.25, color: plain ? INK : color.text, cursor: "pointer", textAlign: "left",
    background: done || item.ghost ? "#fff" : color.fill,
    border: item.ghost ? `1px dashed ${color.edge}` : `1px solid ${color.edge}`,
    width: "100%", boxSizing: "border-box", minWidth: 0, appearance: "none",
  };
  if (item.overdue) { style.border = "1px solid #b01904"; style.background = "#fff"; }
  if (item.paused) style.opacity = 0.7;
  const tag = item.overdue ? "overdue" : item.who;
  const nowrap = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <button type="button" onClick={() => onSelect(item)} title={[item.title, tag, item.note].filter(Boolean).join(" · ")} style={style}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
        <span style={{ ...nowrap, fontWeight: done ? 400 : 600 }}>{item.clippedStart ? "← " : ""}{done ? "✓ " : ""}{item.title}{item.clippedEnd ? " →" : ""}</span>
        {tag && <span style={{ fontSize: "9.5px", whiteSpace: "nowrap", color: item.overdue ? "#b01904" : plain ? MUTED : color.text, opacity: 0.85 }}>{tag}</span>}
      </span>
      {item.note && <span style={{ display: "block", ...nowrap, fontSize: "10px", color: plain ? MUTED : color.text, opacity: 0.85 }}>{item.note}</span>}
    </button>
  );
}

export default function ProjectTimeline({
  artProjects, projects, steps, onOpenArt, onOpenGoal, onOpenPath, today,
}) {
  const now = today || new Date();
  const [months, setMonths] = useState(6);
  const [startYM, setStartYM] = useState(ymOf(now));
  const model = useMemo(
    () => buildTimeline({ artProjects, projects, steps }, { startYM, months }, now),
    [artProjects, projects, steps, startYM, months] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const cols = `150px minmax(130px,1.1fr) repeat(${months}, minmax(0,1fr))`;
  const open = (item) => {
    if (item.kind === "art") onOpenArt(item.refId);
    else if (item.kind === "goal") onOpenGoal(item.refId);
    else onOpenPath();
  };
  const shift = (n) => setStartYM((s) => addMonthsYM(s, n));
  const atToday = startYM === ymOf(now);
  const hasAnything = model.lanes.length || model.unscheduled.length || model.later.length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
        <span onClick={() => shift(-3)} style={btn(false)} role="button" aria-label="Earlier">←</span>
        <span onClick={() => setStartYM(ymOf(now))} style={btn(atToday)} role="button">This month</span>
        <span onClick={() => shift(3)} style={btn(false)} role="button" aria-label="Later">→</span>
        <span style={{ width: "12px" }} />
        <span onClick={() => setMonths(6)} style={btn(months === 6)} role="button">6 months</span>
        <span onClick={() => setMonths(12)} style={btn(months === 12)} role="button">12 months</span>
        <span style={{ ...small, marginLeft: "auto" }}>Click a project to open it. Dashed means no dates set yet, so its place is a guess. Set dates in the project itself.</span>
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
                  position: "relative", borderRadius: "12px", background: m.index === model.nowIndex ? NOW_BG : "#fff", border: m.index === model.nowIndex ? "none" : `1px solid ${LINE}`,
                  boxShadow: m.index === model.nowIndex ? `inset 0 0 0 1.5px ${LINK_BLUE}` : "none",
                }}>
                  {m.index === model.nowIndex && (
                    <span style={{ position: "absolute", top: "-26px", left: "50%", transform: "translateX(-50%)", background: LINK_BLUE, color: "#fff", fontFamily: TNR, fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>We are here</span>
                  )}
                </div>
              ))}
            </div>

            {/* header */}
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, columnGap: "6px", padding: "14px 0 10px" }}>
              <div />
              <div style={{ padding: "0 12px" }}><b style={{ fontFamily: TNR, fontSize: "13px" }}>Done so far</b></div>
              {model.months.map((m) => (
                <div key={m.ym} style={{ padding: "0 12px" }}>
                  <b style={{ fontFamily: TNR, fontSize: "13px" }}>{m.label.split(" ")[0]}</b>
                  <div style={small}>{m.label.split(" ")[1]}</div>
                </div>
              ))}
            </div>

            {/* lanes */}
            {model.lanes.map((L) => {
              const rowCount = Math.max(1, L.rows.length);
              return (
                <div key={L.key} style={{ position: "relative", display: "grid", gridTemplateColumns: cols, columnGap: "6px", rowGap: "4px", borderTop: `1px solid ${LINE}`, padding: "8px 0", alignItems: "start" }}>
                  <div style={{ gridColumn: 1, gridRow: `1 / span ${rowCount}`, display: "flex", alignItems: "center", gap: "8px", fontFamily: TNR, fontSize: "12px", fontWeight: 700, padding: "4px 4px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: L.color.fill, border: `1px solid ${L.color.edge}`, boxSizing: "border-box", flex: "none" }} />
                    {L.label}
                  </div>
                  <div style={{ gridColumn: 2, gridRow: `1 / span ${rowCount}`, padding: "0 8px" }}>
                    {L.done.length > 3 ? (
                      <details>
                        <summary style={{ cursor: "pointer", fontFamily: TNR, fontSize: "11px", border: `1px solid ${L.color.edge}`, borderRadius: "999px", padding: "4px 9px" }}>✓ Finished ({L.done.length})</summary>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                          {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} onSelect={open} />)}
                        </div>
                      </details>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} onSelect={open} />)}
                      </div>
                    )}
                  </div>
                  {L.rows.map((row, r) => row.map((i) => (
                    <div key={i.id} style={{ gridColumn: `${3 + i.col} / span ${i.span}`, gridRow: r + 1, minWidth: 0, padding: "0 6px" }}>
                      <Pill item={i} color={L.color} onSelect={open} />
                    </div>
                  )))}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {(model.unscheduled.length > 0 || model.later.length > 0) && (
        <div style={{ marginTop: "22px", maxWidth: "720px" }}>
          {model.unscheduled.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ ...small, margin: "0 0 6px" }}>Needs a date ({model.unscheduled.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {model.unscheduled.map((i) => (
                  <span key={i.id} onClick={() => open(i)} style={{ ...btn(false), fontSize: "12px", padding: "3px 10px" }} role="button">{i.title}</span>
                ))}
              </div>
            </div>
          )}
          {model.later.length > 0 && (
            <div>
              <p style={{ ...small, margin: "0 0 6px" }}>After this window ({model.later.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {model.later.map((i) => (
                  <span key={i.id} onClick={() => open(i)} style={{ ...btn(false), fontSize: "12px", padding: "3px 10px" }} role="button">
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

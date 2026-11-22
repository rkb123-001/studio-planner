import { useMemo } from "react";
import { buildWeeks } from "./weekViewEngine";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const INK = "#1a1a1a";
const MUTED = "#888";
const LINE = "#e6e6e6";
const NOW_BG = "#f1f0fc";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const parts = (iso) => iso.split("-").map(Number);
const relLabel = (k) => (k === 0 ? "This week" : k === -1 ? "Last week" : k === 1 ? "Next week" : k > 0 ? `In ${k} weeks` : `${-k} weeks ago`);
const small = { fontFamily: TNR, fontSize: "11px", color: MUTED };

/** Five weeks of days, Monday first: last week, this week and the next three. Month changes are marked. */
export default function WeekView({ items, milestones, taskLists, today, offset, onSelect }) {
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weeks = useMemo(() => buildWeeks({ items, milestones, taskLists, today: todayISO, offset }), [items, milestones, taskLists, todayISO, offset]);
  const cols = "repeat(7, minmax(0, 1fr))";
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: "760px" }}>
        <div style={{ display: "grid", gridTemplateColumns: `86px ${cols}`, columnGap: "4px", marginBottom: "4px" }}>
          <div />
          {DOW.map((d, k) => <div key={d} style={{ ...small, padding: "0 6px", color: k > 4 ? "#aaa" : MUTED }}>{d}</div>)}
        </div>
        {weeks.map((w, wi) => {
          const isThis = w.start <= todayISO && todayISO <= w.end;
          const [, sm, sd] = parts(w.start), [, em, ed] = parts(w.end);
          return (
            <div key={w.start} style={{ display: "grid", gridTemplateColumns: `86px ${cols}`, columnGap: "4px", rowGap: "3px", marginBottom: "6px", position: "relative" }}>
              {/* week label */}
              <div style={{ gridColumn: 1, gridRow: `1 / span ${2 + w.bars.length}`, padding: "6px 8px 6px 0", borderRight: isThis ? `2px solid ${LINK_BLUE}` : `1px solid ${LINE}` }}>
                <div style={{ fontFamily: TNR, fontSize: "12px", fontWeight: isThis ? 700 : 400, color: isThis ? LINK_BLUE : INK }}>{relLabel(wi - 1 + offset)}</div>
                <div style={small}>{sd} {MON[sm - 1]} – {ed} {MON[em - 1]}</div>
              </div>
              {/* day cells span the whole week block as a background */}
              {w.days.map((d, k) => {
                const [, m, day] = parts(d);
                const odd = m % 2 === 1;
                const first = day === 1;
                const isToday = d === todayISO;
                return (
                  <div key={d} style={{
                    gridColumn: k + 2, gridRow: `1 / span ${2 + w.bars.length}`, background: isToday ? NOW_BG : odd ? "#fafafa" : "#fff",
                    border: `1px solid ${LINE}`, borderLeft: first ? `3px solid ${LINK_BLUE}` : `1px solid ${LINE}`, borderRadius: "6px",
                    boxShadow: isToday ? `inset 0 0 0 1.5px ${LINK_BLUE}` : "none", minHeight: "74px",
                  }} />
                );
              })}
              {/* day numbers, with the month name on the 1st and on Monday of each week */}
              {w.days.map((d, k) => {
                const [, m, day] = parts(d);
                const showMonth = day === 1 || k === 0;
                return (
                  <div key={"n" + d} style={{ gridColumn: k + 2, gridRow: 1, padding: "5px 7px 0", fontFamily: TNR, fontSize: "12px", position: "relative", zIndex: 1 }}>
                    <span style={{ fontWeight: d === todayISO ? 700 : 400, color: d === todayISO ? LINK_BLUE : INK }}>{day}</span>
                    {showMonth && <span style={{ marginLeft: "4px", fontSize: day === 1 ? "11px" : "10px", fontWeight: day === 1 ? 700 : 400, letterSpacing: day === 1 ? "0.06em" : 0, textTransform: day === 1 ? "uppercase" : "none", color: day === 1 ? LINK_BLUE : MUTED }}>{day === 1 ? `${MON[m - 1]} begins` : MON[m - 1]}</span>}
                  </div>
                );
              })}
              {/* projects running through this week */}
              {w.bars.map((row, r) => row.map((s) => {
                const c = s.item.color || { fill: "#aaa", text: INK, edge: "#aaa" };
                const ghost = s.item.ghost, overdue = s.item.overdue;
                return (
                  <button key={s.item.id + w.start} type="button" onClick={() => onSelect(s.item)} title={[s.item.title, s.item.lane, s.item.who, s.item.note].filter(Boolean).join(" · ")}
                    style={{
                      gridColumn: `${s.c0 + 2} / ${s.c1 + 3}`, gridRow: r + 2, position: "relative", zIndex: 1, margin: "0 3px", padding: "2px 7px",
                      fontFamily: TNR, fontSize: "11px", textAlign: "left", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      background: ghost || s.item.done ? "#fff" : c.fill, color: ghost || s.item.done ? INK : c.text,
                      border: ghost ? `1px dashed ${c.edge}` : `1px solid ${overdue ? "#b01904" : c.edge}`,
                      borderRadius: `${s.clipL ? 2 : 999}px ${s.clipR ? 2 : 999}px ${s.clipR ? 2 : 999}px ${s.clipL ? 2 : 999}px`,
                    }}>
                    {s.clipL ? "← " : ""}{s.item.done ? "✓ " : ""}{s.item.title}{s.clipR ? " →" : ""}
                  </button>
                );
              }))}
              {/* dated tasks and deadlines on their day */}
              {w.days.map((d, k) => (w.points[d] || []).length > 0 && (
                <div key={"p" + d} style={{ gridColumn: k + 2, gridRow: 2 + w.bars.length, padding: "2px 6px 6px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                  {w.points[d].slice(0, 4).map((p, n) => (
                    <span key={n} title={`${p.title} · ${p.where}`} style={{ fontFamily: TNR, fontSize: "11px", lineHeight: 1.25, color: INK, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      <span style={{ color: p.color ? p.color.edge : LINK_BLUE }}>•</span> {p.title}
                    </span>
                  ))}
                  {w.points[d].length > 4 && <span style={small}>+{w.points[d].length - 4} more</span>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

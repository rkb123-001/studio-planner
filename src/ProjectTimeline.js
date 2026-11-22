import { useMemo, useState } from "react";
import { PlaceWizard, ImportBox } from "./PlaceThis";
import TaskLists from "./TaskListsView";
import { importIntoLists } from "./listOps";
import { buildTimeline, groupList, comingUp, LIST_GROUPS, ymOf, addMonthsYM, labelYM } from "./timelineEngine";

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
  artProjects, projects, steps, onOpenArt, onOpenGoal, onOpenPath, onAddGoal, onUpdateArt, onUpdateGoal, categories, view: viewProp, onView, goalsPanel, artPanel, pathPanel, taskLists = [], onTaskLists, inbox = [], onInboxAdd, onInboxRemove, today,
}) {
  const now = today || new Date();
  const [months, setMonths] = useState(6);
  const [panel, setPanel] = useState(null); // "place" | "import" | null
  const [placing, setPlacing] = useState(null); // inbox item being placed
  const [draft, setDraft] = useState("");
  const [viewLocal, setViewLocal] = useState("timeline"); // "timeline" | "list" | "goals"
  const view = viewProp || viewLocal;
  const panels = { goals: goalsPanel, art: artPanel, path: pathPanel };
  const isPanel = ["goals", "art", "path", "lists"].includes(view);
  const setView = onView || setViewLocal;
  const [showDone, setShowDone] = useState(false);
  const [laneFilter, setLaneFilter] = useState("");
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
        <span onClick={() => setView("timeline")} style={btn(view === "timeline")} role="button">Timeline</span>
        <span onClick={() => setView("list")} style={btn(view === "list")} role="button">By date</span>
        {onTaskLists && <span onClick={() => setView("lists")} style={btn(view === "lists")} role="button">Lists{taskLists.length ? ` (${taskLists.length})` : ""}</span>}
        {goalsPanel && <span onClick={() => setView("goals")} style={btn(view === "goals")} role="button">Goals</span>}
        {artPanel && <span onClick={() => setView("art")} style={btn(view === "art")} role="button">Art</span>}
        {pathPanel && <span onClick={() => setView("path")} style={btn(view === "path")} role="button">Path</span>}
        {!isPanel && <>
        <span style={{ width: "12px" }} />
        <span onClick={() => shift(-3)} style={btn(false)} role="button" aria-label="Earlier">←</span>
        <span onClick={() => setStartYM(ymOf(now))} style={btn(atToday)} role="button">This month</span>
        <span onClick={() => shift(3)} style={btn(false)} role="button" aria-label="Later">→</span>
        <span style={{ width: "12px" }} />
        <span onClick={() => setMonths(6)} style={btn(months === 6)} role="button">6 months</span>
        <span onClick={() => setMonths(12)} style={btn(months === 12)} role="button">12 months</span>
        <span style={{ width: "12px" }} />
        {onAddGoal && <span onClick={() => { setPlacing(null); setPanel(panel === "place" ? null : "place"); }} style={btn(panel === "place")} role="button">+ Place something</span>}
        {onAddGoal && <span onClick={() => setPanel(panel === "import" ? null : "import")} style={btn(panel === "import")} role="button">Import suggestions</span>}
        <span style={{ ...small, marginLeft: "auto" }}>Click a project to open it. Dashed means no dates set yet, so its place is a guess. Set dates in the project itself.</span>
        </>}
      </div>

      {view === "lists" && onTaskLists && <TaskLists lists={taskLists} onChange={onTaskLists} categories={categories} today={now} onAddGoal={onAddGoal} />}
      {isPanel && panels[view]}

      {!isPanel && (() => {
        const cu = comingUp(model.all, model.milestones, now);
        const fmt = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const anything = cu.overdue.length || cu.rows.some((r) => r.items.length) || cu.inProgress.length;
        if (!anything) return null;
        const line = { fontFamily: TNR, fontSize: "12px", color: INK, margin: "2px 0" };
        return (
          <details open style={{ maxWidth: "720px", marginBottom: "18px" }}>
            <summary style={{ ...small, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>Where you are: coming up</summary>
            {cu.overdue.length > 0 && <p style={{ ...line, color: "#b01904" }}>Overdue: {cu.overdue.slice(0, 6).map((i) => `${i.title} (${fmt(i.dueISO)})`).join(", ")}</p>}
            {cu.rows.map((r) => (
              <div key={r.label} style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                <span style={{ ...small, width: "58px", flex: "none" }}>{r.label}</span>
                <span style={line}>
                  {r.items.length ? r.items.map((i, n) => <span key={i.title + i.dueISO + n}>{n ? ", " : ""}{i.title} <span style={small}>{fmt(i.dueISO)}</span></span>) : <span style={small}>nothing with a date</span>}
                </span>
              </div>
            ))}
            {cu.inProgress.length > 0 && <p style={{ ...line, marginTop: "6px" }}><span style={small}>In progress this month: </span>{cu.inProgress.slice(0, 6).map((i) => i.title).join(", ")}{cu.inProgress.length > 6 ? ` and ${cu.inProgress.length - 6} more` : ""}</p>}
          </details>
        );
      })()}

      {!isPanel && onInboxAdd && (
        <div style={{ maxWidth: "720px", marginBottom: "18px" }}>
          <p style={{ ...small, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Inbox{inbox.length ? ` (${inbox.length})` : ""}: capture now, place later</p>
          <input aria-label="Add to inbox" value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onInboxAdd(draft); setDraft(""); } }}
            placeholder="Add a task and press Enter" style={{ fontFamily: TNR, fontSize: "14px", padding: "6px 8px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" }} />
          {view === "timeline" && inbox.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "6px 0", borderBottom: "1px solid #f0f0f0", fontFamily: TNR, fontSize: "14px" }}>
              <span style={{ flex: 1 }}>{t.title}{t.source ? <span style={{ ...small, marginLeft: "8px" }}>{t.source}</span> : null}</span>
              <span role="button" onClick={() => { setPlacing(t); setPanel("place"); }} style={{ ...btn(false), padding: "2px 10px", fontSize: "12px" }}>Place</span>
              <span role="button" aria-label={`Remove ${t.title}`} onClick={() => onInboxRemove(t.id)} style={{ cursor: "pointer", color: MUTED, fontSize: "16px" }}>×</span>
            </div>
          ))}
        </div>
      )}

      {!isPanel && panel === "place" && <PlaceWizard key={placing ? placing.id : "new"} categories={categories} today={now} initialTitle={placing ? placing.title : ""}
        onAdd={(g) => { onAddGoal(g); if (placing && onInboxRemove) onInboxRemove(placing.id); }} onClose={() => { setPanel(null); setPlacing(null); }} />}
      {!isPanel && panel === "import" && <ImportBox categories={categories} today={now} onAdd={onAddGoal} onInbox={onInboxAdd} onLists={onTaskLists ? (entries) => { onTaskLists((l) => importIntoLists(l, entries)); setView("lists"); } : undefined} onClose={() => setPanel(null)} />}

      {view === "timeline" && !hasAnything && (
        <p style={{ fontFamily: TNR, fontSize: "15px", color: MUTED }}>
          Nothing to show yet. Add an Art project with a key date, or a Quarterly goal with a due month, and it will appear here.
        </p>
      )}

      {view === "list" && (() => {
        const groups = groupList(laneFilter ? model.all.filter((i) => i.lane === laneFilter) : model.all, ymOf(now));
        const lanesAvail = [...new Set(model.all.map((i) => i.lane))];
        const toggle = (it) => {
          if (it.kind === "goal") onUpdateGoal(it.refId, "status", it.done ? "not-started" : "done");
          else if (it.kind === "art") onUpdateArt(it.refId, "status", it.done ? "active" : "complete");
        };
        const when = (it) => (it.from ? `${labelYM(it.from)}${it.to && it.to !== it.from ? ` to ${labelYM(it.to)}` : ""}` : "");
        const Row = ({ it }) => (
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontFamily: TNR, fontSize: "14px", opacity: it.done ? 0.55 : 1 }}>
            {it.kind === "step" ? <span style={{ width: "13px" }} /> : <input type="checkbox" aria-label={`Done: ${it.title}`} checked={!!it.done} onChange={() => toggle(it)} />}
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: it.color.fill, border: `1px solid ${it.color.edge}`, boxSizing: "border-box", flex: "none", alignSelf: "center" }} />
            <span onClick={() => open(it)} style={{ flex: 1, cursor: "pointer", textDecoration: it.done ? "line-through" : "none" }}>{it.title}{it.who ? <span style={{ ...small, marginLeft: "8px" }}>{it.who}</span> : null}</span>
            <span style={{ ...small, whiteSpace: "nowrap" }}>{it.lane}</span>
            <span style={{ ...small, width: "130px", textAlign: "right", whiteSpace: "nowrap" }}>{when(it)}</span>
          </div>
        );
        return (
          <div style={{ maxWidth: "820px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
              <select aria-label="Filter by lane" value={laneFilter} onChange={(e) => setLaneFilter(e.target.value)} style={{ fontFamily: TNR, fontSize: "13px", padding: "4px 8px", border: "1px solid #ccc" }}>
                <option value="">All lanes</option>
                {lanesAvail.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span onClick={() => setShowDone((v) => !v)} style={btn(showDone)} role="button">{showDone ? "Hide done" : "Show done"}</span>
              <span style={small}>{model.all.filter((i) => !i.done).length} open{inbox.length ? `, ${inbox.length} in inbox` : ""}</span>
            </div>
            {inbox.length > 0 && !laneFilter && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Inbox, not placed yet ({inbox.length})</p>
                {inbox.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontFamily: TNR, fontSize: "14px" }}>
                    <input type="checkbox" aria-label={`Done: ${t.title}`} checked={false} onChange={() => onInboxRemove(t.id)} />
                    <span style={{ flex: 1 }}>{t.title}{t.source ? <span style={{ ...small, marginLeft: "8px" }}>{t.source}</span> : null}</span>
                    <span role="button" onClick={() => { setPlacing(t); setPanel("place"); }} style={{ ...btn(false), padding: "2px 10px", fontSize: "12px" }}>Place</span>
                  </div>
                ))}
              </div>
            )}
            {LIST_GROUPS.filter((g) => groups[g.key].length && (g.key !== "done" || showDone)).map((g) => (
              <div key={g.key} style={{ marginBottom: "16px" }}>
                <p style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px", color: g.key === "overdue" ? "#b01904" : MUTED }}>{g.label} ({groups[g.key].length})</p>
                {groups[g.key].map((it) => <Row key={it.id} it={it} />)}
              </div>
            ))}
          </div>
        );
      })()}

      {view === "timeline" && hasAnything ? (
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

      {view === "timeline" && (model.unscheduled.length > 0 || model.later.length > 0) && (
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

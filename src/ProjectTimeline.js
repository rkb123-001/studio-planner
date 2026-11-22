import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceWizard, ImportBox } from "./PlaceThis";
import TaskLists from "./TaskListsView";
import { importIntoLists } from "./listOps";
import { buildTimeline, groupList, comingUp, LIST_GROUPS, ymOf, ymIndex, addMonthsYM, labelYM, movePatch } from "./timelineEngine";

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

const CSS = `
.tl-root [role="button"] { transition: background .12s ease, border-color .12s ease; }
.tl-root [role="button"]:hover { background: #f1f0fc !important; }
.tl-root .tl-pill { transition: box-shadow .15s ease, transform .15s ease; }
.tl-root .tl-pill:hover { box-shadow: 0 3px 10px rgba(26, 13, 171, .2); transform: translateY(-1px); }
.tl-root .tl-pill:active { cursor: grabbing; }
.tl-root .tl-pill:hover .tl-grip { opacity: .95 !important; }
.tl-root .tl-band { transition: background .12s ease; }
`;
const edgeStyle = (side) => ({
  position: "absolute", top: 0, bottom: 0, [side]: 0, width: "14px", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "ew-resize", touchAction: "none",
});
function Pill({ item, color, onSelect, drag }) {
  const done = item.zone === "done";
  const plain = done || item.ghost || item.overdue;
  const style = {
    display: "block", padding: "4px 9px", borderRadius: item.span > 1 ? "8px" : "999px",
    fontFamily: TNR, fontSize: "11px", lineHeight: 1.25, color: plain ? INK : color.text, cursor: drag && drag.draggable ? "grab" : "pointer", textAlign: "left",
    background: done || item.ghost ? "#fff" : color.fill,
    border: item.ghost ? `1px dashed ${color.edge}` : `1px solid ${color.edge}`,
    width: "100%", boxSizing: "border-box", minWidth: 0, appearance: "none", position: "relative",
  };
  if (drag) { style.userSelect = "none"; style.WebkitUserSelect = "none"; style.WebkitTouchCallout = "none"; }
  if (item.overdue) { style.border = "1px solid #b01904"; style.background = "#fff"; }
  if (item.paused) style.opacity = 0.7;
  const tag = item.overdue ? "overdue" : item.who;
  const nowrap = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <button type="button" className="tl-pill" onPointerDown={drag ? (e) => drag.body(e, item) : undefined} onClick={() => onSelect(item)} title={[item.title, tag, item.note].filter(Boolean).join(" · ")} style={style}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline" }}>
        <span style={{ ...nowrap, fontWeight: done ? 400 : 600 }}>{item.clippedStart ? "← " : ""}{done ? "✓ " : ""}{item.title}{item.clippedEnd ? " →" : ""}</span>
        {tag && <span style={{ fontSize: "9.5px", whiteSpace: "nowrap", color: item.overdue ? "#b01904" : plain ? MUTED : color.text, opacity: 0.85 }}>{tag}</span>}
      </span>
      {item.note && <span style={{ display: "block", ...nowrap, fontSize: "10px", color: plain ? MUTED : color.text, opacity: 0.85 }}>{item.note}</span>}
      {drag && drag.canStart(item) && <span aria-label={`Change start of ${item.title}`} onPointerDown={(e) => drag.edge(e, item, "start")} style={edgeStyle("left")}><span className="tl-grip" style={{ width: "3px", height: "55%", borderRadius: "2px", background: plain ? MUTED : color.text, opacity: 0.45 }} /></span>}
      {drag && drag.canEnd(item) && <span aria-label={`Change end of ${item.title}`} onPointerDown={(e) => drag.edge(e, item, "end")} style={edgeStyle("right")}><span className="tl-grip" style={{ width: "3px", height: "55%", borderRadius: "2px", background: plain ? MUTED : color.text, opacity: 0.45 }} /></span>}
    </button>
  );
}

export default function ProjectTimeline({
  artProjects, projects, steps, onOpenArt, onOpenGoal, onOpenPath, mode = "all", onAddGoal, onAddArt, onUpdateArt, onUpdateGoal, categories, view: viewProp, onView, goalsPanel, artPanel, pathPanel, taskLists = [], onTaskLists, inbox = [], onInboxAdd, onInboxRemove, today,
}) {
  const now = today || new Date();
  const [months, setMonths] = useState(6);
  const [panel, setPanel] = useState(null); // "place" | "import" | null
  const [placing, setPlacing] = useState(null); // inbox item being placed
  const [draft, setDraft] = useState("");
  const [viewLocal, setViewLocal] = useState("timeline"); // "timeline" | "list" | "goals"
  let view = viewProp || viewLocal;
  if (mode === "timeline") view = "timeline";            // the Timeline tab is only the calendar
  if (mode === "plan" && view === "timeline") view = "list"; // the Plan tab has everything else
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

  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const clickBlock = useRef(false);
  const latest = useRef({});
  const [preview, setPreview] = useState(null); // { item, from, to } while a pill is being moved or resized
  const [moved, setMoved] = useState(null);
  const ymAt = (x) => {
    const els = rootRef.current ? rootRef.current.querySelectorAll("[data-ym]") : [];
    for (const el of els) { const r = el.getBoundingClientRect(); if (x >= r.left - 3 && x <= r.right + 3) return el.getAttribute("data-ym"); }
    return "";
  };
  const upd = (kind) => (kind === "art" ? onUpdateArt : onUpdateGoal);
  const applyRange = (it, newFrom, newTo) => {
    const raw = (it.kind === "art" ? artProjects : projects).find((p) => p.id === it.refId);
    if (!raw || !upd(it.kind)) return;
    const patch = movePatch(raw, it, ymIndex(newFrom) - ymIndex(it.from), ymIndex(newTo) - ymIndex(it.to || it.from));
    const prev = {};
    Object.keys(patch).forEach((k) => { prev[k] = raw[k]; });
    Object.entries(patch).forEach(([k, v]) => upd(it.kind)(it.refId, k, v));
    setMoved({ title: it.title, kind: it.kind, refId: it.refId, prev, label: newFrom === newTo ? labelYM(newFrom) : `${labelYM(newFrom)} to ${labelYM(newTo)}` });
  };
  const undoMove = () => {
    if (!moved) return;
    Object.entries(moved.prev).forEach(([k, v]) => upd(moved.kind)(moved.refId, k, v));
    setMoved(null);
  };
  const rangeFor = (d, y) => {
    const it = d.item, f = it.from, t = it.to || it.from;
    if (d.mode === "start") return { from: ymIndex(y) > ymIndex(t) ? t : y, to: t };
    if (d.mode === "end") return { from: f, to: ymIndex(y) < ymIndex(f) ? f : y };
    // An overdue pill sits in the first column but really ends earlier: the drop sets its end month.
    const delta = it.overdue ? ymIndex(y) - ymIndex(t) : ymIndex(y) - ymIndex(d.grabYM);
    return { from: addMonthsYM(f, delta), to: addMonthsYM(t, delta) };
  };
  const movable = (i) => (i.kind === "art" || i.kind === "goal") && !i.done && i.zone === "grid";
  const stop = () => {
    const d = dragRef.current;
    if (d && d.timer) clearTimeout(d.timer);
    if (d && d.scroller) clearInterval(d.scroller);
    dragRef.current = null;
    setPreview(null);
  };
  const activate = (d) => {
    d.active = true;
    if (d.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* not supported */ } }
    const sc = rootRef.current && rootRef.current.parentElement;
    if (sc) d.scroller = setInterval(() => { if (d.scrollBy) sc.scrollLeft += d.scrollBy; }, 16);
    const y = d.grabYM || d.item.from;
    setPreview({ item: d.item, ...rangeFor(d, y) });
  };
  const drag = {
    canStart: (i) => movable(i) && !i.clippedStart,
    canEnd: (i) => movable(i) && !i.clippedEnd,
    body: (e, i) => {
      if (!movable(i) || (e.pointerType === "mouse" && e.button !== 0)) return;
      const d = { mode: "move", item: i, x0: e.clientX, y0: e.clientY, active: false, touch: e.pointerType !== "mouse", grabYM: ymAt(e.clientX) || addMonthsYM(startYM, i.col) };
      dragRef.current = d;
      if (d.touch) d.timer = setTimeout(() => { if (dragRef.current === d && !d.active) activate(d); }, 350);
    },
    edge: (e, i, mode) => {
      e.stopPropagation();
      if (e.pointerType === "mouse") { if (e.button !== 0) return; e.preventDefault(); }
      const d = { mode, item: i, x0: e.clientX, y0: e.clientY, active: false, touch: e.pointerType !== "mouse" };
      dragRef.current = d;
      activate(d);
    },
  };
  latest.current = { stop, rangeFor, applyRange, ymAt, activate };
  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const L = latest.current;
      const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (!d.active) {
        if (d.touch) { if (dist > 8) L.stop(); return; }
        if (dist < 5) return;
        L.activate(d);
      }
      const y = L.ymAt(e.clientX);
      const sc = rootRef.current && rootRef.current.parentElement;
      if (sc) { const r = sc.getBoundingClientRect(); d.scrollBy = e.clientX < r.left + 40 ? -12 : e.clientX > r.right - 40 ? 12 : 0; }
      if (y) setPreview({ item: d.item, ...L.rangeFor(d, y) });
    };
    const end = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const L = latest.current;
      if (d.active) {
        clickBlock.current = true;
        setTimeout(() => { clickBlock.current = false; }, 0);
        const y = e.type === "pointercancel" ? "" : L.ymAt(e.clientX);
        if (y) {
          const r = L.rangeFor(d, y);
          if (r.from !== d.item.from || r.to !== (d.item.to || d.item.from)) L.applyRange(d.item, r.from, r.to);
        }
      }
      L.stop();
    };
    const block = (e) => { if (dragRef.current && dragRef.current.active) e.preventDefault(); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("contextmenu", block);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("contextmenu", block);
    };
  }, []);

  const cols = `150px minmax(130px,1.1fr) repeat(${months}, minmax(0,1fr))`;
  const open = (item) => {
    if (item.kind === "art") onOpenArt(item.refId);
    else if (item.kind === "goal") onOpenGoal(item.refId);
    else onOpenPath();
  };
  const select = (item) => { if (clickBlock.current) return; open(item); };
  const shift = (n) => setStartYM((s) => addMonthsYM(s, n));
  const atToday = startYM === ymOf(now);
  const hasAnything = model.lanes.length || model.unscheduled.length || model.later.length;

  return (
    <div className="tl-root">
      <style>{CSS}</style>
      {mode !== "timeline" && <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
        {mode !== "plan" && <span onClick={() => setView("timeline")} style={btn(view === "timeline")} role="button">Timeline</span>}
        <span onClick={() => setView("list")} style={btn(view === "list")} role="button">By date</span>
        {onTaskLists && <span onClick={() => setView("lists")} style={btn(view === "lists")} role="button">Lists{taskLists.length ? ` (${taskLists.length})` : ""}</span>}
        {goalsPanel && <span onClick={() => setView("goals")} style={btn(view === "goals")} role="button">Goals</span>}
        {pathPanel && <span onClick={() => setView("path")} style={btn(view === "path")} role="button">Path</span>}
        <span style={{ width: "12px" }} />
        <span style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em" }}>Add</span>
        {onAddGoal && <span onClick={() => { if (isPanel) setView(mode === "plan" ? "list" : "timeline"); setPlacing(null); setPanel(panel === "place" && !isPanel ? null : "place"); }} style={btn(panel === "place" && !isPanel)} role="button">+ Place something</span>}
        {onAddArt && <span onClick={onAddArt} style={btn(false)} role="button">+ Art project</span>}
        {onAddGoal && <span onClick={() => { if (isPanel) setView(mode === "plan" ? "list" : "timeline"); setPanel(panel === "import" && !isPanel ? null : "import"); }} style={btn(panel === "import" && !isPanel)} role="button">Import suggestions</span>}
      </div>}
      {view === "timeline" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
          <span onClick={() => shift(-3)} style={btn(false)} role="button" aria-label="Earlier">←</span>
          <span onClick={() => setStartYM(ymOf(now))} style={btn(atToday)} role="button">This month</span>
          <span onClick={() => shift(3)} style={btn(false)} role="button" aria-label="Later">→</span>
          <span style={{ width: "12px" }} />
          <span onClick={() => setMonths(6)} style={btn(months === 6)} role="button">6 months</span>
          <span onClick={() => setMonths(12)} style={btn(months === 12)} role="button">12 months</span>
          <span style={{ ...small, marginLeft: "auto" }}>Click a project to open it. Drag it sideways to move it (on a phone, press and hold first) and drag its edges to change its length. Dashed means no dates set yet.</span>
        </div>
      )}

      {view === "lists" && onTaskLists && <TaskLists lists={taskLists} onChange={onTaskLists} categories={categories} today={now} onAddGoal={onAddGoal} />}
      {isPanel && panels[view]}

      {!isPanel && mode !== "timeline" && (() => {
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

      {!isPanel && mode !== "timeline" && onInboxAdd && (
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

      {view === "timeline" && preview && (
        <p style={{ ...small, margin: "0 0 10px", color: INK }}>{preview.item.title}: {preview.from === preview.to ? labelYM(preview.from) : `${labelYM(preview.from)} to ${labelYM(preview.to)}`}</p>
      )}
      {view === "timeline" && !preview && moved && (
        <p style={{ ...small, margin: "0 0 10px", color: INK }}>
          Moved {moved.title} to {moved.label}.{" "}
          <span onClick={undoMove} role="button" style={{ color: LINK_BLUE, textDecoration: "underline", cursor: "pointer" }}>Undo</span>{" "}
          <span onClick={() => setMoved(null)} role="button" aria-label="Dismiss" style={{ cursor: "pointer", marginLeft: "6px" }}>×</span>
        </p>
      )}

      {view === "timeline" && hasAnything ? (
        <div style={{ overflowX: "auto", paddingTop: "26px" }}>
          <div ref={rootRef} style={{ position: "relative", minWidth: months === 12 ? "1250px" : "860px" }}>
            {/* bands */}
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: cols, columnGap: "6px", pointerEvents: "none" }}>
              <div />
              <div style={{ border: `2px dashed ${LINE}`, borderRadius: "12px" }} />
              {model.months.map((m) => (
                <div key={m.ym} data-ym={m.ym} className="tl-band" style={{
                  position: "relative", borderRadius: "12px", background: m.index === model.nowIndex ? NOW_BG : preview && ymIndex(m.ym) >= ymIndex(preview.from) && ymIndex(m.ym) <= ymIndex(preview.to) ? "#e8e6fb" : "#fff", border: m.index === model.nowIndex ? "none" : `1px solid ${LINE}`,
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
                          {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} onSelect={select} drag={drag} />)}
                        </div>
                      </details>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {L.done.map((i) => <Pill key={i.id} item={i} color={L.color} onSelect={select} drag={drag} />)}
                      </div>
                    )}
                  </div>
                  {L.rows.map((row, r) => row.map((i) => (
                    <div key={i.id} style={{ gridColumn: `${3 + i.col} / span ${i.span}`, gridRow: r + 1, minWidth: 0, padding: "0 6px" }}>
                      <Pill item={i} color={L.color} onSelect={select} drag={drag} />
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

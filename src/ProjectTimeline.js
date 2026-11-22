import { useEffect, useMemo, useRef, useState } from "react";
import { PlaceWizard, ImportBox } from "./PlaceThis";
import TaskLists from "./TaskListsView";
import WeekView from "./WeekView";
import { importIntoLists } from "./listOps";
import { buildTimeline, groupList, comingUp, LIST_GROUPS, ymOf, addMonthsYM, labelYM, rangePatch, addDays, daysBetween, fmtDay } from "./timelineEngine";

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
@media (hover: hover) { .tl-root .tl-grip { opacity: 0 !important; } .tl-root .tl-pill:hover .tl-grip { opacity: .95 !important; } }
.tl-root .tl-band { transition: background .12s ease; }
`;
// Start and end a pill part-way into its months, from the real dates (percent margins on a grid item
// are measured against its grid area, so they line up with the month columns).
const MIN_PILL = 0.4; // of one month column, so a short item stays readable
function dayInset(i) {
  let lf = i.fromFrac || 0, rf = 1 - (i.toFrac == null ? 1 : i.toFrac);
  if (i.span === 1 && 1 - lf - rf < MIN_PILL) {
    if (lf + MIN_PILL <= 1) rf = 1 - lf - MIN_PILL; else { lf = 1 - MIN_PILL; rf = 0; }
  }
  return { marginLeft: `${(lf / i.span) * 100}%`, marginRight: `${(rf / i.span) * 100}%` };
}
const edgeStyle = (side) => ({
  position: "absolute", top: 0, bottom: 0, [side]: 0, width: "9px", display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "ew-resize", touchAction: "none",
});
function Pill({ item, color, onSelect, drag }) {
  const done = item.zone === "done";
  const plain = done || item.ghost || item.overdue;
  const style = {
    display: "block", padding: "4px 9px", borderRadius: item.span > 1 ? "8px" : "999px",
    fontFamily: TNR, fontSize: "11px", lineHeight: 1.25, color: plain ? INK : color.text, cursor: drag && drag.can(item) ? "grab" : "pointer", textAlign: "left",
    background: done || item.ghost ? "#fff" : color.fill,
    border: item.ghost ? `1px dashed ${color.edge}` : `1px solid ${color.edge}`,
    width: "100%", boxSizing: "border-box", minWidth: 0, appearance: "none", position: "relative",
  };
  if (drag) { style.userSelect = "none"; style.WebkitUserSelect = "none"; style.WebkitTouchCallout = "none"; }
  if (item.overdue) { style.border = "1px solid #b01904"; style.background = "#fff"; }
  if (item.paused) style.opacity = 0.7;
  const tag = item.overdue ? "overdue" : item.who;
  const nowrap = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const sub = plain ? MUTED : color.text;
  const grip = (side, mode) => drag && (mode === "start" ? drag.canStart(item) : drag.canEnd(item)) && (
    <span aria-label={`Change ${mode} of ${item.title}`} onPointerDown={(e) => drag.edge(e, item, mode)} style={edgeStyle(side)}>
      <span className="tl-grip" style={{ width: "2px", height: "50%", borderRadius: "2px", background: plain ? MUTED : color.edge === color.fill ? "rgba(255,255,255,.8)" : color.edge, opacity: 0.55 }} />
    </span>
  );
  return (
    <button type="button" className="tl-pill" onPointerDown={drag ? (e) => drag.body(e, item) : undefined} onClick={() => onSelect(item)} title={[item.title, tag, item.note].filter(Boolean).join(" · ")} style={style}>
      <span style={{ display: "block", ...nowrap, fontWeight: done ? 400 : 600 }}>{item.clippedStart ? "← " : ""}{done ? "✓ " : ""}{item.title}{item.clippedEnd ? " →" : ""}</span>
      {(tag || item.note) && (
        <span style={{ display: "block", ...nowrap, fontSize: "10px", color: sub, opacity: 0.85 }}>
          {tag && <span style={{ color: item.overdue ? "#b01904" : sub }}>{tag}</span>}{tag && item.note ? " · " : ""}{item.note && <span>{item.note}</span>}
        </span>
      )}
      {grip("left", "start")}
      {grip("right", "end")}
    </button>
  );
}

export default function ProjectTimeline({
  artProjects, projects, steps, onOpenArt, onOpenGoal, onOpenPath, mode = "all", onAddGoal, onAddArt, onUpdateArt, onUpdateGoal, categories, view: viewProp, onView, goalsPanel, artPanel, pathPanel, taskLists = [], onTaskLists, inbox = [], onInboxAdd, onInboxRemove, today,
}) {
  const now = today || new Date();
  const [months, setMonths] = useState(6);
  const [scale, setScale] = useState("months"); // "weeks" (five weeks in view) | "months"
  const [weekOffset, setWeekOffset] = useState(0);
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
  const [preview, setPreview] = useState(null); // { item, from, to, x1, x2 } while a pill is being moved or resized
  const [moved, setMoved] = useState(null);
  const bands = () => (rootRef.current ? Array.from(rootRef.current.querySelectorAll("[data-ym]")) : []);
  // The exact day under a pointer: which month column it is in, and how far across that column.
  const isoAt = (x) => {
    for (const el of bands()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - 3 && x <= r.right + 3) {
        const ym = el.getAttribute("data-ym");
        const [y, m] = ym.split("-").map(Number);
        const dim = new Date(y, m, 0).getDate();
        const f = Math.min(1, Math.max(0, (x - r.left) / (r.right - r.left)));
        return `${ym}-${String(Math.min(dim, Math.floor(f * dim) + 1)).padStart(2, "0")}`;
      }
    }
    return "";
  };
  // The pointer x (in the page) of the start or end of a day, for drawing the guide.
  const xOfISO = (iso, edge) => {
    const bs = bands();
    if (!bs.length) return 0;
    const ym = iso.slice(0, 7);
    const el = bs.find((b) => b.getAttribute("data-ym") === ym);
    if (!el) return ym < bs[0].getAttribute("data-ym") ? bs[0].getBoundingClientRect().left : bs[bs.length - 1].getBoundingClientRect().right;
    const r = el.getBoundingClientRect();
    const [y, m, d] = iso.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    return r.left + ((d - 1 + (edge === "end" ? 1 : 0)) / dim) * (r.right - r.left);
  };
  const upd = (kind) => (kind === "art" ? onUpdateArt : onUpdateGoal);
  const rangeLabel = (f, t) => (f === t ? fmtDay(f) : `${fmtDay(f)} to ${fmtDay(t)}`);
  const applyRange = (it, newFrom, newTo) => {
    const raw = (it.kind === "art" ? artProjects : projects).find((p) => p.id === it.refId);
    if (!raw || !upd(it.kind)) return;
    const patch = rangePatch(raw, it, newFrom, newTo);
    const prev = {};
    Object.keys(patch).forEach((k) => { prev[k] = raw[k]; });
    Object.entries(patch).forEach(([k, v]) => upd(it.kind)(it.refId, k, v));
    setMoved({ title: it.title, kind: it.kind, refId: it.refId, prev, label: rangeLabel(newFrom, newTo) });
  };
  const undoMove = () => {
    if (!moved) return;
    Object.entries(moved.prev).forEach(([k, v]) => upd(moved.kind)(moved.refId, k, v));
    setMoved(null);
  };
  const rangeFor = (d, iso) => {
    const it = d.item, f = it.fromISO, t = it.toISO || it.fromISO;
    if (d.mode === "start") return { from: iso > t ? t : iso, to: t };
    if (d.mode === "end") return { from: f, to: iso < f ? f : iso };
    // An overdue pill sits in the first column but really ended earlier: the drop sets its end day.
    const delta = it.overdue ? daysBetween(t, iso) : daysBetween(d.grabISO, iso);
    return { from: addDays(f, delta), to: addDays(t, delta) };
  };
  const showPreview = (d, iso) => {
    const r = rangeFor(d, iso);
    const left = rootRef.current ? rootRef.current.getBoundingClientRect().left : 0;
    setPreview({ item: d.item, ...r, x1: xOfISO(r.from, "start") - left, x2: xOfISO(r.to, "end") - left });
  };
  const movable = (i) => (i.kind === "art" || i.kind === "goal") && !i.done && i.zone === "grid" && !!i.fromISO;
  const stop = () => {
    const d = dragRef.current;
    if (d && d.timer) clearTimeout(d.timer);
    if (d && d.scroller) clearInterval(d.scroller);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    dragRef.current = null;
    setPreview(null);
  };
  const activate = (d) => {
    d.active = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = d.mode === "move" ? "grabbing" : "ew-resize";
    if (d.touch && navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* not supported */ } }
    const sc = rootRef.current && rootRef.current.parentElement;
    if (sc) d.scroller = setInterval(() => { if (d.scrollBy) sc.scrollLeft += d.scrollBy; }, 16);
    showPreview(d, d.grabISO || d.item.fromISO);
  };
  const drag = {
    can: movable,
    canStart: (i) => movable(i) && !i.clippedStart,
    canEnd: (i) => movable(i) && !i.clippedEnd,
    body: (e, i) => {
      if (!movable(i) || (e.pointerType === "mouse" && e.button !== 0)) return;
      const d = { mode: "move", item: i, x0: e.clientX, y0: e.clientY, active: false, touch: e.pointerType !== "mouse", grabISO: isoAt(e.clientX) || i.fromISO };
      dragRef.current = d;
      if (d.touch) d.timer = setTimeout(() => { if (dragRef.current === d && !d.active) activate(d); }, 350);
    },
    edge: (e, i, mode) => {
      e.stopPropagation();
      if (e.pointerType === "mouse") { if (e.button !== 0) return; e.preventDefault(); }
      const d = { mode, item: i, x0: e.clientX, y0: e.clientY, active: false, touch: e.pointerType !== "mouse", edge: true, grabISO: i.fromISO };
      dragRef.current = d;
      if (d.touch) activate(d); // a mouse edge-drag waits for a few pixels of movement, so a click near the edge still opens the project
    },
  };
  latest.current = { stop, rangeFor, applyRange, isoAt, activate, showPreview };
  useEffect(() => {
    const move = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const L = latest.current;
      const dist = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
      if (!d.active) {
        if (d.touch) { if (dist > 8) L.stop(); return; }
        if (dist < (d.edge ? 4 : 5)) return;
        L.activate(d);
      }
      const iso = L.isoAt(e.clientX);
      const sc = rootRef.current && rootRef.current.parentElement;
      if (sc) { const r = sc.getBoundingClientRect(); d.scrollBy = e.clientX < r.left + 40 ? -12 : e.clientX > r.right - 40 ? 12 : 0; }
      if (iso) L.showPreview(d, iso);
    };
    const end = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const L = latest.current;
      if (d.active) {
        clickBlock.current = true;
        setTimeout(() => { clickBlock.current = false; }, 0);
        const iso = e.type === "pointercancel" ? "" : L.isoAt(e.clientX);
        if (iso) {
          const r = L.rangeFor(d, iso);
          if (r.from !== d.item.fromISO || r.to !== (d.item.toISO || d.item.fromISO)) L.applyRange(d.item, r.from, r.to);
        }
      }
      L.stop();
    };
    const block = (e) => { if (dragRef.current && dragRef.current.active) e.preventDefault(); };
    const esc = (e) => { if (e.key === "Escape" && dragRef.current) { clickBlock.current = true; setTimeout(() => { clickBlock.current = false; }, 0); latest.current.stop(); } };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("contextmenu", block);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("keydown", esc);
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
        {artPanel && <span onClick={() => setView("art")} role="button" style={{ fontFamily: TNR, fontSize: "12px", color: view === "art" ? LINK_BLUE : MUTED, textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer", marginLeft: "2px" }}>art projects</span>}
        <span style={{ width: "12px" }} />
        <span style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em" }}>Add</span>
        {onAddGoal && <span onClick={() => { if (isPanel) setView(mode === "plan" ? "list" : "timeline"); setPlacing(null); setPanel(panel === "place" && !isPanel ? null : "place"); }} style={btn(panel === "place" && !isPanel)} role="button">+ Place something</span>}
        {onAddArt && <span onClick={onAddArt} style={btn(false)} role="button">+ Art project</span>}
        {onAddGoal && <span onClick={() => { if (isPanel) setView(mode === "plan" ? "list" : "timeline"); setPanel(panel === "import" && !isPanel ? null : "import"); }} style={btn(panel === "import" && !isPanel)} role="button">Import suggestions</span>}
      </div>}
      {view === "timeline" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "18px" }}>
          {scale === "weeks" ? <>
            <span onClick={() => setWeekOffset((o) => o - 1)} style={btn(false)} role="button" aria-label="Earlier">←</span>
            <span onClick={() => setWeekOffset(0)} style={btn(weekOffset === 0)} role="button">This week</span>
            <span onClick={() => setWeekOffset((o) => o + 1)} style={btn(false)} role="button" aria-label="Later">→</span>
          </> : <>
            <span onClick={() => shift(-3)} style={btn(false)} role="button" aria-label="Earlier">←</span>
            <span onClick={() => setStartYM(ymOf(now))} style={btn(atToday)} role="button">This month</span>
            <span onClick={() => shift(3)} style={btn(false)} role="button" aria-label="Later">→</span>
          </>}
          <span style={{ width: "12px" }} />
          <span onClick={() => setScale("weeks")} style={btn(scale === "weeks")} role="button">Month in view</span>
          <span onClick={() => { setScale("months"); setMonths(6); }} style={btn(scale === "months" && months === 6)} role="button">6 months</span>
          <span onClick={() => { setScale("months"); setMonths(12); }} style={btn(scale === "months" && months === 12)} role="button">12 months</span>
          <span style={{ ...small, marginLeft: "auto" }}>{scale === "weeks" ? "Last week, this week and the next three. A blue edge marks where a new month begins. Click a project to open it." : <>Click a project to open it. Drag it to move it to another day (on a phone, press and hold first), drag its edges to change its length, Esc to cancel. Dashed means no dates set yet.</>}</span>
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

      {view === "timeline" && scale === "months" && (
        // fixed height, so showing or hiding it never shifts the calendar under the pointer mid-drag
        <p style={{ ...small, margin: "0 0 8px", color: INK, height: "18px", lineHeight: "18px", overflow: "hidden", whiteSpace: "nowrap" }}>
          {preview ? (
            <>{preview.item.title}: {rangeLabel(preview.from, preview.to)}</>
          ) : moved ? (
            <>
              Moved {moved.title} to {moved.label}.{" "}
              <span onClick={undoMove} role="button" style={{ color: LINK_BLUE, textDecoration: "underline", cursor: "pointer" }}>Undo</span>{" "}
              <span onClick={() => setMoved(null)} role="button" aria-label="Dismiss" style={{ cursor: "pointer", marginLeft: "6px" }}>×</span>
            </>
          ) : null}
        </p>
      )}

      {view === "timeline" && scale === "weeks" && (
        <WeekView items={model.all} milestones={model.milestones} taskLists={taskLists} today={now} offset={weekOffset} onSelect={select} />
      )}

      {view === "timeline" && scale === "months" && hasAnything ? (
        <div style={{ overflowX: "auto", paddingTop: "26px" }}>
          <div ref={rootRef} style={{ position: "relative", minWidth: months === 12 ? "1250px" : "860px" }}>
            {/* bands */}
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: cols, columnGap: "6px", pointerEvents: "none" }}>
              <div />
              <div style={{ border: `2px dashed ${LINE}`, borderRadius: "12px" }} />
              {model.months.map((m) => (
                <div key={m.ym} data-ym={m.ym} className="tl-band" style={{
                  position: "relative", borderRadius: "12px", background: m.index === model.nowIndex ? NOW_BG : "#fff", border: m.index === model.nowIndex ? "none" : `1px solid ${LINE}`,
                  boxShadow: m.index === model.nowIndex ? `inset 0 0 0 1.5px ${LINK_BLUE}` : "none",
                }}>
                  {m.index === model.nowIndex && (
                    <span title={`Today, ${now.getDate()} ${labelYM(m.ym).split(" ")[0]}`} style={{ position: "absolute", top: "50px", bottom: "8px", left: `${((now.getDate() - 0.5) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100}%`, width: 0, borderLeft: `1.5px dashed ${LINK_BLUE}`, opacity: 0.45 }} />
                  )}
                  {m.index === model.nowIndex && (
                    <span style={{ position: "absolute", top: "-26px", left: "50%", transform: "translateX(-50%)", background: LINK_BLUE, color: "#fff", fontFamily: TNR, fontSize: "12px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>We are here</span>
                  )}
                </div>
              ))}
            </div>

            {preview && (
              <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: `${preview.x1}px`, width: `${Math.max(3, preview.x2 - preview.x1)}px`, background: "rgba(26, 13, 171, 0.09)", borderLeft: `1.5px solid ${LINK_BLUE}`, borderRight: `1.5px solid ${LINK_BLUE}`, boxSizing: "border-box", pointerEvents: "none", borderRadius: "4px" }} />
            )}

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
                    <div key={i.id} style={{ gridColumn: `${3 + i.col} / span ${i.span}`, gridRow: r + 1, minWidth: 0, padding: "0 6px", ...dayInset(i) }}>
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

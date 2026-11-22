// Pure helpers that turn art projects, quarterly goals and the study path into
// timeline lanes. No React in here so it can be tested on its own.

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ymOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const ymIndex = (ym) => { const [y, m] = ym.split("-").map(Number); return y * 12 + (m - 1); };
export const ymFromIndex = (i) => `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}`;
export const addMonthsYM = (ym, n) => ymFromIndex(ymIndex(ym) + n);
export const labelYM = (ym) => { const [y, m] = ym.split("-").map(Number); return `${MONTH_SHORT[m - 1]} ${y}`; };

const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isYM = (s) => typeof s === "string" && /^\d{4}-\d{2}$/.test(s);
const toYM = (s) => (isISO(s) ? s.slice(0, 7) : isYM(s) ? s : "");

const pad2 = (n) => String(n).padStart(2, "0");
const daysIn = (y, m) => new Date(y, m, 0).getDate(); // m is 1-12
/** Move an ISO date by n months, keeping the day where the month is long enough. */
export function shiftDate(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const ym = ymFromIndex(y * 12 + (m - 1) + n);
  const [ny, nm] = ym.split("-").map(Number);
  return `${ym}-${pad2(Math.min(d, daysIn(ny, nm)))}`;
}
/**
 * The field changes for moving or resizing a timeline item. `item` has from/to (YYYY-MM).
 * nFrom and nTo are how many months the start and the end move (equal for a plain move).
 * Exact dates shift by that many months; month-only or derived dates become the first and last day of the new months.
 */
export function movePatch(raw, item, nFrom, nTo = nFrom) {
  const newFrom = addMonthsYM(item.from, nFrom);
  const newTo = addMonthsYM(item.to || item.from, nTo);
  const [ty, tm] = newTo.split("-").map(Number);
  const patch = {
    startDate: isISO(raw.startDate) ? shiftDate(raw.startDate, nFrom) : `${newFrom}-01`,
    endDate: isISO(raw.endDate) ? shiftDate(raw.endDate, nTo) : `${newTo}-${pad2(daysIn(ty, tm))}`,
  };
  if (patch.startDate > patch.endDate) patch.startDate = patch.endDate; // resized start past the end day in the same month
  if (isISO(raw.keyDate) && nTo !== 0) patch.keyDate = shiftDate(raw.keyDate, nTo);
  if (item.kind === "goal") {
    if (raw.dueMonth && nTo !== 0) patch.dueMonth = `${MONTH_SHORT[tm - 1]} ${ty}`;
    if (!isISO(raw.endDate)) patch.dueExact = false; // a month, not a day
  }
  return patch;
}

// Where in its month a date sits, 0 to 1: the start of a day, and the end of a day.
const dayFracStart = (iso) => { const [y, m, d] = iso.split("-").map(Number); return (d - 1) / daysIn(y, m); };
const dayFracEnd = (iso) => { const [y, m, d] = iso.split("-").map(Number); return d / daysIn(y, m); };

// "June", "Jun 2027", "November 2026" -> "2027-06". Anything else -> "".
export function parseDueMonth(text, defaultYear) {
  if (!text) return "";
  const t = String(text).toLowerCase();
  const mi = MONTH_NAMES.findIndex((m) => new RegExp(`\\b${m}\\b`).test(t) || new RegExp(`\\b${m.slice(0, 3)}\\b`).test(t));
  if (mi < 0) return "";
  const yr = t.match(/\b(20\d{2})\b/);
  return `${yr ? yr[1] : defaultYear}-${String(mi + 1).padStart(2, "0")}`;
}

// Lane colours are the same ones the planner grid uses (MODE_COLORS in App.js):
// link blue at the grid's exec-demand opacities, hot pinks, cyan and greys.
const BLUE = "#1a0dab";
const c = (fill, text = "#fff", edge = fill) => ({ fill, text, edge });
const ART_COLOUR = c("rgba(26, 13, 171, 1.0)");                       // growth
const PATH_COLOUR = c("#888888");                                      // rest
const CATEGORY_COLOURS = {
  "Studio production": c("rgba(26, 13, 171, 0.25)", "#1a1a1a", BLUE),  // making
  "Client / commissions": c("rgba(26, 13, 171, 0.75)"),               // comms
  "Finance / systems": c("rgba(26, 13, 171, 0.5)"),                    // systems
  "Health / regulation": c("#00a8ff", "#1a1a1a"),                      // health
  "Practice development": c("#aaaaaa", "#1a1a1a"),                     // office
  "Opportunities / applications": c("#C2185B"),                        // Social *
  "Personal / life admin": c("#F72798"),                               // social
};
const FALLBACK_COLOUR = c("#aaaaaa", "#1a1a1a");

const QUARTER_FIRST = { q1: 1, q2: 4, q3: 7, q4: 10 };

/**
 * data: { artProjects, projects, steps }   (steps = studyPath.plan.steps or [])
 * view: { startYM, months }                 (first visible month, number of month columns)
 * Returns { months:[{ym,label,index}], lanes:[{key,label,color,done:[item], rows:[[item]]}],
 *           unscheduled:[item], later:[item], nowIndex }
 * item: { id, kind:'art'|'goal'|'step', refId, title, who, col, span, done, ghost, overdue, from, to, note }
 */
export function buildTimeline(data, view, today = new Date()) {
  const nowYM = ymOf(today);
  const year = today.getFullYear();
  const n = view.months;
  const startIdx = ymIndex(view.startYM);
  const endIdx = startIdx + n - 1;
  const months = Array.from({ length: n }, (_, i) => ({ ym: ymFromIndex(startIdx + i), label: labelYM(ymFromIndex(startIdx + i)), index: i }));
  const nowIndex = ymIndex(nowYM) - startIdx;

  const lanesMap = new Map();
  const unscheduled = [];
  const all = [];
  const milestones = [];
  const later = [];
  const lane = (key, label, color) => {
    if (!lanesMap.has(key)) lanesMap.set(key, { key, label, color, items: [] });
    return lanesMap.get(key);
  };

  const place = (laneObj, item) => {
    all.push({ ...item, lane: laneObj.label, color: laneObj.color, from: item.fromYM || "", to: item.toYM || item.fromYM || "" });
    // item has fromYM / toYM or none
    if (!item.fromYM) { unscheduled.push({ ...item, lane: laneObj.label }); return; }
    const a = ymIndex(item.fromYM), b = Math.max(a, ymIndex(item.toYM || item.fromYM));
    item.from = item.fromYM; item.to = item.toYM || item.fromYM;
    if (item.done) { laneObj.items.push({ ...item, zone: "done" }); return; }
    if (a > endIdx) { later.push({ ...item, lane: laneObj.label }); return; }
    if (b < startIdx) { laneObj.items.push({ ...item, zone: "grid", col: 0, span: 1, overdue: true, fromFrac: 0, toFrac: 1 }); return; }
    const c0 = Math.max(a, startIdx) - startIdx;
    const c1 = Math.min(b, endIdx) - startIdx;
    laneObj.items.push({ ...item, zone: "grid", col: c0, span: c1 - c0 + 1, clippedStart: a < startIdx, clippedEnd: b > endIdx, fromFrac: a < startIdx ? 0 : item.fromFrac || 0, toFrac: b > endIdx ? 1 : item.toFrac == null ? 1 : item.toFrac });
  };

  // Art projects
  (data.artProjects || []).forEach((p) => {
    if (p.status === "declined") return;
    const l = lane("art", "Art projects", ART_COLOUR);
    const fromYM = toYM(p.startDate) || toYM(p.keyDate);
    const toYMv = toYM(p.endDate) || toYM(p.keyDate) || fromYM;
    const aFromYM = fromYM && toYMv && ymIndex(fromYM) > ymIndex(toYMv) ? toYMv : fromYM;
    const sISO = isISO(p.startDate) ? p.startDate : !p.startDate && isISO(p.keyDate) ? p.keyDate : "";
    const eISO = isISO(p.endDate) ? p.endDate : isISO(p.keyDate) ? p.keyDate : "";
    place(l, {
      fromFrac: sISO && toYM(sISO) === aFromYM ? dayFracStart(sISO) : 0,
      toFrac: eISO && toYM(eISO) === toYMv ? dayFracEnd(eISO) : 1,
      id: `art:${p.id}`, kind: "art", refId: p.id, title: p.title || "Untitled project",
      who: p.stage ? p.stage.replace(/_/g, " ") : "", note: p.keyDateLabel || "",
      fromYM: fromYM && toYMv && ymIndex(fromYM) > ymIndex(toYMv) ? toYMv : fromYM, toYM: toYMv,
      dueISO: isISO(p.endDate) ? p.endDate : isISO(p.keyDate) ? p.keyDate : "",
      done: p.status === "complete", ghost: p.status === "paused" || (!p.startDate && !p.endDate),
      paused: p.status === "paused",
    });
  });

  // Quarterly goals (goals made by "Plan this path" live in the Study path lane instead)
  (data.projects || []).forEach((p) => {
    if (p.fromPath) return;
    if (!p.title) return;
    const l = lane(`goal:${p.category}`, p.category || "Goals", CATEGORY_COLOURS[p.category] || FALLBACK_COLOUR);
    let due = parseDueMonth(p.dueMonth, year);
    const qFirst = QUARTER_FIRST[p.quarter];
    const qStart = qFirst ? `${year}-${String(qFirst).padStart(2, "0")}` : "";
    // "January" on a Q4 goal with no year means next January, not the one that has already passed.
    if (due && qStart && !/\b20\d{2}\b/.test(String(p.dueMonth)) && ymIndex(due) < ymIndex(qStart)) due = addMonthsYM(due, 12);
    const qEnd = qStart ? addMonthsYM(qStart, 2) : "";
    const toV = toYM(p.endDate) || due || qEnd;
    let fromV = toYM(p.startDate) || (due && qStart && ymIndex(qStart) <= ymIndex(due) ? qStart : "") || qStart || due;
    if (fromV && toV && ymIndex(fromV) > ymIndex(toV)) fromV = toV;
    const gSISO = isISO(p.startDate) ? p.startDate : "";
    const gEISO = isISO(p.endDate) && p.dueExact !== false ? p.endDate : "";
    place(l, {
      fromFrac: gSISO && toYM(gSISO) === fromV ? dayFracStart(gSISO) : 0,
      toFrac: gEISO && toYM(gEISO) === toV ? dayFracEnd(gEISO) : 1,
      id: `goal:${p.id}`, kind: "goal", refId: p.id, title: p.title,
      who: [p.importance === 2 ? "!" : "", p.waiting ? "waiting" : "", p.status === "at-risk" ? "at risk" : p.status === "behind" ? "behind" : "", p.enthusiasm === "dread" ? "dreaded" : ""].filter(Boolean).join(" · "),
      note: p.nextMilestone || p.nextAction || "",
      fromYM: fromV, toYM: toV,
      dueISO: isISO(p.endDate) && p.dueExact !== false ? p.endDate : "",
      done: p.status === "done", ghost: (!p.startDate && !p.endDate && !due) || !!p.waiting,
      status: p.status,
    });
  });

  // Study path steps
  (data.steps || []).forEach((s) => {
    (s.side || []).forEach((d) => { if (d && isISO(d.on)) milestones.push({ title: d.title, dueISO: d.on, lane: "Study path", color: PATH_COLOUR, expected: !!d.expected }); });
    const l = lane("path", "Study path", PATH_COLOUR);
    place(l, {
      id: `step:${s.id}`, kind: "step", refId: s.id, title: s.title, who: s.kind === "apply" ? "apply" : "",
      note: s.when || "", fromYM: toYM(s.from), toYM: toYM(s.to), done: false,
    });
  });

  // Pack each lane's grid items into rows so they don't overlap
  const order = ["art", "path"];
  const lanes = [...lanesMap.values()]
    .sort((a, b) => {
      const ai = order.indexOf(a.key), bi = order.indexOf(b.key);
      return (ai < 0 ? 9 : ai) - (bi < 0 ? 9 : bi) || a.label.localeCompare(b.label);
    })
    .map((L) => {
      const grid = L.items.filter((i) => i.zone === "grid").sort((a, b) => a.col - b.col || b.span - a.span);
      const rows = [];
      grid.forEach((it) => {
        let r = rows.find((row) => row.every((o) => it.col >= o.col + o.span || it.col + it.span <= o.col));
        if (!r) { r = []; rows.push(r); }
        r.push(it);
      });
      return {
        key: L.key, label: L.label, color: L.color,
        done: L.items.filter((i) => i.zone === "done"),
        rows,
      };
    })
    .filter((L) => L.done.length || L.rows.length);

  return { months, lanes, unscheduled, later, nowIndex, all, milestones };
}

export const LIST_GROUPS = [
  { key: "overdue", label: "Overdue" },
  { key: "now", label: "This month" },
  { key: "soon", label: "Next three months" },
  { key: "later", label: "Later" },
  { key: "undated", label: "Needs a date" },
  { key: "done", label: "Done" },
];

/** Everything in one list, grouped by when it is due. `all` comes from buildTimeline. */
export function groupList(all, nowYM) {
  const now = ymIndex(nowYM);
  const groups = Object.fromEntries(LIST_GROUPS.map((g) => [g.key, []]));
  all.forEach((it) => {
    let g;
    if (it.done) g = "done";
    else if (!it.from) g = "undated";
    else {
      const a = ymIndex(it.from), b = ymIndex(it.to || it.from);
      g = b < now ? "overdue" : a <= now ? "now" : a - now <= 3 ? "soon" : "later";
    }
    groups[g].push(it);
  });
  Object.values(groups).forEach((arr) => arr.sort((x, y) => (x.to || "9999").localeCompare(y.to || "9999") || x.title.localeCompare(y.title)));
  return groups;
}

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

/**
 * What is due this week and the next three, plus anything overdue and what is in progress this month.
 * Only items with an exact date appear in the week rows; month-level items appear under "in progress".
 */
export function comingUp(all, milestones, today = new Date(), weeks = 4) {
  const exact = [...all.filter((i) => i.dueISO && !i.done), ...milestones.map((m) => ({ ...m, title: m.title }))];
  const mon = mondayOf(today);
  const rows = Array.from({ length: weeks }, (_, k) => {
    const a = new Date(mon); a.setDate(a.getDate() + k * 7);
    const b = new Date(a); b.setDate(b.getDate() + 6);
    const [ai, bi] = [isoOf(a), isoOf(b)];
    return { label: k === 0 ? "This week" : `W+${k}`, from: ai, to: bi, items: exact.filter((i) => i.dueISO >= ai && i.dueISO <= bi).sort((x, y) => x.dueISO.localeCompare(y.dueISO)) };
  });
  const overdue = exact.filter((i) => i.dueISO < isoOf(mon)).sort((x, y) => x.dueISO.localeCompare(y.dueISO));
  const nowYM = ymOf(today);
  const inProgress = all.filter((i) => !i.done && i.from && ymIndex(i.from) <= ymIndex(nowYM) && ymIndex(i.to || i.from) >= ymIndex(nowYM) && !i.ghost);
  return { rows, overdue, inProgress };
}

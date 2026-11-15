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

// "June", "Jun 2027", "November 2026" -> "2027-06". Anything else -> "".
export function parseDueMonth(text, defaultYear) {
  if (!text) return "";
  const t = String(text).toLowerCase();
  const mi = MONTH_NAMES.findIndex((m) => t.includes(m) || new RegExp(`\\b${m.slice(0, 3)}\\b`).test(t));
  if (mi < 0) return "";
  const yr = t.match(/\b(20\d{2})\b/);
  return `${yr ? yr[1] : defaultYear}-${String(mi + 1).padStart(2, "0")}`;
}

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
  const later = [];
  const lane = (key, label, color) => {
    if (!lanesMap.has(key)) lanesMap.set(key, { key, label, color, items: [] });
    return lanesMap.get(key);
  };

  const place = (laneObj, item) => {
    // item has fromYM / toYM or none
    if (!item.fromYM) { unscheduled.push({ ...item, lane: laneObj.label }); return; }
    const a = ymIndex(item.fromYM), b = Math.max(a, ymIndex(item.toYM || item.fromYM));
    item.from = item.fromYM; item.to = item.toYM || item.fromYM;
    if (item.done) { laneObj.items.push({ ...item, zone: "done" }); return; }
    if (a > endIdx) { later.push({ ...item, lane: laneObj.label }); return; }
    if (b < startIdx) { laneObj.items.push({ ...item, zone: "grid", col: 0, span: 1, overdue: true }); return; }
    const c0 = Math.max(a, startIdx) - startIdx;
    const c1 = Math.min(b, endIdx) - startIdx;
    laneObj.items.push({ ...item, zone: "grid", col: c0, span: c1 - c0 + 1, clippedStart: a < startIdx, clippedEnd: b > endIdx });
  };

  // Art projects
  (data.artProjects || []).forEach((p) => {
    if (p.status === "declined") return;
    const l = lane("art", "Art projects", "#b7d3e9");
    const fromYM = toYM(p.startDate) || toYM(p.keyDate);
    const toYMv = toYM(p.endDate) || toYM(p.keyDate) || fromYM;
    place(l, {
      id: `art:${p.id}`, kind: "art", refId: p.id, title: p.title || "Untitled project",
      who: p.stage ? p.stage.replace(/_/g, " ") : "", note: p.keyDateLabel || "",
      fromYM: fromYM && toYMv && ymIndex(fromYM) > ymIndex(toYMv) ? toYMv : fromYM, toYM: toYMv,
      done: p.status === "complete", ghost: p.status === "paused" || (!p.startDate && !p.endDate),
      paused: p.status === "paused",
    });
  });

  // Quarterly goals (goals made by "Plan this path" live in the Study path lane instead)
  (data.projects || []).forEach((p) => {
    if (p.fromPath) return;
    if (!p.title) return;
    const l = lane(`goal:${p.category}`, p.category || "Goals", "#fde25e");
    const due = parseDueMonth(p.dueMonth, year);
    const qFirst = QUARTER_FIRST[p.quarter];
    const qStart = qFirst ? `${year}-${String(qFirst).padStart(2, "0")}` : "";
    const qEnd = qStart ? addMonthsYM(qStart, 2) : "";
    const toV = toYM(p.endDate) || due || qEnd;
    let fromV = toYM(p.startDate) || (due && qStart && ymIndex(qStart) <= ymIndex(due) ? qStart : "") || qStart || due;
    if (fromV && toV && ymIndex(fromV) > ymIndex(toV)) fromV = toV;
    place(l, {
      id: `goal:${p.id}`, kind: "goal", refId: p.id, title: p.title,
      who: p.status === "at-risk" ? "at risk" : p.status === "behind" ? "behind" : "",
      note: p.nextMilestone || p.nextAction || "",
      fromYM: fromV, toYM: toV,
      done: p.status === "done", ghost: !p.startDate && !p.endDate && !due,
      status: p.status,
    });
  });

  // Study path steps
  (data.steps || []).forEach((s) => {
    const l = lane("path", "Study path", s.track === "art" ? "#e2c4db" : "#78c7bb");
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

  return { months, lanes, unscheduled, later, nowIndex };
}

// Five weeks in view: the previous week, this week and the next three, Monday to Sunday.
// Pure helpers (no React) so they can be tested on their own.

const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
const fromNum = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const mondayOf = (iso) => { const n = dayNum(iso); const dow = (new Date(n * 86400000).getUTCDay() + 6) % 7; return fromNum(n - dow); };
export const addDaysISO = (iso, k) => fromNum(dayNum(iso) + k);

/**
 * items: buildTimeline().all (with fromISO/toISO), milestones, taskLists.
 * Returns weeks: [{ start, days:[iso x7], bars:[[{item, c0, c1, clipL, clipR}]] (packed rows), points:{iso:[{title, where, color, done}]} }]
 */
export function buildWeeks({ items = [], milestones = [], taskLists = [], today, offset = 0, weeks = 5, showDone = false }) {
  const first = addDaysISO(mondayOf(today), 7 * (offset - 1));
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const start = addDaysISO(first, 7 * w), end = addDaysISO(start, 6);
    const days = Array.from({ length: 7 }, (_, k) => addDaysISO(start, k));
    const spans = items
      .filter((i) => i.fromISO && i.toISO && (showDone || !i.done) && i.fromISO <= end && i.toISO >= start)
      .sort((a, b) => a.fromISO.localeCompare(b.fromISO) || b.toISO.localeCompare(a.toISO))
      .map((item) => ({
        item,
        c0: Math.max(0, dayNum(item.fromISO) - dayNum(start)),
        c1: Math.min(6, dayNum(item.toISO) - dayNum(start)),
        clipL: item.fromISO < start, clipR: item.toISO > end,
      }));
    const rows = [];
    spans.forEach((s) => {
      const row = rows.find((r) => r.every((o) => o.c1 < s.c0 || o.c0 > s.c1));
      if (row) row.push(s); else rows.push([s]);
    });
    const points = {};
    const add = (iso, p) => { if (iso >= start && iso <= end) (points[iso] = points[iso] || []).push(p); };
    milestones.forEach((m) => add(m.dueISO, { title: m.title, where: m.lane, color: m.color, done: false }));
    taskLists.forEach((l) => l.items.forEach((i) => { if (i.due && (showDone || !i.done)) add(i.due, { title: i.title, where: l.name, done: i.done }); }));
    out.push({ start, end, days, bars: rows, points });
  }
  return out;
}

// What is due soon, and whether this week's grid has any time for it.
// Pure helpers so they can be tested without React.

// Which grid modes count as "working on" each timeline category.
export const MODES_FOR_CATEGORY = {
  "Art projects": ["making", "growth"],
  "Studio production": ["making"],
  "Client / commissions": ["making", "comms"],
  "Finance / systems": ["systems", "comms"],
  "Health / regulation": ["health"],
  "Practice development": ["growth", "making"],
  "Opportunities / applications": ["growth"],
  "Personal / life admin": ["social", "comms"],
  "Study path": ["growth"],
};

// Task-list items have no category, so guess from the wording.
const KEYWORDS = [
  [/\b(make|making|cast|casting|wax|finish|polish|solder|set|setting|fabricat|clean ?up|plate|plating|sand)\w*/i, "making"],
  [/\b(message|email|invoice|reply|call|chase|confirm|book|ship|post|send|order|customs|fulfil)\w*/i, "comms"],
  [/\b(apply|application|research|residenc|proposal|portfolio)\w*/i, "growth"],
  [/\b(photo|instagram|content|caption|website)\w*/i, "content"],
  [/\b(pricing|spreadsheet|system|tax|accounts|vat)\w*/i, "systems"],
];
export function guessModes(title) {
  const out = [];
  KEYWORDS.forEach(([re, m]) => { if (re.test(title || "") && !out.includes(m)) out.push(m); });
  return out;
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/**
 * items: timeline items (buildTimeline().all), milestones: buildTimeline().milestones, taskLists: normalised lists.
 * Returns undone things due before today + `days`, oldest first, each { title, due, where, modes, overdue }.
 */
export function dueSoon({ items = [], milestones = [], taskLists = [], today = new Date(), days = 14 }) {
  const from = iso(today), to = iso(plusDays(today, days));
  const out = [];
  const seen = new Set();
  const push = (x) => {
    if (!x.due || x.due > to) return;
    const key = x.title.toLowerCase() + x.due;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...x, overdue: x.due < from });
  };
  items.forEach((i) => { if (!i.done && i.dueISO) push({ title: i.title, due: i.dueISO, where: i.lane, modes: MODES_FOR_CATEGORY[i.lane] || guessModes(i.title) }); });
  milestones.forEach((m) => { if (m.dueISO >= from) push({ title: m.title, due: m.dueISO, where: m.lane, modes: MODES_FOR_CATEGORY[m.lane] || [] }); });
  taskLists.forEach((l) => l.items.forEach((i) => { if (!i.done && i.due) push({ title: i.title, due: i.due, where: l.name, modes: guessModes(i.title) }); }));
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}

/** Blocks of each mode on the grid this week. */
export function modeCounts(schedule) {
  const c = {};
  Object.values(schedule || {}).forEach((day) => Object.values(day || {}).forEach((m) => { if (m) c[m] = (c[m] || 0) + 1; }));
  return c;
}

/**
 * Adds `gap: true` to items due within `withinDays` that need a mode with no blocks on the grid this week.
 * Items whose kind of work can't be guessed get gap: null (unknown), and are never flagged.
 */
export function withGaps(list, schedule, today = new Date(), withinDays = 7) {
  const c = modeCounts(schedule);
  const soon = iso(plusDays(today, withinDays));
  return list.map((x) => ({ ...x, gap: !x.modes.length ? null : x.due <= soon && !x.modes.some((m) => c[m] > 0) }));
}

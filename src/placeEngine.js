import { ymOf, ymIndex, addMonthsYM, labelYM } from "./timelineEngine";

// The placement question series: six answers decide where a task sits on the map.
//   dateKind  hard | soft | none      (+ date when hard or soft)
//   slip      nothing | annoying | costly     -> importance 0 / 1 / 2
//   feeling   dread | neutral | keen
//   size      hours | days | weeks | months   -> how many months the pill spans
//   waitingOn free text, blank when nothing is blocking it

export const SLIP = [
  { key: "nothing", label: "Nothing happens" },
  { key: "annoying", label: "It's annoying" },
  { key: "costly", label: "It costs money or an opportunity" },
];
export const FEELING = [
  { key: "dread", label: "Dreading it" },
  { key: "neutral", label: "Neutral" },
  { key: "keen", label: "Keen" },
];
export const SIZE = [
  { key: "hours", label: "An hour or two", months: 1 },
  { key: "days", label: "A day or so", months: 1 },
  { key: "weeks", label: "A couple of weeks", months: 2 },
  { key: "months", label: "Months", months: 4 },
];
export const DATE_KIND = [
  { key: "hard", label: "A real deadline" },
  { key: "soft", label: "A target I'd like" },
  { key: "none", label: "No date" },
];

const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const lastDay = (ym) => { const [y, m] = ym.split("-").map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`; };
const longYM = (ym) => { const [y, m] = ym.split("-").map(Number); return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} ${y}`; };
const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * answers -> a Quarterly goal (partial) with start/end dates, plus a plain-English reason.
 * Rule of thumb: what costs you if it slips, and what you are dreading, goes early in the
 * window while energy is highest. Keen, low-stakes tasks sit later as rewards.
 */
export function placeFromAnswers(a, today = new Date()) {
  const nowYM = ymOf(today);
  const importance = Math.max(0, SLIP.findIndex((s) => s.key === a.slip));
  const feeling = FEELING.some((f) => f.key === a.feeling) ? a.feeling : "neutral";
  const size = SIZE.find((s) => s.key === a.size) || SIZE[1];
  const dateKind = DATE_KIND.some((d) => d.key === a.dateKind) ? a.dateKind : "none";
  const dated = dateKind !== "none" && isISO(a.date);
  const reasons = [];
  let startYM, endYM, endISO;

  if (dated) {
    endYM = a.date.slice(0, 7);
    if (ymIndex(endYM) < ymIndex(nowYM)) { endYM = nowYM; reasons.push("the date has passed, so it sits on this month"); }
    startYM = addMonthsYM(endYM, -(size.months - 1));
    if (ymIndex(startYM) < ymIndex(nowYM)) startYM = nowYM;
    endISO = a.date.slice(0, 7) === endYM ? a.date : lastDay(endYM);
    reasons.push(`${dateKind === "hard" ? "deadline" : "target"} ${fmtDate(a.date)}`);
  } else {
    const priority = importance * 2 + (feeling === "dread" ? 1 : feeling === "keen" ? -1 : 0);
    const offset = priority >= 3 ? 0 : priority === 2 ? 1 : priority === 1 ? 2 : 3;
    startYM = addMonthsYM(nowYM, offset);
    endYM = addMonthsYM(startYM, size.months - 1);
    endISO = lastDay(endYM);
    if (importance === 2) reasons.push("costs you if it slips, so early");
    if (feeling === "dread") reasons.push("you are dreading it, so best done early");
    if (feeling === "keen" && importance < 2) reasons.push("you are keen and the stakes are low, so it sits later as a reward");
    if (!reasons.length) reasons.push("no date and low stakes, so it sits later");
  }
  const monthsAway = ymIndex(startYM) - ymIndex(nowYM);
  const sm = Number(startYM.split("-")[1]);
  const waiting = String(a.waitingOn || "").trim();
  if (waiting) reasons.push(`waiting on ${waiting}`);
  return {
    goal: {
      title: String(a.title || "").trim(), category: a.category,
      status: "not-started", horizon: monthsAway <= 0 ? "now" : monthsAway <= 3 ? "next" : "later",
      quarter: `q${Math.ceil(sm / 3)}`, dueMonth: longYM(endYM),
      startDate: `${startYM}-01`, endDate: endISO,
      nextMilestone: dateKind === "hard" && dated ? `Deadline ${fmtDate(a.date)}` : "",
      nextAction: waiting ? `Chase ${waiting}` : "Decide the first physical step.",
      notes: `Placed by the question series: ${reasons.join("; ")}.`,
      importance, enthusiasm: feeling, size: size.key, waiting: !!waiting, waitingOn: waiting,
      isFineArt: false, isProtectedFineArt: false,
    },
    startYM, endYM, why: reasons.join("; "),
    summary: `${labelYM(startYM)}${startYM === endYM ? "" : ` to ${labelYM(endYM)}`}`,
  };
}

const pick = (list, v, d, onGuess) => { if (list.some((x) => x.key === v)) return v; if (onGuess) onGuess(); return d; };

/**
 * Parse pasted proposals (from the monthly review). Accepts a JSON array or { items: [...] }.
 * Anything missing falls back to a neutral answer and is flagged so you can check it.
 */
export function parseProposals(text, categories) {
  let data;
  try { data = JSON.parse(String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "")); }
  catch (e) { return { items: [], error: "That isn't valid JSON. Paste the block exactly as the monthly review gave it." }; }
  const list = Array.isArray(data) ? data : Array.isArray(data && data.items) ? data.items : null;
  if (!list) return { items: [], error: "I expected a list of items." };
  const items = list.filter((x) => x && typeof x.title === "string" && x.title.trim()).slice(0, 60).map((x, i) => {
    const guessed = [];
    const dateKind = pick(DATE_KIND, x.dateKind, "none");
    const slip = pick(SLIP, x.slip, "annoying", () => guessed.push("importance"));
    const feeling = pick(FEELING, x.feeling, "neutral", () => guessed.push("how you feel"));
    const size = pick(SIZE, x.size, "days", () => guessed.push("size"));
    return {
      key: i, include: true, source: String(x.source || "").slice(0, 200), guessed,
      answers: {
        title: x.title.trim().slice(0, 140), category: categories.includes(x.category) ? x.category : "Practice development",
        dateKind: isISO(x.date) ? (dateKind === "none" ? "soft" : dateKind) : "none", date: isISO(x.date) ? x.date : "",
        slip, feeling, size, waitingOn: String(x.waitingOn || "").slice(0, 120),
      },
    };
  });
  return { items, error: items.length ? "" : "No items with a title were found." };
}

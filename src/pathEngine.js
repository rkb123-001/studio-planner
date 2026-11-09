import seed from "./pathCatalogue.json";

// ─────────────────────────────────────────────────────────────────────────────
// Study / career path engine. Pure functions, no React.
//   seed catalogue (pathCatalogue.json) + your own stages/options/overrides
//   → merged catalogue → buildPath() → timeline, summary rows, warnings, steps.
// ─────────────────────────────────────────────────────────────────────────────

export const SEED = seed;
export const uid = () => "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const arr = (x) => (Array.isArray(x) ? x : []);
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

// ── year-month helpers ("YYYY-MM") ───────────────────────────────────────────
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ymStr = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
const parts = (s) => { const [y, m] = String(s).split("-").map(Number); return { y, m }; };
export const addMonths = (s, n) => { const { y, m } = parts(s); const t = y * 12 + (m - 1) + n; return ymStr(Math.floor(t / 12), (t % 12) + 1); };
const diffMonths = (a, b) => { const A = parts(a), B = parts(b); return B.y * 12 + B.m - (A.y * 12 + A.m); };
const nextOnOrAfter = (s, month) => { const { y, m } = parts(s); return m <= month ? ymStr(y, month) : ymStr(y + 1, month); };
export const longYM = (s) => `${MONTHS[parts(s).m - 1]} ${parts(s).y}`;
export const shortYM = (s) => `${MONTHS[parts(s).m - 1].slice(0, 3)} ${parts(s).y}`;
const rangeYM = (a, b) => (a === b ? longYM(a) : `${shortYM(a)} to ${shortYM(b)}`);
const isYM = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ""));
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const fmtDate = (iso) => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const looseDate = (iso, expected) => {
  const d = new Date(iso + "T00:00:00");
  const word = d.getDate() <= 10 ? "Early" : d.getDate() <= 20 ? "Mid" : "Late";
  return `${word} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}${expected ? ", expected" : ""}`;
};
const gbp = (n) => "£" + Math.round(n).toLocaleString("en-GB");

// ── state ────────────────────────────────────────────────────────────────────
export const defaultStudyPath = () => ({
  picks: { ...seed.suggestedPicks },
  assumptions: { ...seed.assumptions },
  custom: { stages: [], options: [] },
  overrides: {},
  hidden: [],
  prefs: "",
  pinned: null,
  plan: null,
  askLog: [],
});

export function mergeCatalogue(path) {
  const custom = (path && path.custom) || { stages: [], options: [] };
  const stages = [...seed.stages];
  arr(custom.stages).forEach((cs) => {
    const s = { tag: "other", sub: "", ...cs };
    const idx = cs.after ? stages.findIndex((x) => x.key === cs.after) : -1;
    stages.splice(idx === -1 ? stages.length : idx + 1, 0, s);
  });
  const hidden = new Set(arr(path && path.hidden));
  const overrides = (path && path.overrides) || {};
  const options = [...seed.options, ...arr(custom.options)]
    .filter((o) => !hidden.has(o.stage + ":" + o.id))
    .map((o) => (overrides[o.stage + ":" + o.id] ? { ...o, ...overrides[o.stage + ":" + o.id], edited: true } : o));
  stages.forEach((s) => {
    if (!options.some((o) => o.stage === s.key && o.id === "none")) {
      options.push({ id: "none", stage: s.key, label: "None", kind: "none", blurb: "Skip this stage.", facts: [] });
    }
  });
  return { stages, options, rules: seed.rules };
}

export const findOpt = (cat, stageKey, id) => cat.options.find((o) => o.stage === stageKey && o.id === id);

const fixPicks = (cat, picks) => {
  const out = {};
  cat.stages.forEach((s) => {
    const want = picks && picks[s.key];
    if (want && findOpt(cat, s.key, want)) out[s.key] = want;
    else if (seed.suggestedPicks[s.key] && findOpt(cat, s.key, seed.suggestedPicks[s.key])) out[s.key] = seed.suggestedPicks[s.key];
    else out[s.key] = "none";
  });
  return out;
};

export function normaliseStudyPath(p) {
  const d = defaultStudyPath();
  const x = { ...d, ...(isObj(p) ? p : {}) };
  x.assumptions = { ...d.assumptions, ...(isObj(x.assumptions) ? x.assumptions : {}) };
  x.custom = { stages: arr(x.custom && x.custom.stages), options: arr(x.custom && x.custom.options) };
  x.overrides = isObj(x.overrides) ? x.overrides : {};
  x.hidden = arr(x.hidden);
  x.prefs = String(x.prefs || "");
  x.askLog = arr(x.askLog).slice(0, 8);
  x.picks = fixPicks(mergeCatalogue(x), x.picks);
  return x;
}

// ── sanitising user / AI supplied options ───────────────────────────────────
const MODES = ["full-time", "part-time", "alongside"];
const LOANS = ["masters", "doctoral"];
const INCOMES = ["keeps", "pauses", "stipend", "varies"];
const str = (v, n) => String(v == null ? "" : v).slice(0, n);
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };

export function cleanOption(o, today = new Date()) {
  const checked = today.toISOString().slice(0, 10);
  const mode = MODES.includes(o.mode) ? o.mode : "full-time";
  const months = Math.min(120, Math.max(1, Math.round(Number(o.months) || 12)));
  const out = {
    label: str(o.label, 80).trim() || "Untitled option",
    blurb: str(o.blurb, 220),
    kind: o.kind === "job" ? "job" : "study",
    mode,
    institution: str(o.institution, 60),
    months,
    outOfWorkMonths: mode === "full-time" ? months : 0,
    feeTotal: num(o.feeTotal),
    feeNote: str(o.feeNote, 240),
    feeEstimate: !!o.feeEstimate,
    loan: LOANS.includes(o.loan) ? o.loan : null,
    income: INCOMES.includes(o.income) ? o.income : mode === "full-time" ? "pauses" : "keeps",
    startRule: isYM(o.start) ? { type: "fixed", ym: o.start } : { type: "afterPrev" },
    stepTitle: str(o.stepTitle || o.label, 80),
    nextAction: str(o.nextAction, 200) || "Check the dates, fees and entry requirements.",
    facts: arr(o.facts).slice(0, 8).map((f) => ({
      text: str(f.text, 320),
      source: str(f.source, 90) || "You",
      url: /^https?:\/\//i.test(String(f.url || "")) ? str(f.url, 300) : null,
      checked,
      ai: !!f.ai,
    })).filter((f) => f.text),
  };
  if (isISO(o.deadlineDate)) out.deadlineDate = o.deadlineDate;
  if (str(o.deadlineLabel, 60)) out.deadlineLabel = str(o.deadlineLabel, 60);
  return out;
}

// merge an AI result (or any structured edit) into a path; returns { path, summary }
export function applyAIResult(path, result, today = new Date()) {
  const p = normaliseStudyPath(path);
  const added = [];
  const refMap = {};
  const stages = [...p.custom.stages];
  arr(result.addStages).slice(0, 4).forEach((s) => {
    const key = uid();
    refMap[str(s.ref || s.label, 60)] = key;
    stages.push({ key, label: str(s.label, 60) || "New stage", sub: str(s.sub, 60), tag: ["pay", "art"].includes(s.tag) ? s.tag : "other", after: str(s.after, 60) || null });
    added.push(`stage: ${str(s.label, 60)}`);
  });
  const options = [...p.custom.options];
  const picks = { ...p.picks };
  const cat0 = mergeCatalogue({ ...p, custom: { stages, options } });
  const resolveStage = (k) => (refMap[k] ? refMap[k] : cat0.stages.some((s) => s.key === k) ? k : null);
  arr(result.addOptions).slice(0, 8).forEach((o) => {
    const stage = resolveStage(str(o.stage, 60));
    if (!stage) return;
    const id = uid();
    const clean = cleanOption({ ...o, facts: arr(o.facts).map((f) => ({ ...f, ai: true })) }, today);
    options.push({ id, stage, ...clean, custom: true, ai: true });
    added.push(`option: ${clean.label}`);
    if (o.pick) picks[stage] = id;
  });
  const overrides = { ...p.overrides };
  const cat1 = mergeCatalogue({ ...p, custom: { stages, options } });
  arr(result.editOptions).slice(0, 8).forEach((e) => {
    const stage = resolveStage(str(e.stage, 60));
    if (!stage || !findOpt(cat1, stage, e.id) || !isObj(e.patch)) return;
    const cur = findOpt(cat1, stage, e.id);
    const cleaned = cleanOption({ ...cur, start: cur.startRule && cur.startRule.ym, ...e.patch }, today);
    const patch = {};
    ["label", "blurb", "mode", "months", "outOfWorkMonths", "feeTotal", "feeNote", "feeEstimate", "loan", "income", "institution", "deadlineDate"].forEach((k) => {
      if (k in e.patch || (k === "outOfWorkMonths" && ("mode" in e.patch || "months" in e.patch))) patch[k] = cleaned[k];
    });
    if ("start" in e.patch) patch.startRule = cleaned.startRule;
    if (e.patch.facts) patch.facts = [...arr(cur.facts), ...cleaned.facts.map((f) => ({ ...f, ai: true }))];
    overrides[stage + ":" + e.id] = { ...(overrides[stage + ":" + e.id] || {}), ...patch };
    added.push(`edited: ${cur.label}`);
  });
  const cat2 = mergeCatalogue({ ...p, custom: { stages, options }, overrides });
  Object.entries(isObj(result.picks) ? result.picks : {}).forEach(([k, v]) => {
    const stage = resolveStage(k);
    if (stage && findOpt(cat2, stage, v)) picks[stage] = v;
  });
  const assumptions = { ...p.assumptions };
  const ra = isObj(result.assumptions) ? result.assumptions : {};
  if (Number.isInteger(ra.artEntryYear) && ra.artEntryYear >= 2026 && ra.artEntryYear <= 2040) assumptions.artEntryYear = ra.artEntryYear;
  if (typeof ra.loanEligible === "boolean") assumptions.loanEligible = ra.loanEligible;
  let prefs = p.prefs;
  arr(result.addPreferences).slice(0, 5).forEach((t) => {
    const line = str(t, 200).trim();
    if (line && !prefs.includes(line)) prefs = (prefs ? prefs + "\n" : "") + line;
  });
  const next = { ...p, custom: { stages, options }, overrides, picks, assumptions, prefs };
  return { path: normaliseStudyPath(next), added };
}

// ── the engine ───────────────────────────────────────────────────────────────
export function buildPath(cat, picksIn, assumptionsIn, today = new Date()) {
  const A = { ...seed.assumptions, ...(assumptionsIn || {}) };
  const picks = picksIn || {};
  const nowYM = ymStr(today.getFullYear(), today.getMonth() + 1);
  const todayISO = today.toISOString().slice(0, 10);
  const items = [];
  let lastArtEnd = null;
  let prevEnd = null;

  cat.stages.forEach((stage) => {
    const opt = findOpt(cat, stage.key, picks[stage.key]);
    if (!opt || opt.kind === "none") return;
    const r = opt.startRule || { type: "afterPrev" };
    let start;
    if (r.type === "now") start = nowYM;
    else if (r.type === "fixed" && isYM(r.ym)) start = r.ym;
    else if (r.type === "entry") start = ymStr(A.artEntryYear, r.month);
    else if (r.type === "afterArt") start = lastArtEnd ? nextOnOrAfter(addMonths(lastArtEnd, 1), r.month) : ymStr(A.artEntryYear, r.month);
    else start = prevEnd ? addMonths(prevEnd, 1) : nowYM;
    const months = Math.max(1, Math.round(opt.months || 1));
    const end = addMonths(start, months - 1);
    items.push({ stage: stage.key, stageObj: stage, opt, start, end });
    if (stage.key === "art") lastArtEnd = end;
    if (opt.kind === "study") prevEnd = end;
  });

  // ── funding ──
  const study = items.filter((i) => i.opt.kind === "study");
  const loanUser = [...study].sort((a, b) => (a.start < b.start ? -1 : 1)).filter((i) => i.opt.loan === "masters");
  let loanFirst = null;
  loanUser.forEach((it) => {
    if (!A.loanEligible) { it.loanCovered = 0; it.loanState = "off"; return; }
    if (!loanFirst) {
      loanFirst = it;
      it.loanCovered = it.opt.feeTotal == null ? null : Math.min(A.mastersLoan, it.opt.feeTotal);
      it.loanState = "used";
    } else { it.loanCovered = 0; it.loanState = "blocked"; }
  });
  const fees = study.map((i) => i.opt.feeTotal).filter((f) => f != null);
  const unknownFees = study.filter((i) => i.opt.feeTotal == null && i.opt.loan !== "doctoral" && i.opt.income !== "stipend").map((i) => i.opt.label);
  const totalFees = fees.reduce((a, b) => a + b, 0);
  const covered = study.reduce((a, i) => a + (i.loanCovered || 0), 0);
  const outOfWork = items.filter((i) => i.opt.mode === "full-time" && i.opt.income !== "stipend").reduce((a, i) => a + (i.opt.outOfWorkMonths || i.opt.months), 0);
  const stipendItems = items.filter((i) => i.opt.income === "stipend");

  // ── summary rows ──
  const rows = [];
  rows.push({ label: "Time out of full-time work", value: outOfWork ? `${outOfWork} months` : "None", tone: outOfWork >= 24 ? "warn" : "" });

  const loanLines = loanUser.map((it) => {
    const fee = it.opt.feeTotal;
    if (it.loanState === "off") return { label: `Master's Loan for ${it.opt.label}`, value: "Not assumed", detail: "Loan eligibility is switched off in your assumptions.", tone: "" };
    if (it.loanState === "blocked") return { label: `Master's Loan for ${it.opt.label}`, value: "Already used", detail: fee != null ? `${loanFirst.opt.label} uses your one master's loan, so ${it.opt.label} is self-funded (${gbp(fee)}).` : `${loanFirst.opt.label} uses your one master's loan, so ${it.opt.label} is self-funded.`, tone: "warn" };
    if (fee == null) return { label: `Master's Loan for ${it.opt.label}`, value: `Up to ${gbp(A.mastersLoan)}`, detail: "Fee not known yet, so I cannot say how much it covers.", tone: "" };
    const pct = Math.min(100, Math.round((it.loanCovered / fee) * 100));
    const word = pct >= 100 ? "Covers all of it" : pct >= 60 ? "Covers much of it" : "Covers part of it";
    return { label: `Master's Loan for ${it.opt.label}`, value: word, detail: `${gbp(it.loanCovered)} of ${gbp(fee)} (${pct}%).`, tone: "" };
  });
  rows.push(...loanLines);
  if (!loanUser.length && study.length) rows.push({ label: "Master's Loan", value: "Stays free", detail: "None of your picks is a master's degree, so the one-time loan is untouched.", tone: "" });

  if (totalFees > 0 || unknownFees.length) {
    rows.push({ label: "Tuition, all stages", value: totalFees ? gbp(totalFees) + (unknownFees.length ? " + unknown" : "") : "Unknown", detail: unknownFees.length ? `No fee yet for: ${unknownFees.join(", ")}.` : "", tone: "" });
    if (totalFees) rows.push({ label: "Left to fund yourself", value: gbp(Math.max(0, totalFees - covered)), detail: `After ${gbp(covered)} of loan.`, tone: "" });
  }
  stipendItems.forEach((it) => {
    rows.push({ label: `${it.opt.label} funding`, value: "Aim for a funded place", detail: `Funded places pay about ${gbp(A.phdStipend)} a year. A Doctoral Loan of ${gbp(A.doctoralLoan)} is the fallback, but it does not cover the fee.`, tone: "" });
  });
  if (items.length) {
    const last = items.reduce((a, b) => (a.end > b.end ? a : b));
    rows.push({ label: "Last stage ends", value: longYM(last.end), detail: `${last.opt.label}.`, tone: "" });
  }

  // ── warnings ──
  const warnings = [];
  for (let i = 0; i < study.length; i++) {
    for (let j = i + 1; j < study.length; j++) {
      const a = study[i], b = study[j];
      const s = a.start > b.start ? a.start : b.start;
      const e = a.end < b.end ? a.end : b.end;
      const overlap = e >= s ? diffMonths(s, e) + 1 : 0;
      if (!overlap) continue;
      const aFT = a.opt.mode === "full-time", bFT = b.opt.mode === "full-time";
      if (aFT && bFT) warnings.push({ level: "warn", text: `${a.opt.label} and ${b.opt.label} are both full-time and overlap by ${overlap} months. You cannot do both.` });
      else if (aFT || bFT) warnings.push({ level: "warn", text: `${a.opt.label} (${rangeYM(a.start, a.end)}) overlaps ${b.opt.label} (${rangeYM(b.start, b.end)}) by ${overlap} months. That is a full-time course on top of another course.` });
      else if (a.opt.mode === "part-time" && b.opt.mode === "part-time") warnings.push({ level: "info", text: `${a.opt.label} and ${b.opt.label} are both part-time and overlap by ${overlap} months.` });
    }
  }
  if (loanUser.length > 1 && A.loanEligible) warnings.push({ level: "warn", text: `You have picked ${loanUser.length} master's degrees. Only the first can use the master's loan, because you cannot get it once you hold a master's or have had master's funding.` });
  items.filter((i) => i.opt.mode === "full-time" && i.opt.income === "pauses").forEach((i) => {
    warnings.push({ level: "info", text: `${i.opt.label} is full-time (${rangeYM(i.start, i.end)}), so income from work pauses unless you keep a part-time job.` });
  });
  items.filter((i) => i.opt.loanCheck && A.loanEligible).forEach((i) => warnings.push({ level: "info", text: `Check that ${i.opt.label} qualifies for the master's loan (course length and credits).` }));
  if (A.loanEligible) warnings.push({ level: "info", text: "Loan figures assume you are eligible (residency, age, no previous master's). Check your own position on gov.uk." });

  // ── steps (main + side) ──
  const steps = [];
  const dateSide = (kd) => ({ title: kd.label, when: kd.note || (kd.on ? fmtDate(kd.on) : ""), on: kd.on || null, expected: !!kd.expected, goal: true });
  const resolveDeadline = (opt, startYM, kind) => {
    const y = parts(startYM).y;
    const d = kind === "funding" ? opt.fundingDeadline : opt.deadline;
    if (opt.deadlineDate && kind !== "funding") return { label: opt.deadlineLabel || `${opt.institution || opt.label} deadline`, on: opt.deadlineDate, expected: false, when: fmtDate(opt.deadlineDate) };
    if (!d) return null;
    const known = d.known && d.known[String(y)];
    const on = known || `${y}-${d.expected}`;
    return { label: d.label, on, expected: !known, when: known ? fmtDate(known) : looseDate(on, true) };
  };
  items.forEach((it) => {
    const { stage, opt } = it;
    const side = arr(opt.keyDates).map(dateSide);
    const track = stage === "art" || (it.stageObj.tag === "art") ? "art" : "pay";
    const dl = it.stageObj.tag === "art" && opt.kind === "study" ? resolveDeadline(opt, it.start, "apply") : opt.deadlineDate ? resolveDeadline(opt, it.start, "apply") : null;
    if (dl && opt.kind === "study") {
      const dlYM = dl.on.slice(0, 7);
      const alsoApply = opt.alsoApply ? ` and ${opt.alsoApply}` : "";
      steps.push({ id: `apply-${stage}-${opt.id}`, stage, track: "art", title: `Apply: ${opt.institution || opt.label}${alsoApply}`, from: addMonths(dlYM, -3), to: dlYM, when: rangeYM(addMonths(dlYM, -3), dlYM).replace(" to ", " to ") , note: `Application window for ${opt.label}.`, next: opt.nextAction, side: [{ title: dl.label, when: dl.when, on: dl.on, expected: dl.expected, goal: true }], kind: "apply" });
    }
    const fd = opt.fundingDeadline ? resolveDeadline(opt, it.start, "funding") : null;
    if (fd) side.push({ title: fd.label, when: fd.when, on: fd.on, expected: fd.expected, goal: true });
    if (opt.loan === "masters" && it.loanState === "used") side.push({ title: "Master's Loan", when: `Apply ${MONTHS[6]} ${parts(it.start).y}`, on: null, expected: true, goal: true });
    if (opt.loan === "masters" && it.loanState === "blocked") side.push({ title: "Master's Loan", when: "Already used, self-fund", on: null, expected: false, goal: false });
    steps.push({ id: `main-${stage}-${opt.id}`, stage, track, title: opt.stepTitle || opt.label, from: it.start, to: it.end, when: opt.stepNote ? `${rangeYM(it.start, it.end)}` : it.stageObj.key === "art" || it.stageObj.key === "phd" ? `Starts ${longYM(it.start)}` : rangeYM(it.start, it.end), note: [opt.stepNote, opt.blurb].filter(Boolean).join(" "), next: opt.nextAction, side, kind: "main", optionId: opt.id });
  });
  // portfolio work between Feb and Sep of the year before the first art start
  const firstArt = items.find((i) => i.stageObj.tag === "art" && i.opt.kind === "study");
  if (firstArt) {
    const py = parts(firstArt.start).y - 1;
    const pf = ymStr(py, 2), pt = ymStr(py, 9);
    if (pt >= nowYM) {
      const portfolio = { title: "Make the portfolio work", when: rangeYM(pf < nowYM ? nowYM : pf, pt), on: null, expected: false, goal: true, portfolio: true, from: pf < nowYM ? nowYM : pf, to: pt };
      const host = steps.filter((s) => s.kind === "main" && s.from <= pt && s.to >= pf).sort((a, b) => (a.from < b.from ? -1 : 1))[0];
      if (host) host.side.push(portfolio);
      else steps.push({ id: "portfolio", stage: "art", track: "art", title: portfolio.title, from: portfolio.from, to: portfolio.to, when: portfolio.when, note: "Build the work you will show in applications.", next: "List the works and the images each needs.", side: [], kind: "main" });
    }
  }
  steps.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.kind === "apply" ? -1 : 1));

  // upcoming deadlines
  steps.forEach((s) => s.side.forEach((d) => {
    if (d.on && isISO(d.on) && !d.expected) {
      const days = Math.round((new Date(d.on + "T00:00:00") - new Date(todayISO + "T00:00:00")) / 86400000);
      if (days >= 0 && days <= 120) warnings.push({ level: "warn", text: `${d.title} is ${days} days away (${fmtDate(d.on)}).` });
    }
  }));
  if (steps.some((s) => s.side.some((d) => d.expected))) warnings.push({ level: "info", text: "Dates marked expected are estimated from this year's cycle. Check them once the official dates are published." });
  const stale = items.filter((i) => arr(i.opt.facts).some((f) => f.checked && (today - new Date(f.checked)) / 86400000 > 120));
  stale.forEach((i) => warnings.push({ level: "info", text: `Facts for ${i.opt.label} were last checked more than 120 days ago.` }));
  items.filter((i) => arr(i.opt.facts).length === 0 && i.opt.kind === "study").forEach((i) => warnings.push({ level: "info", text: `${i.opt.label} has no researched facts yet. Treat its fees and dates as your own estimates.` }));

  return { items, rows, warnings, steps, totals: { totalFees, covered, outOfWork }, assumptions: A };
}

// ── steps → Quarterly goals ──────────────────────────────────────────────────
export function goalsFromSteps(steps, today = new Date()) {
  const nowYM = ymStr(today.getFullYear(), today.getMonth() + 1);
  const horizon = (from) => { const d = diffMonths(nowYM, from); return d <= 3 ? "now" : d <= 12 ? "next" : "later"; };
  const quarter = (ym) => `q${Math.ceil(parts(ym).m / 3)}`;
  const goals = [];
  steps.forEach((s) => {
    goals.push({
      title: `Path: ${s.title}`, nextAction: s.next || "Review this step.",
      category: s.kind === "apply" ? "Opportunities / applications" : s.track === "art" ? "Practice development" : "Finance / systems",
      status: "not-started", horizon: horizon(s.from), quarter: quarter(s.from), progress: 0, confidence: "medium",
      dueMonth: longYM(s.to), nextMilestone: s.side[0] ? `${s.side[0].title}: ${s.side[0].when}` : "", notes: s.note || "",
      isFineArt: false, isProtectedFineArt: false, fromPath: true, pathStepId: s.id,
    });
    s.side.filter((d) => d.goal && d.on && isISO(d.on)).forEach((d) => {
      const ym = d.on.slice(0, 7);
      goals.push({
        title: `Path: ${d.title}`, nextAction: `Check the date and prepare: ${d.when}.`,
        category: "Opportunities / applications", status: "not-started", horizon: horizon(ym), quarter: quarter(ym), progress: 0, confidence: d.expected ? "low" : "high",
        dueMonth: longYM(ym), nextMilestone: d.when, notes: d.expected ? "Estimated date, confirm when published." : "", isFineArt: false, isProtectedFineArt: false, fromPath: true, pathStepId: `${s.id}:${d.title}`,
      });
    });
  });
  return goals;
}

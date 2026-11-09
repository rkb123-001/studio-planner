import { mergeCatalogue, buildPath, normaliseStudyPath, defaultStudyPath, applyAIResult, goalsFromSteps } from "./pathEngine";
const T = new Date("2026-11-09T12:00:00Z");
const run = (over = {}) => { const p = normaliseStudyPath({ ...defaultStudyPath(), ...over }); return buildPath(mergeCatalogue(p), p.picks, p.assumptions, T); };

test("suggested route matches the plan", () => {
  const b = run();
  const t = b.steps.map(s => `${s.title} | ${s.when}`);
  expect(b.steps.find(s => s.title === "Secure the role").from).toBe("2026-11");
  expect(b.steps.find(s => s.title === "Funded RCA PhD").from).toBe("2029-09");
  expect(b.rows.find(r => r.label === "Time out of full-time work").value).toBe("12 months");
  expect(b.rows.find(r => r.label.startsWith("Master's Loan for RCA")).value).toBe("Covers much of it");
});

test("birkbeck uses the loan and overlaps the art MA", () => {
  const b = run({ picks: { raise: "hv_promo", tech: "birkbeck", art: "rca_cap", phd: "rca_phd" } });
  expect(b.rows.find(r => r.label.startsWith("Master's Loan for RCA")).value).toBe("Already used");
  expect(b.warnings.some(w => /overlaps/.test(w.text))).toBe(true);
});

test("IDE pushes the PhD to 2030", () => {
  const b = run({ picks: { raise: "hv_promo", tech: "none", art: "ide", phd: "rca_phd" } });
  expect(b.steps.find(s => s.title === "Funded RCA PhD").from).toBe("2030-09");
  expect(b.rows.find(r => r.label === "Time out of full-time work").value).toBe("24 months");
});

test("custom stage + option via AI result, and goals", () => {
  const p = normaliseStudyPath(defaultStudyPath());
  const { path, added } = applyAIResult(p, {
    addStages: [{ ref: "res", label: "Residency", after: "art", tag: "art" }],
    addOptions: [{ stage: "res", label: "Summer residency", months: 2, start: "2029-07", mode: "full-time", feeTotal: 0, pick: true, facts: [{ text: "Found via prompt", source: "AI" }] },
                 { stage: "tech", label: "Goldsmiths MSc part-time", months: 24, start: "2027-10", mode: "part-time", feeTotal: 9000, loan: "masters", pick: true }],
    addPreferences: ["Keep a part-time job during study"], assumptions: { artEntryYear: 2029 }, picks: { art: "ide" },
  }, T);
  expect(added.length).toBe(3);
  const b = buildPath(mergeCatalogue(path), path.picks, path.assumptions, T);
  expect(b.steps.some(s => s.title === "Summer residency")).toBe(true);
  expect(path.prefs).toContain("part-time job");
  const goals = goalsFromSteps(b.steps, T);
  expect(goals.length).toBeGreaterThan(5);
  expect(goals.every(g => g.fromPath && g.quarter && g.dueMonth)).toBe(true);
});

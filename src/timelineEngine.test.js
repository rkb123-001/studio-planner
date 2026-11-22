import { buildTimeline, parseDueMonth, shiftDate, rangePatch, addDays, daysBetween } from "./timelineEngine";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectTimeline from "./ProjectTimeline";

const TODAY = new Date(2026, 10, 15); // 15 Nov 2026
const view = { startYM: "2026-11", months: 6 };

test("parses due months", () => {
  expect(parseDueMonth("June", 2026)).toBe("2026-06");
  expect(parseDueMonth("Mar 2027", 2026)).toBe("2027-03");
  expect(parseDueMonth("soon", 2026)).toBe("");
});

test("places art projects, goals and steps, and splits done / overdue / later / unscheduled", () => {
  const artProjects = [
    { id: 1, title: "Twin cities", stage: "production", status: "active", startDate: "2026-11-02", endDate: "2027-02-10" },
    { id: 2, title: "Open call", stage: "pitching", status: "active", keyDate: "2027-01-20", keyDateLabel: "deadline" },
    { id: 3, title: "Old show", stage: "post_show", status: "complete", keyDate: "2026-09-10" },
    { id: 4, title: "No dates", stage: "research", status: "active" },
    { id: 5, title: "Far off", stage: "research", status: "active", keyDate: "2028-05-01" },
    { id: 6, title: "Dropped", status: "declined", keyDate: "2026-12-01" },
  ];
  const projects = [
    { id: 10, title: "Tax return", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "on-track" },
    { id: 11, title: "Late thing", category: "Finance / systems", quarter: "q3", dueMonth: "August", status: "behind" },
    { id: 12, title: "From path", category: "Finance / systems", quarter: "q4", fromPath: true, status: "not-started" },
  ];
  const steps = [{ id: "s1", title: "Oxford MSc", track: "pay", from: "2027-03", to: "2027-09", when: "Mar to Sep 2027" }];
  const t = buildTimeline({ artProjects, projects, steps }, view, TODAY);
  expect(t.nowIndex).toBe(0);
  const art = t.lanes.find((l) => l.key === "art");
  const flat = art.rows.flat();
  const twin = flat.find((i) => i.title === "Twin cities");
  expect(twin.col).toBe(0); expect(twin.span).toBe(4);
  const open = flat.find((i) => i.title === "Open call");
  expect(open.col).toBe(2); expect(open.span).toBe(1);
  expect(art.done.map((i) => i.title)).toEqual(["Old show"]);
  expect(t.unscheduled.map((i) => i.title)).toEqual(["No dates"]);
  expect(t.later.map((i) => i.title)).toEqual(["Far off"]);
  expect(flat.find((i) => i.title === "Dropped")).toBeUndefined();
  const fin = t.lanes.find((l) => l.key === "goal:Finance / systems");
  expect(fin.rows.flat().find((i) => i.title === "Late thing").overdue).toBe(true);
  expect(fin.rows.flat().some((i) => i.title === "From path")).toBe(false);
  const tax = fin.rows.flat().find((i) => i.title === "Tax return");
  expect(tax.col + tax.span - 1).toBe(1); // ends in December
  const path = t.lanes.find((l) => l.key === "path").rows.flat()[0];
  expect(path.col).toBe(4); expect(path.span).toBe(2); expect(path.clippedEnd).toBe(true);
  // overlapping items go on separate rows
  expect(art.rows.length).toBeGreaterThan(1);
});

test("renders, shows the marker and opens the project on click", () => {
  const opened = [];
  render(
    <ProjectTimeline today={TODAY}
      artProjects={[{ id: 1, title: "Twin cities", stage: "production", status: "active", startDate: "2026-11-02", endDate: "2027-02-10", keyDateLabel: "install" }]}
      projects={[{ id: 2, title: "VAT return", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "on-track" }]}
      steps={[{ id: "s1", title: "Oxford MSc", track: "pay", from: "2027-03", to: "2027-09" }]}
      onOpenArt={(id) => opened.push(["art", id])} onOpenGoal={(id) => opened.push(["goal", id])} onOpenPath={() => opened.push(["path"])} />
  );
  expect(screen.getByText("We are here")).toBeTruthy();
  expect(screen.getByText("Done so far")).toBeTruthy();
  expect(screen.getByText("install")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Twin cities/ }));
  fireEvent.click(screen.getByRole("button", { name: /VAT return/ }));
  fireEvent.click(screen.getByRole("button", { name: /Oxford MSc/ }));
  expect(opened).toEqual([["art", 1], ["goal", 2], ["path"]]);
  fireEvent.click(screen.getByText("12 months"));
  expect(screen.getByText("Nov")).toBeTruthy();
});

test("due month parsing avoids false matches and rolls a past month into next year", () => {
  expect(parseDueMonth("maybe soon", 2026)).toBe("");
  expect(parseDueMonth("dismay", 2026)).toBe("");
  expect(parseDueMonth("by 5 Mar", 2026)).toBe("2026-03");
  const t = buildTimeline({ artProjects: [], steps: [], projects: [{ id: 1, title: "Tax", category: "Finance / systems", quarter: "q4", dueMonth: "January", status: "on-track" }] }, view, TODAY);
  const it = t.lanes[0].rows.flat()[0];
  expect(it.to).toBe("2027-01");
  expect(it.overdue).toBeFalsy();
});

test("messy real-world data does not crash the engine or the page", () => {
  const artProjects = [{ id: 1 }, { id: 2, title: "x", keyDate: "not a date", startDate: "2027-13-99" }, { id: 3, title: "Backwards", startDate: "2027-05-01", endDate: "2027-01-01" }, null === 1 ? 0 : { id: 4, title: "No status", stage: undefined }];
  const projects = [{ id: 1 }, { id: 2, title: "No category", quarter: "q9", dueMonth: 5 }, { id: 3, title: "Odd", category: "Whatever", quarter: "q1", dueMonth: "ongoing", status: "weird" }];
  const t = buildTimeline({ artProjects, projects, steps: [{ id: "s", title: "Step", from: "bad", to: "" }] }, view, TODAY);
  expect(Array.isArray(t.lanes)).toBe(true);
  render(<ProjectTimeline today={TODAY} artProjects={artProjects} projects={projects} steps={[]} onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} />);
  expect(screen.getByText("Done so far")).toBeTruthy();
  fireEvent.click(screen.getByText("By date"));
});

test("shiftDate keeps the day and clamps to the end of shorter months", () => {
  expect(shiftDate("2026-11-15", 2)).toBe("2027-01-15");
  expect(shiftDate("2026-12-31", 2)).toBe("2027-02-28");
  expect(shiftDate("2026-03-10", -4)).toBe("2025-11-10");
});

test("day arithmetic crosses month and year ends", () => {
  expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(daysBetween("2026-11-22", "2026-12-10")).toBe(18);
});

test("rangePatch puts an item on exact dates and carries a key date with the end", () => {
  const art = { keyDate: "2027-02-01" };
  expect(rangePatch(art, { kind: "art", toISO: "2027-02-01" }, "2026-12-10", "2027-02-08")).toEqual({ startDate: "2026-12-10", endDate: "2027-02-08", keyDate: "2027-02-08" });
  const goal = { quarter: "q4", dueMonth: "December" };
  expect(rangePatch(goal, { kind: "goal", toISO: "2026-12-31" }, "2026-12-05", "2027-01-20")).toEqual({ startDate: "2026-12-05", endDate: "2027-01-20", dueMonth: "Jan 2027", dueExact: true });
});

test("pills start and end part-way through their months from the real dates", () => {
  const m = buildTimeline({
    artProjects: [
      { id: 1, title: "Mid Dec", status: "active", startDate: "2026-12-16", endDate: "2027-01-15" },
      { id: 2, title: "Month only", status: "active", startDate: "2026-12", endDate: "2026-12" },
    ], projects: [], steps: [],
  }, { startYM: "2026-11", months: 6 }, TODAY);
  const items = m.lanes[0].rows.flat();
  const a = items.find((i) => i.title === "Mid Dec"), b = items.find((i) => i.title === "Month only");
  expect(a.fromFrac).toBeCloseTo(15 / 31, 5);
  expect(a.toFrac).toBeCloseTo(15 / 31, 5);
  expect(b.fromFrac).toBe(0);
  expect(b.toFrac).toBe(1);
});

test("items carry their exact start and end dates, whole months when only a month is known", () => {
  const m = buildTimeline({
    artProjects: [{ id: 1, title: "Exact", status: "active", startDate: "2026-12-16", endDate: "2027-01-15" }, { id: 2, title: "Month", status: "active", startDate: "2026-12", endDate: "2026-12" }],
    projects: [], steps: [],
  }, { startYM: "2026-11", months: 6 }, TODAY);
  const items = m.lanes[0].rows.flat();
  expect(items.find((i) => i.title === "Exact")).toMatchObject({ fromISO: "2026-12-16", toISO: "2027-01-15" });
  expect(items.find((i) => i.title === "Month")).toMatchObject({ fromISO: "2026-12-01", toISO: "2026-12-31" });
});

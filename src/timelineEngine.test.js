import { buildTimeline, parseDueMonth } from "./timelineEngine";
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

test("renders, shows the marker and edits dates", () => {
  const updates = [];
  render(
    <ProjectTimeline today={TODAY}
      artProjects={[{ id: 1, title: "Twin cities", stage: "production", status: "active", startDate: "2026-11-02", endDate: "2027-02-10" }]}
      projects={[]} steps={[]}
      artStatuses={[{ key: "active", label: "Active" }, { key: "complete", label: "Complete" }]} goalStatuses={[]}
      onUpdateArt={(id, f, v) => updates.push([id, f, v])} onUpdateGoal={() => {}} onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} />
  );
  expect(screen.getByText("We are here")).toBeTruthy();
  expect(screen.getByText("Done so far")).toBeTruthy();
  fireEvent.click(screen.getByText(/Twin cities/));
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2027-03-01" } });
  expect(updates).toEqual([[1, "endDate", "2027-03-01"]]);
  fireEvent.click(screen.getByText("12 months"));
  expect(screen.getByText("Nov")).toBeTruthy();
});

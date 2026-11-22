import { render, screen, fireEvent } from "@testing-library/react";
import { buildWeeks, buildWeekView, mondayOf } from "./weekViewEngine";
import ProjectTimeline from "./ProjectTimeline";

test("five weeks start on the Monday of last week", () => {
  expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // a Sunday
  const w = buildWeeks({ today: "2026-11-22" });
  expect(w.map((x) => x.start)).toEqual(["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"]);
  expect(buildWeeks({ today: "2026-11-22", offset: 1 })[0].start).toBe("2026-11-16");
});

test("projects become bars clipped to each week, dated tasks sit on their day", () => {
  const items = [
    { id: "a", title: "Locket", fromISO: "2026-11-25", toISO: "2026-12-02", done: false },
    { id: "b", title: "Old", fromISO: "2026-10-01", toISO: "2026-10-05", done: false },
    { id: "c", title: "Overlap", fromISO: "2026-11-24", toISO: "2026-11-26", done: false },
  ];
  const taskLists = [{ name: "Orders", items: [{ title: "Ship #1058", due: "2026-12-07", done: false }] }];
  const w = buildWeeks({ items, taskLists, today: "2026-11-22" });
  const wk3 = w[2]; // 23 to 29 Nov
  expect(wk3.bars).toHaveLength(2); // Locket and Overlap overlap, so two rows
  const locket = wk3.bars.flat().find((s) => s.item.id === "a");
  expect(locket).toMatchObject({ c0: 2, c1: 6, clipL: false, clipR: true });
  expect(w[3].bars.flat()[0]).toMatchObject({ c0: 0, c1: 2, clipL: true, clipR: false });
  expect(w[4].points["2026-12-07"][0].title).toBe("Ship #1058");
  expect(w.some((x) => x.bars.flat().some((s) => s.item.id === "b"))).toBe(false);
});

test("Month in view shows the weeks and marks where December begins", () => {
  render(<ProjectTimeline today={new Date(2026, 10, 22)} mode="timeline" artProjects={[{ id: 1, title: "Show", status: "active", startDate: "2026-11-25", endDate: "2026-12-03" }]}
    projects={[]} steps={[]} categories={[]} taskLists={[]} onOpenArt={jest.fn()} onOpenGoal={jest.fn()} onOpenPath={jest.fn()} />);
  fireEvent.click(screen.getByText("Month in view"));
  expect(screen.getAllByText("This week")).toHaveLength(2); // the button and the week label
  expect(screen.getByText("Last week")).toBeTruthy();
  expect(screen.getByText("Dec begins")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: /Show/ }).length).toBeGreaterThan(0);
});

test("month-only items go in the loose strip, long ones are drawn thin", () => {
  const items = [
    { id: "m", title: "Sometime Dec", fromISO: "2026-12-01", toISO: "2026-12-31", datesExact: false, done: false },
    { id: "l", title: "Long", fromISO: "2026-11-01", toISO: "2027-01-31", datesExact: true, done: false },
    { id: "s", title: "Short", fromISO: "2026-11-24", toISO: "2026-11-25", datesExact: true, done: false },
    { id: "f", title: "Far loose", fromISO: "2027-03-01", toISO: "2027-03-31", datesExact: false, done: false },
  ];
  const v = buildWeekView({ items, today: "2026-11-22" });
  expect(v.loose.map((i) => i.id)).toEqual(["m"]);
  const bars = v.weeks[2].bars.flat();
  expect(bars.map((b) => b.item.id)).toEqual(["s", "l"]); // short first, long underneath
  expect(bars.find((b) => b.item.id === "l").thin).toBe(true);
  expect(bars.find((b) => b.item.id === "s").thin).toBe(false);
});

test("timeline items say whether their dates are exact", () => {
  const { buildTimeline } = require("./timelineEngine");
  const m = buildTimeline({ artProjects: [{ id: 1, title: "A", status: "active", startDate: "2026-12-02", endDate: "2026-12-09" }],
    projects: [{ id: 2, title: "G", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "on-track" }], steps: [] }, { startYM: "2026-11", months: 6 }, new Date(2026, 10, 22));
  expect(m.all.find((i) => i.title === "A").datesExact).toBe(true);
  expect(m.all.find((i) => i.title === "G").datesExact).toBe(false);
});

test("dropping a loose goal onto a day gives it that date", () => {
  const onUpdateGoal = jest.fn();
  const { container } = render(<ProjectTimeline today={new Date(2026, 10, 22)} mode="timeline" artProjects={[]} steps={[]} categories={[]} taskLists={[]}
    projects={[{ id: 7, title: "Loose goal", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "on-track" }]}
    onUpdateGoal={onUpdateGoal} onUpdateArt={jest.fn()} onOpenArt={jest.fn()} onOpenGoal={jest.fn()} onOpenPath={jest.fn()} />);
  fireEvent.click(screen.getByText("Month in view"));
  const data = { getData: () => "goal:7", setData: () => {} };
  fireEvent.drop(container.querySelector('[data-day="2026-12-03"]'), { dataTransfer: data });
  expect(onUpdateGoal).toHaveBeenCalledWith(7, "startDate", "2026-12-03");
  expect(onUpdateGoal).toHaveBeenCalledWith(7, "endDate", "2026-12-03");
});

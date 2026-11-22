import { render, screen, fireEvent } from "@testing-library/react";
import WeekSetupPanel from "./WeekSetupPanel";
import { dueSoon, withGaps, guessModes } from "./weekSetup";
import { buildPrompt } from "./gridImport";

const TODAY = new Date(2026, 10, 23); // Mon 23 Nov 2026

test("guesses the kind of work from a task's wording", () => {
  expect(guessModes("Finish Amy's heart locket")).toEqual(["making"]);
  expect(guessModes("Invoice Tess final balance")).toEqual(["comms"]);
  expect(guessModes("Water the plants")).toEqual([]);
});

test("collects dated, undone things from the timeline and task lists within two weeks", () => {
  const items = [
    { title: "Show", dueISO: "2026-11-30", lane: "Art projects", done: false },
    { title: "Old", dueISO: "2026-11-10", lane: "Finance / systems", done: false },
    { title: "Finished", dueISO: "2026-11-25", lane: "Art projects", done: true },
    { title: "Far", dueISO: "2027-01-10", lane: "Art projects", done: false },
  ];
  const taskLists = [{ name: "Orders", items: [
    { title: "Ship necklace #1058", due: "2026-12-07", done: false },
    { title: "Done thing", due: "2026-11-24", done: true },
    { title: "Undated", due: "", done: false },
  ] }];
  const r = dueSoon({ items, milestones: [{ title: "Oxford deadline", dueISO: "2026-11-27", lane: "Study path" }], taskLists, today: TODAY });
  expect(r.map((x) => x.title)).toEqual(["Old", "Oxford deadline", "Show", "Ship necklace #1058"]);
  expect(r[0].overdue).toBe(true);
  expect(r[3]).toMatchObject({ where: "Orders", modes: ["comms"] });
});

test("flags things due this week with no matching time on the grid", () => {
  const list = [
    { title: "Locket", due: "2026-11-26", modes: ["making"] },
    { title: "Invoice", due: "2026-11-27", modes: ["comms"] },
    { title: "Later", due: "2026-12-05", modes: ["making"] },
    { title: "Mystery", due: "2026-11-25", modes: [] },
  ];
  const schedule = { Mon: { "9–11am": "comms" }, Tue: { "9–11am": "office" } };
  const r = withGaps(list, schedule, TODAY);
  expect(r.map((x) => x.gap)).toEqual([true, false, false, null]);
});

test("the Claude prompt lists the deadlines", () => {
  const p = buildPrompt({ days: ["Mon"], slots: ["9–11am"], modes: { making: { label: "Making", sub: "", energyCost: 3 } }, schedule: {}, deadlines: [{ title: "Locket", due: "2026-11-26" }, { title: "Old", due: "2026-11-10", overdue: true }] });
  expect(p).toContain("- Locket: due 2026-11-26");
  expect(p).toContain("- Old: overdue, was due 2026-11-10");
});

test("the set-up panel walks through due, fixed time, then the Claude import", () => {
  const modes = { making: { label: "Making", sub: "", energyCost: 3 }, office: { label: "Office Work", sub: "", energyCost: 3 } };
  render(<WeekSetupPanel list={[{ title: "Locket", due: "2026-11-26", where: "Orders", modes: ["making"], gap: true }]} days={["Mon"]} slots={["9–11am"]} modes={modes}
    schedule={{ Mon: { "9–11am": "office" } }} weekNote="" onApply={() => {}} onClose={() => {}} />);
  expect(screen.getByText(/No Making time on the grid/)).toBeTruthy();
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText("1 office block marked so far.")).toBeTruthy();
  fireEvent.click(screen.getByText("Next"));
  expect(screen.getByText("Copy prompt for Claude")).toBeTruthy();
});

import { render, screen, fireEvent } from "@testing-library/react";
import { placeFromAnswers, parseProposals } from "./placeEngine";
import ProjectTimeline from "./ProjectTimeline";

const TODAY = new Date(2026, 10, 15); // 15 Nov 2026
const CATS = ["Studio production", "Finance / systems", "Practice development"];
const base = { title: "Task", category: "Finance / systems", dateKind: "none", date: "", slip: "annoying", feeling: "neutral", size: "days", waitingOn: "" };

test("important and dreaded things go early, keen low-stakes things go late", () => {
  expect(placeFromAnswers({ ...base, slip: "costly", feeling: "dread" }, TODAY).startYM).toBe("2026-11");
  expect(placeFromAnswers({ ...base, slip: "annoying", feeling: "neutral" }, TODAY).startYM).toBe("2026-12");
  expect(placeFromAnswers({ ...base, slip: "annoying", feeling: "keen" }, TODAY).startYM).toBe("2027-01");
  expect(placeFromAnswers({ ...base, slip: "nothing", feeling: "keen" }, TODAY).startYM).toBe("2027-02");
});

test("dates and size set the span, and passed dates sit on this month", () => {
  const r = placeFromAnswers({ ...base, dateKind: "hard", date: "2027-02-20", size: "weeks" }, TODAY);
  expect([r.startYM, r.endYM, r.goal.endDate, r.goal.nextMilestone]).toEqual(["2027-01", "2027-02", "2027-02-20", "Deadline 20 Feb 2027"]);
  const late = placeFromAnswers({ ...base, dateKind: "hard", date: "2026-09-01", size: "days" }, TODAY);
  expect([late.startYM, late.endYM]).toEqual(["2026-11", "2026-11"]);
  const w = placeFromAnswers({ ...base, waitingOn: "Emily" }, TODAY).goal;
  expect([w.waiting, w.nextAction]).toEqual([true, "Chase Emily"]);
});

test("parses proposals and flags guesses", () => {
  const r = parseProposals('```json\n[{"title":"Reply to gallery","category":"Nope","date":"2026-12-01","slip":"costly","source":"Email from Gasworks"},{"nothing":1}]\n```', CATS);
  expect(r.items).toHaveLength(1);
  expect(r.items[0].answers.category).toBe("Practice development");
  expect(r.items[0].answers.dateKind).toBe("soft");
  expect(r.items[0].guessed).toEqual(["how you feel", "size"]);
  expect(parseProposals("not json", CATS).error).toMatch(/valid JSON/);
});

test("the wizard walks through the questions and adds a goal", () => {
  const added = [];
  render(<ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} onAddGoal={(g) => added.push(g)} />);
  fireEvent.click(screen.getByText("+ Place something"));
  fireEvent.change(screen.getByLabelText("Task title"), { target: { value: "Send VAT return" } });
  fireEvent.click(screen.getByText("Next"));
  fireEvent.click(screen.getByText("No date"));
  fireEvent.click(screen.getByText("It costs money or an opportunity"));
  fireEvent.click(screen.getByText("Dreading it"));
  fireEvent.click(screen.getByText("A day or so"));
  fireEvent.click(screen.getByText("See where it lands"));
  expect(screen.getByText(/Because/)).toBeTruthy();
  fireEvent.click(screen.getByText("Add to timeline"));
  expect(added).toHaveLength(1);
  expect(added[0]).toMatchObject({ title: "Send VAT return", startDate: "2026-11-01", importance: 2, enthusiasm: "dread" });
});

test("import box previews and adds the checked items", () => {
  const added = [];
  render(<ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} onAddGoal={(g) => added.push(g)} />);
  fireEvent.click(screen.getByText("Import suggestions"));
  fireEvent.change(screen.getByLabelText("Pasted suggestions"), { target: { value: '[{"title":"A","slip":"costly","feeling":"dread","size":"days"},{"title":"B"}]' } });
  fireEvent.click(screen.getByText("Read it"));
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  fireEvent.click(screen.getByText("Add 1 to timeline"));
  expect(added.map((g) => g.title)).toEqual(["A"]);
});

test("inbox: capture, place from inbox removes it", () => {
  const added = [], inboxAdds = [], removed = [];
  const inbox = [{ id: "x1", title: "Email gallery", source: "Gmail" }];
  render(<ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS} inbox={inbox}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} onAddGoal={(g) => added.push(g)}
    onInboxAdd={(t) => inboxAdds.push(t)} onInboxRemove={(id) => removed.push(id)} />);
  fireEvent.change(screen.getByLabelText("Add to inbox"), { target: { value: "Book dentist" } });
  fireEvent.keyDown(screen.getByLabelText("Add to inbox"), { key: "Enter" });
  expect(inboxAdds).toEqual(["Book dentist"]);
  fireEvent.click(screen.getByText("Place"));
  expect(screen.getByLabelText("Task title").value).toBe("Email gallery");
  fireEvent.click(screen.getByText("Next"));
  fireEvent.click(screen.getByText("No date"));
  fireEvent.click(screen.getByText("It's annoying"));
  fireEvent.click(screen.getByText("Neutral"));
  fireEvent.click(screen.getByText("A day or so"));
  fireEvent.click(screen.getByText("See where it lands"));
  fireEvent.click(screen.getByText("Add to timeline"));
  expect(added[0].title).toBe("Email gallery");
  expect(removed).toEqual(["x1"]);
});

test("list view groups everything and ticks tasks off", () => {
  const updates = [];
  render(<ProjectTimeline today={TODAY}
    artProjects={[{ id: 1, title: "Twin cities", stage: "production", status: "active", startDate: "2026-11-02", endDate: "2027-02-10" }]}
    projects={[
      { id: 2, title: "VAT return", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "on-track" },
      { id: 3, title: "Late thing", category: "Finance / systems", quarter: "q3", dueMonth: "August", status: "behind" },
      { id: 4, title: "Done thing", category: "Finance / systems", quarter: "q4", dueMonth: "November", status: "done" },
    ]}
    steps={[]} categories={CATS} inbox={[{ id: "i1", title: "Book dentist" }]}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} onAddGoal={() => {}}
    onUpdateGoal={(id, f, v) => updates.push([id, f, v])} onUpdateArt={() => {}} onInboxAdd={() => {}} onInboxRemove={() => {}} />);
  fireEvent.click(screen.getByText("By date"));
  expect(screen.getByText(/Overdue \(1\)/)).toBeTruthy();
  expect(screen.getByText(/This month \(2\)/)).toBeTruthy();
  expect(screen.getByText("Book dentist")).toBeTruthy();
  expect(screen.queryByText("Done thing")).toBeNull();
  fireEvent.click(screen.getByText("Show done"));
  expect(screen.getByText("Done thing")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Done: VAT return"));
  expect(updates).toEqual([[2, "status", "done"]]);
});

test("Goals view shows the goals panel and hides the timeline controls", () => {
  render(<ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS}
    goalsPanel={<div>GOALS PANEL</div>} onInboxAdd={() => {}} onAddGoal={() => {}}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} />);
  expect(screen.queryByText("GOALS PANEL")).toBeNull();
  fireEvent.click(screen.getByText("Goals"));
  expect(screen.getByText("GOALS PANEL")).toBeTruthy();
  expect(screen.queryByText("+ Place something")).toBeNull();
  expect(screen.queryByLabelText("Add to inbox")).toBeNull();
  fireEvent.click(screen.getByText("Timeline"));
  expect(screen.queryByText("GOALS PANEL")).toBeNull();
  expect(screen.getByText("+ Place something")).toBeTruthy();
});

test("coming up lists dated items by week and flags overdue ones", () => {
  const { comingUp, buildTimeline: bt } = require("./timelineEngine");
  const m = bt({
    artProjects: [{ id: 1, title: "Show", stage: "install", status: "active", keyDate: "2026-11-18" }],
    projects: [
      { id: 2, title: "Pay VAT", category: "Finance / systems", quarter: "q4", dueMonth: "November", status: "on-track", startDate: "2026-11-01", endDate: "2026-11-30" },
      { id: 3, title: "Old deadline", category: "Finance / systems", quarter: "q4", status: "on-track", startDate: "2026-11-01", endDate: "2026-11-05" },
      { id: 4, title: "Month only", category: "Finance / systems", quarter: "q4", dueMonth: "November", status: "on-track", startDate: "2026-11-01", endDate: "2026-11-30", dueExact: false },
    ],
    steps: [{ id: "s", title: "Oxford", track: "pay", from: "2027-03", to: "2027-09", side: [{ title: "Oxford deadline", on: "2026-11-27" }] }],
  }, { startYM: "2026-11", months: 6 }, TODAY);
  const c = comingUp(m.all, m.milestones, TODAY); // today is Sun 15 Nov 2026, so this week = 9 to 15 Nov
  expect(c.overdue.map((i) => i.title)).toEqual(["Old deadline"]);
  expect(c.rows[1].items.map((i) => i.title)).toEqual(["Show"]);            // 16 to 22 Nov
  expect(c.rows[2].items.map((i) => i.title)).toEqual(["Oxford deadline"]); // 23 to 29 Nov
  expect(c.rows[3].items.map((i) => i.title)).toEqual(["Pay VAT"]);         // 30 Nov to 6 Dec
  expect(c.inProgress.map((i) => i.title)).toContain("Month only");
});

test("Art and Path views swap in their panels", () => {
  render(<ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS}
    goalsPanel={<div>G</div>} artPanel={<div>ART PANEL</div>} pathPanel={<div>PATH PANEL</div>}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} />);
  fireEvent.click(screen.getByText("Art"));
  expect(screen.getByText("ART PANEL")).toBeTruthy();
  fireEvent.click(screen.getByText("Path"));
  expect(screen.getByText("PATH PANEL")).toBeTruthy();
  expect(screen.queryByText("ART PANEL")).toBeNull();
});

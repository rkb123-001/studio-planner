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

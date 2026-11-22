import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { normaliseLists, addList, addItem, toggleItem, removeItem, removeList, importIntoLists, markPlaced } from "./listOps";
import ProjectTimeline from "./ProjectTimeline";

const TODAY = new Date(2026, 10, 22);
const CATS = ["Studio production", "Finance / systems", "Practice development"];

test("list operations", () => {
  let l = addList([], "Before Australia");
  l = addItem(l, l[0].id, "Book ferry", "2026-12-05");
  l = addItem(l, l[0].id, "  ");           // blank ignored
  expect(l[0].items).toHaveLength(1);
  l = toggleItem(l, l[0].id, l[0].items[0].id);
  expect(l[0].items[0].done).toBe(true);
  l = markPlaced(l, l[0].id, l[0].items[0].id);
  expect(l[0].items[0].placed).toBe(true);
  l = removeItem(l, l[0].id, l[0].items[0].id);
  expect(l[0].items).toHaveLength(0);
  expect(removeList(l, l[0].id)).toEqual([]);
});

test("import groups by list name, creates lists, and skips repeats", () => {
  let l = importIntoLists([], [
    { list: "Before Australia", title: "Pack", due: "2026-12-09" },
    { list: "In Australia", title: "Rottnest" },
    { list: "before australia", title: "pack" },      // same list (case-insensitive), repeat title skipped
    { title: "Loose one" },
  ]);
  expect(l.map((x) => x.name)).toEqual(["Before Australia", "In Australia", "Imported"]);
  expect(l[0].items).toHaveLength(1);
});

test("normalise survives junk", () => {
  expect(normaliseLists("nope")).toEqual([]);
  const n = normaliseLists([null, { name: 5, items: [{ title: "ok", due: "bad" }, { title: "" }, 3] }]);
  expect(n).toHaveLength(1);
  expect(n[0].items).toHaveLength(1);
  expect(n[0].items[0].due).toBe("");
});

function Harness({ onGoal }) {
  const [lists, setLists] = useState([]);
  return <ProjectTimeline today={TODAY} artProjects={[]} projects={[]} steps={[]} categories={CATS}
    taskLists={lists} onTaskLists={(fn) => setLists((cur) => normaliseLists(fn(cur)))} onAddGoal={onGoal}
    onOpenArt={() => {}} onOpenGoal={() => {}} onOpenPath={() => {}} />;
}

test("Lists view: make a list, add, tick, place on the timeline", () => {
  const goals = [];
  render(<Harness onGoal={(g) => goals.push(g)} />);
  fireEvent.click(screen.getByText("Lists"));
  fireEvent.change(screen.getByLabelText("New list name"), { target: { value: "In Australia" } });
  fireEvent.click(screen.getByText("+ New list"));
  expect(screen.getByText("In Australia")).toBeTruthy();
  const add = screen.getByLabelText("Add to In Australia");
  fireEvent.change(add, { target: { value: "Rottnest day trip" } });
  fireEvent.keyDown(add, { key: "Enter" });
  fireEvent.change(add, { target: { value: "Call Mum" } });
  fireEvent.keyDown(add, { key: "Enter" });
  expect(screen.getByText("Rottnest day trip")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("Done: Call Mum"));
  expect(screen.queryByText("Call Mum")).toBeNull();           // done items hidden by default
  fireEvent.click(screen.getByText("Show done"));
  expect(screen.getByText("Call Mum")).toBeTruthy();
  fireEvent.click(screen.getByText("Place"));
  expect(screen.getByLabelText("Task title").value).toBe("Rottnest day trip");
  fireEvent.click(screen.getByText("Next"));
  fireEvent.click(screen.getByText("No date"));
  fireEvent.click(screen.getByText("It's annoying"));
  fireEvent.click(screen.getByText("Neutral"));
  fireEvent.click(screen.getByText("A day or so"));
  fireEvent.click(screen.getByText("See where it lands"));
  fireEvent.click(screen.getByText("Add to timeline"));
  expect(goals[0].title).toBe("Rottnest day trip");
  expect(screen.getByText("on timeline")).toBeTruthy();
});

test("import box can send items to named lists", () => {
  render(<Harness onGoal={() => {}} />);
  fireEvent.click(screen.getByText("Import suggestions"));
  fireEvent.change(screen.getByLabelText("Pasted suggestions"), { target: { value: '[{"title":"Pack","list":"Before Australia"},{"title":"Rottnest","list":"In Australia"}]' } });
  fireEvent.click(screen.getByText("Read it"));
  fireEvent.click(screen.getByText("Add to task lists"));
  expect(screen.getByText("Before Australia")).toBeTruthy();
  expect(screen.getByText("In Australia")).toBeTruthy();
  expect(screen.getByText("Pack")).toBeTruthy();
});

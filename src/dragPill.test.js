import { render, screen, fireEvent, act } from "@testing-library/react";
import ProjectTimeline from "./ProjectTimeline";

const TODAY = new Date(2026, 10, 15);
const CATS = ["Finance / systems"];

const ev = (type, x, extra = {}) => {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 10, button: 0 });
  Object.defineProperty(e, "pointerType", { value: "mouse" });
  Object.entries(extra).forEach(([k, v]) => Object.defineProperty(e, k, { value: v }));
  return e;
};

function setup() {
  const onUpdateArt = jest.fn();
  render(<ProjectTimeline today={TODAY} mode="timeline" artProjects={[{ id: 1, title: "Mid Dec show", status: "active", startDate: "2026-12-16", endDate: "2026-12-28" }]}
    projects={[]} steps={[]} categories={CATS} onUpdateArt={onUpdateArt} onUpdateGoal={jest.fn()} onOpenArt={jest.fn()} onOpenGoal={jest.fn()} onOpenPath={jest.fn()} />);
  // each month band is 100px wide, Nov starts at x=0
  document.querySelectorAll("[data-ym]").forEach((el, n) => {
    el.getBoundingClientRect = () => ({ left: n * 100, right: n * 100 + 94, top: 0, bottom: 100, width: 94, height: 100 });
  });
  return { onUpdateArt, pill: screen.getByRole("button", { name: /Mid Dec show/ }) };
}

test("dragging a part-month pill into the next month keeps its length and moves it by days", () => {
  const { onUpdateArt, pill } = setup();
  act(() => { pill.dispatchEvent(ev("pointerdown", 150)); });          // Dec band (100-194): 17 Dec
  act(() => { window.dispatchEvent(ev("pointermove", 260)); });         // Jan band (200-294): 20 Jan, 34 days on
  act(() => { window.dispatchEvent(ev("pointerup", 260)); });
  expect(onUpdateArt).toHaveBeenCalledWith(1, "startDate", "2027-01-19");
  expect(onUpdateArt).toHaveBeenCalledWith(1, "endDate", "2027-01-31");
});

test("dragging within the same month changes the day, not the month", () => {
  const { onUpdateArt, pill } = setup();
  act(() => { pill.dispatchEvent(ev("pointerdown", 150)); });          // 17 Dec
  act(() => { window.dispatchEvent(ev("pointermove", 120)); });         // 7 Dec, 10 days back
  act(() => { window.dispatchEvent(ev("pointerup", 120)); });
  expect(onUpdateArt).toHaveBeenCalledWith(1, "startDate", "2026-12-06");
  expect(onUpdateArt).toHaveBeenCalledWith(1, "endDate", "2026-12-18");
});

test("dragging the right edge grip sets the end to the exact day under the pointer", () => {
  const { onUpdateArt } = setup();
  const grip = screen.getByLabelText("Change end of Mid Dec show");
  act(() => { grip.dispatchEvent(ev("pointerdown", 190)); });
  act(() => { window.dispatchEvent(ev("pointermove", 360)); });          // Feb band (300-394): 18 Feb
  act(() => { window.dispatchEvent(ev("pointerup", 360)); });
  expect(onUpdateArt).toHaveBeenCalledWith(1, "endDate", "2027-02-18");
  expect(onUpdateArt).toHaveBeenCalledWith(1, "startDate", "2026-12-16");
});

test("pressing an edge grip without moving changes nothing (so a click near the edge is just a click)", () => {
  const { onUpdateArt } = setup();
  const grip = screen.getByLabelText("Change end of Mid Dec show");
  act(() => { grip.dispatchEvent(ev("pointerdown", 190)); });
  act(() => { window.dispatchEvent(ev("pointermove", 192)); });
  act(() => { window.dispatchEvent(ev("pointerup", 192)); });
  expect(onUpdateArt).not.toHaveBeenCalled();
});

test("dragging a bar whose start is off-screen sets its start and keeps its end", () => {
  const onUpdateGoal = jest.fn();
  render(<ProjectTimeline today={TODAY} mode="timeline" artProjects={[]} steps={[]} categories={CATS}
    projects={[{ id: 5, title: "Robo-kah", category: "Practice development", quarter: "q4", dueMonth: "Apr 2027", status: "not-started" }]}
    onUpdateArt={jest.fn()} onUpdateGoal={onUpdateGoal} onOpenArt={jest.fn()} onOpenGoal={jest.fn()} onOpenPath={jest.fn()} />);
  document.querySelectorAll("[data-ym]").forEach((el, n) => {
    el.getBoundingClientRect = () => ({ left: n * 100, right: n * 100 + 94, top: 0, bottom: 100, width: 94, height: 100 });
  });
  const bar = screen.getByRole("button", { name: /Robo-kah/ });
  act(() => { bar.dispatchEvent(ev("pointerdown", 30)); });             // Nov band
  act(() => { window.dispatchEvent(ev("pointermove", 220)); });         // Jan band (200-294): 8 Jan
  act(() => { window.dispatchEvent(ev("pointerup", 220)); });
  expect(onUpdateGoal).toHaveBeenCalledWith(5, "startDate", "2027-01-07");
  expect(onUpdateGoal).toHaveBeenCalledWith(5, "endDate", "2027-04-30");
  expect(onUpdateGoal).toHaveBeenCalledWith(5, "dueExact", false); // still "due sometime in April"
});

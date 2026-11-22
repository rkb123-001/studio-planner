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

test("dragging a part-month pill one month right moves its dates a month", () => {
  const { onUpdateArt, pill } = setup();
  act(() => { pill.dispatchEvent(ev("pointerdown", 150)); });          // Dec band (100-194)
  act(() => { window.dispatchEvent(ev("pointermove", 260)); });         // Jan band (200-294)
  act(() => { window.dispatchEvent(ev("pointerup", 260)); });
  expect(onUpdateArt).toHaveBeenCalledWith(1, "startDate", "2027-01-16");
  expect(onUpdateArt).toHaveBeenCalledWith(1, "endDate", "2027-01-28");
});

test("dragging the right edge grip lengthens the pill", () => {
  const { onUpdateArt } = setup();
  const grip = screen.getByLabelText("Change end of Mid Dec show");
  act(() => { grip.dispatchEvent(ev("pointerdown", 190)); });
  act(() => { window.dispatchEvent(ev("pointermove", 360)); });          // Feb band (300-394)
  act(() => { window.dispatchEvent(ev("pointerup", 360)); });
  expect(onUpdateArt).toHaveBeenCalledWith(1, "endDate", "2027-02-28");
  expect(onUpdateArt).toHaveBeenCalledWith(1, "startDate", "2026-12-16");
});

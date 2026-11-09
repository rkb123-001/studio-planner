import { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { StudyPath } from "./StudyPath";
import { normaliseStudyPath, defaultStudyPath } from "./pathEngine";

function Harness({ onPlanSpy }) {
  const [p, setP] = useState(normaliseStudyPath(defaultStudyPath()));
  const [notice, setNotice] = useState("");
  return <StudyPath path={p} onUpdate={(fn) => setP((cur) => normaliseStudyPath(fn(cur)))} onPlan={(steps) => { onPlanSpy(steps); setP((cur) => ({ ...cur, plan: { at: new Date().toISOString(), steps } })); setNotice("Added goals"); }} planNotice={notice} onOpenQuarterly={() => {}} />;
}

test("default route, birkbeck swap, own option", () => {
  render(<Harness onPlanSpy={() => {}} />);
  expect(screen.getByText("Covers much of it")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Birkbeck MSc (evenings)"));
  expect(screen.getAllByText("Already used").length).toBe(1);
  // add own option to the art stage
  fireEvent.click(screen.getAllByText("+ add your own option")[2]);
  fireEvent.change(screen.getByPlaceholderText(/Goldsmiths MFA/), { target: { value: "Goldsmiths MFA, part-time" } });
  fireEvent.change(screen.getByPlaceholderText("blank = unknown"), { target: { value: "9000" } });
  fireEvent.click(screen.getByText("Save"));
  expect(screen.getByText("Goldsmiths MFA, part-time")).toBeInTheDocument();
  expect(screen.getByText("YOURS")).toBeInTheDocument();
  expect(screen.queryAllByText(/Master's Loan for Goldsmiths/).length).toBe(0);
});

test("edit a researched option and hide it", () => {
  render(<Harness onPlanSpy={() => {}} />);
  fireEvent.click(screen.getByText("Slade MA, UCL"));
  fireEvent.click(screen.getAllByText("edit this option")[2]);
  fireEvent.change(screen.getByPlaceholderText("blank = unknown"), { target: { value: "20000" } });
  fireEvent.click(screen.getByText("Save"));
  expect(screen.getByText("EDITED")).toBeInTheDocument();
  fireEvent.click(screen.getAllByText("edit this option")[2]);
  fireEvent.click(screen.getByText("hide this option"));
  expect(screen.queryByText("Slade MA, UCL")).toBeNull();
});

test("plan this path shows the map and calls onPlan", () => {
  const spy = jest.fn();
  render(<Harness onPlanSpy={spy} />);
  fireEvent.click(screen.getByText("Plan this path ↗"));
  expect(spy).toHaveBeenCalled();
  expect(spy.mock.calls[0][0].length).toBeGreaterThan(4);
  expect(screen.getByText("Secure the role")).toBeInTheDocument();
  expect(screen.getByText("Funded RCA PhD")).toBeInTheDocument();
  expect(screen.getByText("Added goals")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Secure the role"));
  expect(screen.getByText(/Send Emily the impact summary/)).toBeInTheDocument();
});

test("AI recalibration applies, adds an option, and can be undone", async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ searched: true, result: {
    explanation: "Swapped to the IDE and added a Goldsmiths option.", caveats: ["Check the Goldsmiths fee."],
    picks: { art: "ide" }, addPreferences: ["Keep a part-time job during study"],
    addOptions: [{ stage: "art", label: "Goldsmiths MFA part-time", months: 24, mode: "part-time", feeTotal: 9000, facts: [{ text: "From search", source: "Goldsmiths", url: "https://www.gold.ac.uk" }] }],
  } }) }));
  render(<Harness onPlanSpy={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText(/Ask or tell me anything/), { target: { value: "Swap to IDE and add a part-time MFA" } });
  fireEvent.click(screen.getByText("Recalibrate"));
  await waitFor(() => expect(screen.getByText(/Swapped to the IDE/)).toBeInTheDocument());
  expect(screen.getByText("Goldsmiths MFA part-time")).toBeInTheDocument();
  expect(screen.getByText("AI-ADDED")).toBeInTheDocument();
  expect(screen.getByDisplayValue(/Keep a part-time job/)).toBeInTheDocument();
  expect(screen.getByText(/Check: Check the Goldsmiths fee/)).toBeInTheDocument();
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).prompt).toContain("IDE");
  fireEvent.click(screen.getByText("undo this change"));
  expect(screen.queryByText("Goldsmiths MFA part-time")).toBeNull();
  expect(screen.queryByDisplayValue(/Keep a part-time job/)).toBeNull();
});

test("AI errors are shown plainly", async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }));
  render(<Harness onPlanSpy={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText(/Ask or tell me anything/), { target: { value: "hello" } });
  fireEvent.click(screen.getByText("Recalibrate"));
  await waitFor(() => expect(screen.getByText(/only works on the deployed site/)).toBeInTheDocument());
});

test("compare view needs a pinned plan, then shows both", () => {
  render(<Harness onPlanSpy={() => {}} />);
  fireEvent.click(screen.getByText("Compare"));
  expect(screen.getByText(/Pin your picks as the current plan first/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Picks"));
  fireEvent.click(screen.getByText("pin these picks as my current plan"));
  fireEvent.click(screen.getByText("RCA/Imperial IDE MA/MSc"));
  fireEvent.click(screen.getByText("Compare"));
  expect(screen.getByText("Current plan")).toBeInTheDocument();
  expect(screen.getByText("With these picks")).toBeInTheDocument();
});

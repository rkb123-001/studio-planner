// Whole-app smoke test: signs in with a mocked session, loads real-shaped saved data,
// and clicks through every tab and view to check they render and connect.
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import App from "./App";

const errors = [];
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation((...a) => { errors.push(a.map(String).join(" ").slice(0, 300)); });
  jest.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
  localStorage.setItem("studio-planner-auth-token", "tok");
  localStorage.setItem("studio-planner-auth-email", "r@example.com");
  localStorage.setItem("studio-planner-profile", JSON.stringify({
    name: "Rebekah", onboarded: true,
    taskLists: [{ id: "l1", name: "Orders before Australia", items: [
      { id: "i1", title: "Finish Amy's heart locket", due: "2026-11-26", done: false },
      { id: "i2", title: "Ship necklace #1058", due: "2026-12-07", done: false },
    ] }],
    inbox: [{ id: "x1", title: "Book plater" }],
  }));
  localStorage.setItem("studio-planner-v1", JSON.stringify({
    projects: [
      { id: 1, title: "Create Robo-kah 2.0", category: "Practice development", quarter: "q4", dueMonth: "Mar 2027", status: "not-started", isFineArt: true, progress: 0 },
      { id: 2, title: "Marketing Alta", category: "Studio production", quarter: "q4", status: "not-started", startDate: "2026-12-02", endDate: "2026-12-09", progress: 0 },
      { id: 3, title: "Apply to La Becque", category: "Opportunities / applications", quarter: "q2", dueMonth: "April", status: "done", progress: 100 },
      { id: 4, title: "Dropped thing", category: "Finance / systems", quarter: "q4", dueMonth: "December", status: "dropped", progress: 0 },
    ],
    artProjects: [{ id: 9, title: "Twin cities", stage: "research", status: "active", startDate: "2026-11-02", endDate: "2027-02-10" }],
  }));
  global.fetch = jest.fn(async (url, opts = {}) => {
    const u = String(url);
    const body = u.includes("user_sessions") ? [{ device_token: "tok" }] : [];
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  });
});
afterEach(() => { jest.restoreAllMocks(); });

const click = (el) => act(() => { fireEvent.click(el); });
const tab = (name) => screen.getAllByText(name).find((el) => el.tagName === "SPAN" && /boxed|border/.test(el.getAttribute("style") || ""));

test("every tab and view renders, with no crash", async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 22, 12) , doNotFake: ["nextTick", "setImmediate"] });
  render(<App />);
  await waitFor(() => expect(screen.getAllByText("Week").length).toBeGreaterThan(0), { timeout: 4000 });
  expect(screen.queryByText("Something went wrong.")).toBeNull();

  // Week: due list from the task lists, set-up flow and the + import
  expect(screen.getByText(/Due in the next two weeks/)).toBeTruthy();
  expect(screen.getByText(/No Making time on the grid this week yet/)).toBeTruthy();
  click(screen.getByText("Set up this week →"));
  click(screen.getByText("Next")); click(screen.getByText("Next"));
  expect(screen.getByText("Copy prompt for Claude")).toBeTruthy();
  click(screen.getByLabelText("Close"));
  click(screen.getByLabelText("Import week"));
  fireEvent.change(screen.getByLabelText("Claude's reply"), { target: { value: '[{"day":"Wed","slot":"9–11am","mode":"making"}]' } });
  click(screen.getByText("Add to my week"));
  await waitFor(() => expect(screen.queryByText(/No Making time on the grid this week yet/)).toBeNull());

  // Reflect
  click(tab("Reflect"));
  expect(screen.queryByText("Something went wrong.")).toBeNull();

  // Timeline: months, then Month in view
  click(tab("Timeline"));
  expect(screen.getByText("We are here")).toBeTruthy();
  expect(screen.queryByText(/Dropped thing/)).toBeNull();
  click(screen.getByText("Month in view"));
  expect(screen.getByText("Dec begins")).toBeTruthy();
  expect(screen.getAllByText(/Ship necklace #1058/).length).toBeGreaterThan(0);
  click(screen.getByText("12 months"));

  // Clicking a project on the timeline opens it in Plan
  click(screen.getAllByRole("button", { name: /Marketing Alta/ })[0]);
  expect(screen.getByText(/Quarterly goals/i)).toBeTruthy();

  // Plan views
  for (const v of [/^By date$/, /^Lists/, /^Goals$/, /^Path$/, /^art projects$/]) {
    click(screen.getAllByText(v)[0]);
    expect(screen.queryByText("Something went wrong.")).toBeNull();
  }
  click(screen.getByText("Goals"));
  expect(screen.getByText(/Archive \(2\)/)).toBeTruthy(); // La Becque (done) and Dropped thing
  click(screen.getByText("+ Place something"));
  click(screen.getByText("Import suggestions"));
  click(screen.getByText("+ Art project"));
  expect(screen.queryByText("Something went wrong.")).toBeNull();

  // Changes are saved: to this device, and to Supabase for the other devices
  await act(async () => { jest.advanceTimersByTime(10000); });
  const local = JSON.parse(localStorage.getItem("studio-planner-v1"));
  expect(local.schedule.Wed["9–11am"]).toBe("making");
  const writes = global.fetch.mock.calls.filter(([u, o]) => String(u).includes("planner_data") && o && /POST|PATCH/.test(o.method || ""));
  expect(writes.length).toBeGreaterThan(0);
  const sent = JSON.parse(writes[writes.length - 1][1].body);
  const row = Array.isArray(sent) ? sent[0] : sent;
  expect(JSON.stringify(row)).toContain("Orders before Australia"); // task lists travel with the profile
  jest.useRealTimers();
}, 30000);

afterAll(() => {
  const real = errors.filter((e) => !/act\(|not wrapped in act|ReactDOMTestUtils/.test(e));
  if (real.length) console.log("CONSOLE ERRORS:\n" + [...new Set(real)].slice(0, 15).join("\n---\n"));
});

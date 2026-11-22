import { normaliseLists } from "./listOps";

// The original Create React App test looked for a "learn react" link that has never existed in the planner.
// App itself needs Supabase and a signed-in user, so the real coverage lives in the feature tests.
test("feature modules load", () => {
  expect(typeof normaliseLists).toBe("function");
});

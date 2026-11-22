import { parseGridBlocks, applyBlocks, buildPrompt, startHour } from "./gridImport";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slots = ["7–9am", "9–11am", "11am–1pm", "1–3pm"];
const modes = { making: { label: "Making", sub: "wax", energyCost: 3 }, comms: { label: "Comms & Admin", sub: "email", energyCost: 3 }, office: { label: "Office Work", sub: "shift", energyCost: 3 } };
const empty = () => { const s = {}; days.forEach((d) => { s[d] = {}; slots.forEach((t) => { s[d][t] = null; }); }); return s; };

test("parses a plain list, code fences, hyphens, slot lists and loose names", () => {
  const text = 'Here you go:\n```json\n[{"day":"monday","slot":"9-11am","mode":"making"},{"day":"Tue","slots":["11am–1pm","1 – 3pm"],"mode":"Comms & Admin"},{"day":"Fun","slot":"9–11am","mode":"making"},{"day":"Wed","slot":"4am","mode":"making"},{"day":"Wed","slot":"9–11am","mode":"dancing"}]\n```';
  const r = parseGridBlocks(text, { days, slots, modes });
  expect(r.blocks).toEqual([
    { day: "Mon", slot: "9–11am", mode: "making" },
    { day: "Tue", slot: "11am–1pm", mode: "comms" },
    { day: "Tue", slot: "1–3pm", mode: "comms" },
  ]);
  expect(r.skipped).toHaveLength(3);
});

test("accepts { blocks: [...] } and reports non-JSON", () => {
  expect(parseGridBlocks('{"blocks":[{"day":"Mon","slot":"7–9am","mode":"making"}]}', { days, slots, modes }).blocks).toHaveLength(1);
  expect(parseGridBlocks("sorry, no", { days, slots, modes }).error).toMatch(/JSON/);
});

test("applyBlocks never touches office, and only fills empty slots unless replacing", () => {
  const s = empty();
  s.Mon["9–11am"] = "office";
  s.Mon["7–9am"] = "comms";
  const blocks = [{ day: "Mon", slot: "9–11am", mode: "making" }, { day: "Mon", slot: "7–9am", mode: "making" }, { day: "Tue", slot: "7–9am", mode: "making" }];
  const fill = applyBlocks(s, blocks, false);
  expect(fill).toMatchObject({ placed: 1, keptOffice: 1, keptExisting: 1 });
  expect(fill.schedule.Mon["7–9am"]).toBe("comms");
  expect(fill.schedule.Tue["7–9am"]).toBe("making");
  const rep = applyBlocks(s, blocks, true);
  expect(rep).toMatchObject({ placed: 2, keptOffice: 1 });
  expect(rep.schedule.Mon["9–11am"]).toBe("office");
  expect(rep.schedule.Mon["7–9am"]).toBe("making");
  expect(s.Tue["7–9am"]).toBeNull(); // original untouched
});

test("the prompt lists the modes, slots and any office slots", () => {
  const s = empty();
  s.Wed["1–3pm"] = "office";
  const p = buildPrompt({ days, slots, modes, schedule: s, weekNote: "Commissions first" });
  expect(p).toContain("making: Making");
  expect(p).toContain("Wed 1–3pm");
  expect(p).toContain("Commissions first");
  expect(p).toContain('"mode":"making"');
});

test("slot names Claude might write differently still match", () => {
  expect(["7–9am", "11am–1pm", "1–3pm", "9am-11am", "1pm", "13:00"].map(startHour)).toEqual([7, 11, 13, 9, 13, 13]);
  const r = parseGridBlocks('[{"day":"Thu","slot":"9am - 11am","mode":"making"},{"day":"Thu","slot":"1pm-3pm","mode":"comms"}]', { days, slots, modes });
  expect(r.blocks).toEqual([{ day: "Thu", slot: "9–11am", mode: "making" }, { day: "Thu", slot: "1–3pm", mode: "comms" }]);
});

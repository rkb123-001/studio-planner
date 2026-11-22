// Pure helpers for importing weekly-grid blocks that Claude has written out as JSON.
// Format: [{ "day": "Mon", "slot": "9–11am", "mode": "making" }, ...]
// (a "slots": ["9–11am", "11am–1pm"] list is also accepted, and so is { "blocks": [...] })

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").replace(/[-‐‑‒—−]/g, "–");

export function extractJSON(text) {
  const t = String(text || "").replace(/```(?:json)?/gi, "");
  const tries = [t.trim()];
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a >= 0 && b > a) tries.push(t.slice(a, b + 1));
  const c = t.indexOf("{"), d = t.lastIndexOf("}");
  if (c >= 0 && d > c) tries.push(t.slice(c, d + 1));
  for (const x of tries) { try { return JSON.parse(x); } catch (e) { /* try the next shape */ } }
  return null;
}

/** Returns { blocks: [{day, slot, mode}], skipped: [reason strings], error } */
export function parseGridBlocks(text, { days, slots, modes }) {
  const data = extractJSON(text);
  if (!data) return { blocks: [], skipped: [], error: "That doesn't look like JSON. Paste exactly what Claude gave you." };
  const list = Array.isArray(data) ? data : Array.isArray(data.blocks) ? data.blocks : null;
  if (!list) return { blocks: [], skipped: [], error: "Expected a list of blocks." };
  const slotMap = new Map(slots.map((s) => [norm(s), s]));
  const modeMap = new Map();
  Object.entries(modes).forEach(([k, m]) => { modeMap.set(norm(k), k); modeMap.set(norm(m.label), k); });
  const dayOf = (v) => days.find((d) => String(v || "").trim().toLowerCase().slice(0, 3) === d.toLowerCase());
  const blocks = [], skipped = [];
  list.forEach((raw, n) => {
    if (!raw || typeof raw !== "object") { skipped.push(`#${n + 1}: not a block`); return; }
    const day = dayOf(raw.day), mode = modeMap.get(norm(raw.mode));
    const wanted = Array.isArray(raw.slots) ? raw.slots : [raw.slot];
    if (!day) { skipped.push(`#${n + 1}: unknown day "${raw.day}"`); return; }
    if (!mode) { skipped.push(`#${n + 1}: unknown mode "${raw.mode}"`); return; }
    wanted.forEach((w) => {
      const slot = slotMap.get(norm(w));
      if (!slot) skipped.push(`#${n + 1}: unknown slot "${w}"`);
      else blocks.push({ day, slot, mode });
    });
  });
  return { blocks, skipped, error: "" };
}

/**
 * Put blocks onto a schedule (schedule[day][slot] = mode). Office blocks are never touched.
 * replace=false fills only empty slots; replace=true overwrites everything except office.
 */
export function applyBlocks(schedule, blocks, replace) {
  const next = {};
  Object.keys(schedule || {}).forEach((d) => { next[d] = { ...schedule[d] }; });
  let placed = 0, keptOffice = 0, keptExisting = 0;
  blocks.forEach(({ day, slot, mode }) => {
    next[day] = next[day] || {};
    const cur = next[day][slot];
    if (cur === "office") { keptOffice++; return; }
    if (cur && !replace) { keptExisting++; return; }
    next[day][slot] = mode;
    placed++;
  });
  return { schedule: next, placed, keptOffice, keptExisting };
}

/** The text she copies into a Claude chat so the answer comes back in the right shape. */
export function buildPrompt({ days, slots, modes, schedule, weekNote }) {
  const office = [];
  days.forEach((d) => slots.forEach((s) => { if (schedule && schedule[d] && schedule[d][s] === "office") office.push(`${d} ${s}`); }));
  const modeLines = Object.entries(modes).map(([k, m]) => `- ${k}: ${m.label} (${m.sub}), energy cost ${m.energyCost}`).join("\n");
  return [
    "Help me fill in my weekly planner grid for this week.",
    "",
    "The grid is Monday to Sunday, in these 2-hour slots: " + slots.join(", ") + ".",
    "Each block uses one of these modes (use the key before the colon):",
    modeLines,
    "",
    office.length ? "These slots are already taken by office work, so leave them alone: " + office.join(", ") + "." : "I have no office work blocked in yet. Ask me about my work hours before you place anything.",
    weekNote ? "My note for the week: " + weekNote : null,
    "",
    "Aim for a balanced week rather than a full one: leave rest and gaps, avoid two high-energy-cost blocks back to back, and include at least one making block for fine art practice.",
    "Ask me anything you need to know first (deadlines, appointments, energy). Then reply with ONLY a JSON list, like this:",
    '[{"day":"Mon","slot":"9–11am","mode":"making"},{"day":"Mon","slot":"1–3pm","mode":"comms"}]',
  ].filter((l) => l !== null).join("\n");
}

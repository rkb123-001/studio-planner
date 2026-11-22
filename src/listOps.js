// Named task lists (for example "Before Australia", "In Australia", "Hello Vet").
// Stored on the profile so they sync with the rest of the planner.

const isISO = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const clean = (s, n) => String(s == null ? "" : s).trim().slice(0, n);

export function normaliseLists(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((l) => l && typeof l === "object").slice(0, 30).map((l) => ({
    id: clean(l.id, 40) || newId(),
    name: clean(l.name, 60) || "Untitled list",
    items: (Array.isArray(l.items) ? l.items : []).filter((i) => i && clean(i.title, 140)).slice(0, 300).map((i) => ({
      id: clean(i.id, 40) || newId(), title: clean(i.title, 140), done: !!i.done,
      due: isISO(i.due) ? i.due : "", placed: !!i.placed, source: clean(i.source, 200),
    })),
  }));
}

const mapList = (lists, id, fn) => lists.map((l) => (l.id === id ? fn(l) : l));
const mapItem = (lists, id, itemId, fn) => mapList(lists, id, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? fn(i) : i)) }));

export const addList = (lists, name) => (clean(name, 60) ? [...lists, { id: newId(), name: clean(name, 60), items: [] }] : lists);
export const renameList = (lists, id, name) => (clean(name, 60) ? mapList(lists, id, (l) => ({ ...l, name: clean(name, 60) })) : lists);
export const removeList = (lists, id) => lists.filter((l) => l.id !== id);
export const addItem = (lists, id, title, due = "") => (clean(title, 140)
  ? mapList(lists, id, (l) => ({ ...l, items: [...l.items, { id: newId(), title: clean(title, 140), done: false, due: isISO(due) ? due : "", placed: false, source: "" }] }))
  : lists);
export const toggleItem = (lists, id, itemId) => mapItem(lists, id, itemId, (i) => ({ ...i, done: !i.done }));
export const removeItem = (lists, id, itemId) => mapList(lists, id, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
export const setItemDue = (lists, id, itemId, due) => mapItem(lists, id, itemId, (i) => ({ ...i, due: isISO(due) ? due : "" }));
export const markPlaced = (lists, id, itemId) => mapItem(lists, id, itemId, (i) => ({ ...i, placed: true }));

/** entries: [{ list, title, due, source }] -> adds to a list with that name (case-insensitive), creating it if needed. Skips repeats. */
export function importIntoLists(lists, entries) {
  let out = lists.map((l) => ({ ...l, items: [...l.items] }));
  entries.forEach((e) => {
    const name = clean(e.list, 60) || "Imported";
    let l = out.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!l) { l = { id: newId(), name, items: [] }; out = [...out, l]; }
    const title = clean(e.title, 140);
    if (!title || l.items.some((i) => i.title.toLowerCase() === title.toLowerCase())) return;
    l.items.push({ id: newId(), title, done: false, due: isISO(e.due) ? e.due : "", placed: false, source: clean(e.source, 200) });
  });
  return out;
}

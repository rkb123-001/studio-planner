import { useState } from "react";
import { PlaceWizard } from "./PlaceThis";
import { addList, renameList, removeList, addItem, toggleItem, removeItem, setItemDue, markPlaced } from "./listOps";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const INK = "#1a1a1a";
const MUTED = "#888";
const btn = (active) => ({
  display: "inline-block", padding: "4px 12px", border: `1px solid ${active ? LINK_BLUE : INK}`, background: "#fff",
  color: active ? LINK_BLUE : INK, fontFamily: TNR, fontSize: "12px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
});
const small = { fontFamily: TNR, fontSize: "12px", color: MUTED };
const field = { fontFamily: TNR, fontSize: "14px", padding: "6px 8px", border: "1px solid #ccc", background: "#fff", boxSizing: "border-box" };

function ListCard({ list, onChange, showDone, onPlace, today }) {
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [confirm, setConfirm] = useState(false);
  const open = list.items.filter((i) => !i.done);
  const done = list.items.filter((i) => i.done);
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const shown = showDone ? list.items : open;

  return (
    <div style={{ border: "1px solid #e6e6e6", padding: "14px 16px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "8px" }}>
        {renaming ? (
          <input aria-label="List name" autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => { onChange((l) => renameList(l, list.id, name)); setRenaming(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} style={{ ...field, flex: 1 }} />
        ) : (
          <b onClick={() => { setName(list.name); setRenaming(true); }} title="Click to rename" style={{ fontFamily: TNR, fontSize: "16px", flex: 1, cursor: "text" }}>{list.name}</b>
        )}
        <span style={small}>{done.length}/{list.items.length} done</span>
        {confirm
          ? <span role="button" onClick={() => onChange((l) => removeList(l, list.id))} style={{ ...btn(false), color: "#b01904", borderColor: "#b01904" }}>Delete list?</span>
          : <span role="button" aria-label={`Delete list ${list.name}`} onClick={() => setConfirm(true)} style={{ cursor: "pointer", color: MUTED, fontSize: "16px" }}>×</span>}
      </div>
      <input aria-label={`Add to ${list.name}`} value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onChange((l) => addItem(l, list.id, draft)); setDraft(""); } }}
        placeholder="Add a task and press Enter" style={{ ...field, width: "100%" }} />
      {shown.length === 0 && <p style={{ ...small, margin: "8px 0 0" }}>{list.items.length ? "All done." : "Nothing here yet."}</p>}
      {shown.map((i) => (
        <div key={i.id} style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "7px 0", borderBottom: "1px solid #f0f0f0", fontFamily: TNR, fontSize: "14px", opacity: i.done ? 0.5 : 1 }}>
          <input type="checkbox" aria-label={`Done: ${i.title}`} checked={i.done} onChange={() => onChange((l) => toggleItem(l, list.id, i.id))} />
          <span style={{ flex: 1, textDecoration: i.done ? "line-through" : "none" }}>
            {i.title}
            {i.source ? <span style={{ ...small, marginLeft: "8px" }}>{i.source}</span> : null}
          </span>
          <input type="date" aria-label={`Date for ${i.title}`} value={i.due} onChange={(e) => onChange((l) => setItemDue(l, list.id, i.id, e.target.value))}
            style={{ ...field, padding: "1px 4px", fontSize: "11px", width: "112px", color: !i.done && i.due && i.due < todayISO ? "#b01904" : MUTED }} title="Set a date" />
          {i.placed
            ? <span style={small}>on timeline</span>
            : !i.done && <span role="button" onClick={() => onPlace(list.id, i)} style={btn(false)}>Place</span>}
          <span role="button" aria-label={`Remove ${i.title}`} onClick={() => onChange((l) => removeItem(l, list.id, i.id))} style={{ cursor: "pointer", color: MUTED, fontSize: "16px" }}>×</span>
        </div>
      ))}
    </div>
  );
}

export default function TaskLists({ lists, onChange, categories, today, onAddGoal }) {
  const [newName, setNewName] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [placing, setPlacing] = useState(null); // { listId, item }
  const create = () => { if (newName.trim()) { onChange((l) => addList(l, newName)); setNewName(""); } };

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <input aria-label="New list name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          placeholder="New list, e.g. Before Australia" style={{ ...field, flex: 1, minWidth: "200px" }} />
        <span role="button" onClick={create} style={btn(false)}>+ New list</span>
        <span role="button" onClick={() => setShowDone((v) => !v)} style={btn(showDone)}>{showDone ? "Hide done" : "Show done"}</span>
      </div>
      {placing && (
        <PlaceWizard key={placing.item.id} categories={categories} today={today} initialTitle={placing.item.title}
          onAdd={(g) => { onAddGoal(g); onChange((l) => markPlaced(l, placing.listId, placing.item.id)); }}
          onClose={() => setPlacing(null)} />
      )}
      {lists.length === 0 && <p style={{ fontFamily: TNR, fontSize: "15px", color: MUTED }}>No lists yet. Make one above, or use "Import suggestions" on the Timeline view to fill lists in one go.</p>}
      {lists.map((l) => (
        <ListCard key={l.id} list={l} today={today} showDone={showDone} onChange={onChange} onPlace={(listId, item) => setPlacing({ listId, item })} />
      ))}
    </div>
  );
}

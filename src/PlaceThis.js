import { useState } from "react";
import { SLIP, FEELING, SIZE, DATE_KIND, placeFromAnswers, parseProposals } from "./placeEngine";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const INK = "#1a1a1a";
const MUTED = "#888";
const btn = (active) => ({
  display: "inline-block", padding: "5px 14px", border: `1px solid ${active ? LINK_BLUE : INK}`, background: "#fff",
  color: active ? LINK_BLUE : INK, fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
});
const field = { fontFamily: TNR, fontSize: "14px", padding: "6px 8px", border: "1px solid #ccc", background: "#fff", width: "100%", boxSizing: "border-box" };
const q = { fontFamily: TNR, fontSize: "16px", margin: "0 0 12px" };
const box = { padding: "16px 18px", border: `1px solid ${INK}`, maxWidth: "720px", marginBottom: "20px" };

const EMPTY = { title: "", category: "", dateKind: "", date: "", slip: "", feeling: "", size: "", waitingOn: "" };

function Choices({ options, value, onPick }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {options.map((o) => <span key={o.key} role="button" onClick={() => onPick(o.key)} style={btn(value === o.key)}>{o.label}</span>)}
    </div>
  );
}

export function PlaceWizard({ categories, today, onAdd, onClose }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ ...EMPTY, category: categories[0] });
  const set = (k, v) => setA((cur) => ({ ...cur, [k]: v }));
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  const pickAndGo = (k, v) => { set(k, v); if (!(k === "dateKind" && v !== "none")) setStep((s) => s + 1); };
  const total = 6;

  const nav = (canNext, label = "Next") => (
    <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
      {step > 0 && <span role="button" onClick={back} style={btn(false)}>Back</span>}
      {canNext !== null && <span role="button" onClick={canNext ? next : undefined} style={{ ...btn(false), opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "default" }}>{label}</span>}
      <span onClick={onClose} style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, textDecoration: "underline", cursor: "pointer", marginLeft: "auto" }}>Cancel</span>
    </div>
  );

  let body;
  if (step === 0) {
    body = (<>
      <p style={q}>What is it?</p>
      <input aria-label="Task title" style={field} value={a.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Send VAT return" />
      <p style={{ ...q, marginTop: "14px" }}>Which part of your life or practice?</p>
      <select aria-label="Category" style={field} value={a.category} onChange={(e) => set("category", e.target.value)}>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {nav(!!a.title.trim())}
    </>);
  } else if (step === 1) {
    body = (<>
      <p style={q}>Is there a date?</p>
      <Choices options={DATE_KIND} value={a.dateKind} onPick={(v) => pickAndGo("dateKind", v)} />
      {a.dateKind && a.dateKind !== "none" && (
        <div style={{ marginTop: "12px", maxWidth: "220px" }}>
          <input aria-label="Date" type="date" style={field} value={a.date} onChange={(e) => set("date", e.target.value)} />
        </div>
      )}
      {nav(a.dateKind === "none" || (!!a.dateKind && !!a.date))}
    </>);
  } else if (step === 2) {
    body = (<><p style={q}>What happens if it slips?</p><Choices options={SLIP} value={a.slip} onPick={(v) => pickAndGo("slip", v)} />{nav(null)}</>);
  } else if (step === 3) {
    body = (<><p style={q}>How do you feel about doing it?</p><Choices options={FEELING} value={a.feeling} onPick={(v) => pickAndGo("feeling", v)} />{nav(null)}</>);
  } else if (step === 4) {
    body = (<><p style={q}>How big is it?</p><Choices options={SIZE} value={a.size} onPick={(v) => pickAndGo("size", v)} />{nav(null)}</>);
  } else if (step === 5) {
    body = (<>
      <p style={q}>Is it waiting on anyone or anything first?</p>
      <input aria-label="Waiting on" style={field} value={a.waitingOn} onChange={(e) => set("waitingOn", e.target.value)} placeholder="Leave blank if not" />
      {nav(true, "See where it lands")}
    </>);
  } else {
    const r = placeFromAnswers(a, today);
    body = (<>
      <p style={q}>{a.title}</p>
      <p style={{ fontFamily: TNR, fontSize: "15px", margin: "0 0 4px" }}>Lands in <b>{r.summary}</b>, in {a.category}.</p>
      <p style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, margin: 0 }}>Because {r.why}.</p>
      <div style={{ marginTop: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <span role="button" onClick={back} style={btn(false)}>Back</span>
        <span role="button" onClick={() => { onAdd(r.goal); onClose(); }} style={btn(true)}>Add to timeline</span>
        <span onClick={onClose} style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, textDecoration: "underline", cursor: "pointer", marginLeft: "auto" }}>Cancel</span>
      </div>
    </>);
  }

  return (
    <div style={box}>
      <p style={{ fontFamily: TNR, fontSize: "11px", letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", margin: "0 0 10px" }}>Place something · {Math.min(step + 1, total)} of {total}</p>
      {body}
    </div>
  );
}

export function ImportBox({ categories, today, onAdd, onClose }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const read = () => { const r = parseProposals(text, categories); setError(r.error); setItems(r.items.length ? r.items : null); };
  const update = (key, patch) => setItems((cur) => cur.map((it) => (it.key === key ? { ...it, ...patch, answers: { ...it.answers, ...(patch.answers || {}) } } : it)));
  const chosen = items ? items.filter((i) => i.include) : [];
  const addAll = () => { chosen.forEach((i) => onAdd(placeFromAnswers(i.answers, today).goal)); onClose(); };

  return (
    <div style={box}>
      <p style={{ fontFamily: TNR, fontSize: "11px", letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase", margin: "0 0 10px" }}>Import suggestions from the monthly review</p>
      {!items && (<>
        <textarea aria-label="Pasted suggestions" style={{ ...field, minHeight: "110px" }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the block from your monthly review here" />
        {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", margin: "8px 0 0" }}>{error}</p>}
        <div style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
          <span role="button" onClick={text.trim() ? read : undefined} style={{ ...btn(false), opacity: text.trim() ? 1 : 0.4 }}>Read it</span>
          <span onClick={onClose} style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, textDecoration: "underline", cursor: "pointer", marginLeft: "auto" }}>Cancel</span>
        </div>
      </>)}
      {items && (<>
        <p style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, margin: "0 0 10px" }}>Check each one. Anything marked "guessed" had no answer, so change it if I got it wrong.</p>
        {items.map((it) => {
          const r = placeFromAnswers(it.answers, today);
          return (
            <div key={it.key} style={{ borderTop: "1px solid #eee", padding: "10px 0", opacity: it.include ? 1 : 0.45 }}>
              <label style={{ display: "flex", gap: "8px", alignItems: "baseline", fontFamily: TNR, fontSize: "14px" }}>
                <input type="checkbox" checked={it.include} onChange={(e) => update(it.key, { include: e.target.checked })} />
                <b>{it.answers.title}</b>
                <span style={{ color: MUTED, fontSize: "12px" }}>→ {r.summary}, {it.answers.category}</span>
              </label>
              {it.source && <p style={{ fontFamily: TNR, fontSize: "11px", color: MUTED, margin: "2px 0 6px 24px" }}>{it.source}</p>}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginLeft: "24px" }}>
                <select aria-label={`Importance for ${it.answers.title}`} style={{ ...field, width: "auto" }} value={it.answers.slip} onChange={(e) => update(it.key, { answers: { slip: e.target.value } })}>{SLIP.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
                <select aria-label={`Feeling for ${it.answers.title}`} style={{ ...field, width: "auto" }} value={it.answers.feeling} onChange={(e) => update(it.key, { answers: { feeling: e.target.value } })}>{FEELING.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
                <select aria-label={`Size for ${it.answers.title}`} style={{ ...field, width: "auto" }} value={it.answers.size} onChange={(e) => update(it.key, { answers: { size: e.target.value } })}>{SIZE.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
                {it.guessed.length > 0 && <span style={{ fontFamily: TNR, fontSize: "11px", color: "#b01904", alignSelf: "center" }}>guessed: {it.guessed.join(", ")}</span>}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: "14px", display: "flex", gap: "12px", alignItems: "center" }}>
          <span role="button" onClick={chosen.length ? addAll : undefined} style={{ ...btn(true), opacity: chosen.length ? 1 : 0.4 }}>Add {chosen.length} to timeline</span>
          <span role="button" onClick={() => setItems(null)} style={btn(false)}>Back</span>
          <span onClick={onClose} style={{ fontFamily: TNR, fontSize: "13px", color: MUTED, textDecoration: "underline", cursor: "pointer", marginLeft: "auto" }}>Cancel</span>
        </div>
      </>)}
    </div>
  );
}

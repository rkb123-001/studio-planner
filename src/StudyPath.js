import { useState } from "react";
import { mergeCatalogue, buildPath, findOpt, cleanOption, applyAIResult, normaliseStudyPath, defaultStudyPath, uid, SEED } from "./pathEngine";

// ─────────────────────────────────────────────────────────────────────────────
// StudyPath — pick one option per stage and see where it leads. Everything is
// editable: add or edit your own options and stages, write preferences, or ask
// the AI (via /api/path-coach) to recalibrate. "Plan this path" turns the picks
// into dated steps, shown as a map and added to Quarterly goals.
// ─────────────────────────────────────────────────────────────────────────────

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const TOKEN_KEY = "studio-planner-auth-token";

const sml = { fontFamily: TNR, fontSize: "11px", letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase" };
const tiny = { fontFamily: TNR, fontSize: "12px", color: "#888", lineHeight: 1.7, margin: 0 };
const inp = { fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", border: "none", borderBottom: "1px solid #eee", outline: "none", background: "transparent", padding: "4px 0", width: "100%" };
const area = { fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", lineHeight: 1.6, border: "1px solid #eee", outline: "none", background: "transparent", padding: "8px", width: "100%", minHeight: "64px", resize: "vertical", boxSizing: "border-box" };
const linkStyle = { color: LINK_BLUE, textDecoration: "underline", textDecorationColor: LINK_BLUE, textUnderlineOffset: "2px", cursor: "pointer", fontFamily: TNR };
const quiet = { fontFamily: TNR, fontSize: "12px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" };
const boxBtn = (active) => ({ display: "block", textAlign: "center", padding: "10px 12px", border: `1px solid ${active ? LINK_BLUE : "#d8d8d8"}`, background: active ? "#f6f6ff" : "#fff", color: active ? LINK_BLUE : "#1a1a1a", fontFamily: TNR, fontSize: "14px", cursor: "pointer", userSelect: "none" });
const TAG = { pay: { bg: "#e4f2ec", fg: "#1f5a41", label: "Pay" }, art: { bg: "#ecebfb", fg: "#3a3591", label: "Art" }, other: { bg: "#f0f0f0", fg: "#555", label: "Other" } };
const TRACK = { pay: { bg: "#e4f2ec", bd: "#2f7a58", fg: "#1f5a41" }, art: { bg: "#ecebfb", bd: "#6a63c9", fg: "#3a3591" } };

const arr = (x) => (Array.isArray(x) ? x : []);
const Label = ({ t }) => <p style={{ ...sml, margin: "12px 0 4px" }}>{t}</p>;
const toneColor = (t) => (t === "warn" ? "#b01904" : "#1a1a1a");

const toDraft = (o) => ({
  label: o.label || "", blurb: o.blurb || "", institution: o.institution || "", kind: o.kind === "job" ? "job" : "study",
  mode: o.mode || "full-time", start: o.startRule && o.startRule.type === "fixed" ? o.startRule.ym : "",
  months: String(o.months || 12), feeTotal: o.feeTotal == null ? "" : String(o.feeTotal),
  loan: o.loan || "", income: o.income || "", deadlineDate: o.deadlineDate || "", sourceUrl: "", note: "",
});
const blankDraft = () => toDraft({ label: "", kind: "study", mode: "full-time", months: 12 });

function OptionForm({ draft, setDraft, onSave, onCancel, onRemove, onReset, existing, seedOption, edited }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  return (
    <div style={{ margin: "14px 0 6px", padding: "14px", border: "1px solid #eee", background: "#fcfcfc" }}>
      <p style={sml}>{existing ? "Edit option" : "New option"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "10px 16px", marginTop: "8px" }}>
        <div><Label t="Name" /><input style={inp} value={draft.label} onChange={set("label")} placeholder="e.g. Goldsmiths MFA, part-time" /></div>
        <div><Label t="Institution or employer" /><input style={inp} value={draft.institution} onChange={set("institution")} /></div>
        <div><Label t="Type" /><select style={inp} value={draft.kind} onChange={set("kind")}><option value="study">Study</option><option value="job">Job or income</option></select></div>
        <div><Label t="Mode" /><select style={inp} value={draft.mode} onChange={set("mode")}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="alongside">Alongside work</option></select></div>
        <div><Label t="Starts (month)" /><input type="month" style={inp} value={draft.start} onChange={set("start")} />{seedOption && !draft.start && <p style={tiny}>Auto: follows your entry-year assumption.</p>}</div>
        <div><Label t="Length (months)" /><input type="number" min="1" style={inp} value={draft.months} onChange={set("months")} /></div>
        <div><Label t="Total tuition (£)" /><input type="number" min="0" style={inp} value={draft.feeTotal} onChange={set("feeTotal")} placeholder="blank = unknown" /></div>
        <div><Label t="Funding" /><select style={inp} value={draft.loan} onChange={set("loan")}><option value="">No loan</option><option value="masters">Uses master's loan</option><option value="doctoral">Doctoral loan / studentship</option></select></div>
        <div><Label t="Income while on it" /><select style={inp} value={draft.income} onChange={set("income")}><option value="">Auto</option><option value="keeps">Keeps working</option><option value="pauses">Work pauses</option><option value="stipend">Stipend</option><option value="varies">Varies</option></select></div>
        <div><Label t="Application deadline" /><input type="date" style={inp} value={draft.deadlineDate} onChange={set("deadlineDate")} /></div>
      </div>
      <Label t="One line on why you would pick it" />
      <input style={inp} value={draft.blurb} onChange={set("blurb")} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px 16px" }}>
        <div><Label t="Add a note or fact" /><input style={inp} value={draft.note} onChange={set("note")} placeholder="e.g. fee confirmed by email" /></div>
        <div><Label t="Source link (optional)" /><input style={inp} value={draft.sourceUrl} onChange={set("sourceUrl")} placeholder="https://" /></div>
      </div>
      <div style={{ display: "flex", gap: "18px", marginTop: "14px", flexWrap: "wrap", alignItems: "baseline" }}>
        <span style={{ ...linkStyle, fontSize: "14px" }} onClick={onSave}>Save</span>
        <span style={quiet} onClick={onCancel}>cancel</span>
        {existing && edited && <span style={quiet} onClick={onReset}>reset to researched values</span>}
        {existing && <span style={{ ...quiet, color: "#b01904" }} onClick={onRemove}>{seedOption ? "hide this option" : "delete this option"}</span>}
      </div>
    </div>
  );
}

function Facts({ facts }) {
  const list = arr(facts);
  if (!list.length) return <p style={{ ...tiny, marginTop: "6px" }}>No researched facts for this one yet. Fees and dates are your own estimates.</p>;
  return (
    <div style={{ marginTop: "8px" }}>
      {list.map((f, i) => (
        <p key={i} style={{ ...tiny, marginBottom: "6px" }}>
          {f.text}{" "}
          <span style={{ color: "#aaa" }}>
            {f.url ? <a href={f.url} target="_blank" rel="noreferrer" style={{ color: LINK_BLUE }}>{f.source}</a> : f.source}
            {f.checked ? `, checked ${f.checked}` : ""}{f.ai ? ", AI-added, unverified" : ""}
          </span>
        </p>
      ))}
    </div>
  );
}

function PathMap({ steps, openStep, setOpenStep }) {
  return (
    <div style={{ margin: "18px 0 8px" }}>
      {steps.map((s, i) => {
        const c = TRACK[s.track] || TRACK.pay;
        const open = openStep === s.id;
        return (
          <div key={s.id}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 22px minmax(0,1fr)", alignItems: "center", gap: "0" }}>
              <div onClick={() => setOpenStep(open ? null : s.id)} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: "8px", padding: "12px 14px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontFamily: TNR, fontSize: "16px", color: "#1a1a1a" }}>{s.title}</div>
                <div style={{ fontFamily: TNR, fontSize: "13px", color: c.fg }}>{s.when}</div>
              </div>
              <div style={{ borderTop: "1px dashed #bbb", height: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {arr(s.side).length === 0 && <div style={{ height: "1px" }} />}
                {arr(s.side).map((d, j) => (
                  <div key={j} style={{ background: d.portfolio ? TRACK.art.bg : "#fafafa", border: `1px solid ${d.portfolio ? TRACK.art.bd : "#e2e2e2"}`, borderRadius: "8px", padding: "9px 12px", textAlign: "center" }}>
                    <div style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a" }}>{d.title}</div>
                    <div style={{ fontFamily: TNR, fontSize: "12px", color: d.portfolio ? TRACK.art.fg : "#777" }}>{d.when}</div>
                  </div>
                ))}
              </div>
            </div>
            {open && (
              <div style={{ margin: "8px 0 0", padding: "10px 14px", background: "#fcfcfc", border: "1px solid #eee" }}>
                {s.note && <p style={{ ...tiny, marginBottom: "6px" }}>{s.note}</p>}
                {s.next && <p style={{ fontFamily: TNR, fontSize: "13px", margin: 0 }}><span style={{ color: "#888" }}>First action:</span> {s.next}</p>}
              </div>
            )}
            {i < steps.length - 1 && <div style={{ width: "calc(50% - 11px)", fontFamily: TNR, color: "#888", fontSize: "18px", textAlign: "center", margin: "4px 0" }}>↓</div>}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: "18px", marginTop: "16px", flexWrap: "wrap" }}>
        {[["pay", "Pay and job"], ["art", "Art and study"]].map(([k, l]) => (
          <span key={k} style={{ ...tiny, display: "inline-flex", alignItems: "center", gap: "6px" }}><span style={{ width: "14px", height: "14px", borderRadius: "3px", background: TRACK[k].bg, border: `1px solid ${TRACK[k].bd}`, display: "inline-block" }} />{l}</span>
        ))}
        <span style={{ ...tiny, display: "inline-flex", alignItems: "center", gap: "6px" }}><span style={{ width: "14px", height: "14px", borderRadius: "3px", background: "#fafafa", border: "1px solid #e2e2e2", display: "inline-block" }} />Key date</span>
      </div>
    </div>
  );
}

export function StudyPath({ path: pathIn, onUpdate, onPlan, planNotice, onOpenQuarterly }) {
  const path = pathIn || normaliseStudyPath(defaultStudyPath());
  const cat = mergeCatalogue(path);
  const built = buildPath(cat, path.picks, path.assumptions);
  const pinnedBuilt = path.pinned ? buildPath(cat, path.pinned.picks, path.pinned.assumptions) : null;

  const [view, setView] = useState("build");
  const [showAssump, setShowAssump] = useState(false);
  const [openFacts, setOpenFacts] = useState(null);
  const [editing, setEditing] = useState(null); // { stage, id|null }
  const [draft, setDraft] = useState(blankDraft());
  const [addingStage, setAddingStage] = useState(false);
  const [stageDraft, setStageDraft] = useState({ label: "", sub: "", tag: "other", after: "" });
  const [prompt, setPrompt] = useState("");
  const [research, setResearch] = useState(false);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [openStep, setOpenStep] = useState(null);

  const pick = (stage, id) => onUpdate((cur) => ({ ...cur, picks: { ...cur.picks, [stage]: id } }));
  const setAssump = (k, v) => onUpdate((cur) => ({ ...cur, assumptions: { ...cur.assumptions, [k]: v } }));

  const startEdit = (stage, id) => {
    setEditing({ stage, id });
    setDraft(id ? toDraft(findOpt(cat, stage, id) || {}) : blankDraft());
  };

  const saveDraft = () => {
    if (!editing || !draft.label.trim()) return;
    const { stage, id } = editing;
    const clean = cleanOption({ ...draft, feeTotal: draft.feeTotal === "" ? null : draft.feeTotal, loan: draft.loan || null, income: draft.income || undefined, start: draft.start, facts: draft.note ? [{ text: draft.note, source: "You", url: draft.sourceUrl }] : [] });
    onUpdate((cur) => {
      if (!id) {
        const nid = uid();
        return { ...cur, custom: { ...cur.custom, options: [...cur.custom.options, { id: nid, stage, ...clean, custom: true }] }, picks: { ...cur.picks, [stage]: nid } };
      }
      const existing = findOpt(mergeCatalogue(cur), stage, id) || {};
      const keep = arr(existing.facts);
      const isCustom = cur.custom.options.some((o) => o.stage === stage && o.id === id);
      const changedLength = String(existing.months) !== String(draft.months) || existing.mode !== draft.mode;
      if (isCustom) {
        const options = cur.custom.options.map((o) => (o.stage === stage && o.id === id ? { ...o, ...clean, startRule: draft.start ? clean.startRule : o.startRule, facts: [...keep, ...clean.facts] } : o));
        return { ...cur, custom: { ...cur.custom, options } };
      }
      const patch = { ...clean, facts: [...keep, ...clean.facts] };
      delete patch.stepTitle; delete patch.nextAction;
      if (!draft.start) delete patch.startRule;
      if (!changedLength) delete patch.outOfWorkMonths;
      return { ...cur, overrides: { ...cur.overrides, [stage + ":" + id]: { ...(cur.overrides[stage + ":" + id] || {}), ...patch } } };
    });
    setEditing(null);
  };

  const removeOption = () => {
    const { stage, id } = editing;
    onUpdate((cur) => {
      if (cur.custom.options.some((o) => o.stage === stage && o.id === id)) {
        return { ...cur, custom: { ...cur.custom, options: cur.custom.options.filter((o) => !(o.stage === stage && o.id === id)) } };
      }
      return { ...cur, hidden: [...cur.hidden, stage + ":" + id] };
    });
    setEditing(null);
  };
  const resetOption = () => {
    const { stage, id } = editing;
    onUpdate((cur) => { const ov = { ...cur.overrides }; delete ov[stage + ":" + id]; return { ...cur, overrides: ov }; });
    setEditing(null);
  };

  const addStage = () => {
    if (!stageDraft.label.trim()) return;
    onUpdate((cur) => ({ ...cur, custom: { ...cur.custom, stages: [...cur.custom.stages, { key: uid(), label: stageDraft.label.trim(), sub: stageDraft.sub.trim(), tag: stageDraft.tag, after: stageDraft.after || null }] } }));
    setStageDraft({ label: "", sub: "", tag: "other", after: "" });
    setAddingStage(false);
  };
  const removeStage = (key) => onUpdate((cur) => ({
    ...cur,
    custom: { stages: cur.custom.stages.filter((s) => s.key !== key), options: cur.custom.options.filter((o) => o.stage !== key) },
  }));

  const restoreSuggested = () => onUpdate((cur) => ({ ...cur, picks: { ...SEED.suggestedPicks }, assumptions: { ...SEED.assumptions } }));
  const pinCurrent = () => onUpdate((cur) => ({ ...cur, pinned: { picks: { ...cur.picks }, assumptions: { ...cur.assumptions }, at: new Date().toISOString() } }));

  const ask = async (text) => {
    const q = (text || prompt).trim();
    if (!q || asking) return;
    setAsking(true); setAskError("");
    try {
      let token = "";
      try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch { token = ""; }
      const resp = await fetch("/api/path-coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, prompt: q, research,
          state: { picks: path.picks, assumptions: path.assumptions, prefs: path.prefs, custom: path.custom, hidden: path.hidden, overrides: path.overrides },
          summary: { rows: built.rows.map((r) => ({ label: r.label, value: r.value, detail: r.detail })), warnings: built.warnings.map((w) => w.text), steps: built.steps.map((s) => `${s.title} (${s.when})`) },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 404) throw new Error("The AI link only works on the deployed site, because it needs the /api function. Try it at your live planner address.");
      if (!resp.ok || !data.result) throw new Error(data.error || `The AI link returned ${resp.status}.`);
      onUpdate((cur) => {
        const before = { picks: cur.picks, assumptions: cur.assumptions, custom: cur.custom, overrides: cur.overrides, hidden: cur.hidden, prefs: cur.prefs };
        const { path: next, added } = applyAIResult(cur, data.result);
        const entry = { id: uid(), prompt: q, explanation: String(data.result.explanation || ""), caveats: arr(data.result.caveats).slice(0, 5).map(String), added, at: new Date().toISOString(), before, searched: !!data.searched };
        return { ...next, askLog: [entry, ...next.askLog].slice(0, 8) };
      });
      setPrompt("");
    } catch (e) {
      setAskError(e && e.message ? e.message : "Could not reach the AI link.");
    }
    setAsking(false);
  };
  const undoAsk = () => onUpdate((cur) => {
    const e = cur.askLog[0];
    return e && e.before ? { ...cur, ...e.before, askLog: cur.askLog.slice(1) } : cur;
  });

  const lastAsk = path.askLog[0];
  const planSteps = path.plan && path.plan.steps ? path.plan.steps : built.steps;

  // ── render ──
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <p style={{ fontFamily: TNR, fontSize: "15px", lineHeight: 1.7, margin: "0 0 6px" }}>Pick one option at each stage to see where it leads. The summary at the bottom updates as you change your picks.</p>
      <p style={{ ...tiny, marginBottom: "22px" }}>It starts with the suggested route. Try swapping in the Birkbeck MSc to see how it affects your art MA funding. Add your own options or stages, set preferences, or tell the AI what you want to change.</p>

      <div style={{ display: "flex", gap: "20px", marginBottom: "18px", flexWrap: "wrap" }}>
        {[["build", "Picks"], ["plan", "Plan map"], ["compare", "Compare"]].map(([k, l]) => (
          <span key={k} onClick={() => setView(k)} style={{ fontFamily: TNR, fontSize: "14px", cursor: "pointer", color: view === k ? LINK_BLUE : "#888", textDecoration: view === k ? "underline" : "none", textUnderlineOffset: "3px" }}>{l}</span>
        ))}
      </div>

      {view === "build" && (
        <>
          {cat.stages.map((stage, si) => {
            const tag = TAG[stage.tag] || TAG.other;
            const opts = cat.options.filter((o) => o.stage === stage.key);
            const sel = findOpt(cat, stage.key, path.picks[stage.key]);
            const isCustomStage = path.custom.stages.some((s) => s.key === stage.key);
            return (
              <div key={stage.key}>
                <div style={{ border: "1px solid #eee", borderRadius: "10px", padding: "16px 16px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div>
                      <div style={{ fontFamily: TNR, fontSize: "19px", color: "#1a1a1a" }}>{si + 1}. {stage.label}</div>
                      {stage.sub && <div style={{ fontFamily: TNR, fontSize: "13px", color: "#888" }}>{stage.sub}</div>}
                    </div>
                    <span style={{ fontFamily: TNR, fontSize: "12px", padding: "3px 12px", borderRadius: "999px", background: tag.bg, color: tag.fg }}>{tag.label}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", margin: "14px 0 10px" }}>
                    {opts.map((o) => (
                      <span key={o.id} onClick={() => pick(stage.key, o.id)} style={boxBtn(path.picks[stage.key] === o.id)}>
                        {o.label}
                        {(o.custom || o.edited) && <span style={{ display: "block", fontSize: "10px", color: "#aaa", letterSpacing: "0.06em" }}>{o.ai ? "AI-ADDED" : o.custom ? "YOURS" : "EDITED"}</span>}
                      </span>
                    ))}
                  </div>
                  {sel && <p style={{ fontFamily: TNR, fontSize: "14px", color: "#444", margin: "0 0 6px", lineHeight: 1.6 }}>{sel.blurb}</p>}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {sel && sel.kind !== "none" && <span style={quiet} onClick={() => setOpenFacts(openFacts === stage.key ? null : stage.key)}>{openFacts === stage.key ? "hide facts and sources" : `facts and sources (${arr(sel.facts).length})`}</span>}
                    {sel && sel.kind !== "none" && <span style={quiet} onClick={() => startEdit(stage.key, sel.id)}>edit this option</span>}
                    <span style={quiet} onClick={() => startEdit(stage.key, null)}>+ add your own option</span>
                    {isCustomStage && <span style={{ ...quiet, color: "#b01904" }} onClick={() => removeStage(stage.key)}>remove this stage</span>}
                  </div>
                  {openFacts === stage.key && sel && <Facts facts={sel.facts} />}
                  {openFacts === stage.key && sel && sel.feeNote && <p style={{ ...tiny, marginTop: "6px" }}>Cost basis: {sel.feeNote}</p>}
                  {editing && editing.stage === stage.key && (
                    <OptionForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={() => setEditing(null)} onRemove={removeOption} onReset={resetOption}
                      existing={!!editing.id} seedOption={!!editing.id && !path.custom.options.some((o) => o.stage === stage.key && o.id === editing.id)} edited={!!(editing.id && path.overrides[stage.key + ":" + editing.id])} />
                  )}
                </div>
                <div style={{ textAlign: "center", fontFamily: TNR, color: "#999", fontSize: "20px", margin: "6px 0" }}>↓</div>
              </div>
            );
          })}

          {addingStage ? (
            <div style={{ border: "1px solid #eee", borderRadius: "10px", padding: "14px", marginBottom: "18px" }}>
              <p style={sml}>New stage</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px 16px" }}>
                <div><Label t="Name" /><input style={inp} value={stageDraft.label} onChange={(e) => setStageDraft({ ...stageDraft, label: e.target.value })} placeholder="e.g. Residency" /></div>
                <div><Label t="Timing note" /><input style={inp} value={stageDraft.sub} onChange={(e) => setStageDraft({ ...stageDraft, sub: e.target.value })} placeholder="e.g. 2029" /></div>
                <div><Label t="Track" /><select style={inp} value={stageDraft.tag} onChange={(e) => setStageDraft({ ...stageDraft, tag: e.target.value })}><option value="pay">Pay</option><option value="art">Art</option><option value="other">Other</option></select></div>
                <div><Label t="Goes after" /><select style={inp} value={stageDraft.after} onChange={(e) => setStageDraft({ ...stageDraft, after: e.target.value })}><option value="">At the end</option>{cat.stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
              </div>
              <div style={{ display: "flex", gap: "18px", marginTop: "12px" }}><span style={{ ...linkStyle, fontSize: "14px" }} onClick={addStage}>Add stage</span><span style={quiet} onClick={() => setAddingStage(false)}>cancel</span></div>
            </div>
          ) : (
            <p style={{ margin: "0 0 18px" }}><span style={{ ...linkStyle, fontSize: "13px" }} onClick={() => setAddingStage(true)}>+ add your own stage</span></p>
          )}

          {/* summary */}
          <div style={{ background: "#fafafa", borderRadius: "10px", padding: "16px 18px", margin: "8px 0 14px" }}>
            <div style={{ fontFamily: TNR, fontSize: "18px", marginBottom: "8px" }}>Your path</div>
            {built.rows.map((r, i) => (
              <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontFamily: TNR, fontSize: "14px" }}>
                  <span style={{ color: "#666" }}>{r.label}</span>
                  <span style={{ color: toneColor(r.tone), textAlign: "right" }}>{r.value}</span>
                </div>
                {r.detail && <div style={{ ...tiny, textAlign: "right" }}>{r.detail}</div>}
              </div>
            ))}
          </div>
          {built.warnings.length > 0 && (
            <div style={{ margin: "0 0 16px" }}>
              {built.warnings.map((w, i) => <p key={i} style={{ fontFamily: TNR, fontSize: "13px", lineHeight: 1.6, margin: "4px 0", color: w.level === "warn" ? "#b01904" : "#888" }}>{w.level === "warn" ? "— " : "· "}{w.text}</p>)}
            </div>
          )}

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "baseline", marginBottom: "6px" }}>
            <span onClick={() => { onPlan(built.steps); setView("plan"); }} style={{ ...boxBtn(false), display: "inline-block", padding: "10px 22px" }}>Plan this path ↗</span>
            <span style={quiet} onClick={pinCurrent}>pin these picks as my current plan</span>
            <span style={quiet} onClick={restoreSuggested}>back to the suggested route</span>
            <span style={quiet} onClick={() => setShowAssump(!showAssump)}>{showAssump ? "hide assumptions" : "assumptions and rules"}</span>
          </div>
          <p style={{ ...tiny, marginBottom: "24px" }}>When you have settled on a combination, tap Plan this path and I will turn it into dated steps, shown as a map and added to your Quarterly goals.</p>

          {showAssump && (
            <div style={{ border: "1px solid #eee", padding: "14px 16px", marginBottom: "24px" }}>
              <p style={sml}>Assumptions</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px 16px" }}>
                <div><Label t="Art entry year" /><select style={inp} value={path.assumptions.artEntryYear} onChange={(e) => setAssump("artEntryYear", parseInt(e.target.value, 10))}>{[2027, 2028, 2029, 2030, 2031].map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
                <div><Label t="Master's loan (£)" /><input type="number" style={inp} value={path.assumptions.mastersLoan} onChange={(e) => setAssump("mastersLoan", parseFloat(e.target.value) || 0)} /></div>
                <div><Label t="Doctoral loan (£)" /><input type="number" style={inp} value={path.assumptions.doctoralLoan} onChange={(e) => setAssump("doctoralLoan", parseFloat(e.target.value) || 0)} /></div>
                <div><Label t="PhD stipend per year (£)" /><input type="number" style={inp} value={path.assumptions.phdStipend} onChange={(e) => setAssump("phdStipend", parseFloat(e.target.value) || 0)} /></div>
              </div>
              <label style={{ display: "flex", gap: "8px", alignItems: "baseline", marginTop: "12px", fontFamily: TNR, fontSize: "14px", cursor: "pointer" }}>
                <input type="checkbox" checked={!!path.assumptions.loanEligible} onChange={(e) => setAssump("loanEligible", e.target.checked)} />
                Assume I am eligible for UK postgraduate loans (check your own position on gov.uk)
              </label>
              <p style={{ ...sml, marginTop: "16px" }}>Rules used</p>
              <Facts facts={cat.rules} />
            </div>
          )}

          {/* preferences + AI */}
          <div style={{ borderTop: "1px solid #eee", paddingTop: "18px" }}>
            <p style={sml}>Your preferences and constraints</p>
            <textarea style={area} value={path.prefs} onChange={(e) => { const v = e.target.value; onUpdate((cur) => ({ ...cur, prefs: v })); }}
              placeholder={"Anything the plan should respect, one per line. e.g.\nKeep a part-time job during study\nLondon only\nNo evening classes\nFinish a PhD before 40"} />
            <p style={{ ...tiny, marginBottom: "18px" }}>The AI reads these every time you recalibrate.</p>

            <p style={sml}>Recalibrate with AI</p>
            <textarea style={{ ...area, minHeight: "72px" }} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask or tell me anything. e.g. What if I defer the art MA to 2029? Add a part-time MFA at Goldsmiths. I want to keep working three days a week." />
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", margin: "8px 0", alignItems: "baseline" }}>
              {["What if I defer the art MA to 2029?", "Add a part-time art MA option", "Which path keeps the most income?"].map((ex) => (
                <span key={ex} style={quiet} onClick={() => setPrompt(ex)}>{ex}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "20px", alignItems: "baseline", flexWrap: "wrap" }}>
              <span onClick={() => ask()} style={{ ...boxBtn(false), display: "inline-block", padding: "8px 20px", opacity: asking || !prompt.trim() ? 0.5 : 1 }}>{asking ? "Thinking…" : "Recalibrate"}</span>
              <label style={{ fontFamily: TNR, fontSize: "13px", color: "#555", cursor: "pointer", display: "inline-flex", gap: "6px", alignItems: "baseline" }}>
                <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} />Look things up online (slower, for new courses and fees)
              </label>
            </div>
            {askError && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "10px" }}>{askError}</p>}
            {lastAsk && (
              <div style={{ margin: "16px 0 0", padding: "12px 14px", background: "#fafafa", borderLeft: "2px solid #d8d8d8" }}>
                <p style={{ ...tiny, marginBottom: "4px" }}>You asked: {lastAsk.prompt}</p>
                <p style={{ fontFamily: TNR, fontSize: "14px", lineHeight: 1.7, margin: "0 0 6px" }}>{lastAsk.explanation}</p>
                {arr(lastAsk.added).length > 0 && <p style={tiny}>Changed: {lastAsk.added.join("; ")}</p>}
                {arr(lastAsk.caveats).map((c, i) => <p key={i} style={{ ...tiny, color: "#c47100" }}>Check: {c}</p>)}
                {lastAsk.searched && <p style={tiny}>Looked things up online. Open an added option's facts to see the sources, and verify them.</p>}
                <p style={{ margin: "6px 0 0" }}><span style={quiet} onClick={undoAsk}>undo this change</span></p>
              </div>
            )}
          </div>
        </>
      )}

      {view === "plan" && (
        <>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "baseline", marginBottom: "6px" }}>
            <span style={quiet} onClick={() => { onPlan(built.steps); }}>re-plan with my current picks</span>
            <span style={quiet} onClick={() => setView("build")}>back to picks</span>
            {onOpenQuarterly && <span style={quiet} onClick={onOpenQuarterly}>open Quarterly goals</span>}
          </div>
          {planNotice && <p style={{ ...tiny, color: "#0fa97f" }}>{planNotice}</p>}
          {path.plan && <p style={tiny}>Planned {new Date(path.plan.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Tap any box for the first action.</p>}
          {planSteps.length === 0 ? <p style={{ ...tiny, marginTop: "16px" }}>Nothing to plan yet. Pick at least one option.</p> : <PathMap steps={planSteps} openStep={openStep} setOpenStep={setOpenStep} />}
          <p style={{ ...tiny, marginTop: "10px" }}>Dates marked expected are estimates from this year's cycle. Check them once the official dates are published.</p>
        </>
      )}

      {view === "compare" && (
        <>
          {!pinnedBuilt ? (
            <p style={{ ...tiny, marginTop: "6px" }}>Pin your picks as the current plan first (on the Picks view), then change a stage and come back to compare the two side by side. <span style={quiet} onClick={pinCurrent}>Pin these picks now</span></p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
              {[["Current plan", pinnedBuilt, path.pinned.picks], ["With these picks", built, path.picks]].map(([title, b, picks]) => (
                <div key={title}>
                  <p style={{ fontFamily: TNR, fontSize: "17px", textAlign: "center", margin: "0 0 10px" }}>{title}</p>
                  <p style={{ ...tiny, textAlign: "center", marginBottom: "10px" }}>{cat.stages.map((s) => (findOpt(cat, s.key, picks[s.key]) || {}).label).filter(Boolean).join(" → ")}</p>
                  {b.steps.map((s) => {
                    const c = TRACK[s.track] || TRACK.pay;
                    return <div key={s.id} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: "8px", padding: "8px 10px", textAlign: "center", marginBottom: "6px" }}><div style={{ fontFamily: TNR, fontSize: "14px" }}>{s.title}</div><div style={{ fontFamily: TNR, fontSize: "12px", color: c.fg }}>{s.when}</div></div>;
                  })}
                  <div style={{ background: "#fafafa", borderRadius: "8px", padding: "10px 12px", marginTop: "8px" }}>
                    {b.rows.map((r, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontFamily: TNR, fontSize: "13px", padding: "3px 0" }}><span style={{ color: "#666" }}>{r.label}</span><span style={{ color: toneColor(r.tone), textAlign: "right" }}>{r.value}</span></div>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

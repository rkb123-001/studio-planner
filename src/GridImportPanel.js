import { useMemo, useState } from "react";
import { parseGridBlocks, applyBlocks, buildPrompt } from "./gridImport";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";
const small = { fontFamily: TNR, fontSize: "12px", color: "#888" };
const btn = (on) => ({
  display: "inline-block", padding: "5px 14px", border: `1px solid ${on ? LINK_BLUE : "#1a1a1a"}`, background: "#fff",
  color: on ? LINK_BLUE : "#1a1a1a", fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none",
});

/** Paste Claude's answer, preview what it will do, then apply it to the weekly grid. */
export default function GridImport({ days, slots, modes, schedule, weekNote, onApply, onClose }) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseGridBlocks(text, { days, slots, modes }) : null), [text, days, slots, modes]);
  const result = useMemo(() => (parsed && !parsed.error ? applyBlocks(schedule, parsed.blocks, replace) : null), [parsed, schedule, replace]);

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(buildPrompt({ days, slots, modes, schedule, weekNote })); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch (e) { setText(buildPrompt({ days, slots, modes, schedule, weekNote })); }
  };

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto 36px", border: "1px solid #e6e6e6", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
        <span style={{ ...small, textTransform: "uppercase", letterSpacing: "0.08em" }}>Fill the grid from Claude</span>
        <span role="button" aria-label="Close" onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: "18px", lineHeight: 1 }}>×</span>
      </div>
      <p style={{ ...small, margin: "0 0 10px", lineHeight: 1.5 }}>
        1. Copy the prompt and give it to Claude. 2. Answer its questions. 3. Paste its reply below. Office work blocks are never changed.
      </p>
      <div style={{ marginBottom: "10px" }}><span role="button" onClick={copyPrompt} style={btn(copied)}>{copied ? "Copied" : "Copy prompt for Claude"}</span></div>
      <textarea aria-label="Claude's reply" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder='Paste the reply here, e.g. [{"day":"Mon","slot":"9–11am","mode":"making"}]'
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "12px", padding: "8px", border: "1px solid #ccc" }} />
      {parsed && parsed.error && <p style={{ ...small, color: "#b01904", margin: "8px 0 0" }}>{parsed.error}</p>}
      {result && (
        <div style={{ margin: "10px 0 0" }}>
          <p style={{ ...small, color: "#1a1a1a", margin: "0 0 4px" }}>
            {result.placed} block{result.placed === 1 ? "" : "s"} will be placed
            {result.keptExisting ? `, ${result.keptExisting} left alone because the slot is already filled` : ""}
            {result.keptOffice ? `, ${result.keptOffice} skipped because of office work` : ""}.
          </p>
          {parsed.skipped.length > 0 && <p style={{ ...small, margin: "0 0 4px" }}>Skipped: {parsed.skipped.slice(0, 4).join("; ")}{parsed.skipped.length > 4 ? ` and ${parsed.skipped.length - 4} more` : ""}</p>}
          <label style={{ ...small, display: "block", margin: "6px 0 10px" }}>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace what's already on the grid
          </label>
          <span role="button" onClick={() => { onApply(parsed.blocks, replace); onClose(); }} style={{ ...btn(false), opacity: result.placed ? 1 : 0.4, pointerEvents: result.placed ? "auto" : "none" }}>Add to my week</span>
        </div>
      )}
    </div>
  );
}

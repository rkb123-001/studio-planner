import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ProjectRoadmap — an expanding, gated roadmap for developing an art project
// as an experiment: question → method → research → spine → outputs → test →
// present → reflect. Lives inside each art project (stored on project.roadmap).
// Soft lock: the next stage opens when the current one is complete or skipped;
// skipped stages stay flagged on the map until filled in.
// ─────────────────────────────────────────────────────────────────────────────

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";

const sml = { fontFamily: TNR, fontSize: "11px", letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase" };
const tiny = { fontFamily: TNR, fontSize: "12px", color: "#888", lineHeight: 1.7, margin: 0 };
const inp = {
  fontFamily: TNR, fontSize: "14px", color: "#1a1a1a",
  border: "none", borderBottom: "1px solid #eee", outline: "none",
  background: "transparent", padding: "4px 0", width: "100%",
};
const area = {
  fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", lineHeight: 1.6,
  border: "1px solid #eee", outline: "none", background: "transparent",
  padding: "8px", width: "100%", minHeight: "64px", resize: "vertical", boxSizing: "border-box",
};
const linkStyle = {
  color: LINK_BLUE, textDecoration: "underline", textDecorationColor: LINK_BLUE,
  textUnderlineOffset: "2px", cursor: "pointer", fontFamily: TNR,
};
const quietLink = {
  fontFamily: TNR, fontSize: "12px", color: "#888", cursor: "pointer",
  textDecoration: "underline", textUnderlineOffset: "2px",
};
const box = (active) => ({
  display: "inline-block", padding: "4px 12px",
  border: `1px solid ${active ? LINK_BLUE : "#1a1a1a"}`, background: "#fff",
  color: active ? LINK_BLUE : "#1a1a1a",
  fontFamily: TNR, fontSize: "13px", cursor: "pointer", userSelect: "none",
});

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const has = (s) => !!(s && String(s).trim());

// ── Choices ──────────────────────────────────────────────────────────────────

const METHODS = [
  { key: "immersive", label: "Immersive fieldwork", sub: "Enter a live community or situation and record from inside — participant observation." },
  { key: "studio",    label: "Studio-led",          sub: "Start from sketching, drawing and material play; bring in collaborators and other media later." },
  { key: "archival",  label: "Archival / textual",  sub: "Work from documents, histories, literature and found material." },
  { key: "material",  label: "Material experiment", sub: "Test a substance or process directly and let the results set the direction." },
  { key: "collab",    label: "Collaborative",       sub: "Co-develop with other people from the outset — performers, makers, specialists, a community." },
];

const SPINES = [
  { key: "persona",  label: "Persona / character",         sub: "A figure who carries the research into every output." },
  { key: "material", label: "Shared material",             sub: "One substance, scent, sound or object recurs across the works." },
  { key: "language", label: "Common non-verbal language",  sub: "Gesture, colour or form that lets different media read as one image." },
  { key: "site",     label: "Site / place",                sub: "The works are held together by where they happen." },
  { key: "text",     label: "Text / score",                sub: "A written core that each output performs or translates." },
  { key: "other",    label: "Other",                       sub: "Something else binds them." },
];

const RELATIONS = [
  { key: "contextualises", label: "contextualises" },
  { key: "derives",        label: "derives from" },
  { key: "shares",         label: "shares material with" },
  { key: "counters",       label: "is a counterpoint to" },
];

// ── The process ──────────────────────────────────────────────────────────────

const STAGES = [
  {
    key: "question", label: "Question",
    purpose: "State what the project is asking. Everything later is tested against it.",
    inputs: "A central question (or a short list of them).",
    needs: (r) => [["Central question written", has(r.question)]],
    fleck: "Ends on a list of questions: “How can you feel a person without them being there? When does something become fiction? Is technology even real?”",
    imhof: "Power, powerlessness, violence, resistance and freedom, routed through Goethe’s Faust.",
  },
  {
    key: "method", label: "Method",
    purpose: "Choose how you will gather material, and your position in it.",
    inputs: "A method, plus how you enter the situation (name or alias, consent, duration).",
    needs: (r) => [["Method chosen", !!r.method]],
    fleck: "Immersive: nine months inside a Discord server under an alias she calls “critical masking”.",
    imhof: "Studio-led: sketch and paint first, then translate into other media with collaborators.",
  },
  {
    key: "research", label: "Research",
    purpose: "Attach what you are gathering, then say what it showed you.",
    inputs: "At least one research board (are.na link) and a short summary of findings.",
    needs: (r) => [["At least one research board attached", r.boards.length > 0], ["Findings summarised", has(r.findings)]],
    fleck: "Server posts, vendor emails, pheromone compound lists, an NLP script taken from the community.",
    imhof: "Studio sketches and drawings; shared practice with performers.",
  },
  {
    key: "spine", label: "Spine",
    purpose: "Find the one device that carries the research into every output.",
    inputs: "A type of connective device, and a description of it.",
    needs: (r) => [["Connective device chosen", !!r.spineType], ["Device described", has(r.spine)]],
    fleck: "A persona — Jonathan Michaels, a likable man in his forties — who is present in the text, spray and audio.",
    imhof: "A common, non-verbal language so painting, sound, sculpture and performance read on one level.",
  },
  {
    key: "outputs", label: "Outputs",
    purpose: "Name each work, what it carries from the research, and how the works relate.",
    inputs: "At least one named output. Add relations once there are two.",
    needs: (r) => [["At least one output named", r.outputs.some((o) => has(o.title))]],
    fleck: "Fog and atomised scent installation; audio piece made with Calum Bowen and the server’s voices; AI-altered self-portraits.",
    imhof: "A five-hour performance, glass architecture, sound, painting — interlocking into one atmosphere.",
  },
  {
    key: "test", label: "Test",
    purpose: "Try the riskiest part before committing: material, dose, space, audience, collaborator.",
    inputs: "Notes on what you tested and what you learned.",
    needs: (r) => [["Test notes written", has(r.test)]],
    fleck: "Low pheromone doses, fragrance oils to mask the harsh smell, extractor fans to give the fog density.",
    imhof: "Performers stay in contact with Imhof by smartphone while she keeps overall control of the image.",
  },
  {
    key: "present", label: "Present",
    purpose: "Decide how the outputs are met together. Production logistics sit in the Stage field above.",
    inputs: "Where and how the works are seen, and what the visitor meets first.",
    needs: (r) => [["Presentation context written", has(r.present)]],
    fleck: "Two floors: dense mist above, a calm refuge below — “a sanctuary from the heavy, heady mist”.",
    imhof: "Visitors surround the action without being drawn in; they stay minutes or hours.",
  },
  {
    key: "reflect", label: "Reflect",
    purpose: "Close the loop: what changed, what to carry into the next project.",
    inputs: "A reflection, and what goes into the archive.",
    needs: (r) => [["Reflection written", has(r.reflect)]],
    fleck: "—",
    imhof: "—",
  },
];

// ── Data ─────────────────────────────────────────────────────────────────────

const emptyRoadmap = () => ({
  question: "", method: "", methodNotes: "",
  boards: [], findings: "",
  spineType: "", spine: "",
  outputs: [], relations: [],
  test: "", present: "", reflect: "",
  skipped: {},
});

export const normaliseRoadmap = (r) => {
  const base = { ...emptyRoadmap(), ...(r || {}) };
  base.boards = Array.isArray(base.boards) ? base.boards : [];
  base.outputs = Array.isArray(base.outputs) ? base.outputs : [];
  base.relations = Array.isArray(base.relations) ? base.relations : [];
  base.skipped = base.skipped && typeof base.skipped === "object" ? base.skipped : {};
  return base;
};

const stageStates = (r) => {
  let reachable = true;
  return STAGES.map((s) => {
    const needs = s.needs(r);
    const complete = needs.every((n) => n[1]);
    const skipped = !complete && !!r.skipped[s.key];
    const state = { key: s.key, needs, complete, skipped, locked: !reachable };
    if (!(complete || skipped)) reachable = false;
    return state;
  });
};

export const roadmapProgress = (roadmap) => {
  if (!roadmap) return { done: 0, skipped: 0, total: STAGES.length, started: false };
  const states = stageStates(normaliseRoadmap(roadmap));
  return {
    done: states.filter((s) => s.complete).length,
    skipped: states.filter((s) => s.skipped).length,
    total: STAGES.length,
    started: true,
  };
};

// ── are.na (v3 public API) ───────────────────────────────────────────────────

const arenaSlug = (url) => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "are.na") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0] === "block") return null;
    return parts[parts.length - 1];
  } catch {
    return null;
  }
};

const pickImg = (im) => {
  if (!im) return "";
  const size = (k) => im[k] && (im[k].src || im[k].url);
  return size("small") || size("medium") || size("square") || size("large")
    || im.src || im.url || (im.thumb && im.thumb.url) || (im.display && im.display.url) || "";
};

const parseBlock = (b) => {
  const c = b.content;
  const text = (c && (c.plain || c.markdown)) || (typeof c === "string" ? c : "");
  return {
    id: b.id,
    type: b.type || b.class || "",
    title: b.title || b.generated_title || "",
    img: pickImg(b.image),
    text: String(text).slice(0, 140),
    href: (b.source && b.source.url) || "",
  };
};

// ── Small pieces ─────────────────────────────────────────────────────────────

const Label = ({ t }) => <p style={{ ...sml, margin: "16px 0 5px" }}>{t}</p>;

function OutputsMap({ spineLabel, outputs, relations }) {
  const named = outputs.filter((o) => has(o.title));
  if (named.length === 0) return null;
  const W = 560, H = 300, cx = W / 2, cy = H / 2, rx = 200, ry = 100;
  const pos = {};
  named.forEach((o, i) => {
    const a = (2 * Math.PI * i) / named.length - Math.PI / 2;
    pos[o.id] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const relLabel = (k) => (RELATIONS.find((x) => x.key === k) || {}).label || "";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block", margin: "14px 0" }}
      role="img" aria-label="Map of outputs, the spine that connects them, and how they relate">
      <defs>
        <marker id="rm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill={LINK_BLUE} />
        </marker>
      </defs>
      {named.map((o) => (
        <line key={"s" + o.id} x1={cx} y1={cy} x2={pos[o.id].x} y2={pos[o.id].y} stroke="#ddd" strokeDasharray="3 3" />
      ))}
      {relations.filter((x) => pos[x.from] && pos[x.to]).map((x) => {
        const a = pos[x.from], b = pos[x.to];
        return (
          <g key={x.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={LINK_BLUE} strokeWidth="1" markerEnd="url(#rm-arrow)" />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" fontSize="9" fill={LINK_BLUE} fontFamily={TNR}>
              {relLabel(x.type)}
            </text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="5" fill="#1a1a1a" />
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fill="#555" fontFamily={TNR}>
        {short(spineLabel || "spine", 30)}
      </text>
      {named.map((o) => {
        const p = pos[o.id];
        return (
          <g key={o.id}>
            <circle cx={p.x} cy={p.y} r="4" fill="#b01904" />
            <text x={p.x} y={p.y + (p.y < cy ? -9 : 16)} textAnchor="middle" fontSize="11" fill="#1a1a1a" fontFamily={TNR}>
              {short(o.title, 26)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProjectRoadmap({ roadmap, artStageLabel, onUpdate }) {
  const r = normaliseRoadmap(roadmap);
  const states = stageStates(r);
  const firstOpen = states.findIndex((s) => !s.complete && !s.skipped && !s.locked);
  const currentIdx = firstOpen === -1 ? states.length - 1 : firstOpen;

  // Opens on the first unfinished stage, then stays where you put it (so a stage
  // does not jump away the moment its last required input is filled). "none" = all closed.
  const [openKey, setOpenKey] = useState(() => STAGES[currentIdx].key);
  const [showRef, setShowRef] = useState(false);
  const [arena, setArena] = useState({});
  const [newBoard, setNewBoard] = useState("");
  const [rel, setRel] = useState({ from: "", type: "contextualises", to: "", note: "" });

  const open = openKey;
  const done = states.filter((s) => s.complete).length;
  const skippedCount = states.filter((s) => s.skipped).length;

  const setField = (k) => (e) => { const v = e.target.value; onUpdate((cur) => ({ ...cur, [k]: v })); };
  const setList = (k, fn) => onUpdate((cur) => ({ ...cur, [k]: fn(cur[k]) }));

  const skipStage = (key, on) => onUpdate((cur) => ({ ...cur, skipped: { ...cur.skipped, [key]: on } }));
  const skipAhead = (key) => {
    onUpdate((cur) => {
      const sk = { ...cur.skipped };
      for (const s of STAGES) {
        if (s.key === key) break;
        if (!s.needs(cur).every((n) => n[1])) sk[s.key] = true;
      }
      return { ...cur, skipped: sk };
    });
    setOpenKey(key);
  };

  // are.na
  const loadBoard = async (b) => {
    const slug = arenaSlug(b.url);
    if (!slug) {
      setArena((a) => ({ ...a, [b.id]: { error: "Not an are.na channel link, so it is kept as a plain link." } }));
      return;
    }
    setArena((a) => ({ ...a, [b.id]: { loading: true } }));
    try {
      const base = `https://api.are.na/v3/channels/${encodeURIComponent(slug)}`;
      const [cRes, kRes] = await Promise.all([fetch(base), fetch(`${base}/contents?per=24`)]);
      if (!kRes.ok) {
        const why = kRes.status === 404 ? "Channel not found. Check the link."
          : kRes.status === 401 || kRes.status === 403 ? "This channel looks private, so are.na will not share its blocks."
          : `are.na returned an error (${kRes.status}).`;
        setArena((a) => ({ ...a, [b.id]: { error: why } }));
        return;
      }
      const kj = await kRes.json();
      const cj = cRes.ok ? await cRes.json() : null;
      const items = Array.isArray(kj.data) ? kj.data : Array.isArray(kj.contents) ? kj.contents : [];
      const blocks = items.map(parseBlock);
      const total = (kj.meta && kj.meta.total_count) || (cj && cj.counts && cj.counts.contents) || items.length;
      const title = (cj && cj.title) || "";
      setArena((a) => ({ ...a, [b.id]: { blocks, total } }));
      setList("boards", (l) => l.map((x) => (x.id === b.id ? { ...x, title: x.title || title, count: total } : x)));
    } catch {
      setArena((a) => ({ ...a, [b.id]: { error: "Could not reach are.na from the browser. The link is still saved." } }));
    }
  };

  const addBoard = () => {
    let url = newBoard.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const b = { id: uid(), url, title: "", note: "", count: null };
    setList("boards", (l) => [...l, b]);
    setNewBoard("");
    loadBoard(b);
  };
  const setBoard = (id, patch) => setList("boards", (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // outputs + relations
  const addOutput = () => setList("outputs", (l) => [...l, { id: uid(), title: "", medium: "", carries: "" }]);
  const setOutput = (id, patch) => setList("outputs", (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeOutput = (id) => onUpdate((cur) => ({
    ...cur,
    outputs: cur.outputs.filter((x) => x.id !== id),
    relations: cur.relations.filter((x) => x.from !== id && x.to !== id),
  }));
  const addRelation = () => {
    if (!rel.from || !rel.to || rel.from === rel.to) return;
    setList("relations", (l) => [...l, { id: uid(), ...rel }]);
    setRel({ from: "", type: "contextualises", to: "", note: "" });
  };

  const named = r.outputs.filter((o) => has(o.title));
  const nameOf = (id) => (r.outputs.find((o) => o.id === id) || {}).title || "—";
  const relLabel = (k) => (RELATIONS.find((x) => x.key === k) || {}).label || k;
  const related = new Set();
  r.relations.forEach((x) => { related.add(x.from); related.add(x.to); });
  const loose = named.length > 1 ? named.filter((o) => !related.has(o.id)) : [];

  // ── stage bodies ──────────────────────────────────────────────────────────
  const body = (key) => {
    switch (key) {
      case "question":
        return (
          <>
            <Label t="What is this project asking?" />
            <textarea style={area} value={r.question} onChange={setField("question")}
              placeholder="Write it as a question, not a theme. e.g. When does the psychic become physical?" />
          </>
        );
      case "method":
        return (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0 6px" }}>
              {METHODS.map((m) => (
                <span key={m.key} style={box(r.method === m.key)} onClick={() => onUpdate((cur) => ({ ...cur, method: m.key }))}>{m.label}</span>
              ))}
            </div>
            <p style={tiny}>{(METHODS.find((m) => m.key === r.method) || {}).sub || "Pick the way you will actually gather material."}</p>
            <Label t="Position and access" />
            <textarea style={area} value={r.methodNotes} onChange={setField("methodNotes")}
              placeholder="How do you enter this? Under your own name or an alias? Who knows? Consent, ethics, how long?" />
          </>
        );
      case "research":
        return (
          <>
            <Label t="Research boards" />
            {r.boards.length === 0 && <p style={tiny}>Paste an are.na channel link below. Public channels load their blocks here.</p>}
            {r.boards.map((b) => {
              const a = arena[b.id] || {};
              return (
                <div key={b.id} style={{ margin: "10px 0 14px", paddingBottom: "10px", borderBottom: "1px solid #f5f5f5" }}>
                  <div style={{ display: "flex", gap: "14px", alignItems: "baseline" }}>
                    <input style={inp} value={b.title} placeholder="Board name" onChange={(e) => setBoard(b.id, { title: e.target.value })} />
                    <a href={b.url} target="_blank" rel="noreferrer" style={{ ...linkStyle, fontSize: "12px", whiteSpace: "nowrap" }}>open</a>
                    <span style={{ ...linkStyle, fontSize: "12px", whiteSpace: "nowrap" }} onClick={() => loadBoard(b)}>
                      {a.loading ? "loading…" : a.blocks ? "refresh" : "load blocks"}
                    </span>
                    <span style={quietLink} onClick={() => setList("boards", (l) => l.filter((x) => x.id !== b.id))}>remove</span>
                  </div>
                  <input style={inp} value={b.note} placeholder="What is this board for? e.g. field notes, references, material tests"
                    onChange={(e) => setBoard(b.id, { note: e.target.value })} />
                  {b.count != null && !a.blocks && <p style={{ ...tiny, marginTop: "4px" }}>{b.count} blocks</p>}
                  {a.error && <p style={{ ...tiny, color: "#b01904", marginTop: "4px" }}>{a.error}</p>}
                  {a.blocks && (
                    <>
                      <p style={{ ...tiny, margin: "6px 0" }}>{a.total} blocks · showing {a.blocks.length}</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: "6px" }}>
                        {a.blocks.map((blk) => {
                          const tile = blk.img
                            ? <img src={blk.img} alt={blk.title || "are.na block"} style={{ width: "100%", height: "84px", objectFit: "cover", display: "block", background: "#f5f5f5" }} />
                            : <div style={{ height: "84px", background: "#f8f8f8", padding: "5px", overflow: "hidden", fontFamily: TNR, fontSize: "10px", lineHeight: 1.3, color: "#777", boxSizing: "border-box" }}>{blk.text || blk.title || blk.type}</div>;
                          return blk.href
                            ? <a key={blk.id} href={blk.href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{tile}</a>
                            : <div key={blk.id}>{tile}</div>;
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "14px", alignItems: "baseline" }}>
              <input style={inp} value={newBoard} placeholder="https://www.are.na/your-name/channel-name"
                onChange={(e) => setNewBoard(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addBoard(); }} />
              <span style={{ ...linkStyle, fontSize: "13px", whiteSpace: "nowrap" }} onClick={addBoard}>+ add board</span>
            </div>
            <Label t="What did the research show?" />
            <textarea style={area} value={r.findings} onChange={setField("findings")}
              placeholder="Patterns, vocabulary, behaviours, contradictions. What do you now know that you did not at the start?" />
          </>
        );
      case "spine":
        return (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0 6px" }}>
              {SPINES.map((s) => (
                <span key={s.key} style={box(r.spineType === s.key)} onClick={() => onUpdate((cur) => ({ ...cur, spineType: s.key }))}>{s.label}</span>
              ))}
            </div>
            <p style={tiny}>{(SPINES.find((s) => s.key === r.spineType) || {}).sub || "What will every output have in common?"}</p>
            <Label t="Describe it" />
            <textarea style={area} value={r.spine} onChange={setField("spine")}
              placeholder="Who or what is it, and how does it carry the research into each output?" />
          </>
        );
      case "outputs":
        return (
          <>
            {r.outputs.length === 0 && <p style={{ ...tiny, marginTop: "10px" }}>Each output is a branch. Add the first work this research could become.</p>}
            {r.outputs.map((o, i) => (
              <div key={o.id} style={{ borderLeft: "1px solid #ddd", paddingLeft: "14px", margin: "14px 0 0 6px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                  <span style={{ ...tiny, width: "16px" }}>{i + 1}</span>
                  <input style={inp} value={o.title} placeholder="Output title" onChange={(e) => setOutput(o.id, { title: e.target.value })} />
                  <span style={quietLink} onClick={() => removeOutput(o.id)}>remove</span>
                </div>
                <input style={inp} value={o.medium} placeholder="Medium: installation, audio, text, portrait series, performance…"
                  onChange={(e) => setOutput(o.id, { medium: e.target.value })} />
                <textarea style={{ ...area, marginTop: "6px", minHeight: "48px" }} value={o.carries}
                  placeholder="What does it carry from the research? A quote, a material, a behaviour you observed."
                  onChange={(e) => setOutput(o.id, { carries: e.target.value })} />
              </div>
            ))}
            <p style={{ marginTop: "12px" }}><span style={{ ...linkStyle, fontSize: "13px" }} onClick={addOutput}>+ add output</span></p>

            {named.length > 1 && (
              <>
                <Label t="How the outputs relate" />
                {r.relations.map((x) => (
                  <p key={x.id} style={{ fontFamily: TNR, fontSize: "13px", margin: "4px 0", color: "#1a1a1a" }}>
                    {nameOf(x.from)} <span style={{ color: LINK_BLUE }}>{relLabel(x.type)}</span> {nameOf(x.to)}
                    {x.note ? <span style={{ color: "#888" }}> — {x.note}</span> : null}{" "}
                    <span style={quietLink} onClick={() => setList("relations", (l) => l.filter((y) => y.id !== x.id))}>remove</span>
                  </p>
                ))}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "baseline", marginTop: "8px" }}>
                  <select style={{ ...inp, width: "auto", maxWidth: "160px" }} value={rel.from} onChange={(e) => setRel({ ...rel, from: e.target.value })}>
                    <option value="">output…</option>
                    {named.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                  <select style={{ ...inp, width: "auto" }} value={rel.type} onChange={(e) => setRel({ ...rel, type: e.target.value })}>
                    {RELATIONS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  <select style={{ ...inp, width: "auto", maxWidth: "160px" }} value={rel.to} onChange={(e) => setRel({ ...rel, to: e.target.value })}>
                    <option value="">output…</option>
                    {named.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                  <input style={{ ...inp, width: "160px" }} value={rel.note} placeholder="why (optional)" onChange={(e) => setRel({ ...rel, note: e.target.value })} />
                  <span style={{ ...linkStyle, fontSize: "13px" }} onClick={addRelation}>+ relate</span>
                </div>
                {loose.length > 0 && (
                  <p style={{ ...tiny, marginTop: "8px", color: "#c47100" }}>Not yet related to anything: {loose.map((o) => o.title).join(", ")}</p>
                )}
              </>
            )}
            <OutputsMap spineLabel={(SPINES.find((s) => s.key === r.spineType) || {}).label} outputs={r.outputs} relations={r.relations} />
          </>
        );
      case "test":
        return (
          <>
            <Label t="What did you test?" />
            <textarea style={area} value={r.test} onChange={setField("test")}
              placeholder="The riskiest part first: a material, a dose, a space, a viewer, a collaborator. What happened, and what changes?" />
          </>
        );
      case "present":
        return (
          <>
            <p style={{ ...tiny, margin: "10px 0 0" }}>Production stage (set in the fields above): <strong>{artStageLabel}</strong>. Funding, budget, install and press are tracked there.</p>
            <Label t="How are the outputs met together?" />
            <textarea style={area} value={r.present} onChange={setField("present")}
              placeholder="Venue or format, the order a visitor meets the works, what needs to be in the room at once." />
          </>
        );
      case "reflect":
        return (
          <>
            <Label t="What changed?" />
            <textarea style={area} value={r.reflect} onChange={setField("reflect")}
              placeholder="How did the question move? What would you do differently? Which outputs and boards belong in the archive?" />
          </>
        );
      default:
        return null;
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  const marker = (st, i) => {
    if (st.complete) return { ch: "●", color: "#0fa97f" };
    if (st.skipped) return { ch: "◐", color: "#c47100" };
    if (st.locked) return { ch: "·", color: "#ccc" };
    return { ch: "○", color: i === currentIdx ? LINK_BLUE : "#888" };
  };

  return (
    <div style={{ marginTop: "26px", paddingTop: "18px", borderTop: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
        <span style={sml}>Roadmap</span>
        <span style={tiny}>
          {done} of {STAGES.length} complete{skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}{" "}
          <span style={quietLink} onClick={() => setShowRef(!showRef)}>{showRef ? "hide full process" : "full process"}</span>
        </span>
      </div>

      {/* map strip — always visible */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", margin: "12px 0 6px" }}>
        {STAGES.map((s, i) => {
          const st = states[i];
          const m = marker(st, i);
          return (
            <span key={s.key} onClick={() => { if (!st.locked) setOpenKey(s.key); }}
              style={{ fontFamily: TNR, fontSize: "13px", color: st.locked ? "#ccc" : "#1a1a1a", cursor: st.locked ? "default" : "pointer",
                textDecoration: open === s.key && !st.locked ? "underline" : "none", textUnderlineOffset: "3px" }}>
              <span style={{ color: m.color }}>{m.ch}</span> {i + 1} {s.label}
            </span>
          );
        })}
      </div>
      <p style={{ ...tiny, fontSize: "11px", color: "#bbb" }}>● complete · ○ open · ◐ skipped, still flagged · · locked until the stage before is complete or skipped</p>

      {showRef && (
        <div style={{ margin: "14px 0 6px", padding: "12px 0", borderTop: "1px solid #f5f5f5", borderBottom: "1px solid #f5f5f5" }}>
          <p style={{ ...tiny, marginBottom: "10px" }}>
            The whole process, with how two artists ran it. Ella Fleck, Spray (i-D). Anne Imhof, Faust (Artsy, Goethe-Institut). The two methods differ: Fleck works from fieldwork out to material; Imhof from the studio out to one image.
          </p>
          {STAGES.map((s, i) => (
            <div key={s.key} style={{ marginBottom: "12px" }}>
              <p style={{ fontFamily: TNR, fontSize: "13px", margin: 0 }}><span style={{ color: "#888" }}>{i + 1}.</span> <strong>{s.label}</strong> — <span style={{ color: "#555" }}>{s.purpose}</span></p>
              <p style={tiny}>Needs: {s.inputs}</p>
              {s.fleck !== "—" && <p style={{ ...tiny, fontStyle: "italic" }}>Fleck: {s.fleck}</p>}
              {s.imhof !== "—" && <p style={{ ...tiny, fontStyle: "italic" }}>Imhof: {s.imhof}</p>}
            </div>
          ))}
        </div>
      )}

      {/* the tree */}
      <div style={{ marginTop: "14px" }}>
        {STAGES.map((s, i) => {
          const st = states[i];
          const m = marker(st, i);
          const isOpen = open === s.key && !st.locked;
          const next = STAGES[i + 1];
          const prevLabel = i > 0 ? STAGES[i - 1].label : "";
          return (
            <div key={s.key} style={{ borderLeft: `1px solid ${st.locked ? "#f0f0f0" : "#ddd"}`, marginLeft: "6px", paddingLeft: "16px", paddingBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", cursor: st.locked ? "default" : "pointer" }}
                onClick={() => { if (!st.locked) setOpenKey(open === s.key ? "none" : s.key); }}>
                <span style={{ color: m.color, fontFamily: TNR, fontSize: "14px", marginLeft: "-23px", background: "#fff", width: "14px", textAlign: "center" }}>{m.ch}</span>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: st.locked ? "#ccc" : "#1a1a1a" }}>{i + 1}. {s.label}</span>
                {st.skipped && <span style={{ fontFamily: TNR, fontSize: "12px", color: "#c47100" }}>skipped</span>}
                {st.locked && (
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: "#ccc" }}>
                    locked, finish {prevLabel} or{" "}
                    <span style={{ ...quietLink, color: "#aaa" }} onClick={(e) => { e.stopPropagation(); skipAhead(s.key); }}>skip ahead</span>
                  </span>
                )}
              </div>

              {isOpen && (
                <div style={{ padding: "4px 0 12px" }}>
                  <p style={{ ...tiny, marginTop: "4px" }}>{s.purpose}</p>
                  {body(s.key)}

                  <div style={{ marginTop: "16px" }}>
                    {st.needs.map((n) => (
                      <p key={n[0]} style={{ ...tiny, color: n[1] ? "#0fa97f" : "#888" }}>{n[1] ? "✓" : "○"} {n[0]}</p>
                    ))}
                    <p style={{ ...tiny, marginTop: "8px" }}>
                      {st.complete && next && <span style={{ ...linkStyle, fontSize: "13px", marginRight: "16px" }} onClick={() => setOpenKey(next.key)}>Next: {next.label} →</span>}
                      {!st.complete && next && !st.skipped && <span style={quietLink} onClick={() => { skipStage(s.key, true); setOpenKey(next.key); }}>skip for now</span>}
                      {!st.complete && st.skipped && <span style={quietLink} onClick={() => skipStage(s.key, false)}>un-skip</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

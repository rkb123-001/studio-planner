import { useState, useEffect } from "react";

const TNR = "'Times New Roman', Times, serif";
const LINK_BLUE = "#1a0dab";

// Executive functioning intensity: how much executive function each task requires
// Growth = most, Comms = next, Systems = next, Making = least
// Visualised as hyperlink blue at varying opacity
const EXEC_INTENSITY = {
  growth:  { intensity: 4, opacity: 1.0,  desc: "high executive demand" },   // #1a0dab at 100%
  comms:   { intensity: 3, opacity: 0.75, desc: "medium-high executive demand" }, // #1a0dab at 75%
  systems: { intensity: 2, opacity: 0.5,  desc: "medium executive demand" },  // #1a0dab at 50%
  making:  { intensity: 1, opacity: 0.25, desc: "low executive demand" },     // #1a0dab at 25%
};

// ── Constants ─────────────────────────────────────────────────────────────────

// Energy costs: 1=low, 2=medium, 3=high. Rest is negative (recovery).
const MODES = {
  making:  { label: "Making",        sub: "casting, wax work, fabrication",     exportable: true,  energyCost: 3, friction: "medium", sensory: "medium" },
  comms:   { label: "Comms & Admin", sub: "emails, invoices, order tracking",    exportable: true,  energyCost: 3, friction: "high",   sensory: "medium" },
  growth:  { label: "Growth",        sub: "content, outreach, press, site",      exportable: true,  energyCost: 3, friction: "high",   sensory: "high"   },
  systems: { label: "Systems",       sub: "workflows, pricing, proposals",       exportable: true,  energyCost: 2, friction: "medium", sensory: "low"    },
  rest:    { label: "Rest",          sub: "passive / sensory reset / gentle",    exportable: false, energyCost: -2, friction: "low",   sensory: "low"    },
  social:  { label: "Social",        sub: "friends, events, time out",           exportable: false, energyCost: 3, friction: "low",   sensory: "high"   },
  health:  { label: "Health",        sub: "gym, appointments, movement",         exportable: false, energyCost: 2, friction: "low",   sensory: "medium" },
  office:  { label: "Office Work",   sub: "morning / mid / late shift",          exportable: false, energyCost: 3, friction: "medium", sensory: "medium" },
};

// Rest subtypes — all count as valid rest in capacity scoring
const REST_TYPES = {
  passive:  { label: "Passive rest",        sub: "full rest, no input" },
  sensory:  { label: "Sensory reset",       sub: "quiet, dark, minimal stimulation" },
  gentle:   { label: "Gentle regulation",   sub: "walk, stretch, slow movement" },
};

// Work modes use hyperlink blue at exec-intensity opacity (matches grid)
// Non-work modes have their own colors
const MODE_COLORS = {
  making:  "rgba(26, 13, 171, 0.25)",  // low exec demand — light blue
  comms:   "rgba(26, 13, 171, 0.75)",  // medium-high exec demand
  growth:  "rgba(26, 13, 171, 1.0)",   // high exec demand — full blue
  systems: "rgba(26, 13, 171, 0.5)",   // medium exec demand
  rest:    "#888888",                   // muted grey
  social:  "#F72798",                   // hot magenta/pink
  health:  "#00a8ff",                   // cyan
  office:  "#aaaaaa",                   // muted grey
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// 2-hour slots, 7am–9pm
const TIME_SLOTS = [
  "7–9am", "9–11am", "11am–1pm",
  "1–3pm", "3–5pm", "5–7pm", "7–9pm",
];
const SLOT_START = {
  "7–9am": 7, "9–11am": 9, "11am–1pm": 11,
  "1–3pm": 13, "3–5pm": 15, "5–7pm": 17, "7–9pm": 19,
};

const HEALTH_TARGETS = [
  { key: "psychoanalysis", label: "Psychoanalysis" },
  { key: "acupuncture",    label: "Acupuncture" },
  { key: "gym",            label: "Gym" },
];

const CHECKLIST = [
  "Client comms up to date",
  "Orders progressed",
  "1 visibility action",
  "1 systems improvement",
];

// Weekly success metrics (beyond output)
const SUCCESS_METRICS = [
  { key: "capacity",  label: "Stayed within capacity" },
  { key: "noOverload",label: "Avoided overload" },
  { key: "meaningful",label: "Completed at least one meaningful task" },
  { key: "fineArt",   label: "Progressed a fine art project" },
];

// Energy levels for stuck state and daily energy budget
const ENERGY_LEVELS = [
  { key: "high",   label: "High",   sub: "clear, motivated, present",       budget: 7 },
  { key: "medium", label: "Medium", sub: "functional, steady",              budget: 5 },
  { key: "low",    label: "Low",    sub: "depleted, wired-tired, foggy",    budget: 3 },
];

// Runway: max 3 extremely concrete actions per state
const RUNWAY_MAP = {
  high: {
    note: "You have the energy for deep studio work. Go straight in.",
    runwayNeeded: false,
    actions: [
      "Lay out your tools or materials now, before you sit down.",
      "Set a timer for 90 mins. Close email.",
      "Start with the physical action, not a decision.",
    ],
  },
  medium: {
    note: "Start with 10 mins of support work, then move to one hard task.",
    runwayNeeded: true,
    runway: "Clear one surface or open one file. That's it.",
    actions: [
      "Open email and reply to 1 message only.",
      "Write the next physical action for your current project.",
      "Tidy one area of your workspace.",
    ],
    expose: { label: "One exposure action (max 45 mins, 2 tasks)", examples: [
      "Send 2 client replies, then stop.",
      "Log 1 finance category, then close the tab.",
      "Post 1 piece of content, then put the phone down.",
    ]},
  },
  low: {
    note: "Runway only. No cold-starts. One tiny action, then stop or rest.",
    runwayNeeded: true,
    runway: "Do the single easiest thing available to you right now.",
    actions: [
      "Open 1 email. Reply or archive. Close.",
      "Move 1 thing to where it belongs.",
      "Write 1 sentence about what is blocking you.",
    ],
    expose: { label: "One action only (max 20 mins)", examples: [
      "Reply to 1 message.",
      "Pay 1 bill.",
      "File 1 document.",
    ]},
  },
};

// Transition buffer triggers: [from, to] pairs that warrant a buffer suggestion
const BUFFER_TRIGGERS = [
  ["making",  "making"],   // high → high
  ["social",  "making"],
  ["office",  "making"],
  ["growth",  "making"],
  ["comms",   "making"],
];

const Q_CATEGORIES = [
  "Studio production",
  "Client / commissions",
  "Finance / systems",
  "Health / regulation",
  "Practice development",
  "Opportunities / applications",
  "Personal / life admin",
];

const Q_STATUSES = [
  { key: "on-track",    label: "On track",    color: "#7a9e96" },
  { key: "at-risk",     label: "At risk",     color: "#e8c070" },
  { key: "behind",      label: "Behind",      color: "#b01904" },
  { key: "done",        label: "Done",        color: "#a8b87a" },
  { key: "not-started", label: "Not started", color: "#cccccc" },
];

const Q_HORIZONS = [
  { key: "now",   label: "Now",   sub: "actively working on" },
  { key: "next",  label: "Next",  sub: "ready, not yet started" },
  { key: "later", label: "Later", sub: "held without pressure" },
];

const CONFIDENCE = [
  { key: "high",   label: "Confident" },
  { key: "medium", label: "Uncertain" },
  { key: "low",    label: "At risk"   },
];

const emptyProject = () => ({
  id: Date.now() + Math.random(),
  title: "",
  nextAction: "",   // required: next physical action
  category: Q_CATEGORIES[0],
  status: "not-started",
  horizon: "now",
  progress: 0,
  confidence: "medium",
  dueMonth: "",
  nextMilestone: "",
  notes: "",
  isFineArt: false,
  isProtectedFineArt: false,
});

// ── Styles ────────────────────────────────────────────────────────────────────

// Note: pill function was removed - using boxBtn instead

// Boxed button in Eilidh Duffy style — thin black rectangular border, no pill
const boxBtn = (active) => ({
  display: "inline-block",
  padding: "6px 18px",
  border: `1px solid ${active ? LINK_BLUE : "#1a1a1a"}`,
  background: "#fff",
  color: active ? LINK_BLUE : "#1a1a1a",
  fontFamily: TNR, fontSize: "14px",
  cursor: "pointer", userSelect: "none",
  transition: "all 0.12s", whiteSpace: "nowrap",
});

// Clickable link text — hyperlink blue, underlined
const linkStyle = {
  color: LINK_BLUE,
  textDecoration: "underline",
  textDecorationColor: LINK_BLUE,
  textUnderlineOffset: "2px",
  cursor: "pointer",
  fontFamily: TNR,
};

const sml = { fontFamily: TNR, fontSize: "11px", letterSpacing: "0.08em", color: "#bbb", textTransform: "uppercase" };

const inp = {
  fontFamily: TNR, fontSize: "14px", color: "#1a1a1a",
  border: "none", borderBottom: "1px solid #eee", outline: "none",
  background: "transparent", padding: "4px 0", width: "100%",
};

// ── Storage ───────────────────────────────────────────────────────────────────

const LS_KEY = "studio-planner-v1";

// Supabase config
const SUPABASE_URL = "https://glfrnjconpelpeejvndz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnJuamNvbnBlbHBlZWp2bmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNzUyMDUsImV4cCI6MjA5Mjg1MTIwNX0.IVWq3GLdIiLOF9u24EdurqWgytPg7h1cNk9V5a1JpY4";
const USE_SUPABASE = SUPABASE_URL && SUPABASE_KEY;

// Auth + profile keys
const AUTH_TOKEN_KEY = "studio-planner-auth-token";
const AUTH_EMAIL_KEY = "studio-planner-auth-email";
const AUTH_USER_ID_KEY = "studio-planner-auth-user-id";
const PROFILE_KEY = "studio-planner-profile";

// Get current user ID (mutable — updated on login/logout)
let USER_ID = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_ID_KEY) || ("user-" + Date.now()) : "user-default";

if (typeof window !== "undefined" && !localStorage.getItem(AUTH_USER_ID_KEY)) {
  localStorage.setItem(AUTH_USER_ID_KEY, USER_ID);
}

// Default profile structure
const DEFAULT_PROFILE = {
  name: "",
  role: "",
  plannerTitle: "Practice Planner",
  scheduleAround: "",
  modeIntensity: {
    growth: 4,
    comms: 3,
    systems: 2,
    making: 1,
  },
  restRatio: 1.0,
  // Mode labels — what user wants to call each work type
  modeLabels: {
    making: "Making",
    comms: "Comms & Admin",
    growth: "Growth",
    systems: "Systems",
  },
  // Mode descriptions — what each type of work involves for the user (editable defaults)
  modeDescriptions: {
    making: "casting, wax work, fabrication",
    comms: "emails, invoices, order tracking",
    growth: "content, outreach, press",
    systems: "workflows, pricing, organising",
  },
  // Weekly targets — minimum blocks of each type per week
  weeklyTargets: {
    making: 2,
    comms: 2,
    growth: 1,
    systems: 1,
  },
  // Fine art / protected practice — customisable terminology (editable defaults)
  protectedPractice: {
    enabled: true,
    label: "Fine art practice",
    warningText: "No making blocks this week. At least one should go to fine art practice, not commissions.",
  },
  // Health goals — fully customisable list
  healthGoals: ["Psychoanalysis", "Acupuncture", "Gym"],
  // Social target
  socialGoal: "1 meaningful connection this week",
  // Week evaluation metrics
  weekEvaluation: [
    "Stayed within capacity",
    "Avoided overload",
    "Completed at least one meaningful task",
    "Progressed a fine art project",
  ],
  // Weekly checklist
  weeklyChecklist: [
    "Client comms up to date",
    "Orders progressed",
    "1 visibility action",
    "1 systems improvement",
  ],
};

const loadProfile = () => {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const p = localStorage.getItem(PROFILE_KEY);
    return p ? { ...DEFAULT_PROFILE, ...JSON.parse(p) } : DEFAULT_PROFILE;
  } catch { return DEFAULT_PROFILE; }
};

const saveProfile = (profile) => {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
};

// Auth helpers
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const generateSessionToken = () => 'token-' + Math.random().toString(36).substr(2, 20) + Date.now();

const registerUser = async (email, password, profile) => {
  if (!USE_SUPABASE) return { error: "Supabase not configured" };
  try {
    const passwordHash = await hashPassword(password);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/auth_users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ email, password_hash: passwordHash }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      return { error: err.includes("duplicate") ? "Email already registered" : "Registration failed" };
    }
    const users = await resp.json();
    const user = users[0];
    
    const token = generateSessionToken();
    await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ user_id: user.id, device_token: token }),
    });
    
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EMAIL_KEY, email);
    localStorage.setItem(AUTH_USER_ID_KEY, user.id);
    saveProfile(profile);
    USER_ID = user.id;
    
    return { user, token, profile };
  } catch (e) {
    return { error: e.message };
  }
};

const loginUser = async (email, password) => {
  if (!USE_SUPABASE) return { error: "Supabase not configured" };
  try {
    const passwordHash = await hashPassword(password);
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/auth_users?email=eq.${encodeURIComponent(email)}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    const users = await resp.json();
    if (!users || users.length === 0) return { error: "User not found" };
    
    const user = users[0];
    if (user.password_hash !== passwordHash) return { error: "Wrong password" };
    
    const token = generateSessionToken();
    await fetch(`${SUPABASE_URL}/rest/v1/user_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ user_id: user.id, device_token: token }),
    });
    
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EMAIL_KEY, email);
    localStorage.setItem(AUTH_USER_ID_KEY, user.id);
    USER_ID = user.id;
    
    return { user, token };
  } catch (e) {
    return { error: e.message };
  }
};

const resetPassword = async (email, newPassword) => {
  if (!USE_SUPABASE) return { error: "Supabase not configured" };
  try {
    // First check if the user exists
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/auth_users?email=eq.${encodeURIComponent(email)}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    const users = await resp.json();
    if (!users || users.length === 0) return { error: "No account found with that email" };
    
    // Update the password hash
    const newHash = await hashPassword(newPassword);
    const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/auth_users?email=eq.${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ password_hash: newHash }),
    });
    
    if (!updateResp.ok) {
      return { error: "Could not reset password. Please try again." };
    }
    
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
};

const verifySession = async (token) => {
  if (!USE_SUPABASE || !token) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/user_sessions?device_token=eq.${token}`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
    });
    const sessions = await resp.json();
    return sessions && sessions.length > 0;
  } catch (e) {
    return false;
  }
};

const logoutUser = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
};

const getWeekStart = () => {
  const now = new Date(), monday = new Date(now);
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0) {
    // Sunday: check the user's choice for today.
    // "this" = treat Sunday as end of past week (go back to previous Mon)
    // "next" = treat Sunday as planning day for upcoming week (go forward to tomorrow's Mon)
    let choice = "this"; // safe default — Sunday IS technically the end of this week
    try {
      const stored = JSON.parse(localStorage.getItem("studio-planner-sunday-choice") || "null");
      const today = now.toISOString().split("T")[0];
      if (stored && stored.date === today && stored.choice) choice = stored.choice;
    } catch (_) {}
    if (choice === "next") {
      monday.setDate(now.getDate() + 1);
    } else {
      monday.setDate(now.getDate() - 6);
    }
  } else {
    monday.setDate(now.getDate() - (dayOfWeek - 1));
  }
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
};

// Local storage — always backup
const saveLocal = (d) => { 
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} 
};

const loadLocal = () => { 
  try { const d = localStorage.getItem(LS_KEY); return d ? JSON.parse(d) : null; } catch { return null; } 
};

// Supabase cloud sync
// Safety check: detect if a save would replace existing rich data with empty data.
// This is the LAST LINE OF DEFENCE against data loss races.
const isEffectivelyEmpty = (d) => {
  if (!d) return true;
  const scheduleEmpty = !d.schedule || Object.values(d.schedule).every(day => 
    !day || Object.values(day).every(slot => !slot)
  );
  const noProjects = !d.projects || d.projects.length === 0;
  const noArchive = !d.archive || d.archive.length === 0;
  const noProfile = !d.profile || (!d.profile.name?.trim() && !d.profile.role?.trim());
  return scheduleEmpty && noProjects && noArchive && noProfile;
};

const saveToSupabase = async (d) => {
  if (!USE_SUPABASE) return;
  try {
    const weekStart = getWeekStart();
    
    // SAFETY GUARD: Before saving, check if existing cloud data is richer than what we're about to save.
    // If so, BLOCK the save — this prevents wiping good data.
    if (isEffectivelyEmpty(d)) {
      const checkResp = await fetch(
        `${SUPABASE_URL}/rest/v1/planner_data?user_id=eq.${USER_ID}&week_start=eq.${weekStart}`,
        {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const existing = await checkResp.json();
      if (existing && existing[0]) {
        const existingData = {
          schedule: existing[0].schedule,
          projects: existing[0].projects,
          archive: existing[0].archive,
          profile: existing[0].profile,
        };
        if (!isEffectivelyEmpty(existingData)) {
          console.warn("[saveToSupabase] BLOCKED destructive write: incoming data is empty but cloud data is rich. Refusing to overwrite.");
          return;
        }
      }
    }
    
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/planner_data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        user_id: USER_ID,
        week_start: weekStart,
        schedule: d.schedule,
        checklist: d.checklist,
        success_metrics: d.successMetrics,
        health_targets: d.healthTargets,
        rest_targets: d.restTargets,
        social_done: d.socialDone,
        week_note: d.weekNote,
        projects: d.projects,
        archive: d.archive,
        day_energy_levels: d.dayEnergyLevels,
        profile: d.profile,
      }),
    });
    if (!resp.ok) {
      // If it's a duplicate, try UPDATE instead
      if (resp.status === 409) {
        await fetch(`${SUPABASE_URL}/rest/v1/planner_data?user_id=eq.${USER_ID}&week_start=eq.${weekStart}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            schedule: d.schedule,
            checklist: d.checklist,
            success_metrics: d.successMetrics,
            health_targets: d.healthTargets,
            rest_targets: d.restTargets,
            social_done: d.socialDone,
            week_note: d.weekNote,
            projects: d.projects,
            archive: d.archive,
            day_energy_levels: d.dayEnergyLevels,
            profile: d.profile,
          }),
        });
      }
    }
  } catch (e) {
    console.log("Supabase sync error (data still saved locally):", e);
  }
};

const loadFromSupabase = async () => {
  if (!USE_SUPABASE) return null;
  try {
    const weekStart = getWeekStart();
    // First try this week's data
    let resp = await fetch(
      `${SUPABASE_URL}/rest/v1/planner_data?user_id=eq.${USER_ID}&week_start=eq.${weekStart}`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    let data = await resp.json();
    
    // If no data for this week, try to get profile from any previous week
    let profileFallback = null;
    if (!data || !data[0] || !data[0].profile) {
      const allResp = await fetch(
        `${SUPABASE_URL}/rest/v1/planner_data?user_id=eq.${USER_ID}&order=week_start.desc&limit=1`,
        {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const allData = await allResp.json();
      if (allData && allData[0] && allData[0].profile) {
        profileFallback = allData[0].profile;
      }
    }
    
    if (data && data[0]) {
      return {
        schedule: data[0].schedule,
        checklist: data[0].checklist,
        successMetrics: data[0].success_metrics,
        healthTargets: data[0].health_targets,
        restTargets: data[0].rest_targets,
        socialDone: data[0].social_done,
        weekNote: data[0].week_note,
        projects: data[0].projects,
        archive: data[0].archive,
        dayEnergyLevels: data[0].day_energy_levels,
        profile: data[0].profile || profileFallback,
      };
    } else if (profileFallback) {
      // Return just profile if no week data exists
      return { profile: profileFallback };
    }
  } catch (e) {
    console.log("Supabase load error (using local):", e);
  }
  return null;
};

const defaultSchedule = () => {
  const s = {};
  DAYS.forEach(d => { s[d] = {}; TIME_SLOTS.forEach(t => { s[d][t] = null; }); });
  return s;
};

// ── Auth Screen ─────────────────────────────────────────────────────────────

function AuthScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "profile" | "targets" | "guide" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess(loadProfile());
    }
  };

  const handleSignupContinue = () => {
    setError("");
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!consentGiven) {
      setError("Please consent to data usage to continue");
      return;
    }
    setMode("profile");
  };

  const handleProfileStep1 = () => {
    setError("");
    
    // Validate step 1 fields
    if (!profile.name?.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!profile.role?.trim()) {
      setError("Please enter your role");
      return;
    }
    if (!profile.scheduleAround?.trim()) {
      setError("Please enter what you schedule around");
      return;
    }
    if (!profile.modeDescriptions?.making?.trim()) {
      setError("Please describe what 'Making' involves for you");
      return;
    }
    if (!profile.modeDescriptions?.comms?.trim()) {
      setError("Please describe what 'Comms & Admin' involves for you");
      return;
    }
    if (!profile.modeDescriptions?.growth?.trim()) {
      setError("Please describe what 'Growth' involves for you");
      return;
    }
    if (!profile.modeDescriptions?.systems?.trim()) {
      setError("Please describe what 'Systems' involves for you");
      return;
    }
    if (!profile.protectedPractice?.label?.trim()) {
      setError("Please name your protected practice");
      return;
    }
    if (!profile.protectedPractice?.warningText?.trim()) {
      setError("Please write a warning message for your protected practice");
      return;
    }
    
    setMode("targets");
  };

  const handleProfileStep2 = () => {
    setError("");
    
    // Validate step 2 fields
    if (!profile.healthGoals || profile.healthGoals.length === 0) {
      setError("Please add at least one health goal");
      return;
    }
    if (!profile.socialGoal?.trim()) {
      setError("Please set your social goal");
      return;
    }
    if (!profile.weekEvaluation || profile.weekEvaluation.length === 0) {
      setError("Please add at least one week evaluation criterion");
      return;
    }
    if (!profile.weeklyChecklist || profile.weeklyChecklist.length === 0) {
      setError("Please add at least one checklist item");
      return;
    }
    
    setMode("guide");
  };

  const handleSignupComplete = async () => {
    setError(""); setLoading(true);
    const result = await registerUser(email, password, profile);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setMode("signup");
    } else {
      onSuccess(profile);
    }
  };

  const handleResetPassword = async () => {
    setError(""); setResetSuccess(false);
    if (!email?.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await resetPassword(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setResetSuccess(true);
      setPassword("");
    }
  };

  const inputAuth = {
    fontFamily: TNR, fontSize: "15px", color: "#1a1a1a",
    border: "1px solid #1a1a1a", padding: "10px 12px",
    width: "100%", outline: "none", boxSizing: "border-box",
    background: "#fff", marginBottom: "12px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#1a1a1a", fontFamily: TNR, padding: "80px 32px", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p style={{ ...sml, marginBottom: "20px" }}>Practice Planner</p>
          <div style={{ fontSize: "16px", lineHeight: "2", color: "#1a1a1a" }}>
            {mode === "login" && <><div>Sign in to access</div><div>your planner.</div></>}
            {mode === "signup" && <><div>Create your account.</div></>}
            {mode === "forgot" && <><div>Reset your password.</div></>}
            {mode === "profile" && <><div>Tell us about yourself.</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Step 1 of 3</div></>}
            {mode === "targets" && <><div>Set your targets.</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Step 2 of 3</div></>}
            {mode === "guide" && <><div>How it works.</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Step 3 of 3</div></>}
          </div>
        </div>

        {(mode === "login" || mode === "signup") && (
          <>
            <p style={{ ...sml, marginBottom: "8px" }}>Email</p>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={inputAuth} 
              placeholder="you@email.com"
              autoComplete={mode === "login" ? "email" : "username"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            
            <p style={{ ...sml, marginBottom: "8px", marginTop: "8px" }}>Password</p>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={inputAuth} 
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            
            {mode === "signup" && (
              <div style={{ marginTop: "12px", marginBottom: "8px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                <input 
                  type="checkbox" 
                  checked={consentGiven} 
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{ marginTop: "4px", cursor: "pointer", flexShrink: 0 }}
                  id="consent-checkbox"
                />
                <label htmlFor="consent-checkbox" style={{ fontFamily: TNR, fontSize: "12px", color: "#555", lineHeight: "1.5", cursor: "pointer" }}>
                  I consent to my data being stored to provide this service. My planner data is saved securely and used only to sync my account across my devices. I can delete my account at any time.
                </label>
              </div>
            )}
            
            {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "8px", marginBottom: "16px" }}>{error}</p>}
            
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <span onClick={!loading ? (mode === "login" ? handleLogin : handleSignupContinue) : undefined}
                style={{ ...boxBtn(true), padding: "10px 32px", fontSize: "15px", display: "inline-block" }}>
                {loading ? "..." : mode === "login" ? "Sign in" : "Continue"}
              </span>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                style={{ ...linkStyle, fontSize: "13px" }}>
                {mode === "login" ? "Create an account" : "Already have an account? Sign in"}
              </span>
            </div>
            
            {mode === "login" && (
              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <span onClick={() => { setMode("forgot"); setError(""); setPassword(""); }}
                  style={{ ...linkStyle, fontSize: "13px", color: "#888", textDecorationColor: "#bbb" }}>
                  Forgot password?
                </span>
              </div>
            )}
          </>
        )}

        {mode === "forgot" && (
          <>
            <p style={{ ...sml, marginBottom: "8px" }}>Email</p>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={inputAuth} 
              placeholder="you@email.com"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
            
            <p style={{ ...sml, marginBottom: "8px", marginTop: "8px" }}>New password</p>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={inputAuth} 
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            
            {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "8px", marginBottom: "16px" }}>{error}</p>}
            {resetSuccess && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#0fa97f", marginTop: "8px", marginBottom: "16px" }}>Password reset. Sign in with your new password.</p>}
            
            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <span onClick={!loading ? handleResetPassword : undefined}
                style={{ ...boxBtn(true), padding: "10px 32px", fontSize: "15px", display: "inline-block" }}>
                {loading ? "..." : "Reset password"}
              </span>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <span onClick={() => { setMode("login"); setError(""); setResetSuccess(false); }} style={{ ...linkStyle, fontSize: "13px" }}>← Back to sign in</span>
            </div>
          </>
        )}

        {mode === "profile" && (
          <>
            <p style={{ ...sml, marginBottom: "8px" }}>Your name</p>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} style={inputAuth} placeholder="e.g. Rebekah Kosonen Bide" />
            
            <p style={{ ...sml, marginBottom: "8px" }}>Your role</p>
            <input value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })} style={inputAuth} placeholder="e.g. Fine artist" />
            
            <p style={{ ...sml, marginBottom: "8px" }}>What do you want to call your planner?</p>
            <input value={profile.plannerTitle} onChange={(e) => setProfile({ ...profile, plannerTitle: e.target.value })} style={inputAuth} placeholder="e.g. Studio Practice Planner" />
            
            <p style={{ ...sml, marginBottom: "8px" }}>What do you schedule around?</p>
            <input value={profile.scheduleAround} onChange={(e) => setProfile({ ...profile, scheduleAround: e.target.value })} style={inputAuth} placeholder="e.g. office shifts, classes, day job" />
            
            <p style={{ ...sml, marginBottom: "12px", marginTop: "20px" }}>Executive demand for each task type</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "16px", lineHeight: "1.6" }}>
              How much focus does each type require? 1 = lowest, 4 = highest.
            </p>
            
            {[
              { key: "growth", label: "Growth (content, outreach, press)" },
              { key: "comms", label: "Comms & Admin (emails, invoices)" },
              { key: "systems", label: "Systems (workflows, organising)" },
              { key: "making", label: "Making (creating, building)" },
            ].map(m => (
              <div key={m.key} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>{m.label}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[1, 2, 3, 4].map(n => (
                    <span key={n} onClick={() => setProfile({ ...profile, modeIntensity: { ...profile.modeIntensity, [m.key]: n } })}
                      style={{
                        fontFamily: TNR, fontSize: "12px",
                        padding: "4px 10px",
                        border: `1px solid ${profile.modeIntensity[m.key] === n ? LINK_BLUE : "#ddd"}`,
                        color: profile.modeIntensity[m.key] === n ? LINK_BLUE : "#888",
                        cursor: "pointer",
                      }}>{n}</span>
                  ))}
                </div>
              </div>
            ))}

            <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Rest needed per active hour</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "16px", lineHeight: "1.6" }}>
              How many hours of rest do you need per hour of active work? Used to determine if a day is balanced.
            </p>
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>
                Rest ratio: <span style={{ color: LINK_BLUE }}>{profile.restRatio.toFixed(1)}:1</span>
              </span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {[
                  { val: 0.3, label: "0.3" },
                  { val: 0.5, label: "0.5" },
                  { val: 0.7, label: "0.7" },
                  { val: 1.0, label: "1.0" },
                  { val: 1.5, label: "1.5" },
                  { val: 2.0, label: "2.0" },
                ].map(r => (
                  <span key={r.val} onClick={() => setProfile({ ...profile, restRatio: r.val })}
                    style={{
                      fontFamily: TNR, fontSize: "12px",
                      padding: "4px 10px",
                      border: `1px solid ${profile.restRatio === r.val ? LINK_BLUE : "#ddd"}`,
                      color: profile.restRatio === r.val ? LINK_BLUE : "#888",
                      cursor: "pointer",
                    }}>{r.label}</span>
                ))}
              </div>
            </div>

            {/* What each work type means */}
            <p style={{ ...sml, marginBottom: "12px", marginTop: "32px" }}>Customise your work types</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "16px", lineHeight: "1.6" }}>
              You can rename each category and describe what it involves in your practice.
            </p>
            {[
              { key: "making", defaultLabel: "Making", placeholder: "e.g. casting, wax work, fabrication" },
              { key: "comms", defaultLabel: "Comms & Admin", placeholder: "e.g. emails, invoices, order tracking" },
              { key: "growth", defaultLabel: "Growth", placeholder: "e.g. content, outreach, press" },
              { key: "systems", defaultLabel: "Systems", placeholder: "e.g. workflows, pricing, organising" },
            ].map(m => (
              <div key={m.key} style={{ marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f0f0f0" }}>
                <p style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Name (default: {m.defaultLabel})</p>
                <input 
                  value={profile.modeLabels?.[m.key] ?? m.defaultLabel} 
                  onChange={(e) => setProfile({ ...profile, modeLabels: { ...profile.modeLabels, [m.key]: e.target.value } })} 
                  style={{ ...inputAuth, marginBottom: "6px" }} 
                  placeholder={m.defaultLabel} 
                />
                <p style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>What this involves for you</p>
                <input 
                  value={profile.modeDescriptions?.[m.key] || ""} 
                  onChange={(e) => setProfile({ ...profile, modeDescriptions: { ...profile.modeDescriptions, [m.key]: e.target.value } })} 
                  style={inputAuth} 
                  placeholder={m.placeholder} 
                />
              </div>
            ))}

            {/* Protected practice */}
            <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Protected practice</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "16px", lineHeight: "1.6" }}>
              Is there a type of work you want to protect time for, separate from commissions/client work? (e.g. fine art, personal projects, research)
            </p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "4px" }}>What you call this practice</p>
            <input value={profile.protectedPractice?.label || ""} onChange={(e) => setProfile({ ...profile, protectedPractice: { ...profile.protectedPractice, label: e.target.value, enabled: true } })} style={inputAuth} placeholder="e.g. Fine art practice, Personal projects" />
            
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "4px" }}>Warning shown when no time is scheduled for this</p>
            <textarea value={profile.protectedPractice?.warningText || ""} onChange={(e) => setProfile({ ...profile, protectedPractice: { ...profile.protectedPractice, warningText: e.target.value, enabled: true } })} style={{ ...inputAuth, minHeight: "60px", resize: "vertical" }} placeholder="e.g. No making blocks this week. At least one should go to fine art practice, not commissions." />
            
            {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "8px" }}>{error}</p>}
            
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <span onClick={handleProfileStep1}
                style={{ ...boxBtn(true), padding: "10px 32px", fontSize: "15px", display: "inline-block" }}>
                Continue →
              </span>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <span onClick={() => setMode("signup")} style={{ ...linkStyle, fontSize: "13px" }}>← Back</span>
            </div>
          </>
        )}

        {mode === "targets" && (
          <>
            {/* Weekly targets */}
            <p style={{ ...sml, marginBottom: "12px" }}>Weekly minimum blocks</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "16px", lineHeight: "1.6" }}>
              How many blocks of each type do you want to do per week?
            </p>
            {[
              { key: "making", label: "Making" },
              { key: "comms", label: "Comms & Admin" },
              { key: "growth", label: "Growth" },
              { key: "systems", label: "Systems" },
            ].map(m => (
              <div key={m.key} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>{m.label}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <span key={n} onClick={() => setProfile({ ...profile, weeklyTargets: { ...profile.weeklyTargets, [m.key]: n } })}
                      style={{
                        fontFamily: TNR, fontSize: "12px",
                        padding: "4px 10px",
                        border: `1px solid ${profile.weeklyTargets?.[m.key] === n ? LINK_BLUE : "#ddd"}`,
                        color: profile.weeklyTargets?.[m.key] === n ? LINK_BLUE : "#888",
                        cursor: "pointer",
                      }}>{n}</span>
                  ))}
                </div>
              </div>
            ))}

            {/* Health goals */}
            <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Health goals</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
              What health practices do you want to track? One per line.
            </p>
            <textarea 
              value={(profile.healthGoals || []).join("\n")}
              onChange={(e) => setProfile({ ...profile, healthGoals: e.target.value.split("\n").filter(l => l.trim()) })}
              style={{ ...inputAuth, minHeight: "80px", resize: "vertical" }}
              placeholder="e.g.&#10;Therapy&#10;Yoga&#10;Walking"
            />

            {/* Social goal */}
            <p style={{ ...sml, marginBottom: "8px", marginTop: "16px" }}>Social goal</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
              How much social interaction do you aim for?
            </p>
            <input value={profile.socialGoal || ""} onChange={(e) => setProfile({ ...profile, socialGoal: e.target.value })} style={inputAuth} placeholder="e.g. 1 meaningful connection this week" />

            {/* Week evaluation */}
            <p style={{ ...sml, marginBottom: "12px", marginTop: "16px" }}>Week evaluation</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
              What does a successful week look like for you? One item per line.
            </p>
            <textarea 
              value={(profile.weekEvaluation || []).join("\n")}
              onChange={(e) => setProfile({ ...profile, weekEvaluation: e.target.value.split("\n").filter(l => l.trim()) })}
              style={{ ...inputAuth, minHeight: "100px", resize: "vertical" }}
              placeholder="e.g.&#10;Stayed within capacity&#10;Avoided overload&#10;Completed at least one meaningful task"
            />

            {/* Weekly checklist */}
            <p style={{ ...sml, marginBottom: "12px", marginTop: "16px" }}>Weekly checklist</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
              Recurring weekly tasks to tick off. One per line.
            </p>
            <textarea 
              value={(profile.weeklyChecklist || []).join("\n")}
              onChange={(e) => setProfile({ ...profile, weeklyChecklist: e.target.value.split("\n").filter(l => l.trim()) })}
              style={{ ...inputAuth, minHeight: "100px", resize: "vertical" }}
              placeholder="e.g.&#10;Client comms up to date&#10;Orders progressed&#10;1 visibility action"
            />

            {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "8px" }}>{error}</p>}
            
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <span onClick={handleProfileStep2}
                style={{ ...boxBtn(true), padding: "10px 32px", fontSize: "15px", display: "inline-block" }}>
                Continue
              </span>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <span onClick={() => setMode("profile")} style={{ ...linkStyle, fontSize: "13px" }}>← Back</span>
            </div>
          </>
        )}

        {mode === "guide" && (
          <>
            <div style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", lineHeight: "1.7" }}>
              <p style={{ marginTop: 0, marginBottom: "20px", color: "#888", fontSize: "13px" }}>
                A quick guide to using your planner.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>The grid</p>
              <p style={{ marginBottom: "16px" }}>
                The grid is your week, split into 2-hour blocks from 7am to 9pm. Tap a block to schedule it. Tap again to clear it. Pick a work type from the row above the grid before tapping. Block colour shows the executive demand: deeper blue means harder focus.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Energy levels</p>
              <p style={{ marginBottom: "16px" }}>
                Each day has an energy level (high, medium, low). Tap the H/M/L letter under each day to change it. Different work types cost different amounts of energy. The number under each day (e.g. "8/5") shows how much you've scheduled vs your day's budget. Red means you're over.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Balance</p>
              <p style={{ marginBottom: "16px" }}>
                Each day shows a colour: green means balanced, red means under-rested, default means in between. This is based on your rest ratio — how much rest you need per active hour. You can change your rest ratio anytime in Edit Profile.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Targets page</p>
              <p style={{ marginBottom: "16px" }}>
                See your weekly minimums (Making, Comms, Growth, Systems), your health goals, your social target, and your daily balance breakdown. Tick things off as you complete them.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Quarterly</p>
              <p style={{ marginBottom: "16px" }}>
                Add bigger projects with horizons (now / next / later). Mark a project as "Protected" to track time for your protected practice — you'll be reminded if you don't schedule it.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Tasks</p>
              <p style={{ marginBottom: "16px" }}>
                Drop in tasks one at a time. They auto-categorise by keywords into Making, Comms, Growth, Systems, or Other.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Plan</p>
              <p style={{ marginBottom: "16px" }}>
                Export your scheduled blocks as a .ics calendar file. Import to Google Calendar, Apple Calendar, or Outlook.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Archive</p>
              <p style={{ marginBottom: "16px" }}>
                Save weeks for later reference. Useful for spotting patterns over time.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Feeling stuck?</p>
              <p style={{ marginBottom: "16px" }}>
                If you don't know what to do, tap "Feeling stuck?" at the top — it gives you a small, low-friction next action.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Sync</p>
              <p style={{ marginBottom: "16px" }}>
                Your planner syncs across all your devices automatically. Sign in with the same email anywhere to access it.
              </p>

              <p style={{ ...sml, marginBottom: "8px", marginTop: "20px" }}>Edit anytime</p>
              <p style={{ marginBottom: "16px" }}>
                Everything you set up is editable later via "Edit profile" at the top — including your work type names, descriptions, weekly targets, health goals, and warning messages.
              </p>
            </div>

            {error && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "8px" }}>{error}</p>}
            
            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <span onClick={!loading ? handleSignupComplete : undefined}
                style={{ ...boxBtn(true), padding: "10px 32px", fontSize: "15px", display: "inline-block" }}>
                {loading ? "..." : "Create account"}
              </span>
            </div>
            
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <span onClick={() => setMode("targets")} style={{ ...linkStyle, fontSize: "13px" }}>← Back</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Profile Edit Screen ─────────────────────────────────────────────────────

function ProfileEditScreen({ profile, onSave, onCancel }) {
  const [editProfile, setEditProfile] = useState(profile);

  const inputAuth = {
    fontFamily: TNR, fontSize: "15px", color: "#1a1a1a",
    border: "1px solid #1a1a1a", padding: "10px 12px",
    width: "100%", outline: "none", boxSizing: "border-box",
    background: "#fff", marginBottom: "12px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.98)", zIndex: 100, overflowY: "auto", padding: "60px 32px" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ ...sml }}>Edit profile</p>
        </div>

        <p style={{ ...sml, marginBottom: "8px" }}>Your name</p>
        <input value={editProfile.name} onChange={(e) => setEditProfile({ ...editProfile, name: e.target.value })} style={inputAuth} />
        
        <p style={{ ...sml, marginBottom: "8px" }}>Your role</p>
        <input value={editProfile.role} onChange={(e) => setEditProfile({ ...editProfile, role: e.target.value })} style={inputAuth} />
        
        <p style={{ ...sml, marginBottom: "8px" }}>Planner title</p>
        <input value={editProfile.plannerTitle} onChange={(e) => setEditProfile({ ...editProfile, plannerTitle: e.target.value })} style={inputAuth} />
        
        <p style={{ ...sml, marginBottom: "8px" }}>What you schedule around</p>
        <input value={editProfile.scheduleAround} onChange={(e) => setEditProfile({ ...editProfile, scheduleAround: e.target.value })} style={inputAuth} />

        <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Executive demand</p>
        {[
          { key: "growth", label: "Growth" },
          { key: "comms", label: "Comms & Admin" },
          { key: "systems", label: "Systems" },
          { key: "making", label: "Making" },
        ].map(m => (
          <div key={m.key} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>{m.label}</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3, 4].map(n => (
                <span key={n} onClick={() => setEditProfile({ ...editProfile, modeIntensity: { ...editProfile.modeIntensity, [m.key]: n } })}
                  style={{
                    fontFamily: TNR, fontSize: "12px",
                    padding: "4px 10px",
                    border: `1px solid ${editProfile.modeIntensity[m.key] === n ? LINK_BLUE : "#ddd"}`,
                    color: editProfile.modeIntensity[m.key] === n ? LINK_BLUE : "#888",
                    cursor: "pointer",
                  }}>{n}</span>
              ))}
            </div>
          </div>
        ))}

        <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Rest needed per active hour</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          Hours of rest per active hour. Sets your daily balance threshold.
        </p>
        <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>
            Ratio: <span style={{ color: LINK_BLUE }}>{editProfile.restRatio?.toFixed(1) || "1.0"}:1</span>
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {[
              { val: 0.3, label: "0.3" },
              { val: 0.5, label: "0.5" },
              { val: 0.7, label: "0.7" },
              { val: 1.0, label: "1.0" },
              { val: 1.5, label: "1.5" },
              { val: 2.0, label: "2.0" },
            ].map(r => (
              <span key={r.val} onClick={() => setEditProfile({ ...editProfile, restRatio: r.val })}
                style={{
                  fontFamily: TNR, fontSize: "12px",
                  padding: "4px 10px",
                  border: `1px solid ${editProfile.restRatio === r.val ? LINK_BLUE : "#ddd"}`,
                  color: editProfile.restRatio === r.val ? LINK_BLUE : "#888",
                  cursor: "pointer",
                }}>{r.label}</span>
            ))}
          </div>
        </div>

        {/* What each mode means to you */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "32px" }}>Customise your work types</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          Rename categories and describe what each involves for you.
        </p>
        {[
          { key: "making", defaultLabel: "Making" },
          { key: "comms", defaultLabel: "Comms & Admin" },
          { key: "growth", defaultLabel: "Growth" },
          { key: "systems", defaultLabel: "Systems" },
        ].map(m => (
          <div key={m.key} style={{ marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f0f0f0" }}>
            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Name (default: {m.defaultLabel})</p>
            <input 
              value={editProfile.modeLabels?.[m.key] ?? m.defaultLabel} 
              onChange={(e) => setEditProfile({ ...editProfile, modeLabels: { ...editProfile.modeLabels, [m.key]: e.target.value } })} 
              style={{ ...inputAuth, marginBottom: "6px" }} 
              placeholder={m.defaultLabel} 
            />
            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>What this involves for you</p>
            <input 
              value={editProfile.modeDescriptions?.[m.key] || ""} 
              onChange={(e) => setEditProfile({ ...editProfile, modeDescriptions: { ...editProfile.modeDescriptions, [m.key]: e.target.value } })} 
              style={inputAuth} 
              placeholder={`What does ${m.defaultLabel.toLowerCase()} involve for you?`} 
            />
          </div>
        ))}

        {/* Weekly targets */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Weekly minimum blocks</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          How many blocks of each type per week?
        </p>
        {[
          { key: "making", label: "Making" },
          { key: "comms", label: "Comms & Admin" },
          { key: "growth", label: "Growth" },
          { key: "systems", label: "Systems" },
        ].map(m => (
          <div key={m.key} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", flex: 1 }}>{m.label}</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[0, 1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setEditProfile({ ...editProfile, weeklyTargets: { ...editProfile.weeklyTargets, [m.key]: n } })}
                  style={{
                    fontFamily: TNR, fontSize: "12px",
                    padding: "4px 10px",
                    border: `1px solid ${editProfile.weeklyTargets?.[m.key] === n ? LINK_BLUE : "#ddd"}`,
                    color: editProfile.weeklyTargets?.[m.key] === n ? LINK_BLUE : "#888",
                    cursor: "pointer",
                  }}>{n}</span>
              ))}
            </div>
          </div>
        ))}

        {/* Protected practice */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Protected practice</p>
        <div style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
          <input type="checkbox" checked={editProfile.protectedPractice?.enabled ?? true} onChange={(e) => setEditProfile({ ...editProfile, protectedPractice: { ...editProfile.protectedPractice, enabled: e.target.checked } })} />
          <span style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a" }}>Enable protected practice tracking</span>
        </div>
        {(editProfile.protectedPractice?.enabled ?? true) && (
          <>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "4px", marginTop: "8px" }}>What you call this practice</p>
            <input value={editProfile.protectedPractice?.label || ""} onChange={(e) => setEditProfile({ ...editProfile, protectedPractice: { ...editProfile.protectedPractice, label: e.target.value } })} style={inputAuth} placeholder="e.g. Fine art practice, Personal projects" />
            
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "4px" }}>Warning shown when not scheduled</p>
            <textarea value={editProfile.protectedPractice?.warningText || ""} onChange={(e) => setEditProfile({ ...editProfile, protectedPractice: { ...editProfile.protectedPractice, warningText: e.target.value } })} style={{ ...inputAuth, minHeight: "60px", resize: "vertical" }} placeholder="Custom warning message" />
          </>
        )}

        {/* Health goals */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "24px" }}>Health goals</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          What health practices do you want to track? One per line.
        </p>
        <textarea 
          value={(editProfile.healthGoals || []).join("\n")}
          onChange={(e) => setEditProfile({ ...editProfile, healthGoals: e.target.value.split("\n").filter(l => l.trim()) })}
          style={{ ...inputAuth, minHeight: "80px", resize: "vertical" }}
          placeholder="Psychoanalysis&#10;Acupuncture&#10;Gym"
        />

        {/* Social goal */}
        <p style={{ ...sml, marginBottom: "8px", marginTop: "16px" }}>Social goal</p>
        <input value={editProfile.socialGoal || ""} onChange={(e) => setEditProfile({ ...editProfile, socialGoal: e.target.value })} style={inputAuth} placeholder="e.g. 1 meaningful connection this week" />

        {/* Week evaluation */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "16px" }}>Week evaluation</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          What does a successful week look like? One item per line.
        </p>
        <textarea 
          value={(editProfile.weekEvaluation || []).join("\n")}
          onChange={(e) => setEditProfile({ ...editProfile, weekEvaluation: e.target.value.split("\n").filter(l => l.trim()) })}
          style={{ ...inputAuth, minHeight: "100px", resize: "vertical" }}
          placeholder="Stayed within capacity&#10;Avoided overload&#10;Completed at least one meaningful task"
        />

        {/* Weekly checklist */}
        <p style={{ ...sml, marginBottom: "12px", marginTop: "16px" }}>Weekly checklist</p>
        <p style={{ fontFamily: TNR, fontSize: "11px", color: "#888", marginBottom: "12px", lineHeight: "1.6" }}>
          Recurring weekly tasks. One per line.
        </p>
        <textarea 
          value={(editProfile.weeklyChecklist || []).join("\n")}
          onChange={(e) => setEditProfile({ ...editProfile, weeklyChecklist: e.target.value.split("\n").filter(l => l.trim()) })}
          style={{ ...inputAuth, minHeight: "100px", resize: "vertical" }}
          placeholder="Client comms up to date&#10;Orders progressed&#10;1 visibility action"
        />

        <div style={{ marginTop: "40px", display: "flex", gap: "16px", justifyContent: "center" }}>
          <span onClick={() => onSave(editProfile)} style={{ ...boxBtn(true), padding: "8px 24px", fontSize: "14px" }}>
            Save changes
          </span>
          <span onClick={onCancel} style={{ ...linkStyle, fontSize: "14px", alignSelf: "center" }}>
            Cancel
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
const [, setAuthTimestamp] = useState(0);
  const [profile, setProfile] = useState(loadProfile());
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const saved = loadLocal();

  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  // On Sundays only, lets the user choose whether to view "this week" (just-finishing) or "next week" (upcoming).
  // Default: null (will prompt). Persisted in localStorage by date so we don't re-ask on the same Sunday.
  const [sundayWeekChoice, setSundayWeekChoice] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = JSON.parse(localStorage.getItem("studio-planner-sunday-choice") || "null");
      const today = new Date().toISOString().split("T")[0];
      if (stored && stored.date === today) return stored.choice;
    } catch (_) {}
    return null;
  });
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [schedule, setSchedule]           = useState(saved?.schedule || defaultSchedule());
  const [activeMode, setActiveMode]       = useState("making");
  const [restSubtype, setRestSubtype]     = useState("passive");
  const [checklist, setChecklist]         = useState(saved?.checklist || CHECKLIST.map(() => false));
  const [successMetrics, setSuccessMetrics] = useState(saved?.successMetrics || SUCCESS_METRICS.map(() => false));
  const [healthTargets, setHealthTargets] = useState(saved?.healthTargets || HEALTH_TARGETS.map(() => false));
  const [restTargets, setRestTargets]     = useState(saved?.restTargets || DAYS.map(() => false));
  const [socialDone, setSocialDone]       = useState(saved?.socialDone ?? false);
  const [weekNote, setWeekNote]           = useState(saved?.weekNote || "");
  const [tab, setTab]                     = useState("today");
  const [dayEnergyLevels, setDayEnergyLevels] = useState(saved?.dayEnergyLevels || DAYS.reduce((a, d) => ({ ...a, [d]: "medium" }), {}));

  // Check session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token && USE_SUPABASE) {
        const valid = await verifySession(token);
        if (valid) {
          setIsAuthenticated(true);
          setAuthTimestamp(Date.now());
        } else {
          logoutUser();
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  // Stuck state
  const [stuckOpen, setStuckOpen]         = useState(false);
  const [stuckStep, setStuckStep]         = useState(0);
  const [stuckEnergy, setStuckEnergy]     = useState(null);

  // Quarterly
  const [projects, setProjects]           = useState(saved?.projects || []);
  const [qView, setQView]                 = useState("roadmap");
  const [editingProject, setEditingProject] = useState(null);
  const [qFilter, setQFilter]             = useState("all");

  // Tasks
  // Task categorization logic
  const categorizeTasks = (text) => {
    if (!text.trim()) return { making: [], comms: [], growth: [], systems: [], other: [] };
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result = { making: [], comms: [], growth: [], systems: [], other: [] };
    
    const makingKeywords = [
      'wax', 'cast', 'fabricate', 'metalwork', 'metal', 'design', 'sketch', 'prototype',
      'material', 'tool', 'forge', 'mold', 'mould', 'shape', 'form', 'sculpture', 'sculpt',
      'bronze', 'silver', 'gold', 'electroform', 'engrave', 'engraving', 'solder', 'polish',
      'finish', 'studio', 'make', 'build', 'craft', 'pour', 'lost-wax', 'wax work',
      'foundry', 'jewellery', 'jewelry', 'piece', 'commission', 'production', 'sample',
      'set stone', 'setting', 'chain', 'ring', 'pendant', 'earring', 'brooch', 'necklace',
    ];
    const commsKeywords = [
      'email', 'call', 'respond', 'reach out', 'message', 'contact', 'reply', 'invoice',
      'shipping', 'ship', 'post', 'order', 'client', 'customer', 'vendor', 'wholesale',
      'retail', 'ssense', 'send', 'admin', 'paperwork', 'tax', 'tax return', 'accountant',
      'accounting', 'bookkeeping', 'receipt', 'expense', 'expenses', 'vat', 'hmrc',
      'invoice', 'invoices', 'bill', 'bills', 'pay', 'payment', 'payroll', 'bank',
      'banking', 'transfer', 'refund', 'return', 'enquiry', 'inquiry', 'forward',
      'cc', 'follow up', 'follow-up', 'chase', 'remind', 'schedule', 'book', 'booking',
      'confirm', 'rsvp', 'reach', 'liaise', 'coordinate', 'arrange', 'source files',
      'submit', 'fill in', 'fill out', 'paperwork', 'forms', 'application form',
    ];
    const growthKeywords = [
      'content', 'post', 'instagram', 'write', 'article', 'press', 'pitch', 'outreach',
      'website', 'photography', 'photo', 'video', 'social', 'tiktok', 'portfolio',
      'press kit', 'bio', 'cv', 'resume', 'publication', 'apply', 'application',
      'residency', 'grant', 'fund', 'funding', 'submission', 'submit work', 'feature',
      'editorial', 'magazine', 'interview', 'collaborate', 'collab', 'collaboration',
      'curator', 'gallery', 'exhibition', 'show', 'lookbook', 'campaign', 'launch',
      'newsletter', 'mailchimp', 'reel', 'story', 'caption', 'shoot', 'styling',
      'edit photos', 'lightroom', 'premiere', 'edit video', 'reels', 'mood board',
      'concept', 'visibility', 'network', 'introduction', 'intro',
    ];
    const systemsKeywords = [
      'file', 'organize', 'organise', 'database', 'spreadsheet', 'pricing', 'proposal',
      'documentation', 'budget', 'plan', 'structure', 'list', 'record', 'track',
      'workflow', 'process', 'system', 'set up', 'setup', 'configure', 'archive',
      'inventory', 'stock', 'audit', 'review', 'tidy', 'clean up', 'sort', 'declutter',
      'backup', 'back up', 'sync', 'restore', 'migrate', 'csv', 'export', 'import',
      'shopify', 'website update', 'admin panel', 'dashboard', 'tagging', 'sku',
      'catalogue', 'catalog', 'template', 'standardise', 'standardize', 'rename', 're-name',
      'code', 'coding', 'deploy', 'deployment', 'git', 'commit', 'push',
      'reorganise', 'reorganize', 'consolidate',
    ];
    
    lines.forEach(task => {
      const lower = task.toLowerCase();
      
      // Score each category by how many keywords match
      const scores = {
        making: makingKeywords.filter(k => lower.includes(k)).length,
        comms: commsKeywords.filter(k => lower.includes(k)).length,
        growth: growthKeywords.filter(k => lower.includes(k)).length,
        systems: systemsKeywords.filter(k => lower.includes(k)).length,
      };
      
      // Find highest scoring category
      const best = Object.entries(scores).reduce((a, b) => b[1] > a[1] ? b : a, ["other", 0]);
      
      if (best[1] > 0) {
        result[best[0]].push(task);
      } else {
        result.other.push(task);
      }
    });
    
    return result;
  };

  const [taskInput, setTaskInput] = useState("");
  const [categorizedTasks, setCategorizedTasks] = useState(null);

  // Calendar
  const [calStatus, setCalStatus]         = useState(null);
  const [isExporting, setIsExporting]     = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");

  // Archive
  const [archive, setArchive]             = useState(saved?.archive || []);
  const [expandedArchiveWeek, setExpandedArchiveWeek] = useState(null);

  // Load from Supabase on mount (cloud-first, fallback to local)
  useEffect(() => {
    const loadData = async () => {
      if (USE_SUPABASE && !supabaseLoaded) {
        const cloudData = await loadFromSupabase();
        if (cloudData) {
          if (cloudData.schedule) setSchedule(cloudData.schedule);
          if (cloudData.checklist) setChecklist(cloudData.checklist);
          if (cloudData.successMetrics) setSuccessMetrics(cloudData.successMetrics);
          if (cloudData.healthTargets) setHealthTargets(cloudData.healthTargets);
          if (cloudData.restTargets) setRestTargets(cloudData.restTargets);
          if (cloudData.socialDone !== undefined) setSocialDone(cloudData.socialDone);
          if (cloudData.weekNote !== undefined) setWeekNote(cloudData.weekNote);
          if (cloudData.projects) setProjects(cloudData.projects);
          if (cloudData.archive) setArchive(cloudData.archive);
          if (cloudData.dayEnergyLevels) setDayEnergyLevels(cloudData.dayEnergyLevels);
          if (cloudData.profile) {
            setProfile({ ...DEFAULT_PROFILE, ...cloudData.profile });
            saveProfile({ ...DEFAULT_PROFILE, ...cloudData.profile });
          }
        }
        setSupabaseLoaded(true);
      }
    };
    loadData();
  }, [supabaseLoaded]);

  // Autosave to both local and cloud
  // CRITICAL: Only saves to cloud AFTER we have completed an initial load from cloud
  // AND the user has made at least one real interaction.
  useEffect(() => {
    const data = { schedule, checklist, successMetrics, healthTargets, restTargets, socialDone, weekNote, projects, archive, dayEnergyLevels, profile };
    // Always safe to save locally (per-device)
    saveLocal(data);
    
    // Only save to cloud if:
    // 1. We've finished loading from cloud (so we have the latest cloud state in memory)
    // 2. The user has actually interacted with the app (not just rendered defaults or applied cloud data)
    if (USE_SUPABASE && supabaseLoaded && hasUserInteracted) {
      saveToSupabase(data);
    }
  }, [schedule, checklist, successMetrics, healthTargets, restTargets, socialDone, weekNote, projects, archive, dayEnergyLevels, profile, supabaseLoaded, hasUserInteracted]);

  // Track last save time so we don't fight with our own saves
  const [lastSaveTime, setLastSaveTime] = useState(0);

  useEffect(() => {
    setLastSaveTime(Date.now());
  }, [schedule, checklist, successMetrics, healthTargets, restTargets, socialDone, weekNote, projects, archive, dayEnergyLevels, profile]);

  // Real-time sync: poll Supabase every 5s + refresh on tab focus
  useEffect(() => {
    if (!USE_SUPABASE || !isAuthenticated) return;

    const syncFromCloud = async () => {
      // Skip if we just saved (prevents fighting with own writes)
      if (Date.now() - lastSaveTime < 3000) return;
      
      const cloudData = await loadFromSupabase();
      if (cloudData) {
        // SAFETY: If cloud data is essentially empty but local data is rich,
        // SKIP the sync. This prevents another device's bad save from wiping our good data.
        const cloudIsEmpty = (!cloudData.schedule || Object.values(cloudData.schedule).every(d => !d || Object.values(d).every(s => !s)))
          && (!cloudData.projects || cloudData.projects.length === 0)
          && (!cloudData.archive || cloudData.archive.length === 0);
        const localIsRich = (schedule && Object.values(schedule).some(d => d && Object.values(d).some(s => s)))
          || (projects && projects.length > 0)
          || (archive && archive.length > 0);
        if (cloudIsEmpty && localIsRich) {
          console.warn("[syncFromCloud] BLOCKED sync: cloud data is empty but local data is rich. Refusing to overwrite local.");
          return;
        }
        
        // Only update state if data actually changed (prevents unnecessary re-renders)
        if (JSON.stringify(cloudData.schedule) !== JSON.stringify(schedule)) {
          setSchedule(cloudData.schedule);
        }
        if (JSON.stringify(cloudData.checklist) !== JSON.stringify(checklist)) {
          setChecklist(cloudData.checklist);
        }
        if (JSON.stringify(cloudData.successMetrics) !== JSON.stringify(successMetrics)) {
          setSuccessMetrics(cloudData.successMetrics);
        }
        if (JSON.stringify(cloudData.healthTargets) !== JSON.stringify(healthTargets)) {
          setHealthTargets(cloudData.healthTargets);
        }
        if (JSON.stringify(cloudData.restTargets) !== JSON.stringify(restTargets)) {
          setRestTargets(cloudData.restTargets);
        }
        if (cloudData.socialDone !== socialDone) {
          setSocialDone(cloudData.socialDone);
        }
        if (cloudData.weekNote !== weekNote) {
          setWeekNote(cloudData.weekNote);
        }
        if (JSON.stringify(cloudData.projects) !== JSON.stringify(projects)) {
          setProjects(cloudData.projects);
        }
        if (JSON.stringify(cloudData.archive) !== JSON.stringify(archive)) {
          setArchive(cloudData.archive);
        }
        if (JSON.stringify(cloudData.dayEnergyLevels) !== JSON.stringify(dayEnergyLevels)) {
          setDayEnergyLevels(cloudData.dayEnergyLevels);
        }
        if (cloudData.profile && JSON.stringify(cloudData.profile) !== JSON.stringify(profile)) {
          const merged = { ...DEFAULT_PROFILE, ...cloudData.profile };
          setProfile(merged);
          saveProfile(merged);
        }
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(syncFromCloud, 5000);

    // Also sync when window regains focus
    const handleFocus = () => syncFromCloud();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, lastSaveTime]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Get display label for a mode — office uses the user's "schedule around" value
  const getModeLabel = (key) => {
    if (key === "office" && profile.scheduleAround) {
      // Capitalise first letter of each word for display
      return profile.scheduleAround
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    // Use custom mode label if user has set one
    if (profile.modeLabels?.[key]) return profile.modeLabels[key];
    return MODES[key]?.label || key;
  };

  const assign = (day, slot) => {
    const current = schedule[day][slot];
    setHasUserInteracted(true);
    
    // If clicking an office block:
    //   - When office mode is active: toggle it off (remove)
    //   - When any other mode is active: do nothing (protect from accidental overwrite)
    if (current === "office" && activeMode !== "office") return;
    
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [slot]: current === activeMode ? null : activeMode } }));
  };

  const clearAll = () => {
    setHasUserInteracted(true);
    setSchedule(defaultSchedule());
  };

  const countSlots = (mode) => {
    let n = 0;
    DAYS.forEach(d => TIME_SLOTS.forEach(t => { if (schedule[d][t] === mode) n++; }));
    return n;
  };

  const countBlocks = (mode) => {
    let n = 0;
    DAYS.forEach(d => {
      let inB = false;
      TIME_SLOTS.forEach(t => {
        if (schedule[d][t] === mode) { if (!inB) { n++; inB = true; } } else { inB = false; }
      });
    });
    return n;
  };

  const getToday = () => {
    const d = new Date().getDay();
    return DAYS[d === 0 ? 6 : d - 1];
  };

  const today = getToday();

  // Build weekly targets from profile
  const WEEKLY_TARGETS = [
    { mode: "making",  min: profile.weeklyTargets?.making  ?? 2, label: `${profile.weeklyTargets?.making  ?? 2} Making blocks` },
    { mode: "comms",   min: profile.weeklyTargets?.comms   ?? 2, label: `${profile.weeklyTargets?.comms   ?? 2} Comms & Admin` },
    { mode: "growth",  min: profile.weeklyTargets?.growth  ?? 1, label: `${profile.weeklyTargets?.growth  ?? 1} Growth` },
    { mode: "systems", min: profile.weeklyTargets?.systems ?? 1, label: `${profile.weeklyTargets?.systems ?? 1} Systems` },
  ];

  const progress = WEEKLY_TARGETS.map(t => ({ ...t, current: countBlocks(t.mode), met: countBlocks(t.mode) >= t.min }));

  const fineArtWarning = countBlocks("making") === 0;
  const protectedFineArtMet = projects.some(p => p.isProtectedFineArt && p.horizon === "now");

  // Per-day energy calculation
  const getDayEnergy = (day) => {
    let total = 0;
    TIME_SLOTS.forEach(t => {
      const v = schedule[day][t];
      if (v && MODES[v]) total += MODES[v].energyCost;
    });
    return total;
  };

  const getDayBudget = (day) => {
    const level = dayEnergyLevels[day] || "medium";
    return ENERGY_LEVELS.find(e => e.key === level)?.budget || 5;
  };

  // Transition buffer detection: look for consecutive slots on the same day
  // where the transition between them matches BUFFER_TRIGGERS
  const getBufferSuggestions = (day) => {
    const suggestions = [];
    for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
      const from = schedule[day][TIME_SLOTS[i]];
      const to   = schedule[day][TIME_SLOTS[i + 1]];
      if (from && to && from !== to) {
        const needsBuffer = BUFFER_TRIGGERS.some(([f, t]) => f === from && t === to);
        if (needsBuffer) {
          suggestions.push({ slot: TIME_SLOTS[i + 1], from, to });
        }
      }
    }
    return suggestions;
  };

  // ── Capacity model ────────────────────────────────────────────────────────────

  const capacityCalc = () => {
    const eveningSlots = ["3–5pm","5–7pm","7–9pm"];
    let officeCount = 0, lateOfficeCount = 0;
    DAYS.forEach(d => TIME_SLOTS.forEach(t => {
      if (schedule[d][t] === "office") { officeCount++; if (eveningSlots.includes(t)) lateOfficeCount++; }
    }));

    const dailyRatios = DAYS.map(d => {
      let active = 0, rest = 0, office = 0;
      TIME_SLOTS.forEach(t => {
        const v = schedule[d][t];
        if (!v) return;
        if (v === "office") { office++; return; }
        if (v === "rest") { rest++; return; }
        active++;
      });
      // Office shifts ALSO require energy and count toward total load
      const totalLoad = active + office;
      const ratio = totalLoad === 0 ? (rest > 0 ? profile.restRatio : null) : rest / totalLoad;
      // Balanced if rest/load ratio is at least 80% of the user's target
      const balanced  = ratio !== null && ratio >= profile.restRatio * 0.8;
      // Overloaded if ratio is less than 40% of the user's target
      const overloaded = totalLoad > 0 && (ratio === null || ratio < profile.restRatio * 0.4);
      return { day: d, active, rest, office, ratio, balanced, overloaded };
    });

    let filled = 0, exposureBlocks = 0, makingBlocks = 0;
    let restBlocks = 0, socialBlocks = 0, supportBlocks = 0, officeBlocks = 0;
    DAYS.forEach(d => TIME_SLOTS.forEach(t => {
      const v = schedule[d][t];
      if (!v) return;
      if (v === "office") { officeBlocks++; return; }
      filled++;
      if (v === "comms" || v === "growth") exposureBlocks++;
      if (v === "making") makingBlocks++;
      if (v === "rest") restBlocks++;
      if (v === "social") socialBlocks++;
      if (v === "systems") supportBlocks++;
    }));

    const activeDaysWithNoRest = dailyRatios.filter(r => (r.active + r.office) > 0 && r.rest === 0).length;
    const balancedDays  = dailyRatios.filter(r => r.balanced).length;
    const overloadedDays = dailyRatios.filter(r => r.overloaded).length;
    // Weekly load now includes office shifts
    const weeklyActive  = (filled - restBlocks) + officeBlocks;
    const weeklyRatio   = weeklyActive === 0 ? profile.restRatio : restBlocks / weeklyActive;

    // Score is based on how close the weekly ratio is to user's target
    const targetRatio = profile.restRatio;
    const lowerBound = targetRatio * 0.85;
    const upperBound = targetRatio * 1.25;
    let score;
    if (weeklyRatio >= lowerBound && weeklyRatio <= upperBound) score = 50;
    else if (weeklyRatio < lowerBound) score = Math.round(50 + ((lowerBound - weeklyRatio) / lowerBound) * 45);
    else score = Math.round(50 - ((weeklyRatio - upperBound) / upperBound) * 30);

    if (overloadedDays >= 3) score += 12;
    if (activeDaysWithNoRest >= 4) score += 10;
    const overSocial   = socialBlocks > 3;
    const exposureHeavy = exposureBlocks > makingBlocks + 2;
    const noRunway     = exposureBlocks > 0 && supportBlocks === 0;
    if (overSocial) score += 6;
    if (lateOfficeCount >= 4) score += 5;
    score = Math.min(100, Math.max(10, score));

    let label, color, textColor;
    if (score < 30)       { label = "Under-loaded";   color = "#e8f0f8"; textColor = "#7a90a8"; }
    else if (score < 45)  { label = "Light";           color = "#eef5ee"; textColor = "#7a9e96"; }
    else if (score <= 60) { label = "Well balanced";   color = "#eef5ee"; textColor = "#7a9e96"; }
    else if (score <= 76) { label = "Getting heavy";   color = "#fdf8ee"; textColor = "#c8a050"; }
    else                  { label = "Over capacity";   color = "#fdf0ee"; textColor = "#b01904"; }

    const flags = [];
    if (activeDaysWithNoRest >= 3) flags.push(`${activeDaysWithNoRest} active days have no rest scheduled.`);
    if (overloadedDays >= 2)       flags.push(`${overloadedDays} days are under-rested.`);
    if (weeklyRatio < profile.restRatio * 0.5 && weeklyActive > 4) flags.push(`Rest is at ${Math.round(weeklyRatio * 100)}% of activity — aim for ${profile.restRatio.toFixed(1)}:1.`);
    if (overSocial)    flags.push("Social looks heavy — protect some evenings.");
    if (exposureHeavy) flags.push("More exposure than making — rebalance if possible.");
    if (noRunway)      flags.push("Exposure with no support runway — add a Systems block.");
    if (lateOfficeCount >= 4) flags.push("Several late shifts — protect mornings for studio work.");
    if (balancedDays >= 4) flags.push(`${balancedDays} days are well balanced.`);

    return { score, label, color, textColor, flags, officeCount, filled, dailyRatios, weeklyRatio, restBlocks, weeklyActive };
  };

  const capacity = capacityCalc();

  // ── Calendar export ───────────────────────────────────────────────────────────

  const getWeekStart = () => {
    const now = new Date(), monday = new Date(now);
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      const choice = sundayWeekChoice || "this";
      if (choice === "next") {
        monday.setDate(now.getDate() + 1);
      } else {
        monday.setDate(now.getDate() - 6);
      }
    } else {
      monday.setDate(now.getDate() - (dayOfWeek - 1));
    }
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  const getQuarterLabel = (isoDate) => {
    const d = new Date(isoDate);
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  };

  const saveWeek = () => {
    const cap = capacityCalc();
    const entry = {
      weekStart: getWeekStart(), weekNote, schedule,
      capacityScore: cap.score, capacityLabel: cap.label,
      workTargetsMet: progress.filter(p => p.met).length,
      workTargetsTotal: progress.length,
      healthTargets: [...healthTargets], restTargets: [...restTargets],
      socialDone, checklist: [...checklist], successMetrics: [...successMetrics],
      savedAt: new Date().toISOString(),
    };
    setHasUserInteracted(true);
    setArchive(prev => {
      const filtered = prev.filter(w => w.weekStart !== entry.weekStart);
      return [...filtered, entry].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    });
  };

  // Opens the picker, pre-filled with the Monday of the current planning week
  const openExportPicker = () => {
    const now = new Date(), monday = new Date(now);
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0) {
      const choice = sundayWeekChoice || "this";
      if (choice === "next") monday.setDate(now.getDate() + 1);
      else monday.setDate(now.getDate() - 6);
    } else {
      monday.setDate(now.getDate() - (dayOfWeek - 1));
    }
    monday.setHours(0, 0, 0, 0);
    setExportStartDate(monday.toISOString().split("T")[0]);
    setCalStatus(null);
    setShowExportPicker(true);
  };

  const exportToCalendar = async (customStartDate) => {
    setIsExporting(true); setCalStatus("connecting");
    let monday;
    if (customStartDate) {
      // Use the user-chosen start date as Monday of the export week
      monday = new Date(customStartDate + "T00:00:00");
    } else {
      const now = new Date();
      monday = new Date(now);
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0) {
        const choice = sundayWeekChoice || "this";
        if (choice === "next") {
          monday.setDate(now.getDate() + 1);
        } else {
          monday.setDate(now.getDate() - 6);
        }
      } else {
        monday.setDate(now.getDate() - (dayOfWeek - 1));
      }
      monday.setHours(0, 0, 0, 0);
    }
    const dayOffsets = { Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6 };

    // Merge contiguous same-mode slots per day
    const events = [];
    DAYS.forEach(day => {
      let cur = null, sh = null, eh = null;
      TIME_SLOTS.forEach(slot => {
        const mode = schedule[day][slot];
        const ok = mode && MODES[mode]?.exportable;
        const h = SLOT_START[slot];
        if (ok && mode === cur) { eh = h + 2; }
        else {
          if (cur && sh !== null) events.push({ day, mode: cur, sh, eh });
          cur = ok ? mode : null; sh = ok ? h : null; eh = ok ? h + 2 : null;
        }
      });
      if (cur && sh !== null) events.push({ day, mode: cur, sh, eh });
    });

    if (!events.length) { setCalStatus("empty"); setIsExporting(false); return; }
    
    try {
      // Generate .ics calendar file
      const formatDateTime = (d, hour) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hr = String(hour).padStart(2, '0');
        return `${year}${month}${day}T${hr}0000`;
      };
      
      let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Practice Planner//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
      
      events.forEach((e, i) => {
        const eventDate = new Date(monday);
        eventDate.setDate(monday.getDate() + dayOffsets[e.day]);
        const start = formatDateTime(eventDate, e.sh);
        const end = formatDateTime(eventDate, e.eh);
        const uid = `practice-planner-${monday.getTime()}-${i}@planner.local`;
        ics += `BEGIN:VEVENT\r\n`;
        ics += `UID:${uid}\r\n`;
        ics += `DTSTAMP:${formatDateTime(new Date(), new Date().getHours())}\r\n`;
        ics += `DTSTART:${start}\r\n`;
        ics += `DTEND:${end}\r\n`;
        ics += `SUMMARY:${MODES[e.mode].label} — Practice\r\n`;
        ics += `DESCRIPTION:${MODES[e.mode].sub || ''}\r\n`;
        ics += `END:VEVENT\r\n`;
      });
      
      ics += "END:VCALENDAR\r\n";
      
      // Download the .ics file
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `practice-planner-week-${monday.toISOString().split("T")[0]}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setCalStatus("success");
    } catch (err) {
      console.error("Calendar export error:", err);
      setCalStatus("error");
    }
    setIsExporting(false);
  };

  const addProject = () => {
    setHasUserInteracted(true);
    const p = emptyProject();
    setProjects(prev => [...prev, p]);
    setEditingProject(p.id);
  };
  const updateProject = (id, field, value) => { setHasUserInteracted(true); setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); };
  const deleteProject = (id) => { setHasUserInteracted(true); setProjects(prev => prev.filter(p => p.id !== id)); if (editingProject === id) setEditingProject(null); };
  const stuckReset = () => { setStuckOpen(false); setStuckStep(0); setStuckEnergy(null); };
  const runway = stuckEnergy ? RUNWAY_MAP[stuckEnergy] : null;

  // ── Today data ────────────────────────────────────────────────────────────────

  const todaySlots = TIME_SLOTS.map(t => ({ slot: t, mode: schedule[today]?.[t] || null })).filter(s => s.mode);
  const todayEnergy = getDayEnergy(today);
  const todayBudget = getDayBudget(today);
  const todayOver = todayEnergy > todayBudget;
  const bufferSuggestions = getBufferSuggestions(today);

  // Next action: first non-null non-rest block from current hour onwards
  const getNextAction = () => {
    const nowHour = new Date().getHours();
    for (const t of TIME_SLOTS) {
      const h = SLOT_START[t];
      const mode = schedule[today]?.[t];
      if (h >= nowHour && mode && mode !== "rest" && mode !== "office") {
        return { slot: t, mode };
      }
    }
    return null;
  };
  const nextAction = getNextAction();

  // ── Project row renderer ─────────────────────────────────────────────────────
  const renderProjectRow = (p) => {
    const statusObj = Q_STATUSES.find(s => s.key === p.status) || Q_STATUSES[0];
    const isEditing = editingProject === p.id;
    const statusColor = {
      "on-track": "#0fa97f", "at-risk": "#e8c070", "behind": "#b01904",
      "done": "#0fa97f", "not-started": "#888",
    }[p.status] || "#888";
    return (
      <div key={p.id} style={{ marginBottom: "2px" }}>
        {/* Row — year-list style */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", padding: "10px 0", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
          onClick={() => setEditingProject(isEditing ? null : p.id)}>
          <span style={{ fontFamily: TNR, fontSize: "12px", color: "#888", width: "52px", flexShrink: 0 }}>
            {p.dueMonth || "—"}
          </span>
          <span style={{ flex: 1, display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
            {p.isProtectedFineArt && <span style={{ fontFamily: TNR, fontSize: "11px", color: "#b01904" }}>[protected]</span>}
            {p.isFineArt && !p.isProtectedFineArt && <span style={{ fontFamily: TNR, fontSize: "11px", color: "#b01904" }}>[fine art]</span>}
            <span style={{ fontFamily: TNR, fontSize: "15px", color: p.title ? (p.isFineArt ? "#b01904" : "#1a1a1a") : "#888",
              textDecoration: p.title ? "underline" : "none", textUnderlineOffset: "2px",
              textDecorationColor: p.isFineArt ? "#b01904" : "#1a1a1a",
            }}>{p.title || "Untitled goal"}</span>
            {p.nextAction && <span style={{ fontFamily: TNR, fontSize: "12px", color: "#888" }}>→ {p.nextAction.slice(0, 40)}{p.nextAction.length > 40 ? "…" : ""}</span>}
          </span>
          <span style={{ fontFamily: TNR, fontSize: "12px", color: statusColor, flexShrink: 0 }}>{statusObj.label}</span>
          <span style={{ fontFamily: TNR, fontSize: "12px", color: "#888", flexShrink: 0, minWidth: "28px", textAlign: "right" }}>{p.progress}%</span>
        </div>

        {isEditing && (
          <div style={{ padding: "16px 0 22px 72px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Title</p><input style={inp} value={p.title} onChange={e => updateProject(p.id, "title", e.target.value)} placeholder="Goal title" /></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Category</p><select style={{ ...inp, cursor: "pointer" }} value={p.category} onChange={e => updateProject(p.id, "category", e.target.value)}>{Q_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Status</p><select style={{ ...inp, cursor: "pointer" }} value={p.status} onChange={e => updateProject(p.id, "status", e.target.value)}>{Q_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Horizon</p><select style={{ ...inp, cursor: "pointer" }} value={p.horizon} onChange={e => updateProject(p.id, "horizon", e.target.value)}>{Q_HORIZONS.map(h => <option key={h.key} value={h.key}>{h.label}</option>)}</select></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Progress — {p.progress}%</p><input type="range" min="0" max="100" value={p.progress} onChange={e => updateProject(p.id, "progress", Number(e.target.value))} style={{ width: "100%", accentColor: statusColor }} /></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Confidence</p><select style={{ ...inp, cursor: "pointer" }} value={p.confidence} onChange={e => updateProject(p.id, "confidence", e.target.value)}>{CONFIDENCE.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Due month</p><input style={inp} value={p.dueMonth} onChange={e => updateProject(p.id, "dueMonth", e.target.value)} placeholder="e.g. June" /></div>
              <div><p style={{ ...sml, marginBottom: "5px" }}>Next milestone</p><input style={inp} value={p.nextMilestone} onChange={e => updateProject(p.id, "nextMilestone", e.target.value)} placeholder="Next concrete step" /></div>
            </div>
            {/* Next physical action — plain, no card */}
            <div style={{ marginBottom: "14px" }}>
              <p style={{ ...sml, marginBottom: "5px", color: "#b01904" }}>Next physical action</p>
              <input style={inp} value={p.nextAction} onChange={e => updateProject(p.id, "nextAction", e.target.value)} placeholder="e.g. open the wax file and cut one shape" />
              {!p.nextAction && <p style={{ fontFamily: TNR, fontSize: "12px", color: "#e8c070", marginTop: "5px" }}>Required — what is the very next physical action?</p>}
            </div>
            <div style={{ marginBottom: "12px" }}><p style={{ ...sml, marginBottom: "5px" }}>Notes</p><textarea value={p.notes} onChange={e => updateProject(p.id, "notes", e.target.value)} placeholder="Context, risks, reflections..." style={{ ...inp, minHeight: "52px", resize: "vertical", lineHeight: "1.6" }} /></div>
            <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontFamily: TNR, fontSize: "13px", color: p.isFineArt ? "#b01904" : "#888" }}>
                <input type="checkbox" checked={p.isFineArt} onChange={e => updateProject(p.id, "isFineArt", e.target.checked)} style={{ accentColor: "#b01904" }} />
                Fine art practice
              </label>
              {p.isFineArt && (
                <label style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontFamily: TNR, fontSize: "13px", color: p.isProtectedFineArt ? "#b01904" : "#888" }}>
                  <input type="checkbox" checked={p.isProtectedFineArt} onChange={e => updateProject(p.id, "isProtectedFineArt", e.target.checked)} style={{ accentColor: "#b01904" }} />
                  Protected (cannot be displaced)
                </label>
              )}
              <span style={{ marginLeft: "auto", fontFamily: TNR, fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }} onClick={() => deleteProject(p.id)}>remove</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TNR, fontSize: "14px", color: "#888" }}>
        Loading...
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen onSuccess={(p) => { setProfile(p); setIsAuthenticated(true); setAuthTimestamp(Date.now()); setSupabaseLoaded(false); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#1a1a1a", fontFamily: TNR, padding: "60px 32px 100px" }}>

      {/* ════ PROFILE EDIT OVERLAY ════ */}
      {showProfileEdit && (
        <ProfileEditScreen
          profile={profile}
          onSave={(p) => { setHasUserInteracted(true); setProfile(p); saveProfile(p); setShowProfileEdit(false); }}
          onCancel={() => setShowProfileEdit(false)}
        />
      )}

      {/* ════ STUCK OVERLAY ════ */}
      {stuckOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.97)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
          <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
            {stuckStep === 0 && (
              <>
                <p style={{ ...sml, marginBottom: "28px" }}>Stuck state</p>
                <div style={{ fontSize: "17px", lineHeight: "2", marginBottom: "36px" }}>
                  <div>What energy level</div><div>are you at right now?</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                  {ENERGY_LEVELS.map(e => (
                    <div key={e.key} onClick={() => { setStuckEnergy(e.key); setStuckStep(1); }}
                      style={{ padding: "10px 16px", cursor: "pointer", textAlign: "center" }}>
                      <span style={{ ...linkStyle, fontSize: "17px" }}>{e.label}</span>
                      <div style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginTop: "3px" }}>{e.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "32px" }}><span onClick={stuckReset} style={{ fontFamily: TNR, fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>cancel</span></div>
              </>
            )}
            {stuckStep === 1 && runway && (
              <>
                <p style={{ ...sml, marginBottom: "28px" }}>Runway</p>
                <div style={{ fontSize: "16px", lineHeight: "1.9", marginBottom: "24px" }}>{runway.note}</div>
                {runway.runwayNeeded && (
                  <div style={{ marginBottom: "24px", textAlign: "left", paddingBottom: "20px", borderBottom: "1px solid #f0f0f0" }}>
                    <p style={{ ...sml, marginBottom: "8px" }}>Start here</p>
                    <p style={{ fontFamily: TNR, fontSize: "15px", color: "#1a1a1a", lineHeight: "1.6" }}>{runway.runway}</p>
                  </div>
                )}
                <div style={{ textAlign: "left", marginBottom: "24px" }}>
                  <p style={{ ...sml, marginBottom: "10px" }}>Pick one</p>
                  {runway.actions.map((a, i) => (
                    <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a" }}>{a}</span>
                    </div>
                  ))}
                </div>
                {runway.expose && (
                  <div style={{ marginBottom: "28px", textAlign: "left", paddingTop: "12px", borderTop: "1px solid #f0f0f0" }}>
                    <p style={{ ...sml, marginBottom: "8px" }}>{runway.expose.label}</p>
                    {runway.expose.examples.map((ex, i) => (
                      <div key={i} style={{ fontFamily: TNR, fontSize: "13px", color: "#888", padding: "3px 0" }}>— {ex}</div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <span onClick={() => { stuckReset(); setTab("grid"); }} style={{ ...linkStyle, fontSize: "14px" }}>Go to grid</span>
                  <span onClick={stuckReset} style={{ fontFamily: TNR, fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px", alignSelf: "center" }}>dismiss</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <p style={{ ...sml, marginBottom: "20px" }}>{profile.name || "Your Name"}</p>
        <p style={{ ...sml, marginBottom: "20px", letterSpacing: "0.06em" }}>{profile.plannerTitle}</p>
        <div style={{ fontSize: "17px", lineHeight: "2", color: "#1a1a1a" }}>
          <div>A weekly planner for mapping making,</div>
          <div>admin, growth and systems work</div>
          <div>around occupied time.</div>
          <div>Mark your {profile.scheduleAround},</div>
          <div>fill your free</div>
          <div>blocks.</div>
        </div>
        <p style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", marginTop: "24px", marginBottom: "6px" }}>{profile.role || "Your Role"}</p>
      </div>

      {/* ── Controls row ── */}
      <div style={{ textAlign: "center", marginBottom: "36px", display: "flex", gap: "20px", justifyContent: "center", alignItems: "center" }}>
        <span onClick={() => { setStuckOpen(true); setStuckStep(0); setStuckEnergy(null); }}
          style={{ ...linkStyle, fontSize: "14px" }}>
          Feeling stuck?
        </span>
        <span onClick={() => setShowProfileEdit(true)}
          style={{ ...linkStyle, fontSize: "14px" }}>
          Edit profile
        </span>
        <span onClick={() => { logoutUser(); setIsAuthenticated(false); setSupabaseLoaded(false); setAuthTimestamp(0); }}
          style={{ ...linkStyle, fontSize: "14px" }}>
          Sign out
        </span>
      </div>

      {/* ── Sunday: which week am I planning? ── */}
      {(() => {
        const isSunday = new Date().getDay() === 0;
        if (!isSunday) return null;
        const setChoice = (choice) => {
          const today = new Date().toISOString().split("T")[0];
          localStorage.setItem("studio-planner-sunday-choice", JSON.stringify({ date: today, choice }));
          setSundayWeekChoice(choice);
        };
        const current = sundayWeekChoice;
        return (
          <div style={{ textAlign: "center", marginBottom: "28px", padding: "14px 18px", border: "1px solid #e7e7e7", borderRadius: "4px", maxWidth: "480px", margin: "0 auto 28px" }}>
            <div style={{ fontFamily: TNR, fontSize: "13px", color: "#888", marginBottom: "10px" }}>
              {current ? "Planning for:" : "It's Sunday — which week are you planning?"}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <span onClick={() => setChoice("this")}
                style={{ ...boxBtn(current === "this"), fontSize: "13px", padding: "4px 12px" }}>
                This week (Mon-Sun)
              </span>
              <span onClick={() => setChoice("next")}
                style={{ ...boxBtn(current === "next"), fontSize: "13px", padding: "4px 12px" }}>
                Next week (starts tomorrow)
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── Tabs as boxed buttons ── */}
      <div style={{ textAlign: "center", marginBottom: "52px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        {[["today","Today"],["grid","Grid"],["targets","Targets"],["quarterly","Quarterly"],["tasks","Tasks"],["plan","Plan"],["archive","Archive"]].map(([key, lbl]) => (
          <span key={key} onClick={() => setTab(key)} style={boxBtn(tab === key)}>{lbl}</span>
        ))}
      </div>

      {/* ════ TODAY ════ */}
      {tab === "today" && (
        <div style={{ maxWidth: "440px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <p style={{ ...sml, margin: 0 }}>{today}</p>
              <span style={{ fontFamily: TNR, fontSize: "13px", color: todayOver ? "#b01904" : "#888" }}>
                {todayEnergy} / {todayBudget} energy {todayOver ? "— over" : ""}
              </span>
            </div>

            {/* Energy level as plain underlined links */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "32px" }}>
              {ENERGY_LEVELS.map(e => (
                <span key={e.key} onClick={() => { setHasUserInteracted(true); setDayEnergyLevels(prev => ({ ...prev, [today]: e.key })); }}
                  style={{
                    fontFamily: TNR, fontSize: "14px", cursor: "pointer",
                    color: dayEnergyLevels[today] === e.key ? LINK_BLUE : "#1a1a1a",
                    textDecoration: dayEnergyLevels[today] === e.key ? "underline" : "none",
                    textUnderlineOffset: "2px",
                  }}>
                  {e.label}
                </span>
              ))}
            </div>

            {/* Today's blocks */}
            {todaySlots.length === 0 ? (
              <p style={{ fontFamily: TNR, fontSize: "15px", color: "#888", textAlign: "center", lineHeight: "2" }}>
                Nothing scheduled today.<br />Fill in the grid.
              </p>
            ) : (
              <div>
                {todaySlots.map(({ slot, mode }) => {
                  const m = MODES[mode];
                  return (
                    <div key={slot} style={{
                      display: "flex", alignItems: "baseline", gap: "16px",
                      padding: "10px 0", borderBottom: "1px solid #f0f0f0",
                    }}>
                      <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", width: "52px", flexShrink: 0 }}>{slot}</span>
                      <span style={{
                        fontFamily: TNR, fontSize: "15px",
                        color: ["growth", "comms", "systems", "making"].includes(mode)
                          ? `rgba(26, 13, 171, ${EXEC_INTENSITY[mode].opacity})`
                          : MODE_COLORS[mode]
                      }}>{m.label}</span>
                      <span style={{ fontFamily: TNR, fontSize: "12px", color: "#888" }}>
                        {m.energyCost > 0 ? `+${m.energyCost}` : m.energyCost}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next action — plain line, no card */}
          {nextAction && (
            <div style={{ marginBottom: "32px" }}>
              <p style={{ ...sml, marginBottom: "10px" }}>Next up</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", width: "52px" }}>{nextAction.slot}</span>
                <span style={{
                  fontFamily: TNR, fontSize: "16px",
                  color: ["growth", "comms", "systems", "making"].includes(nextAction.mode)
                    ? `rgba(26, 13, 171, ${EXEC_INTENSITY[nextAction.mode].opacity})`
                    : MODE_COLORS[nextAction.mode]
                }}>
                  {MODES[nextAction.mode].label}
                </span>
              </div>
            </div>
          )}

          {/* Transition buffer — plain warning text */}
          {bufferSuggestions.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <p style={{ ...sml, marginBottom: "10px" }}>Buffer suggestions</p>
              {bufferSuggestions.map((b, i) => (
                <div key={i} style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", padding: "6px 0", borderBottom: "1px solid #f0f0f0" }}>
                  Before {b.slot}: 15–30 min between {MODES[b.from]?.label} and {MODES[b.to]?.label}.
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ GRID ════ */}
      {tab === "grid" && (
        <>
          {fineArtWarning && profile.protectedPractice?.enabled && (
            <div style={{ maxWidth: "600px", margin: "0 auto 24px", textAlign: "center" }}>
              <p style={{ fontFamily: TNR, fontSize: "14px", color: "#b01904", margin: 0 }}>
                — {profile.protectedPractice.warningText}
              </p>
            </div>
          )}

          {/* Mode selector — boxed buttons, Eilidh style */}
          <div style={{ textAlign: "center", marginBottom: "12px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {Object.entries(MODES).map(([key, m]) => (
              <span key={key} onClick={() => setActiveMode(key)}
                style={{
                  display: "inline-block", padding: "5px 16px",
                  border: `1px solid ${activeMode === key ? MODE_COLORS[key] : "#1a1a1a"}`,
                  background: "#fff",
                  color: activeMode === key ? MODE_COLORS[key] : "#1a1a1a",
                  fontFamily: TNR, fontSize: "14px", cursor: "pointer", userSelect: "none",
                }}>
                {getModeLabel(key)}
              </span>
            ))}
            <span onClick={clearAll}
              style={{ fontFamily: TNR, fontSize: "13px", color: "#888", cursor: "pointer", alignSelf: "center", textDecoration: "underline", textUnderlineOffset: "2px" }}>
              clear
            </span>
          </div>

          {/* Rest subtype — smaller boxed */}
          {activeMode === "rest" && (
            <div style={{ textAlign: "center", marginBottom: "10px", display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {Object.entries(REST_TYPES).map(([key, rt]) => (
                <span key={key} onClick={() => setRestSubtype(key)}
                  style={{
                    display: "inline-block", padding: "3px 12px",
                    border: `1px solid ${restSubtype === key ? "#1a1a1a" : "#cccccc"}`,
                    background: "#fff",
                    color: restSubtype === key ? "#1a1a1a" : "#888",
                    fontFamily: TNR, fontSize: "12px", cursor: "pointer",
                  }}>
                  {rt.label}
                </span>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", fontFamily: TNR, fontSize: "13px", color: "#bbb", marginBottom: "20px" }}>
            {activeMode === "rest" ? REST_TYPES[restSubtype]?.sub : (profile.modeDescriptions?.[activeMode] || MODES[activeMode]?.sub)}
            {MODES[activeMode] && (
              <span style={{ marginLeft: "12px", color: "#ddd" }}>
                friction: {MODES[activeMode].friction} · sensory: {MODES[activeMode].sensory}
              </span>
            )}
          </div>

          {/* Per-day energy budget row — minimal Eilidh style */}
          <div style={{ marginBottom: "12px" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "44px" }}></th>
                  {DAYS.map(d => {
                    const de = getDayEnergy(d);
                    const db = getDayBudget(d);
                    const over = de > db;
                    const currentLevel = dayEnergyLevels[d] || "medium";
                    // Get this day's balance status from capacity calc
                    const dayStatus = capacity.dailyRatios?.find(r => r.day === d);
                    const isUnderRested = dayStatus?.overloaded;  // really out of balance
                    const isBalanced = dayStatus?.balanced;       // close to target
                    // Only color when truly overloaded or truly balanced; "close" stays neutral
                    const dayColor = isUnderRested ? "#b01904" : isBalanced ? "#0fa97f" : "#1a1a1a";
                    // Cycle through H/M/L on click
                    const cycleEnergy = () => {
                      setHasUserInteracted(true);
                      const next = currentLevel === "high" ? "medium" : currentLevel === "medium" ? "low" : "high";
                      setDayEnergyLevels(prev => ({ ...prev, [d]: next }));
                    };
                    return (
                      <th key={d} style={{ padding: "0 2px 12px", textAlign: "center", fontWeight: "normal" }}>
                        <div style={{ fontFamily: TNR, fontSize: "13px", color: dayColor, marginBottom: "3px", fontWeight: "normal" }}>{d.charAt(0)}</div>
                        <div onClick={cycleEnergy} style={{ 
                          fontFamily: TNR, fontSize: "9px", 
                          color: "#888", cursor: "pointer", fontWeight: "normal",
                          textDecoration: "underline", textUnderlineOffset: "2px",
                          textDecorationColor: "#ddd",
                        }}>
                          {currentLevel.charAt(0).toUpperCase()} · <span style={{ color: isUnderRested ? "#b01904" : isBalanced ? "#0fa97f" : over ? "#b01904" : "#888" }}>{de}/{db}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
            </table>
          </div>

          {/* Grid */}
          <div style={{ marginBottom: "36px" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <tbody>
                {TIME_SLOTS.map(slot => (
                  <tr key={slot}>
                    <td style={{ fontFamily: TNR, fontSize: "9px", color: "#ccc", padding: "1px 4px 1px 0", verticalAlign: "middle", width: "44px" }}>{slot}</td>
                    {DAYS.map(day => {
                      const val = schedule[day][slot];
                      const isOffice = val === "office";
                      const isWorkMode = val && ["growth", "comms", "systems", "making"].includes(val);
                      const intensity = isWorkMode ? EXEC_INTENSITY[val] : null;
                      const cellColor = isWorkMode 
                        ? `rgba(26, 13, 171, ${intensity.opacity})`  // hyperlink blue at varying opacity
                        : val ? MODE_COLORS[val] : null;
                      
                      return (
                        <td key={day} style={{ padding: "1px 1px" }}>
                          <div onClick={() => assign(day, slot)} title={val ? MODES[val]?.label : ""}
                            style={{
                              height: "26px",
                              border: `1px solid ${val ? (isOffice ? "#ddd" : cellColor || "#e8e8e8") : "#e8e8e8"}`,
                              background: val ? (isOffice ? "#f5f5f5" : cellColor) : "#fff",
                              cursor: isOffice ? "default" : "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.08s",
                            }}>
                            {isOffice
                              ? <span style={{ fontFamily: TNR, fontSize: "9px", color: "#999" }}>{getModeLabel("office").slice(0, 4).toLowerCase()}</span>
                              : val && <span style={{ fontFamily: TNR, fontSize: "10px", color: "#fff", letterSpacing: "0.02em" }}>{getModeLabel(val).slice(0, 3).toLowerCase()}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Key — 3-char abbrev + label, coloured (work modes use intensity scale) */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "36px" }}>
            {Object.entries(MODES).map(([key, m]) => {
              const isWorkMode = ["growth", "comms", "systems", "making"].includes(key);
              const intensity = isWorkMode ? EXEC_INTENSITY[key] : null;
              const color = isWorkMode 
                ? `rgba(26, 13, 171, ${intensity.opacity})`
                : MODE_COLORS[key];
              const label = getModeLabel(key);
              return (
                <span key={key} style={{ fontFamily: TNR, fontSize: "13px", color }}>
                  <span style={{ fontSize: "11px" }}>{label.slice(0, 3).toLowerCase()}</span>  {label}
                  {isWorkMode && <span style={{ fontFamily: TNR, fontSize: "10px", color: "#888" }}> ({intensity.desc})</span>}
                </span>
              );
            })}
          </div>

          {/* Export */}
          <div style={{ textAlign: "center" }}>
            <p style={{ ...sml, marginBottom: "8px" }}>Export blocks to your calendar</p>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#bbb", marginBottom: "14px" }}>
              Downloads an .ics file. Open it to add events to Google Calendar, Apple Calendar, or Outlook.
            </p>
            {!showExportPicker && (
              <span onClick={!isExporting ? openExportPicker : undefined}
                style={{ ...linkStyle, fontSize: "15px", color: isExporting ? "#bbb" : LINK_BLUE, textDecorationColor: isExporting ? "#bbb" : LINK_BLUE, cursor: isExporting ? "default" : "pointer" }}>
                {isExporting ? "Generating..." : "Download calendar file"}
              </span>
            )}
            {showExportPicker && (
              <div style={{ padding: "16px", border: "1px solid #e7e7e7", borderRadius: "4px", marginTop: "10px", textAlign: "left" }}>
                <p style={{ fontFamily: TNR, fontSize: "13px", color: "#888", marginBottom: "10px" }}>
                  Which week's blocks should be exported? Pick the <strong>Monday</strong> the week starts on.
                </p>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={e => setExportStartDate(e.target.value)}
                  style={{ fontFamily: TNR, fontSize: "14px", padding: "6px 10px", border: "1px solid #ccc", borderRadius: "3px", marginBottom: "12px", width: "100%", boxSizing: "border-box" }}
                />
                {exportStartDate && new Date(exportStartDate + "T00:00:00").getDay() !== 1 && (
                  <p style={{ fontFamily: TNR, fontSize: "12px", color: "#b01904", marginBottom: "10px" }}>
                    Note: {new Date(exportStartDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} isn't a Monday. The export will treat this date as Monday and the next 6 days as Tue-Sun.
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <span onClick={() => { setShowExportPicker(false); exportToCalendar(exportStartDate); }}
                    style={{ ...linkStyle, fontSize: "14px", cursor: "pointer" }}>
                    Download
                  </span>
                  <span onClick={() => { setShowExportPicker(false); setCalStatus(null); }}
                    style={{ fontFamily: TNR, fontSize: "14px", color: "#888", cursor: "pointer", textDecoration: "underline" }}>
                    Cancel
                  </span>
                </div>
              </div>
            )}
            {calStatus === "success" && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#0fa97f", marginTop: "10px" }}>File downloaded. Open it to import to your calendar.</p>}
            {calStatus === "error"   && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#b01904", marginTop: "10px" }}>Export failed. Try again.</p>}
            {calStatus === "empty"   && <p style={{ fontFamily: TNR, fontSize: "13px", color: "#888", marginTop: "10px" }}>No exportable blocks found.</p>}
          </div>
        </>
      )}

      {/* ════ TARGETS ════ */}
      {tab === "targets" && (
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>

          {/* Capacity — stripped to plain typographic line */}
          <div style={{ marginBottom: "40px", paddingBottom: "20px", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Weekly capacity</span>
              <span style={{ fontFamily: TNR, fontSize: "14px", color: capacity.textColor }}>{capacity.label}</span>
            </div>
            <div style={{ position: "relative", height: "1px", background: "#e8e8e8", marginBottom: "14px" }}>
              <div style={{ position: "absolute", left: "45%", width: "17%", height: "100%", background: "#1a1a1a" }} />
              <div style={{
                position: "absolute", top: "-3px",
                left: `calc(${Math.min(96, capacity.score)}% - 4px)`,
                width: "8px", height: "8px",
                background: capacity.textColor,
                transition: "left 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: capacity.flags.length ? "14px" : "0" }}>
              <span style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa" }}>Under</span>
              <span style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa" }}>Balanced</span>
              <span style={{ fontFamily: TNR, fontSize: "11px", color: "#aaa" }}>Over</span>
            </div>
            {capacity.flags.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {capacity.flags.map((f, i) => (
                  <div key={i} style={{ fontFamily: TNR, fontSize: "13px", color: "#1a1a1a", display: "flex", gap: "10px" }}>
                    <span style={{ color: "#888" }}>—</span><span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work targets */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px" }}>
            <span style={sml}>Work</span>
            <span style={{ fontFamily: TNR, fontSize: "12px", color: "#bbb" }}>{progress.filter(p => p.met).length}/{progress.length} met</span>
          </div>
          {progress.map(p => {
            const pct = Math.min(100, Math.round((p.current / p.min) * 100));
            const status = p.met ? "done" : pct >= 50 ? "progress" : pct > 0 ? "started" : "empty";
            const sc = { done: "#0fa97f", progress: "#e8c070", started: "#e8c070", empty: "#ccc" }[status];
            const sl = { done: "done", progress: "in progress", started: "started", empty: "not started" }[status];
            return (
              <div key={p.mode} style={{ display: "flex", alignItems: "baseline", gap: "20px", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: "#1a1a1a", flex: 1 }}>{p.label}</span>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: sc }}>{sl}</span>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", minWidth: "32px", textAlign: "right" }}>{p.current}/{p.min}</span>
              </div>
            );
          })}

          {/* Protected practice — only show if enabled */}
          {profile.protectedPractice?.enabled && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: "20px", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: "#1a1a1a", flex: 1 }}>{profile.protectedPractice.label} (protected)</span>
                <span style={{ fontFamily: TNR, fontSize: "13px", color: protectedFineArtMet ? "#b01904" : "#888" }}>
                  {protectedFineArtMet ? "active" : "not set"}
                </span>
              </div>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginTop: "6px", marginBottom: "36px" }}>
                Flag a Quarterly goal as "Protected" to activate.
              </p>
            </>
          )}

          {/* Health */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Health</span>
              <span style={{ fontFamily: TNR, fontSize: "12px", color: "#bbb" }}>{healthTargets.filter(Boolean).length}/{(profile.healthGoals || []).length}</span>
            </div>
            {(profile.healthGoals || []).map((label, i) => (
              <div key={i} onClick={() => { setHasUserInteracted(true); setHealthTargets(prev => {
                const next = [...prev];
                while (next.length < (profile.healthGoals || []).length) next.push(false);
                next[i] = !next[i];
                return next;
              }); }}
                style={{ display: "flex", alignItems: "baseline", gap: "14px", padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: healthTargets[i] ? "#888" : "#1a1a1a", textDecoration: healthTargets[i] ? "line-through" : "none" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Rest & daily balance */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Rest & daily balance</span>
              <span style={{ fontFamily: TNR, fontSize: "12px", color: "#aaa" }}>aim {profile.restRatio.toFixed(1)}:1</span>
            </div>
            {capacity.dailyRatios.map(r => {
              const hasAny = r.active > 0 || r.rest > 0 || r.office > 0;
              const statusText = !hasAny ? "" : r.balanced ? "balanced" : r.overloaded ? "under-rested" : "close";
              const statusColor = !hasAny ? "#ccc" : r.balanced ? "#0fa97f" : r.overloaded ? "#b01904" : "#888";
              return (
                <div key={r.day} style={{ display: "flex", alignItems: "baseline", gap: "20px", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", width: "42px" }}>{r.day}</span>
                  <span style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", flex: 1 }}>
                    {hasAny ? `${r.active + r.office} active · ${r.rest} rest${r.office > 0 ? ` (incl ${r.office} ${getModeLabel("office").toLowerCase()})` : ""}` : "—"}
                  </span>
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: statusColor }}>{statusText}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: "20px", padding: "10px 0 0" }}>
              <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888" }}>{capacity.weeklyActive} active · {capacity.restBlocks} rest</span>
              <span style={{ fontFamily: TNR, fontSize: "13px", color: capacity.weeklyRatio >= profile.restRatio * 0.8 ? "#0fa97f" : capacity.weeklyRatio < profile.restRatio * 0.4 ? "#b01904" : "#888" }}>
                {capacity.weeklyActive === 0 ? "—" : `${Math.round(capacity.weeklyRatio * 100)}% rest coverage`}
              </span>
            </div>
            <div style={{ marginTop: "24px" }}>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginBottom: "10px" }}>Mark days you actually got rest</p>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                {DAYS.map((d, i) => (
                  <span key={d} onClick={() => { setHasUserInteracted(true); setRestTargets(prev => prev.map((v, j) => j === i ? !v : v)); }}
                    style={{ fontFamily: TNR, fontSize: "14px", cursor: "pointer", color: restTargets[i] ? LINK_BLUE : "#1a1a1a", textDecoration: restTargets[i] ? "underline" : "none", textUnderlineOffset: "2px" }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Social */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Social</span>
              <span style={{ fontFamily: TNR, fontSize: "12px", color: "#aaa" }}>min 1 / max 3–4</span>
            </div>
            <div onClick={() => { setHasUserInteracted(true); setSocialDone(v => !v); }}
              style={{ display: "flex", alignItems: "baseline", gap: "14px", padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
              <span style={{ fontFamily: TNR, fontSize: "14px", color: socialDone ? "#888" : "#1a1a1a", textDecoration: socialDone ? "line-through" : "none" }}>{profile.socialGoal || "1 meaningful connection this week"}</span>
            </div>
            {countSlots("social") > 3 && <p style={{ fontFamily: TNR, fontSize: "12px", color: "#c8a050", marginTop: "8px" }}>{countSlots("social")} social slots — protect some evenings.</p>}
          </div>

          {/* Success metrics */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Week evaluation</span>
              <span style={{ fontFamily: TNR, fontSize: "12px", color: "#bbb" }}>{successMetrics.filter(Boolean).length}/{(profile.weekEvaluation || []).length}</span>
            </div>
            {(profile.weekEvaluation || []).map((label, i) => (
              <div key={i} onClick={() => { setHasUserInteracted(true); setSuccessMetrics(prev => {
                const next = [...prev];
                while (next.length < (profile.weekEvaluation || []).length) next.push(false);
                next[i] = !next[i];
                return next;
              }); }}
                style={{ display: "flex", alignItems: "baseline", gap: "14px", padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: successMetrics[i] ? "#888" : "#1a1a1a", textDecoration: successMetrics[i] ? "line-through" : "none" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Weekly checklist */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
              <span style={sml}>Checklist</span>
              <span style={{ fontFamily: TNR, fontSize: "12px", color: "#bbb" }}>{checklist.filter(Boolean).length}/{(profile.weeklyChecklist || []).length}</span>
            </div>
            {(profile.weeklyChecklist || []).map((item, i) => (
              <div key={i} onClick={() => { setHasUserInteracted(true); setChecklist(prev => {
                const next = [...prev];
                while (next.length < (profile.weeklyChecklist || []).length) next.push(false);
                next[i] = !next[i];
                return next;
              }); }}
                style={{ display: "flex", alignItems: "baseline", gap: "14px", padding: "8px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                <span style={{ fontFamily: TNR, fontSize: "15px", color: checklist[i] ? "#888" : "#1a1a1a", textDecoration: checklist[i] ? "line-through" : "none" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ QUARTERLY ════ */}
      {tab === "quarterly" && (
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "28px", flexWrap: "wrap", gap: "10px" }}>
            <span style={sml}>Quarterly goals</span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <span onClick={() => setQView("roadmap")} style={{ ...boxBtn(qView === "roadmap"), fontSize: "12px", padding: "4px 12px" }}>Roadmap</span>
              <span onClick={() => setQView("horizon")} style={{ ...boxBtn(qView === "horizon"), fontSize: "12px", padding: "4px 12px" }}>Now / Next / Later</span>
              <span onClick={addProject} style={{ ...linkStyle, fontSize: "13px", marginLeft: "4px" }}>+ Add goal</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
            {["all", ...Q_CATEGORIES].map(c => (
              <span key={c} onClick={() => setQFilter(c)}
                style={{
                  fontFamily: TNR, fontSize: "13px", cursor: "pointer",
                  color: qFilter === c ? LINK_BLUE : "#888",
                  textDecoration: qFilter === c ? "underline" : "none",
                  textUnderlineOffset: "2px",
                }}>
                {c === "all" ? "All" : c}
              </span>
            ))}
          </div>

          {projects.length === 0 && (
            <div style={{ textAlign: "center", fontFamily: TNR, fontSize: "17px", lineHeight: "2", color: "#bbb" }}>
              <div>No goals yet.</div><div>Add your first.</div>
            </div>
          )}

          {qView === "roadmap" && (
            <div>
              {/* Fine art section — always shown first if any */}
              {projects.filter(p => p.isFineArt && (qFilter === "all" || qFilter === p.category)).length > 0 && (
                <div style={{ marginBottom: "36px" }}>
                  <p style={{ ...sml, marginBottom: "14px", color: "#b5936a" }}>Fine Art Practice</p>
                  {projects.filter(p => p.isFineArt && (qFilter === "all" || qFilter === p.category)).map(p => renderProjectRow(p))}
                </div>
              )}
              {/* All other categories */}
              {Q_CATEGORIES.filter(cat => qFilter === "all" || qFilter === cat).map(cat => {
                const catProjects = projects.filter(p => !p.isFineArt && p.category === cat);
                if (catProjects.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: "32px" }}>
                    <p style={{ ...sml, marginBottom: "12px" }}>{cat}</p>
                    {catProjects.map(p => renderProjectRow(p))}
                  </div>
                );
              })}
            </div>
          )}

          {qView === "horizon" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
              {Q_HORIZONS.map(h => {
                const hProjects = projects.filter(p => p.horizon === h.key && (qFilter === "all" || qFilter === p.category));
                return (
                  <div key={h.key}>
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ fontFamily: TNR, fontSize: "17px", color: "#1a1a1a", margin: "0 0 3px" }}>{h.label}</p>
                      <p style={{ ...sml, fontSize: "10px" }}>{h.sub}</p>
                    </div>
                    {hProjects.length === 0
                      ? <p style={{ fontFamily: TNR, fontSize: "13px", color: "#aaa" }}>None.</p>
                      : hProjects.map(p => {
                        const sc = {
                          "on-track": "#0fa97f", "at-risk": "#e8c070", "behind": "#b01904",
                          "done": "#0fa97f", "not-started": "#888",
                        }[p.status] || "#888";
                        return (
                          <div key={p.id} onClick={() => { setQView("roadmap"); setEditingProject(p.id); }}
                            style={{ marginBottom: "10px", padding: "8px 0", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                              <span style={{
                                fontFamily: TNR, fontSize: "14px",
                                color: p.isFineArt ? "#b01904" : LINK_BLUE,
                                textDecoration: "underline", textUnderlineOffset: "2px",
                              }}>{p.title || "Untitled"}</span>
                              <span style={{ fontFamily: TNR, fontSize: "11px", color: sc, flexShrink: 0 }}>{p.progress}%</span>
                            </div>
                            {p.nextAction && (
                              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", margin: "3px 0 0 0" }}>→ {p.nextAction}</p>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ TASKS ════ */}
      {tab === "tasks" && (
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Add a task</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <input 
                type="text"
                placeholder="input task here"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && taskInput.trim()) {
                    setTaskInput("");
                    setCategorizedTasks(categorizeTasks(
                      (taskInput.split('\n').concat([taskInput]).join('\n')).trim()
                    ));
                  }
                }}
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                style={{
                  flex: 1, fontFamily: TNR, fontSize: "14px",
                  border: "1px solid #1a1a1a", borderRadius: "2px", padding: "10px 12px",
                  color: "#1a1a1a", outline: "none", boxSizing: "border-box"
                }}
              />
              <span onClick={() => {
                if (taskInput.trim()) {
                  const newTask = taskInput.trim();
                  setCategorizedTasks(prev => {
                    const updated = categorizeTasks(
                      [...Object.values(prev || { making: [], comms: [], growth: [], systems: [], other: [] })].flat().concat([newTask]).join('\n')
                    );
                    return updated;
                  });
                  setTaskInput("");
                }
              }}
                style={{ ...linkStyle, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", paddingTop: "10px" }}>
                Add
              </span>
            </div>
            <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888" }}>
              Type a task and press Enter or click Add. Tasks auto-sort by keywords.
            </p>
          </div>

          {/* Categorized tasks display */}
          {categorizedTasks && (
            <div>
              {["making", "comms", "growth", "systems"].map(mode => {
                const modeLabel = {
                  making: "Making",
                  comms: "Comms & Admin",
                  growth: "Growth",
                  systems: "Systems",
                }[mode];
                const modeColor = {
                  making: "#e90064",
                  comms: "#0fa97f",
                  growth: "#aed2ff",
                  systems: `rgba(26, 13, 171, 0.5)`,
                }[mode];
                const taskList = categorizedTasks[mode];
                
                if (taskList.length === 0) return null;
                
                return (
                  <div key={mode} style={{ marginBottom: "28px" }}>
                    <p style={{ fontFamily: TNR, fontSize: "16px", color: modeColor, marginBottom: "10px" }}>
                      {modeLabel} ({taskList.length})
                    </p>
                    {taskList.map((task, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "12px", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <span style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", flex: 1 }}>
                          {task}
                        </span>
                        <span onClick={() => {
                          setCategorizedTasks(prev => ({
                            ...prev,
                            [mode]: prev[mode].filter((_, idx) => idx !== i)
                          }));
                        }}
                          style={{ fontFamily: TNR, fontSize: "12px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                          remove
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Uncategorized tasks */}
              {categorizedTasks.other && categorizedTasks.other.length > 0 && (
                <div style={{ marginBottom: "28px" }}>
                  <p style={{ fontFamily: TNR, fontSize: "16px", color: "#888", marginBottom: "10px" }}>
                    Other ({categorizedTasks.other.length})
                  </p>
                  {categorizedTasks.other.map((task, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "12px", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <span style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", flex: 1 }}>
                        {task}
                      </span>
                      <span onClick={() => {
                        setCategorizedTasks(prev => ({
                          ...prev,
                          other: prev.other.filter((_, idx) => idx !== i)
                        }));
                      }}
                        style={{ fontFamily: TNR, fontSize: "12px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                        remove
                      </span>
                    </div>
                  ))}
                  <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", marginTop: "10px" }}>
                    💡 Add keywords like "email", "wax", "content", or "file" to these and they'll move to the right category.
                  </p>
                </div>
              )}

              {/* Clear all button */}
              <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #f0f0f0" }}>
                <span onClick={() => setCategorizedTasks(null)}
                  style={{ fontFamily: TNR, fontSize: "13px", color: "#888", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                  Clear all tasks
                </span>
              </div>
            </div>
          )}

          {!categorizedTasks && (
            <div style={{ textAlign: "center", fontFamily: TNR, fontSize: "15px", lineHeight: "2", color: "#888" }}>
              <div>Add your tasks above.</div>
              <div>They'll auto-sort into Making, Comms,</div>
              <div>Growth, and Systems.</div>
            </div>
          )}
        </div>
      )}

      {/* ════ PLAN ════ */}
      {tab === "plan" && (
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <div style={{ marginBottom: "44px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Week note</p>
            <textarea value={weekNote} onChange={e => { setHasUserInteracted(true); setWeekNote(e.target.value); }}
              placeholder="What's on this week? Shifts, deadlines, intentions..."
              style={{ width: "100%", minHeight: "72px", border: "none", borderBottom: "1px solid #e8e8e8", resize: "vertical", fontFamily: TNR, fontSize: "16px", color: "#1a1a1a", padding: "8px 0", outline: "none", background: "transparent", lineHeight: "1.7", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "44px" }}>
            <p style={{ ...sml, marginBottom: "18px" }}>Energy matching</p>
            {[
              {
                level: "High",
                mode: "making",
                primary: "Go straight to making",
                note: "No runway needed. Set a block, lay out materials, start.",
              },
              {
                level: "Medium",
                mode: "systems",
                primary: "Support first, then exposure",
                note: "10–15 mins organising or planning, then move to one harder task.",
              },
              {
                level: "Low",
                mode: "rest",
                primary: "Runway only — one small action",
                note: "Do the easiest available thing. One reply, one file, then stop or rest.",
              },
            ].map((e, i) => (
              <div key={i} style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "5px" }}>
                  <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", width: "56px", flexShrink: 0 }}>{e.level}</span>
                  <span style={{
                    fontFamily: TNR, fontSize: "16px",
                    color: ["growth", "comms", "systems", "making"].includes(e.mode)
                      ? `rgba(26, 13, 171, ${EXEC_INTENSITY[e.mode].opacity})`
                      : MODE_COLORS[e.mode]
                  }}>{e.primary}</span>
                </div>
                <div style={{ paddingLeft: "72px" }}>
                  <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", lineHeight: "1.7" }}>{e.note}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "44px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Runway logic</p>
            <p style={{ fontFamily: TNR, fontSize: "16px", color: "#1a1a1a", margin: 0 }}>
              Support → Exposure → Exit
            </p>
            <p style={{ fontFamily: TNR, fontSize: "13px", color: "#888", marginTop: "6px" }}>
              Organise first. One hard task. Then stop.
            </p>
          </div>
          <div style={{ marginBottom: "44px", paddingTop: "28px", borderTop: "1px solid #f0f0f0" }}>
            <p style={{ ...sml, marginBottom: "8px" }}>Archive this week</p>
            <p style={{ fontFamily: TNR, fontSize: "13px", color: "#bbb", marginBottom: "14px", lineHeight: "1.7" }}>Save a snapshot of this week's grid, targets, and notes.</p>
            <span onClick={saveWeek} style={{ ...linkStyle, fontSize: "15px" }}>Save week</span>
          </div>
          <div>
            <p style={{ ...sml, marginBottom: "8px" }}>Install as app</p>
            <p style={{ fontFamily: TNR, fontSize: "13px", color: "#bbb", lineHeight: "1.8" }}>
              iPhone: Safari → share → "Add to Home Screen".<br />
              Android: Chrome → menu → "Add to Home Screen".
            </p>
          </div>
        </div>
      )}

      {/* ════ ARCHIVE ════ */}
      {tab === "archive" && (
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {archive.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: TNR, fontSize: "17px", lineHeight: "2", color: "#bbb" }}>
              <div>No archived weeks yet.</div><div>Save a week from the Plan tab.</div>
            </div>
          ) : (() => {
            const byQuarter = {};
            archive.forEach(w => { const q = getQuarterLabel(w.weekStart); if (!byQuarter[q]) byQuarter[q] = []; byQuarter[q].push(w); });
            return Object.entries(byQuarter).map(([quarter, weeks]) => (
              <div key={quarter} style={{ marginBottom: "48px" }}>
                <p style={{ ...sml, marginBottom: "20px", textAlign: "center" }}>{quarter}</p>
                {weeks.map(w => {
                  const isOpen = expandedArchiveWeek === w.weekStart;
                  const capColor = w.capacityScore <= 60 ? "#7a9e96" : w.capacityScore <= 76 ? "#c8a050" : "#b01904";
                  const weekLabel = new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <div key={w.weekStart} style={{ marginBottom: "2px" }}>
                      <div onClick={() => setExpandedArchiveWeek(isOpen ? null : w.weekStart)}
                        style={{ display: "flex", alignItems: "baseline", gap: "18px", padding: "6px 0", cursor: "pointer" }}>
                        <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888", minWidth: "56px" }}>{weekLabel}</span>
                        <span style={{ flex: 1, textAlign: "center" }}>
                          <span style={{ ...linkStyle, fontSize: "15px" }}>
                            Week summary {isOpen ? "−" : "+"}
                          </span>
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", minWidth: "120px", justifyContent: "flex-end" }}>
                          <span style={{ fontFamily: TNR, fontSize: "13px", color: capColor }}>{w.capacityLabel}</span>
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "12px 0 18px 56px", borderBottom: "1px solid #f0f0f0", marginBottom: "8px" }}>
                          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "14px" }}>
                            <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888" }}>{w.workTargetsMet}/{w.workTargetsTotal} work targets</span>
                            <span style={{ fontFamily: TNR, fontSize: "13px", color: "#888" }}>{w.healthTargets?.filter(Boolean).length || 0}/{HEALTH_TARGETS.length} health</span>
                          </div>
                          {w.weekNote && <div style={{ marginBottom: "14px" }}><p style={{ ...sml, marginBottom: "5px" }}>Note</p><p style={{ fontFamily: TNR, fontSize: "14px", color: "#1a1a1a", lineHeight: "1.7" }}>{w.weekNote}</p></div>}
                          <div style={{ marginBottom: "12px" }}>
                            <p style={{ ...sml, marginBottom: "8px" }}>Blocks</p>
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              {Object.entries(MODES).filter(([k]) => k !== "office").map(([key, m]) => {
                                let count = 0;
                                DAYS.forEach(d => TIME_SLOTS.forEach(t => { if (w.schedule?.[d]?.[t] === key) count++; }));
                                if (count === 0) return null;
                                return (
                                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: MODE_COLORS[key], display: "inline-block" }} />
                                    <span style={{ fontFamily: TNR, fontSize: "12px", color: "#888" }}>{m.label} ×{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {w.restTargets?.some(Boolean) && (
                            <div style={{ marginBottom: "12px" }}>
                              <p style={{ ...sml, marginBottom: "7px" }}>Rest days</p>
                              <div style={{ display: "flex", gap: "5px" }}>
                                {DAYS.map((d, i) => (
                                  <span key={d} style={{ fontFamily: TNR, fontSize: "11px", padding: "2px 6px", background: w.restTargets[i] ? "#f2f2f2" : "transparent", border: `1px solid ${w.restTargets[i] ? "#ddd" : "#eee"}`, borderRadius: "2px", color: w.restTargets[i] ? "#999" : "#ddd" }}>{d}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <p style={{ ...sml, marginBottom: "7px" }}>Health</p>
                            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                              {HEALTH_TARGETS.map((ht, i) => (
                                <span key={ht.key} style={{ fontFamily: TNR, fontSize: "12px", color: w.healthTargets?.[i] ? "#7a9eb8" : "#ddd" }}>
                                  {w.healthTargets?.[i] ? "✓" : "○"} {ht.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          {w.successMetrics?.some(Boolean) && (
                            <div style={{ marginTop: "12px" }}>
                              <p style={{ ...sml, marginBottom: "7px" }}>Week evaluation</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {SUCCESS_METRICS.map((sm, i) => w.successMetrics?.[i] ? (
                                  <span key={sm.key} style={{ fontFamily: TNR, fontSize: "12px", color: "#7a9e96" }}>✓ {sm.label}</span>
                                ) : null)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      <style>{`textarea::placeholder { color: #ccc; font-family: ${TNR}; } select { font-family: ${TNR}; } * { box-sizing: border-box; }`}</style>
    </div>
  );
}

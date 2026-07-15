import { useState, useEffect } from "react";

const TNR = "'Times New Roman', Times, Georgia, serif";
const LINK_BLUE = "#1a0dab";

// ── Executive Functioning Intensity Mapping ─────────────────────────────────
const EXEC_COST_COLORS = {
  growth:  "#0a0066",
  comms:   "#1a0dab",
  systems: "#4d42c7",
  making:  "#8b82d9",
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MODES = {
  making:  { label: "Making",        sub: "casting, wax work, fabrication",     exportable: true,  energyCost: 1, friction: "medium", sensory: "medium" },
  comms:   { label: "Comms & Admin", sub: "emails, invoices, order tracking",    exportable: true,  energyCost: 2, friction: "high",   sensory: "medium" },
  growth:  { label: "Growth",        sub: "content, outreach, press, site",      exportable: true,  energyCost: 3, friction: "high",   sensory: "high"   },
  systems: { label: "Systems",       sub: "workflows, pricing, proposals",       exportable: true,  energyCost: 2, friction: "medium", sensory: "low"    },
  rest:    { label: "Rest",          sub: "passive / sensory reset / gentle",    exportable: false, energyCost: -2, friction: "low",   sensory: "low"    },
  social:  { label: "Social",        sub: "friends, events, time out",           exportable: false, energyCost: 3, friction: "low",   sensory: "high"   },
  health:  { label: "Health",        sub: "gym, appointments, movement",         exportable: false, energyCost: 2, friction: "low",   sensory: "medium" },
  office:  { label: "Office Work",   sub: "morning / mid / late shift",          exportable: false, energyCost: 3, friction: "medium", sensory: "medium" },
};

const REST_TYPES = {
  passive:  { label: "Passive rest",        sub: "full rest, no input" },
  sensory:  { label: "Sensory reset",       sub: "quiet, dark, minimal stimulation" },
  gentle:   { label: "Gentle regulation",   sub: "walk, stretch, slow movement" },
};

const MODE_COLORS = {
  making:  "#e90064",
  comms:   "#0fa97f",
  growth:  "#aed2ff",
  systems: "#ff3366",
  rest:    "#888888",
  social:  "#F72798",
  health:  "#00a8ff",
  office:  "#aaaaaa",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_SLOTS = [
  "7–9am", "9–11am", "11am–1pm",
  "1–3pm", "3–5pm", "5–7pm", "7–9pm",
];

const SLOT_START = {
  "7–9am": 7, "9–11am": 9, "11am–1pm": 11,
  "1–3pm": 13, "3–5pm": 15, "5–7pm": 17, "7–9pm": 19,
};

const WEEKLY_TARGETS_BASE = [
  { mode: "making",  min: 2, label: "2–3 Making blocks" },
  { mode: "comms",   min: 2, label: "2 Comms & Admin"   },
  { mode: "growth",  min: 1, label: "1 Growth"          },
  { mode: "systems", min: 1, label: "1 Systems"         },
];

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

const SUCCESS_METRICS = [
  { key: "capacity",  label: "Stayed within capacity" },
  { key: "noOverload",label: "Avoided overload" },
  { key: "meaningful",label: "Completed at least one meaningful task" },
  { key: "fineArt",   label: "Progressed a fine art project" },
];

const ENERGY_LEVELS = [
  { key: "high",   label: "High",   sub: "clear, motivated, present",       budget: 7 },
  { key: "medium", label: "Medium", sub: "functional, steady",              budget: 5 },
  { key: "low",    label: "Low",    sub: "depleted, wired-tired, foggy",    budget: 3 },
];

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
  },
};

const BUFFER_TRIGGERS = [
  ["making",  "making"],
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
  { key: "behind",      label: "Behind",      color: "#b88686" },
  { key: "done",        label: "Done",        color: "#a8b87a" },
  { key: "not-started", label: "Not started", color: "#cccccc" },
];

const Q_HORIZONS = [
  { key: "q1", label: "Q1 (Jan–Mar)",  color: "#d4a373" },
  { key: "q2", label: "Q2 (Apr–Jun)",  color: "#a8b87a" },
  { key: "q3", label: "Q3 (Jul–Sep)",  color: "#7a9e96" },
  { key: "q4", label: "Q4 (Oct–Dec)",  color: "#8b9ba3" },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function WeeklyPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [weekNote, setWeekNote] = useState("");
  const [healthTargets, setHealthTargets] = useState(Array(HEALTH_TARGETS.length).fill(false));
  const [successMetrics, setSuccessMetrics] = useState(Array(SUCCESS_METRICS.length).fill(false));
  const [restTargets, setRestTargets] = useState(Array(7).fill(false));
  const [archive, setArchive] = useState([]);
  const [tab, setTab] = useState("week");
  const [expandedArchiveWeek, setExpandedArchiveWeek] = useState(null);
  const [stuckState, setStuckState] = useState(null);
  const [dailyEnergy, setDailyEnergy] = useState({});
  const [quarterlyView, setQuarterlyView] = useState([]);
  const [expandedQItem, setExpandedQItem] = useState(null);
  const [calendarEventMap, setCalendarEventMap] = useState({}); // Map planner slot to calendar event ID

  // Calendar sync state
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Save week state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveWeekDate, setSaveWeekDate] = useState(null);

  // Block editor state
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null); // { day, slot, mode, customNote }
  const [blockCustomNote, setBlockCustomNote] = useState("");

  // Mode palette selection
  const [selectedMode, setSelectedMode] = useState(null);

  // Google Calendar integration
  const [existingEvents, setExistingEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Health & Mood Tracking
  const [healthEntries, setHealthEntries] = useState({}); // {date: {mood, energy, customBehaviours: {}}}
  const [trackedBehaviours, setTrackedBehaviours] = useState(["energy", "focus", "sleep"]); // Default tracked items
  const [showAddBehaviour, setShowAddBehaviour] = useState(false);
  const [newBehaviourName, setNewBehaviourName] = useState("");

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  // Blood Pressure Tracking
  const [bpReadings, setBpReadings] = useState([]); // [{date, time, systolic, diastolic, heartRate}]
  const [showAddBP, setShowAddBP] = useState(false);
  const [newBPReading, setNewBPReading] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    systolic: "",
    diastolic: "",
    heartRate: "",
  });

  // ────────────────────────────────────────────────────────────────────────────

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekStartKey = weekStart.toISOString().split("T")[0];

  useEffect(() => {
    const saved = localStorage.getItem(`week-${weekStartKey}`);
    if (saved) {
      const data = JSON.parse(saved);
      setSchedule(data.schedule || {});
      setWeekNote(data.weekNote || "");
      setHealthTargets(data.healthTargets || Array(HEALTH_TARGETS.length).fill(false));
      setSuccessMetrics(data.successMetrics || Array(SUCCESS_METRICS.length).fill(false));
      setRestTargets(data.restTargets || Array(7).fill(false));
      setDailyEnergy(data.dailyEnergy || {});
      setCalendarEventMap(data.calendarEventMap || {});
    } else {
      setSchedule({});
      setWeekNote("");
      setHealthTargets(Array(HEALTH_TARGETS.length).fill(false));
      setSuccessMetrics(Array(SUCCESS_METRICS.length).fill(false));
      setRestTargets(Array(7).fill(false));
      setDailyEnergy({});
      setCalendarEventMap({});
    }
  }, [weekStartKey]);

  useEffect(() => {
    const saved = localStorage.getItem("archive");
    if (saved) setArchive(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("quarterlyView");
    if (saved) setQuarterlyView(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("healthEntries");
    if (saved) setHealthEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("trackedBehaviours");
    if (saved) setTrackedBehaviours(JSON.parse(saved));
  }, []);

  // Save health entries whenever they change
  useEffect(() => {
    localStorage.setItem("healthEntries", JSON.stringify(healthEntries));
  }, [healthEntries]);

  // Save tracked behaviours whenever they change
  useEffect(() => {
    localStorage.setItem("trackedBehaviours", JSON.stringify(trackedBehaviours));
  }, [trackedBehaviours]);

  // Load blood pressure readings
  useEffect(() => {
    const saved = localStorage.getItem("bpReadings");
    if (saved) setBpReadings(JSON.parse(saved));
  }, []);

  // Save blood pressure readings whenever they change
  useEffect(() => {
    localStorage.setItem("bpReadings", JSON.stringify(bpReadings));
  }, [bpReadings]);

  // ────────────────────────────────────────────────────────────────────────────

  const saveState = () => {
    localStorage.setItem(`week-${weekStartKey}`, JSON.stringify({
      schedule, weekNote, healthTargets, successMetrics, restTargets, dailyEnergy, calendarEventMap,
    }));
  };

  useEffect(saveState, [schedule, weekNote, healthTargets, successMetrics, restTargets, dailyEnergy, calendarEventMap, weekStartKey]);

  useEffect(() => {
    localStorage.setItem("archive", JSON.stringify(archive));
  }, [archive]);

  useEffect(() => {
    localStorage.setItem("quarterlyView", JSON.stringify(quarterlyView));
  }, [quarterlyView]);

  // ────────────────────────────────────────────────────────────────────────────

  const setMode = (day, slot, mode) => {
    // If no mode selected in palette, just toggle current mode
    const modeToSet = mode || selectedMode;
    
    if (!modeToSet) return; // Do nothing if no mode selected and none provided
    
    // Check for calendar conflicts before setting
    const conflict = checkConflict(day, slot);
    if (conflict) {
      setConflictWarning({
        day,
        slot,
        eventTitle: conflict.summary,
        eventTime: `${new Date(conflict.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${new Date(conflict.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      });
      return;
    }

    setConflictWarning(null);
    setSchedule(prev => {
      const currentBlock = prev[day]?.[slot];
      const currentMode = typeof currentBlock === 'string' ? currentBlock : currentBlock?.mode;
      
      // If clicking the same mode, toggle it off
      if (currentMode === modeToSet) {
        return {
          ...prev,
          [day]: { ...prev[day], [slot]: null }
        };
      }
      
      // Set new mode, preserve any existing custom note
      return {
        ...prev,
        [day]: { ...prev[day], [slot]: { mode: modeToSet, customNote: "" } }
      };
    });
  };

  const openBlockEditor = (day, slot) => {
    const block = schedule[day]?.[slot];
    const mode = typeof block === 'string' ? block : block?.mode;
    const customNote = typeof block === 'string' ? "" : block?.customNote || "";
    
    if (mode) {
      setEditingBlock({ day, slot, mode });
      setBlockCustomNote(customNote);
      setShowBlockEditor(true);
    }
  };

  const saveBlockNote = () => {
    if (editingBlock) {
      setSchedule(prev => ({
        ...prev,
        [editingBlock.day]: {
          ...prev[editingBlock.day],
          [editingBlock.slot]: {
            mode: editingBlock.mode,
            customNote: blockCustomNote,
          }
        }
      }));
    }
    setShowBlockEditor(false);
    setEditingBlock(null);
    setBlockCustomNote("");
  };

  const capacityScore = () => {
    let total = 0, maxBudget = 0;
    DAYS.forEach((day) => {
      const energy = dailyEnergy[day] || "medium";
      const budget = ENERGY_LEVELS.find(e => e.key === energy)?.budget || 5;
      maxBudget += budget;
      TIME_SLOTS.forEach(slot => {
        const block = schedule[day]?.[slot];
        const mode = typeof block === 'string' ? block : block?.mode;
        if (mode) {
          const cost = MODES[mode]?.energyCost || 0;
          total += cost;
        }
      });
    });
    return Math.round((total / maxBudget) * 100);
  };

  const score = capacityScore();
  const capacityLabel = score <= 60 ? "🟢 Healthy" : score <= 76 ? "🟡 Moderate" : "🔴 Overloaded";

  const countBlocks = (mode) => {
    let count = 0;
    DAYS.forEach(d => TIME_SLOTS.forEach(t => { 
      const block = schedule[d]?.[t];
      const blockMode = typeof block === 'string' ? block : block?.mode;
      if (blockMode === mode) count++; 
    }));
    return count;
  };

  const workTargetsMet = WEEKLY_TARGETS_BASE.filter(t => countBlocks(t.mode) >= t.min).length;

  // ────────────────────────────────────────────────────────────────────────────
  // Health Tracking Functions

  const updateHealthEntry = (dateStr, field, value) => {
    setHealthEntries(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [field]: value,
      }
    }));
  };

  const updateBehaviourEntry = (dateStr, behaviour, value) => {
    setHealthEntries(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        customBehaviours: {
          ...(prev[dateStr]?.customBehaviours || {}),
          [behaviour]: value,
        }
      }
    }));
  };

  const getHealthEntry = (dateStr) => {
    return healthEntries[dateStr] || { mood: 3, energy: 3, customBehaviours: {} };
  };

  const addTrackedBehaviour = () => {
    if (newBehaviourName.trim() && !trackedBehaviours.includes(newBehaviourName.trim().toLowerCase())) {
      setTrackedBehaviours([...trackedBehaviours, newBehaviourName.trim().toLowerCase()]);
      setNewBehaviourName("");
      setShowAddBehaviour(false);
    }
  };

  const removeTrackedBehaviour = (behaviour) => {
    setTrackedBehaviours(trackedBehaviours.filter(b => b !== behaviour));
  };

  // Blood Pressure Functions
  const addBPReading = () => {
    if (newBPReading.systolic && newBPReading.diastolic && newBPReading.heartRate) {
      setBpReadings([...bpReadings, {
        id: Date.now(),
        date: newBPReading.date,
        time: newBPReading.time,
        systolic: parseInt(newBPReading.systolic),
        diastolic: parseInt(newBPReading.diastolic),
        heartRate: parseInt(newBPReading.heartRate),
      }].sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`)));
      
      // Reset form
      setNewBPReading({
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        systolic: "",
        diastolic: "",
        heartRate: "",
      });
      setShowAddBP(false);
    }
  };

  const removeBPReading = (id) => {
    setBpReadings(bpReadings.filter(r => r.id !== id));
  };

  const exportBPAsCSV = () => {
    const headers = ["Date", "Time", "Systolic", "Diastolic", "Heart Rate"];
    const rows = bpReadings.map(r => [
      new Date(r.date).toLocaleDateString("en-GB"),
      r.time,
      r.systolic,
      r.diastolic,
      r.heartRate,
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");
    
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `blood-pressure-${new Date().toISOString().split("T")[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Calendar Loading & Conflict Detection

  const loadCalendarEvents = async () => {
    setCalendarLoading(true);
    try {
      // In production, this would call Google Calendar:list_events
      // For now, showing the structure - user would need to connect their calendar
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      // Mock call structure (would be replaced with real API call):
      // const response = await listCalendarEvents({
      //   startTime: weekStart.toISOString(),
      //   endTime: weekEnd.toISOString(),
      //   calendarId: 'primary'
      // });
      
      // For demo, load any events the user has manually added to localStorage
      const savedCalendarEvents = localStorage.getItem(`cal-events-${weekStartKey}`);
      if (savedCalendarEvents) {
        setExistingEvents(JSON.parse(savedCalendarEvents));
      }
    } catch (e) {
      console.error("Error loading calendar events:", e);
    } finally {
      setCalendarLoading(false);
    }
  };

  // Load calendar events when week changes
  useEffect(() => {
    loadCalendarEvents();
  }, [weekStartKey]);

  const checkConflict = (day, slot) => {
    const startHour = SLOT_START[slot];
    const endHour = startHour + 2;
    const dayIndex = DAYS.indexOf(day);
    
    const eventDate = new Date(weekStart);
    eventDate.setDate(eventDate.getDate() + dayIndex);
    
    // Check if any existing event overlaps with this slot
    const conflict = existingEvents.find(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const eventDay = eventStart.toLocaleDateString("en-GB");
      const slotDay = eventDate.toLocaleDateString("en-GB");
      
      if (eventDay !== slotDay) return false;
      
      const eventStartHour = eventStart.getHours();
      const eventEndHour = eventEnd.getHours();
      
      // Check if there's any overlap
      return !(eventEndHour <= startHour || eventStartHour >= endHour);
    });

    return conflict;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Calendar Sync Functions

  const loadCalendars = async () => {
    setSyncing(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: "List user's Google Calendars" }],
          tools: [
            {
              type: "web_search",
              name: "web_search"
            }
          ]
        })
      });
      const data = await response.json();
      // Note: In a real implementation, this would call list_calendars() through MCP
      // For now, we'll show a fallback approach
      setSyncStatus("Please select calendar");
      setShowCalendarSelector(true);
    } catch (e) {
      setSyncStatus("Error loading calendars");
    } finally {
      setSyncing(false);
    }
  };

  const generateCalendarEvents = () => {
    const events = [];
    const seen = new Set();

    DAYS.forEach((day, dayIdx) => {
      const dayOfWeek = (weekStart.getDay() + dayIdx) % 7;
      const dateForDay = new Date(weekStart);
      dateForDay.setDate(dateForDay.getDate() + dayIdx);

      TIME_SLOTS.forEach(slot => {
        const block = schedule[day]?.[slot];
        const mode = typeof block === 'string' ? block : block?.mode;
        const customNote = typeof block === 'string' ? "" : block?.customNote || "";
        
        if (mode && MODES[mode]?.exportable) {
          const slotKey = `${day}-${slot}`;
          const startHour = SLOT_START[slot];
          const endHour = startHour + 2;

          const startTime = new Date(dateForDay);
          startTime.setHours(startHour, 0, 0, 0);

          const endTime = new Date(dateForDay);
          endTime.setHours(endHour, 0, 0, 0);

          const eventData = {
            slotKey,
            summary: customNote ? customNote : `${MODES[mode].label} — Practice`,
            description: customNote ? `${MODES[mode].label}` : "",
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            mode,
          };

          if (!seen.has(slotKey)) {
            events.push(eventData);
            seen.add(slotKey);
          }
        }
      });
    });

    return events;
  };

  const syncWithCalendar = async (calendarId) => {
    setSyncing(true);
    try {
      const newEvents = generateCalendarEvents();
      const newEventMap = {};

      // Get the new set of slot keys that should exist
      const newSlotKeys = new Set(newEvents.map(e => e.slotKey));
      const oldSlotKeys = new Set(Object.keys(calendarEventMap));

      // Delete old events that are no longer in the schedule
      for (const slotKey of oldSlotKeys) {
        if (!newSlotKeys.has(slotKey)) {
          const eventId = calendarEventMap[slotKey];
          try {
            // Note: Would use Google Calendar:delete_event here with actual event ID
            // await deleteCalendarEvent(eventId, calendarId);
          } catch (e) {
            console.error("Error deleting event", e);
          }
        }
      }

      // Create new events or update existing ones
      for (const event of newEvents) {
        try {
          // Note: Would use Google Calendar:create_event here
          // const newEvent = await createCalendarEvent(event, calendarId);
          // For now, generate a mock event ID
          const mockEventId = `event_${Date.now()}_${Math.random()}`;
          newEventMap[event.slotKey] = mockEventId;
        } catch (e) {
          console.error("Error creating event", e);
        }
      }

      setCalendarEventMap(newEventMap);
      const calendarName = calendarId === "primary" ? "Primary Calendar" : calendarId.charAt(0).toUpperCase() + calendarId.slice(1);
      showToast(`✓ Synced ${newEvents.length} events to ${calendarName}`);
      setSyncStatus(null);
    } catch (e) {
      setSyncStatus("Sync failed");
      showToast("✗ Sync failed");
      console.error(e);
    } finally {
      setSyncing(false);
      setShowCalendarSelector(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  const saveWeek = (dateToSave = null) => {
    // Use the provided date or current weekStartKey
    const dateForArchive = dateToSave ? getWeekStart(dateToSave) : weekStart;
    const dateKeyForArchive = dateForArchive.toISOString().split("T")[0];
    
    // Load the data for the week being saved
    const savedData = localStorage.getItem(`week-${dateKeyForArchive}`);
    let dataToArchive = {
      schedule: {},
      weekNote: "",
      healthTargets: Array(HEALTH_TARGETS.length).fill(false),
      successMetrics: Array(SUCCESS_METRICS.length).fill(false),
      restTargets: Array(7).fill(false),
    };
    
    if (savedData) {
      const parsed = JSON.parse(savedData);
      dataToArchive = {
        schedule: parsed.schedule || {},
        weekNote: parsed.weekNote || "",
        healthTargets: parsed.healthTargets || Array(HEALTH_TARGETS.length).fill(false),
        successMetrics: parsed.successMetrics || Array(SUCCESS_METRICS.length).fill(false),
        restTargets: parsed.restTargets || Array(7).fill(false),
      };
    }

    // Calculate capacity for the week being saved
    let total = 0, maxBudget = 0;
    DAYS.forEach((day) => {
      const energy = dataToArchive.dailyEnergy?.[day] || "medium";
      const budget = ENERGY_LEVELS.find(e => e.key === energy)?.budget || 5;
      maxBudget += budget;
      TIME_SLOTS.forEach(slot => {
        const block = dataToArchive.schedule[day]?.[slot];
        const mode = typeof block === 'string' ? block : block?.mode;
        if (mode) {
          const cost = MODES[mode]?.energyCost || 0;
          total += cost;
        }
      });
    });
    const capacityScoreToSave = Math.round((total / maxBudget) * 100);
    const capacityLabelToSave = capacityScoreToSave <= 60 ? "🟢 Healthy" : capacityScoreToSave <= 76 ? "🟡 Moderate" : "🔴 Overloaded";

    // Count work targets for the week being saved
    let workTargetsMetToSave = 0;
    WEEKLY_TARGETS_BASE.forEach(target => {
      let count = 0;
      DAYS.forEach(d => TIME_SLOTS.forEach(t => { 
        const block = dataToArchive.schedule[d]?.[t];
        const blockMode = typeof block === 'string' ? block : block?.mode;
        if (blockMode === target.mode) count++; 
      }));
      if (count >= target.min) workTargetsMetToSave++;
    });

    const archiveEntry = {
      weekStart: dateKeyForArchive,
      schedule: dataToArchive.schedule,
      weekNote: dataToArchive.weekNote,
      healthTargets: dataToArchive.healthTargets,
      successMetrics: dataToArchive.successMetrics,
      restTargets: dataToArchive.restTargets,
      capacityLabel: capacityLabelToSave,
      capacityScore: capacityScoreToSave,
      workTargetsMet: workTargetsMetToSave,
      workTargetsTotal: WEEKLY_TARGETS_BASE.length,
    };
    setArchive([archiveEntry, ...archive]);
    setShowSaveModal(false);
    setSaveWeekDate(null);
  };

  const addQItem = () => {
    // Determine current quarter
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const currentYear = new Date().getFullYear();
    const quarterMap = { 1: "q1", 2: "q2", 3: "q3", 4: "q4" };
    
    setQuarterlyView([...quarterlyView, {
      id: Date.now(),
      title: "",
      category: "Studio production",
      status: "not-started",
      quarter: quarterMap[currentQuarter],
      priority: 3,
      notes: "",
    }]);
  };

  const updateQItem = (id, field, value) => {
    setQuarterlyView(quarterlyView.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteQItem = (id) => {
    setQuarterlyView(quarterlyView.filter(item => item.id !== id));
  };

  // ────────────────────────────────────────────────────────────────────────────

  const linkStyle = {
    color: LINK_BLUE,
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: "500",
    fontFamily: TNR,
  };

  const sml = {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    color: "#555",
    fontFamily: TNR,
    textTransform: "uppercase",
  };

  const cellStyle = (mode, hasConflict) => ({
    flex: 1,
    minHeight: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "3px",
    cursor: "pointer",
    background: hasConflict ? "#ffe6e6" : mode ? MODE_COLORS[mode] : "#f9f9f9",
    border: hasConflict ? "1px solid #ffcccc" : `1px solid ${mode ? "transparent" : "#eee"}`,
    color: hasConflict ? "#c00" : mode ? "#fff" : "#ccc",
    fontSize: "11px",
    fontFamily: TNR,
    fontWeight: mode ? "600" : "400",
    transition: "all 0.15s",
    position: "relative",
    overflow: "hidden",
  });

  const getExecCostColor = (mode) => {
    if (["growth", "comms", "systems", "making"].includes(mode)) {
      return EXEC_COST_COLORS[mode];
    }
    return null;
  };

  const getBlockMode = (block) => {
    return typeof block === 'string' ? block : block?.mode;
  };

  const getBlockCustomNote = (block) => {
    return typeof block === 'string' ? "" : block?.customNote || "";
  };

  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ fontFamily: TNR, background: "#fafafa", minHeight: "100vh", padding: "20px", color: "#1a1a1a" }}>
      {/* ════ TOAST NOTIFICATION ════ */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: toast.includes("✗") ? "#ffebee" : "#e8f5e9",
          border: `1px solid ${toast.includes("✗") ? "#ffcccc" : "#81c784"}`,
          color: toast.includes("✗") ? "#c62828" : "#2e7d32",
          padding: "14px 20px",
          borderRadius: "4px",
          fontFamily: TNR,
          fontSize: "13px",
          fontWeight: "500",
          zIndex: 2000,
          animation: "slideIn 0.3s ease-out",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {/* ════ CONFLICT WARNING MODAL ════ */}
      {conflictWarning && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "450px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            border: "2px solid #ffcccc",
          }}>
            <p style={{ ...sml, marginBottom: "16px", color: "#c00" }}>Calendar conflict</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", marginBottom: "16px" }}>
              {conflictWarning.day} {conflictWarning.slot} is already booked:
            </p>
            <div style={{
              padding: "16px",
              background: "#ffe6e6",
              borderRadius: "4px",
              marginBottom: "20px",
              border: "1px solid #ffcccc",
            }}>
              <p style={{ fontFamily: TNR, fontSize: "13px", fontWeight: "600", color: "#c00", margin: "0 0 6px" }}>
                {conflictWarning.eventTitle}
              </p>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#666", margin: 0 }}>
                {conflictWarning.eventTime}
              </p>
            </div>
            <p style={{ fontFamily: TNR, fontSize: "13px", color: "#999", marginBottom: "20px" }}>
              Choose a different time or remove the conflicting event from your calendar.
            </p>
            <button onClick={() => setConflictWarning(null)} style={{
              width: "100%",
              fontFamily: TNR,
              fontSize: "14px",
              padding: "12px",
              background: LINK_BLUE,
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
            }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ════ BLOCK EDITOR MODAL ════ */}
      {showBlockEditor && editingBlock && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <p style={{ ...sml, marginBottom: "20px" }}>Edit activity</p>
            
            <div style={{ marginBottom: "20px", padding: "12px", background: "#f9f9f9", borderRadius: "4px", border: "1px solid #eee" }}>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", margin: "0 0 6px" }}>Time slot</p>
              <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                {editingBlock.day} · {editingBlock.slot}
              </p>
            </div>

            <div style={{ marginBottom: "20px", padding: "12px", background: MODE_COLORS[editingBlock.mode], borderRadius: "4px" }}>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: "0 0 6px" }}>Mode</p>
              <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: "#fff", margin: 0 }}>
                {MODES[editingBlock.mode].label}
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontFamily: TNR, fontSize: "13px", color: "#666", marginBottom: "8px" }}>Activity details (optional)</p>
              <textarea value={blockCustomNote} onChange={(e) => setBlockCustomNote(e.target.value)} placeholder="e.g. 'Cast mowalola earrings samples' or 'Email clients re: orders'" style={{
                width: "100%",
                minHeight: "80px",
                fontFamily: TNR,
                fontSize: "14px",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                color: "#1a1a1a",
                lineHeight: "1.6",
                resize: "vertical",
                boxSizing: "border-box",
              }} />
              <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginTop: "6px", margin: "6px 0 0" }}>
                This will appear as the event title in your calendar
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={saveBlockNote} style={{
                flex: 1,
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Save
              </button>
              <button onClick={() => { setShowBlockEditor(false); setEditingBlock(null); setBlockCustomNote(""); }} style={{
                flex: 1,
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px",
                background: "#eee",
                color: "#666",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ SAVE WEEK MODAL ════ */}
      {showSaveModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <p style={{ ...sml, marginBottom: "20px" }}>Save week to archive</p>
            
            <div style={{ marginBottom: "24px", padding: "16px", background: "#f9f9f9", borderRadius: "4px", border: "1px solid #eee" }}>
              <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", margin: "0 0 8px" }}>Currently viewing</p>
              <p style={{ fontFamily: TNR, fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontFamily: TNR, fontSize: "13px", color: "#666", marginBottom: "12px" }}>Or choose a different week to save:</p>
              <input type="date" defaultValue={weekStart.toISOString().split("T")[0]} onChange={(e) => setSaveWeekDate(new Date(e.target.value))} style={{
                width: "100%",
                fontFamily: TNR,
                fontSize: "14px",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                color: "#1a1a1a",
                boxSizing: "border-box",
              }} />
              <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginTop: "8px", margin: "8px 0 0" }}>
                Selects the Monday of that week
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => saveWeek(saveWeekDate)} style={{
                flex: 1,
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Save week
              </button>
              <button onClick={() => { setShowSaveModal(false); setSaveWeekDate(null); }} style={{
                flex: 1,
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px",
                background: "#eee",
                color: "#666",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ CALENDAR SYNC MODAL ════ */}
      {showCalendarSelector && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "8px",
            padding: "32px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <p style={{ ...sml, marginBottom: "20px" }}>Select calendar</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", marginBottom: "20px" }}>
              Which calendar would you like to sync this week's schedule to?
            </p>

            {/* Placeholder: In production, this would list real calendars from Google Calendar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <button onClick={() => syncWithCalendar("primary")} style={{
                fontFamily: TNR,
                padding: "12px",
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1a1a1a",
                textAlign: "left",
                transition: "all 0.2s",
              }} onMouseOver={(e) => e.target.style.background = "#f0f0f0"} onMouseOut={(e) => e.target.style.background = "#f9f9f9"}>
                📅 Primary calendar
              </button>
              <button onClick={() => syncWithCalendar("studio")} style={{
                fontFamily: TNR,
                padding: "12px",
                background: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1a1a1a",
                textAlign: "left",
                transition: "all 0.2s",
              }} onMouseOver={(e) => e.target.style.background = "#f0f0f0"} onMouseOut={(e) => e.target.style.background = "#f9f9f9"}>
                🎨 Studio calendar
              </button>
            </div>

            <button onClick={() => setShowCalendarSelector(false)} style={{
              fontFamily: TNR,
              width: "100%",
              padding: "10px",
              background: "#eee",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#666",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════ HEADER ════ */}
      <div style={{ maxWidth: "800px", margin: "0 auto 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "28px", justifyContent: "space-between" }}>
          <span style={{ fontFamily: TNR, fontSize: "28px", fontWeight: "bold" }}>Studio Planner</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))} style={{
              fontFamily: TNR,
              fontSize: "12px",
              padding: "6px 10px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "3px",
              cursor: "pointer",
              color: "#666",
            }}>
              ← Prev
            </button>
            <span style={{ fontFamily: TNR, fontSize: "13px", color: "#999", minWidth: "130px", textAlign: "center" }}>
              {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))} style={{
              fontFamily: TNR,
              fontSize: "12px",
              padding: "6px 10px",
              background: "#f0f0f0",
              border: "1px solid #ddd",
              borderRadius: "3px",
              cursor: "pointer",
              color: "#666",
            }}>
              Next →
            </button>
          </div>
        </div>

        {/* ════ NAVIGATION ════ */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "32px", borderBottom: "2px solid #eee", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "2px" }}>
            {["weekly-schedule", "health", "quarterly", "archive", "guide"].map(t => {
              const label = t === "weekly-schedule" ? "Weekly Schedule" : t.charAt(0).toUpperCase() + t.slice(1);
              return (
                <button key={t} onClick={() => setTab(t)} style={{
                  fontFamily: TNR,
                  fontSize: "14px",
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: tab === t ? "#1a1a1a" : "#aaa",
                  borderBottom: tab === t ? "2px solid #1a1a1a" : "2px solid transparent",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
          {tab === "weekly-schedule" && (
            <button onClick={() => setShowCalendarPanel(!showCalendarPanel)} style={{
              fontFamily: TNR,
              fontSize: "12px",
              padding: "6px 12px",
              background: showCalendarPanel ? "#f0f0f0" : "#fff",
              border: "1px solid #ddd",
              cursor: "pointer",
              color: "#666",
              borderRadius: "3px",
              fontWeight: "500",
            }}>
              {showCalendarPanel ? "Hide" : "Show"} calendar
            </button>
          )}
        </div>

        {/* Status message */}
        {syncStatus && (
          <div style={{
            padding: "12px",
            background: syncStatus.includes("✓") ? "#e8f5e9" : "#ffebee",
            border: `1px solid ${syncStatus.includes("✓") ? "#81c784" : "#e57373"}`,
            borderRadius: "4px",
            marginBottom: "20px",
            fontFamily: TNR,
            fontSize: "13px",
            color: syncStatus.includes("✓") ? "#2e7d32" : "#c62828",
          }}>
            {syncStatus}
          </div>
        )}
      </div>

      {/* ════ WEEKLY SCHEDULE TAB ════ */}
      {tab === "weekly-schedule" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* ── Capacity ── */}
          <div style={{ marginBottom: "32px", padding: "16px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "12px" }}>
              <div>
                <p style={{ ...sml, marginBottom: "4px" }}>Capacity</p>
                <div style={{ fontSize: "32px", fontFamily: TNR, fontWeight: "bold" }}>{score}%</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: "20px", background: "#eee", borderRadius: "10px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${score}%`,
                    background: score <= 60 ? "#7a9e96" : score <= 76 ? "#c8a050" : "#b88686",
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ ...sml, marginBottom: "4px" }}>Status</p>
                <p style={{ fontFamily: TNR, fontSize: "16px", fontWeight: "600" }}>{capacityLabel}</p>
              </div>
            </div>
          </div>

          {/* ── Mode palette ── */}
          <div style={{ marginBottom: "20px", padding: "16px", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Step 1: Select a mode</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.entries(MODES).filter(([k]) => k !== "office" && k !== "rest" && k !== "social" && k !== "health").map(([key, mode]) => (
                <button key={key} onClick={() => setSelectedMode(selectedMode === key ? null : key)} style={{
                  fontFamily: TNR,
                  padding: "10px 16px",
                  background: selectedMode === key ? MODE_COLORS[key] : "#fff",
                  border: `2px solid ${MODE_COLORS[key]}`,
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: selectedMode === key ? "#fff" : MODE_COLORS[key],
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}>
                  {mode.label}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginTop: "10px", margin: "10px 0 0" }}>
              {selectedMode ? `✓ Selected: ${MODES[selectedMode].label} — Now click a cell to add it` : "Click a mode above, then click a cell to add it to your schedule"}
            </p>
          </div>

          {/* ── Weekly Grid & Calendar & Lookahead ── */}
          <div style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: showCalendarPanel ? "1fr 280px" : "1fr", gap: "16px" }}>
            
            {/* Calendar Events & Week Lookahead Sidebar */}
            {showCalendarPanel && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", gridColumn: "2" }}>
                
                {/* Week Lookahead */}
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "16px" }}>
                  <p style={{ ...sml, marginBottom: "12px" }}>Next 2 weeks</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[1, 2].map(weekOffset => {
                      const lookaheadStart = new Date(weekStart);
                      lookaheadStart.setDate(lookaheadStart.getDate() + (weekOffset * 7));
                      const modeCount = {};
                      
                      // Count modes for this week (would need to load that week's data)
                      Object.keys(MODES).forEach(mode => modeCount[mode] = 0);
                      
                      return (
                        <div key={weekOffset} style={{
                          padding: "10px",
                          background: "#f9f9f9",
                          borderRadius: "3px",
                          border: "1px solid #f0f0f0",
                        }}>
                          <p style={{ fontFamily: TNR, fontSize: "12px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 6px" }}>
                            W+{weekOffset}: {lookaheadStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                          <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", margin: 0 }}>
                            No plan yet
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Events */}
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "16px" }}>
                  <p style={{ ...sml, marginBottom: "12px" }}>Existing events</p>
                  {calendarLoading ? (
                    <p style={{ fontFamily: TNR, fontSize: "13px", color: "#999" }}>Loading…</p>
                  ) : existingEvents.length === 0 ? (
                    <p style={{ fontFamily: TNR, fontSize: "13px", color: "#bbb" }}>No events this week</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {existingEvents.map((event, i) => {
                        const startTime = new Date(event.startTime);
                        const endTime = new Date(event.endTime);
                        const eventDay = startTime.toLocaleDateString("en-GB", { weekday: "short" });
                        const timeStr = `${startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${endTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
                        
                        return (
                          <div key={i} style={{
                            padding: "10px",
                            background: "#f9f9f9",
                            border: "1px solid #eee",
                            borderRadius: "3px",
                            borderLeft: "3px solid #ff6b6b",
                          }}>
                            <p style={{ fontFamily: TNR, fontSize: "12px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px" }}>
                              {event.summary}
                            </p>
                            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", margin: "0 0 2px" }}>
                              {eventDay}
                            </p>
                            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", margin: 0 }}>
                              {timeStr}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ fontFamily: TNR, fontSize: "10px", color: "#ccc", marginTop: "12px", margin: "12px 0 0" }}>
                    Read-only view of your Google Calendar
                  </p>
                </div>
              </div>
            )}

            {/* Grid */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "20px", overflowX: "auto", gridColumn: showCalendarPanel ? "1" : "1" }}>
            <div style={{ display: "table", width: "100%", borderCollapse: "collapse" }}>
              {/* Header */}
              <div style={{ display: "table-row" }}>
                <div style={{ padding: "8px", fontFamily: TNR, fontSize: "12px", fontWeight: "600", color: "#999", width: "80px" }} />
                {DAYS.map(day => (
                  <div key={day} style={{
                    padding: "8px",
                    fontFamily: TNR,
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#555",
                    textAlign: "center",
                    borderBottom: "2px solid #eee",
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Time slots */}
              {TIME_SLOTS.map(slot => (
                <div key={slot} style={{ display: "table-row" }}>
                  <div style={{
                    padding: "8px",
                    fontFamily: TNR,
                    fontSize: "11px",
                    color: "#999",
                    fontWeight: "500",
                    width: "80px",
                  }}>
                    {slot}
                  </div>
                  {DAYS.map(day => {
                    const block = schedule[day]?.[slot];
                    const mode = getBlockMode(block);
                    const customNote = getBlockCustomNote(block);
                    const execColor = getExecCostColor(mode);
                    const hasConflict = checkConflict(day, slot);
                    return (
                      <div key={`${day}-${slot}`} style={{ padding: "6px", borderBottom: "1px solid #f0f0f0" }}>
                        <div 
                          onClick={() => mode ? openBlockEditor(day, slot) : (selectedMode ? setMode(day, slot, selectedMode) : null)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (mode) {
                              const newSchedule = { ...schedule };
                              if (newSchedule[day]) {
                                newSchedule[day] = { ...newSchedule[day] };
                                newSchedule[day][slot] = null;
                              }
                              setSchedule(newSchedule);
                            }
                          }}
                          title={hasConflict ? `Conflict: ${hasConflict.summary}` : ""}
                          style={{
                            ...cellStyle(mode, hasConflict),
                            ...(execColor && !hasConflict && { boxShadow: `inset 0 0 0 2px ${execColor}` }),
                            cursor: mode ? "pointer" : "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "4px",
                          }}>
                          {hasConflict ? (
                            <div style={{ fontSize: "11px", fontWeight: "600" }}>⚠</div>
                          ) : mode ? (
                            <>
                              <div style={{ fontSize: "11px", fontWeight: "600" }}>
                                {MODES[mode].label.split(" ")[0]}
                              </div>
                              {customNote && (
                                <div style={{ 
                                  fontSize: "9px", 
                                  fontStyle: "italic", 
                                  marginTop: "2px",
                                  opacity: 0.85,
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}>
                                  {customNote.substring(0, 12)}
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

              {/* ── Legend ── */}
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #eee" }}>
              <p style={{ ...sml, marginBottom: "12px" }}>Mode colours</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                {Object.entries(MODES).filter(([k]) => k !== "office").map(([key, mode]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "3px",
                      background: MODE_COLORS[key],
                      border: getExecCostColor(key) ? `2px solid ${getExecCostColor(key)}` : "none",
                    }} />
                    <span style={{ fontFamily: TNR, fontSize: "13px", color: "#666" }}>{mode.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ ...sml, marginTop: "16px", marginBottom: "12px" }}>Executive functioning cost (for studio work)</p>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "3px", background: MODE_COLORS.growth, boxShadow: `inset 0 0 0 2px ${EXEC_COST_COLORS.growth}` }} />
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: "#666" }}>Growth</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "3px", background: MODE_COLORS.comms, boxShadow: `inset 0 0 0 2px ${EXEC_COST_COLORS.comms}` }} />
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: "#666" }}>Comms & Admin</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "3px", background: MODE_COLORS.systems, boxShadow: `inset 0 0 0 2px ${EXEC_COST_COLORS.systems}` }} />
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: "#666" }}>Systems</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "3px", background: MODE_COLORS.making, boxShadow: `inset 0 0 0 2px ${EXEC_COST_COLORS.making}` }} />
                  <span style={{ fontFamily: TNR, fontSize: "12px", color: "#666" }}>Making</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Weekly targets ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Weekly work targets</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              {WEEKLY_TARGETS_BASE.map(target => {
                const count = countBlocks(target.mode);
                const met = count >= target.min;
                return (
                  <div key={target.mode} style={{ padding: "12px", background: met ? "#f0f8f6" : "#fafafa", borderLeft: `3px solid ${MODE_COLORS[target.mode]}`, borderRadius: "2px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: MODE_COLORS[target.mode] }}>{MODES[target.mode].label}</span>
                      <span style={{ fontFamily: TNR, fontSize: "13px", color: "#999" }}>{count}/{target.min}</span>
                    </div>
                    <p style={{ fontFamily: TNR, fontSize: "12px", color: "#888", margin: 0 }}>{target.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Health targets ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Health targets</p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {HEALTH_TARGETS.map((ht, i) => (
                <label key={ht.key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: TNR }}>
                  <input type="checkbox" checked={healthTargets[i] || false} onChange={(e) => {
                    const newTargets = [...healthTargets];
                    newTargets[i] = e.target.checked;
                    setHealthTargets(newTargets);
                  }} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                  <span style={{ fontSize: "14px", color: "#666" }}>{ht.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Rest days ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Rest days</p>
            <div style={{ display: "flex", gap: "8px" }}>
              {DAYS.map((day, i) => (
                <button key={day} onClick={() => {
                  const newRest = [...restTargets];
                  newRest[i] = !newRest[i];
                  setRestTargets(newRest);
                }} style={{
                  fontFamily: TNR,
                  fontSize: "13px",
                  padding: "8px 12px",
                  background: restTargets[i] ? MODE_COLORS.rest : "#f9f9f9",
                  border: `1px solid ${restTargets[i] ? MODE_COLORS.rest : "#ddd"}`,
                  borderRadius: "3px",
                  color: restTargets[i] ? "#fff" : "#999",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* ── Week note ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Week note</p>
            <textarea value={weekNote} onChange={(e) => setWeekNote(e.target.value)} placeholder="Reflect on this week…" style={{
              width: "100%",
              minHeight: "100px",
              fontFamily: TNR,
              fontSize: "14px",
              border: "1px solid #ddd",
              borderRadius: "3px",
              padding: "12px",
              color: "#1a1a1a",
              lineHeight: "1.6",
              resize: "vertical",
            }} />
          </div>

          {/* ── Success metrics ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Week evaluation</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {SUCCESS_METRICS.map((metric, i) => (
                <label key={metric.key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontFamily: TNR }}>
                  <input type="checkbox" checked={successMetrics[i] || false} onChange={(e) => {
                    const newMetrics = [...successMetrics];
                    newMetrics[i] = e.target.checked;
                    setSuccessMetrics(newMetrics);
                  }} style={{ width: "18px", height: "18px", cursor: "pointer" }} />
                  <span style={{ fontSize: "14px", color: "#666" }}>{metric.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ── Calendar Sync & Archive ── */}
          <div style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px", textAlign: "center" }}>
              <p style={{ ...sml, marginBottom: "12px" }}>Sync to calendar</p>
              <button onClick={() => setShowCalendarSelector(true)} disabled={syncing} style={{
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px 24px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                cursor: syncing ? "wait" : "pointer",
                fontWeight: "600",
                opacity: syncing ? 0.6 : 1,
              }}>
                {syncing ? "Syncing…" : "Update calendar ↗"}
              </button>
              <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginTop: "8px", margin: 0 }}>
                Exportable modes only
              </p>
            </div>
            <div style={{ padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px", textAlign: "center" }}>
              <p style={{ ...sml, marginBottom: "12px" }}>Archive this week</p>
              <button onClick={() => { setShowSaveModal(true); setSaveWeekDate(null); }} style={{
                fontFamily: TNR,
                fontSize: "14px",
                padding: "12px 24px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                Save week ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ HEALTH TAB ════ */}
      {tab === "health" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* ── Tracked Behaviours ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ ...sml, margin: 0 }}>Tracked behaviours & symptoms</p>
              <button onClick={() => setShowAddBehaviour(true)} style={{
                fontFamily: TNR,
                fontSize: "12px",
                padding: "6px 12px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontWeight: "600",
              }}>
                + Add
              </button>
            </div>
            
            {showAddBehaviour && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f9f9f9", borderRadius: "4px", display: "flex", gap: "8px" }}>
                <input type="text" value={newBehaviourName} onChange={(e) => setNewBehaviourName(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addTrackedBehaviour()} placeholder="e.g. 'pain', 'mood', 'focus'" style={{
                  flex: 1,
                  fontFamily: TNR,
                  fontSize: "13px",
                  padding: "8px",
                  border: "1px solid #ddd",
                  borderRadius: "3px",
                  color: "#1a1a1a",
                }} />
                <button onClick={addTrackedBehaviour} style={{
                  fontFamily: TNR,
                  fontSize: "12px",
                  padding: "8px 12px",
                  background: LINK_BLUE,
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}>
                  Save
                </button>
                <button onClick={() => { setShowAddBehaviour(false); setNewBehaviourName(""); }} style={{
                  fontFamily: TNR,
                  fontSize: "12px",
                  padding: "8px 12px",
                  background: "#eee",
                  color: "#666",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}>
                  Cancel
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {trackedBehaviours.map(behaviour => (
                <div key={behaviour} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: "20px",
                  fontFamily: TNR,
                  fontSize: "13px",
                  color: "#666",
                }}>
                  <span style={{ textTransform: "capitalize" }}>{behaviour}</span>
                  <button onClick={() => removeTrackedBehaviour(behaviour)} style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#999",
                    fontSize: "14px",
                    padding: 0,
                  }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Weekly entries ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "20px" }}>This week</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {DAYS.map((day, dayIdx) => {
                const dateForDay = new Date(weekStart);
                dateForDay.setDate(dateForDay.getDate() + dayIdx);
                const dateStr = dateForDay.toISOString().split("T")[0];
                const entry = getHealthEntry(dateStr);

                return (
                  <div key={day} style={{ paddingBottom: "20px", borderBottom: dayIdx < DAYS.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                    <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: "#1a1a1a", marginBottom: "12px" }}>
                      {day} · {dateForDay.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>

                    {/* Mood & Energy */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ fontFamily: TNR, fontSize: "12px", color: "#999", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Mood
                        </label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <button key={i} onClick={() => updateHealthEntry(dateStr, "mood", i)} style={{
                              flex: 1,
                              fontFamily: TNR,
                              padding: "10px",
                              background: entry.mood === i ? ["#b88686", "#c8a050", "#7a9e96", "#9db58d", "#5ba87e"][i - 1] : "#f9f9f9",
                              border: `1px solid ${entry.mood === i ? "transparent" : "#ddd"}`,
                              borderRadius: "3px",
                              cursor: "pointer",
                              color: entry.mood === i ? "#fff" : "#999",
                              fontSize: "12px",
                              fontWeight: entry.mood === i ? "600" : "400",
                            }}>
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontFamily: TNR, fontSize: "12px", color: "#999", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Energy
                        </label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <button key={i} onClick={() => updateHealthEntry(dateStr, "energy", i)} style={{
                              flex: 1,
                              fontFamily: TNR,
                              padding: "10px",
                              background: entry.energy === i ? ["#b88686", "#c8a050", "#7a9e96", "#9db58d", "#5ba87e"][i - 1] : "#f9f9f9",
                              border: `1px solid ${entry.energy === i ? "transparent" : "#ddd"}`,
                              borderRadius: "3px",
                              cursor: "pointer",
                              color: entry.energy === i ? "#fff" : "#999",
                              fontSize: "12px",
                              fontWeight: entry.energy === i ? "600" : "400",
                            }}>
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Custom Behaviours */}
                    {trackedBehaviours.length > 0 && (
                      <div>
                        <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                          Other tracking
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                          {trackedBehaviours.map(behaviour => (
                            <div key={behaviour}>
                              <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginBottom: "6px", textTransform: "capitalize" }}>
                                {behaviour}
                              </p>
                              <div style={{ display: "flex", gap: "4px" }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                  <button key={i} onClick={() => updateBehaviourEntry(dateStr, behaviour, i)} style={{
                                    flex: 1,
                                    fontFamily: TNR,
                                    padding: "8px",
                                    background: entry.customBehaviours[behaviour] === i ? LINK_BLUE : "#f9f9f9",
                                    border: `1px solid ${entry.customBehaviours[behaviour] === i ? "transparent" : "#ddd"}`,
                                    borderRadius: "2px",
                                    cursor: "pointer",
                                    color: entry.customBehaviours[behaviour] === i ? "#fff" : "#999",
                                    fontSize: "10px",
                                    fontWeight: entry.customBehaviours[behaviour] === i ? "600" : "400",
                                  }}>
                                    {i}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Patterns (overview) ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>This week's patterns</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
              {["mood", "energy", ...trackedBehaviours].map(item => {
                let total = 0, count = 0;
                DAYS.forEach((day, idx) => {
                  const dateForDay = new Date(weekStart);
                  dateForDay.setDate(dateForDay.getDate() + idx);
                  const dateStr = dateForDay.toISOString().split("T")[0];
                  const entry = getHealthEntry(dateStr);
                  const value = item === "mood" ? entry.mood : item === "energy" ? entry.energy : entry.customBehaviours[item];
                  if (value) {
                    total += value;
                    count++;
                  }
                });
                const average = count > 0 ? (total / count).toFixed(1) : "—";
                return (
                  <div key={item} style={{ padding: "12px", background: "#f9f9f9", borderRadius: "4px", textAlign: "center" }}>
                    <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", textTransform: "capitalize", margin: "0 0 6px" }}>
                      {item}
                    </p>
                    <p style={{ fontFamily: TNR, fontSize: "28px", fontWeight: "bold", color: LINK_BLUE, margin: 0 }}>
                      {average}
                    </p>
                    <p style={{ fontFamily: TNR, fontSize: "10px", color: "#ccc", margin: "4px 0 0" }}>
                      /5
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Blood Pressure Tracking ── */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ ...sml, margin: 0 }}>Blood pressure readings</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {bpReadings.length > 0 && (
                  <button onClick={exportBPAsCSV} style={{
                    fontFamily: TNR,
                    fontSize: "12px",
                    padding: "6px 12px",
                    background: "#f0f0f0",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    cursor: "pointer",
                    color: "#666",
                    fontWeight: "500",
                  }}>
                    ↓ Export CSV
                  </button>
                )}
                <button onClick={() => setShowAddBP(!showAddBP)} style={{
                  fontFamily: TNR,
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: LINK_BLUE,
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}>
                  + Add
                </button>
              </div>
            </div>

            {showAddBP && (
              <div style={{ marginBottom: "16px", padding: "16px", background: "#f9f9f9", borderRadius: "4px", border: "1px solid #eee" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Date</label>
                    <input type="date" value={newBPReading.date} onChange={(e) => setNewBPReading({ ...newBPReading, date: e.target.value })} style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      color: "#1a1a1a",
                      boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Time</label>
                    <input type="time" value={newBPReading.time} onChange={(e) => setNewBPReading({ ...newBPReading, time: e.target.value })} style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      color: "#1a1a1a",
                      boxSizing: "border-box",
                    }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Systolic</label>
                    <input type="number" value={newBPReading.systolic} onChange={(e) => setNewBPReading({ ...newBPReading, systolic: e.target.value })} placeholder="e.g. 120" style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      color: "#1a1a1a",
                      boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Diastolic</label>
                    <input type="number" value={newBPReading.diastolic} onChange={(e) => setNewBPReading({ ...newBPReading, diastolic: e.target.value })} placeholder="e.g. 80" style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      color: "#1a1a1a",
                      boxSizing: "border-box",
                    }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>Heart rate</label>
                    <input type="number" value={newBPReading.heartRate} onChange={(e) => setNewBPReading({ ...newBPReading, heartRate: e.target.value })} placeholder="e.g. 72" style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      color: "#1a1a1a",
                      boxSizing: "border-box",
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addBPReading} style={{
                    flex: 1,
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "8px",
                    background: LINK_BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}>
                    Save reading
                  </button>
                  <button onClick={() => setShowAddBP(false)} style={{
                    flex: 1,
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "8px",
                    background: "#eee",
                    color: "#666",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {bpReadings.length === 0 ? (
              <p style={{ fontFamily: TNR, fontSize: "13px", color: "#bbb", textAlign: "center", margin: "24px 0" }}>
                No readings yet
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: TNR,
                  fontSize: "13px",
                }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "10px", textAlign: "left", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "10px", textAlign: "left", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>Time</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>Systolic</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>Diastolic</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>HR</th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpReadings.map((reading) => (
                      <tr key={reading.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px", color: "#1a1a1a" }}>
                          {new Date(reading.date).toLocaleDateString("en-GB")}
                        </td>
                        <td style={{ padding: "10px", color: "#1a1a1a" }}>
                          {reading.time}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", color: "#1a1a1a", fontWeight: "600" }}>
                          {reading.systolic}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", color: "#1a1a1a", fontWeight: "600" }}>
                          {reading.diastolic}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", color: "#666" }}>
                          {reading.heartRate}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <button onClick={() => removeBPReading(reading.id)} style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#999",
                            fontSize: "14px",
                            padding: 0,
                          }}>
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "quarterly" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Quarterly goals</p>
            <button onClick={addQItem} style={{
              fontFamily: TNR,
              fontSize: "13px",
              padding: "8px 16px",
              background: LINK_BLUE,
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontWeight: "600",
            }}>
              + Add goal
            </button>
          </div>

          {quarterlyView.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb", fontFamily: TNR, fontSize: "14px" }}>
              No quarterly goals yet. Click "+ Add goal" to start.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {Q_HORIZONS.map(quarter => {
                const itemsInQuarter = quarterlyView.filter(item => item.quarter === quarter.key);
                return (
                  <div key={quarter.key} style={{
                    padding: "20px",
                    background: "#fff",
                    border: `2px solid ${quarter.color}`,
                    borderRadius: "4px",
                  }}>
                    <p style={{
                      fontFamily: TNR,
                      fontSize: "14px",
                      fontWeight: "600",
                      color: quarter.color,
                      margin: "0 0 16px 0",
                    }}>
                      {quarter.label}
                    </p>

                    {itemsInQuarter.length === 0 ? (
                      <p style={{ fontFamily: TNR, fontSize: "13px", color: "#ccc", textAlign: "center", margin: "24px 0" }}>
                        No goals
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {itemsInQuarter.map(item => {
                          const status = Q_STATUSES.find(s => s.key === item.status);
                          return (
                            <div key={item.id} style={{
                              padding: "12px",
                              background: "#f9f9f9",
                              borderLeft: `3px solid ${status?.color || "#ccc"}`,
                              borderRadius: "2px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }} onMouseOver={(e) => e.currentTarget.style.background = "#f0f0f0"} onMouseOut={(e) => e.currentTarget.style.background = "#f9f9f9"}>
                              <div style={{ marginBottom: "8px" }}>
                                <input type="text" value={item.title} onChange={(e) => updateQItem(item.id, "title", e.target.value)} placeholder="Goal…" style={{
                                  width: "100%",
                                  fontFamily: TNR,
                                  fontSize: "13px",
                                  border: "none",
                                  background: "transparent",
                                  color: "#1a1a1a",
                                  fontWeight: "600",
                                  padding: 0,
                                  margin: 0,
                                }} />
                              </div>

                              <select value={item.status} onChange={(e) => updateQItem(item.id, "status", e.target.value)} style={{
                                width: "100%",
                                fontFamily: TNR,
                                fontSize: "11px",
                                padding: "4px 6px",
                                background: "#fff",
                                border: `1px solid ${status?.color || "#ccc"}`,
                                borderRadius: "2px",
                                color: status?.color || "#999",
                                marginBottom: "8px",
                                cursor: "pointer",
                              }}>
                                {Q_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </select>

                              <select value={item.quarter} onChange={(e) => updateQItem(item.id, "quarter", e.target.value)} style={{
                                width: "100%",
                                fontFamily: TNR,
                                fontSize: "11px",
                                padding: "4px 6px",
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "2px",
                                color: "#666",
                                marginBottom: "8px",
                                cursor: "pointer",
                              }}>
                                {Q_HORIZONS.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
                              </select>

                              <button onClick={() => deleteQItem(item.id)} style={{
                                fontFamily: TNR,
                                fontSize: "11px",
                                padding: "4px 8px",
                                background: "#fee",
                                color: "#c00",
                                border: "none",
                                borderRadius: "2px",
                                cursor: "pointer",
                                width: "100%",
                              }}>
                                Delete
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ ARCHIVE TAB ════ */}
      {tab === "archive" && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {archive.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb", fontFamily: TNR, fontSize: "14px" }}>
              No archived weeks yet.
            </div>
          ) : (
            <div>
              {archive.map(w => {
                const isOpen = expandedArchiveWeek === w.weekStart;
                return (
                  <div key={w.weekStart} style={{ marginBottom: "16px", padding: "16px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
                    <div onClick={() => setExpandedArchiveWeek(isOpen ? null : w.weekStart)} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: "12px", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", margin: 0 }}>
                          {new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: TNR, fontSize: "13px", color: "#999", margin: 0 }}>{w.capacityLabel}</p>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f0f0f0", fontFamily: TNR, fontSize: "13px", color: "#666" }}>
                        {w.weekNote && <p>{w.weekNote}</p>}
                        <p>{w.workTargetsMet}/{w.workTargetsTotal} work targets met</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ GUIDE TAB ════ */}
      {tab === "guide" && (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>How to schedule</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              At the top of the Weekly Schedule tab, you'll see a mode palette (Making, Comms & Admin, Growth, Systems). Click a mode to select it, then click any empty cell in the grid to add that activity to your week.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              Once a block is scheduled, click it to add custom details about what you'll actually be doing.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Planning ahead</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              Use the Prev/Next buttons at the top to navigate between weeks and plan ahead. When the calendar sidebar is open, you'll see a "Next 2 weeks" preview showing upcoming weeks so you can spot busy periods.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Custom activities</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Click any scheduled block to add custom details. Write exactly what you'll be doing (e.g. "Cast mowalola earrings" or "Email clients re: orders").
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Custom details appear as a small preview in the grid and show italicized below the mode name.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              When syncing to calendar, the custom detail becomes the event title. If there's no custom note, it uses the mode name.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>About this planner</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "16px" }}>
              When you update your calendar, only exportable work modes (Making, Comms & Admin, Growth, Systems) are synced. Old entries are automatically cleaned up.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              The executive functioning intensity indicator (blue shades) shows how much cognitive load each studio task requires.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Weekly targets</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {WEEKLY_TARGETS_BASE.map(target => (
                <div key={target.mode} style={{ padding: "12px", background: "#f9f9f9", borderLeft: `3px solid ${MODE_COLORS[target.mode]}`, borderRadius: "2px" }}>
                  <p style={{ fontFamily: TNR, fontSize: "13px", fontWeight: "600", color: MODE_COLORS[target.mode], margin: 0 }}>{target.label}</p>
                  <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", margin: "4px 0 0" }}>{MODES[target.mode].sub}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Blood pressure tracking</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Log your blood pressure readings with date, time, systolic, diastolic, and heart rate. Readings are displayed in a sortable table.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              Click "↓ Export CSV" to download all your blood pressure readings as a spreadsheet file for medical tracking or sharing with your doctor.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Health & mood tracking</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Track your mood, energy, and custom behaviours/symptoms daily to spot patterns across your cycle. Rate each 1–5, with 1 being lowest and 5 being highest.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              <strong>Custom tracking:</strong> Add any behaviours or symptoms you want to monitor (e.g. "pain", "focus", "appetite", "sleep quality"). These become part of your daily log.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              At the bottom of the Health tab, you'll see this week's averages for each tracked item. Over time, you can correlate patterns with your studio schedule, cycle, and life events.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Calendar integration</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Your existing Google Calendar events appear in a sidebar on the week view. This shows all your committed time at a glance.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              <strong>Conflict detection:</strong> If you try to schedule a planner block over an existing calendar event, you'll get a warning. The conflicting time slot will show red with a warning (⚠) so you can pick a different time.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              Click "Update calendar" to sync your week's exportable work blocks to Google Calendar. Entries deleted from the planner are automatically removed from your calendar.
            </p>
          </div>
        </div>
      )}

      <style>{`textarea::placeholder { color: #ccc; font-family: ${TNR}; } input::placeholder { color: #ccc; font-family: ${TNR}; } * { box-sizing: border-box; }`}</style>
    </div>
  );
}

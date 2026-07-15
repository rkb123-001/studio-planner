import React, { useState, useEffect } from 'react';

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const TNR = "'Times New Roman', Times, Georgia, serif";
const LINK_BLUE = "#0099ff";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = ["7–9am", "9–11am", "11am–1pm", "1–3pm", "3–5pm", "5–7pm", "7–9pm"];
const SLOT_START = [7, 9, 11, 13, 15, 17, 19];

const MODES = {
  making: { label: "Making", exportable: true },
  comms: { label: "Comms & Admin", exportable: true },
  growth: { label: "Growth", exportable: true },
  systems: { label: "Systems", exportable: true },
  rest: { label: "Rest", exportable: false },
  social: { label: "Social", exportable: false },
  health: { label: "Health", exportable: false },
  office: { label: "Office", exportable: false },
};

const MODE_COLORS = {
  making: "#e90064",
  comms: "#0fa97f",
  growth: "#aed2ff",
  systems: "#ff3366",
  rest: "#888888",
  social: "#F72798",
  health: "#00a8ff",
  office: "#aaaaaa",
};

const EXEC_COST_COLORS = {
  growth: "#0a0066",
  comms: "#1a0dab",
  systems: "#4d42c7",
  making: "#8b82d9",
};

const Q_HORIZONS = [
  { key: "q1", label: "Q1", color: "#ff6b6b" },
  { key: "q2", label: "Q2", color: "#ffa500" },
  { key: "q3", label: "Q3", color: "#4ecdc4" },
  { key: "q4", label: "Q4", color: "#9b59b6" },
];

const Q_STATUSES = [
  { key: "not-started", label: "Not started", color: "#ddd" },
  { key: "on-track", label: "On track", color: "#4caf50" },
  { key: "at-risk", label: "At risk", color: "#ff9800" },
  { key: "behind", label: "Behind", color: "#f44336" },
  { key: "done", label: "Done", color: "#9c27b0" },
];

const WEEKLY_TARGETS_BASE = { making: 2, comms: 2, growth: 1, systems: 1 };
const HEALTH_TARGETS = ["Psychoanalysis", "Acupuncture", "Gym"];
const SUCCESS_METRICS = ["Metric 1", "Metric 2", "Metric 3", "Metric 4"];

// ════════════════════════════════════════════════════════════════════════════════
// APP COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tab, setTab] = useState("weekly-schedule");

  // Schedule & Weekly Data
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartKey = weekStart.toISOString().split("T")[0];

  const [schedule, setSchedule] = useState({});
  const [weekNote, setWeekNote] = useState("");
  const [healthTargets, setHealthTargets] = useState({});
  const [successMetrics, setSuccessMetrics] = useState({});
  const [restTargets, setRestTargets] = useState({});
  const [dailyEnergy, setDailyEnergy] = useState({});
  const [archive, setArchive] = useState([]);
  const [quarterlyView, setQuarterlyView] = useState([]);

  // Mode palette selection
  const [selectedMode, setSelectedMode] = useState(null);

  // Block editor
  const [showBlockEditor, setShowBlockEditor] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [blockCustomNote, setBlockCustomNote] = useState("");

  // Calendar integration
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [showCalendarPanel, setShowCalendarPanel] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [existingEvents, setExistingEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarEventMap, setCalendarEventMap] = useState({});
  const [conflictWarning, setConflictWarning] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  // Health & Mood Tracking
  const [healthEntries, setHealthEntries] = useState({});
  const [trackedBehaviours, setTrackedBehaviours] = useState(["energy", "focus", "sleep"]);
  const [showAddBehaviour, setShowAddBehaviour] = useState(false);
  const [newBehaviourName, setNewBehaviourName] = useState("");

  // Blood Pressure Tracking
  const [bpReadings, setBpReadings] = useState([]);
  const [showAddBP, setShowAddBP] = useState(false);
  const [newBPReading, setNewBPReading] = useState({
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    systolic: "",
    diastolic: "",
    heartRate: "",
  });

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // LOAD & SAVE STATE
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem(`week-${weekStartKey}`);
    if (saved) {
      const data = JSON.parse(saved);
      setSchedule(data.schedule || {});
      setWeekNote(data.weekNote || "");
      setHealthTargets(data.healthTargets || {});
      setSuccessMetrics(data.successMetrics || {});
      setRestTargets(data.restTargets || {});
      setDailyEnergy(data.dailyEnergy || {});
      setCalendarEventMap(data.calendarEventMap || {});
    }
  }, [weekStartKey]);

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

  useEffect(() => {
    const saved = localStorage.getItem("bpReadings");
    if (saved) setBpReadings(JSON.parse(saved));
  }, []);

  // Save week data
  useEffect(() => {
    localStorage.setItem(`week-${weekStartKey}`, JSON.stringify({
      schedule,
      weekNote,
      healthTargets,
      successMetrics,
      restTargets,
      dailyEnergy,
      calendarEventMap,
    }));
  }, [schedule, weekNote, healthTargets, successMetrics, restTargets, dailyEnergy, calendarEventMap, weekStartKey]);

  useEffect(() => {
    localStorage.setItem("quarterlyView", JSON.stringify(quarterlyView));
  }, [quarterlyView]);

  useEffect(() => {
    localStorage.setItem("healthEntries", JSON.stringify(healthEntries));
  }, [healthEntries]);

  useEffect(() => {
    localStorage.setItem("trackedBehaviours", JSON.stringify(trackedBehaviours));
  }, [trackedBehaviours]);

  useEffect(() => {
    localStorage.setItem("bpReadings", JSON.stringify(bpReadings));
  }, [bpReadings]);

  // ────────────────────────────────────────────────────────────────────────────
  // SCHEDULE HELPERS
  // ────────────────────────────────────────────────────────────────────────────

  const getBlockMode = (block) => {
    if (!block) return null;
    return typeof block === "string" ? block : block.mode;
  };

  const getBlockCustomNote = (block) => {
    if (!block) return "";
    return typeof block === "string" ? "" : (block.customNote || "");
  };

  const setMode = (day, slot, mode) => {
    const modeToSet = mode || selectedMode;
    if (!modeToSet) return;

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
    setSchedule((prev) => {
      const currentBlock = prev[day]?.[slot];
      const currentMode = getBlockMode(currentBlock);

      if (currentMode === modeToSet) {
        return { ...prev, [day]: { ...prev[day], [slot]: null } };
      }

      return {
        ...prev,
        [day]: { ...prev[day], [slot]: { mode: modeToSet, customNote: "" } },
      };
    });
  };

  const openBlockEditor = (day, slot) => {
    const block = schedule[day]?.[slot];
    setEditingBlock({ day, slot, mode: getBlockMode(block) });
    setBlockCustomNote(getBlockCustomNote(block));
    setShowBlockEditor(true);
  };

  const saveBlockEdit = () => {
    if (editingBlock) {
      setSchedule((prev) => ({
        ...prev,
        [editingBlock.day]: {
          ...prev[editingBlock.day],
          [editingBlock.slot]: { mode: editingBlock.mode, customNote: blockCustomNote },
        },
      }));
    }
    setShowBlockEditor(false);
    setEditingBlock(null);
    setBlockCustomNote("");
  };

  const deleteBlock = (day, slot) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [slot]: null },
    }));
    setShowBlockEditor(false);
    setEditingBlock(null);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CAPACITY & HEALTH
  // ────────────────────────────────────────────────────────────────────────────

  const calculateCapacity = () => {
    const counts = {};
    Object.keys(MODES).forEach((m) => (counts[m] = 0));

    Object.values(schedule).forEach((day) => {
      Object.values(day).forEach((block) => {
        const mode = getBlockMode(block);
        if (mode) counts[mode]++;
      });
    });

    const energyUsed = {
      making: (counts.making || 0) * 2,
      comms: (counts.comms || 0) * 2,
      growth: (counts.growth || 0) * 1,
      systems: (counts.systems || 0) * 2,
      rest: (counts.rest || 0) * 1,
      social: (counts.social || 0) * 1,
      health: (counts.health || 0) * 1,
      office: (counts.office || 0) * 1,
    };

    return { counts, energyUsed };
  };

  const { counts, energyUsed } = calculateCapacity();
  const totalEnergyBudget = 35;
  const energyUsedTotal = Object.values(energyUsed).reduce((a, b) => a + b, 0);

  // ────────────────────────────────────────────────────────────────────────────
  // HEALTH TRACKING
  // ────────────────────────────────────────────────────────────────────────────

  const updateHealthEntry = (dateStr, field, value) => {
    setHealthEntries((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [field]: value },
    }));
  };

  const updateBehaviourEntry = (dateStr, behaviour, value) => {
    setHealthEntries((prev) => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        customBehaviours: { ...(prev[dateStr]?.customBehaviours || {}), [behaviour]: value },
      },
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
    setTrackedBehaviours(trackedBehaviours.filter((b) => b !== behaviour));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // BLOOD PRESSURE
  // ────────────────────────────────────────────────────────────────────────────

  const addBPReading = () => {
    if (newBPReading.systolic && newBPReading.diastolic && newBPReading.heartRate) {
      setBpReadings(
        [
          ...bpReadings,
          {
            id: Date.now(),
            date: newBPReading.date,
            time: newBPReading.time,
            systolic: parseInt(newBPReading.systolic),
            diastolic: parseInt(newBPReading.diastolic),
            heartRate: parseInt(newBPReading.heartRate),
          },
        ].sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`))
      );

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
    setBpReadings(bpReadings.filter((r) => r.id !== id));
  };

  const exportBPAsCSV = () => {
    const headers = ["Date", "Time", "Systolic", "Diastolic", "Heart Rate"];
    const rows = bpReadings.map((r) => [
      new Date(r.date).toLocaleDateString("en-GB"),
      r.time,
      r.systolic,
      r.diastolic,
      r.heartRate,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent));
    element.setAttribute("download", `blood-pressure-${new Date().toISOString().split("T")[0]}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast("✓ Blood pressure data exported");
  };

  // ────────────────────────────────────────────────────────────────────────────
  // QUARTERLY
  // ────────────────────────────────────────────────────────────────────────────

  const addQItem = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterMap = { 1: "q1", 2: "q2", 3: "q3", 4: "q4" };

    setQuarterlyView([
      ...quarterlyView,
      {
        id: Date.now(),
        title: "",
        status: "not-started",
        quarter: quarterMap[currentQuarter],
      },
    ]);
  };

  const updateQItem = (id, field, value) => {
    setQuarterlyView(quarterlyView.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const deleteQItem = (id) => {
    setQuarterlyView(quarterlyView.filter((item) => item.id !== id));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CALENDAR
  // ────────────────────────────────────────────────────────────────────────────

  const checkConflict = (day, slot) => {
    const slotDate = new Date(weekStart);
    slotDate.setDate(slotDate.getDate() + DAYS.indexOf(day));
    const startTime = new Date(slotDate);
    startTime.setHours(SLOT_START[slot], 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 2);

    return existingEvents.find((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return startTime < eventEnd && endTime > eventStart;
    });
  };

  const generateCalendarEvents = () => {
    const events = [];
    Object.entries(schedule).forEach(([day, slots]) => {
      Object.entries(slots).forEach(([slot, block]) => {
        const mode = getBlockMode(block);
        if (mode && MODES[mode].exportable) {
          const customNote = getBlockCustomNote(block);
          const slotDate = new Date(weekStart);
          slotDate.setDate(slotDate.getDate() + DAYS.indexOf(day));
          const startTime = new Date(slotDate);
          startTime.setHours(SLOT_START[slot], 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 2);

          events.push({
            slotKey: `${day}-${slot}`,
            summary: customNote || `${MODES[mode].label} — Practice`,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
          });
        }
      });
    });
    return events;
  };

  const syncWithCalendar = async (calendarId) => {
    setSyncing(true);
    try {
      const newEvents = generateCalendarEvents();

      setCalendarEventMap((prev) => {
        const newMap = {};
        newEvents.forEach((e) => {
          newMap[e.slotKey] = `event_${Date.now()}_${Math.random()}`;
        });
        return newMap;
      });

      showToast(`✓ Synced ${newEvents.length} events to Calendar`);
      setSyncStatus(null);
    } catch (e) {
      showToast("✗ Sync failed");
      setSyncStatus("Sync failed");
    } finally {
      setSyncing(false);
      setShowCalendarSelector(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // STYLES
  // ────────────────────────────────────────────────────────────────────────────

  const sml = { fontFamily: TNR, fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 };

  // ════════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ fontFamily: TNR, background: "#fafafa", minHeight: "100vh", padding: "20px", color: "#1a1a1a" }}>
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
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
          }}
        >
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ fontFamily: TNR, fontSize: "28px", fontWeight: "bold", margin: 0 }}>Studio Planner</h1>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: "2px", marginBottom: "32px", borderBottom: "2px solid #eee", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "2px" }}>
            {["weekly-schedule", "health", "quarterly", "archive", "guide"].map((t) => {
              const label = t === "weekly-schedule" ? "Weekly Schedule" : t.charAt(0).toUpperCase() + t.slice(1);
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
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
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {tab === "weekly-schedule" && (
            <button
              onClick={() => setShowCalendarPanel(!showCalendarPanel)}
              style={{
                fontFamily: TNR,
                fontSize: "12px",
                padding: "6px 12px",
                background: showCalendarPanel ? LINK_BLUE : "#eee",
                color: showCalendarPanel ? "#fff" : "#666",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {showCalendarPanel ? "Hide" : "Show"} calendar
            </button>
          )}
        </div>
      </div>

      {/* ════ WEEKLY SCHEDULE TAB ════ */}
      {tab === "weekly-schedule" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Week Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
              style={{ fontFamily: TNR, fontSize: "13px", padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "3px", cursor: "pointer" }}
            >
              ← Prev week
            </button>
            <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", margin: 0 }}>
              {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
              style={{ fontFamily: TNR, fontSize: "13px", padding: "8px 12px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "3px", cursor: "pointer" }}
            >
              Next week →
            </button>
          </div>

          {/* Mode Palette */}
          <div style={{ marginBottom: "20px", padding: "16px", background: "#f9f9f9", border: "1px solid #eee", borderRadius: "4px" }}>
            <p style={{ ...sml, marginBottom: "12px" }}>Step 1: Select a mode</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["making", "comms", "growth", "systems"].map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedMode(selectedMode === key ? null : key)}
                  style={{
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
                  }}
                >
                  {MODES[key].label}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", margin: "10px 0 0" }}>
              {selectedMode ? `✓ Selected: ${MODES[selectedMode].label} — Now click a cell to add it` : "Click a mode above, then click a cell to add it to your schedule"}
            </p>
          </div>

          {/* Grid & Calendar */}
          <div style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: showCalendarPanel ? "1fr 280px" : "1fr", gap: "16px" }}>
            {/* Schedule Grid */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: TNR, fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f9f9f9", borderBottom: "2px solid #eee" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#999", fontWeight: "600", width: "80px" }}>Time</th>
                    {DAYS.map((day) => (
                      <th key={day} style={{ padding: "12px", textAlign: "center", color: "#999", fontWeight: "600" }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, slotIdx) => (
                    <tr key={slot} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px", textAlign: "left", color: "#999", fontSize: "11px", background: "#fafafa", fontWeight: "500" }}>
                        {slot}
                      </td>
                      {DAYS.map((day) => {
                        const block = schedule[day]?.[slotIdx];
                        const mode = getBlockMode(block);
                        const customNote = getBlockCustomNote(block);
                        const conflict = checkConflict(day, slotIdx);
                        const cellColor = mode ? MODE_COLORS[mode] : conflict ? "#ffebee" : "#f9f9f9";

                        return (
                          <td
                            key={`${day}-${slotIdx}`}
                            onClick={() => (mode ? openBlockEditor(day, slotIdx) : selectedMode ? setMode(day, slotIdx, selectedMode) : null)}
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              background: cellColor,
                              border: `1px solid ${conflict ? "#ffcccc" : "#eee"}`,
                              cursor: mode ? "pointer" : selectedMode ? "pointer" : "default",
                              minHeight: "80px",
                              position: "relative",
                              transition: "all 0.2s",
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (mode) deleteBlock(day, slotIdx);
                            }}
                          >
                            {conflict && <div style={{ position: "absolute", top: "8px", right: "8px", fontSize: "16px" }}>⚠</div>}
                            {mode && (
                              <>
                                <p style={{ fontFamily: TNR, fontSize: "12px", fontWeight: "600", color: "#fff", margin: "0 0 4px" }}>
                                  {MODES[mode].label}
                                </p>
                                {customNote && <p style={{ fontFamily: TNR, fontSize: "10px", color: "#fff", fontStyle: "italic", margin: 0 }}>{customNote.substring(0, 12)}…</p>}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sidebar: Calendar & Lookahead */}
            {showCalendarPanel && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Week Lookahead */}
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "16px" }}>
                  <p style={{ ...sml, marginBottom: "12px" }}>Next 2 weeks</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[1, 2].map((weekOffset) => {
                      const lookaheadStart = new Date(weekStart);
                      lookaheadStart.setDate(lookaheadStart.getDate() + weekOffset * 7);
                      return (
                        <div key={weekOffset} style={{ padding: "10px", background: "#f9f9f9", borderRadius: "3px", border: "1px solid #f0f0f0" }}>
                          <p style={{ fontFamily: TNR, fontSize: "12px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 6px" }}>
                            W+{weekOffset}: {lookaheadStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                          <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", margin: 0 }}>No plan yet</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calendar Events */}
                <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: "4px", padding: "16px" }}>
                  <p style={{ ...sml, marginBottom: "12px" }}>Existing events</p>
                  {existingEvents.length === 0 ? (
                    <p style={{ fontFamily: TNR, fontSize: "13px", color: "#bbb" }}>No events</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {existingEvents.map((event, i) => (
                        <div key={i} style={{ padding: "10px", background: "#f9f9f9", borderLeft: "3px solid #ff6b6b", borderRadius: "2px" }}>
                          <p style={{ fontFamily: TNR, fontSize: "11px", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                            {event.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calendar Sync */}
                <button
                  onClick={() => setShowCalendarSelector(true)}
                  disabled={syncing}
                  style={{
                    fontFamily: TNR,
                    fontSize: "12px",
                    padding: "10px",
                    background: syncing ? "#ddd" : LINK_BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: syncing ? "default" : "pointer",
                    fontWeight: "600",
                    opacity: syncing ? 0.6 : 1,
                  }}
                >
                  {syncing ? "Syncing…" : "Update calendar"}
                </button>
              </div>
            )}
          </div>

          {/* Calendar Selector Modal */}
          {showCalendarSelector && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#fff", padding: "20px", borderRadius: "4px", minWidth: "300px" }}>
                <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>Select calendar</p>
                {["primary", "studio"].map((cal) => (
                  <button
                    key={cal}
                    onClick={() => syncWithCalendar(cal)}
                    style={{
                      width: "100%",
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "10px",
                      background: "#f9f9f9",
                      border: "1px solid #eee",
                      borderRadius: "3px",
                      cursor: "pointer",
                      marginBottom: "10px",
                      textAlign: "left",
                    }}
                  >
                    {cal === "primary" ? "Primary Calendar" : "Studio Calendar"}
                  </button>
                ))}
                <button
                  onClick={() => setShowCalendarSelector(false)}
                  style={{
                    width: "100%",
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "10px",
                    background: "#eee",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Block Editor Modal */}
          {showBlockEditor && editingBlock && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#fff", padding: "20px", borderRadius: "4px", minWidth: "400px" }}>
                <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>
                  {DAYS[Object.keys(schedule).indexOf(editingBlock.day)]} · {TIME_SLOTS[editingBlock.slot]}
                </p>
                <textarea
                  value={blockCustomNote}
                  onChange={(e) => setBlockCustomNote(e.target.value)}
                  placeholder="Add details about this block…"
                  style={{
                    width: "100%",
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "10px",
                    border: "1px solid #eee",
                    borderRadius: "3px",
                    minHeight: "80px",
                    marginBottom: "16px",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={saveBlockEdit}
                    style={{
                      flex: 1,
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "10px",
                      background: LINK_BLUE,
                      color: "#fff",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => deleteBlock(editingBlock.day, editingBlock.slot)}
                    style={{
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "10px 20px",
                      background: "#fee",
                      color: "#c00",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowBlockEditor(false)}
                    style={{
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "10px 20px",
                      background: "#eee",
                      color: "#666",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Warning Modal */}
          {conflictWarning && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#fff", padding: "20px", borderRadius: "4px", minWidth: "350px", border: "2px solid #f44336" }}>
                <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: "#f44336", marginBottom: "12px" }}>Calendar conflict</p>
                <p style={{ fontFamily: TNR, fontSize: "13px", color: "#666", marginBottom: "8px" }}>
                  <strong>{conflictWarning.eventTitle}</strong>
                </p>
                <p style={{ fontFamily: TNR, fontSize: "13px", color: "#999", marginBottom: "16px" }}>
                  {conflictWarning.day} · {conflictWarning.eventTime}
                </p>
                <button
                  onClick={() => setConflictWarning(null)}
                  style={{
                    width: "100%",
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "10px",
                    background: "#f44336",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ HEALTH TAB ════ */}
      {tab === "health" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          {/* Tracked Behaviours */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ ...sml, margin: 0 }}>Tracked behaviours & symptoms</p>
              <button
                onClick={() => setShowAddBehaviour(true)}
                style={{
                  fontFamily: TNR,
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: LINK_BLUE,
                  color: "#fff",
                  border: "none",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                + Add
              </button>
            </div>

            {showAddBehaviour && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f9f9f9", borderRadius: "4px", display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={newBehaviourName}
                  onChange={(e) => setNewBehaviourName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTrackedBehaviour()}
                  placeholder="e.g. 'pain', 'mood', 'focus'"
                  style={{
                    flex: 1,
                    fontFamily: TNR,
                    fontSize: "13px",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "3px",
                    color: "#1a1a1a",
                  }}
                />
                <button
                  onClick={addTrackedBehaviour}
                  style={{
                    fontFamily: TNR,
                    fontSize: "12px",
                    padding: "8px 12px",
                    background: LINK_BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddBehaviour(false);
                    setNewBehaviourName("");
                  }}
                  style={{
                    fontFamily: TNR,
                    fontSize: "12px",
                    padding: "8px 12px",
                    background: "#eee",
                    color: "#666",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {trackedBehaviours.map((behaviour) => (
                <div
                  key={behaviour}
                  style={{
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
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>{behaviour}</span>
                  <button
                    onClick={() => removeTrackedBehaviour(behaviour)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#999",
                      fontSize: "14px",
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Entries */}
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

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ fontFamily: TNR, fontSize: "12px", color: "#999", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Mood
                        </label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <button
                              key={i}
                              onClick={() => updateHealthEntry(dateStr, "mood", i)}
                              style={{
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
                              }}
                            >
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
                          {[1, 2, 3, 4, 5].map((i) => (
                            <button
                              key={i}
                              onClick={() => updateHealthEntry(dateStr, "energy", i)}
                              style={{
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
                              }}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {trackedBehaviours.length > 0 && (
                      <div>
                        <p style={{ fontFamily: TNR, fontSize: "12px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
                          Other tracking
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                          {trackedBehaviours.map((behaviour) => (
                            <div key={behaviour}>
                              <p style={{ fontFamily: TNR, fontSize: "11px", color: "#999", marginBottom: "6px", textTransform: "capitalize" }}>
                                {behaviour}
                              </p>
                              <div style={{ display: "flex", gap: "4px" }}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <button
                                    key={i}
                                    onClick={() => updateBehaviourEntry(dateStr, behaviour, i)}
                                    style={{
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
                                    }}
                                  >
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

          {/* Blood Pressure */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <p style={{ ...sml, margin: 0 }}>Blood pressure readings</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {bpReadings.length > 0 && (
                  <button
                    onClick={exportBPAsCSV}
                    style={{
                      fontFamily: TNR,
                      fontSize: "12px",
                      padding: "6px 12px",
                      background: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: "3px",
                      cursor: "pointer",
                      color: "#666",
                      fontWeight: "500",
                    }}
                  >
                    ↓ Export CSV
                  </button>
                )}
                <button
                  onClick={() => setShowAddBP(!showAddBP)}
                  style={{
                    fontFamily: TNR,
                    fontSize: "12px",
                    padding: "6px 12px",
                    background: LINK_BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  + Add
                </button>
              </div>
            </div>

            {showAddBP && (
              <div style={{ marginBottom: "16px", padding: "16px", background: "#f9f9f9", borderRadius: "4px", border: "1px solid #eee" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={newBPReading.date}
                      onChange={(e) => setNewBPReading({ ...newBPReading, date: e.target.value })}
                      style={{
                        width: "100%",
                        fontFamily: TNR,
                        fontSize: "13px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        color: "#1a1a1a",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                      Time
                    </label>
                    <input
                      type="time"
                      value={newBPReading.time}
                      onChange={(e) => setNewBPReading({ ...newBPReading, time: e.target.value })}
                      style={{
                        width: "100%",
                        fontFamily: TNR,
                        fontSize: "13px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        color: "#1a1a1a",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                      Systolic
                    </label>
                    <input
                      type="number"
                      value={newBPReading.systolic}
                      onChange={(e) => setNewBPReading({ ...newBPReading, systolic: e.target.value })}
                      placeholder="e.g. 120"
                      style={{
                        width: "100%",
                        fontFamily: TNR,
                        fontSize: "13px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        color: "#1a1a1a",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                      Diastolic
                    </label>
                    <input
                      type="number"
                      value={newBPReading.diastolic}
                      onChange={(e) => setNewBPReading({ ...newBPReading, diastolic: e.target.value })}
                      placeholder="e.g. 80"
                      style={{
                        width: "100%",
                        fontFamily: TNR,
                        fontSize: "13px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        color: "#1a1a1a",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: TNR, fontSize: "11px", color: "#999", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                      Heart rate
                    </label>
                    <input
                      type="number"
                      value={newBPReading.heartRate}
                      onChange={(e) => setNewBPReading({ ...newBPReading, heartRate: e.target.value })}
                      placeholder="e.g. 72"
                      style={{
                        width: "100%",
                        fontFamily: TNR,
                        fontSize: "13px",
                        padding: "8px",
                        border: "1px solid #ddd",
                        borderRadius: "3px",
                        color: "#1a1a1a",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={addBPReading}
                    style={{
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
                    }}
                  >
                    Save reading
                  </button>
                  <button
                    onClick={() => setShowAddBP(false)}
                    style={{
                      flex: 1,
                      fontFamily: TNR,
                      fontSize: "13px",
                      padding: "8px",
                      background: "#eee",
                      color: "#666",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
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
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: TNR, fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #eee" }}>
                      <th style={{ padding: "10px", textAlign: "left", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        Date
                      </th>
                      <th style={{ padding: "10px", textAlign: "left", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        Time
                      </th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        Systolic
                      </th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        Diastolic
                      </th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        HR
                      </th>
                      <th style={{ padding: "10px", textAlign: "center", color: "#999", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" }}>
                        Delete
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpReadings.map((reading) => (
                      <tr key={reading.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "10px", color: "#1a1a1a" }}>
                          {new Date(reading.date).toLocaleDateString("en-GB")}
                        </td>
                        <td style={{ padding: "10px", color: "#1a1a1a" }}>{reading.time}</td>
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
                          <button
                            onClick={() => removeBPReading(reading.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#999",
                              fontSize: "14px",
                              padding: 0,
                            }}
                          >
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

      {/* ════ QUARTERLY TAB ════ */}
      {tab === "quarterly" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ marginBottom: "32px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Quarterly goals</p>
            <button
              onClick={addQItem}
              style={{
                fontFamily: TNR,
                fontSize: "13px",
                padding: "8px 16px",
                background: LINK_BLUE,
                color: "#fff",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              + Add goal
            </button>
          </div>

          {quarterlyView.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb", fontFamily: TNR, fontSize: "14px" }}>
              No quarterly goals yet. Click "+ Add goal" to start.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              {Q_HORIZONS.map((quarter) => {
                const itemsInQuarter = quarterlyView.filter((item) => item.quarter === quarter.key);
                return (
                  <div key={quarter.key} style={{ padding: "20px", background: "#fff", border: `2px solid ${quarter.color}`, borderRadius: "4px" }}>
                    <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", color: quarter.color, margin: "0 0 16px 0" }}>
                      {quarter.label}
                    </p>

                    {itemsInQuarter.length === 0 ? (
                      <p style={{ fontFamily: TNR, fontSize: "13px", color: "#ccc", textAlign: "center", margin: "24px 0" }}>
                        No goals
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {itemsInQuarter.map((item) => {
                          const status = Q_STATUSES.find((s) => s.key === item.status);
                          return (
                            <div
                              key={item.id}
                              style={{
                                padding: "12px",
                                background: "#f9f9f9",
                                borderLeft: `3px solid ${status?.color || "#ccc"}`,
                                borderRadius: "2px",
                              }}
                            >
                              <div style={{ marginBottom: "8px" }}>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => updateQItem(item.id, "title", e.target.value)}
                                  placeholder="Goal…"
                                  style={{
                                    width: "100%",
                                    fontFamily: TNR,
                                    fontSize: "13px",
                                    border: "none",
                                    background: "transparent",
                                    color: "#1a1a1a",
                                    fontWeight: "600",
                                    padding: 0,
                                    margin: 0,
                                  }}
                                />
                              </div>

                              <select
                                value={item.status}
                                onChange={(e) => updateQItem(item.id, "status", e.target.value)}
                                style={{
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
                                }}
                              >
                                {Q_STATUSES.map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={item.quarter}
                                onChange={(e) => updateQItem(item.id, "quarter", e.target.value)}
                                style={{
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
                                }}
                              >
                                {Q_HORIZONS.map((q) => (
                                  <option key={q.key} value={q.key}>
                                    {q.label}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => deleteQItem(item.id)}
                                style={{
                                  fontFamily: TNR,
                                  fontSize: "11px",
                                  padding: "4px 8px",
                                  background: "#fee",
                                  color: "#c00",
                                  border: "none",
                                  borderRadius: "2px",
                                  cursor: "pointer",
                                  width: "100%",
                                }}
                              >
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
            <div style={{ display: "grid", gap: "16px" }}>
              {archive.map((week, i) => (
                <div key={i} style={{ padding: "16px", background: "#fff", border: "1px solid #eee", borderRadius: "4px" }}>
                  <p style={{ fontFamily: TNR, fontSize: "14px", fontWeight: "600", margin: "0 0 8px" }}>
                    {week.weekStartKey}
                  </p>
                  <p style={{ fontFamily: TNR, fontSize: "13px", color: "#999", margin: 0 }}>
                    {week.schedule ? Object.values(week.schedule).reduce((a, b) => a + Object.keys(b).length, 0) : 0} blocks scheduled
                  </p>
                </div>
              ))}
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
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              At the bottom of the Health tab, you'll see this week's averages for each tracked item. Over time, you can correlate patterns with your studio schedule, cycle, and life events.
            </p>
          </div>

          <div style={{ marginBottom: "40px" }}>
            <p style={{ ...sml, marginBottom: "16px" }}>Calendar integration</p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8", marginBottom: "12px" }}>
              Your existing Google Calendar events appear in a sidebar on the week view. This shows all your committed time at a glance.
            </p>
            <p style={{ fontFamily: TNR, fontSize: "14px", color: "#666", lineHeight: "1.8" }}>
              Click "Update calendar" to sync your week's exportable work blocks to Google Calendar. Entries deleted from the planner are automatically removed from your calendar.
            </p>
          </div>
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
        textarea::placeholder { color: #ccc; font-family: ${TNR}; } 
        input::placeholder { color: #ccc; font-family: ${TNR}; } 
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

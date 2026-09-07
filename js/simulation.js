// ============================================================
// simulation.js
// The "sensor data layer". Everything the UI shows is derived
// from the single `state.manholes` array below. Nothing in this
// file touches the DOM — it only mutates state and dispatches
// window events. When a real backend exists, this file is the
// ONLY one that needs to be replaced (with a WebSocket/Firebase
// listener that calls the same applyReading()/pushAlert() shape).
// ============================================================

import {
  generateManholes,
  calculateBlockage,
  calculateStatus,
} from "./data.js";

const HISTORY_LIMIT = 24;
const ALERT_LIMIT = 300;
const BASE_TICK_MS = 2200;

export const state = {
  manholes: generateManholes(60),
  alerts: [],
  running: false,
  speed: 1, // 1x, 2x, 4x
  intervalId: null,
  demoRunning: false,
  demoExcludeId: null, // node currently under manual demo control, excluded from random walk
  lastSyncedAt: Date.now(),
};

function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function getSensorData() {
  return state.manholes;
}

export function getManhole(manholeId) {
  return state.manholes.find((m) => m.manholeId === manholeId);
}

function pushAlert(manhole, prevStatus, newStatus) {
  const severityMap = {
    CRITICAL: "critical",
    WARNING: "warning",
    CLEAR: "info",
  };
  const severity = severityMap[newStatus];

  let message;
  if (newStatus === "CRITICAL") {
    message = `Estimated blockage increased to ${manhole.blockagePercentage}%. Immediate inspection recommended.`;
  } else if (newStatus === "WARNING") {
    message = `Estimated blockage increased to ${manhole.blockagePercentage}%. Monitoring advised.`;
  } else {
    message = `Reading returned to normal. Estimated blockage now ${manhole.blockagePercentage}%.`;
  }

  const alert = {
    id: `${manhole.manholeId}-${Date.now()}`,
    severity,
    manholeId: manhole.manholeId,
    nodeId: manhole.nodeId,
    area: manhole.area,
    blockagePercentage: manhole.blockagePercentage,
    distanceMeters: manhole.measuredDistance,
    prevStatus,
    newStatus,
    message,
    timestamp: Date.now(),
  };

  state.alerts.unshift(alert);
  if (state.alerts.length > ALERT_LIMIT) state.alerts.length = ALERT_LIMIT;
  emit("alerts:new", { alert });
}

/**
 * The one function that actually changes a sensor reading.
 * Every code path (random walk, manual apply, demo mode) funnels
 * through here so status/alerts/history stay perfectly in sync.
 */
export function updateSensorReading(manholeId, newDistance) {
  const manhole = getManhole(manholeId);
  if (!manhole) return null;

  const clamped = Math.max(
    2,
    Math.min(manhole.expectedPipeLength, Math.round(newDistance)),
  );
  const prevStatus = manhole.status;

  manhole.measuredDistance = clamped;
  manhole.blockagePercentage = calculateBlockage(
    manhole.expectedPipeLength,
    clamped,
  );
  manhole.status = calculateStatus(manhole.blockagePercentage);
  manhole.lastUpdated = Date.now();

  manhole.history.push({
    t: manhole.lastUpdated,
    distance: manhole.measuredDistance,
    blockage: manhole.blockagePercentage,
  });
  if (manhole.history.length > HISTORY_LIMIT) manhole.history.shift();

  if (manhole.status !== prevStatus) {
    pushAlert(manhole, prevStatus, manhole.status);
  }

  emit("manhole:update", { manhole, prevStatus });
  return manhole;
}

// ---------------- Random-walk tick (background "live" traffic) ----------------

function randomWalkTick() {
  const activeCount = Math.max(4, Math.round(state.manholes.length * 0.18));
  const pool = state.manholes.filter(
    (m) => m.manholeId !== state.demoExcludeId,
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, activeCount);

  chosen.forEach((m) => {
    const driftMax = 3 + state.speed * 2; // bigger steps at higher speed
    const drift = (Math.random() - 0.55) * driftMax; // slight downward bias -> more visible drama
    updateSensorReading(m.manholeId, m.measuredDistance + drift);
  });

  state.lastSyncedAt = Date.now();
  emit("dashboard:refresh", {});
}

function computeIntervalMs() {
  return BASE_TICK_MS / state.speed;
}

export function startSimulation() {
  if (state.running) return;
  state.running = true;
  state.intervalId = setInterval(randomWalkTick, computeIntervalMs());
  emit("simulation:statechange", { running: true });
}

export function pauseSimulation() {
  if (!state.running) return;
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.running = false;
  emit("simulation:statechange", { running: false });
}

export function resetSimulation() {
  pauseSimulation();
  state.manholes = generateManholes(60);
  state.alerts = [];
  state.demoRunning = false;
  state.demoExcludeId = null;
  state.lastSyncedAt = Date.now();
  emit("simulation:reset", {});
}

export function setSpeed(multiplier) {
  state.speed = multiplier;
  if (state.running) {
    clearInterval(state.intervalId);
    state.intervalId = setInterval(randomWalkTick, computeIntervalMs());
  }
  emit("simulation:statechange", { running: state.running });
}

// ---------------- Demo mode: scripted lifecycle for one manhole ----------------

const DEMO_SEQUENCE = [90, 70, 55, 40, 20]; // clear -> warning -> critical
const RECOVERY_SEQUENCE = [20, 45, 70, 90]; // critical -> warning -> clear
const DEMO_STEP_MS = 1800;

export function runDemoSequence(manholeId, onComplete) {
  const manhole = getManhole(manholeId);
  if (!manhole || state.demoRunning) return;

  state.demoRunning = true;
  state.demoExcludeId = manholeId;
  emit("demo:start", { manholeId });

  const fullSequence = [...DEMO_SEQUENCE, ...RECOVERY_SEQUENCE];
  let i = 0;

  function step() {
    if (i >= fullSequence.length) {
      state.demoRunning = false;
      state.demoExcludeId = null;
      emit("demo:end", { manholeId });
      if (onComplete) onComplete();
      return;
    }
    updateSensorReading(manholeId, fullSequence[i]);
    emit("demo:step", { manholeId, index: i, total: fullSequence.length });
    i++;
    setTimeout(step, DEMO_STEP_MS);
  }
  step();
}

// ---------------- Derived stats (dashboard cards) ----------------

export function updateDashboard() {
  const total = state.manholes.length;
  const clear = state.manholes.filter((m) => m.status === "CLEAR").length;
  const warning = state.manholes.filter((m) => m.status === "WARNING").length;
  const critical = state.manholes.filter((m) => m.status === "CRITICAL").length;
  return {
    total,
    clear,
    warning,
    critical,
    clearPct: Math.round((clear / total) * 100),
    warningPct: Math.round((warning / total) * 100),
    criticalPct: Math.round((critical / total) * 100),
  };
}

export function mostUrgentManhole() {
  const order = { CRITICAL: 0, WARNING: 1, CLEAR: 2 };
  return [...state.manholes].sort(
    (a, b) => order[a.status] - order[b.status],
  )[0];
}
